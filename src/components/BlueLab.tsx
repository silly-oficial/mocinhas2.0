import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Minus,Plus,RotateCcw,Settings2,X} from 'lucide-react';
import {blueAssets,type BlueLinks} from '../../shared/blue-lab';
import type {PersonProfile} from '../../shared/people';
import {api} from '../services/api';
import {PersonModal} from './PeopleProfiles';
import './blue-lab.css';

export function BlueLab({admin,onBack}:{admin:boolean;onBack:()=>void}){
 const [people,setPeople]=useState<PersonProfile[]>([]),[links,setLinks]=useState<BlueLinks>({}),[chosen,setChosen]=useState(''),[profile,setProfile]=useState<PersonProfile|null>(null),[manage,setManage]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[loaded,setLoaded]=useState(false),[zoom,setZoom]=useState(1),[focus,setFocus]=useState(blueAssets[0].id as string);
 const scroll=useRef<HTMLDivElement>(null),cycle=useRef<HTMLDivElement>(null),surface=useRef<HTMLDivElement>(null),gesture=useRef({distance:0,zoom:1}),zoomRef=useRef(1),activeRef=useRef(focus),dragged=useRef(false);
 const load=()=>{setLoaded(false);Promise.all([api.getPeople(admin),api.getBlueLab(admin)]).then(([p,c])=>{setPeople(p.profiles);setLinks(c.links);setLoaded(true);setNotice('');}).catch(()=>setNotice('Não foi possível carregar os perfis. Tente novamente.'));};
 useEffect(()=>{load();},[admin]);
 useEffect(()=>{zoomRef.current=zoom;},[zoom]);
 useEffect(()=>{const node=scroll.current;if(!node)return;const dist=(e:TouchEvent)=>Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
 const start=(e:TouchEvent)=>{if(e.touches.length===2){e.preventDefault();dragged.current=true;const item=(e.target as HTMLElement).closest<HTMLElement>('[data-blue-id]');if(item){activeRef.current=item.dataset.blueId!;setFocus(activeRef.current);}gesture.current={distance:dist(e),zoom:zoomRef.current};}};
 const move=(e:TouchEvent)=>{if(e.touches.length===2&&gesture.current.distance){e.preventDefault();setZoom(Math.max(1,Math.min(2.4,gesture.current.zoom*dist(e)/gesture.current.distance)));}};
 const end=()=>{gesture.current.distance=0;setTimeout(()=>{dragged.current=false;},200);};
 node.addEventListener('touchstart',start,{passive:false});node.addEventListener('touchmove',move,{passive:false});node.addEventListener('touchend',end);node.addEventListener('touchcancel',end);
 const h=cycle.current?.offsetHeight||0;if(h)node.scrollTop=h;
 return()=>{node.removeEventListener('touchstart',start);node.removeEventListener('touchmove',move);node.removeEventListener('touchend',end);node.removeEventListener('touchcancel',end);};},[]);
 const onScroll=()=>{const n=scroll.current,h=cycle.current?.offsetHeight||0;if(!n||!h)return;if(n.scrollTop<h*.35)n.scrollTop+=h;else if(n.scrollTop>h*1.65)n.scrollTop-=h;surface.current?.style.setProperty('--scroll-depth',`${(n.scrollTop%h)*.035}px`);};
 const save=async()=>{setBusy(true);try{const result=await api.saveBlueLab(links);setLinks(result.links);setNotice('Vínculos salvos para todos os usuários.');}catch(e:any){setNotice(e.message||'Falha ao salvar.');}finally{setBusy(false);}};
 const open=(p:PersonProfile)=>{setProfile(p);};
 return <section className="blue-lab" aria-label="Azul infinito experimental">
 <div hidden={!!profile}>
 <header className="blue-lab-bar"><button onClick={onBack} aria-label="Sair do Azul infinito"><ArrowLeft size={18}/><span>Voltar</span></button><div><strong>Azul infinito</strong><small>EXPERIMENTAL</small></div>{admin?<button onClick={()=>setManage(v=>!v)} aria-pressed={manage} aria-label="Vincular perfis"><Settings2 size={18}/></button>:<span/>}</header>
 <div className="blue-lab-tools" aria-label="Zoom da cena"><button aria-label="Diminuir zoom" onClick={()=>setZoom(v=>Math.max(1,v-.2))} disabled={zoom<=1}><Minus size={17}/></button><output>{Math.round(zoom*100)}%</output><button aria-label="Aumentar zoom" onClick={()=>setZoom(v=>Math.min(2.4,v+.2))} disabled={zoom>=2.4}><Plus size={17}/></button><button aria-label="Restaurar zoom" onClick={()=>setZoom(1)}><RotateCcw size={15}/></button></div>
 {notice&&<div className="blue-lab-notice" role="status">{notice}{!loaded&&<button onClick={load}>Tentar novamente</button>}</div>}
 <div className="blue-lab-scroll" ref={scroll} onScroll={onScroll} tabIndex={0} aria-label="Galeria contínua. Role para explorar e use dois dedos para ampliar.">
 <div className="blue-lab-surface" ref={surface}>
 {[0,1,2].map(loop=><div className="blue-lab-cycle" key={loop} ref={loop===0?cycle:undefined}>{blueAssets.map((asset,index)=>{const key=loop+':'+asset.id,selected=chosen===key;const linked=(links[asset.id]||[]).map(id=>people.find(p=>p.id===id&&p.published)).filter((p):p is PersonProfile=>!!p);return <article className="blue-lab-scene" key={key} data-blue-id={asset.id} style={{aspectRatio:`${asset.width}/${asset.height}`,'--scene-zoom':focus===asset.id?zoom:1,'--scene-index':index} as React.CSSProperties}>
 <button className="blue-lab-photo" aria-label={`Explorar foto ${index+1}`} aria-expanded={selected} onClick={()=>{if(dragged.current)return;setChosen(selected?'':key);setFocus(asset.id);}}><img src={asset.src} width={asset.width} height={asset.height} alt={`Cena azul ${index+1}`} loading="lazy" decoding="async" draggable={false}/></button>
 <span className="blue-lab-star" aria-hidden="true">✦</span><span className="blue-lab-ring" aria-hidden="true"/>
 {selected&&<div className="blue-lab-person" role="group" aria-label="Perfis desta foto"><button className="blue-lab-dismiss" aria-label="Fechar opções da foto" onClick={()=>setChosen('')}><X size={15}/></button>{linked.length?linked.map(p=><button className="blue-lab-open" key={p.id} onClick={()=>open(p)}><img src={p.avatar} alt=""/><span>{linked.length>1?p.name:'Abrir perfil'}</span><ArrowUpRight size={16}/></button>):<small>{admin?'Vincule o perfil desta foto em Configurações.':'Perfil disponível em breve.'}</small>}</div>}
 </article>;})}</div>)}
 </div></div>
 <div className="blue-lab-hint">Role para descobrir · Use dois dedos para ampliar</div>
 {manage&&admin&&<div className="blue-lab-manager"><div className="blue-lab-manager-head"><h2>Vincular perfis às fotos</h2><button aria-label="Fechar vínculos" onClick={()=>setManage(false)}><X/></button></div><p>Selecione quem aparece em cada imagem. Fotos de grupo podem abrir mais de um perfil. Rascunhos não aparecem para visitantes.</p>{!loaded?<button onClick={load}>Carregar perfis novamente</button>:<>{blueAssets.map((asset,index)=><label className="blue-lab-map" key={asset.id}><img src={asset.src} alt={`Foto ${index+1}`} loading="lazy"/><span>Foto {index+1}<select multiple aria-label={`Perfis da foto ${index+1}`} value={links[asset.id]||[]} onChange={e=>setLinks({...links,[asset.id]:Array.from(e.target.selectedOptions,o=>o.value)})}>{people.map(p=><option value={p.id} key={p.id}>{p.name} · @{p.username}{p.published?'':' (rascunho)'}</option>)}</select><button onClick={()=>setLinks({...links,[asset.id]:[]})}>Limpar vínculo</button></span></label>)}<button className="blue-lab-save" disabled={busy} onClick={save}>{busy?'Salvando…':'Salvar vínculos'}</button></>}{notice&&<p role="status">{notice}</p>}</div>}
 </div>
 {profile&&<div className="blue-lab-profile"><PersonModal person={profile} asPage onClose={()=>setProfile(null)}/></div>}
 </section>;
}
