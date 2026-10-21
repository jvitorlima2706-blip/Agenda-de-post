import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Postagem, Cliente, Usuario, RedeSocial, FormatoPostagem, StatusPostagem } from '../../types';
import { PostCard } from './PostCard';
import { DayDetailModal } from './DayDetailModal';
import { VulpisMascot } from '../common/VulpisMascot';
import {
  MESES_PT_BR,
  DIAS_SEMANA_PT_BR,
  DIAS_SEMANA_COMPLETO,
  formatDateBr,
  formatTime24h,
  isOverdue
} from '../../utils/dateUtils';
import { STATUS_CONFIG, StatusIcon } from '../../utils/statusConfig';
import { SocialIcon } from '../../utils/socialIcons';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  List,
  CalendarDays,
  Plus,
  X
} from 'lucide-react';

interface CalendarViewProps {
  posts: Postagem[];
  clientes: Cliente[];
  usuarios: Usuario[];
  currentUser: Usuario;
  onOpenPost: (post: Postagem) => void;
  onNewPostWithDate: (date: string) => void;
  onMovePostDate: (postId: string, newDate: string) => Promise<void>;
  selectedClienteId: string;
  tema: 'claro' | 'escuro';
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  posts,
  clientes,
  usuarios,
  currentUser,
  onOpenPost,
  onNewPostWithDate,
  onMovePostDate,
  selectedClienteId,
  tema
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 2)); // Month: 9 = October
  const [viewMode, setViewMode] = useState<'mes' | 'semana' | 'lista'>('mes');

  // Filters
  const [filterCliente, setFilterCliente] = useState<string>(selectedClienteId);
  const [filterRede, setFilterRede] = useState<string>('todas');
  const [filterFormato, setFilterFormato] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [selectedDayModal, setSelectedDayModal] = useState<{ date: string; posts: Postagem[] } | null>(null);

  useEffect(() => {
    setFilterCliente(selectedClienteId);
  }, [selectedClienteId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  const activeFiltersCount = (
    ((filterCliente !== 'todos' && filterCliente !== '' && (!selectedClienteId || selectedClienteId === 'todos')) ? 1 : 0) +
    (filterRede !== 'todas' ? 1 : 0) +
    (filterFormato !== 'todos' ? 1 : 0) +
    (filterStatus !== 'todos' ? 1 : 0) +
    (filterResponsavel !== 'todos' ? 1 : 0)
  );

  const isClaro = tema === 'claro';
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date(2026, 9, 2));

  // Filter posts
  const filteredPosts = useMemo(() => {
    const allowedClientIds = new Set<string>(currentUser.clientesIds || []);
    if (currentUser.perfil !== 'ADMINISTRADOR') {
      clientes.forEach((c) => {
        if (
          c.usuariosClientesIds?.includes(currentUser.id) ||
          c.gestoresIds?.includes(currentUser.id) ||
          c.criadoresIds?.includes(currentUser.id)
        ) {
          allowedClientIds.add(c.id);
        }
      });
    }

    return posts.filter((post) => {
      if (currentUser.perfil !== 'ADMINISTRADOR') {
        if (!allowedClientIds.has(post.clienteId)) return false;
      }
      if (filterCliente !== 'todos' && post.clienteId !== filterCliente) return false;
      if (filterRede !== 'todas' && !post.redes.includes(filterRede as RedeSocial)) return false;
      if (filterFormato !== 'todos' && post.formato !== filterFormato) return false;
      if (filterStatus !== 'todos' && post.status !== filterStatus) return false;
      if (filterResponsavel !== 'todos' && post.criadorId !== filterResponsavel && post.gestorId !== filterResponsavel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = post.titulo.toLowerCase().includes(q);
        const matchLegenda = post.legenda?.toLowerCase().includes(q);
        if (!matchTitle && !matchLegenda) return false;
      }
      return true;
    });
  }, [posts, currentUser, filterCliente, filterRede, filterFormato, filterStatus, filterResponsavel, searchQuery]);

  // Month summary metrics
  const monthMetrics = useMemo(() => {
    const currentMonthPosts = filteredPosts.filter((p) => {
      const d = new Date(p.dataPublicacao);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const total = currentMonthPosts.length;
    const aprovadas = currentMonthPosts.filter((p) => p.status === 'Aprovado' || p.status === 'Agendado' || p.status === 'Publicado').length;
    const aguardando = currentMonthPosts.filter((p) => p.status === 'Aguardando aprovação').length;
    const ajustes = currentMonthPosts.filter((p) => p.status === 'Ajustes solicitados').length;
    const atrasadas = currentMonthPosts.filter((p) => isOverdue(p.dataPublicacao, p.status)).length;

    return { total, aprovadas, aguardando, ajustes, atrasadas };
  }, [filteredPosts, year, month]);

  // Matrix of days
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

    // Prev month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthLastDate - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${(prevM + 1).toString().padStart(2, '0')}-${dNum.toString().padStart(2, '0')}`;
      days.push({ dateString: dateStr, dayNumber: dNum, isCurrentMonth: false, isToday: false });
    }

    // Current month
    for (let i = 1; i <= lastDate; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === '2026-10-02'
      });
    }

    // Next month filling
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const nextM = month === 11 ? 0 : month + 1;
        const nextY = month === 11 ? year + 1 : year;
        const dateStr = `${nextY}-${(nextM + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        days.push({ dateString: dateStr, dayNumber: i, isCurrentMonth: false, isToday: false });
      }
    }

    return days;
  }, [year, month]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, Postagem[]>();
    filteredPosts.forEach((post) => {
      const dateKey = post.dataPublicacao.substring(0, 10);
      const existing = map.get(dateKey) || [];
      existing.push(post);
      map.set(dateKey, existing);
    });
    return map;
  }, [filteredPosts]);

  const getCliente = (id: string) => clientes.find((c) => c.id === id);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnDay = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('text/plain');
    if (!postId) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const currentTime = post.dataPublicacao.substring(11, 16) || '12:00';
    const newDateTime = `${targetDate}T${currentTime}`;

    try {
      await onMovePostDate(postId, newDateTime);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo do Mês no topo: Cards arredondados com rounded-2xl conforme MIV */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total no Mês */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between ${
            isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <div>
            <span className="text-[11px] font-medium opacity-70 uppercase tracking-wider block">
              Total no Mês
            </span>
            <span className="text-2xl font-miv-title mt-0.5 block">
              {monthMetrics.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vulpis-azul/15 text-vulpis-azul flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Aprovadas (#1E9E5A) */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between ${
            isClaro ? 'bg-white border-[#1E9E5A]/40' : 'bg-vulpis-grafite border-[#1E9E5A]/40'
          }`}
        >
          <div>
            <span className="text-[11px] font-semibold text-[#1E9E5A] uppercase tracking-wider block">
              Aprovadas
            </span>
            <span className="text-2xl font-miv-title text-[#1E9E5A] mt-0.5 block">
              {monthMetrics.aprovadas}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1E9E5A]/15 text-[#1E9E5A] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Aguardando Aprovação (#F2B705) */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between ${
            isClaro ? 'bg-white border-[#F2B705]/50' : 'bg-vulpis-grafite border-[#F2B705]/40'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-[#F2B705] uppercase tracking-wider block">
              Aguardando
            </span>
            <span className="text-2xl font-miv-title text-[#F2B705] mt-0.5 block">
              {monthMetrics.aguardando}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F2B705]/15 text-[#F2B705] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Com Ajustes (#D93A2B) */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between ${
            isClaro ? 'bg-white border-[#D93A2B]/40' : 'bg-vulpis-grafite border-[#D93A2B]/40'
          }`}
        >
          <div>
            <span className="text-[11px] font-semibold text-[#D93A2B] uppercase tracking-wider block">
              Com Ajustes
            </span>
            <span className="text-2xl font-miv-title text-[#D93A2B] mt-0.5 block">
              {monthMetrics.ajustes}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#D93A2B]/15 text-[#D93A2B] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Atrasadas */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between col-span-2 sm:col-span-1 ${
            isClaro ? 'bg-white border-[#D93A2B]' : 'bg-vulpis-grafite border-[#D93A2B]'
          }`}
        >
          <div>
            <span className="text-[11px] font-semibold text-[#D93A2B] uppercase tracking-wider block">
              Atrasadas
            </span>
            <span className="text-2xl font-miv-title text-[#D93A2B] mt-0.5 block">
              {monthMetrics.atrasadas}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#D93A2B]/20 text-[#D93A2B] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Controle: Navegação do Mês, Alternância de Visão & Busca */}
      <div
        className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 shadow-sm ${
          isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
        }`}
      >
        {/* Navegação de Mês */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1 rounded-xl p-1 border ${
              isClaro
                ? 'bg-vulpis-bege/40 border-vulpis-grafite/20'
                : 'bg-[#121212] border-vulpis-cinza/50'
            }`}
          >
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-vulpis-azul hover:text-white transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Nome do mês estritamente em Exo 2, 700, Itálico conforme MIV! */}
            <span className="px-4 text-base font-miv-title min-w-[170px] text-center tracking-wide">
              {MESES_PT_BR[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-vulpis-azul hover:text-white transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToToday}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isClaro
                ? 'bg-vulpis-bege hover:bg-vulpis-azul hover:text-white border-vulpis-grafite/30'
                : 'bg-[#121212] hover:bg-vulpis-azul hover:text-white border-vulpis-cinza/50'
            }`}
          >
            Hoje
          </button>
        </div>

        {/* Visões (Mensal, Semanal, Lista) */}
        <div
          className={`flex items-center gap-1 rounded-xl p-1 border text-xs font-semibold ${
            isClaro
              ? 'bg-vulpis-bege/40 border-vulpis-grafite/20'
              : 'bg-[#121212] border-vulpis-cinza/50'
          }`}
        >
          <button
            onClick={() => setViewMode('mes')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'mes'
                ? 'bg-vulpis-azul text-white shadow-sm' // Abas ativas usam Azul Vulpis com texto branco
                : 'hover:text-vulpis-azul'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Mês</span>
          </button>
          <button
            onClick={() => setViewMode('semana')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'semana'
                ? 'bg-vulpis-azul text-white shadow-sm'
                : 'hover:text-vulpis-azul'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Semana</span>
          </button>
          <button
            onClick={() => setViewMode('lista')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'lista'
                ? 'bg-vulpis-azul text-white shadow-sm'
                : 'hover:text-vulpis-azul'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Lista</span>
          </button>
        </div>

        {/* Busca por título & Botão de Filtro no lado direito */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          <div className="relative flex-1 sm:w-60 max-w-xs">
            <Search className="w-4 h-4 opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs pl-9 pr-3 py-2 rounded-xl border focus:outline-none focus:border-vulpis-azul ${
                isClaro
                  ? 'bg-vulpis-bege/30 border-vulpis-grafite/20 placeholder-vulpis-grafite/50 text-vulpis-grafite'
                  : 'bg-[#121212] border-vulpis-cinza/50 placeholder-vulpis-bege/40 text-vulpis-bege'
              }`}
            />
          </div>

          {/* Botão de Filtro com Dropdown Popover */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeFiltersCount > 0
                  ? 'bg-vulpis-azul text-white border-vulpis-azul shadow-sm'
                  : isFilterOpen
                  ? 'bg-vulpis-azul/20 text-vulpis-azul border-vulpis-azul'
                  : isClaro
                  ? 'bg-vulpis-bege/40 hover:bg-vulpis-bege border-vulpis-grafite/20 text-vulpis-grafite'
                  : 'bg-[#121212] hover:bg-vulpis-cinza/30 border-vulpis-cinza/50 text-vulpis-bege'
              }`}
              title="Filtrar postagens"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-vulpis-laranja text-vulpis-grafite font-bold text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Painel Dropdown de Filtros */}
            {isFilterOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-2xl border shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 space-y-3.5 ${
                  isClaro
                    ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                    : 'bg-[#181818] border-vulpis-cinza text-vulpis-bege'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-vulpis-cinza/20">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Filter className="w-3.5 h-3.5 text-vulpis-laranja" />
                    <span>Filtrar Postagens</span>
                    {activeFiltersCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-vulpis-azul text-white font-mono">
                        {activeFiltersCount} ativo(s)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Filtro por Cliente */}
                  {currentUser.perfil !== 'CLIENTE' && clientes.length > 1 && (
                    <div>
                      <label className="block text-[11px] font-semibold opacity-70 mb-1">
                        Empresa / Cliente:
                      </label>
                      <select
                        value={filterCliente}
                        onChange={(e) => setFilterCliente(e.target.value)}
                        className={`w-full rounded-xl px-2.5 py-1.5 text-xs border focus:outline-none focus:border-vulpis-azul ${
                          isClaro
                            ? 'bg-vulpis-bege/20 border-vulpis-grafite/20 text-vulpis-grafite'
                            : 'bg-[#121212] border-vulpis-cinza/50 text-vulpis-bege'
                        }`}
                      >
                        <option value="todos">Todas as empresas</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Filtro por Rede Social */}
                  <div>
                    <label className="block text-[11px] font-semibold opacity-70 mb-1">
                      Rede Social:
                    </label>
                    <select
                      value={filterRede}
                      onChange={(e) => setFilterRede(e.target.value)}
                      className={`w-full rounded-xl px-2.5 py-1.5 text-xs border focus:outline-none focus:border-vulpis-azul ${
                        isClaro
                          ? 'bg-vulpis-bege/20 border-vulpis-grafite/20 text-vulpis-grafite'
                          : 'bg-[#121212] border-vulpis-cinza/50 text-vulpis-bege'
                      }`}
                    >
                      <option value="todas">Todas as redes</option>
                      <option value="Instagram">Instagram</option>
                      <option value="TikTok">TikTok</option>
                      <option value="YouTube">YouTube</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Facebook">Facebook</option>
                    </select>
                  </div>

                  {/* Filtro por Formato */}
                  <div>
                    <label className="block text-[11px] font-semibold opacity-70 mb-1">
                      Formato:
                    </label>
                    <select
                      value={filterFormato}
                      onChange={(e) => setFilterFormato(e.target.value)}
                      className={`w-full rounded-xl px-2.5 py-1.5 text-xs border focus:outline-none focus:border-vulpis-azul ${
                        isClaro
                          ? 'bg-vulpis-bege/20 border-vulpis-grafite/20 text-vulpis-grafite'
                          : 'bg-[#121212] border-vulpis-cinza/50 text-vulpis-bege'
                      }`}
                    >
                      <option value="todos">Todos os formatos</option>
                      <option value="Reels">Reels</option>
                      <option value="Feed">Feed</option>
                      <option value="Carrossel">Carrossel</option>
                      <option value="Stories">Stories</option>
                      <option value="Shorts">Shorts</option>
                      <option value="Vídeo longo">Vídeo longo</option>
                      <option value="TikTok">TikTok</option>
                    </select>
                  </div>

                  {/* Filtro por Status */}
                  <div>
                    <label className="block text-[11px] font-semibold opacity-70 mb-1">
                      Status de Aprovação:
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={`w-full rounded-xl px-2.5 py-1.5 text-xs border focus:outline-none focus:border-vulpis-azul ${
                        isClaro
                          ? 'bg-vulpis-bege/20 border-vulpis-grafite/20 text-vulpis-grafite'
                          : 'bg-[#121212] border-vulpis-cinza/50 text-vulpis-bege'
                      }`}
                    >
                      <option value="todos">Todos os status</option>
                      <option value="Rascunho">Rascunho</option>
                      <option value="Em produção">Em produção</option>
                      <option value="Aguardando aprovação">Aguardando aprovação</option>
                      <option value="Ajustes solicitados">Ajustes solicitados</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Agendado">Agendado</option>
                      <option value="Publicado">Publicado</option>
                    </select>
                  </div>

                  {/* Filtro por Responsável */}
                  <div>
                    <label className="block text-[11px] font-semibold opacity-70 mb-1">
                      Responsável / Criador:
                    </label>
                    <select
                      value={filterResponsavel}
                      onChange={(e) => setFilterResponsavel(e.target.value)}
                      className={`w-full rounded-xl px-2.5 py-1.5 text-xs border focus:outline-none focus:border-vulpis-azul ${
                        isClaro
                          ? 'bg-vulpis-bege/20 border-vulpis-grafite/20 text-vulpis-grafite'
                          : 'bg-[#121212] border-vulpis-cinza/50 text-vulpis-bege'
                      }`}
                    >
                      <option value="todos">Todos os responsáveis</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.perfil})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-vulpis-cinza/20 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCliente(selectedClienteId || 'todos');
                      setFilterRede('todas');
                      setFilterFormato('todos');
                      setFilterStatus('todos');
                      setFilterResponsavel('todos');
                    }}
                    className="text-xs text-vulpis-azul hover:underline font-bold"
                  >
                    Limpar Filtros
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VISÃO 1: MENSAL (Grade de 7 Colunas) */}
      {viewMode === 'mes' && (
        <div
          className={`rounded-2xl border shadow-xl overflow-hidden ${
            isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          {/* Cabeçalho de dias da semana */}
          <div
            className={`grid grid-cols-7 border-b text-center py-2.5 text-xs font-bold uppercase tracking-wider ${
              isClaro
                ? 'bg-vulpis-bege/50 border-vulpis-grafite/15 text-vulpis-grafite'
                : 'bg-[#121212] border-vulpis-cinza/40 text-vulpis-bege'
            }`}
          >
            {DIAS_SEMANA_PT_BR.map((dia, idx) => (
              <div
                key={dia}
                className={idx === 0 || idx === 6 ? 'opacity-50' : 'opacity-90'}
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Grade de Dias */}
          <div
            className={`grid grid-cols-7 divide-x divide-y ${
              isClaro ? 'divide-vulpis-grafite/15' : 'divide-vulpis-cinza/40'
            }`}
          >
            {calendarDays.map((day) => {
              const dayPosts = postsByDate.get(day.dateString) || [];
              const maxDisplay = 3;
              const hasMore = dayPosts.length > maxDisplay;
              const displayedPosts = dayPosts.slice(0, maxDisplay);

              return (
                <div
                  key={day.dateString}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDay(e, day.dateString)}
                  className={`min-h-[145px] sm:min-h-[165px] p-2 flex flex-col justify-between transition-colors relative group ${
                    day.isCurrentMonth
                      ? isClaro
                        ? 'bg-white'
                        : 'bg-vulpis-grafite/40'
                      : isClaro
                      ? 'bg-vulpis-bege/30 opacity-40'
                      : 'bg-[#121212]/60 opacity-30'
                  } ${day.isToday ? 'ring-2 ring-vulpis-laranja inset-0 z-10' : ''}`}
                >
                  {/* Topo do dia: Número + Marcação MIV do dia atual em Laranja com texto grafite! */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center font-mono ${
                        day.isToday
                          ? 'bg-vulpis-laranja text-vulpis-grafite font-bold shadow-sm' // Conforme MIV: Laranja com texto grafite em negrito!
                          : day.isCurrentMonth
                          ? ''
                          : 'opacity-40'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    <button
                      onClick={() => onNewPostWithDate(day.dateString)}
                      title={`Criar post para ${formatDateBr(day.dateString)}`}
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all ${
                        isClaro
                          ? 'hover:bg-vulpis-bege text-vulpis-grafite'
                          : 'hover:bg-[#121212] text-vulpis-bege'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Cards de postagem do dia */}
                  <div className="space-y-1.5 flex-1">
                    {displayedPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        cliente={getCliente(post.clienteId)}
                        currentUser={currentUser}
                        onOpen={onOpenPost}
                        tema={tema}
                        compact
                      />
                    ))}

                    {hasMore && (
                      <button
                        onClick={() =>
                          setSelectedDayModal({ date: day.dateString, posts: dayPosts })
                        }
                        className={`w-full text-center py-1 rounded-lg font-bold text-[10px] transition-colors border ${
                          isClaro
                            ? 'bg-vulpis-bege/80 hover:bg-vulpis-azul hover:text-white text-vulpis-azul border-vulpis-azul/30'
                            : 'bg-[#121212] hover:bg-vulpis-azul hover:text-white text-vulpis-bege border-vulpis-cinza'
                        }`}
                      >
                        +{dayPosts.length - maxDisplay} postagens
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISÃO 2: SEMANAL */}
      {viewMode === 'semana' && (
        <div
          className={`rounded-2xl border shadow-xl p-4 overflow-x-auto ${
            isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <div className="grid grid-cols-7 gap-3 min-w-[880px]">
            {calendarDays.slice(0, 7).map((day) => {
              const dayPosts = postsByDate.get(day.dateString) || [];
              return (
                <div
                  key={day.dateString}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDay(e, day.dateString)}
                  className={`p-3 rounded-2xl border flex flex-col space-y-3 min-h-[380px] ${
                    isClaro
                      ? 'bg-vulpis-bege/30 border-vulpis-grafite/15'
                      : 'bg-[#121212] border-vulpis-cinza/40'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-vulpis-cinza/20">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                        {DIAS_SEMANA_COMPLETO[new Date(day.dateString).getDay()]}
                      </span>
                      <span className="text-sm font-miv-title">
                        {day.dayNumber}/{month + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => onNewPostWithDate(day.dateString)}
                      className="p-1 rounded-lg hover:bg-vulpis-azul hover:text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {dayPosts.length === 0 ? (
                      <div className="text-center py-8 opacity-40 text-xs">Sem posts</div>
                    ) : (
                      dayPosts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          cliente={getCliente(post.clienteId)}
                          currentUser={currentUser}
                          onOpen={onOpenPost}
                          tema={tema}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISÃO 3: LISTA CRONOLÓGICA */}
      {viewMode === 'lista' && (
        <div
          className={`rounded-2xl border shadow-xl overflow-hidden ${
            isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <div
            className={`p-4 border-b flex items-center justify-between ${
              isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
            }`}
          >
            <h3 className="font-miv-title text-base">
              Lista Cronológica de Postagens ({filteredPosts.length})
            </h3>
          </div>

          <div className="divide-y divide-vulpis-cinza/20">
            {filteredPosts.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <VulpisMascot pose="vazio" size="md" />
                <p className="text-sm font-semibold opacity-70">
                  Nenhuma postagem encontrada com os filtros selecionados.
                </p>
              </div>
            ) : (
              filteredPosts
                .sort((a, b) => new Date(a.dataPublicacao).getTime() - new Date(b.dataPublicacao).getTime())
                .map((post) => {
                  const cli = getCliente(post.clienteId);
                  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG['Rascunho'];
                  return (
                    <div
                      key={post.id}
                      onClick={() => onOpenPost(post)}
                      className={`p-4 transition-colors cursor-pointer flex flex-wrap items-center justify-between gap-4 ${
                        isClaro ? 'hover:bg-vulpis-bege/40' : 'hover:bg-[#121212]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-[280px]">
                        <span
                          style={{ backgroundColor: cli?.cor || '#F86904' }}
                          className="w-3 h-10 rounded-full flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono">
                              {formatDateBr(post.dataPublicacao)} às {formatTime24h(post.dataPublicacao)}
                            </span>
                            <span className="text-xs opacity-70">• {cli?.nome}</span>
                          </div>
                          <h4 className="text-sm font-bold mt-0.5">{post.titulo}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          {post.redes.map((r) => (
                            <span key={r} title={r} className="text-vulpis-azul">
                              <SocialIcon rede={r} size={15} />
                            </span>
                          ))}
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                            isClaro ? 'bg-vulpis-bege text-vulpis-grafite' : 'bg-[#121212] text-vulpis-bege'
                          }`}
                        >
                          {post.formato}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${statusCfg.badgeClass}`}
                        >
                          <StatusIcon status={post.status} size={13} />
                          <span>{post.status}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Legenda Permanente de Cores de Status (Item 2.6) */}
      <div
        className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm ${
          isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
        }`}
      >
        <span className="font-bold uppercase tracking-wider text-[10px] opacity-70">
          Legenda de Cores de Status:
        </span>
        <div className="flex flex-wrap items-center gap-4">
          {(Object.keys(STATUS_CONFIG) as StatusPostagem[]).map((st) => {
            const cfg = STATUS_CONFIG[st];
            return (
              <div key={st} className="flex items-center gap-1.5 font-medium">
                <span
                  style={{ backgroundColor: cfg.hex }}
                  className="w-3 h-3 rounded-full flex items-center justify-center text-white"
                />
                <span className="text-[11px]">{st}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDayModal && (
        <DayDetailModal
          date={selectedDayModal.date}
          posts={selectedDayModal.posts}
          clientes={clientes}
          currentUser={currentUser}
          onClose={() => setSelectedDayModal(null)}
          onOpenPost={onOpenPost}
          onNewPostWithDate={(d) => {
            setSelectedDayModal(null);
            onNewPostWithDate(d);
          }}
          tema={tema}
        />
      )}
    </div>
  );
};
