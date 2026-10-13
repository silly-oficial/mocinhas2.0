import React, { useEffect, useState } from 'react';

const atlas = '/assets/skyglass/cloud-glyphs-v2.png';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
let readiness: Promise<boolean> | undefined;
function loadAtlas() {
  return readiness ||= new Promise<boolean>(resolve => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => { readiness = undefined; resolve(false); };
    image.src = atlas;
  });
}
const accents: Record<string, string> = { '\u0301': '´', '\u0300': '`', '\u0302': '^', '\u0303': '~', '\u0308': '¨', '\u0327': '¸' };

/** A single shared raster atlas; no per-frame canvas or expensive SVG filter. */
export function CloudCaption({ text }: { text: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { let active = true; loadAtlas().then(value => { if (active) setReady(value); }); return () => { active = false; }; }, []);
  if (!ready) return <span className="sky-depth-title">{text}</span>;
  return <span className="sky-depth-title sky-cloud-caption" role="img" aria-label={text}>
    <span aria-hidden="true">{text.toLocaleUpperCase().split(/(\s+)/).map((word, index) => /^\s+$/.test(word) ? word.includes('\n') ? <br key={index}/> : <span className="sky-cloud-space" key={index}/> :
      <span className="sky-cloud-word" key={index}>{Array.from(word).map((char, i) => {
        const normalized = char.normalize('NFD');
        const cell = alphabet.indexOf(normalized[0]);
        const accent = accents[normalized[1]];
        if (cell < 0) return <span className="sky-cloud-symbol" key={i}>{char}</span>;
        return <span className={`sky-cloud-glyph ${normalized[1] === '\u0327' ? 'has-cedilla' : ''}`} key={i} data-accent={accent} style={{ backgroundPosition: `${cell % 6 * 20}% ${Math.floor(cell / 6) * 20}%` }}/>
      })}</span>
    )}</span>
  </span>;
}
