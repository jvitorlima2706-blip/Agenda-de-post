import React, { useState } from 'react';
import { Usuario, Cliente } from '../../types';
import { VulpisLogo } from './VulpisLogo';
import {
  Mail,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  Building2,
  X,
  ShieldCheck,
  Send
} from 'lucide-react';
import { formatDateTimeBr } from '../../utils/dateUtils';

export interface DispatchedEmailData {
  tipo: 'acesso' | 'redefinicao';
  user: Usuario;
  senhaDefinida?: string;
  codigoRecuperacao?: string;
  companies: Cliente[];
  subject: string;
  body: string;
  enviadoEm: string;
}

interface EmailPreviewModalProps {
  emailData: DispatchedEmailData;
  onClose: () => void;
  onEnterAsClient?: (user: Usuario) => void;
  onGoToLoginWithEmail?: (email: string, codigo?: string) => void;
  tema?: 'claro' | 'escuro';
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  emailData,
  onClose,
  onEnterAsClient,
  onGoToLoginWithEmail,
  tema = 'claro'
}) => {
  const isClaro = tema === 'claro';
  const [copied, setCopied] = useState(false);

  const handleCopyCredentials = () => {
    navigator.clipboard.writeText(emailData.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const mailtoHref = `mailto:${encodeURIComponent(emailData.user.email)}?subject=${encodeURIComponent(
    emailData.subject
  )}&body=${encodeURIComponent(emailData.body)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in-50 font-sans">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isClaro
            ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
            : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
        }`}
      >
        {/* Top Banner */}
        <div className="bg-[#121212] text-vulpis-bege p-4 sm:px-6 border-b border-vulpis-cinza/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E9E5A] text-white flex items-center justify-center shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E9E5A] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {emailData.tipo === 'acesso'
                    ? 'E-mail de Acesso Enviado ao Cliente'
                    : 'E-mail de Redefinição de Senha Enviado'}
                </span>
              </div>
              <h3 className="font-miv-title text-base text-white mt-0.5">
                Comprovante &amp; Visualização do E-mail Recebido pelo Cliente
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-vulpis-bege/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email Envelope Metadata */}
        <div
          className={`px-6 py-3.5 border-b text-xs space-y-1.5 ${
            isClaro
              ? 'bg-vulpis-bege/40 border-vulpis-grafite/15'
              : 'bg-[#181818] border-vulpis-cinza/40'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="opacity-60 font-semibold">Para (Cliente): </span>
              <strong className="font-mono text-vulpis-azul">
                {emailData.user.nome} &lt;{emailData.user.email}&gt;
              </strong>
            </div>
            <span className="text-[11px] font-mono opacity-60">
              Disparado em: {formatDateTimeBr(emailData.enviadoEm)}
            </span>
          </div>
          <div>
            <span className="opacity-60 font-semibold">Assunto: </span>
            <strong>{emailData.subject}</strong>
          </div>
        </div>

        {/* Simulated Email Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          <div
            className={`p-5 rounded-2xl border shadow-inner space-y-4 ${
              isClaro
                ? 'bg-[#F9E8CE]/35 border-vulpis-grafite/15 text-vulpis-grafite'
                : 'bg-[#121212] border-vulpis-cinza/40 text-vulpis-bege'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-vulpis-cinza/20">
              <VulpisLogo variant="principal" size="sm" theme={isClaro ? 'claro' : 'escuro'} />
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-vulpis-laranja text-vulpis-grafite">
                Portal Exclusivo do Cliente
              </span>
            </div>

            <div className="space-y-2 text-xs leading-relaxed">
              <p className="text-sm font-bold">Olá, {emailData.user.nome}!</p>
              {emailData.tipo === 'acesso' ? (
                <p>
                  Seu acesso ao <strong>Portal de Agenda e Aprovação</strong> foi cadastrado e
                  validado pelo Administrador. A partir de agora você pode visualizar o calendário
                  da(s) sua(s) empresa(s), comentar nas postagens, solicitar ajustes ou aprovar
                  conteúdos.
                </p>
              ) : (
                <p>
                  Você (ou o Administrador) solicitou a <strong>redefinição de senha</strong> para o
                  seu acesso ao Portal do Cliente. Utilize o código de validação abaixo para criar
                  sua nova senha:
                </p>
              )}
            </div>

            {/* Credentials / Token Box */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isClaro
                  ? 'bg-white border-vulpis-laranja/50'
                  : 'bg-vulpis-grafite border-vulpis-laranja/50'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-vulpis-laranja">
                <KeyRound className="w-4 h-4" />
                <span>
                  {emailData.tipo === 'acesso'
                    ? 'Credenciais Validadas para Login do Cliente'
                    : 'Dados para Redefinição de Senha'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/30 border border-vulpis-cinza/20">
                  <span className="text-[10px] uppercase opacity-60 block font-semibold">
                    E-mail Cadastrado:
                  </span>
                  <strong className="font-mono text-sm select-all">{emailData.user.email}</strong>
                </div>

                {emailData.tipo === 'acesso' ? (
                  <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/30 border border-vulpis-cinza/20">
                    <span className="text-[10px] uppercase opacity-60 block font-semibold">
                      Senha de Acesso:
                    </span>
                    <strong className="font-mono text-sm text-vulpis-laranja select-all">
                      {emailData.senhaDefinida || emailData.user.senha || '123456'}
                    </strong>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-vulpis-laranja/15 border border-vulpis-laranja">
                    <span className="text-[10px] uppercase opacity-80 block font-bold">
                      Código de Redefinição:
                    </span>
                    <strong className="font-mono text-base tracking-widest text-vulpis-laranja select-all">
                      {emailData.codigoRecuperacao || emailData.user.codigoRecuperacao}
                    </strong>
                  </div>
                )}
              </div>

              {/* Associated Companies */}
              <div className="pt-2 border-t border-vulpis-cinza/20">
                <span className="text-[10px] uppercase opacity-70 font-bold flex items-center gap-1 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-vulpis-azul" />
                  <span>
                    Empresa(s) liberada(s) para este cliente ({emailData.companies.length}):
                  </span>
                </span>
                {emailData.companies.length === 0 ? (
                  <span className="text-xs opacity-60">
                    Nenhuma empresa vinculada ainda.
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {emailData.companies.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border bg-vulpis-azul/10 border-vulpis-azul/30"
                      >
                        <span
                          style={{ backgroundColor: c.cor }}
                          className="w-2.5 h-2.5 rounded-full"
                        />
                        <span>{c.nome}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1E9E5A]/15 border border-[#1E9E5A]/30 text-[11px] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1E9E5A] flex-shrink-0 mt-0.5" />
              <span>
                <strong>Permissões Garantidas:</strong> Ao acessar o painel com este e-mail, o
                cliente visualizará somente a agenda da(s) empresa(s) acima e terá autonomia
                exclusivamente para <strong>comentar</strong>, <strong>solicitar ajustes</strong> e{' '}
                <strong>aprovar postagens</strong>.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`p-4 sm:px-6 border-t flex flex-wrap items-center justify-between gap-2 ${
            isClaro
              ? 'bg-vulpis-bege/40 border-vulpis-grafite/15'
              : 'bg-[#121212] border-vulpis-cinza/40'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/20 hover:bg-vulpis-bege'
                  : 'bg-vulpis-grafite border-vulpis-cinza hover:bg-vulpis-cinza/40'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#1E9E5A]" />
                  <span className="text-[#1E9E5A]">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Texto do E-mail</span>
                </>
              )}
            </button>

            <a
              href={mailtoHref}
              className="px-3.5 py-2 rounded-xl border border-vulpis-azul/40 text-vulpis-azul hover:bg-vulpis-azul hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Disparar no App de E-mail</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {emailData.tipo === 'redefinicao' && onGoToLoginWithEmail && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToLoginWithEmail(emailData.user.email, emailData.codigoRecuperacao);
                }}
                className="px-4 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
              >
                <KeyRound className="w-4 h-4" />
                <span>Redefinir Senha na Tela de Login</span>
              </button>
            )}

            {onEnterAsClient && emailData.user.perfil === 'CLIENTE' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEnterAsClient(emailData.user);
                }}
                className="px-4 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
              >
                <span>Acessar Painel do Cliente Agora</span>
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
