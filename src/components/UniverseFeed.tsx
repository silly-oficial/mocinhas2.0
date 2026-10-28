import {MediaCredit} from './CreatorCredit';
import { ui, useUi } from '../i18n/ui';
import { ManagedVideo } from './ManagedVideo';
import { AutoTranslatedText } from './AutoTranslatedText';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Volume2,
  VolumeX,
  LayoutList,
  Plus,
  Minus,
  LocateFixed,
  Play,
  Heart,
  MessageCircle,
  Maximize2,
} from 'lucide-react';
import { Post, PostMedia } from '../types';
import { detectLiteDevice, isDataSaver, prefersReducedMotion } from '../utils/deviceTier';

/* ==========================================================================
 *  UNIVERSO — feed de vídeos em zoom infinito
 *
 * Como funciona (e por que roda em celular fraco):
 *  1. Cada vídeo é um "planeta" numa posição fixa do universo (espiral).
 *  2. A câmera (arrastar / pinça / scroll) só mexe em UM transform CSS do
 *     container → nada de re-render do React a cada frame.
 *  3. Só os planetas visíveis na tela existem no DOM (culling) e há um teto
 *     de quantos podem existir ao mesmo tempo.
 *  4. 3 níveis de detalhe (LOD):
 *       longe  → bolinhas coloridas (zero imagem)
 *       médio  → poster leve (JPEG ~30 KB)
 *       perto  → poster + título
 *  5. O vídeo de verdade só carrega no planeta que você aproximou e deixou
 *     parado na frente. NUNCA há mais de 1 <video> ao mesmo tempo.
 *  6. Modo LITE (automático em aparelho fraco ou se o FPS cair): sem brilho
 *     pesado, sem flutuação, menos planetas ao mesmo tempo.
 * ========================================================================== */

type Tier = 'dot' | 'img' | 'full';

interface UNode {
  id: string;
  post: Post;
  x: number;
  y: number;
  d: number; // diâmetro no "mundo"
  hue: number;
  poster?: string;
  videoUrl: string;
  title: string;
}

interface UniverseFeedProps {
  posts: Post[];
  isLoading: boolean;
  /** true quando algum modal (post/comentários) está aberto por cima → pausa o vídeo */
  paused?: boolean;
  onSelectPost: (post: Post) => void;
  onNavigateUser?: (username: string) => void;
  onSwitchToList?: () => void;
}

/* ------------------------------- Layout -------------------------------- */

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|ogg)(\?|#|$)/i;

function posterOf(m: PostMedia): string | undefined {
  const t = m.thumbnail;
  if (!t || t === m.url || VIDEO_EXT.test(t)) return undefined;
  return t;
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// número pseudo-aleatório estável (0..1) a partir de um hash + índice
function rnd(h: number, k: number): number {
  let t = (h + Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const GOLDEN_ANGLE = 2.399963229728653;
const SPIRAL_K = 310;

function buildNodes(posts: Post[]): UNode[] {
  const mediaItems = posts
    .map(p => ({ p, m: p.media?.[0] }))
    .filter((v): v is { p: Post; m: PostMedia } => Boolean(v.m));

  // fixados primeiro, depois os mais novos → o mais novo fica no centro do universo
  mediaItems.sort(
    (a, b) =>
      Number(Boolean(b.p.isPinned)) - Number(Boolean(a.p.isPinned)) ||
      new Date(b.p.createdAt).getTime() - new Date(a.p.createdAt).getTime()
  );

  const nodes: UNode[] = mediaItems.map(({ p, m }, i) => {
    const h = hash32(p.id);
    const r = i === 0 ? 0 : SPIRAL_K * Math.sqrt(i);
    const a = i * GOLDEN_ANGLE + (rnd(h, 1) - 0.5) * 0.45;
    const jitter = i === 0 ? 0 : 46;
    const x = Math.cos(a) * r + (rnd(h, 2) - 0.5) * jitter * 2;
    const y = Math.sin(a) * r + (rnd(h, 3) - 0.5) * jitter * 2;
    const d = i === 0 || p.isPinned ? 250 : 165 + rnd(h, 4) * 80;
    const hue = 160;
    const title = (p.caption || '').trim().split('\n')[0].slice(0, 60) || 'Publicação';
    const isVid = m.type === 'video';
    const external=m.display_mode==='embed';
    const poster = external?(m.thumbnail&&m.thumbnail!==m.url?m.thumbnail:undefined):isVid ? (posterOf(m) || (m.thumbnail !== m.url ? m.thumbnail : undefined)) : (m.url || m.thumbnail);
    return {
      id: p.id,
      post: p,
      x,
      y,
      d,
      hue,
      poster,
      videoUrl: isVid&&!external ? m.url : '',
      title,
    };
  });

  relaxOverlaps(nodes);
  return nodes;
}

/**
 * Com muitos vídeos a espiral + aleatoriedade pode encostar planetas.
 * Algumas passadas empurram os que se sobrepõem (grade espacial → rápido mesmo com milhares).
 * O primeiro planeta (o mais novo, no centro) nunca sai do lugar.
 */
function relaxOverlaps(nodes: UNode[]) {
  const CELL = 420;
  const PAD = 26;
  for (let it = 0; it < 10; it++) {
    const grid = new Map<string, number[]>();
    for (let i = 0; i < nodes.length; i++) {
      const key = `${Math.floor(nodes[i].x / CELL)},${Math.floor(nodes[i].y / CELL)}`;
      const bucket = grid.get(key);
      if (bucket) bucket.push(i);
      else grid.set(key, [i]);
    }

    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const cx = Math.floor(a.x / CELL);
      const cy = Math.floor(a.y / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const bucket = grid.get(`${gx},${gy}`);
          if (!bucket) continue;
          for (const j of bucket) {
            if (j <= i) continue;
            const b = nodes[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.hypot(dx, dy);
            const min = (a.d + b.d) / 2 + PAD;
            if (dist >= min) continue;
            if (dist < 0.01) {
              const ang = (i * 7 + j * 13) % 6.283;
              dx = Math.cos(ang);
              dy = Math.sin(ang);
              dist = 1;
            }
            const push = min - dist;
            const ux = dx / dist;
            const uy = dy / dist;
            const aShare = i === 0 ? 0 : 0.5;
            const bShare = i === 0 ? 1 : 0.5;
            a.x -= ux * push * aShare;
            a.y -= uy * push * aShare;
            b.x += ux * push * bShare;
            b.y += uy * push * bShare;
            moved = true;
          }
        }
      }
    }
    if (!moved) break;
  }
}

const tierOf = (s: number): Tier => (s < 0.22 ? 'dot' : s < 0.55 ? 'img' : 'full');

const MAX_SCALE = 3.6;

/* ------------------------------ Planeta -------------------------------- */

interface NodeViewProps {
  node: UNode;
  tier: Tier;
  focused: boolean;
  lite: boolean;
  soundOn: boolean;
  allowVideo: boolean;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
}

const NodeView = React.memo(function NodeView({ node, tier, focused, lite, soundOn, allowVideo, videoRef }: NodeViewProps) {
  useUi();
  const { d, x, y, hue, poster } = node;
  const planetBg = 'var(--uni-node-bg, #172823)';
  const ring = lite
    ? `0 0 0 2px hsl(${hue} 80% 70% / .55)`
    : `0 0 0 2px hsl(${hue} 80% 70% / .6), 0 0 34px hsl(${hue} 85% 60% / .38)`;
  const floatOn = !lite && tier !== 'dot' && !focused;
  const floatStyle = floatOn
    ? ({ '--uni-dur': `${4 + (node.d % 3)}s`, '--uni-delay': `-${Math.abs(node.x % 4).toFixed(2)}s` } as React.CSSProperties)
    : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: d,
        height: d,
        transform: `translate3d(${x - d / 2}px, ${y - d / 2}px, 0)`,
        pointerEvents: 'none',
      }}
    >
      <div className={floatOn ? 'uni-float' : undefined} style={{ width: '100%', height: '100%', ...floatStyle }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            background: planetBg,
            borderRadius: focused ? 'var(--uni-radius-focus, 28px)' : 'var(--uni-radius, 40px)',
            boxShadow: focused ? 'var(--uni-node-focus-shadow, 0 0 0 2px #34d399, 0 16px 48px #0008)' : 'var(--uni-node-shadow, 0 0 0 1px #ffffff30, 0 8px 24px #0008)',
            transition: 'opacity 160ms ease',
          }}
        >
          {poster && (
            <img
              src={poster}
              alt=""
              draggable={false}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {!poster && !focused && Boolean(node.videoUrl) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play style={{ width: '24%', height: '24%', color: 'rgba(255,255,255,.9)', fill: 'rgba(255,255,255,.9)' }} />
            </div>
          )}

          {focused && allowVideo && Boolean(node.videoUrl) && (
            <ManagedVideo src={node.videoUrl} poster={poster} universe soundOn={soundOn} active={allowVideo} onElement={el => { videoRef.current = el; }} className="w-full h-full object-cover" />
          )}
        </div>

        {tier === 'full' && !focused && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              marginTop: 10,
              width: Math.max(d, 200),
              transform: 'translateX(-50%)',
              textAlign: 'center',
              display: 'var(--uni-label-display, block)',
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--uni-label, #fff)',
              textShadow: 'var(--uni-label-shadow, 0 2px 8px rgba(0,0,0,.9))',
              lineHeight: 1.2,
            }}
          >
            <AutoTranslatedText text={node.title} showBadge={false} />
          </div>
        )}
      </div>
    </div>
  );
});

/* ------------------------------ Componente ----------------------------- */

export const UniverseFeed: React.FC<UniverseFeedProps> = ({
  posts,
  isLoading,
  paused = false,
  onSelectPost,
  onNavigateUser,
  onSwitchToList,
}) => {
  useUi();
  const nodes = useMemo(() => buildNodes(posts), [posts]);
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const universeRadius = useMemo(
    () => nodes.reduce((acc, n) => Math.max(acc, Math.hypot(n.x, n.y) + n.d / 2), 150),
    [nodes]
  );

  const [lite, setLite] = useState<boolean>(() => detectLiteDevice());
  const [tier, setTier] = useState<Tier>('img');
  const [visible, setVisible] = useState<UNode[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [query, setQuery] = useState('');
  const [showHint, setShowHint] = useState(true);
  const allowVideo = useMemo(() => !isDataSaver(), []);

  // refs de estado "quente" (mudam a cada frame → fora do React)
  const rootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const cam = useRef({ x: 0, y: 0, s: 1 });
  const size = useRef({ w: 0, h: 0 });
  const nodesRef = useRef<UNode[]>(nodes);
  const nodeMapRef = useRef(nodeMap);
  const radiusRef = useRef(universeRadius);
  const liteRef = useRef(lite);
  const tierRef = useRef<Tier>('img');
  const focusRef = useRef<string | null>(null);
  const visKeyRef = useRef('');
  const lastVisRef = useRef(0);
  const movingRef = useRef(false);
  const rafRef = useRef(0);
  const animRef = useRef(0);
  const settleTimer = useRef<number | undefined>(undefined);
  const frameRef = useRef({ last: 0, ema: 0, n: 0 });
  const activeVideo = useRef<HTMLVideoElement | null>(null);
  const pausedRef = useRef(paused);
  const inited = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);

  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const tap = useRef({ x: 0, y: 0, t: 0, moved: false });
  const vel = useRef({ vx: 0, vy: 0, t: 0 });

  nodesRef.current = nodes;
  nodeMapRef.current = nodeMap;
  radiusRef.current = universeRadius;
  liteRef.current = lite;
  pausedRef.current = paused;

  /* ------------------------------ câmera -------------------------------- */

  const minScale = () => {
    const m = Math.min(size.current.w, size.current.h) || 400;
    return Math.max(0.07, Math.min(0.6, (m * 0.5) / (radiusRef.current + 200)));
  };

  const clampCam = () => {
    const { w, h } = size.current;
    const c = cam.current;
    const s = Math.min(MAX_SCALE, Math.max(minScale(), c.s));
    let cx = (w / 2 - c.x) / s;
    let cy = (h / 2 - c.y) / s;
    const R = radiusRef.current + 220;
    const dist = Math.hypot(cx, cy);
    if (dist > R) {
      cx *= R / dist;
      cy *= R / dist;
    }
    cam.current = { x: w / 2 - cx * s, y: h / 2 - cy * s, s };
  };

  const pauseVideo = () => {
    activeVideo.current?.pause();
  };
  const resumeVideo = () => {
    if (pausedRef.current || document.hidden) return;
    const v = activeVideo.current;
    if (v) v.play().catch(() => {});
  };

  const syncVisible = (force: boolean) => {
    const now = performance.now();
    const { x, y, s } = cam.current;
    const { w, h } = size.current;

    const t = tierOf(s);
    if (t !== tierRef.current) {
      tierRef.current = t;
      setTier(t);
    }

    if (!force && now - lastVisRef.current < 90) return;
    lastVisRef.current = now;

    const m = 140; // margem em px de tela → planetas aparecem antes de entrar na tela
    const x0 = (-x - m) / s;
    const x1 = (w - x + m) / s;
    const y0 = (-y - m) / s;
    const y1 = (h - y + m) / s;

    let cand = nodesRef.current.filter(
      n => n.x + n.d / 2 >= x0 && n.x - n.d / 2 <= x1 && n.y + n.d / 2 >= y0 && n.y - n.d / 2 <= y1
    );

    const cap = t === 'dot' ? (liteRef.current ? 32 : 60) : liteRef.current ? 16 : 30;
    if (cand.length > cap) {
      const cx = (w / 2 - x) / s;
      const cy = (h / 2 - y) / s;
      cand.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
      cand = cand.slice(0, cap);
    }

    // o planeta focado nunca pode sumir da lista
    if (focusRef.current && !cand.some(n => n.id === focusRef.current)) {
      const f = nodeMapRef.current.get(focusRef.current);
      if (f) cand.push(f);
    }

    const key = cand.map(n => n.id).join('|');
    if (key !== visKeyRef.current) {
      visKeyRef.current = key;
      setVisible(cand);
    }
  };

  const focusOK = (n: UNode, loose: boolean) => {
    const { x, y, s } = cam.current;
    const { w, h } = size.current;
    const m = Math.min(w, h);
    const sd = n.d * s;
    const cx = n.x * s + x;
    const cy = n.y * s + y;
    return sd >= m * (loose ? 0.4 : 0.5) && Math.hypot(cx - w / 2, cy - h / 2) < m * (loose ? 0.45 : 0.3);
  };

  const updateFocus = (settled: boolean) => {
    const curId = focusRef.current;
    if (curId) {
      const n = nodeMapRef.current.get(curId);
      if (n && focusOK(n, true)) return; // continua focado (histerese)
      focusRef.current = null;
      setFocusId(null);
      activeVideo.current = null;
    }
    if (!settled) return;

    const { x, y, s } = cam.current;
    const { w, h } = size.current;
    let best: UNode | null = null;
    let bestDist = Infinity;
    for (const n of nodesRef.current) {
      if (!focusOK(n, false)) continue;
      const dist = Math.hypot(n.x * s + x - w / 2, n.y * s + y - h / 2);
      if (dist < bestDist) {
        best = n;
        bestDist = dist;
      }
    }
    if (best) {
      focusRef.current = best.id;
      setFocusId(best.id);
    }
  };

  const scheduleSettle = () => {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      movingRef.current = false;
      frameRef.current.last = 0;
      rootRef.current?.classList.remove('uni-moving');
      syncVisible(true);
      updateFocus(true);
      resumeVideo();
    }, 220);
  };

  const applyNow = () => {
    clampCam();
    const { x, y, s } = cam.current;
    if (worldRef.current) worldRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
    if (starsRef.current && !liteRef.current) {
      starsRef.current.style.transform = `translate3d(${(x * 0.12) % 320}px, ${(y * 0.12) % 320}px, 0)`;
    }

    if (!movingRef.current) {
      movingRef.current = true;
      rootRef.current?.classList.add('uni-moving');
      pauseVideo(); // não decodifica vídeo enquanto a câmera se move
    }

    // medidor de FPS: se engasgar de forma constante, liga o modo LITE sozinho
    const fm = frameRef.current;
    const now = performance.now();
    if (fm.last) {
      const dt = now - fm.last;
      if (dt < 250) {
        fm.ema = fm.ema ? fm.ema * 0.9 + dt * 0.1 : dt;
        fm.n++;
        if (fm.n > 45 && fm.ema > 38 && !liteRef.current) {
          liteRef.current = true;
          setLite(true);
          lastVisRef.current = 0;
        }
      }
    }
    fm.last = now;

    syncVisible(false);
    updateFocus(false);
    scheduleSettle();
  };

  const requestApply = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      applyNow();
    });
  };

  const cancelAnim = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    const c = cam.current;
    const ns = Math.min(MAX_SCALE, Math.max(minScale(), c.s * factor));
    const f = ns / c.s;
    cam.current = { x: px - (px - c.x) * f, y: py - (py - c.y) * f, s: ns };
  };

  const animateTo = (wx: number, wy: number, targetScale: number, dur = 650) => {
    cancelAnim();
    const { w, h } = size.current;
    const s0 = cam.current.s;
    const ts = Math.min(MAX_SCALE, Math.max(minScale(), targetScale));
    const c0x = (w / 2 - cam.current.x) / s0;
    const c0y = (h / 2 - cam.current.y) / s0;
    const duration = prefersReducedMotion() ? 0 : dur;
    const t0 = performance.now();

    const step = (t: number) => {
      const k = duration === 0 ? 1 : Math.min(1, (t - t0) / duration);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const s = s0 * Math.pow(ts / s0, e);
      const cx = c0x + (wx - c0x) * e;
      const cy = c0y + (wy - c0y) * e;
      cam.current = { x: w / 2 - cx * s, y: h / 2 - cy * s, s };
      applyNow();
      animRef.current = k < 1 ? requestAnimationFrame(step) : 0;
    };
    animRef.current = requestAnimationFrame(step);
  };

  const flyToNode = (n: UNode) => {
    const m = Math.min(size.current.w, size.current.h);
    animateTo(n.x, n.y, (0.8 * m) / n.d);
  };

  const recenter = () => {
    const first = nodesRef.current[0];
    if (!first) return;
    const m = Math.min(size.current.w, size.current.h);
    animateTo(first.x, first.y, (0.45 * m) / first.d, 800);
  };

  const zoomBy = (factor: number) => {
    const { w, h } = size.current;
    const s = cam.current.s;
    const cx = (w / 2 - cam.current.x) / s;
    const cy = (h / 2 - cam.current.y) / s;
    animateTo(cx, cy, s * factor, 380);
  };

  const startInertia = (vx: number, vy: number) => {
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(32, t - last);
      last = t;
      cam.current.x += vx * dt;
      cam.current.y += vy * dt;
      const f = Math.pow(0.94, dt / 16.7);
      vx *= f;
      vy *= f;
      applyNow();
      animRef.current = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(step) : 0;
    };
    animRef.current = requestAnimationFrame(step);
  };

  /* ------------------------------ gestos -------------------------------- */

  const handleTap = (clientX: number, clientY: number) => {
    const rect = rectRef.current || rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x, y, s } = cam.current;
    const wx = (clientX - rect.left - x) / s;
    const wy = (clientY - rect.top - y) / s;

    let hit: UNode | null = null;
    let best = Infinity;
    for (const n of nodesRef.current) {
      const dist = Math.hypot(n.x - wx, n.y - wy);
      // área de toque generosa (planetas pequenos na tela são difíceis de acertar)
      const slack = Math.max(0, 22 / s);
      if (dist <= n.d / 2 + slack && dist < best) {
        hit = n;
        best = dist;
      }
    }
    if (!hit) return;
    if (focusRef.current === hit.id) onSelectPost(hit.post);
    else flyToNode(hit);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    cancelAnim();
    rectRef.current = e.currentTarget.getBoundingClientRect();
    if (showHint) setShowHint(false);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const now = performance.now();
    if (ptrs.current.size === 1) {
      tap.current = { x: e.clientX, y: e.clientY, t: now, moved: false };
      vel.current = { vx: 0, vy: 0, t: now };
    } else {
      tap.current.moved = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    const rect = rectRef.current;
    if (!rect) return;

    if (ptrs.current.size === 1) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      if (!tap.current.moved && Math.hypot(cur.x - tap.current.x, cur.y - tap.current.y) > 8) {
        tap.current.moved = true;
      }
      ptrs.current.set(e.pointerId, cur);
      if (tap.current.moved) {
        const now = performance.now();
        const dt = Math.max(1, now - vel.current.t);
        vel.current = {
          vx: vel.current.vx * 0.7 + (dx / dt) * 0.3,
          vy: vel.current.vy * 0.7 + (dy / dt) * 0.3,
          t: now,
        };
        cam.current.x += dx;
        cam.current.y += dy;
        requestApply();
      }
    } else if (ptrs.current.size >= 2) {
      const ids = Array.from(ptrs.current.keys()).slice(0, 2);
      const a0 = ptrs.current.get(ids[0])!;
      const b0 = ptrs.current.get(ids[1])!;
      const prevDist = Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1;
      const prevMid = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };

      ptrs.current.set(e.pointerId, cur);
      const a1 = ptrs.current.get(ids[0])!;
      const b1 = ptrs.current.get(ids[1])!;
      const dist = Math.hypot(a1.x - b1.x, a1.y - b1.y) || 1;
      const mid = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };

      zoomAt(mid.x - rect.left, mid.y - rect.top, dist / prevDist);
      cam.current.x += mid.x - prevMid.x;
      cam.current.y += mid.y - prevMid.y;
      requestApply();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size > 0) return;

    const dur = performance.now() - tap.current.t;
    if (!tap.current.moved && dur < 450) {
      handleTap(e.clientX, e.clientY);
      return;
    }
    const { vx, vy } = vel.current;
    if (performance.now() - vel.current.t < 80 && Math.hypot(vx, vy) > 0.06) startInertia(vx, vy);
  };

  /* ------------------------------ efeitos ------------------------------- */

  // tamanho da área + câmera inicial
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      size.current = { w: r.width, h: r.height };
      rectRef.current = r;
      if (inited.current) requestApply();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (nodes.length === 0) {
      visKeyRef.current = '';
      setVisible([]);
      return;
    }
    const { w, h } = size.current;
    if (!inited.current && w > 0 && h > 0) {
      inited.current = true;
      const first = nodes[0];
      const m = Math.min(w, h);
      const target = (0.45 * m) / first.d;
      // entrada: começa afastado e "mergulha" no universo
      const startS = prefersReducedMotion() ? target : target * 0.3;
      cam.current = { x: w / 2 - first.x * startS, y: h / 2 - first.y * startS, s: startS };
      applyNow();
      if (!prefersReducedMotion()) animateTo(first.x, first.y, target, 1100);
    } else {
      syncVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // scroll do mouse = zoom (desktop). Precisa ser listener nativo (não-passivo).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnim();
      const rect = el.getBoundingClientRect();
      rectRef.current = rect;
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
      if (showHint) setShowHint(false);
      requestApply();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHint]);

  // pausa o vídeo quando um modal abre por cima / aba some
  useEffect(() => {
    if (paused) pauseVideo();
    else if (!movingRef.current) resumeVideo();
  }, [paused]);

  useEffect(() => {
    const onVis = () => (document.hidden ? pauseVideo() : resumeVideo());
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // se o modo LITE for ligado no meio do uso, reaplica os limites
  useEffect(() => {
    syncVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite]);

  // limpeza
  useEffect(
    () => () => {
      pauseVideo();
      cancelAnim();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.clearTimeout(settleTimer.current);
    },
    []
  );

  /* ------------------------------ busca --------------------------------- */

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^[#@]/, '');
    if (!q) return [];
    return nodes
      .filter(
        n =>
          n.post.caption.toLowerCase().includes(q) ||
          n.post.user.displayName.toLowerCase().includes(q) ||
          n.post.user.username.toLowerCase().includes(q) ||
          n.post.hashtags.some(t => t.includes(q))
      )
      .slice(0, 6);
  }, [query, nodes]);

  const focusNode = focusId ? nodeMap.get(focusId) : undefined;

  /* ------------------------------ render -------------------------------- */

  return (
    <div
      onContextMenu={e=>e.preventDefault()}
      className="universe-frame relative w-full rounded-[28px] overflow-hidden border border-white/10 bg-[#05050b] select-none"
      style={{ height: 'calc(100dvh - 10.5rem)', minHeight: 420 }}
    >
      <h1 className="sky-universe-title">{ui("Universo")}</h1>
      {/* Área de gestos + mundo */}
      <div
        ref={rootRef}
        className="absolute inset-0 overflow-hidden"
        style={{ touchAction: 'none', cursor: 'grab', overscrollBehavior: 'contain' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* estrelas (camada única, só transform → barato) */}
        <div className="uni-sky" />
        {!lite && <div ref={starsRef} className="uni-stars" />}

        {/* mundo: um único elemento recebe translate+scale */}
        <div
          ref={worldRef}
          style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0' }}
        >
          {visible.map(n => (
            <NodeView
              key={n.id}
              node={n}
              tier={tier}
              focused={n.id === focusId}
              lite={lite}
              soundOn={soundOn}
              allowVideo={allowVideo && !paused}
              videoRef={activeVideo}
            />
          ))}
        </div>
      </div>

      {/* Carregando / vazio */}
      {isLoading && nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-zinc-400">{ui("Abrindo o universo...")}</span>
        </div>
      )}
      {!isLoading && nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-8 pointer-events-none">
          <div className="text-4xl"></div>
          <h3 className="font-heading text-base font-extrabold text-white">{ui("Seu universo está começando")}</h3>
          <p className="text-xs text-zinc-400 max-w-xs">{ui("As novas fotos e os vídeos aparecerão aqui.")}</p>
        </div>
      )}

      {/* Barra superior: busca + modo lista */}
      <div className="universe-search-row absolute top-3 left-3 right-3 flex items-center gap-2 z-10 pointer-events-none">
        <div className="relative flex-1 pointer-events-auto">
          <div
            className={`universe-search flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/15 ${
              lite ? 'bg-black/80' : 'bg-black/55 backdrop-blur-md'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={ui("Buscar fotos, vídeos ou hashtags...")}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs text-white placeholder:text-zinc-400"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label={ui("Limpar busca")} className="text-zinc-300 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="universe-results absolute left-0 right-0 mt-2 rounded-2xl border border-white/15 bg-[#0d0d16]/98 overflow-hidden shadow-2xl">
              {results.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    setQuery('');
                    flyToNode(n);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/10 cursor-pointer"
                >
                  <span
                    className="w-9 h-9 rounded-full shrink-0 overflow-hidden"
                    style={{ background: '#172823' }}
                  >
                    {n.poster && <img src={n.poster} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-white truncate">{n.title}</span>
                    
                  </span>
                </button>
              ))}
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <div className="universe-results absolute left-0 right-0 mt-2 rounded-2xl border border-white/15 bg-[#0d0d16]/98 px-4 py-3 text-xs text-zinc-400">
              {ui("Nenhuma publicação encontrada.")}</div>
          )}
        </div>

        {onSwitchToList && (
          <button
            onClick={onSwitchToList}
            aria-label={ui("Ver em lista")}
            title={ui("Ver em lista")}
            className={`universe-control pointer-events-auto w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer shrink-0 ${
              lite ? 'bg-black/80' : 'bg-black/55 backdrop-blur-md'
            }`}
          >
            <LayoutList className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Controles de zoom */}
      <div className="universe-zoom-rail absolute right-3 top-16 z-10 flex flex-col gap-2">
        {[
          { label: ui("Aproximar"), icon: Plus, onClick: () => zoomBy(1.7) },
          { label: ui("Afastar"), icon: Minus, onClick: () => zoomBy(1 / 1.7) },
          { label: ui("Voltar ao centro"), icon: LocateFixed, onClick: recenter },
        ].map(b => (
          <button
            key={b.label}
            onClick={b.onClick}
            aria-label={b.label}
            title={b.label}
            className={`universe-control w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer ${
              lite ? 'bg-black/80' : 'bg-black/55 backdrop-blur-md'
            }`}
          >
            <b.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Dica inicial */}
      {showHint && nodes.length > 0 && !focusNode && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10">
          <div className="universe-hint px-4 py-2 rounded-full bg-black/70 border border-white/10 text-[11px] font-bold text-zinc-200">
            {ui("Arraste para explorar. Toque para aproximar.")}</div>
        </div>
      )}

      {/* Cartão do vídeo em foco (fora do mundo → botões clicáveis) */}
      {focusNode && (
        <div
          className={`universe-detail absolute left-3 right-3 bottom-3 z-10 rounded-2xl border border-white/15 p-3 flex items-center gap-3 ${
            lite ? 'bg-black/85' : 'bg-black/60 backdrop-blur-md'
          }`}
        >
          <div className="min-w-0 flex-1 text-sm text-white"><AutoTranslatedText text={focusNode.title} showBadge={false}/><MediaCredit handle={focusNode.post.media[0]?.source_handle}/></div>
          {allowVideo && (
            <button
              onClick={() => setSoundOn(v => !v)}
              aria-label={soundOn ? ui("Silenciar") : ui("Ativar som")}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer shrink-0"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => onSelectPost(focusNode.post)}
            className="px-3.5 h-9 rounded-full bg-white text-black text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {ui("Abrir")}</button>
        </div>
      )}
    </div>
  );
};


