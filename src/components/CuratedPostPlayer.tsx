import {useState} from 'react';
import {ChevronLeft,ChevronRight,Play} from 'lucide-react';
import type {PostPresentation} from '../../shared/post-presentation';
import {ProfileAvatar} from './ProfileAvatar';
export function CuratedPostPlayer({url,presentation}:{url:string;presentation:PostPresentation}){
 const [index,setIndex]=useState(0),[play,setPlay]=useState(0);
 const n=presentation.kind==='photo'?Math.min(index,presentation.indices.length-1):0;
 const selection=presentation.kind==='photo'?{url,kind:'photo' as const,imageIndex:presentation.indices[n],zoom:presentation.zoom}:{url,kind:'video' as const,start:presentation.start,end:presentation.end,zoom:presentation.zoom};
 return <div className="curated-post-player"><ProfileAvatar selection={selection} alt="Publicação selecionada pelo diretório" playToken={play} interactive={presentation.kind==='video'}/>{presentation.kind==='photo'?<div className="media-stepper"><button type="button" className="people-secondary" disabled={n===0} onClick={()=>setIndex(n-1)} aria-label="Foto selecionada anterior"><ChevronLeft/></button><span>{n+1} / {presentation.indices.length}</span><button type="button" className="people-secondary" disabled={n===presentation.indices.length-1} onClick={()=>setIndex(n+1)} aria-label="Próxima foto selecionada"><ChevronRight/></button></div>:<button type="button" className="people-secondary" onClick={()=>setPlay(n=>n+1)}><Play size={18}/>Reproduzir trecho · {presentation.start.toFixed(1)}–{presentation.end.toFixed(1)} s</button>}</div>;
}
