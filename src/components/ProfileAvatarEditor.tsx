import React,{useState} from 'react';
import {tiktokPost} from '../../shared/people';
import {validateProfileAvatar,type ProfileAvatarSelection} from '../../shared/profile-avatar';
import {ProfileAvatar} from './ProfileAvatar';
import {MediaCredit} from './CreatorCredit';
export function ProfileAvatarEditor({value,onChange}:{value?:ProfileAvatarSelection;onChange:(v:ProfileAvatarSelection|undefined)=>void}){
 const [link,setLink]=useState(value?.url||''),[draft,setDraft]=useState(value),[error,setError]=useState(''),[position,setPosition]=useState(0);
 function open(){try{setPosition(0);const source=tiktokPost(link.trim());setDraft(source.postType==='photo'?{url:source.canonical,kind:'photo',imageIndex:0}:{url:source.canonical,kind:'video',start:0,end:2});setError('');}catch(e:any){setError(e.message);}}
 return <section className="avatar-link-editor"><h3>Avatar por link do TikTok</h3><label>Link do vídeo ou carrossel<input type="url" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://www.tiktok.com/@criador/photo/…"/></label><button type="button" className="people-secondary" onClick={open}>Abrir publicação</button>
 {draft&&<><ProfileAvatar key={draft.url} selection={draft} alt="Prévia do avatar" preview onPosition={setPosition}/>
 {draft.kind==='photo'?<label>Foto do carrossel (começa em 1)<input type="number" min={1} max={1000} step={1} value={draft.imageIndex+1} onChange={e=>setDraft({...draft,imageIndex:Number(e.target.value)-1})}/><button type="button" onClick={()=>setDraft({...draft,imageIndex:position})}>Usar foto exibida ({position+1})</button></label>:<><label>Início em segundos<input type="number" min={0} step={.1} value={draft.start} onChange={e=>setDraft({...draft,start:Number(e.target.value)})}/></label><label>Fim em segundos<input type="number" min={0} step={.1} value={draft.end} onChange={e=>setDraft({...draft,end:Number(e.target.value)})}/></label><button type="button" onClick={()=>setDraft({...draft,start:Math.round(position*10)/10,end:Math.round((position+2)*10)/10})}>Começar no momento exibido</button></>}
 <MediaCredit handle={new URL(draft.url).pathname.split('/')[1]} sourceUrl={draft.url}/><button type="button" className="people-secondary" onClick={()=>{try{onChange(validateProfileAvatar(draft));setError('Seleção aplicada. Salve o perfil para confirmar.');}catch(e:any){setError(e.message);}}}>Usar seleção como avatar</button></>}
 {value&&<button type="button" onClick={()=>{onChange(undefined);setDraft(undefined);}}>Remover avatar por link</button>}<p>Guardamos somente o link e a seleção. Trechos repetem do início ao fim, sem reprodução reversa. A exibição depende do player do TikTok; se ele falhar, aparece o avatar padrão.</p>{error&&<p role="status">{error}</p>}</section>;
}
