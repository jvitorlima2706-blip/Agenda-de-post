import React, { useState, useEffect } from 'react';
import { Postagem, Cliente, Usuario, Notificacao, LogAuditoria, MidiaItem, Comentario } from './types';
import { firestoreService } from './services/firestoreService';
import { ToastProvider, useToast } from './components/common/Toast';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { CalendarView } from './components/calendar/CalendarView';
import { ClientPortalView } from './components/portal/ClientPortalView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ClientsManager } from './components/clients/ClientsManager';
import { UsersManager } from './components/users/UsersManager';
import { ExportModal } from './components/export/ExportModal';
import { PostDetailModal } from './components/post/PostDetailModal';
import { NewPostModal } from './components/post/NewPostModal';
import { PostScriptsView } from './components/scripts/PostScriptsView';
import { LoginScreen } from './components/auth/LoginScreen';
import { EmailPreviewModal, DispatchedEmailData } from './components/common/EmailPreviewModal';
import { Calendar, LayoutDashboard, Briefcase, Users, FileDown, ExternalLink, FileText } from 'lucide-react';

function AppContent() {
  const toast = useToast();

  const [posts, setPosts] = useState<Postagem[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [logs, setLogs] = useState<LogAuditoria[]>([]);

  // Tema padrão: 'claro' conforme seção 2.3 do MIV (Fundo bege #F9E8CE)
  const [tema, setTema] = useState<'claro' | 'escuro'>(() => {
    const saved = localStorage.getItem('vulpis_theme');
    return (saved === 'escuro' || saved === 'claro') ? saved : 'claro';
  });

  const toggleTema = () => {
    const next = tema === 'claro' ? 'escuro' : 'claro';
    setTema(next);
    localStorage.setItem('vulpis_theme', next);
    if (currentUser) {
      firestoreService.updateUser(currentUser.id, { tema: next }, currentUser).catch(() => {});
    }
  };

  // Apenas 1 usuário inicial (Administrador)
  const [currentUser, setCurrentUser] = useState<Usuario>(() => {
    return {
      id: 'user-admin',
      nome: 'Carlos Silva (Administrador)',
      email: 'j.vitorlima2706@gmail.com',
      senha: 'admin123',
      perfil: 'ADMINISTRADOR',
      clientesIds: [],
      ativo: true,
      tema: 'claro',
      criadoEm: '2026-09-01T10:00:00'
    };
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('clientes');
  const [selectedClienteId, setSelectedClienteId] = useState<string>('todos');
  const [isIsolatedPortalMode, setIsIsolatedPortalMode] = useState<boolean>(false);

  // Detecção de link de acesso exclusivo do cliente via URL (?empresa=... ou ?cliente=...)
  const [dedicatedCompanyId, setDedicatedCompanyId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('empresa') || params.get('cliente') || '';
    }
    return '';
  });

  // Estado da Tela de Validação / Login e do Modal de E-mail Enviado
  const [isShowingLoginScreen, setIsShowingLoginScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('empresa') ||
        params.get('cliente') ||
        params.get('email') ||
        params.get('login')
      ) {
        return true;
      }
    }
    return false;
  });

  const [loginPrefillEmail, setLoginPrefillEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || '';
    }
    return '';
  });
  const [loginPrefillResetCode, setLoginPrefillResetCode] = useState<string>('');
  const [dispatchedEmailModal, setDispatchedEmailModal] = useState<DispatchedEmailData | null>(null);

  const handleSelectUser = (user: Usuario) => {
    setCurrentUser(user);
    setIsShowingLoginScreen(false);
    if (user.perfil !== 'ADMINISTRADOR') {
      const firstClientId = user.clientesIds?.[0] || 'todos';
      setSelectedClienteId(firstClientId);
    } else {
      setSelectedClienteId('todos');
    }
    if (user.perfil === 'CLIENTE') {
      setActiveTab('portal');
    }
  };

  const handleRegisterClientSelfUser = async (
    clienteId: string,
    nome: string,
    email: string,
    senha: string,
    cargo?: string
  ): Promise<Usuario> => {
    const createdUser = await firestoreService.registerClientSelfUser(
      clienteId,
      nome,
      email,
      senha,
      cargo
    );
    handleSelectUser(createdUser);
    toast.success(
      `Bem-vindo(a), ${createdUser.nome}!`,
      'Seu usuário foi criado com sucesso. Você tem acesso restrito exclusivamente à agenda da sua empresa.'
    );
    return createdUser;
  };

  const handleEnterPortalAsUser = (user: Usuario) => {
    setCurrentUser(user);
    setIsShowingLoginScreen(false);
    const firstClientId = user.clientesIds?.[0] || 'todos';
    setSelectedClienteId(firstClientId);
    setActiveTab('portal');
    toast.info(
      `Painel do Cliente: ${user.nome}`,
      'Exibindo a agenda da(s) empresa(s) liberada(s) para este cliente.'
    );
  };

  const handleAuthenticateWithCredentials = (email: string, senha: string) => {
    const validatedUser = firestoreService.authenticateUser(email, senha);
    handleSelectUser(validatedUser);
    toast.success(
      `Bem-vindo(a), ${validatedUser.nome}!`,
      validatedUser.perfil === 'CLIENTE'
        ? 'Acesso validado! Exibindo a agenda da sua empresa.'
        : 'Acesso validado com sucesso.'
    );
  };

  const handleRequestPasswordResetOnLogin = async (email: string) => {
    const res = await firestoreService.sendPasswordResetEmail(email);
    toast.info('E-mail de Redefinição Enviado!', `Código enviado para ${res.user.email}`);
    return { codigo: res.codigo, email: res.user.email };
  };

  const handleConfirmPasswordResetOnLogin = async (
    email: string,
    codigo: string,
    novaSenha: string
  ) => {
    await firestoreService.resetPasswordWithCode(email, codigo, novaSenha);
    toast.success('Senha Redefinida!', 'Sua nova senha já está ativa para acesso.');
  };

  // TESTES DE SEGURANÇA: Garante que o usuário CLIENTE tenha estritamente suas permissões atribuídas
  useEffect(() => {
    if (currentUser.perfil === 'CLIENTE') {
      const allowedTabs: ActiveTab[] = ['portal', 'roteiros', 'exportar'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('portal');
      }
      if (currentUser.clientesIds && currentUser.clientesIds.length > 0) {
        if (selectedClienteId === 'todos' || !currentUser.clientesIds.includes(selectedClienteId)) {
          setSelectedClienteId(currentUser.clientesIds[0]);
        }
      }
    }
  }, [currentUser, activeTab, selectedClienteId]);

  // Modals
  const [selectedPost, setSelectedPost] = useState<Postagem | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostDate, setNewPostDate] = useState<string | undefined>(undefined);

  // Sincronização em tempo real com Firestore
  useEffect(() => {
    const unsubPosts = firestoreService.onPosts((data) => {
      setPosts(data);
      setSelectedPost((prev) => (prev ? data.find((p) => p.id === prev.id) || null : null));
    });

    const unsubClients = firestoreService.onClients((data) => setClientes(data));
    const unsubUsers = firestoreService.onUsers((data) => {
      setUsuarios(data);
      setCurrentUser((prev) => {
        const found = data.find((u) => u.id === prev.id);
        if (found && found.tema && found.tema !== tema) {
          setTema(found.tema);
        }
        return found || prev;
      });
    });

    const unsubNotifs = firestoreService.onNotifs((data) => setNotificacoes(data));
    const unsubLogs = firestoreService.onLogs((data) => setLogs(data));

    return () => {
      unsubPosts();
      unsubClients();
      unsubUsers();
      unsubNotifs();
      unsubLogs();
    };
  }, []);

  // Detecção e sincronização dinâmica de parâmetros de URL (?empresa=...&email=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const empresaParam = params.get('empresa') || params.get('cliente');
      const emailParam = params.get('email');
      if (empresaParam) {
        setDedicatedCompanyId(empresaParam);
        setSelectedClienteId(empresaParam);
        setIsShowingLoginScreen(true);
      }
      if (emailParam) {
        setLoginPrefillEmail(emailParam);
        setIsShowingLoginScreen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Post Actions
  const handleCreatePost = async (postData: Omit<Postagem, 'id' | 'criadoEm' | 'atualizadoEm'>) => {
    try {
      const created = await firestoreService.createPost(postData, currentUser);
      toast.success('Postagem Criada!', `"${created.titulo}" foi adicionada ao cronograma.`);
    } catch (err: any) {
      toast.error('Erro ao criar postagem', err.message);
      throw err;
    }
  };

  const handleUpdatePost = async (id: string, updates: Partial<Postagem>) => {
    try {
      await firestoreService.updatePost(id, updates, currentUser);
      toast.success('Postagem Atualizada', 'As alterações foram salvas com sucesso.');
    } catch (err: any) {
      toast.error('Não foi possível salvar', err.message);
      throw err;
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await firestoreService.deletePost(id, currentUser);
      if (selectedPost?.id === id) {
        setSelectedPost(null);
      }
      toast.info('Roteiro Excluído', 'O roteiro/postagem foi excluído com sucesso.');
    } catch (err: any) {
      toast.error('Erro ao excluir roteiro', err.message);
      throw err;
    }
  };

  const handleMovePostDate = async (postId: string, newDate: string) => {
    try {
      await firestoreService.updatePost(postId, { dataPublicacao: newDate }, currentUser);
      toast.success('Post Reagendado!', 'A nova data foi atualizada no calendário.');
    } catch (err: any) {
      toast.error('Erro ao reagendar', err.message);
      throw err;
    }
  };

  const handleSendForApproval = async (id: string) => {
    try {
      await firestoreService.sendForApproval(id, currentUser);
      toast.success('Enviado para Aprovação!', 'O post está aguardando aprovação.');
    } catch (err: any) {
      toast.error('Erro ao enviar', err.message);
      throw err;
    }
  };

  const handleApprove = async (id: string, nota?: number, obs?: string) => {
    try {
      await firestoreService.approvePost(id, nota, currentUser, obs);
      toast.success('Postagem Aprovada!', 'A postagem foi aprovada com sucesso.');
    } catch (err: any) {
      toast.error('Erro ao aprovar', err.message);
      throw err;
    }
  };

  const handleRequestAdjustments = async (id: string, nota: number | undefined, obs: string) => {
    try {
      await firestoreService.requestAdjustments(id, nota, obs, currentUser);
      toast.info('Ajustes Solicitados', 'Os apontamentos foram registrados na postagem.');
    } catch (err: any) {
      toast.error('Erro ao solicitar ajustes', err.message);
      throw err;
    }
  };

  const handleReopen = async (id: string, motivo: string) => {
    try {
      await firestoreService.reopenApprovedPost(id, motivo, currentUser);
      toast.info('Postagem Reaberta', 'A postagem retornou para ajustes com o motivo registrado.');
    } catch (err: any) {
      toast.error('Erro ao reabrir', err.message);
      throw err;
    }
  };

  const handleAddComment = async (postId: string, commentData: Omit<Comentario, 'id' | 'resolvido' | 'criadoEm'>) => {
    try {
      await firestoreService.addComment(postId, commentData, currentUser);
      toast.success('Comentário Registrado', 'Seu apontamento foi inserido na postagem.');
    } catch (err: any) {
      toast.error('Erro ao comentar', err.message);
      throw err;
    }
  };

  const handleResolveComment = async (postId: string, commentId: string, resposta?: string) => {
    try {
      await firestoreService.resolveComment(postId, commentId, currentUser, resposta);
      toast.success('Ajuste Resolvido', resposta ? 'Resposta registrada.' : undefined);
    } catch (err: any) {
      toast.error('Erro ao resolver', err.message);
      throw err;
    }
  };

  const handleUnresolveComment = async (postId: string, commentId: string) => {
    try {
      await firestoreService.unresolveComment(postId, commentId, currentUser);
    } catch (err: any) {
      toast.error('Erro ao alterar status do comentário', err.message);
    }
  };

  const handleCreateNewVersion = async (
    postId: string,
    midias: MidiaItem[],
    capaUrl?: string,
    linkExterno?: string,
    obs?: string
  ) => {
    try {
      const versao = await firestoreService.createNewVersion(postId, midias, capaUrl, linkExterno, obs, currentUser);
      toast.success(`Versão V${versao.numero} Criada!`, 'O novo pacote de mídia foi vinculado.');
    } catch (err: any) {
      toast.error('Erro ao criar versão', err.message);
      throw err;
    }
  };

  // Client Actions
  const handleCreateClient = async (clientData: Omit<Cliente, 'id'>): Promise<Cliente> => {
    try {
      const created = await firestoreService.createClient(clientData, currentUser);
      toast.success('Empresa Cadastrada!', `${clientData.nome} foi adicionada ao painel.`);
      return created;
    } catch (err: any) {
      toast.error('Erro ao cadastrar empresa', err.message);
      throw err;
    }
  };

  const handleUpdateClient = async (id: string, updates: Partial<Cliente>) => {
    try {
      await firestoreService.updateClient(id, updates, currentUser);
      toast.success('Empresa Atualizada', 'Diretrizes e vínculos atualizados.');
    } catch (err: any) {
      toast.error('Erro ao atualizar empresa', err.message);
      throw err;
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await firestoreService.deleteClient(id, currentUser);
      if (selectedClienteId === id) {
        setSelectedClienteId('todos');
      }
      toast.info('Empresa Excluída', 'A empresa e suas postagens foram removidas.');
    } catch (err: any) {
      toast.error('Erro ao excluir empresa', err.message);
      throw err;
    }
  };

  // User & Validation Email Actions
  const handleCreateUser = async (userData: Omit<Usuario, 'id' | 'criadoEm'>): Promise<Usuario> => {
    try {
      const created = await firestoreService.createUser(userData, currentUser);
      toast.success('Cliente / Usuário Cadastrado!', `${userData.nome} (${userData.email}) validado no sistema.`);
      return created;
    } catch (err: any) {
      toast.error('Erro ao criar usuário', err.message);
      throw err;
    }
  };

  const handleUpdateUser = async (id: string, updates: Partial<Usuario>) => {
    try {
      await firestoreService.updateUser(id, updates, currentUser);
      toast.success('Dados de Acesso Atualizados', 'Permissões e credenciais salvas.');
    } catch (err: any) {
      toast.error('Erro ao atualizar usuário', err.message);
      throw err;
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await firestoreService.deleteUser(id, currentUser);
      toast.info('Usuário Removido', 'O cadastro foi removido do sistema.');
    } catch (err: any) {
      toast.error('Erro ao remover usuário', err.message);
    }
  };

  const handleSendAccessEmail = async (userId: string, customPassword?: string) => {
    try {
      const res = await firestoreService.sendAccessEmail(userId, customPassword, currentUser);
      setDispatchedEmailModal({
        tipo: 'acesso',
        user: res.user,
        senhaDefinida: res.senhaDefinida,
        companies: res.companies,
        subject: res.subject,
        body: res.body,
        enviadoEm: res.enviadoEm
      });
      toast.success(
        'E-mail de Acesso Enviado!',
        `As credenciais foram enviadas para ${res.user.email}.`
      );
    } catch (err: any) {
      toast.error('Erro ao enviar e-mail de acesso', err.message);
    }
  };

  const handleSendPasswordResetEmail = async (emailOrUserId: string) => {
    try {
      const res = await firestoreService.sendPasswordResetEmail(emailOrUserId);
      setDispatchedEmailModal({
        tipo: 'redefinicao',
        user: res.user,
        codigoRecuperacao: res.codigo,
        companies: res.companies,
        subject: res.subject,
        body: res.body,
        enviadoEm: res.enviadoEm
      });
      toast.info(
        'E-mail de Redefinição Enviado!',
        `Código de validação enviado para ${res.user.email}.`
      );
    } catch (err: any) {
      toast.error('Erro ao enviar redefinição de senha', err.message);
    }
  };

  // Empresas visíveis conforme o perfil do usuário conectado
  const accessibleClientes =
    currentUser.perfil === 'ADMINISTRADOR'
      ? clientes
      : clientes.filter(
          (c) =>
            currentUser.clientesIds?.includes(c.id) ||
            c.usuariosClientesIds?.includes(currentUser.id) ||
            c.gestoresIds?.includes(currentUser.id) ||
            c.criadoresIds?.includes(currentUser.id)
        );

  const accessibleClientIdsSet = new Set(accessibleClientes.map((c) => c.id));

  const accessiblePosts = posts.filter(
    (p) => currentUser.perfil === 'ADMINISTRADOR' || accessibleClientIdsSet.has(p.clienteId)
  );

  const totalPendingApproval = posts.filter(
    (p) =>
      p.status === 'Aguardando aprovação' &&
      (currentUser.perfil === 'ADMINISTRADOR' || accessibleClientIdsSet.has(p.clienteId))
  ).length;

  // Se o usuário clicou em "Sair / Tela de Validação & Senha" ou abriu link de acesso exclusivo
  if (isShowingLoginScreen) {
    return (
      <LoginScreen
        usuarios={usuarios}
        clientes={clientes}
        initialEmail={loginPrefillEmail}
        initialResetCode={loginPrefillResetCode}
        dedicatedCompanyId={dedicatedCompanyId}
        onAuthenticate={handleAuthenticateWithCredentials}
        onQuickLogin={(u) => handleSelectUser(u)}
        onRequestPasswordReset={handleRequestPasswordResetOnLogin}
        onConfirmPasswordReset={handleConfirmPasswordResetOnLogin}
        onRegisterClientSelfUser={handleRegisterClientSelfUser}
        onExitDedicatedPortal={() => {
          setDedicatedCompanyId('');
          setLoginPrefillEmail('');
        }}
        tema={tema}
      />
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row antialiased font-sans transition-colors duration-200 ${
        tema === 'claro' ? 'theme-claro' : 'theme-escuro'
      }`}
    >
      {/* Sidebar: Oculta apenas quando em Modo Tela Cheia do Portal do Cliente */}
      {!isIsolatedPortalMode && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          totalPendingApproval={totalPendingApproval}
          tema={tema}
          onToggleTema={toggleTema}
        />
      )}

      {/* Container Principal */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-6">
        {/* Navbar */}
        <Navbar
          currentUser={currentUser}
          usuarios={usuarios}
          onSelectUser={handleSelectUser}
          onLogout={() => {
            setLoginPrefillEmail(currentUser.email);
            setLoginPrefillResetCode('');
            setIsShowingLoginScreen(true);
          }}
          notificacoes={notificacoes}
          onMarkNotifRead={(id) => firestoreService.markNotificationRead(id)}
          onMarkAllNotifsRead={() => firestoreService.markAllNotificationsRead(currentUser.id)}
          onOpenPost={(postId) => {
            const p = posts.find((x) => x.id === postId);
            if (p) setSelectedPost(p);
          }}
          onNewPost={() => {
            setNewPostDate(undefined);
            setIsCreatingPost(true);
          }}
          clientes={clientes}
          selectedClienteId={selectedClienteId}
          onSelectClienteId={setSelectedClienteId}
          tema={tema}
          onToggleTema={toggleTema}
        />

        {/* Área de Conteúdo da Tela Selecionada com Proteção de Permissões */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'portal' && (
            <ClientPortalView
              posts={accessiblePosts}
              clientes={accessibleClientes}
              currentUser={currentUser}
              selectedClienteId={selectedClienteId}
              onSelectClienteId={setSelectedClienteId}
              onOpenPost={setSelectedPost}
              onCreatePost={handleCreatePost}
              onUpdatePost={handleUpdatePost}
              onDeletePost={handleDeletePost}
              onNewPost={() => {
                setNewPostDate(undefined);
                setIsCreatingPost(true);
              }}
              tema={tema}
              isIsolatedPortalMode={isIsolatedPortalMode}
              onToggleIsolatedMode={() => setIsIsolatedPortalMode(!isIsolatedPortalMode)}
            />
          )}

          {activeTab === 'roteiros' && (
            <PostScriptsView
              posts={accessiblePosts}
              clientes={accessibleClientes}
              currentUser={currentUser}
              onUpdatePost={handleUpdatePost}
              onDeletePost={handleDeletePost}
              onOpenPostModal={setSelectedPost}
              onNewPost={() => {
                setNewPostDate(undefined);
                setIsCreatingPost(true);
              }}
              tema={tema}
            />
          )}

          {activeTab === 'exportar' && (
            <ExportModal
              posts={accessiblePosts}
              clientes={accessibleClientes}
              selectedClienteId={selectedClienteId}
              tema={tema}
            />
          )}

          {/* Abas exclusivas para o Administrador Principal */}
          {currentUser.perfil === 'ADMINISTRADOR' && activeTab === 'calendario' && (
            <CalendarView
              posts={posts}
              clientes={accessibleClientes}
              usuarios={usuarios}
              currentUser={currentUser}
              onOpenPost={setSelectedPost}
              onNewPostWithDate={(date) => {
                setNewPostDate(date);
                setIsCreatingPost(true);
              }}
              onMovePostDate={handleMovePostDate}
              selectedClienteId={selectedClienteId}
              tema={tema}
            />
          )}

          {currentUser.perfil === 'ADMINISTRADOR' && activeTab === 'dashboard' && (
            <DashboardView
              posts={posts}
              clientes={accessibleClientes}
              usuarios={usuarios}
              onOpenPost={setSelectedPost}
              tema={tema}
            />
          )}

          {currentUser.perfil === 'ADMINISTRADOR' && activeTab === 'clientes' && (
            <ClientsManager
              clientes={clientes}
              usuarios={usuarios}
              currentUser={currentUser}
              onCreateClient={handleCreateClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onSendAccessEmail={handleSendAccessEmail}
              onSendPasswordResetEmail={handleSendPasswordResetEmail}
              onEnterPortalAsUser={handleEnterPortalAsUser}
              tema={tema}
            />
          )}

          {currentUser.perfil === 'ADMINISTRADOR' && activeTab === 'usuarios' && (
            <UsersManager
              usuarios={usuarios}
              clientes={clientes}
              currentUser={currentUser}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onSendAccessEmail={handleSendAccessEmail}
              onSendPasswordResetEmail={handleSendPasswordResetEmail}
              onEnterPortalAsUser={handleEnterPortalAsUser}
              tema={tema}
            />
          )}
        </main>
      </div>

      {/* Navegação Mobile Inferior */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#121212] border-t border-vulpis-cinza/40 flex items-center justify-around z-40 px-2 text-vulpis-bege">
        <button
          onClick={() => setActiveTab('portal')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            activeTab === 'portal' ? 'text-vulpis-laranja font-bold' : 'opacity-70'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          <span>Agenda</span>
        </button>
        <button
          onClick={() => setActiveTab('roteiros')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            activeTab === 'roteiros' ? 'text-vulpis-laranja font-bold' : 'opacity-70'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Roteiros</span>
        </button>
        {currentUser.perfil !== 'CLIENTE' && (
          <>
            <button
              onClick={() => setActiveTab('calendario')}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
                activeTab === 'calendario' ? 'text-vulpis-laranja font-bold' : 'opacity-70'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Geral</span>
            </button>
            <button
              onClick={() => setActiveTab('clientes')}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
                activeTab === 'clientes' ? 'text-vulpis-laranja font-bold' : 'opacity-70'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Empresas</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
                activeTab === 'dashboard' ? 'text-vulpis-laranja font-bold' : 'opacity-70'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Métricas</span>
            </button>
          </>
        )}
        {currentUser.perfil === 'ADMINISTRADOR' && (
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              activeTab === 'usuarios' ? 'text-vulpis-laranja font-bold' : 'opacity-70'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Acessos</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('exportar')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            activeTab === 'exportar' ? 'text-vulpis-laranja font-bold' : 'opacity-70'
          }`}
        >
          <FileDown className="w-4 h-4" />
          <span>PDF</span>
        </button>
      </div>

      {/* Modal de Detalhe e Revisão da Postagem */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          clientes={clientes}
          usuarios={usuarios}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onUpdatePost={handleUpdatePost}
          onDeletePost={handleDeletePost}
          onSendForApproval={handleSendForApproval}
          onApprove={handleApprove}
          onRequestAdjustments={handleRequestAdjustments}
          onReopen={handleReopen}
          onAddComment={handleAddComment}
          onResolveComment={handleResolveComment}
          onUnresolveComment={handleUnresolveComment}
          onCreateNewVersion={handleCreateNewVersion}
          tema={tema}
        />
      )}

      {/* Modal de Criação de Postagem */}
      {isCreatingPost && (
        <NewPostModal
          clientes={accessibleClientes}
          usuarios={usuarios}
          currentUser={currentUser}
          initialDate={newPostDate}
          onClose={() => {
            setIsCreatingPost(false);
            setNewPostDate(undefined);
          }}
          onCreate={handleCreatePost}
          tema={tema}
        />
      )}

      {/* Modal de Comprovante e Visualização do E-mail Enviado ao Cliente */}
      {dispatchedEmailModal && (
        <EmailPreviewModal
          emailData={dispatchedEmailModal}
          onClose={() => setDispatchedEmailModal(null)}
          onEnterAsClient={handleEnterPortalAsUser}
          onGoToLoginWithEmail={(email, codigo) => {
            setLoginPrefillEmail(email);
            setLoginPrefillResetCode(codigo || '');
            setIsShowingLoginScreen(true);
          }}
          tema={tema}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
