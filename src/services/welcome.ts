import type { WelcomeConfig } from '../../shared/welcome';
export async function welcomeRequest(admin=false,body?:WelcomeConfig):Promise<WelcomeConfig>{
  const r=await fetch(admin?'/api/admin/welcome':'/api/welcome',{method:body?'PUT':'GET',headers:admin?{'Content-Type':'application/json',Authorization:'Bearer '+(localStorage.getItem('mocinhas_token')||localStorage.getItem('yume_token')||'')}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível carregar a apresentação.');return data;
}
