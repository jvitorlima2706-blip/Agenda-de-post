import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Cliente,
  Usuario,
  Postagem,
  LogAuditoria,
  Notificacao,
  Comentario,
  Versao,
  StatusPostagem
} from '../types';
import {
  SEED_CLIENTES,
  SEED_USUARIOS,
  SEED_POSTAGENS,
  SEED_NOTIFICACOES,
  SEED_LOGS
} from './seedData';

const STORAGE_KEY_POSTS = 'vulpis_posts_cache';
const STORAGE_KEY_CLIENTS = 'vulpis_clients_cache';
const STORAGE_KEY_USERS = 'vulpis_users_cache';
const STORAGE_KEY_NOTIFS = 'vulpis_notifs_cache';
const STORAGE_KEY_LOGS = 'vulpis_logs_cache';
const STORAGE_KEY_DELETED_CLIENTS = 'vulpis_deleted_clients';
const STORAGE_KEY_DELETED_POSTS = 'vulpis_deleted_posts';

// Helper to get cached data or fallback to seeds
function getCached<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading localStorage cache', e);
  }
  return fallback;
}

function setCached<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving localStorage cache', e);
  }
}

// Subscriptions storage
type Subscriber<T> = (data: T) => void;

class FirestoreService {
  private posts: Postagem[] = getCached(STORAGE_KEY_POSTS, SEED_POSTAGENS);
  private clients: Cliente[] = getCached(STORAGE_KEY_CLIENTS, SEED_CLIENTES);
  private users: Usuario[] = getCached(STORAGE_KEY_USERS, SEED_USUARIOS);
  private notifs: Notificacao[] = getCached(STORAGE_KEY_NOTIFS, SEED_NOTIFICACOES);
  private logs: LogAuditoria[] = getCached(STORAGE_KEY_LOGS, SEED_LOGS);

  private postSubscribers: Set<Subscriber<Postagem[]>> = new Set();
  private clientSubscribers: Set<Subscriber<Cliente[]>> = new Set();
  private userSubscribers: Set<Subscriber<Usuario[]>> = new Set();
  private notifSubscribers: Set<Subscriber<Notificacao[]>> = new Set();
  private logSubscribers: Set<Subscriber<LogAuditoria[]>> = new Set();

  private isFirestoreConnected: boolean = false;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    this.ensureSeedClientUsersInCache();
    this.initFirestoreSync();
  }

  private ensureSeedClientUsersInCache() {
    // Purga completa de todos os perfis extras e empresas criadas, deixando apenas o Administrador Principal
    this.users = SEED_USUARIOS.map((u) => ({ ...u, clientesIds: [] }));
    setCached(STORAGE_KEY_USERS, this.users);

    this.clients = [];
    setCached(STORAGE_KEY_CLIENTS, this.clients);

    this.posts = [];
    setCached(STORAGE_KEY_POSTS, this.posts);

    this.notifs = [];
    setCached(STORAGE_KEY_NOTIFS, this.notifs);

    this.logs = [];
    setCached(STORAGE_KEY_LOGS, this.logs);

    try {
      localStorage.removeItem(STORAGE_KEY_DELETED_CLIENTS);
      localStorage.removeItem(STORAGE_KEY_DELETED_POSTS);
    } catch (_) {}
  }

  private async initFirestoreSync() {
    try {
      // 1. Purga o banco Firestore das empresas e perfis anteriores
      await this.ensureInitialSeed();
      // 2. Setup Firestore onSnapshot listeners
      this.subscribeFirestoreCollections();
    } catch (err) {
      console.warn('Operating with local persistent cache:', err);
    }
  }

  private async ensureInitialSeed() {
    try {
      // 1. Remove todas as empresas salvas no Firestore
      const clientsSnap = await getDocs(collection(db, 'clientes')).catch(() => null);
      if (clientsSnap && !clientsSnap.empty) {
        for (const cDoc of clientsSnap.docs) {
          await deleteDoc(doc(db, 'clientes', cDoc.id)).catch(() => {});
        }
      }

      // 2. Remove todas as postagens salvas no Firestore
      const postsSnap = await getDocs(collection(db, 'postagens')).catch(() => null);
      if (postsSnap && !postsSnap.empty) {
        for (const pDoc of postsSnap.docs) {
          await deleteDoc(doc(db, 'postagens', pDoc.id)).catch(() => {});
        }
      }

      // 3. Remove todos os usuários salvos no Firestore, exceto o Administrador Principal
      const usersSnap = await getDocs(collection(db, 'users')).catch(() => null);
      if (usersSnap && !usersSnap.empty) {
        for (const uDoc of usersSnap.docs) {
          if (uDoc.id !== 'user-admin') {
            await deleteDoc(doc(db, 'users', uDoc.id)).catch(() => {});
          }
        }
      }

      // 4. Garante que o Administrador Principal esteja cadastrado com lista de empresas vazia
      if (SEED_USUARIOS[0]) {
        await setDoc(doc(db, 'users', 'user-admin'), SEED_USUARIOS[0]).catch(() => {});
      }

      this.isFirestoreConnected = true;
    } catch (err) {
      console.warn('Firestore initial check / purge, continuing with local sync:', err);
    }
  }

  private subscribeFirestoreCollections() {
    const legacyCompanyIds = new Set(['cliente-1', 'cliente-2', 'cliente-3', 'cliente-4']);

    try {
      // 1. Postagens listener
      const unsubPosts = onSnapshot(
        collection(db, 'postagens'),
        (snapshot) => {
          const deletedPostIds = new Set<string>(getCached<string[]>(STORAGE_KEY_DELETED_POSTS, []));
          const list: Postagem[] = [];
          snapshot.forEach((d) => {
            const p = d.data() as Postagem;
            if (!deletedPostIds.has(p.id) && !legacyCompanyIds.has(p.clienteId)) {
              list.push(p);
            }
          });
          this.posts = list;
          setCached(STORAGE_KEY_POSTS, list);
          this.notifyPosts();
        },
        (error) => {
          console.warn('onSnapshot postagens fallback to cache:', error.message);
        }
      );
      this.unsubscribers.push(unsubPosts);

      // 2. Clientes listener
      const unsubClients = onSnapshot(
        collection(db, 'clientes'),
        (snapshot) => {
          const deletedClientIds = new Set<string>(getCached<string[]>(STORAGE_KEY_DELETED_CLIENTS, []));
          const list: Cliente[] = [];
          snapshot.forEach((d) => {
            const client = d.data() as Cliente;
            if (!deletedClientIds.has(client.id) && !legacyCompanyIds.has(client.id)) {
              list.push(client);
            }
          });
          this.clients = list;
          setCached(STORAGE_KEY_CLIENTS, list);
          this.notifyClients();
        },
        (error) => {
          console.warn('onSnapshot clientes fallback to cache:', error.message);
        }
      );
      this.unsubscribers.push(unsubClients);

      // 3. Users listener
      const legacyDemoIds = new Set([
        'user-gestor',
        'user-criador-1',
        'user-criador-2',
        'user-cliente-1',
        'user-cliente-2'
      ]);
      const unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const list: Usuario[] = [];
          snapshot.forEach((d) => {
            const u = d.data() as Usuario;
            if (!legacyDemoIds.has(u.id)) {
              list.push(u);
            }
          });
          if (!list.some((u) => u.id === 'user-admin') && SEED_USUARIOS[0]) {
            list.unshift(SEED_USUARIOS[0]);
          }
          this.users = list;
          setCached(STORAGE_KEY_USERS, list);
          this.notifyUsers();
        },
        (error) => {
          console.warn('onSnapshot users fallback to cache:', error.message);
        }
      );
      this.unsubscribers.push(unsubUsers);

      // 4. Notificações listener
      const unsubNotifs = onSnapshot(
        collection(db, 'notificacoes'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Notificacao[] = [];
            snapshot.forEach((d) => list.push(d.data() as Notificacao));
            this.notifs = list;
            setCached(STORAGE_KEY_NOTIFS, list);
            this.notifyNotifs();
          }
        },
        (error) => {
          console.warn('onSnapshot notificacoes fallback to cache:', error.message);
        }
      );
      this.unsubscribers.push(unsubNotifs);

      // 5. Logs listener
      const unsubLogs = onSnapshot(
        collection(db, 'logs'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: LogAuditoria[] = [];
            snapshot.forEach((d) => list.push(d.data() as LogAuditoria));
            this.logs = list;
            setCached(STORAGE_KEY_LOGS, list);
            this.notifyLogs();
          }
        },
        (error) => {
          console.warn('onSnapshot logs fallback to cache:', error.message);
        }
      );
      this.unsubscribers.push(unsubLogs);
    } catch (err) {
      console.warn('Firestore subscription failed, offline active:', err);
    }
  }

  // --- NOTIFY HANDLERS ---
  private notifyPosts() {
    this.postSubscribers.forEach((fn) => fn([...this.posts]));
  }
  private notifyClients() {
    this.clientSubscribers.forEach((fn) => fn([...this.clients]));
  }
  private notifyUsers() {
    this.userSubscribers.forEach((fn) => fn([...this.users]));
  }
  private notifyNotifs() {
    this.notifSubscribers.forEach((fn) => fn([...this.notifs]));
  }
  private notifyLogs() {
    this.logSubscribers.forEach((fn) => fn([...this.logs]));
  }

  // --- PUBLIC SUBSCRIBERS ---
  public onPosts(fn: Subscriber<Postagem[]>): () => void {
    this.postSubscribers.add(fn);
    fn([...this.posts]);
    return () => this.postSubscribers.delete(fn);
  }

  public onClients(fn: Subscriber<Cliente[]>): () => void {
    this.clientSubscribers.add(fn);
    fn([...this.clients]);
    return () => this.clientSubscribers.delete(fn);
  }

  public onUsers(fn: Subscriber<Usuario[]>): () => void {
    this.userSubscribers.add(fn);
    fn([...this.users]);
    return () => this.userSubscribers.delete(fn);
  }

  public onNotifs(fn: Subscriber<Notificacao[]>): () => void {
    this.notifSubscribers.add(fn);
    fn([...this.notifs]);
    return () => this.notifSubscribers.delete(fn);
  }

  public onLogs(fn: Subscriber<LogAuditoria[]>): () => void {
    this.logSubscribers.add(fn);
    fn([...this.logs]);
    return () => this.logSubscribers.delete(fn);
  }

  // --- AUDIT LOG CREATION ---
  public async addLog(postagemId: string, acao: string, user: Usuario, detalhes: string) {
    const logItem: LogAuditoria = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      postagemId,
      acao,
      userId: user.id,
      userName: user.nome,
      detalhes,
      criadoEm: new Date().toISOString()
    };

    this.logs = [logItem, ...this.logs];
    setCached(STORAGE_KEY_LOGS, this.logs);
    this.notifyLogs();

    try {
      await setDoc(doc(db, 'logs', logItem.id), logItem);
    } catch (e) {
      console.warn('Firestore addLog error:', e);
    }
  }

  // --- NOTIFICATION CREATION ---
  public async addNotification(userId: string, tipo: Notificacao['tipo'], postagemId: string, mensagem: string) {
    const notif: Notificacao = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId,
      tipo,
      postagemId,
      mensagem,
      lida: false,
      criadoEm: new Date().toISOString()
    };

    this.notifs = [notif, ...this.notifs];
    setCached(STORAGE_KEY_NOTIFS, this.notifs);
    this.notifyNotifs();

    try {
      await setDoc(doc(db, 'notificacoes', notif.id), notif);
    } catch (e) {
      console.warn('Firestore addNotification error:', e);
    }
  }

  public async markNotificationRead(notifId: string) {
    this.notifs = this.notifs.map((n) => (n.id === notifId ? { ...n, lida: true } : n));
    setCached(STORAGE_KEY_NOTIFS, this.notifs);
    this.notifyNotifs();

    try {
      await updateDoc(doc(db, 'notificacoes', notifId), { lida: true });
    } catch (e) {
      console.warn('Firestore markNotificationRead error:', e);
    }
  }

  public async markAllNotificationsRead(userId?: string) {
    this.notifs = this.notifs.map((n) => (!userId || n.userId === userId ? { ...n, lida: true } : n));
    setCached(STORAGE_KEY_NOTIFS, this.notifs);
    this.notifyNotifs();
  }

  // --- POST OPERATIONS ---
  public async createPost(post: Omit<Postagem, 'id' | 'criadoEm' | 'atualizadoEm'>, currentUser: Usuario): Promise<Postagem> {
    if (currentUser.perfil === 'CLIENTE') {
      const allowed = currentUser.clientesIds || [];
      const isClientOfCompany =
        allowed.includes(post.clienteId) ||
        this.clients.some(
          (c) => c.id === post.clienteId && c.usuariosClientesIds?.includes(currentUser.id)
        );
      if (post.clienteId && !isClientOfCompany) {
        throw new Error('Você só pode criar ideias e roteiros para a sua própria empresa.');
      }
    }
    const id = 'post-' + Date.now();
    const now = new Date().toISOString();
    const newPost: Postagem = {
      ...post,
      id,
      versaoAtual: post.versaoAtual || 1,
      versoes: post.versoes && post.versoes.length > 0 ? post.versoes : [
        {
          id: 'v1',
          numero: 1,
          midias: [],
          criadoEm: now
        }
      ],
      comentarios: post.comentarios || [],
      criadoEm: now,
      atualizadoEm: now
    };

    this.posts = [newPost, ...this.posts];
    setCached(STORAGE_KEY_POSTS, this.posts);
    this.notifyPosts();

    await this.addLog(id, 'Postagem Criada', currentUser, `Criou a postagem "${newPost.titulo}" com formato ${newPost.formato}.`);

    try {
      await setDoc(doc(db, 'postagens', id), newPost);
    } catch (err) {
      console.warn('Firestore createPost write failed, cached locally:', err);
    }

    return newPost;
  }

  public async updatePost(id: string, updates: Partial<Postagem>, currentUser: Usuario): Promise<void> {
    const current = this.posts.find((p) => p.id === id);
    if (!current) throw new Error('Postagem não encontrada.');

    // Creator permission check: cannot approve or edit approved post
    if (currentUser.perfil === 'CRIADOR' && updates.status === 'Aprovado') {
      throw new Error('Criadores não têm permissão para aprovar postagens.');
    }
    if (currentUser.perfil === 'CRIADOR' && current.status === 'Aprovado') {
      throw new Error('Esta postagem já está aprovada e não pode ser editada por criadores.');
    }
    if (currentUser.perfil === 'CRIADOR' && current.status === 'Aguardando aprovação' && updates.status !== 'Aguardando aprovação') {
      throw new Error('Esta postagem está em aprovação e suas edições estão travadas.');
    }

    const updatedPost: Postagem = {
      ...current,
      ...updates,
      atualizadoEm: new Date().toISOString()
    };

    this.posts = this.posts.map((p) => (p.id === id ? updatedPost : p));
    setCached(STORAGE_KEY_POSTS, this.posts);
    this.notifyPosts();

    if (updates.status && updates.status !== current.status) {
      await this.addLog(id, 'Mudança de Status', currentUser, `Status alterado de "${current.status}" para "${updates.status}".`);
    } else if (updates.dataPublicacao && updates.dataPublicacao !== current.dataPublicacao) {
      await this.addLog(id, 'Reagendamento', currentUser, `Data de publicação alterada para ${updates.dataPublicacao}.`);
    } else {
      await this.addLog(id, 'Edição de Postagem', currentUser, `Dados atualizados por ${currentUser.nome}.`);
    }

    try {
      await setDoc(doc(db, 'postagens', id), updatedPost);
    } catch (err) {
      console.warn('Firestore updatePost failed, cached locally:', err);
    }
  }

  public async deletePost(id: string, currentUser: Usuario): Promise<void> {
    const target = this.posts.find((p) => p.id === id);
    if (currentUser.perfil === 'CLIENTE') {
      const allowed = currentUser.clientesIds || [];
      const isClientOfCompany =
        (target && allowed.includes(target.clienteId)) ||
        (target &&
          this.clients.some(
            (c) => c.id === target.clienteId && c.usuariosClientesIds?.includes(currentUser.id)
          ));
      if (!target || !isClientOfCompany) {
        throw new Error('Você só pode excluir ideias e roteiros da sua própria empresa.');
      }
    }
    const deletedPostIds = new Set<string>(getCached<string[]>(STORAGE_KEY_DELETED_POSTS, []));
    deletedPostIds.add(id);
    setCached(STORAGE_KEY_DELETED_POSTS, Array.from(deletedPostIds));

    this.posts = this.posts.filter((p) => p.id !== id);
    setCached(STORAGE_KEY_POSTS, this.posts);
    this.notifyPosts();

    if (target) {
      await this.addLog(id, 'Exclusão de Roteiro/Postagem', currentUser, `Excluiu "${target.titulo}".`);
    }

    try {
      await deleteDoc(doc(db, 'postagens', id));
    } catch (err) {
      console.warn('Firestore deletePost error:', err);
    }
  }

  public async sendForApproval(postId: string, currentUser: Usuario): Promise<void> {
    if (currentUser.perfil === 'CLIENTE') {
      throw new Error('O cliente possui autonomia apenas para comentar, solicitar ajustes e aprovar postagens.');
    }
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Postagem não encontrada.');

    const currentVersion = post.versoes?.find((v) => v.numero === post.versaoAtual);
    const hasMedia = currentVersion && (currentVersion.midias.length > 0 || currentVersion.linkExterno);
    if (!hasMedia) {
      throw new Error('Para enviar para aprovação, é obrigatório anexar ao menos uma mídia ou link externo.');
    }
    if (!post.legenda || post.legenda.trim().length === 0) {
      throw new Error('Para enviar para aprovação, a legenda/copy não pode estar vazia.');
    }

    const now = new Date().toISOString();
    await this.updatePost(
      postId,
      {
        status: 'Aguardando aprovação',
        enviadoEm: now
      },
      currentUser
    );

    // Notify manager
    if (post.gestorId) {
      await this.addNotification(
        post.gestorId,
        'enviado_aprovacao',
        postId,
        `Postagem "${post.titulo}" foi enviada para sua aprovação por ${currentUser.nome}.`
      );
    }
  }

  public async approvePost(postId: string, nota?: number, currentUser?: Usuario, observacao?: string): Promise<void> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Postagem não encontrada.');
    if (!currentUser) throw new Error('Usuário não identificado.');

    if (currentUser.perfil === 'CRIADOR') {
      throw new Error('Criadores não podem aprovar postagens.');
    }

    const now = new Date().toISOString();
    const updatedVersoes = (post.versoes || []).map((v) =>
      v.numero === post.versaoAtual ? { ...v, observacaoGeral: observacao || v.observacaoGeral } : v
    );

    await this.updatePost(
      postId,
      {
        status: 'Aprovado',
        observacoes: observacao || post.observacoes,
        aprovadoEm: now,
        versoes: updatedVersoes
      },
      currentUser
    );

    await this.addLog(
      postId,
      'Aprovação Concluída',
      currentUser,
      'Aprovou a postagem. Edição e novos comentários encerrados.'
    );

    // Notify creator
    if (post.criadorId) {
      await this.addNotification(
        post.criadorId,
        'aprovado',
        postId,
        `Parabéns! Sua postagem "${post.titulo}" foi aprovada por ${currentUser.nome}.`
      );
    }
  }

  public async requestAdjustments(
    postId: string,
    nota: number | undefined,
    observacaoGeral: string,
    currentUser: Usuario
  ): Promise<void> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Postagem não encontrada.');

    if (currentUser.perfil === 'CRIADOR') {
      throw new Error('Criadores não podem solicitar ajustes.');
    }
    const hasComments = (post.comentarios || []).filter((c) => c.versao === post.versaoAtual).length > 0;
    if (!observacaoGeral.trim() && !hasComments) {
      throw new Error('É obrigatório incluir ao menos uma observação geral ou comentário pontual ao solicitar ajustes.');
    }

    const updatedVersoes = (post.versoes || []).map((v) =>
      v.numero === post.versaoAtual ? { ...v, observacaoGeral } : v
    );

    await this.updatePost(
      postId,
      {
        status: 'Ajustes solicitados',
        observacoes: observacaoGeral,
        versoes: updatedVersoes
      },
      currentUser
    );

    await this.addLog(
      postId,
      'Ajustes Solicitados',
      currentUser,
      'Solicitou ajustes na postagem. Postagem destravada para o criador.'
    );

    if (post.criadorId) {
      await this.addNotification(
        post.criadorId,
        'ajustes_solicitados',
        postId,
        `Ajustes solicitados em "${post.titulo}" por ${currentUser.nome}. Verifique a lista de observações.`
      );
    }
  }

  public async reopenApprovedPost(postId: string, motivo: string, currentUser: Usuario): Promise<void> {
    if (currentUser.perfil !== 'ADMINISTRADOR') {
      throw new Error('Apenas o Administrador pode reabrir uma postagem já aprovada.');
    }
    if (!motivo.trim()) {
      throw new Error('É obrigatório informar o motivo da reabertura.');
    }

    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Postagem não encontrada.');

    await this.updatePost(
      postId,
      {
        status: 'Ajustes solicitados'
      },
      currentUser
    );

    await this.addLog(
      postId,
      'Postagem Reaberta pelo Administrador',
      currentUser,
      `Reabriu a postagem aprovada. Motivo registrado: "${motivo}".`
    );

    if (post.criadorId) {
      await this.addNotification(
        post.criadorId,
        'postagem_reaberta',
        postId,
        `A postagem "${post.titulo}" foi reaberta pelo Administrador: ${motivo}.`
      );
    }
  }

  // --- COMMENTS & TIME CODES ---
  public async addComment(
    postId: string,
    commentData: Omit<Comentario, 'id' | 'resolvido' | 'criadoEm'>,
    currentUser: Usuario
  ): Promise<Comentario> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Postagem não encontrada.');

    const newComment: Comentario = {
      ...commentData,
      id: 'com-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      postagemId: postId,
      resolvido: false,
      criadoEm: new Date().toISOString()
    };

    const updatedComments = [...(post.comentarios || []), newComment];
    await this.updatePost(postId, { comentarios: updatedComments }, currentUser);

    const logDetails =
      newComment.tipo === 'video' && newComment.tempoSegundos !== undefined
        ? `Comentou no vídeo em ${Math.floor(newComment.tempoSegundos / 60)
            .toString()
            .padStart(2, '0')}:${(newComment.tempoSegundos % 60).toString().padStart(2, '0')}: "${newComment.texto}"`
        : newComment.tipo === 'slide' && newComment.slideIndex !== undefined
        ? `Comentou no Slide ${(newComment.slideIndex + 1)}: "${newComment.texto}"`
        : `Comentou: "${newComment.texto}"`;

    await this.addLog(postId, 'Novo Comentário', currentUser, logDetails);

    // Notify post creator if author is someone else
    if (post.criadorId && post.criadorId !== currentUser.id) {
      await this.addNotification(
        post.criadorId,
        'novo_comentario',
        postId,
        `${currentUser.nome} comentou na postagem "${post.titulo}".`
      );
    }

    return newComment;
  }

  public async resolveComment(postId: string, commentId: string, currentUser: Usuario, resposta?: string): Promise<void> {
    if (currentUser.perfil === 'CLIENTE') {
      throw new Error('Apenas a equipe interna pode marcar apontamentos como resolvidos.');
    }
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Postagem não encontrada.');

    const updatedComments = (post.comentarios || []).map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          resolvido: true,
          resposta: resposta || c.resposta,
          respondidoPor: currentUser.nome,
          respondidoEm: new Date().toISOString()
        };
      }
      return c;
    });

    await this.updatePost(postId, { comentarios: updatedComments }, currentUser);
    await this.addLog(postId, 'Ajuste Resolvido', currentUser, `Marcou o comentário como resolvido${resposta ? `: "${resposta}"` : '.'}`);
  }

  public async unresolveComment(postId: string, commentId: string, currentUser: Usuario): Promise<void> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Postagem não encontrada.');

    const updatedComments = (post.comentarios || []).map((c) => (c.id === commentId ? { ...c, resolvido: false } : c));
    await this.updatePost(postId, { comentarios: updatedComments }, currentUser);
  }

  // --- VERSIONING ---
  public async createNewVersion(
    postId: string,
    newMedia: Versao['midias'],
    capaUrl?: string,
    linkExterno?: string,
    observacao?: string,
    currentUser?: Usuario
  ): Promise<Versao> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Postagem não encontrada.');

    const nextNumber = (post.versoes?.length || 0) + 1;
    const newVersao: Versao = {
      id: 'v' + nextNumber,
      numero: nextNumber,
      midias: newMedia,
      capaUrl: capaUrl || post.versoes?.[post.versoes.length - 1]?.capaUrl,
      linkExterno: linkExterno || post.versoes?.[post.versoes.length - 1]?.linkExterno,
      criadoEm: new Date().toISOString(),
      observacaoGeral: observacao
    };

    const updatedVersoes = [...(post.versoes || []), newVersao];
    await this.updatePost(
      postId,
      {
        versoes: updatedVersoes,
        versaoAtual: nextNumber
      },
      currentUser || SEED_USUARIOS[0]
    );

    if (currentUser) {
      await this.addLog(postId, 'Nova Versão Criada', currentUser, `Criou a Versão V${nextNumber} com novo pacote de mídias.`);
    }

    return newVersao;
  }

  // --- CLIENT OPERATIONS ---
  private syncUsersForClient(client: Cliente) {
    const associatedUserIds = new Set<string>([
      ...(client.criadoresIds || []),
      ...(client.gestoresIds || []),
      ...(client.usuariosClientesIds || [])
    ]);

    let changed = false;
    this.users = this.users.map((u) => {
      if (u.perfil === 'ADMINISTRADOR') return u;
      const currentIds = new Set(u.clientesIds || []);
      const shouldHave = associatedUserIds.has(u.id);
      if (shouldHave && !currentIds.has(client.id)) {
        currentIds.add(client.id);
        changed = true;
        return { ...u, clientesIds: Array.from(currentIds) };
      } else if (!shouldHave && currentIds.has(client.id)) {
        currentIds.delete(client.id);
        changed = true;
        return { ...u, clientesIds: Array.from(currentIds) };
      }
      return u;
    });

    if (changed) {
      setCached(STORAGE_KEY_USERS, this.users);
      this.notifyUsers();
    }
  }

  private syncClientsForUser(user: Usuario) {
    if (user.perfil === 'ADMINISTRADOR') return;
    const targetClientIds = new Set(user.clientesIds || []);
    let changed = false;

    this.clients = this.clients.map((c) => {
      const shouldBeInClient = targetClientIds.has(c.id);
      const criadores = new Set(c.criadoresIds || []);
      const gestores = new Set(c.gestoresIds || []);
      const clientesPortal = new Set(c.usuariosClientesIds || []);

      criadores.delete(user.id);
      gestores.delete(user.id);
      clientesPortal.delete(user.id);

      if (shouldBeInClient) {
        if (user.perfil === 'CRIADOR') criadores.add(user.id);
        else if (user.perfil === 'GESTOR') gestores.add(user.id);
        else if (user.perfil === 'CLIENTE') clientesPortal.add(user.id);
      }

      const nextCriadores = Array.from(criadores);
      const nextGestores = Array.from(gestores);
      const nextClientesPortal = Array.from(clientesPortal);

      if (
        JSON.stringify(nextCriadores) !== JSON.stringify(c.criadoresIds || []) ||
        JSON.stringify(nextGestores) !== JSON.stringify(c.gestoresIds || []) ||
        JSON.stringify(nextClientesPortal) !== JSON.stringify(c.usuariosClientesIds || [])
      ) {
        changed = true;
        return {
          ...c,
          criadoresIds: nextCriadores,
          gestoresIds: nextGestores,
          usuariosClientesIds: nextClientesPortal
        };
      }
      return c;
    });

    if (changed) {
      setCached(STORAGE_KEY_CLIENTS, this.clients);
      this.notifyClients();
    }
  }

  public async createClient(client: Omit<Cliente, 'id'>, currentUser: Usuario): Promise<Cliente> {
    if (currentUser.perfil !== 'ADMINISTRADOR') {
      throw new Error('Apenas o Administrador pode cadastrar novos clientes.');
    }

    const id = 'cliente-' + Date.now();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanEmail = client.emailAcesso ? client.emailAcesso.trim().toLowerCase() : '';
    const cleanSenha = client.senhaAcesso ? client.senhaAcesso.trim() : 'vulpis2026';
    const generatedLink = `${origin}/?empresa=${id}${cleanEmail ? `&email=${encodeURIComponent(cleanEmail)}` : ''}`;

    const newClient: Cliente = {
      ...client,
      emailAcesso: cleanEmail,
      senhaAcesso: cleanSenha,
      linkAcesso: client.linkAcesso || generatedLink,
      usuariosClientesIds: client.usuariosClientesIds || [],
      id,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    // Sincroniza usuário do cliente automaticamente com o cadastro da empresa
    if (cleanEmail) {
      const existingUserIdx = this.users.findIndex(
        (u) => u.email.trim().toLowerCase() === cleanEmail
      );
      if (existingUserIdx !== -1) {
        const u = this.users[existingUserIdx];
        this.users[existingUserIdx] = {
          ...u,
          nome: newClient.responsavelContato || `Cliente ${newClient.nome}`,
          senha: cleanSenha,
          clientesIds: [id], // Isolado estritamente para esta empresa
          ativo: true
        };
        if (!newClient.usuariosClientesIds?.includes(u.id)) {
          newClient.usuariosClientesIds = [...(newClient.usuariosClientesIds || []), u.id];
        }
        setDoc(doc(db, 'users', u.id), this.users[existingUserIdx]).catch(() => {});
      } else {
        const clientUser: Usuario = {
          id: 'user-cli-' + Date.now(),
          nome: newClient.responsavelContato || `Cliente ${newClient.nome}`,
          email: cleanEmail,
          senha: cleanSenha,
          perfil: 'CLIENTE',
          clientesIds: [id],
          ativo: true,
          criadoEm: new Date().toISOString()
        };
        this.users.push(clientUser);
        if (!newClient.usuariosClientesIds?.includes(clientUser.id)) {
          newClient.usuariosClientesIds = [...(newClient.usuariosClientesIds || []), clientUser.id];
        }
        setDoc(doc(db, 'users', clientUser.id), clientUser).catch(() => {});
      }
      setCached(STORAGE_KEY_USERS, this.users);
      this.notifyUsers();
    }

    this.clients = [newClient, ...this.clients];
    setCached(STORAGE_KEY_CLIENTS, this.clients);
    this.notifyClients();
    this.syncUsersForClient(newClient);

    try {
      await setDoc(doc(db, 'clientes', id), newClient);
    } catch (e) {
      console.warn('Firestore createClient error:', e);
    }

    return newClient;
  }

  public async updateClient(id: string, updates: Partial<Cliente>, currentUser: Usuario): Promise<void> {
    if (currentUser.perfil !== 'ADMINISTRADOR') {
      throw new Error('Apenas o Administrador pode editar clientes.');
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let updatedClientObj: Cliente | undefined;
    this.clients = this.clients.map((c) => {
      if (c.id === id) {
        const cleanEmail =
          updates.emailAcesso !== undefined
            ? updates.emailAcesso.trim().toLowerCase()
            : c.emailAcesso;
        const cleanSenha =
          updates.senhaAcesso !== undefined ? updates.senhaAcesso.trim() : c.senhaAcesso;
        const link = `${origin}/?empresa=${id}${cleanEmail ? `&email=${encodeURIComponent(cleanEmail)}` : ''}`;
        updatedClientObj = {
          ...c,
          ...updates,
          emailAcesso: cleanEmail,
          senhaAcesso: cleanSenha,
          linkAcesso: link,
          atualizadoEm: new Date().toISOString()
        };
        return updatedClientObj;
      }
      return c;
    });

    if (updatedClientObj && updatedClientObj.emailAcesso && updatedClientObj.emailAcesso.trim()) {
      const cleanEmail = updatedClientObj.emailAcesso.trim().toLowerCase();
      const userIdx = this.users.findIndex(
        (u) =>
          (u.clientesIds?.includes(id) && u.perfil === 'CLIENTE') ||
          u.email.trim().toLowerCase() === cleanEmail
      );
      if (userIdx !== -1) {
        this.users[userIdx] = {
          ...this.users[userIdx],
          nome: updatedClientObj.responsavelContato || `Cliente ${updatedClientObj.nome}`,
          email: cleanEmail,
          senha: updatedClientObj.senhaAcesso || this.users[userIdx].senha || '123456',
          clientesIds: [id],
          ativo: true
        };
        setDoc(doc(db, 'users', this.users[userIdx].id), this.users[userIdx]).catch(() => {});
      } else {
        const clientUser: Usuario = {
          id: 'user-cli-' + Date.now(),
          nome: updatedClientObj.responsavelContato || `Cliente ${updatedClientObj.nome}`,
          email: cleanEmail,
          senha: updatedClientObj.senhaAcesso || '123456',
          perfil: 'CLIENTE',
          clientesIds: [id],
          ativo: true,
          criadoEm: new Date().toISOString()
        };
        this.users.push(clientUser);
        setDoc(doc(db, 'users', clientUser.id), clientUser).catch(() => {});
      }
      setCached(STORAGE_KEY_USERS, this.users);
      this.notifyUsers();
    }

    setCached(STORAGE_KEY_CLIENTS, this.clients);
    this.notifyClients();

    if (updatedClientObj) {
      this.syncUsersForClient(updatedClientObj);
    }

    try {
      await updateDoc(doc(db, 'clientes', id), updates);
    } catch (e) {
      console.warn('Firestore updateClient error:', e);
    }
  }

  public async deleteClient(id: string, currentUser: Usuario): Promise<void> {
    if (currentUser.perfil !== 'ADMINISTRADOR') {
      throw new Error('Apenas o Administrador pode excluir empresas.');
    }

    const deletedIds = new Set<string>(getCached<string[]>(STORAGE_KEY_DELETED_CLIENTS, []));
    deletedIds.add(id);
    setCached(STORAGE_KEY_DELETED_CLIENTS, Array.from(deletedIds));

    // Remove a empresa da lista
    this.clients = this.clients.filter((c) => c.id !== id);
    setCached(STORAGE_KEY_CLIENTS, this.clients);
    this.notifyClients();

    // Remove o vínculo desta empresa nos usuários
    this.users = this.users.map((u) => ({
      ...u,
      clientesIds: (u.clientesIds || []).filter((cid) => cid !== id)
    }));
    setCached(STORAGE_KEY_USERS, this.users);
    this.notifyUsers();

    // Remove as postagens associadas a esta empresa
    const postsToDelete = this.posts.filter((p) => p.clienteId === id);
    this.posts = this.posts.filter((p) => p.clienteId !== id);
    setCached(STORAGE_KEY_POSTS, this.posts);
    this.notifyPosts();

    try {
      await deleteDoc(doc(db, 'clientes', id));
      for (const p of postsToDelete) {
        deleteDoc(doc(db, 'postagens', p.id)).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore deleteClient error:', e);
    }
  }

  // --- USER OPERATIONS & AUTHENTICATION / EMAIL SYSTEM ---
  public authenticateUser(email: string, senha: string): Usuario {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Verifica se o e-mail corresponde diretamente ao e-mail de acesso de alguma Empresa cadastrada
    const matchingCompany = this.clients.find(
      (c) => c.emailAcesso && c.emailAcesso.trim().toLowerCase() === cleanEmail
    );
    if (matchingCompany) {
      const expectedPass = matchingCompany.senhaAcesso || '123456';
      if (senha.trim() !== expectedPass) {
        throw new Error(
          `Senha incorreta para a empresa "${matchingCompany.nome}". Verifique os dados de acesso da empresa.`
        );
      }
      let autoUser = this.users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
      if (!autoUser) {
        autoUser = {
          id: 'user-cli-' + matchingCompany.id,
          nome: matchingCompany.responsavelContato || `Cliente ${matchingCompany.nome}`,
          email: cleanEmail,
          senha: expectedPass,
          perfil: 'CLIENTE',
          clientesIds: [matchingCompany.id],
          ativo: true,
          criadoEm: matchingCompany.criadoEm || new Date().toISOString()
        };
        this.users.push(autoUser);
        setCached(STORAGE_KEY_USERS, this.users);
        this.notifyUsers();
      } else {
        // Garante que o login com este e-mail fica estritamente restrito à agenda desta empresa
        autoUser.clientesIds = [matchingCompany.id];
        autoUser.senha = expectedPass;
        setCached(STORAGE_KEY_USERS, this.users);
      }
      return autoUser;
    }

    // 2. Administradores Vulpis e demais usuários cadastrados
    const found = this.users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
    if (!found) {
      throw new Error(
        'E-mail não localizado. Utilize o e-mail cadastrado da sua empresa ou de um administrador Vulpis.'
      );
    }
    if (!found.ativo) {
      throw new Error('Seu acesso está inativo no momento. Contate o Administrador.');
    }
    const expectedPass = found.senha || (found.perfil === 'ADMINISTRADOR' ? 'admin123' : '123456');
    if (senha.trim() !== expectedPass) {
      throw new Error('Senha incorreta. Verifique sua senha ou clique em "Redefinir Senha".');
    }
    return found;
  }

  public async sendAccessEmail(
    userId: string,
    customPassword?: string,
    currentUser?: Usuario
  ): Promise<{
    user: Usuario;
    senhaDefinida: string;
    companies: Cliente[];
    subject: string;
    body: string;
    enviadoEm: string;
  }> {
    const targetUser = this.users.find((u) => u.id === userId);
    if (!targetUser) {
      throw new Error('Usuário não encontrado para envio de e-mail.');
    }

    const senhaFinal =
      customPassword && customPassword.trim().length > 0
        ? customPassword.trim()
        : targetUser.senha || '123456';
    const enviadoEm = new Date().toISOString();

    await this.updateUser(
      targetUser.id,
      {
        senha: senhaFinal,
        ultimoEmailEnviadoEm: enviadoEm,
        tipoUltimoEmail: 'acesso'
      },
      currentUser || SEED_USUARIOS[0]
    );

    const updatedUser = this.users.find((u) => u.id === userId) || {
      ...targetUser,
      senha: senhaFinal,
      ultimoEmailEnviadoEm: enviadoEm,
      tipoUltimoEmail: 'acesso'
    };

    const companies = this.clients.filter(
      (c) =>
        updatedUser.clientesIds?.includes(c.id) ||
        c.usuariosClientesIds?.includes(updatedUser.id)
    );
    const companyNames =
      companies.length > 0
        ? companies.map((c) => c.nome).join(', ')
        : 'Sua Empresa Associada';

    const subject = `Acesso Liberado ao Portal de Agenda e Aprovação — ${companyNames}`;
    const body = `Olá, ${updatedUser.nome}!\n\nSeu acesso ao Portal Exclusivo do Cliente da Vulpis Core foi liberado pelo Administrador.\n\n• Empresa(s) liberada(s): ${companyNames}\n• E-mail de Acesso: ${updatedUser.email}\n• Senha de Acesso: ${senhaFinal}\n• Link do Portal: ${window.location.origin}\n\nNo seu portal exclusivo você pode visualizar o calendário da(s) sua(s) empresa(s), comentar nas postagens, solicitar ajustes ou aprovar os conteúdos.\n\nEquipe Vulpis Core`;

    return {
      user: updatedUser,
      senhaDefinida: senhaFinal,
      companies,
      subject,
      body,
      enviadoEm
    };
  }

  public async sendPasswordResetEmail(emailOrUserId: string): Promise<{
    user: Usuario;
    codigo: string;
    companies: Cliente[];
    subject: string;
    body: string;
    enviadoEm: string;
  }> {
    const clean = emailOrUserId.trim().toLowerCase();
    const targetUser = this.users.find(
      (u) => u.id === emailOrUserId || u.email.trim().toLowerCase() === clean
    );
    if (!targetUser) {
      throw new Error('Não encontramos nenhum cliente/usuário cadastrado com este e-mail.');
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const enviadoEm = new Date().toISOString();

    await this.updateUser(
      targetUser.id,
      {
        codigoRecuperacao: codigo,
        ultimoEmailEnviadoEm: enviadoEm,
        tipoUltimoEmail: 'redefinicao'
      },
      SEED_USUARIOS[0]
    );

    const updatedUser = this.users.find((u) => u.id === targetUser.id) || {
      ...targetUser,
      codigoRecuperacao: codigo,
      ultimoEmailEnviadoEm: enviadoEm,
      tipoUltimoEmail: 'redefinicao'
    };

    const companies = this.clients.filter(
      (c) =>
        updatedUser.clientesIds?.includes(c.id) ||
        c.usuariosClientesIds?.includes(updatedUser.id)
    );
    const companyNames =
      companies.length > 0 ? companies.map((c) => c.nome).join(', ') : 'Portal Vulpis Core';

    const subject = `Redefinição de Senha — Portal do Cliente (${companyNames})`;
    const body = `Olá, ${updatedUser.nome}!\n\nRecebemos uma solicitação para redefinir sua senha de acesso ao Portal de Agenda (${companyNames}).\n\n• E-mail cadastrado: ${updatedUser.email}\n• Código de Validação para Redefinir Senha: ${codigo}\n\nInforme este código de 6 dígitos na tela de redefinição de senha do sistema para criar sua nova senha.\n\nEquipe Vulpis Core`;

    return {
      user: updatedUser,
      codigo,
      companies,
      subject,
      body,
      enviadoEm
    };
  }

  public async resetPasswordWithCode(
    email: string,
    codigo: string,
    novaSenha: string
  ): Promise<Usuario> {
    const cleanEmail = email.trim().toLowerCase();
    const targetUser = this.users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
    if (!targetUser) {
      throw new Error('E-mail não encontrado no sistema.');
    }
    if (!novaSenha || novaSenha.trim().length < 4) {
      throw new Error('A nova senha deve ter pelo menos 4 caracteres.');
    }
    if (
      targetUser.codigoRecuperacao &&
      targetUser.codigoRecuperacao !== codigo.trim()
    ) {
      throw new Error('Código de validação inválido. Verifique o código enviado no e-mail.');
    }

    await this.updateUser(
      targetUser.id,
      {
        senha: novaSenha.trim(),
        codigoRecuperacao: ''
      },
      SEED_USUARIOS[0]
    );

    return (
      this.users.find((u) => u.id === targetUser.id) || {
        ...targetUser,
        senha: novaSenha.trim(),
        codigoRecuperacao: ''
      }
    );
  }

  public async createUser(userData: Omit<Usuario, 'id' | 'criadoEm'>, currentUser: Usuario): Promise<Usuario> {
    if (currentUser.perfil !== 'ADMINISTRADOR') {
      throw new Error('Apenas o Administrador pode criar usuários.');
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = this.users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`Já existe um usuário/cliente cadastrado com o e-mail ${userData.email}.`);
    }

    const id = 'user-' + Date.now();
    const newUser: Usuario = {
      ...userData,
      email: userData.email.trim(),
      senha: userData.senha?.trim() || '123456',
      id,
      criadoEm: new Date().toISOString()
    };

    this.users = [...this.users, newUser];
    setCached(STORAGE_KEY_USERS, this.users);
    this.notifyUsers();
    this.syncClientsForUser(newUser);

    try {
      await setDoc(doc(db, 'users', id), newUser);
    } catch (e) {
      console.warn('Firestore createUser error:', e);
    }

    return newUser;
  }

  public async deleteUser(id: string, currentUser: Usuario): Promise<void> {
    if (currentUser.perfil !== 'ADMINISTRADOR') {
      throw new Error('Apenas o Administrador pode remover usuários.');
    }
    if (id === 'user-admin') {
      throw new Error('O usuário Administrador principal não pode ser removido.');
    }

    this.users = this.users.filter((u) => u.id !== id);
    setCached(STORAGE_KEY_USERS, this.users);
    this.notifyUsers();

    // Remove das listas das empresas
    this.clients = this.clients.map((c) => ({
      ...c,
      criadoresIds: (c.criadoresIds || []).filter((uid) => uid !== id),
      gestoresIds: (c.gestoresIds || []).filter((uid) => uid !== id),
      usuariosClientesIds: (c.usuariosClientesIds || []).filter((uid) => uid !== id)
    }));
    setCached(STORAGE_KEY_CLIENTS, this.clients);
    this.notifyClients();

    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (e) {
      console.warn('Firestore deleteUser error:', e);
    }
  }

  public async updateUser(id: string, updates: Partial<Usuario>, currentUser: Usuario): Promise<void> {
    if (currentUser.perfil !== 'ADMINISTRADOR' && currentUser.id !== id) {
      throw new Error('Apenas o Administrador pode gerenciar usuários.');
    }

    let updatedUserObj: Usuario | undefined;
    this.users = this.users.map((u) => {
      if (u.id === id) {
        updatedUserObj = { ...u, ...updates };
        return updatedUserObj;
      }
      return u;
    });
    setCached(STORAGE_KEY_USERS, this.users);
    this.notifyUsers();

    if (updatedUserObj && updates.clientesIds) {
      this.syncClientsForUser(updatedUserObj);
    }

    try {
      await updateDoc(doc(db, 'users', id), updates);
    } catch (e) {
      console.warn('Firestore updateUser error:', e);
    }
  }

  /**
   * Permite que um cliente adicione seu próprio usuário através do link de acesso exclusivo da empresa.
   * O perfil criado é estritamente 'CLIENTE', associado única e exclusivamente à empresa informada.
   */
  public async registerClientSelfUser(
    clienteId: string,
    nome: string,
    email: string,
    senha: string,
    cargo?: string
  ): Promise<Usuario> {
    const targetCompany = this.clients.find((c) => c.id === clienteId);
    if (!targetCompany) {
      throw new Error('Empresa não encontrada para o link de acesso informado.');
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Informe um e-mail válido.');
    }
    if (!nome.trim()) {
      throw new Error('Informe seu nome completo.');
    }
    if (!senha || senha.trim().length < 4) {
      throw new Error('A senha deve ter pelo menos 4 caracteres.');
    }

    const existingUser = this.users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
    if (existingUser) {
      if (existingUser.perfil === 'CLIENTE') {
        const clientIds = new Set(existingUser.clientesIds || []);
        clientIds.add(clienteId);
        existingUser.clientesIds = Array.from(clientIds);
        existingUser.senha = senha.trim();
        existingUser.nome = nome.trim() || existingUser.nome;
        existingUser.ativo = true;
        setCached(STORAGE_KEY_USERS, this.users);
        this.notifyUsers();
        setDoc(doc(db, 'users', existingUser.id), existingUser).catch(() => {});
        return existingUser;
      }
      throw new Error('Este e-mail já está em uso na plataforma. Faça o login direto ou utilize outro e-mail.');
    }

    const id = 'user-cli-' + Date.now();
    const newUser: Usuario = {
      id,
      nome: nome.trim(),
      email: cleanEmail,
      senha: senha.trim(),
      perfil: 'CLIENTE',
      clientesIds: [clienteId], // Estritamente limitado à empresa deste link
      ativo: true,
      cargo: cargo?.trim() || 'Cliente / Colaborador',
      criadoEm: new Date().toISOString()
    };

    this.users.push(newUser);
    setCached(STORAGE_KEY_USERS, this.users);
    this.notifyUsers();

    // Vincula o novo usuário à empresa
    const companyUsers = new Set(targetCompany.usuariosClientesIds || []);
    companyUsers.add(id);
    targetCompany.usuariosClientesIds = Array.from(companyUsers);
    setCached(STORAGE_KEY_CLIENTS, this.clients);
    this.notifyClients();

    try {
      await setDoc(doc(db, 'users', id), newUser);
      await updateDoc(doc(db, 'clientes', clienteId), {
        usuariosClientesIds: targetCompany.usuariosClientesIds
      });
    } catch (e) {
      console.warn('Firestore registerClientSelfUser error:', e);
    }

    return newUser;
  }
}

export const firestoreService = new FirestoreService();
