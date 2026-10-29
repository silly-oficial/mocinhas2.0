import type express from 'express';
// Removed navigation destinations do not fall through to the SPA or accept new requests.
export function installRetiredPages(app:express.Express){
 app.all(['/como-funciona','/contato','/creditos','/pais','/privacidade','/termos','/versoes'],(_req,res)=>res.status(404).type('text').send('Página não encontrada.'));
 app.use(['/api/directory-contact','/api/directory-settings','/api/directory-requests','/api/legal-history','/api/admin/directory-settings','/api/admin/directory-requests','/api/admin/verification-requests','/api/admin/legal-audit'],(_req,res)=>res.status(404).json({error:'Recurso não encontrado.'}));
}
