import React, { useState, useEffect, useMemo } from 'react';
import { Postagem, Cliente, Usuario, RoteiroLembrete, FormatoPostagem } from '../../types';
import { ScriptEditorSection } from '../post/ScriptEditorSection';
import { STATUS_CONFIG, StatusIcon } from '../../utils/statusConfig';
import { formatDateTimeBr } from '../../utils/dateUtils';
import {
  FileText,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  Upload,
  EyeOff,
  Sparkles,
  Clock,
  X,
  Send,
  Lightbulb,
  CheckSquare,
  Trash2
} from 'lucide-react';
import { getPostClientVisibilityInfo } from '../../utils/visibilityUtils';

interface PostScriptsViewProps {
  posts: Postagem[];
  clientes: Cliente[];
  currentUser: Usuario;
  onUpdatePost: (id: string, updates: Partial<Postagem>) => Promise<void>;
  onDeletePost?: (id: string) => Promise<void>;
  onCreatePost?: (postData: Omit<Postagem, 'id' | 'criadoEm' | 'atualizadoEm'>) => Promise<void>;
  onOpenPostModal?: (post: Postagem) => void;
  onNewPost: () => void;
  fixedClienteId?: string;
  hideHeaderBanner?: boolean;
  tema?: 'claro' | 'escuro';
}

export const PostScriptsView: React.FC<PostScriptsViewProps> = ({
  posts,
  clientes,
  currentUser,
  onUpdatePost,
  onDeletePost,
  onCreatePost,
  onOpenPostModal,
  onNewPost,
  fixedClienteId,
  hideHeaderBanner = false,
  tema = 'claro'
}) => {
  const isClaro = tema === 'claro';
  const isClientProfile = currentUser.perfil === 'CLIENTE';

  // Empresas autorizadas ao usuário
  const userAllowedClientIds = useMemo(() => {
    if (currentUser.perfil === 'ADMINISTRADOR') return new Set(clientes.map((c) => c.id));
    const ids = new Set(currentUser.clientesIds || []);
    clientes.forEach((c) => {
      if (
        c.usuariosClientesIds?.includes(currentUser.id) ||
        c.gestoresIds?.includes(currentUser.id) ||
        c.criadoresIds?.includes(currentUser.id)
      ) {
        ids.add(c.id);
      }
    });
    return ids;
  }, [currentUser, clientes]);

  const availableClients = useMemo(() => {
    if (currentUser.perfil === 'ADMINISTRADOR') return clientes;
    return clientes.filter((c) => userAllowedClientIds.has(c.id));
  }, [clientes, userAllowedClientIds, currentUser]);

  const defaultClientId = fixedClienteId
    ? fixedClienteId
    : isClientProfile && availableClients[0]
    ? availableClients[0].id
    : 'todos';

  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string>('');

  // Sincroniza fixedClienteId quando mudar
  useEffect(() => {
    if (fixedClienteId) {
      setSelectedClientId(fixedClienteId);
    } else if (isClientProfile && availableClients[0]) {
      setSelectedClientId(availableClients[0].id);
    }
  }, [fixedClienteId, isClientProfile, availableClients]);

  // Modal rápido para nova ideia de conteúdo/roteiro
  const [isQuickIdeaOpen, setIsQuickIdeaOpen] = useState(false);
  const [quickIdeaTitle, setQuickIdeaTitle] = useState('');
  const [quickIdeaFormato, setQuickIdeaFormato] = useState<FormatoPostagem>('Reels');
  const [quickIdeaClient, setQuickIdeaClient] = useState<string>('');
  const [isCreatingIdea, setIsCreatingIdea] = useState(false);

  // Filtro de postagens
  const filteredPosts = posts.filter((p) => {
    const matchesClient = selectedClientId === 'todos' || p.clienteId === selectedClientId;
    const matchesSearch =
      !searchQuery.trim() ||
      p.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.roteiro || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClient && matchesSearch;
  });

  const activePost =
    filteredPosts.find((p) => p.id === selectedPostId) ||
    posts.find((p) => p.id === selectedPostId) ||
    filteredPosts[0];

  const [roteiro, setRoteiro] = useState('');
  const [notepad, setNotepad] = useState('');
  const [lembretes, setLembretes] = useState<RoteiroLembrete[]>([]);
  const [arquivoNome, setArquivoNome] = useState<string | undefined>(undefined);
  const [arquivoUrl, setArquivoUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [editorSubTab, setEditorSubTab] = useState<'roteiro' | 'ideias'>('roteiro');
  const [newReminderText, setNewReminderText] = useState('');

  const handleAddReminder = () => {
    if (!newReminderText.trim()) return;
    const item: RoteiroLembrete = {
      id: 'rem-' + Date.now(),
      texto: newReminderText.trim(),
      concluido: false,
      criadoEm: new Date().toISOString()
    };
    setLembretes((prev) => [...prev, item]);
    setNewReminderText('');
  };

  const handleToggleReminder = (remId: string) => {
    setLembretes((prev) =>
      prev.map((r) => (r.id === remId ? { ...r, concluido: !r.concluido } : r))
    );
  };

  const handleDeleteReminder = (remId: string) => {
    setLembretes((prev) => prev.filter((r) => r.id !== remId));
  };

  // Sincroniza quando troca a postagem selecionada
  useEffect(() => {
    if (activePost) {
      setSelectedPostId(activePost.id);
      setRoteiro(activePost.roteiro || '');
      setNotepad(activePost.roteiroNotepad || '');
      setLembretes(activePost.roteiroLembretes || []);
      setArquivoNome(activePost.roteiroArquivoNome);
      setArquivoUrl(activePost.roteiroArquivoUrl);
    }
  }, [activePost?.id]);

  // Se a lista de postagens mudar e a selecionada não estiver mais nela, seleciona a primeira
  useEffect(() => {
    if (filteredPosts.length > 0) {
      if (!selectedPostId || !filteredPosts.some((p) => p.id === selectedPostId)) {
        setSelectedPostId(filteredPosts[0].id);
      }
    } else {
      setSelectedPostId('');
    }
  }, [filteredPosts, selectedPostId]);

  const handleSaveCurrentScript = async () => {
    if (!activePost) return;
    setIsSaving(true);
    try {
      await onUpdatePost(activePost.id, {
        roteiro,
        roteiroNotepad: notepad,
        roteiroLembretes: lembretes,
        roteiroArquivoNome: arquivoNome,
        roteiroArquivoUrl: arquivoUrl
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenNewIdea = () => {
    setQuickIdeaTitle('');
    setQuickIdeaFormato('Reels');
    const targetCli =
      fixedClienteId ||
      (isClientProfile
        ? availableClients[0]?.id
        : selectedClientId !== 'todos'
        ? selectedClientId
        : availableClients[0]?.id || clientes[0]?.id || '');
    setQuickIdeaClient(targetCli);
    setIsQuickIdeaOpen(true);
  };

  const handleCreateIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickIdeaTitle.trim()) return;
    const targetCli =
      fixedClienteId ||
      (isClientProfile
        ? availableClients[0]?.id
        : quickIdeaClient || (selectedClientId !== 'todos' ? selectedClientId : clientes[0]?.id));
    if (!targetCli || targetCli === 'todos') {
      alert('Selecione uma empresa para a ideia.');
      return;
    }
    setIsCreatingIdea(true);
    try {
      if (onCreatePost) {
        const now = new Date();
        const datePub = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const datePrazo = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
        await onCreatePost({
          titulo: quickIdeaTitle.trim(),
          clienteId: targetCli,
          formato: quickIdeaFormato,
          redes: ['Instagram'],
          dataPublicacao: datePub,
          prazoAprovacao: datePrazo,
          status: 'Rascunho',
          legenda: '',
          hashtags: '',
          cta: '',
          criadorId: currentUser.id,
          gestorId: currentUser.id,
          roteiro: '',
          versaoAtual: 1,
          versoes: []
        });
      } else {
        onNewPost();
      }
      setIsQuickIdeaOpen(false);
      setQuickIdeaTitle('');
    } finally {
      setIsCreatingIdea(false);
    }
  };

  const getCliente = (id: string) => clientes.find((c) => c.id === id);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba Roteiro de Postagem */}
      {!hideHeaderBanner ? (
        <div
          className={`p-6 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-4 ${
            isClaro
              ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
              : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-vulpis-laranja text-vulpis-grafite flex items-center justify-center shadow-md">
              <FileText className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-miv-title text-xl">Roteiros &amp; Ideias de Conteúdo</h2>
              <p className="text-xs opacity-75">
                {isClientProfile
                  ? 'Espaço exclusivo para anotar, estruturar e salvar suas ideias de vídeos e conteúdos.'
                  : 'Espaço dedicado para anotar, estruturar e salvar ideias de vídeos e conteúdos para postagem.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!fixedClienteId && (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-vulpis-azul ${
                  isClaro
                    ? 'bg-vulpis-bege/30 border-vulpis-grafite/20 text-vulpis-grafite'
                    : 'bg-[#121212] border-vulpis-cinza text-vulpis-bege'
                }`}
              >
                {!isClientProfile && <option value="todos">Todas as Empresas ({clientes.length})</option>}
                {availableClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleOpenNewIdea}
              className="px-4 py-2 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Ideia / Conteúdo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-vulpis-cinza/20">
          <div>
            <h3 className="font-miv-title text-base sm:text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-vulpis-laranja" />
              <span>Roteiros &amp; Ideias da sua Empresa</span>
            </h3>
            <p className="text-xs opacity-70">
              Adicione ideias, digite seus roteiros com formatação ou anexe documentos prontos.
            </p>
          </div>

          <button
            onClick={handleOpenNewIdea}
            className="px-4 py-2 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nova Ideia / Roteiro</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista Lateral de Postagens para escolher qual roteiro editar */}
        <div className="lg:col-span-4 space-y-3">
          <div
            className={`p-4 rounded-3xl border shadow-sm space-y-3 ${
              isClaro
                ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
                : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-miv-title text-sm">Selecione a Postagem ({filteredPosts.length})</h3>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar postagem ou palavra do roteiro..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-vulpis-azul ${
                  isClaro
                    ? 'bg-vulpis-bege/20 border-vulpis-grafite/20'
                    : 'bg-[#121212] border-vulpis-cinza'
                }`}
              />
            </div>

            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {filteredPosts.length === 0 ? (
                <div className="p-6 text-center text-xs opacity-65 border border-dashed rounded-2xl">
                  Nenhuma postagem encontrada para este filtro.
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const isSelected = activePost?.id === post.id;
                  const cli = getCliente(post.clienteId);
                  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG['Rascunho'];
                  const hasScript = Boolean(post.roteiro?.trim() || post.roteiroArquivoNome);
                  const remindersCount = (post.roteiroLembretes || []).length;

                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPostId(post.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                        isSelected
                          ? 'border-vulpis-laranja ring-2 ring-vulpis-laranja/40 bg-vulpis-laranja/5'
                          : isClaro
                          ? 'bg-vulpis-bege/15 border-vulpis-grafite/15 hover:bg-vulpis-bege/35'
                          : 'bg-[#121212]/70 border-vulpis-cinza/40 hover:bg-[#121212]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 text-vulpis-laranja flex-shrink-0" />
                          <span className="truncate">{cli?.nome || 'Empresa'}</span>
                        </span>
                        <span
                          style={{ backgroundColor: statusCfg.hex }}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${
                            post.status === 'Aguardando aprovação' ? 'text-vulpis-grafite' : 'text-white'
                          }`}
                        >
                          <StatusIcon status={post.status} size={9} />
                          <span>{post.status}</span>
                        </span>
                      </div>

                      <h4 className="font-bold text-xs line-clamp-1">{post.titulo}</h4>

                      <div className="flex flex-wrap items-center justify-between gap-1 pt-1 text-[10px] opacity-75">
                        <span className="font-mono">{formatDateTimeBr(post.dataPublicacao)}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const visInfo = getPostClientVisibilityInfo(post);
                            if (visInfo.status === 'oculto_manual') {
                              return (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-[#D93A2B]/15 text-[#D93A2B] font-bold flex items-center gap-0.5"
                                  title="Oculto para o cliente: cliente vê apenas 'Disponível em breve'"
                                >
                                  <EyeOff className="w-2.5 h-2.5" /> Oculto
                                </span>
                              );
                            }
                            if (visInfo.status === 'oculto_2semanas') {
                              return (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-[#F2B705]/20 text-[#B45309] font-bold flex items-center gap-0.5"
                                  title="Além de 2 semanas: cliente vê como 'Disponível em breve' pelo padrão do portal"
                                >
                                  <Clock className="w-2.5 h-2.5" /> +2 sem
                                </span>
                              );
                            }
                            if (visInfo.status === 'liberado_manual') {
                              return (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-[#1E9E5A]/15 text-[#1E9E5A] font-bold flex items-center gap-0.5"
                                  title="Prévia liberada antecipadamente para o cliente"
                                >
                                  <Sparkles className="w-2.5 h-2.5" /> Liberado
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {hasScript && (
                            <span className="px-1.5 py-0.5 rounded bg-[#1E9E5A]/15 text-[#1E9E5A] font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Roteiro
                            </span>
                          )}
                          {post.roteiroArquivoNome && (
                            <span className="px-1.5 py-0.5 rounded bg-vulpis-azul/15 text-vulpis-azul font-bold flex items-center gap-0.5">
                              <Upload className="w-2.5 h-2.5" /> Arquivo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Área Principal de Edição do Roteiro (Word + Upload + Notepad/Lembretes) */}
        <div className="lg:col-span-8 space-y-4">
          {activePost ? (
            <div className="space-y-4">
              {/* Abas do Editor: Texto do Roteiro vs Ideias, Notas & Checklist */}
              <div
                className={`p-1.5 rounded-2xl border flex items-center gap-2 ${
                  isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setEditorSubTab('roteiro')}
                  className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    editorSubTab === 'roteiro'
                      ? 'bg-vulpis-laranja text-vulpis-grafite shadow-sm'
                      : isClaro
                      ? 'text-vulpis-grafite/70 hover:bg-vulpis-bege/50'
                      : 'text-vulpis-bege/70 hover:bg-[#121212]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Roteiro &amp; Gravação</span>
                  {roteiro.trim() && (
                    <span className="w-2 h-2 rounded-full bg-[#1E9E5A]" title="Roteiro preenchido" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setEditorSubTab('ideias')}
                  className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    editorSubTab === 'ideias'
                      ? 'bg-vulpis-laranja text-vulpis-grafite shadow-sm'
                      : isClaro
                      ? 'text-vulpis-grafite/70 hover:bg-vulpis-bege/50'
                      : 'text-vulpis-bege/70 hover:bg-[#121212]'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Ideias, Bloco de Notas &amp; Checklist</span>
                  {(notepad.trim() || lembretes.length > 0) && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-vulpis-cinza/30">
                      {lembretes.length > 0 ? `${lembretes.filter((l) => l.concluido).length}/${lembretes.length}` : '•'}
                    </span>
                  )}
                </button>
              </div>

              {editorSubTab === 'roteiro' ? (
                <ScriptEditorSection
                  clienteId={activePost.clienteId}
                  itemTitle={activePost.titulo}
                  roteiro={roteiro}
                  onChangeRoteiro={setRoteiro}
                  arquivoNome={arquivoNome}
                  arquivoUrl={arquivoUrl}
                  onChangeArquivo={(nome, url) => {
                    setArquivoNome(nome);
                    setArquivoUrl(url);
                  }}
                  onSave={handleSaveCurrentScript}
                  onDelete={
                    onDeletePost
                      ? async () => {
                          await onDeletePost(activePost.id);
                        }
                      : undefined
                  }
                  deleteLabel="Excluir Roteiro"
                  isSaving={isSaving}
                  readOnly={false}
                  tema={tema}
                />
              ) : (
                /* Bloco de Ideias & Checklist de Gravação */
                <div
                  className={`p-6 rounded-3xl border shadow-sm space-y-5 ${
                    isClaro ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite' : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-vulpis-cinza/20">
                    <div>
                      <h3 className="font-miv-title text-base flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-vulpis-laranja" />
                        <span>Ideias &amp; Anotações de Produção</span>
                      </h3>
                      <p className="text-xs opacity-70">
                        {activePost.titulo} — Rascunhos rápidos, ganchos e lembretes para a equipe.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveCurrentScript}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Salvando...' : 'Salvar Ideias & Notas'}</span>
                    </button>
                  </div>

                  {/* Bloco de Notas Livre */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-vulpis-azul" />
                      <span>Bloco de Notas &amp; Brainstorming de Ideias:</span>
                    </label>
                    <textarea
                      rows={6}
                      value={notepad}
                      onChange={(e) => setNotepad(e.target.value)}
                      placeholder="Anote aqui referências, ideias de ganchos alternativos, ângulos de gravação, frases de impacto ou sugestões da equipe..."
                      className={`w-full p-3.5 rounded-2xl border text-xs leading-relaxed focus:outline-none focus:border-vulpis-azul resize-y ${
                        isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20 text-vulpis-grafite' : 'bg-[#121212] border-vulpis-cinza text-vulpis-bege'
                      }`}
                    />
                  </div>

                  {/* Checklist de Lembretes / Tópicos */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-[#1E9E5A]" />
                      <span>Checklist de Produção &amp; Lembretes ({lembretes.length}):</span>
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newReminderText}
                        onChange={(e) => setNewReminderText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddReminder();
                          }
                        }}
                        placeholder="Adicionar novo tópico ou lembrete..."
                        className={`flex-1 px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:border-vulpis-azul ${
                          isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleAddReminder}
                        disabled={!newReminderText.trim()}
                        className="px-4 py-2 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {lembretes.length === 0 ? (
                        <p className="text-xs opacity-60 italic py-2">
                          Nenhum lembrete adicionado ainda. Adicione itens para lembrar na gravação.
                        </p>
                      ) : (
                        lembretes.map((lembrete) => (
                          <div
                            key={lembrete.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                              lembrete.concluido
                                ? isClaro
                                  ? 'bg-vulpis-bege/20 border-vulpis-grafite/10 opacity-60'
                                  : 'bg-[#121212]/40 border-vulpis-cinza/20 opacity-50'
                                : isClaro
                                ? 'bg-white border-vulpis-grafite/15'
                                : 'bg-[#121212] border-vulpis-cinza/40'
                            }`}
                          >
                            <label className="flex items-center gap-2.5 cursor-pointer text-xs flex-1">
                              <input
                                type="checkbox"
                                checked={lembrete.concluido}
                                onChange={() => handleToggleReminder(lembrete.id)}
                                className="w-4 h-4 rounded text-vulpis-laranja focus:ring-0 cursor-pointer"
                              />
                              <span className={lembrete.concluido ? 'line-through' : ''}>
                                {lembrete.texto}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteReminder(lembrete.id)}
                              className="p-1 rounded-lg hover:bg-[#D93A2B]/15 text-[#D93A2B] transition-colors"
                              title="Excluir lembrete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`p-10 rounded-3xl border text-center space-y-3 ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
                  : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
              }`}
            >
              <FileText className="w-10 h-10 text-vulpis-laranja mx-auto opacity-80" />
              <h3 className="font-miv-title text-base">Nenhum Roteiro Selecionado</h3>
              <p className="text-xs opacity-70">
                Selecione uma ideia ao lado ou crie uma nova para escrever o roteiro e salvar ideias.
              </p>
              <button
                type="button"
                onClick={handleOpenNewIdea}
                className="px-4 py-2 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold inline-flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Nova Ideia de Conteúdo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criação Rápida de Ideia / Roteiro */}
      {isQuickIdeaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
              isClaro
                ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                isClaro ? 'bg-vulpis-bege/30' : 'bg-[#121212]'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-vulpis-laranja" />
                <h3 className="font-miv-title text-sm">Nova Ideia de Conteúdo / Roteiro</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickIdeaOpen(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIdeaSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  Título da Ideia ou Tema do Vídeo <span className="text-vulpis-laranja">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5 Dicas Práticas de Produtividade..."
                  value={quickIdeaTitle}
                  onChange={(e) => setQuickIdeaTitle(e.target.value)}
                  className={`w-full p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                  autoFocus
                />
              </div>

              {!fixedClienteId && (!isClientProfile || availableClients.length > 1) && (
                <div>
                  <label className="block font-semibold mb-1">Empresa:</label>
                  <select
                    value={quickIdeaClient || (availableClients[0]?.id || '')}
                    onChange={(e) => setQuickIdeaClient(e.target.value)}
                    className={`w-full p-2.5 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                      isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                    }`}
                  >
                    {availableClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Formato Inicial:</label>
                <select
                  value={quickIdeaFormato}
                  onChange={(e) => setQuickIdeaFormato(e.target.value as FormatoPostagem)}
                  className={`w-full p-2.5 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                    isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                >
                  <option value="Reels">Reels (9:16)</option>
                  <option value="Feed">Feed (1:1 ou 4:5)</option>
                  <option value="Carrossel">Carrossel (Slides)</option>
                  <option value="Stories">Stories (9:16)</option>
                  <option value="Shorts">Shorts (9:16)</option>
                  <option value="Vídeo longo">Vídeo longo (16:9)</option>
                  <option value="TikTok">TikTok (9:16)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickIdeaOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs opacity-70 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingIdea || !quickIdeaTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isCreatingIdea ? 'Criando...' : 'Criar Ideia & Iniciar Roteiro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
