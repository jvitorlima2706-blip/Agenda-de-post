import React, { useState } from 'react';
import { Cliente, Usuario, RedeSocial, PerfilUsuario } from '../../types';
import { SocialIcon } from '../../utils/socialIcons';
import { compressImageToDataUrl } from '../../utils/mediaUtils';
import { formatDateTimeBr } from '../../utils/dateUtils';
import {
  Plus,
  Edit2,
  Lock,
  X,
  Building2,
  UserPlus,
  Users,
  ShieldCheck,
  ExternalLink,
  Upload,
  CheckCircle2,
  Mail,
  KeyRound,
  Send,
  Trash2,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Share2,
  Link as LinkIcon
} from 'lucide-react';

interface ClientsManagerProps {
  clientes: Cliente[];
  usuarios: Usuario[];
  currentUser: Usuario;
  onCreateClient: (client: Omit<Cliente, 'id'>) => Promise<Cliente>;
  onUpdateClient: (id: string, updates: Partial<Cliente>) => Promise<void>;
  onDeleteClient?: (id: string) => Promise<void>;
  onCreateUser: (user: Omit<Usuario, 'id' | 'criadoEm'>) => Promise<Usuario>;
  onUpdateUser: (id: string, updates: Partial<Usuario>) => Promise<void>;
  onSendAccessEmail?: (userId: string, customPassword?: string) => Promise<void>;
  onSendPasswordResetEmail?: (emailOrUserId: string) => Promise<void>;
  onEnterPortalAsUser?: (user: Usuario) => void;
  tema?: 'claro' | 'escuro';
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({
  clientes,
  usuarios,
  currentUser,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  onCreateUser,
  onUpdateUser,
  onSendAccessEmail,
  onSendPasswordResetEmail,
  onEnterPortalAsUser,
  tema = 'claro'
}) => {
  const isClaro = tema === 'claro';

  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Estado para exclusão de empresa com confirmação em duas etapas ("excluir")
  const [deletingClient, setDeletingClient] = useState<Cliente | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  // Estados para visualização de senhas e links copiados
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const toggleShowPassword = (id: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const getCompanyAccessLink = (c: { id: string; emailAcesso?: string }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?empresa=${c.id}`;
  };

  const handleCopyFullCredentials = (c: Cliente) => {
    const link = getCompanyAccessLink(c);
    const text = `*DADOS DE ACESSO AO PORTAL — ${c.nome.toUpperCase()}*\n\n🔗 *Link Direto de Login:* ${link}\n👤 *E-mail / Usuário:* ${c.emailAcesso || 'Não cadastrado'}\n🔑 *Senha de Acesso:* ${c.senhaAcesso || '123456'}\n\n*Instruções:* Acesse o link acima para abrir a área de login exclusiva da sua empresa e preencha suas credenciais para visualizar a agenda e aprovar conteúdos.`;
    handleCopyText(text, `Credenciais e link direto de ${c.nome} copiados!`);
  };

  // Modal para exibir o link direto gerado após cadastro/edição de empresa e usuário responsável
  const [generatedAccessModal, setGeneratedAccessModal] = useState<{
    client: Cliente;
    directLink: string;
    email: string;
    senha: string;
    isNew: boolean;
  } | null>(null);

  // Modal rápido para criar/associar um usuário/cliente direto na Empresa
  const [quickUserCompany, setQuickUserCompany] = useState<Cliente | null>(null);
  const [quickUserMode, setQuickUserMode] = useState<'novo' | 'existente'>('novo');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('mudar123');
  const [newUserRole, setNewUserRole] = useState<PerfilUsuario>('CLIENTE');
  const [newUserSelectedCompanies, setNewUserSelectedCompanies] = useState<string[]>([]);
  const [quickSendEmail, setQuickSendEmail] = useState(true);
  const [isSavingQuickUser, setIsSavingQuickUser] = useState(false);
  const [sendEmailImmediately, setSendEmailImmediately] = useState(true);

  const [formData, setFormData] = useState<Omit<Cliente, 'id'>>({
    nome: '',
    cnpj: '',
    segmento: '',
    responsavelContato: '',
    emailAcesso: '',
    senhaAcesso: 'vulpis2026',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
    cor: '#F86904',
    redes: ['Instagram'],
    criadoresIds: ['user-admin'],
    gestoresIds: ['user-admin'],
    usuariosClientesIds: [],
    briefing: ''
  });

  const isAdmin = currentUser.perfil === 'ADMINISTRADOR';

  const resetForm = () => {
    setFormData({
      nome: '',
      cnpj: '',
      segmento: '',
      responsavelContato: '',
      emailAcesso: '',
      senhaAcesso: 'vulpis2026',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
      cor: '#F86904',
      redes: ['Instagram'],
      criadoresIds: ['user-admin'],
      gestoresIds: ['user-admin'],
      usuariosClientesIds: [],
      briefing: ''
    });
    setEditingClient(null);
    setIsCreating(false);
  };

  const handleStartEdit = (c: Cliente) => {
    setEditingClient(c);
    setFormData({
      nome: c.nome,
      cnpj: c.cnpj || '',
      segmento: c.segmento || '',
      responsavelContato: c.responsavelContato || '',
      emailAcesso: c.emailAcesso || '',
      senhaAcesso: c.senhaAcesso || 'vulpis2026',
      logoUrl: c.logoUrl,
      cor: c.cor,
      redes: c.redes,
      criadoresIds: c.criadoresIds || [],
      gestoresIds: c.gestoresIds || [],
      usuariosClientesIds: c.usuariosClientesIds || [],
      briefing: c.briefing
    });
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 300);
      setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
    } catch {
      setFormData((prev) => ({ ...prev, logoUrl: URL.createObjectURL(file) }));
    }
  };

  const handleOpenDeleteModal = (client: Cliente) => {
    setDeletingClient(client);
    setDeleteConfirmText('');
  };

  const handleConfirmDeleteClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingClient || !onDeleteClient) return;
    if (deleteConfirmText.trim().toLowerCase() !== 'excluir') return;

    setIsDeletingClient(true);
    try {
      await onDeleteClient(deletingClient.id);
      if (editingClient?.id === deletingClient.id) {
        resetForm();
      }
      setDeletingClient(null);
      setDeleteConfirmText('');
    } finally {
      setIsDeletingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const cleanEmail = formData.emailAcesso?.trim().toLowerCase() || '';
      const cleanSenha = formData.senhaAcesso?.trim() || 'vulpis2026';
      const finalPayload: Omit<Cliente, 'id'> = {
        ...formData,
        emailAcesso: cleanEmail,
        senhaAcesso: cleanSenha,
        responsavelContato: formData.responsavelContato || formData.nome
      };

      let createdClientObj: Cliente | undefined;
      if (editingClient) {
        await onUpdateClient(editingClient.id, finalPayload);
        createdClientObj = { ...editingClient, ...finalPayload };
      } else {
        createdClientObj = await onCreateClient(finalPayload);
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const directLoginLink = `${origin}/?empresa=${createdClientObj?.id || ''}`;

      setGeneratedAccessModal({
        client: createdClientObj || { id: 'cliente', ...finalPayload },
        directLink: directLoginLink,
        email: cleanEmail,
        senha: cleanSenha,
        isNew: !editingClient
      });

      if (sendEmailImmediately && onSendAccessEmail && cleanEmail) {
        const targetUser = usuarios.find((u) => u.email.trim().toLowerCase() === cleanEmail);
        if (targetUser) {
          await onSendAccessEmail(targetUser.id, cleanSenha);
        }
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Cria um novo usuário/cliente associado à empresa selecionada (e outras empresas se ele for responsável por mais de uma)
  const handleCreateQuickUserForCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUserCompany || !newUserName.trim() || !newUserEmail.trim()) return;

    setIsSavingQuickUser(true);
    try {
      const targetCompanyIds = Array.from(
        new Set([quickUserCompany.id, ...newUserSelectedCompanies])
      );
      const createdUser = await onCreateUser({
        nome: newUserName.trim(),
        email: newUserEmail.trim(),
        senha: newUserPassword.trim() || '123456',
        perfil: newUserRole,
        clientesIds: targetCompanyIds,
        ativo: true,
        avatarUrl: ''
      });

      if (quickSendEmail && onSendAccessEmail) {
        await onSendAccessEmail(createdUser.id, newUserPassword.trim() || '123456');
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setGeneratedAccessModal({
        client: quickUserCompany,
        directLink: `${origin}/?empresa=${quickUserCompany.id}`,
        email: newUserEmail.trim(),
        senha: newUserPassword.trim() || '123456',
        isNew: true
      });

      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('mudar123');
      setNewUserSelectedCompanies([]);
      setQuickUserCompany(null);
    } finally {
      setIsSavingQuickUser(false);
    }
  };

  // Alterna vínculo de usuário existente com a empresa (permite que um cliente tenha 1 ou mais empresas)
  const handleToggleExistingUserAssociation = async (company: Cliente, user: Usuario) => {
    if (!isAdmin) return;

    const currentClientIds = new Set(user.clientesIds || []);
    const isCurrentlyLinked =
      currentClientIds.has(company.id) ||
      company.usuariosClientesIds?.includes(user.id) ||
      company.gestoresIds?.includes(user.id) ||
      company.criadoresIds?.includes(user.id);

    if (isCurrentlyLinked) {
      currentClientIds.delete(company.id);
    } else {
      currentClientIds.add(company.id);
    }

    await onUpdateUser(user.id, { clientesIds: Array.from(currentClientIds) });
  };

  const availableRedes: RedeSocial[] = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook'];
  const usuariosClientes = usuarios.filter((u) => u.perfil === 'CLIENTE');

  // Se o usuário não for Admin, mostra apenas as empresas vinculadas a ele
  const visibleClientes = isAdmin
    ? clientes
    : clientes.filter(
        (c) =>
          currentUser.clientesIds?.includes(c.id) ||
          c.usuariosClientesIds?.includes(currentUser.id) ||
          c.gestoresIds?.includes(currentUser.id) ||
          c.criadoresIds?.includes(currentUser.id)
      );

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
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-vulpis-laranja" />
            <h2 className="font-miv-title text-xl tracking-wide">
              Painel Administrador — Cadastro de Clientes &amp; Empresas
            </h2>
          </div>
          <p className="text-xs opacity-75 mt-1">
            Cadastre o cliente e a(s) empresa(s) dele, defina e-mail e senha de acesso e dispare o e-mail de validação ou redefinição.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Cliente &amp; Empresa</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs opacity-60">
            <Lock className="w-3.5 h-3.5" />
            <span>Apenas Administradores gerenciam cadastros de empresas e clientes</span>
          </div>
        )}
      </div>

      {/* MODAL / FORMULÁRIO DE CADASTRO E EDIÇÃO DE EMPRESA + CLIENTE */}
      {isCreating && (
        <div
          className={`p-6 rounded-3xl border shadow-2xl space-y-5 animate-in fade-in-50 ${
            isClaro
              ? 'bg-white border-vulpis-laranja/60 text-vulpis-grafite'
              : 'bg-vulpis-grafite border-vulpis-laranja/60 text-vulpis-bege'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-vulpis-cinza/20">
            <div>
              <h3 className="font-miv-title text-lg">
                {editingClient
                  ? `Editar Empresa: ${editingClient.nome}`
                  : '1. Cadastrar Empresa & E-mail de Acesso do Cliente'}
              </h3>
              <p className="text-xs opacity-70">
                {editingClient
                  ? 'Edite os dados da empresa ou utilize a opção de excluir empresa.'
                  : 'Cadastre os dados da empresa e já valide o e-mail e senha do cliente para que o acesso chegue para ele imediatamente.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={resetForm} className="p-1 rounded-lg opacity-70 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Etapa A: Dados da Empresa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Nome da Empresa / Marca <span className="text-vulpis-laranja">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: TechVanguard Brasil"
                  className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  CNPJ (opcional):
                </label>
                <input
                  type="text"
                  value={formData.cnpj || ''}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className={`w-full text-xs p-3 rounded-2xl border font-mono focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Segmento / Nicho:
                </label>
                <input
                  type="text"
                  value={formData.segmento || ''}
                  onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                  placeholder="Ex: Tecnologia, Saúde, Varejo..."
                  className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Responsável / Contato na Empresa:
                </label>
                <input
                  type="text"
                  value={formData.responsavelContato || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, responsavelContato: e.target.value })
                  }
                  placeholder="Ex: João Silva"
                  className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Cor da Empresa no Calendário:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="w-11 h-11 rounded-2xl border cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className={`w-full text-xs p-3 rounded-2xl border font-mono uppercase ${
                      isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Logo da Empresa (URL ou Upload):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className={`flex-1 text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                      isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                    }`}
                  />
                  <label className="p-3 rounded-2xl bg-vulpis-azul text-white cursor-pointer hover:bg-vulpis-azul/90">
                    <Upload className="w-4 h-4" />
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Redes */}
            <div>
              <label className="block text-xs font-semibold mb-2">Redes Sociais da Empresa:</label>
              <div className="flex flex-wrap gap-2">
                {availableRedes.map((r) => {
                  const isSelected = formData.redes.includes(r);
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => {
                        const newRedes = isSelected
                          ? formData.redes.filter((x) => x !== r)
                          : [...formData.redes, r];
                        setFormData({ ...formData, redes: newRedes });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                        isSelected
                          ? 'bg-vulpis-azul text-white border-vulpis-azul'
                          : isClaro
                          ? 'bg-vulpis-bege text-vulpis-grafite border-vulpis-grafite/20'
                          : 'bg-[#121212] text-vulpis-bege border-vulpis-cinza'
                      }`}
                    >
                      <SocialIcon rede={r} size={14} />
                      <span>{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ETAPA B: E-MAIL E SENHA DE LOGIN DIRETO DA EMPRESA & LINK DE ACESSO EXCLUSIVO */}
            <div
              className={`p-5 rounded-2xl border-2 space-y-4 ${
                isClaro
                  ? 'bg-vulpis-bege/35 border-vulpis-laranja/50'
                  : 'bg-[#121212] border-vulpis-laranja/50'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-vulpis-laranja" />
                  <span className="font-miv-title text-sm text-vulpis-laranja">
                    Credenciais de Login da Empresa &amp; Link de Acesso Exclusivo à Agenda
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-vulpis-laranja/15 text-vulpis-grafite">
                  Acesso Restrito Somente à Agenda
                </span>
              </div>

              <p className="text-xs opacity-75">
                Ao cadastrar a empresa, o e-mail e a senha cadastrados aqui são o login direto da empresa. 
                Não é necessário criar um usuário à parte. O cliente terá acesso exclusivo à sua própria agenda e aos seus roteiros.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    E-mail de Login da Empresa <span className="text-vulpis-laranja">*</span>:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formData.emailAcesso}
                      onChange={(e) => setFormData({ ...formData, emailAcesso: e.target.value })}
                      placeholder="cliente@empresa.com.br"
                      className={`w-full pl-9 pr-3 py-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-vulpis-azul ${
                        isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-vulpis-grafite border-vulpis-cinza'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Senha de Acesso da Empresa <span className="text-vulpis-laranja">*</span>:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      required
                      value={formData.senhaAcesso}
                      onChange={(e) => setFormData({ ...formData, senhaAcesso: e.target.value })}
                      placeholder="Defina a senha de acesso"
                      className={`w-full pl-9 pr-10 py-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-vulpis-azul ${
                        isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-vulpis-grafite border-vulpis-cinza'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
                    >
                      {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Link Direto para Área de Login do Portal */}
              <div
                className={`p-3.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                  isClaro ? 'bg-white border-vulpis-grafite/15 shadow-sm' : 'bg-vulpis-grafite border-vulpis-cinza/30'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <ExternalLink className="w-4 h-4 text-vulpis-azul flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-[11px] text-vulpis-azul block">
                      Link Direto para Área de Login do Portal:
                    </span>
                    <span className="text-[10px] opacity-75 font-mono truncate block">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/?empresa={editingClient?.id || 'nova-empresa'}
                    </span>
                    <span className="text-[10px] opacity-60 block">
                      Ao abrir este link, o cliente acessa a tela de login exclusiva da sua empresa para preencher suas credenciais.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    const link = `${origin}/?empresa=${editingClient?.id || 'nova-empresa'}`;
                    handleCopyText(link, 'Link direto para área de login copiado!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link de Login</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-vulpis-cinza/15">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-[#1E9E5A]">
                  <input
                    type="checkbox"
                    checked={sendEmailImmediately}
                    onChange={(e) => setSendEmailImmediately(e.target.checked)}
                    className="rounded accent-[#1E9E5A]"
                  />
                  <span>
                    Disparar e-mail de acesso com o link e credenciais imediatamente ao salvar
                  </span>
                </label>
                <span className="text-[11px] opacity-70">
                  Clientes que gerenciam várias empresas devem usar o e-mail de cada empresa para ver seu respectivo painel.
                </span>
              </div>
            </div>

            {/* Briefing Fixo */}
            <div>
              <label className="block text-xs font-semibold mb-1">
                Briefing Fixo (Tom de voz, regras da empresa, o que evitar):
              </label>
              <textarea
                rows={3}
                value={formData.briefing}
                onChange={(e) => setFormData({ ...formData, briefing: e.target.value })}
                placeholder="Descreva o tom de voz da marca, regras inegociáveis e termos proibidos..."
                className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                  isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-vulpis-cinza/20">
              {editingClient ? (
                <button
                  type="button"
                  onClick={() => handleOpenDeleteModal(editingClient)}
                  className="px-4 py-2 rounded-xl bg-[#D93A2B]/15 hover:bg-[#D93A2B] text-[#D93A2B] hover:text-white border border-[#D93A2B]/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Empresa</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {editingClient
                      ? 'Salvar Alterações da Empresa & Acesso'
                      : sendEmailImmediately
                      ? 'Cadastrar Empresa & Disparar E-mail de Acesso'
                      : 'Cadastrar Empresa & Salvar Acesso'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO EM DUAS ETAPAS PARA EXCLUIR EMPRESA (DIGITAR "excluir") */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
              isClaro
                ? 'bg-white border-[#D93A2B]/40 text-vulpis-grafite'
                : 'bg-vulpis-grafite border-[#D93A2B]/40 text-vulpis-bege'
            }`}
          >
            <div className="p-5 bg-[#D93A2B] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-90 block">
                    Confirmação em Duas Etapas
                  </span>
                  <h3 className="font-miv-title text-base">Excluir Empresa</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeletingClient(null);
                  setDeleteConfirmText('');
                }}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteClient} className="p-6 space-y-4 text-xs">
              <div
                className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  isClaro
                    ? 'bg-[#D93A2B]/10 border-[#D93A2B]/30'
                    : 'bg-[#121212] border-[#D93A2B]/40'
                }`}
              >
                <img
                  src={deletingClient.logoUrl}
                  alt={deletingClient.nome}
                  className="w-11 h-11 rounded-xl object-cover border border-white/20 flex-shrink-0"
                />
                <div>
                  <span className="font-bold text-sm block text-[#D93A2B]">
                    {deletingClient.nome}
                  </span>
                  <span className="text-[11px] opacity-80">
                    Esta ação removerá a empresa e todas as postagens vinculadas a ela.
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5">
                  Etapa 2: Para confirmar a exclusão, escreva{' '}
                  <span className="px-1.5 py-0.5 rounded bg-[#D93A2B]/15 text-[#D93A2B] font-mono">
                    excluir
                  </span>{' '}
                  no campo abaixo:
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='Digite "excluir" para habilitar o botão'
                  className={`w-full p-3 rounded-xl border font-mono text-xs focus:outline-none focus:border-[#D93A2B] ${
                    isClaro
                      ? 'bg-vulpis-bege/20 border-vulpis-grafite/25 text-vulpis-grafite'
                      : 'bg-[#121212] border-vulpis-cinza text-vulpis-bege'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingClient(null);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 rounded-xl font-semibold opacity-70 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isDeletingClient || deleteConfirmText.trim().toLowerCase() !== 'excluir'
                  }
                  className="px-5 py-2.5 rounded-xl bg-[#D93A2B] hover:bg-[#b82d20] text-white font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingClient ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO: CADASTRAR CLIENTE OU GERENCIAR EMPRESAS DO CLIENTE */}
      {quickUserCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div
            className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
              isClaro
                ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
            }`}
          >
            <div
              className={`p-4 sm:px-6 border-b flex items-center justify-between ${
                isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  style={{ backgroundColor: quickUserCompany.cor }}
                  className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold"
                >
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-miv-title text-base">
                    Validar Cliente — {quickUserCompany.nome}
                  </h3>
                  <p className="text-[11px] opacity-70">
                    Cadastre o e-mail e senha do cliente ou associe a múltiplas empresas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickUserCompany(null)}
                className="p-1 rounded-lg opacity-70 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickUserMode('novo')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                    quickUserMode === 'novo'
                      ? 'bg-vulpis-laranja text-vulpis-grafite border-vulpis-laranja'
                      : 'border-vulpis-cinza/30 opacity-70'
                  }`}
                >
                  + Cadastrar Novo Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setQuickUserMode('existente')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                    quickUserMode === 'existente'
                      ? 'bg-vulpis-laranja text-vulpis-grafite border-vulpis-laranja'
                      : 'border-vulpis-cinza/30 opacity-70'
                  }`}
                >
                  Vincular Cliente Existente ({usuariosClientes.length})
                </button>
              </div>

              {quickUserMode === 'novo' ? (
                <form onSubmit={handleCreateQuickUserForCompany} className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1">Nome do Cliente *:</label>
                    <input
                      type="text"
                      required
                      placeholder={`Ex: Roberto (${quickUserCompany.nome})`}
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border ${
                        isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">E-mail de Acesso do Cliente *:</label>
                    <input
                      type="email"
                      required
                      placeholder="cliente@empresa.com.br"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border font-mono ${
                        isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Senha Criada pelo Admin *:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: mudar123"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border font-mono ${
                          isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Perfil de Acesso:</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as PerfilUsuario)}
                        className={`w-full p-2.5 rounded-xl border ${
                          isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                        }`}
                      >
                        <option value="CLIENTE">Cliente (Comentar, Ajustes e Aprovar)</option>
                        <option value="GESTOR">Gestor Interno</option>
                        <option value="CRIADOR">Criador Interno</option>
                      </select>
                    </div>
                  </div>

                  {/* Seleção de múltiplas empresas caso o cliente seja responsável por mais de uma */}
                  <div>
                    <label className="block font-semibold mb-1.5">
                      Empresas que este cliente terá permissão para visualizar:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-1">
                      {clientes.map((comp) => {
                        const isPrimary = comp.id === quickUserCompany.id;
                        const isChecked =
                          isPrimary || newUserSelectedCompanies.includes(comp.id);
                        return (
                          <label
                            key={comp.id}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] cursor-pointer ${
                              isChecked
                                ? 'bg-vulpis-azul/15 border-vulpis-azul font-bold'
                                : 'border-vulpis-cinza/30 opacity-75'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isPrimary}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...newUserSelectedCompanies, comp.id]
                                  : newUserSelectedCompanies.filter((id) => id !== comp.id);
                                setNewUserSelectedCompanies(next);
                              }}
                              className="rounded accent-vulpis-laranja"
                            />
                            <span className="truncate">{comp.nome}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1E9E5A]/15 border border-[#1E9E5A]/30 text-[11px] cursor-pointer font-semibold text-[#1E9E5A]">
                    <input
                      type="checkbox"
                      checked={quickSendEmail}
                      onChange={(e) => setQuickSendEmail(e.target.checked)}
                      className="rounded accent-[#1E9E5A]"
                    />
                    <span>
                      Enviar e-mail de acesso imediatamente para o cliente após cadastrar
                    </span>
                  </label>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setQuickUserCompany(null)}
                      className="px-4 py-2 font-semibold opacity-70 hover:opacity-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingQuickUser || !newUserName.trim() || !newUserEmail.trim()}
                      className="px-5 py-2 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite font-bold shadow-md flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>
                        {isSavingQuickUser
                          ? 'Salvando...'
                          : quickSendEmail
                          ? 'Cadastrar & Enviar E-mail de Acesso'
                          : 'Cadastrar Cliente'}
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  <p className="text-[11px] opacity-75 mb-2">
                    Marque os clientes já cadastrados que também podem visualizar a agenda de{' '}
                    <strong>{quickUserCompany.nome}</strong>:
                  </p>
                  {usuarios.filter((u) => u.perfil !== 'ADMINISTRADOR').length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed text-center opacity-70">
                      Nenhum cliente cadastrado ainda. Use a aba &ldquo;+ Cadastrar Novo Cliente&rdquo; ao lado.
                    </div>
                  ) : (
                    usuarios
                      .filter((u) => u.perfil !== 'ADMINISTRADOR')
                      .map((u) => {
                        const currentCompany =
                          clientes.find((c) => c.id === quickUserCompany.id) || quickUserCompany;
                        const isAssociated =
                          currentCompany.usuariosClientesIds?.includes(u.id) ||
                          currentCompany.gestoresIds?.includes(u.id) ||
                          currentCompany.criadoresIds?.includes(u.id) ||
                          u.clientesIds?.includes(currentCompany.id);

                        return (
                          <label
                            key={u.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isAssociated
                                ? 'bg-vulpis-azul/15 border-vulpis-azul'
                                : isClaro
                                ? 'bg-vulpis-bege/20 border-vulpis-grafite/15'
                                : 'bg-[#121212] border-vulpis-cinza'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={Boolean(isAssociated)}
                                onChange={() =>
                                  handleToggleExistingUserAssociation(currentCompany, u)
                                }
                                className="rounded accent-vulpis-laranja"
                              />
                              <div>
                                <span className="font-bold block">{u.nome}</span>
                                <span className="text-[10px] opacity-60 font-mono">
                                  {u.email} • {u.clientesIds?.length || 0} empresa(s)
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1E9E5A] text-white">
                              {u.perfil}
                            </span>
                          </label>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Empresas de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {visibleClientes.length === 0 ? (
          <div
            className={`col-span-full p-12 text-center rounded-3xl border border-dashed ${
              isClaro ? 'bg-white/70 border-vulpis-grafite/20' : 'bg-vulpis-grafite/40 border-vulpis-cinza/30'
            }`}
          >
            <Building2 className="w-12 h-12 text-vulpis-laranja opacity-40 mx-auto mb-3" />
            <h3 className="font-miv-title text-base sm:text-lg">Nenhuma empresa cadastrada</h3>
            <p className="text-xs opacity-70 max-w-md mx-auto mt-1 mb-4">
              Todas as empresas e perfis foram removidos. Clique no botão abaixo para cadastrar a primeira empresa e gerar as credenciais de acesso do cliente.
            </p>
            {isAdmin && (
              <button
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeira Empresa</span>
              </button>
            )}
          </div>
        ) : (
          visibleClientes.map((c) => {
          const assignedClientUsers = usuarios.filter(
            (u) =>
              u.perfil === 'CLIENTE' &&
              (c.usuariosClientesIds?.includes(u.id) || u.clientesIds?.includes(c.id))
          );

          return (
            <div
              key={c.id}
              className={`p-6 rounded-3xl border shadow-sm space-y-4 relative overflow-hidden transition-all flex flex-col justify-between ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/15'
                  : 'bg-vulpis-grafite border-vulpis-cinza/40'
              }`}
            >
              <div style={{ backgroundColor: c.cor }} className="absolute top-0 left-0 right-0 h-2" />

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={c.logoUrl}
                      alt={c.nome}
                      className="w-14 h-14 rounded-2xl object-cover border border-vulpis-cinza/30 bg-black/10"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-miv-title text-base">{c.nome}</h3>
                        {c.segmento && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-vulpis-azul/15 text-vulpis-azul">
                            {c.segmento}
                          </span>
                        )}
                      </div>
                      {c.cnpj && (
                        <span className="text-[10px] font-mono opacity-60 block">
                          CNPJ: {c.cnpj}
                        </span>
                      )}
                      {c.responsavelContato && (
                        <span className="text-[10px] opacity-75 block">
                          Responsável: <strong>{c.responsavelContato}</strong>
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        {c.redes.map((r) => (
                          <span key={r} className="text-vulpis-azul" title={r}>
                            <SocialIcon rede={r} size={14} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(c)}
                        className="px-3 py-1.5 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
                        title="Editar Dados da Empresa e Credenciais de Acesso"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(c)}
                        className="p-1.5 rounded-xl border border-[#D93A2B]/30 text-[#D93A2B] hover:bg-[#D93A2B] hover:text-white transition-colors"
                        title="Excluir Empresa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* DADOS DE ACESSO & LOGIN DIRETO DA EMPRESA */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isClaro
                      ? 'bg-vulpis-bege/40 border-vulpis-grafite/15'
                      : 'bg-[#121212] border-vulpis-cinza/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-vulpis-laranja">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Credenciais de Acesso da Empresa</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E9E5A]/15 text-[#1E9E5A] border border-[#1E9E5A]/30">
                      Acesso restrito à sua agenda
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* E-mail de Login */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold opacity-60 block">E-mail de Login:</span>
                        <span className="font-mono text-xs font-bold truncate block">
                          {c.emailAcesso || 'Não cadastrado'}
                        </span>
                      </div>
                      {c.emailAcesso && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(c.emailAcesso!, `E-mail de ${c.nome} copiado!`)}
                          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5"
                          title="Copiar e-mail"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Senha de Acesso */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold opacity-60 block">Senha de Acesso:</span>
                        <span className="font-mono text-xs font-bold tracking-wider truncate block">
                          {showPasswordMap[c.id] ? c.senhaAcesso || '123456' : '••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleShowPassword(c.id)}
                          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5"
                          title={showPasswordMap[c.id] ? 'Ocultar senha' : 'Ver senha'}
                        >
                          {showPasswordMap[c.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyText(c.senhaAcesso || '123456', `Senha de ${c.nome} copiada!`)}
                          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5"
                          title="Copiar senha"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Link Direto para Área de Login do Portal */}
                  <div
                    className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                      isClaro ? 'bg-white border-vulpis-grafite/15 shadow-sm' : 'bg-vulpis-grafite border-vulpis-cinza/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <LinkIcon className="w-4 h-4 text-vulpis-azul flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-vulpis-azul tracking-wide block">
                          Link Direto para Área de Login do Portal:
                        </span>
                        <span className="font-mono text-xs truncate block font-semibold">
                          {getCompanyAccessLink(c)}
                        </span>
                        <span className="text-[10px] opacity-60 block">
                          O cliente preenche suas credenciais para acessar sua agenda.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCopyText(getCompanyAccessLink(c), `Link direto de login de ${c.nome} copiado!`)}
                        className="px-3 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all shadow-sm"
                        title="Copiar link direto para o cliente preencher suas credenciais"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link de Login</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const link = getCompanyAccessLink(c);
                          window.open(link, '_blank');
                        }}
                        className="p-1.5 rounded-xl border border-vulpis-cinza/30 hover:bg-vulpis-cinza/20 text-xs font-bold transition-all"
                        title="Abrir tela de login da empresa em nova aba"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ações de Acesso: Copiar Tudo, Abrir Painel, Enviar E-mail */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-vulpis-cinza/15">
                    <button
                      type="button"
                      onClick={() => handleCopyFullCredentials(c)}
                      className="px-3 py-1.5 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      title="Copiar mensagem com Link, E-mail e Senha para enviar no WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copiar Acesso Completo (WhatsApp)</span>
                    </button>

                    {isAdmin && c.emailAcesso && onSendAccessEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          const userForCompany = usuarios.find(
                            (u) => u.email.trim().toLowerCase() === c.emailAcesso?.trim().toLowerCase()
                          );
                          if (userForCompany) {
                            onSendAccessEmail(userForCompany.id, c.senhaAcesso);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#1E9E5A]/15 hover:bg-[#1E9E5A] text-[#1E9E5A] hover:text-white border border-[#1E9E5A]/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                        title="Disparar e-mail com dados de acesso para o cliente"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Enviar E-mail</span>
                      </button>
                    )}

                    {onEnterPortalAsUser && (
                      <button
                        type="button"
                        onClick={() => {
                          const clientUser = usuarios.find(
                            (u) =>
                              u.email.trim().toLowerCase() === c.emailAcesso?.trim().toLowerCase() ||
                              u.clientesIds?.includes(c.id)
                          ) || {
                            id: 'user-cli-' + c.id,
                            nome: c.responsavelContato || c.nome,
                            email: c.emailAcesso || 'cliente@vulpis.com.br',
                            senha: c.senhaAcesso || '123456',
                            perfil: 'CLIENTE' as const,
                            clientesIds: [c.id],
                            ativo: true,
                            criadoEm: c.criadoEm || new Date().toISOString()
                          };
                          onEnterPortalAsUser(clientUser);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-[11px] font-bold flex items-center gap-1.5 ml-auto transition-all shadow-sm"
                        title="Ver como o cliente visualiza sua agenda"
                      >
                        <span>Abrir Agenda do Cliente</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Briefing Fixo Box */}
                <div
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    isClaro
                      ? 'bg-vulpis-bege/20 border-vulpis-grafite/10'
                      : 'bg-[#121212]/60 border-vulpis-cinza/30'
                  }`}
                >
                  <span className="font-bold block uppercase tracking-wider text-[10px] text-vulpis-azul">
                    Briefing Fixo da Marca:
                  </span>
                  <p className="leading-relaxed line-clamp-2 opacity-90">
                    {c.briefing || 'Nenhum briefing fixo cadastrado.'}
                  </p>
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* MODAL DE SUCESSO: LINK DIRETO PARA A ÁREA DE LOGIN GERADO */}
      {generatedAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl space-y-5 ${
              isClaro
                ? 'bg-white text-vulpis-grafite border-vulpis-laranja/50'
                : 'bg-[#121212] text-vulpis-bege border-vulpis-laranja/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-vulpis-cinza/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1E9E5A]/15 border border-[#1E9E5A]/30 flex items-center justify-center text-[#1E9E5A]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-miv-title text-lg leading-tight">
                    {generatedAccessModal.isNew
                      ? 'Empresa & Usuário Gerados com Sucesso!'
                      : 'Dados de Acesso Atualizados!'}
                  </h3>
                  <p className="text-xs opacity-75 mt-0.5">
                    Link direto gerado para a área de login exclusiva do cliente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedAccessModal(null)}
                className="p-1.5 rounded-xl opacity-60 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dados da Empresa & Responsável */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-vulpis-grafite/50 border-vulpis-cinza/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={generatedAccessModal.client.logoUrl}
                  alt={generatedAccessModal.client.nome}
                  className="w-11 h-11 rounded-xl object-cover border bg-white flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{generatedAccessModal.client.nome}</div>
                  <div className="text-xs opacity-75">
                    Responsável: <strong>{generatedAccessModal.client.responsavelContato || 'Não informado'}</strong>
                  </div>
                </div>
              </div>

              {/* Caixa de Link Direto de Login */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-black/40 border border-vulpis-azul/40 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-vulpis-azul flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Link Direto para a Área de Login do Portal:
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-vulpis-azul/15 text-vulpis-azul">
                    Pronto para Enviar
                  </span>
                </div>
                <div className="font-mono text-xs select-all break-all p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-vulpis-cinza/20 font-bold">
                  {generatedAccessModal.directLink}
                </div>
                <p className="text-[10px] opacity-70">
                  Ao abrir este link, o cliente acessa a tela de login exclusiva da sua empresa para preencher suas credenciais.
                </p>
              </div>

              {/* Credenciais para o cliente preencher */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-vulpis-cinza/20">
                  <span className="text-[10px] uppercase font-bold opacity-60 block">E-mail de Login:</span>
                  <span className="font-mono font-bold truncate block">{generatedAccessModal.email || 'Não informado'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-vulpis-cinza/20">
                  <span className="text-[10px] uppercase font-bold opacity-60 block">Senha de Acesso:</span>
                  <span className="font-mono font-bold truncate block">{generatedAccessModal.senha}</span>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCopyText(
                      generatedAccessModal.directLink,
                      'Link direto para área de login copiado!'
                    );
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar Link Direto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCopyFullCredentials(generatedAccessModal.client);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all font-extrabold"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Copiar Acesso para WhatsApp</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.open(generatedAccessModal.directLink, '_blank');
                  }}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all border border-vulpis-azul/40 text-vulpis-azul hover:bg-vulpis-azul/10 flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Testar Tela de Login do Cliente</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGeneratedAccessModal(null)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold opacity-75 hover:opacity-100 transition-all border border-vulpis-cinza/30"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
