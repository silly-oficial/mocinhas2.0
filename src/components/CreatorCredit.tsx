import {creditNotice} from '../../shared/credits';
import React from 'react';
import type {PersonProfile} from '../../shared/people';
import {socialUrl} from '../../shared/people';
export function MediaCredit({handle,sourceUrl,verified=false}:{handle?:string;sourceUrl?:string;verified?:boolean}) {
  const original=(handle||'').replace(/^@/,'');
  return <div className="creator-credit">{original?<><a href={socialUrl('tiktok',original)} target="_blank" rel="noopener noreferrer">@{original}</a><a className="people-secondary" href={sourceUrl||socialUrl('tiktok',original)} target="_blank" rel="noopener noreferrer">Ver no TikTok</a></>:<span>Origem do TikTok ainda não informada</span>}<small>Imagem/vídeo do criador original</small><small>{creditNotice}</small><a className="creator-removal" href={'/pais?handle='+encodeURIComponent(original)+(sourceUrl?'&conteudo='+encodeURIComponent(sourceUrl):'')}>Pedir remoção / reclamar</a>{verified&&<strong className="verified-profile">Perfil Verificado</strong>}</div>;
}
export function CreatorCredit({person,handle}:{person:PersonProfile;handle?:string}) {return <MediaCredit handle={handle||person.socials.tiktok} verified={!!person.verified&&(!handle||handle.replace(/^@/,'').toLowerCase()===person.socials.tiktok.toLowerCase())}/>;}

