import fs from 'node:fs';
import crypto from 'node:crypto';
export function validateDatabase(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.users) || !Array.isArray(data.posts)) throw Error('Banco inválido: users e posts precisam ser listas. Nenhum arquivo foi alterado.');
  for (const key of ['users','posts']) {
    const ids = new Set();
    for (const row of data[key]) {
      if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw Error(`Banco inválido: ID ausente ou repetido em ${key}.`);
      ids.add(row.id);
      if (key === 'posts' && (typeof row.userId !== 'string' || !Array.isArray(row.media))) throw Error('Banco inválido: autoria ou mídia de publicação ausente.');
    }
  }
  for (const key of ['likes','saves','comments','commentLikes','follows','stories','storyViews','conversations','messages','notifications','reports','blocks','mutes','paymentCharges','peopleProfiles','directoryRequests','legalDocumentVersions','directoryEmailOutbox','verificationRequests','directorySettingsAudit','legalAudit','accessLogs','sourceSnapshots']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) throw Error(`Banco inválido: ${key} precisa ser uma lista.`);
  }
  function validDate(value){return typeof value==='string'&&Number.isFinite(Date.parse(value));}
  function sourceSnapshot(source){
    if(!source||!validDate(source.capturedAt)||typeof source.canonicalUrl!=='string'||!/^https:\/\/www\.tiktok\.com\/@[\w.]+\/(video|photo)\/\d{10,25}$/.test(source.canonicalUrl)||typeof source.handle!=='string'||!(source.publiclyAccessible===true||source.publiclyAccessible===null)||!(source.oembedOkAt===null||validDate(source.oembedOkAt)))throw Error('Registro inicial da origem inválido.');
  }
  for (const profile of data.peopleProfiles || []) {
    if(profile.birthYear !== undefined && profile.birthYear !== null && (!Number.isInteger(profile.birthYear)||profile.birthYear<1900||profile.birthYear>new Date().getUTCFullYear())) throw Error('Ano de nascimento inválido no snapshot.');
    for(const [key,allowed] of [['ageBand',['crianca','adolescente','adulto','desconhecido']],['ageSource',['declarado_por_responsavel','declarado_pelo_perfil','estimado','desconhecido']],['guardianStatus',['sem_contato','ciencia_declarada','termo_recebido','recusado','revogado']]])if(profile[key]!==undefined&&!allowed.includes(profile[key]))throw Error('Campo editorial inválido: '+key);
    for(const key of ['ageUpdatedAt','rankingUpdatedAt'])if(profile[key]!==undefined&&profile[key]!==null&&!validDate(profile[key]))throw Error('Data editorial inválida.');
    for(const key of ['ownershipVerified','guardianAuthorized'])if(profile[key]!==undefined&&typeof profile[key]!=='boolean')throw Error('Selo inválido.');
    if(profile.identityRevision!==undefined&&(!Number.isInteger(profile.identityRevision)||profile.identityRevision<0))throw Error('Revisão de identidade inválida.');
    if(profile.rankingCriteria!==undefined&&(typeof profile.rankingCriteria!=='string'||profile.rankingCriteria.length>1000))throw Error('Critério editorial inválido.');
    if(profile.traits!==undefined&&(!Array.isArray(profile.traits)||profile.traits.some(value=>!['arte','esporte','musica','educacao','humor','viagem'].includes(value))))throw Error('Tema editorial inválido.');
    if(profile.availabilityHistory!==undefined&&(!Array.isArray(profile.availabilityHistory)||profile.availabilityHistory.length>50||profile.availabilityHistory.some(row=>!validDate(row.checkedAt)||![true,false,null].includes(row.available))))throw Error('Histórico de disponibilidade inválido.');
    if(profile.sourceSnapshot!=null)sourceSnapshot(profile.sourceSnapshot);
  }
  for(const row of data.sourceSnapshots||[]){if(typeof row.profileId!=='string')throw Error('Perfil do registro inicial inválido.');sourceSnapshot(row.snapshot);}
  return data;
}
export function inspectDatabase(file) {
  const bytes = fs.readFileSync(file), db = validateDatabase(JSON.parse(bytes.toString('utf8')));
  const admins = new Set(db.users.filter(u => u.isAdmin === true).map(u => u.id));
  const users = new Set(db.users.map(u => u.id));
  return { file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), modifiedAt: fs.statSync(file).mtime.toISOString(), users: db.users.length, administrators: admins.size, posts: db.posts.length, adminPosts: db.posts.filter(p => admins.has(p.userId)).length, orphanPosts: db.posts.filter(p => !users.has(p.userId)).length, hiddenNonAdminPosts: db.posts.filter(p => users.has(p.userId) && !admins.has(p.userId)).length, comments: db.comments?.length || 0 };
}


