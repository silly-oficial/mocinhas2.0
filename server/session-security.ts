import type {Request,Response,RequestHandler} from 'express';
export function sessionToken(req:Request){
 const bearer=req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];if(bearer)return bearer;
 const cookie=(req.headers.cookie||'').split(';').map(value=>value.trim()).find(value=>value.startsWith('mocinhas_session='));return cookie?.slice('mocinhas_session='.length)||null;
}
export function setSession(res:Response,token:string){res.cookie('mocinhas_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:30*86400000});res.set('Cache-Control','no-store');}
export const protectCookieWrites:RequestHandler=(req,res,next)=>{
 if(!['GET','HEAD','OPTIONS'].includes(req.method)&&(req.headers.cookie||'').includes('mocinhas_session=')&&!req.headers.authorization?.match(/^Bearer\s+\S/)){
  const origin=req.get('origin');if(req.get('sec-fetch-site')==='cross-site'||(origin&&origin!==`${process.env.NODE_ENV==='production'?'https':req.protocol}://${req.get('host')}`)){res.status(403).json({error:'Envie a ação pelo próprio site.'});return;}
 }
 next();
};
