// Never return provider messages, URLs, headers or credentials in startup logs.
export function cloudReadFailure(status: number, error: { code?: string; message?: string; details?: string }) {
 const knownCodes = ['42501', '42P01', 'PGRST205', 'PGRST204', 'PGRST106', 'PGRST301', 'PGRST302', 'PGRST303', 'PGRST000', 'PGRST001', 'PGRST002'];
 const code = knownCodes.includes(error.code || '') ? error.code : 'UNKNOWN';
 const numericStatus = Number.isInteger(status) && status >= 0 && status <= 599 ? status : 0;
 let hint = 'Falha na consulta. Confira os logs da Data API do projeto Supabase no mesmo horario.';
 if (numericStatus === 401) hint = 'Credencial rejeitada. Confira a chave privada e se pertence ao mesmo projeto da SUPABASE_URL.';
 else if (numericStatus === 403 || code === '42501') hint = 'Acesso negado. Use chave Secret/service_role e confira os GRANTs do SQL de instalacao.';
 else if (code === 'PGRST205' || code === '42P01') hint = 'Tabela nao encontrada pela API. Confira se a URL aponta para o projeto onde executou o SQL e o cache de esquema da API.';
 else if (code === 'PGRST106') hint = 'Schema public nao exposto na Data API do Supabase.';
 else if (code === 'PGRST204') hint = 'Coluna ausente no schema da API. Confira o SQL da versao atual.';
 else if (numericStatus === 404) hint = 'Endpoint nao encontrado. Confira Project URL, projeto ativo e Data API habilitada.';
 else if (numericStatus === 429) hint = 'Limite de requisicoes do provedor atingido. Aguarde antes de tentar novamente.';
 else if (numericStatus >= 500) hint = 'Servico remoto indisponivel. Confira a saude do projeto e os logs da Data API.';
 else if (numericStatus === 0) {
  const detail = `${error.message || ''} ${error.details || ''}`;
  const networkCode = ['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE'].find(c=>detail.includes(c));
  hint = networkCode ? `Falha de rede (${networkCode}). Confira o endereco do projeto e a conectividade entre Render e Supabase.` : /timeout|aborted/i.test(detail) ? 'Tempo limite de conexao. Confira disponibilidade do projeto e conectividade.' : 'Nao houve resposta HTTP. Confira Project URL, DNS e conectividade entre Render e Supabase.';
 }
 return `SUPABASE_DATABASE_UNAVAILABLE [HTTP=${numericStatus}; CODE=${code}]: ${hint} Nenhum banco local sera usado como substituto.`;
}
