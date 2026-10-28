import {authRateLimit} from './auth-security';
import {requestDeadline} from '../shared/request-deadline';
import {appendLegalAudit} from './legal-audit';
import type express from 'express';
import {createHash, randomUUID,randomBytes,timingSafeEqual} from 'node:crypto';
import type {DB} from './db';
import {requestTypes, type DirectoryRequest} from '../shared/directory-requests';
import {directorySettings} from './directory-settings';
import {enqueueEmail} from './directory-email';
import {addVerificationRequest} from './verification';

const DAY = 86_400_000;
function field(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw Error('Confira os campos obrigatórios e os limites de tamanho.');
  return value.trim();
}
export function validateDirectoryRequest(input: unknown): Omit<DirectoryRequest, 'id'|'status'|'createdAt'|'updatedAt'|'adminNote'> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Pedido inválido.');
  const body = input as Record<string, unknown>;
  const responsibleName = field(body.responsibleName, 120, true);
  const email = field(body.email, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Informe um e-mail válido.');
  const handle = field(body.handle, 60, true).replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_.]{1,60}$/.test(handle)) throw Error('Informe somente o @ do perfil, sem link.');
  const type = field(body.type, 40, true);
  if (!Object.hasOwn(requestTypes, type)) throw Error('Selecione um tipo de pedido.');
  const observations = field(body.observations ?? '', 3000);
  let documentUrl = field(body.documentUrl ?? '', 2048);
  if (documentUrl) {
    let url: URL;
    try { url = new URL(documentUrl); } catch { throw Error('Use um link HTTPS válido para o termo.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw Error('Use um link HTTPS válido para o termo.');
    // Never fetch submitted URLs on the server or include them in public profile data.
    documentUrl = url.href;
  }
  return {responsibleName, email, handle, type: type as DirectoryRequest['type'], observations, documentUrl};
}
export function retainDirectoryRequests(rows: DirectoryRequest[], now = Date.now()) {
  return rows.filter(row => {
    const closed = row.status === 'resolved' || row.status === 'rejected';
    const since = Date.parse(closed ? row.closedAt || row.updatedAt : row.createdAt);
    return Number.isFinite(since) && now - since < (closed ? 90 : 180) * DAY;
  });
}
export function installDirectoryRequests(app: express.Express, db: typeof DB, admin: express.RequestHandler) {
  const rows = () => db.get().directoryRequests || [];
  function prune() {
    const retained = retainDirectoryRequests(rows());
    const before = db.get().directoryRequests, beforeMail=db.get().directoryEmailOutbox, beforeVerification=db.get().verificationRequests;
    const verification=(beforeVerification||[]).filter(row=>row.status==='aprovado'||Date.now()-Date.parse(row.reviewedAt||row.createdAt)<(['revogado','recusado'].includes(row.status)?90:180)*DAY);
    const live=new Set([...retained.map(row=>row.id),...verification.map(row=>row.requestId)]);
    const mail=(beforeMail||[]).filter(row=>live.has(row.data.protocol)&&Date.now()-Date.parse(row.createdAt)<90*DAY);
    if(retained.length===rows().length && mail.length===(beforeMail||[]).length && verification.length===(beforeVerification||[]).length)return;
    db.get().directoryRequests=retained;db.get().directoryEmailOutbox=mail;db.get().verificationRequests=verification;
    try { db.save(); } catch (error) { db.get().directoryRequests=before;db.get().directoryEmailOutbox=beforeMail;db.get().verificationRequests=beforeVerification;throw error; }

  }
  prune();
  const timer = setInterval(() => { try { prune(); } catch { console.warn('[directory-requests] Falha ao aplicar retenção.'); } }, DAY);
  timer.unref();
  const buckets = new Map<string, {count: number; until: number}>();
  function contactEmail() {
    const value = directorySettings(db).contactEmail;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : '';
  }
  app.get('/api/directory-contact', (_req, res) => res.set('Cache-Control', 'no-store').json({email: contactEmail()}));
  app.use('/api/directory-requests',(req,res,next)=>{
    if(req.method!=='POST')return next();
    const origin=req.get('origin');if(req.get('sec-fetch-site')==='cross-site'||(origin&&origin!==`${req.protocol}://${req.get('host')}`))return res.status(403).json({error:'Envie pelo próprio site.'});
    if(!req.is('application/json'))return res.status(415).json({error:'Formato inválido.'});
    if(req.path.endsWith('/access'))return next();
    const now=Date.now();for(const [id,b] of buckets)if(b.until<=now)buckets.delete(id);
    const key=createHash('sha256').update(req.ip||req.socket.remoteAddress||'unknown').digest('hex'),bucket=buckets.get(key)||{count:0,until:now+3600000};
    if(bucket.count>=5||(!buckets.has(key)&&buckets.size>=5000)){res.set('Retry-After',String(Math.max(1,Math.ceil((bucket.until-now)/1000))));return res.status(429).json({error:'Muitos envios. Aguarde uma hora.'});}
    bucket.count++;buckets.set(key,bucket);next();
  });
  const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');
  const authorized=(request:DirectoryRequest,token:unknown)=>typeof token==='string'&&token.length===48&&typeof request.accessTokenHash==='string'&&request.accessTokenHash.length===64&&timingSafeEqual(Buffer.from(tokenHash(token),'hex'),Buffer.from(request.accessTokenHash,'hex'));
  app.post('/api/directory-requests/:id/access',authRateLimit(20,60000,req=>req.ip||'unknown'),(req,res)=>{
    res.set('Cache-Control','no-store');const request=rows().find(row=>row.id===req.params.id);
    if(!request||!authorized(request,req.body.accessToken))return res.status(404).json({error:'Protocolo ou chave inválidos.'});
    return res.json({id:request.id,status:request.status,type:request.type,dueAt:request.dueAt,publicResult:request.publicResult||'',decision:request.decision,fundamentacao:request.fundamentacao,decisions:request.decisions||[],closedAt:request.closedAt});
  });
  app.post('/api/directory-requests/:id/reopen',(req,res)=>{
    res.set('Cache-Control','no-store');const current=rows().find(row=>row.id===req.params.id);
    if(!current||!authorized(current,req.body.accessToken))return res.status(404).json({error:'Protocolo ou chave inválidos.'});
    if(!['resolved','rejected'].includes(current.status))return res.status(409).json({error:'O pedido já está aberto.'});
    try{
      const name=field(req.body.responsibleName,120,true),email=field(req.body.email,254,true).toLowerCase(),message=field(req.body.observations,3000,true);
      if(email!==current.email)return res.status(400).json({error:'Use o e-mail do pedido original.'});
      const now=new Date().toISOString(),before=db.get().directoryRequests,mail=db.get().directoryEmailOutbox,audit=db.get().legalAudit;
      const updated:DirectoryRequest={...current,responsibleName:name,status:'pending',updatedAt:now,closedAt:undefined,dueAt:requestDeadline(current.type),publicResult:'',decision:undefined,fundamentacao:undefined,replies:[...(current.replies||[]),{at:now,message}]};
      if(updated.replies!.length>20)return res.status(400).json({error:'Limite de respostas no protocolo. Use o contato público para continuar.'});
      db.get().directoryRequests=rows().map(row=>row.id===current.id?updated:row);
      appendLegalAudit(db,{actor:'solicitante',entity:current.id,field:'status',before:current.status,after:'pending',reason:'Discordância recebida no mesmo protocolo.'});
      enqueueEmail(db,'reopen-'+current.id+'-'+now,current.email,'request_received',current.id);enqueueEmail(db,'reopen-admin-'+current.id+'-'+now,directorySettings(db).contactEmail,'admin_new_request',current.id);
      try{db.save();}catch{db.get().directoryRequests=before;db.get().directoryEmailOutbox=mail;db.get().legalAudit=audit;return res.status(503).json({error:'Não foi possível registrar a resposta.'});}
      return res.json({id:current.id,dueAt:updated.dueAt});
    }catch{return res.status(400).json({error:'Informe nome, e-mail e a resposta à decisão.'});}
  });
  app.post('/api/directory-requests', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== `${req.protocol}://${req.get('host')}`)) return res.status(403).json({error: 'Envie o formulário pelo próprio site.'});
    if (!req.is('application/json')) return res.status(415).json({error: 'Formato de envio inválido.'});
    const now = Date.now();
    try {
      const input = validateDirectoryRequest(req.body);
      prune();
      if (rows().length >= 10000) return res.status(503).json({error: 'Fila temporariamente cheia. Utilize o contato informado na página.'});
      const date = new Date(now).toISOString();
      const accessToken=randomBytes(24).toString('hex');
      const request:DirectoryRequest={...input,id:randomUUID(),status:'pending',createdAt:date,updatedAt:date,dueAt:requestDeadline(input.type,new Date(now)),adminNote:'',accessTokenHash:tokenHash(accessToken),revision:0};
      const before = db.get().directoryRequests;
      const beforeMail=db.get().directoryEmailOutbox,beforeVerification=db.get().verificationRequests;
      db.get().directoryRequests = [...rows(), request];
      addVerificationRequest(db,request);
      enqueueEmail(db,'received-'+request.id,request.email,'request_received',request.id,{accessKey:accessToken,reopenUrl:directorySettings(db).websiteUrl+'/pais?protocolo='+request.id});
      enqueueEmail(db,'admin-'+request.id,directorySettings(db).contactEmail,'admin_new_request',request.id);
      try { db.save(); } catch (error) { db.get().directoryRequests = before;db.get().directoryEmailOutbox=beforeMail;db.get().verificationRequests=beforeVerification;throw error; }
      return res.status(201).json({id:request.id,dueAt:request.dueAt,accessToken});
    } catch (error) {
      if (error instanceof Error && /Pedido inválido|Confira os campos|Informe|Selecione|Use um link|Termos são/.test(error.message)) return res.status(400).json({error: error.message});
      return res.status(503).json({error: 'Não foi possível registrar o pedido. Tente novamente.'});
    }
  });
  app.get('/api/admin/legal-audit',admin,(req,res)=>{
    const page=Math.max(0,Math.min(100000,Number(req.query.page)||0)|0),audit=db.get().legalAudit||[];
    res.set('Cache-Control','no-store').json({entries:[...audit].reverse().slice(page*50,(page+1)*50),total:audit.length});
  });
  app.post('/api/admin/directory-requests/:id/unpublish',admin,(req,res)=>{
    res.set('Cache-Control','no-store');
    const request=rows().find(row=>row.id===req.params.id);
    if(!request)return res.status(404).json({error:'Pedido não encontrado.'});
    const profile=db.get().peopleProfiles?.find(row=>row.id===req.body.profileId&&[row.username,row.socials.tiktok].some(handle=>handle.replace(/^@/,'').toLowerCase()===request.handle));
    if(!profile)return res.status(400).json({error:'Selecione o perfil correspondente ao pedido.'});
    const before=db.get().peopleProfiles,audit=db.get().legalAudit;
    db.get().peopleProfiles=before?.map(row=>row.id===profile.id?{...row,published:false,updatedAt:new Date().toISOString()}:row);
    appendLegalAudit(db,{actor:(req as express.Request&{userId?:string}).userId||'admin',entity:profile.id,field:'published',before:profile.published,after:false,reason:'Retirada imediata pelo pedido '+request.id});
    try{db.save();}catch{db.get().peopleProfiles=before;db.get().legalAudit=audit;return res.status(503).json({error:'Não foi possível salvar a retirada.'});}
    return res.json({ok:true,action:'Perfil retirado de publicação. Nenhum arquivo foi apagado.'});
  });
  app.get('/api/admin/directory-requests', admin, (req, res) => {
    prune();
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    if (!['pending','reviewing','resolved','rejected','all'].includes(status)) return res.status(400).json({error: 'Status inválido.'});
    const page = Math.max(0, Math.min(10000, Number(req.query.page) || 0) | 0);
    const selected = rows().filter(row => status === 'all' || row.status === status).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
    res.set('Cache-Control', 'no-store').json({requests: selected.slice(page * 50, (page + 1) * 50).map(({accessTokenHash:_privateKey,...request})=>request), total: selected.length});
  });
  app.patch('/api/admin/directory-requests/:id', admin, (req, res) => {
    res.set('Cache-Control', 'no-store');
    const current = rows().find(row => row.id === req.params.id);
    if (!current) return res.status(404).json({error: 'Pedido não encontrado.'});
    const {status, unpublishProfileId} = req.body || {};
    if (!['reviewing','resolved','rejected'].includes(status)) return res.status(400).json({error: 'Status inválido.'});
    if(current.type==='revogar_autorizacao' && status==='resolved' && (db.get().verificationRequests||[]).some(row=>row.handle===current.handle&&row.status==='aprovado'&&row.purpose==='guardian'))return res.status(400).json({error:'Revogue o termo e o selo na aba Verificações antes de concluir este pedido.'});
    const contest=current.type==='contestar_classificacao',closing=['resolved','rejected'].includes(status);
    if(contest&&!(current.status==='pending'&&status==='reviewing'||current.status==='reviewing'&&closing))return res.status(400).json({error:'Inicie a análise antes de decidir; pedido encerrado deve ser reaberto pelo solicitante.'});
    const fundamentacao=typeof req.body.fundamentacao==='string'?req.body.fundamentacao.trim():'';
    if(contest&&closing&&(fundamentacao.length<80||fundamentacao.length>3000))return res.status(400).json({error:'Registre fundamentação de 80 a 3000 caracteres.'});
    let adminNote: string;
    try { adminNote = field(req.body.adminNote ?? '', 3000); } catch { return res.status(400).json({error: 'Observação administrativa muito longa.'}); }
    const profiles = db.get().peopleProfiles || [];
    if (unpublishProfileId !== undefined) {
      if (current.type !== 'remover_conteudo' || status !== 'resolved' || !profiles.some(profile => profile.id === unpublishProfileId && [profile.username, profile.socials.tiktok].some(handle => handle?.replace(/^@/, '').toLowerCase() === current.handle))) return res.status(400).json({error: 'Selecione um perfil correspondente ao @ do pedido de remoção.'});
    }
    let publicResult='';
    try{publicResult=field(req.body.publicResult??'',1500);}catch{return res.status(400).json({error:'A resposta ao solicitante pode ter até 1500 caracteres.'});}
    if(unpublishProfileId!==undefined)publicResult='Perfil retirado da publicação no diretório. A ação não declara exclusão de arquivos ou de outras referências.'+(publicResult?' '+publicResult:'');
    if(closing&&!publicResult)return res.status(400).json({error:'Registre a providência realmente executada para enviar a resposta de conclusão.'});
    const now = new Date().toISOString();
    const updated: DirectoryRequest = {...current,status,adminNote,publicResult,fundamentacao,decision:contest&&closing?(status==='resolved'?'procedente':'improcedente'):undefined,revision:closing?(current.revision||0)+1:current.revision,decisions:closing?[...(current.decisions||[]),{at:now,status,result:publicResult,fundamentacao}]:(current.decisions||[]),updatedAt:now, ...(status === 'resolved' || status === 'rejected' ? {closedAt: now} : {closedAt: undefined})};
    const beforeRequests = db.get().directoryRequests, beforeProfiles = db.get().peopleProfiles;
    const beforeMail=db.get().directoryEmailOutbox, beforeAudit=db.get().legalAudit;
    db.get().directoryRequests = rows().map(row => row.id === current.id ? updated : row);
    if (unpublishProfileId !== undefined) db.get().peopleProfiles = profiles.map(profile => profile.id === unpublishProfileId ? {...profile, published: false, updatedAt: now} : profile);
    if(unpublishProfileId!==undefined)appendLegalAudit(db,{actor:(req as express.Request&{userId?:string}).userId||'admin',entity:unpublishProfileId,field:'published',before:profiles.find(profile=>profile.id===unpublishProfileId)?.published,after:false,reason:'Retirada pelo pedido '+current.id});
    if(['resolved','rejected'].includes(status) && current.status!==status)enqueueEmail(db,'completed-'+current.id+'-'+status+'-'+updated.revision,current.email,'request_completed',current.id,{content:'@'+current.handle,result:publicResult+(contest&&fundamentacao?' Fundamentação: '+fundamentacao:''),resolved:status==='resolved',reopenUrl:directorySettings(db).websiteUrl+'/pais?protocolo='+current.id});
    try { db.save(); } catch {
      db.get().directoryEmailOutbox=beforeMail;db.get().legalAudit=beforeAudit;
      db.get().directoryRequests = beforeRequests; db.get().peopleProfiles = beforeProfiles;
      return res.status(503).json({error: 'Não foi possível salvar a análise.'});
    }
    const {accessTokenHash:_privateKey,...publicAdminRequest}=updated;return res.json({request:publicAdminRequest});
  });
}

