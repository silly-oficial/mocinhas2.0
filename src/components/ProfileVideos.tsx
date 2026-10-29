import {CuratedPostPlayer} from './CuratedPostPlayer';
import {ProfileAvatar} from './ProfileAvatar';
import {useEffect,useRef,useState} from 'react';
import {Play,X,ChevronLeft,ChevronRight} from 'lucide-react';
import type {PersonProfile} from '../../shared/people';
import {socialVideo} from '../../shared/people';
import {ModalFrame} from './ModalFrame';
import {pauseMedia} from './ManagedVideo';
import {api} from '../services/api';
import {PersonModal} from './PeopleProfiles';
import {MediaCredit} from './CreatorCredit';
import {SocialVideoPlayer} from './SocialVideoPlayer';
type Item={person:PersonProfile;video:PersonProfile['videos'][number];index:number};
const ownsVideo=(item:Item)=>!!item.video.source_handle&&item.video.source_handle.replace(/^@/,'').toLowerCase()===item.person.socials.tiktok.toLowerCase();
const uploaded=(video:Item['video'])=>video.kind==='upload'||video.url.startsWith('/uploads/');
function Cover({item}:{item:Item}){
 const v=item.video;
 if(!v.presentation&&!uploaded(v)){try{const source=socialVideo(v.url);if(source.platform==='TikTok')return <ProfileAvatar selection={source.postType==='photo'?{url:source.canonical,kind:'photo',imageIndex:0}:{url:source.canonical,kind:'video',start:0,end:2}} alt={v.title||'Publicação do TikTok'}/>;}catch{}}
 if(v.presentation&&!uploaded(v)){const p=v.presentation;return <ProfileAvatar selection={p.kind==='photo'?{url:v.url,kind:'photo',imageIndex:p.indices[0],zoom:p.zoom}:{url:v.url,kind:'video',start:p.start,end:p.end,zoom:p.zoom}} alt={v.title||'Prévia selecionada'}/>;}
 if(uploaded(v))return <video src={v.url+'#t=0.1'} muted playsInline preload="metadata" aria-label={v.title||'Prévia do vídeo enviado'}/>;
 return <img src={v.thumbnail||item.person.cover||item.person.avatar||'/profile-placeholder.svg'} alt="" loading="lazy" onError={e=>{e.currentTarget.src='/profile-placeholder.svg';}}/>;
}
export function ProfileVideoGrid({items,onProfile,active=true}:{items:Item[];onProfile:(person:PersonProfile)=>void;active?:boolean}){
 const [selected,setSelected]=useState<number|null>(null);const ref=useRef<HTMLVideoElement>(null);
 useEffect(()=>{if(!active){pauseMedia();setSelected(null);}},[active]);
 const item=selected===null?null:items[selected];
 useEffect(()=>{pauseMedia();if(item&&active)ref.current?.play().catch(()=>{});},[item?.person.id,item?.index,active]);
 const source=item&&!uploaded(item.video)?socialVideo(item.video.url):null;
 return <><div className="profile-reels-grid">{items.map((entry,i)=><article className="profile-reel-card" key={entry.person.id+'-'+entry.index}><button key={entry.person.id+'-'+entry.index} className="profile-reel-tile" onClick={()=>setSelected(i)} aria-label={`Assistir vídeo ${i+1} de @${entry.person.username}`}><Cover item={entry}/><span className="profile-reel-play"><Play size={20} fill="currentColor"/></span><span className="profile-reel-label">{entry.video.title||(entry.video.url.includes('/photo/')?'Carrossel':'Vídeo')}<small>@{entry.person.username}</small></span></button>{entry.video.is_still_available===false&&<small className="origin-unavailable" role="status">Indisponível na origem</small>}<MediaCredit authorized={ownsVideo(entry)&&entry.person.guardianAuthorized===true} verified={ownsVideo(entry)&&!!(entry.person.ownershipVerified??entry.person.verified)} handle={entry.video.source_handle||entry.person.socials.tiktok} sourceUrl={entry.video.source_url||entry.video.url}/><button className="people-secondary" onClick={()=>onProfile(entry.person)}>Ir para o perfil</button></article>)}</div>{!items.length&&<p className="people-empty">Nenhum vídeo publicado nos perfis ainda.</p>}
 {item&&active&&<ModalFrame label={'Vídeo de @'+item.person.username} onClose={()=>setSelected(null)} className="profile-reel-dialog"><section className="profile-reel-player"><header><button className="profile-reel-owner" onClick={()=>{setSelected(null);onProfile(item.person);}} aria-label={'Ver perfil de @'+item.person.username}><ProfileAvatar selection={item.person.avatarSelection} fallback={item.person.avatar} alt={item.person.name}/><span><strong>{item.person.name}</strong><small>@{item.person.username}</small></span></button><button className="people-icon" aria-label="Fechar vídeo" onClick={()=>setSelected(null)}><X/></button></header><div className="profile-reel-stage">{uploaded(item.video)?<video key={item.video.url} ref={ref} src={item.video.url} poster={item.video.thumbnail} controls playsInline autoPlay preload="metadata" onPlay={e=>{document.querySelectorAll<HTMLMediaElement>('video,audio').forEach(other=>{if(other!==e.currentTarget)other.pause();});}}/>:item.video.presentation?<CuratedPostPlayer key={item.video.url} url={item.video.url} presentation={item.video.presentation}/>:<SocialVideoPlayer key={item.video.url} video={item.video} name={item.person.name} profileId={item.person.id} index={item.index}/>}</div><footer><p>{item.video.title||'Publicação do perfil'}</p><MediaCredit authorized={ownsVideo(item)&&item.person.guardianAuthorized===true} verified={ownsVideo(item)&&!!(item.person.ownershipVerified??item.person.verified)} handle={item.video.source_handle||item.person.socials.tiktok} sourceUrl={item.video.source_url||item.video.url}/><div><button aria-label="Vídeo anterior" disabled={selected===0} onClick={()=>setSelected(n=>Math.max(0,n!-1))}><ChevronLeft/></button><span>{selected!+1}/{items.length}</span><button aria-label="Próximo vídeo" disabled={selected===items.length-1} onClick={()=>setSelected(n=>Math.min(items.length-1,n!+1))}><ChevronRight/></button></div></footer></section></ModalFrame>}</>;
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


