import { useLayoutEffect, type RefObject } from 'react';

/** Size only the explicitly opened video, never any carousel card. */
export function useOriVideoViewport(root: RefObject<HTMLElement | null>, active: boolean) {
  useLayoutEffect(() => {
    const article = root.current;
    if (!active || !article) return;
    const video = article.querySelector('video');
    const header = document.querySelector('.app-header');
    const menu = document.querySelector('.app-bottom-nav');
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    let frame = 0;
    function measure() {
      if (!article) return;
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportLeft = viewport?.offsetLeft || 0;
      const viewportWidth = viewport?.width || window.innerWidth;
      const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
      const headerRect = header?.getBoundingClientRect();
      const menuRect = menu?.getBoundingClientRect();
      const top = Math.max(viewportTop, headerRect && headerRect.height > 0 ? headerRect.bottom : viewportTop) + 12;
      const bottom = Math.min(viewportBottom, menuRect && menuRect.height > 0 ? menuRect.top : viewportBottom) - 12;
      const width = Math.max(0, Math.min(viewportWidth - 24, 960));
      const height = Math.max(64, bottom - top);
      const ratio = video?.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 9 / 16;
      const imageHeight = Math.max(0, Math.min(height - 64, width / ratio));
      const values = {
        '--ori-view-top': top, '--ori-view-left': viewportLeft + (viewportWidth - width) / 2,
        '--ori-view-width': width, '--ori-view-height': height,
        '--orix-full-video-height': imageHeight, '--orix-full-video-width': imageHeight * ratio,
        '--ori-video-top': Math.max(0, (height - 64 - imageHeight) / 2),
      };
      Object.entries(values).forEach(([key, value]) => article.style.setProperty(key, `${value}px`));
    }
    function update() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); }); }
    measure();
    article.focus({ preventScroll: true });
    const resize = new ResizeObserver(update);
    if (header) resize.observe(header);
    if (menu) resize.observe(menu);
    video?.addEventListener('loadedmetadata', update);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      video?.removeEventListener('loadedmetadata', update);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [root, active]);
}
