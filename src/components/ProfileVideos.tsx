import {useEffect,useRef,useState} from 'react';
import {Play,X,ChevronLeft,ChevronRight} from 'lucide-react';
import type {PersonProfile} from '../../shared/people';
import {socialVideo} from '../../shared/people';
import {ModalFrame} from './ModalFrame';
import {pauseMedia} from './ManagedVideo';
import {api} from '../services/api';
import {PersonModal} from './PeopleProfiles';
type Item={person:PersonProfile;video:PersonProfile['videos'][number];index:number};
const uploaded=(video:Item['video'])=>video.kind==='upload'||video.url.startsWith('/uploads/');
function Cover({item}:{item:Item}){
 const v=item.video;
 return v.thumbnail?<img src={v.thumbnail} alt="" loading="lazy" onError={e=>{e.currentTarget.src=item.person.cover||item.person.avatar;}}/>:uploaded(v)?<video src={v.url+'#t=0.1'} muted playsInline preload="metadata" aria-hidden="true"/>:<img src={item.person.cover||item.person.avatar} alt="" loading="lazy"/>;
}
export function ProfileVideoGrid({items,onProfile,active=true}:{items:Item[];onProfile:(person:PersonProfile)=>void;active?:boolean}){
 const [selected,setSelected]=useState<number|null>(null);const ref=useRef<HTMLVideoElement>(null);
 useEffect(()=>{if(!active){pauseMedia();setSelected(null);}},[active]);
 const item=selected===null?null:items[selected];
 useEffect(()=>{pauseMedia();if(item&&active)ref.current?.play().catch(()=>{});},[item?.person.id,item?.index,active]);
 const source=item&&!uploaded(item.video)?socialVideo(item.video.url):null;
 return <><div className="profile-reels-grid">{items.map((entry,i)=><button key={entry.person.id+'-'+entry.index} className="profile-reel-tile" onClick={()=>setSelected(i)} aria-label={`Assistir vídeo ${i+1} de @${entry.person.username}`}><Cover item={entry}/><span className="profile-reel-play"><Play size={20} fill="currentColor"/></span><span className="profile-reel-label">{entry.video.title||'Vídeo'}<small>@{entry.person.username}</small></span></button>)}</div>{!items.length&&<p className="people-empty">Nenhum vídeo publicado nos perfis ainda.</p>}
 {item&&active&&<ModalFrame label={'Vídeo de @'+item.person.username} onClose={()=>setSelected(null)} className="profile-reel-dialog"><section className="profile-reel-player"><header><button className="profile-reel-owner" onClick={()=>{setSelected(null);onProfile(item.person);}} aria-label={'Ver perfil de @'+item.person.username}><img src={item.person.avatar} alt={item.person.name}/><span><strong>{item.person.name}</strong><small>@{item.person.username}</small></span></button><button className="people-icon" aria-label="Fechar vídeo" onClick={()=>setSelected(null)}><X/></button></header><div className="profile-reel-stage">{uploaded(item.video)?<video key={item.video.url} ref={ref} src={item.video.url} poster={item.video.thumbnail} controls playsInline autoPlay preload="metadata" onPlay={e=>{document.querySelectorAll<HTMLMediaElement>('video,audio').forEach(other=>{if(other!==e.currentTarget)other.pause();});}}/>:<iframe key={item.video.url} src={source!.embed} title={item.video.title||item.person.name} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen/>}</div><footer><p>{item.video.title||'Vídeo do perfil'}</p><div><button aria-label="Vídeo anterior" disabled={selected===0} onClick={()=>setSelected(n=>Math.max(0,n!-1))}><ChevronLeft/></button><span>{selected!+1}/{items.length}</span><button aria-label="Próximo vídeo" disabled={selected===items.length-1} onClick={()=>setSelected(n=>Math.min(items.length-1,n!+1))}><ChevronRight/></button></div></footer></section></ModalFrame>}</>;
}
export function ProfileVideosFeed({active,onActiveChange}:{active:boolean;onActiveChange:(active:boolean)=>void}){
 const [profiles,setProfiles]=useState<PersonProfile[]>([]),[person,setPerson]=useState<PersonProfile|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);const position=useRef(0);
 const load=()=>api.getPeople().then(result=>{setProfiles(result.profiles);setError('');}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
 useEffect(()=>{let alive=true;const update=()=>{if(alive)load();};update();window.addEventListener('mocinhas:people-updated',update);return()=>{alive=false;window.removeEventListener('mocinhas:people-updated',update);};},[]);
 useEffect(()=>{onActiveChange(!!person);return()=>onActiveChange(false);},[person,onActiveChange]);
 const items=profiles.flatMap(person=>person.videos.map((video,index)=>({person,video,index})));
 if(person)return <PersonModal person={person} asPage onClose={()=>{setPerson(null);requestAnimationFrame(()=>window.scrollTo(0,position.current));}}/>;
 return <section className="people-section profile-videos-feed"><div className="people-heading"><div><span>Conheça quem está por trás de cada vídeo</span><h2>Vídeos dos perfis</h2></div></div>{loading?<p role="status">Carregando vídeos…</p>:error?<p role="alert">{error} <button className="people-secondary" onClick={load}>Tentar novamente</button></p>:<ProfileVideoGrid items={items} active={active} onProfile={profile=>{position.current=window.scrollY;setPerson(profile);window.scrollTo(0,0);}}/>}</section>;
}
