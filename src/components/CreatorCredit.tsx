import {creditNotice} from '../../shared/credits';
import React,{useId,useState} from 'react';
import {ArrowUpRight,Copyright} from 'lucide-react';
import type {PersonProfile} from '../../shared/people';
import {socialUrl} from '../../shared/people';

export function MediaCredit({handle,sourceUrl,verified=false,authorized=false,showRights=false,profileAction}:{handle?:string;sourceUrl?:string;verified?:boolean;authorized?:boolean;showRights?:boolean;profileAction?:React.ReactNode}) {
 const original=(handle||'').replace(/^@/,'');
 const [expanded,setExpanded]=useState(false);
 const panelId=useId();
 return <div className={'creator-credit credit-layout'+(profileAction?' credit-layout-card':'')}>
  <div className="credit-identity">{original?<a href={socialUrl('tiktok',original)} target="_blank" rel="noopener noreferrer">@{original}</a>:<span>Origem do TikTok ainda não informada</span>}{verified&&<strong className="verified-profile" aria-label="Titularidade do TikTok verificada">Perfil verificado</strong>}</div>
  <div className="credit-actions">
   {profileAction}
   {original&&<a className="credit-source-button" href={sourceUrl||socialUrl('tiktok',original)} target="_blank" rel="noopener noreferrer">Ver no TikTok<ArrowUpRight size={16} aria-hidden="true"/></a>}
   {showRights&&<button type="button" className="credit-rights-button" aria-expanded={expanded} aria-controls={panelId} onClick={()=>setExpanded(value=>!value)}>Créditos e remoção</button>}
  </div>
  {showRights&&<div className="credit-rights-panel" id={panelId} hidden={!expanded}><p>{creditNotice}</p><a className="creator-removal" href={'/pais?handle='+encodeURIComponent(original)+(sourceUrl?'&conteudo='+encodeURIComponent(sourceUrl):'')}>Pedir remoção / reclamar</a></div>}
  <small className="credit-caption"><Copyright size={13} aria-hidden="true"/>{authorized?<strong className="guardian-badge" aria-label="Autorização documentada do responsável">Autorizado pelo responsável</strong>:<>Conteúdo público do criador original.</>}</small>
 </div>;
}
export function CreatorCredit({person,handle,showRights=false,profileAction}:{person:PersonProfile;handle?:string;showRights?:boolean;profileAction?:React.ReactNode}) {
 return <MediaCredit authorized={person.guardianAuthorized===true&&(!handle||handle.replace(/^@/,'').toLowerCase()===person.socials.tiktok.toLowerCase())} showRights={showRights} profileAction={profileAction} handle={handle||person.socials.tiktok} sourceUrl={person.avatarSelection?.url} verified={!!(person.ownershipVerified??person.verified)&&(!handle||handle.replace(/^@/,'').toLowerCase()===person.socials.tiktok.toLowerCase())}/>;
}
