import React, { useState, useEffect } from 'react';
import { Usuario, Cliente } from '../../types';
import { VulpisLogo } from '../common/VulpisLogo';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

interface LoginScreenProps {
  usuarios: Usuario[];
  clientes?: Cliente[];
  initialEmail?: string;
  initialResetCode?: string;
  dedicatedCompanyId?: string;
  onAuthenticate: (email: string, senha: string) => void;
  onQuickLogin: (user: Usuario) => void;
  onRequestPasswordReset: (email: string) => Promise<{ codigo: string; email: string }>;
  onConfirmPasswordReset: (email: string, codigo: string, novaSenha: string) => Promise<void>;
  onRegisterClientSelfUser?: (
    clienteId: string,
    nome: string,
    email: string,
    senha: string,
    cargo?: string
  ) => Promise<Usuario>;
  onExitDedicatedPortal?: () => void;
  tema?: 'claro' | 'escuro';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  usuarios,
  clientes = [],
  initialEmail = '',
  initialResetCode = '',
  dedicatedCompanyId = '',
  onAuthenticate,
  onQuickLogin,
  onRequestPasswordReset,
  onConfirmPasswordReset,
  onExitDedicatedPortal,
  tema = 'claro'
}) => {
  const isClaro = tema === 'claro';

  // Empresa vinculada ao link de acesso exclusivo
  const dedicatedCompany = dedicatedCompanyId
    ? clientes.find((c) => c.id === dedicatedCompanyId)
    : undefined;
  const isDedicatedPortal = Boolean(dedicatedCompany);

  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(
    initialResetCode ? 'reset' : 'login'
  );
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState(initialResetCode);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sentCodePreview, setSentCodePreview] = useState<string | null>(initialResetCode || null);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
    if (initialResetCode) {
      setResetCode(initialResetCode);
      setSentCodePreview(initialResetCode);
      setMode('reset');
    }
  }, [initialEmail, initialResetCode]);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      onAuthenticate(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na validação de acesso.');
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await onRequestPasswordReset(email);
      setSentCodePreview(res.codigo);
      setResetCode(res.codigo);
      setSuccessMsg(
        `E-mail de redefinição enviado para ${res.email}! Código de validação gerado: ${res.codigo}`
      );
      setMode('reset');
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível enviar o e-mail de redefinição.');
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setErrorMsg('A confirmação de senha não confere com a nova senha.');
      return;
    }
    try {
      await onConfirmPasswordReset(email, resetCode, newPassword);
      setPassword(newPassword.trim());
      setSuccessMsg('Senha redefinida com sucesso! Você já pode entrar com sua nova senha.');
      setMode('login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao redefinir a senha.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-vulpis-azul font-sans">
      {/* FORMAS ORGÂNICAS EM ONDAS LARANJA E AZUL COM PATINHAS CONFORME MIV */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 top-0 bottom-0 w-1/3 opacity-20">
          <svg viewBox="0 0 200 600" fill="#FFFFFF" className="w-full h-full">
            <ellipse cx="30" cy="50" rx="6" ry="9" />
            <ellipse cx="46" cy="38" rx="6" ry="9" />
            <ellipse cx="64" cy="40" rx="6" ry="9" />
            <ellipse cx="78" cy="54" rx="6" ry="9" />
            <path d="M 54 65 C 38 65 35 88 54 94 C 73 88 70 65 54 65 Z" />

            <ellipse cx="110" cy="140" rx="6" ry="9" />
            <ellipse cx="126" cy="128" rx="6" ry="9" />
            <ellipse cx="144" cy="130" rx="6" ry="9" />
            <ellipse cx="158" cy="144" rx="6" ry="9" />
            <path d="M 134 155 C 118 155 115 178 134 184 C 153 178 150 155 134 155 Z" />
          </svg>
        </div>

        <svg
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
        >
          <path
            d="M -100 900 C 200 700 300 450 600 500 C 900 550 1100 200 1600 100 L 1600 900 Z"
            fill="#F86904"
          />
          <path
            d="M -100 900 C 400 850 600 650 900 700 C 1200 750 1350 500 1600 400 L 1600 900 Z"
            fill="#FB7009"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* CARD DE LOGIN / VALIDAÇÃO DE ACESSO */}
      <div
        className={`relative z-10 w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 border transition-all ${
          isClaro
            ? 'bg-[#F9E8CE] border-vulpis-grafite/20 text-vulpis-grafite'
            : 'bg-[#121212] border-vulpis-cinza/40 text-vulpis-bege'
        }`}
      >
        <div className="flex justify-center mb-4">
          <VulpisLogo variant="principal" size="lg" theme={isClaro ? 'claro' : 'escuro'} />
        </div>

        {/* CABEÇALHO DEDICADO DO CLIENTE QUANDO ACESSADO POR LINK EXCLUSIVO */}
        {isDedicatedPortal && dedicatedCompany ? (
          <div className="mb-5 p-3.5 rounded-2xl bg-white/90 border border-vulpis-laranja/40 shadow-sm flex items-center gap-3 text-vulpis-grafite">
            <img
              src={dedicatedCompany.logoUrl}
              alt={dedicatedCompany.nome}
              className="w-12 h-12 rounded-xl object-cover border border-vulpis-laranja/30 p-0.5 bg-white flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-vulpis-laranja text-vulpis-grafite uppercase tracking-wider">
                  Portal Exclusivo
                </span>
                <span className="text-[10px] text-vulpis-azul font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Isolado
                </span>
              </div>
              <h3 className="font-miv-title text-base text-vulpis-grafite truncate leading-tight mt-0.5">
                {dedicatedCompany.nome}
              </h3>
              {dedicatedCompany.segmento && (
                <p className="text-[11px] opacity-75 truncate">{dedicatedCompany.segmento}</p>
              )}
            </div>
          </div>
        ) : null}

        {/* TÍTULO E SUBTÍTULO */}
        <div className="text-center mb-5">
          <h2 className="font-miv-title text-lg sm:text-xl tracking-wide">
            {mode === 'login'
              ? isDedicatedPortal
                ? 'Login Exclusivo do Cliente'
                : 'Validação de Acesso'
              : mode === 'forgot'
              ? 'Enviar Código por E-mail'
              : 'Criar Nova Senha de Acesso'}
          </h2>
          <p className="text-xs opacity-75 mt-1">
            {mode === 'login'
              ? isDedicatedPortal
                ? `Informe o e-mail e a senha cadastrados para a empresa ${dedicatedCompany?.nome || ''}.`
                : 'Acesse com o e-mail e senha cadastrados pelo administrador.'
              : mode === 'forgot'
              ? 'Informe seu e-mail para receber o código de 6 dígitos'
              : 'Valide o código recebido no e-mail e defina sua nova senha'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-[#D93A2B]/15 border border-[#D93A2B] text-[#D93A2B] text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-[#1E9E5A]/15 border border-[#1E9E5A] text-[#1E9E5A] text-xs font-semibold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORMULÁRIO DE LOGIN: APENAS OS CAMPOS DE LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">
                {isDedicatedPortal ? 'E-mail de Acesso:' : 'E-mail Cadastrado:'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="cliente@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-9 pr-3 py-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul font-medium ${
                    isClaro
                      ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                      : 'bg-vulpis-grafite border-vulpis-cinza/50 text-vulpis-bege'
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold">Senha de Acesso:</label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setMode('forgot');
                  }}
                  className="text-[11px] font-bold text-vulpis-azul hover:underline"
                >
                  Esqueci a Senha
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-9 pr-3 py-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul font-medium ${
                    isClaro
                      ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                      : 'bg-vulpis-grafite border-vulpis-cinza/50 text-vulpis-bege'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              <span>{isDedicatedPortal ? 'Acessar Agenda & Conteúdos' : 'Validar & Entrar no Painel'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}

        {/* FORMULÁRIO DE RECUPERAÇÃO DE SENHA */}
        {mode === 'forgot' && (
          <form onSubmit={handleSendResetEmail} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">
                Informe o seu e-mail cadastrado:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="cliente@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-9 pr-3 py-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul font-medium ${
                    isClaro
                      ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                      : 'bg-vulpis-grafite border-vulpis-cinza/50 text-vulpis-bege'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar Código de Redefinição</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setMode('login');
              }}
              className="w-full py-2 text-xs font-bold opacity-75 hover:opacity-100 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para o Login</span>
            </button>
          </form>
        )}

        {/* FORMULÁRIO DE CONFIRMAÇÃO DE NOVA SENHA */}
        {mode === 'reset' && (
          <form onSubmit={handleConfirmReset} className="space-y-3.5 text-xs">
            {sentCodePreview && (
              <div className="p-3 rounded-2xl bg-vulpis-laranja/15 border border-vulpis-laranja text-xs">
                <span className="block text-[10px] uppercase font-bold opacity-80">
                  Código de Redefinição Gerado ({email}):
                </span>
                <span className="font-mono text-sm font-bold text-vulpis-laranja">
                  Código: {sentCodePreview}
                </span>
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">E-mail:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-3 rounded-2xl border font-mono ${
                  isClaro
                    ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                    : 'bg-vulpis-grafite border-vulpis-cinza/50 text-vulpis-bege'
                }`}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Código de Validação (6 dígitos):</label>
              <input
                type="text"
                required
                placeholder="000000"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className={`w-full p-3 rounded-2xl border font-mono tracking-widest font-bold ${
                  isClaro
                    ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                    : 'bg-vulpis-grafite border-vulpis-cinza/50 text-vulpis-bege'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Nova Senha:</label>
                <input
                  type="password"
                  required
                  placeholder="Nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full p-3 rounded-2xl border ${
                    isClaro
                      ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                      : 'bg-vulpis-grafite border-vulpis-cinza/50 text-vulpis-bege'
                  }`}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Confirmar Senha:</label>
                <input
                  type="password"
                  required
                  placeholder="Repita a senha"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`w-full p-3 rounded-2xl border ${
                    isClaro
                      ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                      : 'bg-vulpis-grafite border-vulpis-cinza/50 text-vulpis-bege'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#1E9E5A] hover:bg-[#18854b] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Salvar Nova Senha</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full py-2 text-xs font-bold opacity-75 hover:opacity-100 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Login</span>
            </button>
          </form>
        )}

        {/* RODAPÉ E CONTROLES DE ACESSO */}
        {isDedicatedPortal && (
          <div className="mt-6 pt-5 border-t border-vulpis-cinza/20 space-y-3 text-center">
            <div className="p-3 rounded-2xl bg-[#1E9E5A]/10 border border-[#1E9E5A]/30 text-[11px] text-[#1E9E5A] font-semibold flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Acesso exclusivo à empresa {dedicatedCompany?.nome}. Novos acessos são criados pelo administrador.</span>
            </div>

            {onExitDedicatedPortal && (
              <button
                type="button"
                onClick={onExitDedicatedPortal}
                className="text-[11px] font-bold opacity-60 hover:opacity-100 hover:underline flex items-center justify-center gap-1 mx-auto text-vulpis-grafite dark:text-vulpis-bege"
              >
                <span>Acessar Painel Geral Administrador Vulpis</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <div className="mt-5 text-center text-[10px] opacity-60 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-vulpis-azul" />
          <span>Segurança ABAC &amp; RBAC com isolamento estrito de dados</span>
        </div>
      </div>
    </div>
  );
};
