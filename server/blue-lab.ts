import type express from 'express';
import type {DB} from './db';
import {blueAssets,type BlueLinks} from '../shared/blue-lab';
export function installBlueLab(app:express.Express,db:typeof DB,admin:express.RequestHandler){
 app.get('/api/blue-lab',(_req,res)=>{const visible=new Set((db.get().peopleProfiles||[]).filter(p=>p.published).map(p=>p.id));res.json({links:Object.fromEntries(Object.entries(db.get().blueLabLinks||{}).map(([k,v])=>[k,v.filter(id=>visible.has(id))]))});});
 app.get('/api/admin/blue-lab',admin,(_req,res)=>res.json({links:db.get().blueLabLinks||{}}));
 app.put('/api/admin/blue-lab',admin,(req,res)=>{const input=req.body?.links,links:BlueLinks={};const assets=new Set<string>(blueAssets.map(a=>a.id)),people=new Set((db.get().peopleProfiles||[]).map(p=>p.id));
  if(!input||typeof input!=='object'||Array.isArray(input))return res.status(400).json({error:'Vínculos inválidos.'});
  for(const [key,value] of Object.entries(input)){if(!assets.has(key)||!Array.isArray(value)||value.length>12||value.some(id=>typeof id!=='string'||!people.has(id)))return res.status(400).json({error:'Imagem ou perfil inválido.'});links[key]=[...new Set(value as string[])];}
  const before=db.get().blueLabLinks;db.get().blueLabLinks=links;try{db.save();res.json({links});}catch{db.get().blueLabLinks=before;res.status(503).json({error:'Não foi possível salvar. Tente novamente.'});}
 });
}
