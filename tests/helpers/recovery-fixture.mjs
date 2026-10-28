import fs from 'node:fs';
const original=globalThis.fetch;
globalThis.fetch=async(input,options)=>{
 if(String(input)==='https://api.resend.com/emails'){
  const body=JSON.parse(options.body);const code=body.text.match(/\b\d{6}\b/)?.[0];
  if(body.subject==='Recuperação de acesso ao Mocinhas'){if(!code)throw Error('Missing fixture recovery code');fs.writeFileSync(process.env.RECOVERY_FIXTURE_FILE,code,{mode:0o600});}
  return new Response(JSON.stringify({id:'mock-recovery'}),{status:200});
 }
 return original(input,options);
};
