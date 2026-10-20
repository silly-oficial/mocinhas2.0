import { ModalFrame } from './ModalFrame';
import { ui, useUi } from '../i18n/ui';
import React from 'react';
import {
  X,
  ShieldCheck,
  Scale,
  AlertTriangle,
  Lock,
  Sparkles,
  CheckCircle2,
  FileText,
  ExternalLink,
  CreditCard,
} from 'lucide-react';

interface TermsModalProps {
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  useUi();
  return (
    <ModalFrame onClose={onClose} label={ui("Termos de Uso e Responsabilidade")} className="legacy-modal ] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        id="terms-modal-card"
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-[#0E0E15] text-white border border-white/15 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#123328] to-[#0E0E15]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shadow-md shadow-white/5 shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-base font-bold text-white tracking-tight">{ui("Termos de Uso e Responsabilidade")}</h2>
                <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-zinc-300">{ui("Obrigatório")}</span>
              </div>
              <p className="text-[11px] text-zinc-300/70">{ui("Regras de uso, descoberta de perfis e serviços do Mocinhas")}</p>
            </div>
          </div>
          <button id="close-terms-button" onClick={onClose} aria-label={ui("Fechar termos")} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-zinc-200/90 leading-relaxed scrollbar-thin">
          <div className="p-3.5 rounded-2xl bg-[#161622] border border-white/15 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-zinc-200">
              <strong className="text-white block mb-0.5">{ui("Leitura importante")}</strong>
              {ui("O Mocinhas é uma plataforma de descoberta e divulgação de perfis existentes em outras redes sociais. Ao acessar, utilizar ou contratar recursos do Mocinhas, você declara ter lido e compreendido estes Termos.")}
            </div>
          </div>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="font-bold">{ui("1. O que é o Mocinhas")}</h3>
            <p>{ui("O Mocinhas funciona como um catálogo organizado de perfis, criado para facilitar a descoberta de novas pessoas, criadores e contas em redes sociais externas.")}</p>
            <p>{ui("Os perfis apresentados são cadastrados e administrados pela equipe responsável pelo Mocinhas. Visitantes não criam perfis públicos de divulgação, não publicam conteúdo nesses perfis e não enviam mensagens aos seus titulares através do Mocinhas.")}</p>
          </section>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 font-bold"><ExternalLink className="w-4 h-4" /><h3>{ui("2. Links e redes sociais externas")}</h3></div>
            <p>{ui("O Mocinhas pode disponibilizar links para perfis existentes no TikTok, Instagram, Pinterest e outros serviços. Ao abrir um desses links, o visitante deixa o ambiente do Mocinhas e passa a utilizar uma plataforma de terceiros.")}</p>
            <p>{ui("Seguir, comentar, enviar mensagens, iniciar conversas ou realizar qualquer outra interação posteriormente acontece fora do Mocinhas e fica sujeito às regras e ferramentas da respectiva plataforma externa.")}</p>
            <p>{ui("O Mocinhas é independente dessas plataformas e não representa vínculo, patrocínio, aprovação ou parceria com elas, salvo quando isso for expressamente informado.")}</p>
          </section>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 font-bold"><Scale className="w-4 h-4" /><h3>{ui("3. Condutas realizadas fora do Mocinhas")}</h3></div>
            <p>{ui("A descoberta de um perfil através do Mocinhas não torna a plataforma participante das interações realizadas posteriormente entre visitantes e titulares dos perfis em serviços externos.")}</p>
            <p>{ui("Cada pessoa é responsável por suas próprias ações. Mensagens ofensivas, ameaças, assédio, perseguição, golpes, comentários, discussões ou outras condutas praticadas por terceiros no TikTok, Instagram ou outro serviço externo não são produzidas, enviadas ou controladas pelo Mocinhas.")}</p>
            <p>{ui("Esta cláusula não exclui responsabilidades que sejam atribuídas diretamente ao Mocinhas pela legislação aplicável.")}</p>
          </section>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="font-bold">{ui("4. Perfis apresentados e solicitação de remoção")}</h3>
            <p>{ui("A presença de um perfil no Mocinhas tem finalidade de descoberta e divulgação e não representa garantia, certificação ou recomendação pessoal sobre identidade, reputação, comportamento ou intenções de seu titular.")}</p>
            <p>{ui("Informações e links poderão ser corrigidos, atualizados ou removidos quando necessário. A pessoa apresentada que não deseje permanecer no Mocinhas poderá solicitar análise para remoção de seu perfil. Poderão ser solicitadas informações razoavelmente necessárias para verificar a legitimidade do pedido.")}</p>
          </section>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 font-bold"><CreditCard className="w-4 h-4" /><h3>{ui("5. Assinatura, benefícios e manutenção do serviço")}</h3></div>
            <p>{ui("O Mocinhas poderá oferecer uma modalidade paga com funcionalidades ou benefícios adicionais claramente apresentados antes da contratação.")}</p>
            <p><strong>{ui("Ao assinar, o usuário entende que está pagando pelo acesso aos benefícios apresentados e, ao mesmo tempo, contribuindo para manter a infraestrutura e o desenvolvimento do Mocinhas, incluindo servidores, armazenamento, manutenção e segurança.")}</strong></p>
            <p>{ui("A assinatura não representa investimento, participação societária, doação com expectativa de retorno financeiro ou promessa de lucro. Preço, duração, benefícios, renovação e demais condições aplicáveis deverão ser informados antes da confirmação da contratação.")}</p>
          </section>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 font-bold"><AlertTriangle className="w-4 h-4" /><h3>{ui("6. Uso adequado e segurança")}</h3></div>
            <p>{ui("O Mocinhas não deve ser utilizado como instrumento para localizar pessoas com a finalidade de praticar perseguição, ameaça, assédio, fraude ou qualquer atividade ilícita.")}</p>
            <p>{ui("Encontrar um perfil através do Mocinhas não significa que seu titular tenha sido pessoalmente verificado pela plataforma, salvo quando isso for expressamente indicado. Tenha cautela ao conversar com desconhecidos, compartilhar informações pessoais, enviar dinheiro ou marcar encontros presenciais através de serviços externos.")}</p>
          </section>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 font-bold"><Lock className="w-4 h-4" /><h3>{ui("7. Privacidade, dados e autoridades")}</h3></div>
            <p>{ui("O tratamento de dados pessoais relacionado ao Mocinhas deverá observar a legislação brasileira aplicável e a Política de Privacidade da plataforma.")}</p>
            <p>{ui("Quando houver obrigação legal válida, o Mocinhas poderá preservar ou fornecer informações às autoridades competentes nos limites exigidos pela legislação aplicável.")}</p>
          </section>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="font-bold">{ui("8. Disponibilidade e alterações")}</h3>
            <p>{ui("O Mocinhas poderá passar por manutenção, atualização ou indisponibilidade temporária. Funcionalidades poderão ser adicionadas, modificadas ou descontinuadas por razões técnicas, de segurança, legais ou relacionadas à evolução do serviço, respeitados os direitos aplicáveis ao consumidor.")}</p>
            <p>{ui("Estes Termos poderão ser atualizados para refletir mudanças no serviço ou na legislação. Alterações relevantes poderão ser comunicadas dentro da plataforma e, quando necessário, poderá ser solicitado novo aceite.")}</p>
          </section>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="font-bold">{ui("9. Responsabilidade")}</h3>
            <p>{ui("O Mocinhas responde pelo funcionamento e pelas atividades realizadas dentro de sua própria plataforma nos limites da legislação aplicável. O Mocinhas não controla nem administra mensagens, comentários ou outras comunicações realizadas posteriormente entre pessoas em plataformas externas.")}</p>
            <p>{ui("Nenhuma disposição destes Termos pretende excluir direitos do consumidor ou afastar responsabilidades que não possam ser legalmente excluídas.")}</p>
          </section>

          <div className="p-3.5 rounded-2xl bg-[#123328] border border-white/15 text-center">
            <p className="text-[11px] text-zinc-300 font-semibold">{ui("Ao continuar utilizando o Mocinhas, você declara compreender que a finalidade principal da plataforma é facilitar a descoberta de perfis existentes em outras redes sociais, e não intermediar as comunicações realizadas posteriormente entre essas pessoas.")}</p>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-[#1E0B1B] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <FileText className="w-3.5 h-3.5" />
            <span>{ui("Última atualização: Outubro de 2026")}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {showAcceptButton ? (
              <>
                <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-bold transition-colors cursor-pointer">{ui("Voltar")}</button>
                <button type="button" onClick={() => { onAccept?.(); onClose(); }} className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-emerald-500 text-black text-xs font-extrabold shadow-md hover:bg-neutral-200 cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /><span>{ui("Li e Aceito os Termos")}</span>
                </button>
              </>
            ) : (
              <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-emerald-500 text-black text-xs font-extrabold hover:bg-neutral-200 cursor-pointer transition-colors">{ui("Entendi e Fechar")}</button>
            )}
          </div>
        </div>
      </div>
    </ModalFrame>
  );
};
