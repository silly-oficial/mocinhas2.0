import assert from 'node:assert/strict';
import { cloudReadFailure } from '../server/cloud-diagnostics';
for (const [status, code, expected] of [[401,'','Credencial rejeitada'],[403,'42501','Acesso negado'],[404,'PGRST205','Tabela nao encontrada'],[404,'','Endpoint nao encontrado'],[429,'','Limite de requisicoes'],[503,'','Servico remoto indisponivel']] as const) {
 const result = cloudReadFailure(status,{code,message:'private-secret',details:'https://secret.invalid'});
 assert.ok(result.includes(expected));
 assert.ok(!result.includes('private-secret') && !result.includes('secret.invalid'));
}
assert.ok(cloudReadFailure(0,{message:'fetch failed',details:'ENOTFOUND secret.invalid'}).includes('ENOTFOUND'));
assert.ok(cloudReadFailure(0,{message:'TimeoutError'}).includes('Tempo limite'));
assert.ok(!cloudReadFailure(400,{code:'PRIVATE_KEY',message:'PRIVATE_KEY'}).includes('PRIVATE_KEY'));
console.log('Cloud diagnostics passed: status classification, network errors, no raw credential/URL logging.');
