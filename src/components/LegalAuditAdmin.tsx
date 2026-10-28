import React,{useEffect,useState} from 'react';
import type {LegalAuditEntry} from '../../server/legal-audit';
import {directoryAdminRequest} from './DirectoryConfiguration';
export function LegalAuditAdmin(){
 const [page,setPage]=useState(0),[rows,setRows]=useState<LegalAuditEntry[]>([]),[total,setTotal]=useState(0),[error,setError]=useState('');
 useEffect(()=>{let alive=true;directoryAdminRequest('legal-audit?page='+page).then((data:{entries:LegalAuditEntry[];total:number})=>{if(alive){setRows(data.entries);setTotal(data.total);setError('');}}).catch(error=>{if(alive)setError(error instanceof Error?error.message:'Falha ao consultar auditoria.');});return()=>{alive=false;};},[page]);
 return <section className="directory-requests-admin"><h3>Auditoria administrativa</h3><p>Registros restritos à administração, sem edição ou exclusão pela interface.</p>{error&&<p role="alert">{error}</p>}{rows.map(row=><article className="directory-request-row" key={row.id}><h4>{row.field}</h4><p>{new Date(row.at).toLocaleString('pt-BR',{timeZone:'America/Belem'})} · {row.actor} · {row.entity}</p><p>{row.reason}</p><details><summary>Valores registrados</summary><p>Antes: {JSON.stringify(row.before)}</p><p>Depois: {JSON.stringify(row.after)}</p></details></article>)}<nav><button disabled={page===0} onClick={()=>setPage(value=>value-1)}>Anterior</button><span>Página {page+1}</span><button disabled={(page+1)*50>=total} onClick={()=>setPage(value=>value+1)}>Próxima</button></nav></section>;
}
