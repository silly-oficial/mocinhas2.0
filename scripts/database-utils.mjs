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
  for (const key of ['likes','saves','comments','commentLikes','follows','stories','storyViews','conversations','messages','notifications','reports','blocks','mutes','paymentCharges']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) throw Error(`Banco inválido: ${key} precisa ser uma lista.`);
  }
  return data;
}
export function inspectDatabase(file) {
  const bytes = fs.readFileSync(file), db = validateDatabase(JSON.parse(bytes.toString('utf8')));
  const admins = new Set(db.users.filter(u => u.isAdmin === true).map(u => u.id));
  const users = new Set(db.users.map(u => u.id));
  return { file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), modifiedAt: fs.statSync(file).mtime.toISOString(), users: db.users.length, administrators: admins.size, posts: db.posts.length, adminPosts: db.posts.filter(p => admins.has(p.userId)).length, orphanPosts: db.posts.filter(p => !users.has(p.userId)).length, hiddenNonAdminPosts: db.posts.filter(p => users.has(p.userId) && !admins.has(p.userId)).length, comments: db.comments?.length || 0 };
}
