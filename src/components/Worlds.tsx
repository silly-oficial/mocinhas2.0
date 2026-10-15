import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowLeft,Plus,Sparkles,Image as ImageIcon} from 'lucide-react';
import {WORLDS,belongsToWorld,type World,type WorldId} from '../../shared/worlds';
import {FullPhotoViewer} from './FullPhotoViewer';
import {Post} from '../types';

export function WorldHub({onChoose}:{onChoose:(id:WorldId)=>void}) {
 return <section className="world-hub" aria-labelledby="world-hub-title"><div className="world-hub-heading"><span className="world-kicker"><Sparkles size={16}/> UM CLIQUE, UM MUNDO NOVO</span><h1 id="world-hub-title">Qual mundo vamos <em>explorar?</em></h1><p>Escolha sua cor, encontre novas inspirações e deixe a imaginação passear.</p></div>
  <div className="world-portals">{WORLDS.map((world,i)=><button className={`world-portal world-${world.id}`} key={world.id} onClick={()=>onChoose(world.id)} aria-label={`Entrar no mundo ${world.name}`}><span className="world-portal-number" aria-hidden="true">0{i+1}</span><span className="world-portal-art"><img src={world.art} alt="" loading="lazy" width="480" height="480"/></span><span className="world-portal-copy"><strong>{world.name}</strong><span>{world.hint}</span><span className="world-portal-enter">Entrar nesse mundo <ArrowRight size={18}/></span></span></button>)}</div>
  <p className="world-hub-note"><span aria-hidden="true">✦</span> Cada mundo tem seu jeitinho. Qual combina com você hoje?</p>
 </section>;
}

export function WorldGallery({world,posts,loading,admin,onBack,onSwitch,onAdd}:{world:World;posts:Post[];loading:boolean;admin:boolean;onBack:()=>void;onSwitch:(id:WorldId)=>void;onAdd:()=>void}) {
 const [selected,setSelected]=useState<{src:string;alt:string}|null>(null);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus({preventScroll:true});setSelected(null);},[world.id]);
 const photos=posts.filter(post=>belongsToWorld(post.hashtags,world)).flatMap(post=>post.media.filter(media=>media.type==='image'||media.type==='gif').map((media,index)=>({id:`${post.id}-${media.id||index}`,url:media.url,caption:post.caption?.replace(/#[a-zA-Z0-9_À-ÿ]+/g,'').trim()||''})));
 return <section className={`world-page world-${world.id}`} aria-labelledby="world-title"><div className="world-backbar"><button onClick={onBack}><ArrowLeft size={18}/> Voltar</button><span>Você está no mundo {world.name}</span></div>
  <div className="world-scene"><div className="world-scene-copy"><span className="world-kicker">UM MUNDO PARA CHAMAR DE SEU</span><h1 id="world-title" tabIndex={-1} ref={heading}>{world.name}</h1><p>{world.invite}</p><span className="world-photo-count"><ImageIcon size={16}/>{loading?'Carregando fotos…':`${photos.length} ${photos.length===1?'foto para descobrir':'fotos para descobrir'}`}</span></div><div className="world-scene-art" aria-hidden="true"><img src={world.art} alt="" width="480" height="480"/>{world.id==='cn'&&<img className="world-art-friend" src="/worlds/cn-friends.png" alt=""/>}{world.id==='powerpuff'&&<span className="world-trio-dots"><i/><i/><i/></span>}</div></div>
  <nav className="world-switcher" aria-label="Explorar outro mundo">{WORLDS.map(item=><button key={item.id} aria-current={item.id===world.id?'page':undefined} onClick={()=>onSwitch(item.id)}>{item.name}</button>)}</nav>
  <div className="world-gallery-heading"><div><span className="world-kicker">UM ÁLBUM CHEIO DE PERSONALIDADE</span><h2>As fotos deste mundo</h2></div>{admin&&<button className="world-add" onClick={onAdd}><Plus size={18}/> Adicionar fotos</button>}</div>
  {loading?<p role="status" className="world-empty">Preparando esse mundo…</p>:!photos.length?<div className="world-empty"><Sparkles size={30}/><h3>Esse mundo está esperando suas primeiras fotos!</h3><p>{admin?'Toque em Adicionar fotos e publique as imagens que combinam com esta categoria.':'Novas fotos vão aparecer por aqui. Enquanto isso, conheça os outros mundos.'}</p>{admin&&<button className="world-add" onClick={onAdd}><Plus size={18}/> Adicionar fotos</button>}</div>:<div className="world-photo-grid">{photos.map((photo,index)=><article className="world-photo-card" key={photo.id}><button onClick={()=>setSelected({src:photo.url,alt:photo.caption||`Foto ${index+1} do mundo ${world.name}`})} aria-label={`Ver foto completa ${index+1} do mundo ${world.name}`}><img src={photo.url} alt={photo.caption||`Foto ${index+1}`} loading="lazy" onError={event=>{event.currentTarget.src='/profile-placeholder.svg';}}/></button>{photo.caption&&<p>{photo.caption}</p>}</article>)}</div>}
  {selected&&<FullPhotoViewer src={selected.src} alt={selected.alt} onClose={()=>setSelected(null)}/>}
 </section>;
}
