import React, { useState, useMemo } from 'react';
import { Postagem, Cliente, Usuario, StatusPostagem } from '../../types';
import { PostCard } from '../calendar/PostCard';
import { SocialIcon, FormatIcon } from '../../utils/socialIcons';
import { STATUS_CONFIG, StatusIcon } from '../../utils/statusConfig';
import {
  MESES_PT_BR,
  DIAS_SEMANA_PT_BR,
  formatDateBr,
  formatTime24h
} from '../../utils/dateUtils';
import { getYouTubeThumbnail, isYouTubeUrl } from '../../utils/mediaUtils';
import {
  Calendar,
  LayoutGrid,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Star,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Building2,
  Maximize2,
  Minimize2,
  FileText,
  Lightbulb
} from 'lucide-react';
import { isPostHiddenForClient, getPostClientVisibilityInfo } from '../../utils/visibilityUtils';
import { PostScriptsView } from '../scripts/PostScriptsView';

interface ClientPortalViewProps {
  posts: Postagem[];
  clientes: Cliente[];
  currentUser: Usuario;
  selectedClienteId?: string;
  onSelectClienteId?: (id: string) => void;
  onOpenPost: (post: Postagem) => void;
  onCreatePost?: (postData: Omit<Postagem, 'id' | 'criadoEm' | 'atualizadoEm'>) => Promise<void>;
  onUpdatePost?: (id: string, updates: Partial<Postagem>) => Promise<void>;
  onDeletePost?: (id: string) => Promise<void>;
  onNewPost?: () => void;
  tema: 'claro' | 'escuro';
  isIsolatedPortalMode?: boolean;
  onToggleIsolatedMode?: () => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  posts,
  clientes,
  currentUser,
  selectedClienteId,
  onSelectClienteId,
  onOpenPost,
  onCreatePost,
  onUpdatePost,
  onDeletePost,
  onNewPost,
  tema,
  isIsolatedPortalMode = false,
  onToggleIsolatedMode
}) => {
  const isClaro = tema === 'claro';
  const isAdmin = currentUser.perfil === 'ADMINISTRADOR';

  // Determina exatamente as empresas às quais o usuário conectado tem acesso
  const accessibleClients = useMemo(() => {
    if (isAdmin) return clientes;
    const userClientIds = new Set(currentUser.clientesIds || []);
    return clientes.filter(
      (c) =>
        userClientIds.has(c.id) ||
        c.usuariosClientesIds?.includes(currentUser.id) ||
        c.gestoresIds?.includes(currentUser.id) ||
        c.criadoresIds?.includes(currentUser.id)
    );
  }, [clientes, currentUser, isAdmin]);

  const [selectedPortalClientId, setSelectedPortalClientId] = useState<string>(
    selectedClienteId && selectedClienteId !== 'todos'
      ? selectedClienteId
      : accessibleClients[0]?.id || ''
  );

  // Sincroniza quando o seletor global na Navbar mudar
  React.useEffect(() => {
    if (
      selectedClienteId &&
      selectedClienteId !== 'todos' &&
      accessibleClients.some((c) => c.id === selectedClienteId)
    ) {
      setSelectedPortalClientId(selectedClienteId);
    }
  }, [selectedClienteId, accessibleClients]);

  // Garante que o cliente selecionado pertença apenas às empresas permitidas ao usuário
  React.useEffect(() => {
    if (
      accessibleClients.length > 0 &&
      !accessibleClients.some((c) => c.id === selectedPortalClientId)
    ) {
      const firstId = accessibleClients[0].id;
      setSelectedPortalClientId(firstId);
      if (onSelectClienteId) onSelectClienteId(firstId);
    }
  }, [accessibleClients, selectedPortalClientId, onSelectClienteId]);

  const handleSelectCompany = (id: string) => {
    setSelectedPortalClientId(id);
    if (onSelectClienteId) onSelectClienteId(id);
  };

  const activeClient = useMemo(
    () =>
      accessibleClients.find((c) => c.id === selectedPortalClientId) || accessibleClients[0],
    [accessibleClients, selectedPortalClientId]
  );

  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 2)); // Outubro 2026
  const [portalMainTab, setPortalMainTab] = useState<'agenda' | 'roteiro'>('agenda');
  const [portalSubView, setPortalSubView] = useState<'calendario' | 'galeria'>('calendario');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Filtra ESTRITAMENTE as postagens da empresa do cliente ativo
  const clientPosts = useMemo(() => {
    if (!activeClient) return [];
    return posts
      .filter((p) => {
        if (p.clienteId !== activeClient.id) return false;
        if (statusFilter !== 'todos' && p.status !== statusFilter) return false;
        return true;
      })
      .sort(
        (a, b) => new Date(a.dataPublicacao).getTime() - new Date(b.dataPublicacao).getTime()
      );
  }, [posts, activeClient, statusFilter]);

  const monthPosts = useMemo(() => {
    return clientPosts.filter((p) => {
      const d = new Date(p.dataPublicacao);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [clientPosts, year, month]);

  // Métricas exclusivas do cliente
  const metrics = useMemo(() => {
    if (!activeClient) return { total: 0, pendentes: 0, aprovados: 0, ajustes: 0 };
    const allForClient = posts.filter((p) => p.clienteId === activeClient.id);
    return {
      total: allForClient.length,
      pendentes: allForClient.filter((p) => p.status === 'Aguardando aprovação').length,
      aprovados: allForClient.filter(
        (p) => p.status === 'Aprovado' || p.status === 'Agendado' || p.status === 'Publicado'
      ).length,
      ajustes: allForClient.filter((p) => p.status === 'Ajustes solicitados').length
    };
  }, [posts, activeClient]);

  // Grade de dias do calendário mensal exclusivo do cliente
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthLastDate - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${(prevM + 1).toString().padStart(2, '0')}-${dNum
        .toString()
        .padStart(2, '0')}`;
      days.push({ dateString: dateStr, dayNumber: dNum, isCurrentMonth: false, isToday: false });
    }

    for (let i = 1; i <= lastDate; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i
        .toString()
        .padStart(2, '0')}`;
      days.push({
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === '2026-10-02'
      });
    }

    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const nextM = month === 11 ? 0 : month + 1;
        const nextY = month === 11 ? year + 1 : year;
        const dateStr = `${nextY}-${(nextM + 1).toString().padStart(2, '0')}-${i
          .toString()
          .padStart(2, '0')}`;
        days.push({ dateString: dateStr, dayNumber: i, isCurrentMonth: false, isToday: false });
      }
    }

    return days;
  }, [year, month]);

  if (!activeClient) {
    return (
      <div
        className={`p-10 rounded-3xl border text-center space-y-3 ${
          isClaro
            ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
            : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
        }`}
      >
        <Lock className="w-10 h-10 text-vulpis-laranja mx-auto" />
        <h3 className="font-miv-title text-lg">Nenhuma Empresa Associada</h3>
        <p className="text-xs opacity-75 max-w-md mx-auto">
          Seu usuário ainda não foi vinculado a nenhuma empresa de cliente. Solicite ao Administrador na aba &ldquo;Empresas &amp; Clientes&rdquo; a associação do seu usuário.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra superior informativa de Isolamento de Agenda */}
      <div
        className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
          isClaro
            ? 'bg-[#121212] text-vulpis-bege border-vulpis-cinza'
            : 'bg-vulpis-grafite/80 text-vulpis-bege border-vulpis-laranja/50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-vulpis-laranja text-vulpis-grafite flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-vulpis-laranja uppercase tracking-wider">
                Portal Exclusivo do Cliente
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E9E5A]/20 text-[#1E9E5A] border border-[#1E9E5A]/40 font-bold">
                Autonomia: Comentar, Solicitar Ajuste e Aprovar
              </span>
            </div>
            <p className="text-[11px] opacity-80">
              {isAdmin
                ? `Visualizando o Portal Exclusivo da empresa "${activeClient.nome}".`
                : `Bem-vindo(a), ${currentUser.nome} (${currentUser.email}). Exibindo a agenda de ${activeClient.nome}.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Se o cliente for responsável por mais de 1 empresa (ou Admin), permite alternar a empresa */}
          {accessibleClients.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-vulpis-laranja" />
              <select
                value={activeClient.id}
                onChange={(e) => handleSelectCompany(e.target.value)}
                className="text-xs rounded-xl px-3 py-1.5 font-bold bg-vulpis-grafite text-vulpis-bege border border-vulpis-cinza focus:outline-none focus:border-vulpis-laranja"
              >
                {accessibleClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    Empresa: {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onToggleIsolatedMode && (
            <button
              onClick={onToggleIsolatedMode}
              className="px-3 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              {isIsolatedPortalMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Sair do Modo Tela Cheia do Cliente</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Modo Tela Cheia do Cliente</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Caso o cliente seja responsável por mais de uma empresa, exibe abas rápidas das empresas autorizadas */}
      {accessibleClients.length > 1 && (
        <div
          className={`p-3.5 rounded-2xl border flex flex-wrap items-center gap-2 ${
            isClaro
              ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
              : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
          }`}
        >
          <span className="text-xs font-bold mr-1 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-vulpis-azul" />
            <span>Empresas liberadas para o seu acesso ({accessibleClients.length}):</span>
          </span>
          {accessibleClients.map((comp) => {
            const isSelected = comp.id === activeClient.id;
            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => handleSelectCompany(comp.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                  isSelected
                    ? 'bg-vulpis-laranja text-vulpis-grafite border-vulpis-laranja shadow-sm scale-[1.02]'
                    : isClaro
                    ? 'bg-vulpis-bege/40 border-vulpis-grafite/15 hover:bg-vulpis-bege'
                    : 'bg-[#121212] border-vulpis-cinza hover:border-vulpis-laranja/50'
                }`}
              >
                <span
                  style={{ backgroundColor: comp.cor }}
                  className="w-2.5 h-2.5 rounded-full"
                />
                <span>{comp.nome}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cabeçalho da Empresa do Cliente + Métricas da Agenda */}
      <div
        className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden ${
          isClaro
            ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
            : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
        }`}
      >
        <div
          style={{ backgroundColor: activeClient.cor }}
          className="absolute top-0 left-0 right-0 h-2"
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={activeClient.logoUrl}
              alt={activeClient.nome}
              className="w-16 h-16 rounded-2xl object-cover border-2 shadow-md"
              style={{ borderColor: activeClient.cor }}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-miv-title text-xl sm:text-2xl">{activeClient.nome}</h2>
                {activeClient.segmento && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-vulpis-azul/15 text-vulpis-azul border border-vulpis-azul/30">
                    {activeClient.segmento}
                  </span>
                )}
              </div>
              <p className="text-xs opacity-70 mt-0.5">
                Cronograma Oficial de Conteúdo &amp; Central de Aprovação
              </p>
              <div className="flex items-center gap-2 mt-2">
                {activeClient.redes.map((r) => (
                  <span
                    key={r}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 border ${
                      isClaro
                        ? 'bg-vulpis-bege/40 border-vulpis-grafite/15'
                        : 'bg-[#121212] border-vulpis-cinza'
                    }`}
                  >
                    <SocialIcon rede={r} size={11} />
                    <span>{r}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Cards de Resumo da Agenda do Cliente */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                statusFilter === 'todos'
                  ? 'ring-2 ring-vulpis-azul'
                  : ''
              } ${
                isClaro
                  ? 'bg-vulpis-bege/30 border-vulpis-grafite/15'
                  : 'bg-[#121212] border-vulpis-cinza/40'
              }`}
            >
              <span className="text-[10px] uppercase font-bold opacity-70 block">
                Total na Agenda
              </span>
              <span className="font-miv-title text-xl text-vulpis-azul">{metrics.total}</span>
            </button>

            <button
              onClick={() =>
                setStatusFilter(
                  statusFilter === 'Aguardando aprovação' ? 'todos' : 'Aguardando aprovação'
                )
              }
              className={`p-3 rounded-2xl border text-left transition-all ${
                statusFilter === 'Aguardando aprovação'
                  ? 'ring-2 ring-[#F2B705]'
                  : ''
              } ${
                isClaro
                  ? 'bg-[#F2B705]/10 border-[#F2B705]/40'
                  : 'bg-[#F2B705]/15 border-[#F2B705]/40'
              }`}
            >
              <span className="text-[10px] uppercase font-bold opacity-80 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#F2B705]" /> Para Aprovar
              </span>
              <span className="font-miv-title text-xl text-[#F2B705]">{metrics.pendentes}</span>
            </button>

            <button
              onClick={() =>
                setStatusFilter(statusFilter === 'Aprovado' ? 'todos' : 'Aprovado')
              }
              className={`p-3 rounded-2xl border text-left transition-all ${
                statusFilter === 'Aprovado' ? 'ring-2 ring-[#1E9E5A]' : ''
              } ${
                isClaro
                  ? 'bg-[#1E9E5A]/10 border-[#1E9E5A]/40'
                  : 'bg-[#1E9E5A]/15 border-[#1E9E5A]/40'
              }`}
            >
              <span className="text-[10px] uppercase font-bold opacity-80 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#1E9E5A]" /> Aprovados
              </span>
              <span className="font-miv-title text-xl text-[#1E9E5A]">{metrics.aprovados}</span>
            </button>

            <button
              onClick={() =>
                setStatusFilter(
                  statusFilter === 'Ajustes solicitados' ? 'todos' : 'Ajustes solicitados'
                )
              }
              className={`p-3 rounded-2xl border text-left transition-all ${
                statusFilter === 'Ajustes solicitados' ? 'ring-2 ring-[#D93A2B]' : ''
              } ${
                isClaro
                  ? 'bg-[#D93A2B]/10 border-[#D93A2B]/40'
                  : 'bg-[#D93A2B]/15 border-[#D93A2B]/40'
              }`}
            >
              <span className="text-[10px] uppercase font-bold opacity-80 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-[#D93A2B]" /> Em Ajustes
              </span>
              <span className="font-miv-title text-xl text-[#D93A2B]">{metrics.ajustes}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SELETOR PRINCIPAL DO PORTAL: ABA DE AGENDA vs ABA DO ROTEIRO */}
      <div
        className={`p-2 rounded-3xl border flex flex-wrap items-center justify-between gap-3 ${
          isClaro
            ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite shadow-sm'
            : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPortalMainTab('agenda')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              portalMainTab === 'agenda'
                ? 'bg-vulpis-laranja text-vulpis-grafite shadow-sm'
                : 'opacity-70 hover:opacity-100 hover:bg-black/5'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Aba de Agenda (Conteúdos Mensais)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/15 font-bold">
              {clientPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPortalMainTab('roteiro')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              portalMainTab === 'roteiro'
                ? 'bg-vulpis-laranja text-vulpis-grafite shadow-sm'
                : 'opacity-70 hover:opacity-100 hover:bg-black/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Aba com o Roteiro (Ideias, Alterações &amp; Gravação)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/15 font-bold">
              {clientPosts.filter((p) => p.roteiro || p.roteiroNotepad).length}
            </span>
          </button>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vulpis-azul/10 text-vulpis-azul text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Painel Administrador: visualizando {activeClient?.nome}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E9E5A]/10 text-[#1E9E5A] text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Espaço exclusivo de {activeClient?.nome}</span>
          </div>
        )}
      </div>

      {portalMainTab === 'agenda' && (
        <div className="space-y-6">
          {/* Barra de Navegação do Mês e Alternância entre Calendário e Galeria de Vídeos/Miniaturas */}
          <div
            className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-4 ${
              isClaro
                ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
                : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
            }`}
          >
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl border hover:bg-vulpis-laranja hover:text-vulpis-grafite transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-miv-title text-lg min-w-[160px] text-center">
            {MESES_PT_BR[month]} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl border hover:bg-vulpis-laranja hover:text-vulpis-grafite transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPortalSubView('calendario')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              portalSubView === 'calendario'
                ? 'bg-vulpis-laranja text-vulpis-grafite border-vulpis-laranja shadow-sm'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Minha Agenda (Calendário)</span>
          </button>

          <button
            onClick={() => setPortalSubView('galeria')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              portalSubView === 'galeria'
                ? 'bg-vulpis-laranja text-vulpis-grafite border-vulpis-laranja shadow-sm'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Galeria de Vídeos &amp; Aprovação ({clientPosts.length})</span>
          </button>
        </div>
      </div>

      {/* VISÃO 1: CALENDÁRIO MENSAL EXCLUSIVO DO CLIENTE */}
      {portalSubView === 'calendario' && (
        <div
          className={`rounded-3xl border shadow-xl overflow-hidden ${
            isClaro
              ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
              : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
          }`}
        >
          {/* Cabeçalho dias da semana */}
          <div
            className={`grid grid-cols-7 border-b text-center py-3 text-[11px] font-bold uppercase tracking-wider ${
              isClaro
                ? 'bg-vulpis-bege/50 border-vulpis-grafite/15 text-vulpis-grafite'
                : 'bg-[#121212] border-vulpis-cinza/40 text-vulpis-bege'
            }`}
          >
            {DIAS_SEMANA_PT_BR.map((dia) => (
              <div key={dia}>{dia}</div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 divide-x divide-y divide-vulpis-cinza/15">
            {calendarDays.map((day) => {
              const dayPosts = monthPosts.filter((p) =>
                p.dataPublicacao.startsWith(day.dateString)
              );

              return (
                <div
                  key={day.dateString}
                  className={`min-h-[125px] p-2 transition-colors flex flex-col justify-between ${
                    !day.isCurrentMonth
                      ? isClaro
                        ? 'bg-vulpis-bege/15 opacity-45'
                        : 'bg-[#121212]/40 opacity-35'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        day.isToday
                          ? 'bg-vulpis-laranja text-vulpis-grafite font-extrabold shadow'
                          : ''
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[10px] font-mono opacity-60">
                        {dayPosts.length} {dayPosts.length === 1 ? 'post' : 'posts'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    {dayPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        cliente={activeClient}
                        currentUser={currentUser}
                        onOpen={onOpenPost}
                        tema={tema}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISÃO 2: GALERIA DE VÍDEOS COM MINIATURA PARA O CLIENTE APROVAR */}
      {portalSubView === 'galeria' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clientPosts.length === 0 ? (
            <div
              className={`col-span-full p-10 rounded-3xl border text-center text-xs opacity-70 ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/15'
                  : 'bg-vulpis-grafite border-vulpis-cinza/40'
              }`}
            >
              Nenhuma postagem encontrada para este filtro na agenda de {activeClient.nome}.
            </div>
          ) : (
            clientPosts.map((post) => {
              const isClientUser = currentUser.perfil === 'CLIENTE';
              const isHidden = isPostHiddenForClient(post, currentUser);
              const visInfo = getPostClientVisibilityInfo(post);

              // SE O CLIENTE ESTIVER VISUALIZANDO E O POST FOR OCULTO ("DISPONÍVEL EM BREVE")
              if (isClientUser && isHidden) {
                return (
                  <div
                    key={post.id}
                    onClick={() => onOpenPost(post)}
                    className={`group rounded-3xl border shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between cursor-pointer ${
                      isClaro
                        ? 'bg-gradient-to-br from-white to-[#F2B705]/10 border-[#F2B705]/40 text-vulpis-grafite'
                        : 'bg-gradient-to-br from-vulpis-grafite to-[#F2B705]/15 border-[#F2B705]/30 text-vulpis-bege'
                    }`}
                  >
                    <div>
                      {/* Banner estilizado de Disponível em Breve */}
                      <div className="relative w-full aspect-video bg-gradient-to-br from-[#1E1E1E] to-[#121212] overflow-hidden flex flex-col items-center justify-center p-6 text-center border-b border-vulpis-cinza/20">
                        <div className="w-14 h-14 rounded-2xl bg-[#F2B705]/15 border border-[#F2B705]/30 flex items-center justify-center text-[#B45309] mb-2 shadow-md group-hover:scale-105 transition-transform">
                          <Sparkles className="w-7 h-7 text-[#F2B705]" />
                        </div>
                        <span className="font-miv-title text-base text-vulpis-bege">Disponível em breve</span>
                        <span className="text-[11px] text-vulpis-bege/70 mt-0.5 font-medium">
                          Conteúdo Programado para sua Marca
                        </span>

                        {/* Tag no topo esquerdo */}
                        <div className="absolute top-3 left-3">
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow bg-[#F2B705] text-vulpis-grafite">
                            <Clock className="w-3 h-3" />
                            <span>Disponível em breve</span>
                          </span>
                        </div>

                        {/* Formato no topo direito */}
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-black/75 text-white text-[10px] font-semibold flex items-center gap-1">
                          <FormatIcon formato={post.formato} size={11} />
                          <span>{post.formato}</span>
                        </div>
                      </div>

                      {/* Conteúdo informativo do Card */}
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] opacity-75 font-mono">
                          <span>
                            Previsto: {formatDateBr(post.dataPublicacao)} às {formatTime24h(post.dataPublicacao)}
                          </span>
                          <div className="flex items-center gap-1">
                            {post.redes.map((r) => (
                              <SocialIcon key={r} rede={r} size={13} className="text-vulpis-azul" />
                            ))}
                          </div>
                        </div>

                        <h4 className="font-miv-title text-sm line-clamp-1">Conteúdo Programado</h4>

                        <p className="text-xs opacity-80 line-clamp-2 leading-relaxed">
                          Esta publicação está no cronograma de produção da equipe. A prévia completa (mídia e copy) será liberada para sua aprovação 2 semanas antes da postagem ou assim que concluída.
                        </p>
                      </div>
                    </div>

                    {/* Rodapé de Ação do Cliente */}
                    <div className="p-4 pt-0 flex items-center justify-between">
                      <span className="text-[11px] opacity-70 flex items-center gap-1 text-[#B45309] font-semibold">
                        <Clock className="w-3 h-3" /> Programado
                      </span>

                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Agendamento</span>
                      </button>
                    </div>
                  </div>
                );
              }

              const currentVersao =
                post.versoes?.find((v) => v.numero === post.versaoAtual) || post.versoes?.[0];
              const rawMediaUrl = currentVersao?.midias?.[0]?.url;
              const ytThumb =
                getYouTubeThumbnail(currentVersao?.linkExterno || '') ||
                getYouTubeThumbnail(rawMediaUrl || '');
              const thumbUrl =
                currentVersao?.capaUrl ||
                ytThumb ||
                (currentVersao?.midias?.[0]?.tipo === 'imagem' ? rawMediaUrl : undefined);
              const isVid =
                currentVersao?.midias?.[0]?.tipo === 'video' ||
                isYouTubeUrl(currentVersao?.linkExterno) ||
                isYouTubeUrl(rawMediaUrl) ||
                ['Reels', 'Shorts', 'Vídeo longo', 'TikTok'].includes(post.formato);
              const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG['Rascunho'];

              return (
                <div
                  key={post.id}
                  onClick={() => onOpenPost(post)}
                  className={`group rounded-3xl border shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between cursor-pointer ${
                    isClaro
                      ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
                      : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                  }`}
                >
                  <div>
                    {/* Miniatura grande para o cliente visualizar */}
                    <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={post.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-white/50 text-xs">
                          <FormatIcon formato={post.formato} size={28} />
                          <span>{post.formato}</span>
                        </div>
                      )}

                      {isVid && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/20 transition-all">
                          <div className="w-12 h-12 rounded-full bg-vulpis-laranja text-vulpis-grafite flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Tag de Status */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span
                          style={{ backgroundColor: statusCfg.hex }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow ${
                            post.status === 'Aguardando aprovação'
                              ? 'text-vulpis-grafite'
                              : 'text-white'
                          }`}
                        >
                          <StatusIcon status={post.status as StatusPostagem} size={11} />
                          <span>{post.status}</span>
                        </span>

                        {/* Badge de visibilidade para a equipe */}
                        {!isClientUser && visInfo.isHidden && (
                          <span
                            className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#D93A2B] text-white flex items-center gap-1 shadow"
                            title={visInfo.detail}
                          >
                            <EyeOff className="w-3 h-3" />
                            <span>Oculto p/ cliente</span>
                          </span>
                        )}

                        {!isClientUser && visInfo.status === 'liberado_manual' && (
                          <span
                            className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#1E9E5A] text-white flex items-center gap-1 shadow"
                            title={visInfo.detail}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Prévia liberada</span>
                          </span>
                        )}
                      </div>

                      {/* Versão */}
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-black/75 text-white text-[10px] font-mono font-bold">
                        V{post.versaoAtual}
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] opacity-75 font-mono">
                        <span>
                          {formatDateBr(post.dataPublicacao)} às {formatTime24h(post.dataPublicacao)}
                        </span>
                        <div className="flex items-center gap-1">
                          {post.redes.map((r) => (
                            <SocialIcon key={r} rede={r} size={13} className="text-vulpis-azul" />
                          ))}
                        </div>
                      </div>

                      <h4 className="font-miv-title text-sm line-clamp-2">{post.titulo}</h4>

                      <p className="text-xs opacity-80 line-clamp-2 leading-relaxed">
                        {post.legenda || 'Clique para ver os detalhes da publicação.'}
                      </p>
                    </div>
                  </div>

                  {/* Rodapé de Ação do Cliente */}
                  <div className="p-4 pt-0 flex items-center justify-between">
                    {post.status === 'Aprovado' ? (
                      <div className="flex items-center gap-1 text-[#1E9E5A] text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprovado</span>
                      </div>
                    ) : (
                      <span className="text-[11px] opacity-60">Prazo: {formatDateBr(post.prazoAprovacao)}</span>
                    )}

                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        {post.status === 'Aguardando aprovação'
                          ? 'Assistir & Aprovar'
                          : 'Ver Postagem'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
        </div>
      )}

      {/* ABA COM O ROTEIRO DO CLIENTE (IDEIAS, ANOTAÇÕES & ALTERAÇÕES) */}
      {portalMainTab === 'roteiro' && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-3 ${
              isClaro
                ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite shadow-sm'
                : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: activeClient?.cor || '#F86904' }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm"
              >
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-miv-title text-base">
                  Roteiros &amp; Ideias de {activeClient?.nome}
                </h3>
                <p className="text-xs opacity-75">
                  {isAdmin
                    ? 'Painel Administrador: acompanhando e ajustando em tempo real os roteiros e ideias desta empresa.'
                    : 'Adicione ideias, faça alterações no roteiro de gravação e organize anotações em sincronia com a Vulpis.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin ? (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-vulpis-azul/15 text-vulpis-azul border border-vulpis-azul/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Sincronizado com o Administrador</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1E9E5A]/15 text-[#1E9E5A] border border-[#1E9E5A]/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Acesso Exclusivo à Empresa</span>
                </span>
              )}
            </div>
          </div>

          <PostScriptsView
            posts={posts}
            clientes={clientes}
            currentUser={currentUser}
            fixedClienteId={activeClient?.id}
            hideHeaderBanner={true}
            onUpdatePost={onUpdatePost || (async () => {})}
            onCreatePost={onCreatePost}
            onDeletePost={onDeletePost}
            onOpenPostModal={onOpenPost}
            onNewPost={onNewPost || (() => {})}
            tema={tema}
          />
        </div>
      )}
    </div>
  );
};
