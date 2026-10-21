import React, { useState } from 'react';
import { Usuario, PerfilUsuario, Cliente } from '../../types';
import { formatDateTimeBr } from '../../utils/dateUtils';
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Edit2,
  X,
  Mail,
  KeyRound,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Link as LinkIcon,
  Send
} from 'lucide-react';

interface UsersManagerProps {
  usuarios: Usuario[];
  clientes: Cliente[];
  currentUser: Usuario;
  onCreateUser: (user: Omit<Usuario, 'id' | 'criadoEm'>) => Promise<Usuario>;
  onUpdateUser: (id: string, updates: Partial<Usuario>) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  onSendAccessEmail?: (userId: string, customPassword?: string) => Promise<void>;
  onSendPasswordResetEmail?: (emailOrUserId: string) => Promise<void>;
  onEnterPortalAsUser?: (user: Usuario) => void;
  tema?: 'claro' | 'escuro';
}

export const UsersManager: React.FC<UsersManagerProps> = ({
  usuarios,
  clientes,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onSendAccessEmail,
  onSendPasswordResetEmail,
  onEnterPortalAsUser,
  tema = 'claro'
}) => {
  const isClaro = tema === 'claro';

  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [sendEmailOnCreate, setSendEmailOnCreate] = useState(true);

  // Modal para exibir credenciais e link direto de acesso ao portal do cliente
  const [generatedAccessModal, setGeneratedAccessModal] = useState<{
    userName: string;
    clientName: string;
    directLink: string;
    email: string;
    senha: string;
  } | null>(null);

  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const [formData, setFormData] = useState<Omit<Usuario, 'id' | 'criadoEm'>>({
    nome: '',
    email: '',
    senha: 'mudar123',
    perfil: 'CLIENTE',
    clientesIds: [],
    ativo: true,
    avatarUrl: ''
  });

  const isAdmin = currentUser.perfil === 'ADMINISTRADOR';

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: 'mudar123',
      perfil: 'CLIENTE',
      clientesIds: [],
      ativo: true,
      avatarUrl: ''
    });
    setEditingUser(null);
    setIsCreating(false);
    setSendEmailOnCreate(true);
  };

  const handleStartEdit = (u: Usuario) => {
    setEditingUser(u);
    setFormData({
      nome: u.nome,
      email: u.email,
      senha: u.senha || '123456',
      perfil: u.perfil,
      clientesIds: u.clientesIds || [],
      ativo: u.ativo,
      avatarUrl: u.avatarUrl || ''
    });
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, formData);
      } else {
        const created = await onCreateUser(formData);
        if (sendEmailOnCreate && onSendAccessEmail) {
          await onSendAccessEmail(created.id, formData.senha);
        }

        const targetCompany = clientes.find((c) => formData.clientesIds?.includes(c.id));
        if (targetCompany) {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const directLink = `${origin}/?empresa=${targetCompany.id}`;
          setGeneratedAccessModal({
            userName: created.nome,
            clientName: targetCompany.nome,
            directLink,
            email: created.email,
            senha: formData.senha || 'mudar123'
          });
        }
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
    }
  };

  const toggleUserActive = async (u: Usuario) => {
    if (!isAdmin) return;
    try {
      await onUpdateUser(u.id, { ativo: !u.ativo });
    } catch (err: any) {
      console.error(err);
    }
  };

  const roleColors: Record<PerfilUsuario, string> = {
    ADMINISTRADOR: 'bg-vulpis-azul text-white border-vulpis-azul',
    GESTOR: 'bg-[#F2B705] text-vulpis-grafite font-bold border-[#F2B705]',
    CRIADOR: 'bg-vulpis-cinza text-white border-vulpis-cinza',
    CLIENTE: 'bg-[#1E9E5A] text-white font-bold border-[#1E9E5A]'
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div
        className={`p-6 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-4 ${
          isClaro
            ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
            : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
        }`}
      >
        <div>
          <h2 className="font-miv-title text-xl tracking-wide">
            Validação de Clientes, Senhas &amp; Perfis de Acesso
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Cadastre e-mails de clientes, defina senhas, associe uma ou mais empresas e dispare os e-mails de acesso ou redefinição.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Cliente / Usuário</span>
          </button>
        )}
      </div>

      {/* PERFIL DE ADMINISTRADOR PRINCIPAL VULPIS */}
      <div
        className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
          isClaro
            ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
            : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-vulpis-azul" />
            <h3 className="font-miv-title text-base">
              Perfil de Administrador Principal Vulpis
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-vulpis-azul text-white">
              Gestão Global &amp; Todas as Empresas
            </span>
          </div>
          <span className="text-xs opacity-75">
            Senha padrão de validação: <strong className="font-mono">admin123</strong>
          </span>
        </div>

        <p className="text-xs opacity-75 leading-relaxed">
          Conta de administrador principal consolidada com visão completa e irrestrita sobre todas as empresas, cronogramas, clientes e roteiros.
          Demais perfis de equipe foram removidos conforme solicitado. Os clientes possuem acesso individualizado com permissões estritas à sua respectiva empresa.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {usuarios
            .filter((u) => u.perfil === 'ADMINISTRADOR')
            .map((admin) => (
              <div
                key={admin.id}
                className={`p-4 rounded-2xl border text-xs space-y-3 flex flex-col justify-between ${
                  isClaro
                    ? 'bg-vulpis-bege/35 border-vulpis-grafite/15'
                    : 'bg-[#121212] border-vulpis-cinza/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      admin.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(admin.nome)}`
                    }
                    alt={admin.nome}
                    className="w-11 h-11 rounded-full object-cover border-2 border-vulpis-azul"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-sm block truncate" title={admin.nome}>
                      {admin.nome}
                    </span>
                    <span className="text-[11px] opacity-75 font-mono block truncate" title={admin.email}>
                      {admin.email}
                    </span>
                    <span className="text-[10px] text-vulpis-azul font-bold mt-0.5 block">
                      Administrador Principal (Carlos Silva)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-vulpis-cinza/15">
                  <span className="text-[9px] font-bold uppercase text-vulpis-azul tracking-wider px-2 py-0.5 rounded bg-vulpis-azul/10">
                    Admin Master
                  </span>
                  <span className="text-[11px] text-[#1E9E5A] font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Ativo &amp; Protegido</span>
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {isCreating && (
        <div
          className={`p-6 rounded-3xl border shadow-2xl space-y-4 animate-in fade-in-50 ${
            isClaro
              ? 'bg-white border-vulpis-laranja/60 text-vulpis-grafite'
              : 'bg-vulpis-grafite border-vulpis-laranja/60 text-vulpis-bege'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-vulpis-cinza/20">
            <h3 className="font-miv-title text-lg">
              {editingUser ? `Editar Acesso: ${editingUser.nome}` : 'Cadastrar Novo Cliente / Usuário'}
            </h3>
            <button onClick={resetForm} className="p-1 rounded-lg opacity-70 hover:opacity-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Nome Completo <span className="text-vulpis-laranja">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Roberto Almeida"
                  className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  E-mail de Acesso <span className="text-vulpis-laranja">*</span>:
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@empresa.com.br"
                  className={`w-full text-xs p-3 rounded-2xl border font-mono focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Senha de Acesso <span className="text-vulpis-laranja">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={formData.senha || ''}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder="Ex: mudar123"
                  className={`w-full text-xs p-3 rounded-2xl border font-mono focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Perfil de Acesso:</label>
                <select
                  value={formData.perfil}
                  onChange={(e) =>
                    setFormData({ ...formData, perfil: e.target.value as PerfilUsuario })
                  }
                  className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                >
                  <option value="CLIENTE">Cliente (Comentar, Ajustes e Aprovar)</option>
                  <option value="CRIADOR">Criador (Social Media / Filmmaker)</option>
                  <option value="GESTOR">Gestor (Aprovador / Head)</option>
                  <option value="ADMINISTRADOR">Administrador (Acesso total)</option>
                </select>
              </div>
            </div>

            {formData.perfil !== 'ADMINISTRADOR' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Empresas atribuídas (caso o cliente seja responsável por mais de uma empresa, marque todas as que ele pode visualizar):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {clientes.map((c) => {
                    const isChecked = formData.clientesIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-vulpis-azul/15 border-vulpis-azul font-bold text-vulpis-azul'
                            : isClaro
                            ? 'bg-vulpis-bege/30 border-vulpis-grafite/20'
                            : 'bg-[#121212] border-vulpis-cinza'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...formData.clientesIds, c.id]
                              : formData.clientesIds.filter((id) => id !== c.id);
                            setFormData({ ...formData, clientesIds: newIds });
                          }}
                          className="rounded accent-vulpis-laranja"
                        />
                        <span className="truncate">{c.nome}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {!editingUser && (
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-[#1E9E5A]">
                <input
                  type="checkbox"
                  checked={sendEmailOnCreate}
                  onChange={(e) => setSendEmailOnCreate(e.target.checked)}
                  className="rounded accent-[#1E9E5A]"
                />
                <span>
                  Disparar e-mail de acesso com credenciais imediatamente após salvar
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-semibold opacity-70 hover:opacity-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md"
              >
                {editingUser
                  ? 'Salvar Alterações'
                  : sendEmailOnCreate
                  ? 'Cadastrar & Enviar E-mail de Acesso'
                  : 'Cadastrar Usuário'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela de Usuários */}
      <div
        className={`rounded-3xl border shadow-xl overflow-hidden ${
          isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[10px] font-bold uppercase tracking-wider opacity-70 ${
                isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
              }`}
            >
              <tr>
                <th className="p-4">Usuário / Cliente</th>
                <th className="p-4">Perfil</th>
                <th className="p-4">Empresas Liberadas</th>
                <th className="p-4">Senha / Validação</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações &amp; E-mails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vulpis-cinza/20">
              {usuarios.map((u) => {
                const assignedClients = clientes.filter(
                  (c) =>
                    u.clientesIds?.includes(c.id) ||
                    c.usuariosClientesIds?.includes(u.id) ||
                    c.gestoresIds?.includes(u.id) ||
                    c.criadoresIds?.includes(u.id)
                );

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isClaro ? 'hover:bg-vulpis-bege/20' : 'hover:bg-[#121212]/30'
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            u.avatarUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.nome)}`
                          }
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-vulpis-cinza/40"
                        />
                        <div>
                          <div className="font-bold text-xs">{u.nome}</div>
                          <div className="text-[11px] opacity-60 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          roleColors[u.perfil]
                        }`}
                      >
                        {u.perfil}
                      </span>
                    </td>

                    <td className="p-4">
                      {u.perfil === 'ADMINISTRADOR' ? (
                        <span className="text-vulpis-azul font-bold">Todas (Administrador)</span>
                      ) : assignedClients.length === 0 ? (
                        <span className="opacity-40">Nenhuma</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignedClients.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-vulpis-azul/10 text-vulpis-azul border border-vulpis-azul/30"
                            >
                              <span
                                style={{ backgroundColor: c.cor }}
                                className="w-2 h-2 rounded-full"
                              />
                              <span>{c.nome}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="font-mono text-[11px]">
                        Senha: <strong>{u.senha || (u.perfil === 'ADMINISTRADOR' ? 'admin123' : '123456')}</strong>
                      </div>
                      {u.ultimoEmailEnviadoEm && (
                        <div className="text-[10px] text-[#1E9E5A] font-mono">
                          E-mail ({u.tipoUltimoEmail || 'acesso'}): {formatDateTimeBr(u.ultimoEmailEnviadoEm)}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => toggleUserActive(u)}
                        disabled={!isAdmin || u.id === currentUser.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          u.ativo
                            ? 'bg-[#1E9E5A]/20 text-[#1E9E5A] border-[#1E9E5A]/50'
                            : 'bg-vulpis-cinza/30 text-vulpis-cinza border-vulpis-cinza/40'
                        }`}
                      >
                        {u.ativo ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-[#1E9E5A]" /> Ativo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-vulpis-cinza" /> Inativo
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {isAdmin && onSendAccessEmail && (
                          <button
                            type="button"
                            onClick={() => onSendAccessEmail(u.id)}
                            className="px-2.5 py-1 rounded-xl bg-[#1E9E5A]/15 hover:bg-[#1E9E5A] text-[#1E9E5A] hover:text-white border border-[#1E9E5A]/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                            title="Enviar e-mail de acesso para este usuário"
                          >
                            <Mail className="w-3 h-3" />
                            <span>E-mail Acesso</span>
                          </button>
                        )}

                        {isAdmin && onSendPasswordResetEmail && (
                          <button
                            type="button"
                            onClick={() => onSendPasswordResetEmail(u.id)}
                            className="px-2.5 py-1 rounded-xl bg-vulpis-laranja/15 hover:bg-vulpis-laranja text-vulpis-laranja hover:text-vulpis-grafite border border-vulpis-laranja/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                            title="Enviar e-mail para redefinir senha"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Redefinir Senha</span>
                          </button>
                        )}

                        {assignedClients.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : '';
                              const link = `${origin}/?empresa=${assignedClients[0].id}`;
                              handleCopyText(link, `Link de login de ${assignedClients[0].nome} copiado!`);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-vulpis-laranja/15 hover:bg-vulpis-laranja text-vulpis-grafite border border-vulpis-laranja/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                            title="Copiar Link Direto para Área de Login do Portal"
                          >
                            <LinkIcon className="w-3 h-3 text-vulpis-laranjaVivo" />
                            <span>Link Login</span>
                          </button>
                        )}

                        {u.perfil !== 'ADMINISTRADOR' && onEnterPortalAsUser && (
                          <button
                            type="button"
                            onClick={() => onEnterPortalAsUser(u)}
                            className="px-2.5 py-1 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="Ver somente a agenda vinculada a este cliente"
                          >
                            <span>Portal</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="p-1.5 rounded-xl border hover:bg-vulpis-azul hover:text-white transition-colors"
                            title="Editar Acesso"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {isAdmin && u.id !== 'user-admin' && onDeleteUser && (
                          <button
                            onClick={() => onDeleteUser(u.id)}
                            className="p-1.5 rounded-xl border border-[#D93A2B]/30 text-[#D93A2B] hover:bg-[#D93A2B] hover:text-white transition-colors"
                            title="Remover Usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOAST FLUTUANTE DE LINK OU DADOS COPIADOS */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#1E9E5A] text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* MODAL DE LINK DIRETO GERADO APÓS CRIAR USUÁRIO */}
      {generatedAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 ${
              isClaro
                ? 'bg-white border-vulpis-laranja/60 text-vulpis-grafite'
                : 'bg-vulpis-grafite border-vulpis-laranja/60 text-vulpis-bege'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-vulpis-cinza/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-vulpis-laranja/20 text-vulpis-laranjaVivo">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-miv-title text-base sm:text-lg">
                    Link Direto para Área de Login do Portal
                  </h3>
                  <p className="text-[11px] opacity-70">
                    Usuário e permissões criados para {generatedAccessModal.clientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGeneratedAccessModal(null)}
                className="p-1.5 rounded-xl opacity-70 hover:opacity-100 hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/30'
                }`}
              >
                <label className="text-[10px] font-bold uppercase tracking-wider text-vulpis-azul block">
                  Link Direto de Login Exclusivo:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedAccessModal.directLink}
                    className={`flex-1 p-2.5 rounded-xl border font-mono text-[11px] select-all ${
                      isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-black/40 border-vulpis-cinza/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        generatedAccessModal.directLink,
                        'Link direto para área de login copiado!'
                      )
                    }
                    className="px-3 py-2.5 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className={`p-3 rounded-2xl border ${
                    isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/30'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold opacity-70 block mb-1">
                    Usuário / E-mail:
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                    <span className="truncate">{generatedAccessModal.email}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(generatedAccessModal.email, 'E-mail de acesso copiado!')
                      }
                      className="p-1 opacity-70 hover:opacity-100"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-2xl border ${
                    isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/30'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold opacity-70 block mb-1">
                    Senha de Validação:
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                    <span>{generatedAccessModal.senha}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(generatedAccessModal.senha, 'Senha de acesso copiada!')
                      }
                      className="p-1 opacity-70 hover:opacity-100"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#1E9E5A]/10 border border-[#1E9E5A]/30 text-[11px] text-[#1E9E5A] font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>
                  O link abre diretamente a área de login de {generatedAccessModal.clientName}, onde o cliente preenche com suas credenciais.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-vulpis-cinza/20">
              <button
                type="button"
                onClick={() => {
                  const message = `*ACESSO AO PORTAL — ${generatedAccessModal.clientName.toUpperCase()}*\n\n🔗 *Link Direto de Login:* ${generatedAccessModal.directLink}\n👤 *Usuário / E-mail:* ${generatedAccessModal.email}\n🔑 *Senha:* ${generatedAccessModal.senha}\n\n*Instruções:* Acesse o link acima para visualizar o cronograma e aprovar conteúdos exclusivos da sua empresa.`;
                  handleCopyText(message, 'Mensagem formatada para WhatsApp copiada!');
                }}
                className="px-4 py-2.5 rounded-2xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Copiar Mensagem WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setGeneratedAccessModal(null)}
                className="px-5 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite font-bold text-xs shadow-md"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
