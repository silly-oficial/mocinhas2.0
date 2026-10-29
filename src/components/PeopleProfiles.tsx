import {profileFeed} from '../media/profile-feed';
import {ageLabel} from '../../shared/profile-editorial';
import {ProfileAvatar} from './ProfileAvatar';
import {CreatorCredit} from './CreatorCredit';
import {ProfileVideoGrid} from './ProfileVideos';
import {useTheme} from '../context/ThemeContext';
import React, {useEffect,useState,useLayoutEffect,useRef,useCallback} from 'react';
import {Search,Users,X,ArrowUpRight,Share2,Image as ImageIcon,Play,ChevronLeft} from 'lucide-react';
import {api} from '../services/api';
import {useUi,ui} from '../i18n/ui';
import {ModalFrame} from './ModalFrame';
import {FullPhotoViewer} from './FullPhotoViewer';
import {pauseMedia} from './ManagedVideo';
import {socialVideo,type PersonProfile} from '../../shared/people';

export function PersonModal({person,onClose,asPage=false}:{person:PersonProfile;onClose:()=>void;asPage?:boolean}){
 useUi();const [tab,setTab]=useState('photos'),[photo,setPhoto]=useState<string|null>(null),[notice,setNotice]=useState('');
 useEffect(()=>{pauseMedia();},[]);
 async function share(){const url=window.location.origin+'/#person='+encodeURIComponent(person.username);try{if(navigator.share)await navigator.share({title:person.name,url});else{await navigator.clipboard.writeText(url);setNotice(ui('Link do perfil copiado.'));}}catch{setNotice(ui('Não foi possível compartilhar agora.'));}}
 const photoPosts=person.videos.flatMap((video,index)=>{try{return socialVideo(video.url).postType==='photo'?[{person,video,index}]:[];}catch{return [];}});
 const videoPosts=person.videos.flatMap((video,index)=>photoPosts.some(item=>item.index===index)?[]:[{person,video,index}]);
 const detail=<><article className="people-detail">
  {asPage?<div className="people-backbar"><button className="people-secondary" onClick={onClose}><ChevronLeft size={19}/>{ui('Voltar')}</button><span>{ui('Perfil')}</span></div>:<div className="people-modal-toolbar"><button className="people-close" onClick={onClose} aria-label={ui('Fechar')}><X/></button></div>}<div className="people-cover" style={person.cover?{backgroundImage:`url(${JSON.stringify(person.cover)})`}:undefined}/>
  <div className="people-detail-body"><ProfileAvatar className="people-avatar" selection={person.avatarSelection} interactive={person.avatarSelection?.kind==='video'} fallback={person.avatar} alt={person.name}/><div className="people-title"><div><h2>{person.name}</h2>{person.subjectType!=='animal'&&<p className="profile-age">{ageLabel(person)} · <a href={'/pais?tipo=corrigir_idade&handle='+encodeURIComponent(person.username)}>Corrigir idade</a></p>}</div><button className="people-icon" aria-label={ui('Compartilhar perfil')} onClick={share}><Share2 size={19}/></button></div>
   <CreatorCredit showRights person={person} handle={person.avatarSelection?new URL(person.avatarSelection.url).pathname.split('/')[1]:undefined}/>

   <div className="people-tabs" role="tablist" aria-label={ui('Mídias do perfil')}><button role="tab" aria-selected={tab==='photos'} onClick={()=>{setTab('photos');}}><ImageIcon size={17}/>{ui('Fotos')} <span>{person.photos.length+photoPosts.length}</span></button><button role="tab" aria-selected={tab==='videos'} onClick={()=>{setTab('videos');}}><Play size={17}/>{ui('Vídeos')} <span>{videoPosts.length}</span></button></div>
   {tab==='photos'?<>{photoPosts.length>0&&<ProfileVideoGrid items={photoPosts} onProfile={()=>{}}/>}<div className="people-photos">{person.photos.map((src,index)=><article key={src+index}><button onClick={()=>setPhoto(src)} aria-label={ui('Ver foto completa')+' '+(index+1)}><img src={src} alt={person.name+' — '+(index+1)} loading="lazy"/></button><CreatorCredit person={person} handle={person.mediaSources?.find(m=>m.url===src)?.source_handle}/></article>)}{!person.photos.length&&!photoPosts.length&&<p>{ui('Nenhuma foto adicionada ainda.')}</p>}</div></>:<ProfileVideoGrid items={videoPosts} onProfile={()=>{}}/>}

   {notice&&<p role="status">{notice}</p>}
  </div></article>{photo&&<FullPhotoViewer handle={person.mediaSources?.find(m=>m.url===photo)?.source_handle||person.socials.tiktok} src={photo} alt={person.name} onClose={()=>setPhoto(null)}/>}</>;
 return asPage?<section className="people-section people-profile-page" aria-label={ui('Perfil')+' '+person.name}>{detail}</section>:<ModalFrame onClose={onClose} label={ui('Perfil')+' '+person.name} className="people-dialog">{detail}</ModalFrame>;
}

export function PeopleProfiles({compact=false,admin=false,onManage,onSeeAll,onActiveChange,resetKey=0}:{compact?:boolean;admin?:boolean;onManage:()=>void;onSeeAll:()=>void;onActiveChange:(active:boolean)=>void;resetKey?:number}){
 useUi();const [profiles,setProfiles]=useState<PersonProfile[]>([]),[selected,setSelected]=useState<PersonProfile|null>(null),[query,setQuery]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[feedPhoto,setFeedPhoto]=useState<{person:PersonProfile;url:string}|null>(null);
 const returnPosition=useRef({y:0,x:0,rails:[] as {selector:string;index:number;left:number}[]});
 const openPerson=useCallback((person:PersonProfile)=>{returnPosition.current={y:window.scrollY,x:window.scrollX,rails:['.orix-gallery','.people-cards'].flatMap(selector=>[...document.querySelectorAll<HTMLElement>(selector)].map((node,index)=>({selector,index,left:node.scrollLeft})))};pauseMedia();setSelected(person);window.scrollTo({top:0,left:0,behavior:'instant'});},[]);
 const closePerson=()=>{setSelected(null);if(location.hash.startsWith('#person='))history.replaceState(null,'',location.pathname+location.search);requestAnimationFrame(()=>{const position=returnPosition.current;position.rails.forEach(({selector,index,left})=>{const node=document.querySelectorAll<HTMLElement>(selector)[index];if(node)node.scrollLeft=left;});window.scrollTo({top:position.y,left:position.x,behavior:'instant'});});};
 useEffect(()=>{setSelected(null);},[resetKey]);
 useEffect(()=>{let alive=true;async function load(){try{const result=await api.getPeople();if(alive){setProfiles(result.profiles);setError('');const username=new URLSearchParams(location.hash.slice(1)).get('person');if(username){const person=result.profiles.find(p=>p.username===username);if(person)openPerson(person);}}}catch(e:any){if(alive)setError(e.message);}finally{if(alive)setLoading(false);}}load();window.addEventListener('mocinhas:people-updated',load);return()=>{alive=false;window.removeEventListener('mocinhas:people-updated',load);};},[]);
 useLayoutEffect(()=>{onActiveChange(!!selected);return()=>onActiveChange(false);},[selected,onActiveChange]);
 const {theme}=useTheme();
 const rows=profiles.filter(p=>`${p.name} ${p.username}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));const shown=compact?rows.slice(0,4):rows;
 const {photos:feedPhotos,carousels:feedCarousels}=profileFeed(profiles);
 if(selected)return <PersonModal person={selected} asPage onClose={closePerson}/>;
 if(compact&&!loading&&!profiles.length&&!error&&!admin)return null;
 return <section className={`people-section ${compact?'people-compact':''}`}><div className="people-heading"><div><span>{ui(theme === 'gymnastics' ? 'Conheça quem vive o movimento' : 'Diretório de perfis')}</span><h2><Users size={22}/>{ui(theme === 'gymnastics' ? 'Descubra ginastas' : compact?'Conheça os perfis':'Explore os perfis')}</h2></div><div>{admin&&<button className="people-secondary" onClick={onManage}>{ui('Gerenciar perfis')}</button>}{compact&&<button className="people-secondary" onClick={onSeeAll}>{ui('Ver todos')}</button>}</div></div>
  <>{!compact&&<label className="people-search"><Search size={18}/><input aria-label={ui('Buscar perfis')} placeholder={ui('Buscar por nome ou @usuário')} value={query} onChange={e=>setQuery(e.target.value)}/></label>}</>
  {loading?<p role="status">{ui('Carregando perfis…')}</p>:error?<p role="alert">{error}</p>:<div className="people-cards">{shown.map(p=><article className="people-card" key={p.id}><div className="collection-card-visual"><button className="people-card-photo" onClick={()=>openPerson(p)} aria-label={ui('Ver perfil')+' '+p.name}><ProfileAvatar selection={p.avatarSelection} fallback={p.avatar} alt={p.name}/></button><div className="collection-card-title"><h3>{p.name}</h3><span>@{p.socials.tiktok||p.username}</span></div><button className="collection-open" onClick={()=>openPerson(p)} aria-label={ui('Ver perfil')+' '+p.name}><ArrowUpRight size={20}/></button><div className="collection-card-meta"><span><small>{ui('Publicações')}</small><strong>{p.photos.length+p.videos.length}</strong></span><button onClick={()=>openPerson(p)} aria-label={ui('Ver perfil')+' '+p.name}><ArrowUpRight size={21}/></button></div></div><div className="people-card-body">{p.subjectType!=='animal'&&<details className="collection-profile-info"><summary>{ui('Informações do perfil')}</summary><p className="profile-age">{ageLabel(p)} · <a href={'/pais?tipo=corrigir_idade&handle='+encodeURIComponent(p.username)}>Corrigir idade</a></p></details>}<CreatorCredit person={p} handle={p.avatarSelection?new URL(p.avatarSelection.url).pathname.split('/')[1]:p.mediaSources?.find(m=>m.url===p.avatar)?.source_handle} profileAction={<button className="credit-profile-button" onClick={()=>openPerson(p)}>{ui('Ir para o perfil')}<ArrowUpRight size={17}/></button>}/></div></article>)}</div>}
  {!loading&&!error&&!shown.length&&<p className="people-empty">{profiles.length?ui('Nenhum perfil encontrado.'):admin?ui('Adicione o primeiro perfil ao diretório pelo painel.'):ui('Novos perfis aparecerão aqui em breve.')}</p>}

  {compact&&!loading&&!error&&(feedPhotos.length>0||feedCarousels.length>0)&&<><h3 className="people-heading">Fotos dos perfis</h3><div className="people-photos">{feedPhotos.map(({person,url})=><article key={person.id+url}><button onClick={()=>setFeedPhoto({person,url})} aria-label={'Ver foto de '+person.name}><img src={url} alt={person.name} loading="lazy"/></button><CreatorCredit person={person} profileAction={<button className="credit-profile-button" onClick={()=>openPerson(person)}>Ir para o perfil</button>}/></article>)}</div>{feedCarousels.length>0&&<ProfileVideoGrid items={feedCarousels} onProfile={openPerson}/>}</>}
  {feedPhoto&&<FullPhotoViewer handle={feedPhoto.person.socials.tiktok} src={feedPhoto.url} alt={feedPhoto.person.name} onClose={()=>setFeedPhoto(null)}/>}
 </section>;
}



