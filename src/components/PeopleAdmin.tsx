import {uploadProfileFile} from '../services/profile-upload';
import {profilePublishable} from '../../shared/profile-editorial';
import {PostPresentationEditor} from './PostPresentationEditor';
import {ProfileAvatarEditor} from './ProfileAvatarEditor';
import React,{useEffect,useState,useRef} from 'react';
import {Plus,X,Trash2,Users,Search,Upload,Image as ImageIcon,Video} from 'lucide-react';
import {ModalFrame} from './ModalFrame';
import {api} from '../services/api';
import {ui,useUi} from '../i18n/ui';
import {tiktokPost,type PersonProfile} from '../../shared/people';
const blank=():Partial<PersonProfile>=>({subjectType:'animal',name:'',username:'',bio:'',avatar:'',cover:'',photos:[],videos:[],socials:{tiktok:'',instagram:'',pinterest:''},tags:[],hidden:false,published:true,featured:false,order:0,ageBand:'desconhecido',ageSource:'desconhecido',adultReview:{evidenceUrl:'',contentReviewed:false}});
export function PeopleAdmin({onClose}:{onClose:()=>void}){
 useUi();
 const [rows,setRows]=useState<PersonProfile[]>([]),[draft,setDraft]=useState<Partial<PersonProfile>>(blank),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[link,setLink]=useState(''),[loading,setLoading]=useState(true),[search,setSearch]=useState(''),[linkStatus,setLinkStatus]=useState('');
 const [identityInput,setIdentityInput]=useState(''),[identityStatus,setIdentityStatus]=useState(''),[identityBusy,setIdentityBusy]=useState(false),[identityResolved,setIdentityResolved]=useState('');
 const identityPending=/^https?:\/\//i.test(identityInput.trim())&&identityResolved!==identityInput.trim();
 const currentDraft=useRef(draft);currentDraft.current=draft;
 useEffect(()=>{
  const raw=identityInput.trim();if(!/^https?:\/\//i.test(raw)){setIdentityBusy(false);return;}
  let active=true;setIdentityBusy(true);setIdentityStatus('Buscando nome e @ no TikTok…');
  const timer=setTimeout(async()=>{try{
   const result=await api.resolveTikTokIdentity(raw);if(!active)return;
   const old=currentDraft.current;const sources=[old.avatarSelection?.url,...(old.videos||[]).filter(v=>v.kind!=='upload').map(v=>v.url)].filter(Boolean);
   if(sources.some(url=>new URL(url!).pathname.split('/')[1].slice(1).toLowerCase()!==result.handle.toLowerCase()))throw Error('Esse link pertence a outro criador. Use um perfil separado ou remova as publicações e o avatar anteriores.');
   change({name:result.name||result.handle.slice(0,80),username:result.handle.toLowerCase().slice(0,40),socials:{...old.socials!,tiktok:result.handle},adultReview:{evidenceUrl:old.adultReview?.evidenceUrl||'',contentReviewed:false}});
   setIdentityResolved(raw);
   setIdentityStatus(result.name?'Nome e @ preenchidos. Salve o perfil para confirmar.':'@ identificado. O TikTok não disponibilizou o nome; usamos o @ como nome e você pode ajustá-lo.');
  }catch(error:any){if(active)setIdentityStatus(error.message);}finally{if(active)setIdentityBusy(false);}},500);
  return()=>{active=false;clearTimeout(timer);};
 },[identityInput]);
 const [upload,setUpload]=useState<{total:number;done:number;bytes:number;loaded:number;name:string;storing:boolean}|null>(null),[uploadErrors,setUploadErrors]=useState<string[]>([]);
 const uploadController=useRef<AbortController|null>(null);
 useEffect(()=>()=>uploadController.current?.abort(),[]);
 function close(){if(uploadController.current&&!confirm('Cancelar os envios em andamento e fechar?'))return;uploadController.current?.abort();onClose();}
 async function addFiles(files:File[]){
  if(!files.length||busy)return;
  const supported=/^(image\/(jpeg|png|gif|webp|avif)|video\/(mp4|quicktime|webm))$/;
  const invalid=files.find(file=>!supported.test(file.type)||file.size===0||file.size>(file.type.startsWith('image/')?20:50)*1024*1024);
  if(invalid){setNotice(invalid.name+': use uma foto de até 20 MB ou vídeo de até 50 MB em formato compatível.');return;}
  if((draft.videos?.length||0)+files.filter(f=>f.type.startsWith('video/')).length>30){setNotice('O perfil aceita até 30 vídeos. Remova alguns ou selecione um lote menor.');return;}
  const controller=new AbortController();uploadController.current=controller;setBusy(true);setNotice('');setUploadErrors([]);
  const total=files.reduce((sum,f)=>sum+f.size,0);let loaded=0,done=0,success=0;
  try{for(const file of files){
   if(controller.signal.aborted)break;
   const before=loaded;let transferred=0;
   setUpload({total:files.length,done,bytes:total,loaded,name:file.name,storing:false});
   try{
    const result=await uploadProfileFile(file,bytes=>{transferred=bytes;setUpload({total:files.length,done,bytes:total,loaded:before+bytes,name:file.name,storing:bytes>=file.size});},controller.signal);
    success++;transferred=file.size;
    setDraft(old=>({...old,adultReview:{evidenceUrl:old.adultReview?.evidenceUrl||'',contentReviewed:false},...(result.type==='image'?{photos:[...(old.photos||[]),result.url],...(!old.avatarSelection&&(!old.avatar||old.avatar==='/profile-placeholder.svg')?{avatar:result.url}:{})}:{videos:[...(old.videos||[]),{url:result.url,title:file.name.slice(0,100),kind:'upload' as const}]})}));
   }catch(error:any){if(error.name==='AbortError')break;setUploadErrors(old=>[...old,file.name+': '+error.message]);}
   loaded+=transferred;done++;
   setUpload({total:files.length,done,bytes:total,loaded,name:file.name,storing:false});
  }}finally{uploadController.current=null;setBusy(false);setNotice(success+' arquivo(s) adicionado(s). '+(controller.signal.aborted?'Envio cancelado. ':'')+'Revise as mídias e salve o perfil para confirmar.');}
 }
 const change=(values:Partial<PersonProfile>)=>setDraft(old=>({...old,...values,...((values.name!==undefined&&values.name!==old.name)&&!values.adultReview?{adultReview:{evidenceUrl:old.adultReview?.evidenceUrl||'',contentReviewed:false}}:{})}));
 async function load(){try{setRows((await api.getPeople(true)).profiles);}catch(e:any){setNotice(e.message);}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 const announce=()=>window.dispatchEvent(new Event('mocinhas:people-updated'));
 const searchKey=search.trim().replace(/^@/,'').toLocaleLowerCase();
 const visibleRows=rows.filter(p=>!searchKey||p.name.toLocaleLowerCase().includes(searchKey)||p.username.toLocaleLowerCase().includes(searchKey));
 function select(profile:Partial<PersonProfile>){if(JSON.stringify(draft)!==JSON.stringify(rows.find(p=>p.id===draft.id)||blank())&&!confirm(ui('Descartar as alterações não salvas?')))return;setDraft(profile);setIdentityInput(profile.socials?.tiktok?'@'+profile.socials.tiktok:'');setIdentityStatus('');setLink('');setNotice('');setUpload(null);setUploadErrors([]);}
 async function save(){if(identityBusy||identityPending)return;setBusy(true);setNotice('');try{const r=await api.savePerson({...draft,hidden:!!draft.hidden,published:!draft.hidden&&profilePublishable(draft)});setDraft(r.profile);await load();announce();setNotice(ui(r.profile.hidden?'Perfil oculto.':r.profile.published?'Perfil visível.':'Perfil salvo. A revisão está pendente.'));}catch(e:any){setNotice(e.message);}finally{setBusy(false);}}
 async function remove(){if(!draft.id||!confirm(ui('Excluir este perfil e sua galeria?')))return;setBusy(true);try{await api.deletePerson(draft.id);setDraft(blank());setIdentityInput('');setIdentityStatus('');await load();announce();setNotice(ui('Perfil excluído.'));}catch(e:any){setNotice(e.message);}finally{setBusy(false);}}
 async function addLink(){setBusy(true);setLinkStatus('Abrindo link do TikTok…');try{const resolved=await api.resolveTikTokLink(link.trim());const source=tiktokPost(resolved.url);if(draft.videos?.some(v=>v.url===source.canonical))throw Error('Essa publicação já foi adicionada.');const metadata=await api.resolveTikTok(source.canonical);const handle=new URL(source.canonical).pathname.split('/')[1].slice(1);if(draft.socials?.tiktok&&draft.socials.tiktok.toLowerCase()!==handle.toLowerCase())throw Error('Esse link pertence a outro criador. Crie um perfil separado.');change({name:draft.name||metadata.author_name?.slice(0,80)||handle.slice(0,80),adultReview:{evidenceUrl:draft.adultReview?.evidenceUrl||'',contentReviewed:false},username:draft.username||handle.slice(0,40),socials:{...draft.socials!,tiktok:handle},videos:[...(draft.videos||[]),{url:source.canonical,title:'Publicação de @'+handle,kind:'social',thumbnail:metadata.thumbnail_url}]});setLink('');setLinkStatus(metadata.available===true?'Publicação adicionada. Salve o perfil para confirmar.':'Link adicionado sem prévia: o TikTok não forneceu os metadados. Salve o perfil para abrir a publicação no player oficial.');}catch(e:any){setLinkStatus(e.message);}finally{setBusy(false);}}
 return <ModalFrame label={ui('Administrar perfis')} onClose={close} className="people-admin-dialog"><div className="people-admin">
  <header className="people-admin-header"><div><span>Administração</span><h2><Users size={24}/>Perfis</h2></div><button className="people-icon" aria-label="Fechar" onClick={close}><X/></button></header>
  <label className="people-admin-search"><Search size={17}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar perfil por nome ou @usuário"/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label="Limpar pesquisa"><X size={15}/></button>}</label>
  <div className="people-admin-layout"><aside><button className="people-primary" disabled={busy} onClick={()=>select(blank())}><Plus size={18}/>Adicionar perfil ao diretório</button>{loading&&<p>Carregando…</p>}{!loading&&!visibleRows.length&&<p>Nenhum perfil encontrado.</p>}{visibleRows.map(p=><button className={`people-admin-row ${draft.id===p.id?'selected':''}`} key={p.id} disabled={busy} onClick={()=>select(p)}><img src={p.avatar||'/profile-placeholder.svg'} alt=""/><span><strong>{p.name}</strong><small>@{p.username} · {p.hidden?'Oculto':p.published&&profilePublishable(p)?'Visível':'Revisão pendente'}</small></span></button>)}</aside>
  <form className="people-form" onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy}>
   <h3>{draft.id?'Editar perfil':'Adicionar perfil ao diretório'}</h3>   <label>@ original no TikTok<input value={identityInput||(!identityStatus&&draft.socials?.tiktok?'@'+draft.socials.tiktok:'')} placeholder="Cole o link do perfil, vídeo ou foto do TikTok" maxLength={2048} onChange={e=>{const value=e.target.value;setIdentityInput(value);setIdentityStatus('');if(!/^https?:\/\//i.test(value.trim())){change({socials:{...draft.socials!,tiktok:value.replace(/^@/,'')},adultReview:{evidenceUrl:draft.adultReview?.evidenceUrl||'',contentReviewed:false}});}}}/><small>Cole um link para preencher nome e @ automaticamente. Você também pode informar apenas o @.</small></label><p role="status" aria-live="polite">{identityStatus}</p><div className="people-form-grid">{(['name','username'] as const).map(key=><label key={key}>{key==='name'?'Nome público':'@ no diretório'}<input required maxLength={key==='name'?80:40} value={draft[key]||''} onChange={e=>change({[key]:e.target.value})}/></label>)}</div>
   {draft.sourceSnapshot&&<details><summary>Registro inicial da origem (somente leitura)</summary><p>{draft.sourceSnapshot.canonicalUrl} · {draft.sourceSnapshot.capturedAt}</p><p>Acessível na consulta: {draft.sourceSnapshot.publiclyAccessible===true?'sim':'não confirmado'}. Não equivale a autorização.</p></details>}
   {draft.availabilityHistory?.length!==undefined&&<small>Histórico: {draft.availabilityHistory.length} consultas (limite 50).</small>}

   <p className="people-help">Adicione links do TikTok ou envie fotos e vídeos que você tem direito de publicar. Os links usam o player oficial; os arquivos enviados ficam armazenados pelo aplicativo.</p>
   <section className="profile-upload-section"><div className="upload-section-heading"><Upload size={20}/><div><h3>Fotos e vídeos do dispositivo</h3><p>Selecione vários arquivos de uma vez. Fotos até 20 MB e vídeos até 50 MB cada.</p></div></div><div className="people-form-grid"><label className="people-upload"><ImageIcon size={18}/>Enviar fotos<input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif" multiple onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';void addFiles(files);}}/></label><label className="people-upload"><Video size={18}/>Enviar vídeos<input type="file" accept="video/mp4,video/quicktime,video/webm" multiple onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';void addFiles(files);}}/></label></div>
   {upload&&<div className="profile-upload-progress" aria-live="polite"><div><strong>{Math.round(upload.loaded/Math.max(1,upload.bytes)*100)}%</strong><span>{upload.done} de {upload.total} processados</span></div><progress aria-label="Progresso do lote de arquivos" max={upload.bytes||1} value={upload.loaded}/><p>{busy?(upload.storing?'Salvando arquivo no armazenamento…':'Enviando '+upload.name):'Lote encerrado'}</p><small>{(Math.max(0,upload.bytes-upload.loaded)/1024/1024).toFixed(1)} MB {busy?'restantes para transferir':'não transferidos'}</small></div>}
   {uploadErrors.length>0&&<ul className="upload-errors" role="alert">{uploadErrors.map((error,i)=><li key={i}>{error}</li>)}</ul>}
   <div className="people-admin-photos">{draft.photos?.map((url,i)=><div key={url+i}><img src={url} alt={'Foto '+(i+1)}/><div><button type="button" aria-label={'Usar foto '+(i+1)+' no perfil'} onClick={()=>change({avatar:url,avatarSelection:undefined,adultReview:{evidenceUrl:draft.adultReview?.evidenceUrl||'',contentReviewed:false}})}>Usar no perfil</button><button type="button" aria-label={'Remover foto '+(i+1)} onClick={()=>change({photos:draft.photos?.filter((_,index)=>index!==i),...(draft.avatar===url?{avatar:''}:{}),adultReview:{evidenceUrl:draft.adultReview?.evidenceUrl||'',contentReviewed:false}})}><Trash2 size={16}/></button></div></div>)}</div>
   {draft.avatar&&!draft.avatarSelection&&<div className="upload-avatar-preview"><img className="people-admin-avatar" src={draft.avatar} alt="Imagem atual do perfil"/><button type="button" className="people-secondary" onClick={()=>change({avatar:''})}>Remover imagem do perfil</button></div>}
   </section>
   <ProfileAvatarEditor key={draft.id||'new'} value={draft.avatarSelection} onSource={handle=>{if(draft.socials?.tiktok&&draft.socials.tiktok.toLowerCase()!==handle.toLowerCase())throw Error('Use o avatar do mesmo criador.');change({username:draft.username||handle.slice(0,40),socials:{...draft.socials!,tiktok:handle}});}} onChange={avatarSelection=>change({avatarSelection,adultReview:{evidenceUrl:draft.adultReview?.evidenceUrl||'',contentReviewed:false},...(avatarSelection?{socials:{...draft.socials!,tiktok:new URL(avatarSelection.url).pathname.split('/')[1].slice(1)}}:{})})}/><h3>Publicações do TikTok</h3><label>Link do vídeo ou carrossel<input type="url" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://www.tiktok.com/@usuario/photo/…"/></label>
   <button type="button" className="people-secondary" disabled={!link.trim()||(draft.videos?.length||0)>=30} onClick={addLink}><Plus size={17}/>{busy?'Adicionando…':'Adicionar link do TikTok'}</button><p role="status" aria-live="polite">{linkStatus}</p>
   <div className="people-admin-videos">{draft.videos?.map((v,i)=><div key={v.url+i} className="profile-post-admin"><span>{v.thumbnail&&<img className="people-video-cover-preview" src={v.thumbnail} alt="Prévia"/>}<strong>{v.title||'Publicação '+(i+1)}</strong><button type="button" disabled={v.kind==='upload'} onClick={()=>{const source=tiktokPost(v.url);change({avatarSelection:source.postType==='photo'?{url:v.url,kind:'photo',imageIndex:0}:{url:v.url,kind:'video',start:0,end:5},adultReview:{evidenceUrl:draft.adultReview?.evidenceUrl||'',contentReviewed:false}});}}>Usar no perfil</button><button type="button" disabled={i===0} onClick={()=>{const videos=[...(draft.videos||[])];[videos[i-1],videos[i]]=[videos[i],videos[i-1]];change({videos});}}>Mover para cima</button><small>{v.kind==='upload'?'Vídeo enviado':'Publicação externa'}</small></span><button type="button" aria-label="Remover publicação" onClick={()=>change({videos:draft.videos?.filter((_,index)=>index!==i)})}><X size={17}/></button>{v.kind==='social'&&v.url.includes('tiktok.com/')&&<details className="profile-post-settings"><summary>{v.presentation?(v.presentation.kind==='photo'?v.presentation.indices.length+' fotos escolhidas · ':v.presentation.start.toFixed(1)+'–'+v.presentation.end.toFixed(1)+' s · ')+Math.round(v.presentation.zoom*100)+'%':'Escolher fotos, trecho e zoom'}</summary><PostPresentationEditor url={v.url} value={v.presentation} onChange={presentation=>change({videos:draft.videos?.map((item,index)=>index===i?{...item,presentation}:item)})}/></details>}</div>)}</div>
   {draft.cover&&<button type="button" className="people-secondary" onClick={()=>change({cover:''})}>Remover capa do perfil</button>}
   <div className="people-admin-actions"><button type="button" className="people-secondary" aria-pressed={!!draft.hidden} onClick={()=>change({hidden:!draft.hidden})}>{draft.hidden?'Deixar visível':'Ocultar perfil'}</button><small>{draft.hidden?'Ao salvar, o perfil e sua galeria ficarão ocultos.':'Ao salvar, o perfil e sua galeria ficarão visíveis.'}</small></div>
   <div className="people-admin-actions"><button type="submit" className="people-primary" disabled={identityBusy||identityPending}>{busy?'Salvando…':'Salvar perfil'}</button>{draft.id&&<button type="button" className="people-danger" onClick={remove}><Trash2 size={16}/>Excluir</button>}</div>
  </fieldset>{notice&&<p role="status">{notice}</p>}{busy&&uploadController.current&&<button type="button" className="people-secondary" onClick={()=>uploadController.current?.abort()}>Cancelar envios restantes</button>}</form></div></div></ModalFrame>;
}

