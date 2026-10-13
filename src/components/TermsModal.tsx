import { ModalFrame } from './ModalFrame';
import { ui, useUi } from '../i18n/ui';
import React from 'react';
import {
  X,
  ShieldCheck,
  Scale,
  Timer,
  AlertTriangle,
  Lock,
  Sparkles,
  CheckCircle2,
  FileText,
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
    <ModalFrame onClose={onClose} label={ui("Termos de Uso e Responsabilidade")} className="legacy-modal   ]   flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        id="terms-modal-card"
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-[#0E0E15] text-white border border-white/15 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#123328] to-[#0E0E15]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shadow-md shadow-white/5 shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-base font-bold text-white tracking-tight">
                  {ui("Termos de Uso e Responsabilidade")}</h2>
                <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-zinc-300">
                  {ui("Obrigatório")}</span>
              </div>
              <p className="text-[11px] text-zinc-300/70">
                {ui("Diretrizes de convivência e participação • mocinhas")}</p>
            </div>
          </div>
          <button
            id="close-terms-button"
            onClick={onClose}
            aria-label={ui("Fechar termos")}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-zinc-200/90 leading-relaxed scrollbar-thin">
          {/* Highlight Banner */}
          <div className="p-3.5 rounded-2xl bg-[#161622] border border-white/15 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-zinc-200">
              <strong className="text-white block mb-0.5">{ui("Leitura Importante:")}</strong>
              {ui("Para manter nossa comunidade um lugar seguro, transparente e respeitoso, o aceite destes termos é")} <strong>{ui("requisito indispensável")}</strong> {ui("para a criação de conta e utilização da plataforma.")}</div>
          </div>

          <section className="space-y-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="font-bold">{ui("1. Publicações e participação")}</h3>
            <p>{ui("Apenas a administração publica fotos e vídeos. Os membros podem visualizar, curtir, comentar e salvar publicações.")}</p>
            <p>{ui("As publicações não expiram automaticamente. A administração pode removê-las manualmente. O limite diário de consumo, quando ativado, vale para todas as contas comuns, incluindo Premium.")}</p>
          </section>

          {/* 2. Responsabilidade Exclusiva do Usuário */}
          <section className="space-y-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-zinc-400" />
              <span>{ui("2. Responsabilidade Exclusiva e Integral do Usuário")}</span>
            </div>
            <p className="text-zinc-200/80">
              {ui("Você, como usuário e autor da publicação, é o")} <strong>{ui("único e total responsável (civil, administrativa e penalmente)")}</strong> {ui("por todo e qualquer conteúdo que criar, carregar, publicar, transmitir, gravar, compartilhar ou comentar no aplicativo.")}</p>
            <p className="text-zinc-200/80">
              {ui("O usuário assegura possuir todos os direitos, autorizações de imagem e consentimentos necessários para veicular qualquer conteúdo, isentando expressamente a plataforma e seus desenvolvedores de qualquer reivindicação judicial ou extrajudicial de terceiros.")}</p>
          </section>

          {/* 3. Conteúdos Estritamente Proibidos */}
          <section className="space-y-1.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
              <span>{ui("3. Conteúdos Proibidos (Tolerância Zero)")}</span>
            </div>
            <p className="text-zinc-200/90 font-medium">
              {ui("É terminantemente proibido publicar, compartilhar ou solicitar na plataforma:")}</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-200/80 pl-1">
              <li>
                <strong>{ui("Exploração de Menores:")}</strong> {ui("Qualquer material pornográfico, erótico ou alusivo à nudez envolvendo menores de 18 anos acarretará bloqueio sumário da conta e")} <strong>{ui("denúncia imediata aos órgãos policiais competentes")}</strong>.
              </li>
              <li>
                <strong>{ui("Pornografia e Nudez Não Solicitada:")}</strong> {ui("Exposição genital, sexo explícito ou atos obscenos.")}</li>
              <li>
                <strong>{ui("Discurso de Ódio e Preconceito:")}</strong> {ui("Discriminação, misoginia, racismo, homofobia, transfobia, intolerância religiosa ou xenofobia.")}</li>
              <li>
                <strong>{ui("Assédio, Perseguição e Doxxing:")}</strong> {ui("Cyberbullying, ameaças, extorsão, divulgação não consentida de números de telefone, endereços ou documentos de terceiros.")}</li>
              <li>
                <strong>{ui("Atividades Ilícitas e Golpes:")}</strong> {ui("Venda de substâncias proibidas, pirâmides financeiras, apologia a crimes ou incentivo à violência e automutilação.")}</li>
            </ul>
          </section>

          {/* 4. Colaboração com Autoridades Policiais e Judiciais */}
          <section className="space-y-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{ui("4. Colaboração Irrestrita com as Autoridades Policiais e Judiciais")}</span>
            </div>
            <p className="text-zinc-200/80">
              {ui("O aplicativo")} <strong>{ui("NÃO é refúgio para ilicitudes")}</strong> {ui(". Em estrito cumprimento à legislação vigente, em especial à Lei Federal nº 12.965/2014 (Marco Civil da Internet), a plataforma:")}</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-200/80 pl-1">
              <li>
                {ui("Mantém sob sigilo e segurança os")} <strong>{ui("registros de conexão (endereços IP, portas lógicas, data e hora de acesso, e identificadores da conta)")}</strong> {ui("pelo prazo legal de guarda.")}</li>
              <li>
                {ui("Irá")} <strong>{ui("colaborar integral e ativamente com a Polícia Civil, Polícia Federal, Ministério Público e Poder Judiciário")}</strong> {ui(", disponibilizando todos os registros técnicos necessários para a identificação e punição de infratores mediante ordem judicial ou requisição legal autorizada.")}</li>
            </ul>
          </section>

          {/* 5. Denúncias e Banimento */}
          <section className="space-y-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>{ui("5. Canal de Denúncias e Medidas Administrativas")}</span>
            </div>
            <p className="text-zinc-200/80">
              {ui("Todas as publicações e perfis contam com botão de")} <strong>{ui("Denúncia")}</strong> {ui("direto. A equipe da plataforma pode, a seu exclusivo critério, remover conteúdos denunciados e")} <strong>{ui("banir permanentemente")}</strong> {ui("contas que violem estas diretrizes, sem aviso prévio e sem direito a qualquer compensação.")}</p>
          </section>

          {/* 6. Declaração de Ciência */}
          <div className="p-3.5 rounded-2xl bg-[#123328] border border-white/15 text-center">
            <p className="text-[11px] text-zinc-300 font-semibold">
              {ui("Ao criar sua conta, você declara expressamente que leu, entendeu e concorda de forma irrevogável com todos os termos e diretrizes acima descritos.")}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#1E0B1B] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <FileText className="w-3.5 h-3.5" />
            <span>{ui("Última atualização: Setembro de 2026")}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {showAcceptButton ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  {ui("Voltar")}</button>
                <button
                  type="button"
                  onClick={() => {
                    onAccept?.();
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-emerald-500 text-black text-xs font-extrabold shadow-md hover:bg-neutral-200 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{ui("Li e Aceito os Termos")}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-emerald-500 text-black text-xs font-extrabold hover:bg-neutral-200 cursor-pointer transition-colors"
              >
                {ui("Entendi e Fechar")}</button>
            )}
          </div>
        </div>
      </div>
    </ModalFrame>
  );
};
