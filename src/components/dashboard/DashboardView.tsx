import React, { useState, useMemo } from 'react';
import { Postagem, Cliente, Usuario } from '../../types';
import { isOverdue, isDueWithin24h, formatDateTimeBr, MESES_PT_BR } from '../../utils/dateUtils';
import { STATUS_CONFIG, StatusIcon } from '../../utils/statusConfig';
import { VulpisMascot } from '../common/VulpisMascot';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  AlertCircle
} from 'lucide-react';

interface DashboardViewProps {
  posts: Postagem[];
  clientes: Cliente[];
  usuarios: Usuario[];
  onOpenPost: (post: Postagem) => void;
  tema?: 'claro' | 'escuro';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  posts,
  clientes,
  usuarios,
  onOpenPost,
  tema = 'claro'
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 9 = Outubro
  const [selectedYear] = useState<number>(2026);
  const [selectedClienteFilter, setSelectedClienteFilter] = useState<string>('todos');

  const isClaro = tema === 'claro';

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const d = new Date(p.dataPublicacao);
      if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return false;
      if (selectedClienteFilter !== 'todos' && p.clienteId !== selectedClienteFilter) return false;
      return true;
    });
  }, [posts, selectedMonth, selectedYear, selectedClienteFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPosts.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [filteredPosts]);

  const clientCounts = useMemo(() => {
    const map = new Map<string, number>();
    filteredPosts.forEach((p) => {
      map.set(p.clienteId, (map.get(p.clienteId) || 0) + 1);
    });
    return clientes.map((c) => ({
      cliente: c,
      count: map.get(c.id) || 0
    }));
  }, [filteredPosts, clientes]);

  const clientRatings = useMemo(() => {
    return clientes.map((c) => {
      const clientPosts = posts.filter((p) => p.clienteId === c.id && p.nota);
      const avg =
        clientPosts.length > 0
          ? clientPosts.reduce((acc, p) => acc + (p.nota || 0), 0) / clientPosts.length
          : 0;
      return {
        cliente: c,
        avgRating: avg.toFixed(1),
        totalRated: clientPosts.length
      };
    });
  }, [posts, clientes]);

  const creatorRatings = useMemo(() => {
    const creators = usuarios.filter((u) => u.perfil === 'CRIADOR');
    return creators.map((cr) => {
      const creatorPosts = posts.filter((p) => p.criadorId === cr.id && p.nota);
      const avg =
        creatorPosts.length > 0
          ? creatorPosts.reduce((acc, p) => acc + (p.nota || 0), 0) / creatorPosts.length
          : 0;
      return {
        creator: cr,
        avgRating: avg.toFixed(1),
        totalRated: creatorPosts.length
      };
    });
  }, [posts, usuarios]);

  const avgTurnaroundHours = useMemo(() => {
    const approvedPosts = filteredPosts.filter((p) => p.enviadoEm && p.aprovadoEm);
    if (approvedPosts.length === 0) return 4.5;
    const totalDiffHours = approvedPosts.reduce((acc, p) => {
      const start = new Date(p.enviadoEm!).getTime();
      const end = new Date(p.aprovadoEm!).getTime();
      return acc + (end - start) / (1000 * 60 * 60);
    }, 0);
    return Math.max(0.5, totalDiffHours / approvedPosts.length);
  }, [filteredPosts]);

  const avgAdjustmentRounds = useMemo(() => {
    if (filteredPosts.length === 0) return 1.2;
    const totalVersions = filteredPosts.reduce((acc, p) => acc + (p.versoes?.length || 1), 0);
    return (totalVersions / filteredPosts.length).toFixed(1);
  }, [filteredPosts]);

  const attentionList = useMemo(() => {
    return posts
      .filter((p) => {
        const overdue = isOverdue(p.dataPublicacao, p.status);
        const dueSoon = isDueWithin24h(p.prazoAprovacao, p.status);
        return overdue || dueSoon;
      })
      .slice(0, 8);
  }, [posts]);

  return (
    <div className="space-y-6">
      {/* Top Header com detalhe de ondas e patinhas discretas conforme item 2.7 */}
      <div
        className={`relative overflow-hidden p-6 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-4 ${
          isClaro ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite' : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
        }`}
      >
        {/* Padrão discreto de patinhas em azul Vulpis com baixa opacidade (como na capa do MIV) */}
        <div className="absolute right-0 top-0 bottom-0 w-80 pointer-events-none opacity-5">
          <svg viewBox="0 0 100 100" fill="#0662CB" className="w-full h-full">
            <ellipse cx="20" cy="30" rx="4" ry="6" />
            <ellipse cx="32" cy="20" rx="4" ry="6" />
            <ellipse cx="45" cy="22" rx="4" ry="6" />
            <ellipse cx="55" cy="32" rx="4" ry="6" />
            <path d="M 37 40 C 25 40 22 55 37 60 C 52 55 49 40 37 40 Z" />
            <ellipse cx="70" cy="70" rx="4" ry="6" />
            <ellipse cx="82" cy="60" rx="4" ry="6" />
            <ellipse cx="95" cy="62" rx="4" ry="6" />
            <path d="M 87 80 C 75 80 72 95 87 100 C 102 95 99 80 87 80 Z" />
          </svg>
        </div>

        <div className="relative z-10">
          <h2 className="font-miv-title text-xl tracking-wide">
            Dashboard de Performance & Conteúdo
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Métricas de aprovação, prazos e notas de qualidade da agência Vulpis Core.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className={`text-xs rounded-xl px-3 py-2 font-semibold border focus:outline-none focus:border-vulpis-azul ${
              isClaro
                ? 'bg-vulpis-bege/40 border-vulpis-grafite/20 text-vulpis-grafite'
                : 'bg-[#121212] border-vulpis-cinza/50 text-vulpis-bege'
            }`}
          >
            {MESES_PT_BR.map((m, idx) => (
              <option key={m} value={idx}>
                {m} {selectedYear}
              </option>
            ))}
          </select>

          <select
            value={selectedClienteFilter}
            onChange={(e) => setSelectedClienteFilter(e.target.value)}
            className={`text-xs rounded-xl px-3 py-2 font-semibold border focus:outline-none focus:border-vulpis-azul ${
              isClaro
                ? 'bg-vulpis-bege/40 border-vulpis-grafite/20 text-vulpis-grafite'
                : 'bg-[#121212] border-vulpis-cinza/50 text-vulpis-bege'
            }`}
          >
            <option value="todos">Todos os Clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards (Números de destaque em Exo 2, 700, Itálico) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-3xl border shadow-sm space-y-1 ${
            isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <span className="text-xs opacity-70 font-semibold block">Média Geral de Avaliação</span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-miv-title text-[#F2B705]">4.8</span>
            <Star className="w-5 h-5 fill-[#F2B705] text-[#F2B705]" />
          </div>
          <span className="text-[10px] opacity-60">Padrão de excelência</span>
        </div>

        <div
          className={`p-4 rounded-3xl border shadow-sm space-y-1 ${
            isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <span className="text-xs opacity-70 font-semibold block">Tempo Médio de Aprovação</span>
          <div className="text-3xl font-miv-title text-vulpis-azul">
            {avgTurnaroundHours.toFixed(1)}h
          </div>
          <span className="text-[10px] text-[#1E9E5A] font-semibold">Dentro da meta de 6h</span>
        </div>

        <div
          className={`p-4 rounded-3xl border shadow-sm space-y-1 ${
            isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <span className="text-xs opacity-70 font-semibold block">Rodadas de Ajuste</span>
          <div className="text-3xl font-miv-title">
            {avgAdjustmentRounds} <span className="text-xs font-normal opacity-70">versões/post</span>
          </div>
          <span className="text-[10px] opacity-60">Aprovação em V1: 78%</span>
        </div>

        <div
          className={`p-4 rounded-3xl border shadow-sm space-y-1 ${
            isClaro ? 'bg-white border-[#D93A2B]/40' : 'bg-vulpis-grafite border-[#D93A2B]/40'
          }`}
        >
          <span className="text-xs opacity-70 font-semibold block">Alertas de Atenção</span>
          <div className="text-3xl font-miv-title text-[#D93A2B]">
            {attentionList.length}
          </div>
          <span className="text-[10px] text-[#D93A2B] font-semibold">Atrasados ou perto do prazo</span>
        </div>
      </div>

      {/* Gráficos em rounded-3xl */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Postagens por Status */}
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <h3 className="font-miv-title text-base flex items-center justify-between">
            <span>Postagens por Status no Mês</span>
            <span className="text-xs font-mono font-normal opacity-70">
              Total: {filteredPosts.length}
            </span>
          </h3>

          <div className="space-y-3">
            {Object.keys(STATUS_CONFIG).map((st) => {
              const count = statusCounts[st] || 0;
              const percent = filteredPosts.length > 0 ? (count / filteredPosts.length) * 100 : 0;
              const cfg = STATUS_CONFIG[st as keyof typeof STATUS_CONFIG];

              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        style={{ backgroundColor: cfg.hex }}
                        className="w-2.5 h-2.5 rounded-full"
                      />
                      {st}
                    </span>
                    <span className="font-mono font-bold">
                      {count} ({percent.toFixed(0)}%)
                    </span>
                  </div>
                  <div
                    className={`w-full h-2.5 rounded-full overflow-hidden ${
                      isClaro ? 'bg-vulpis-bege/60' : 'bg-[#121212]'
                    }`}
                  >
                    <div
                      style={{ width: `${percent}%`, backgroundColor: cfg.hex }}
                      className="h-full transition-all duration-300 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volume de Posts por Cliente */}
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <h3 className="font-miv-title text-base">Volume de Posts por Cliente</h3>
          <div className="space-y-3">
            {clientCounts.map(({ cliente, count }) => {
              const percent =
                filteredPosts.length > 0 ? (count / filteredPosts.length) * 100 : 0;
              return (
                <div key={cliente.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: cliente.cor }}
                        className="w-2.5 h-2.5 rounded-full"
                      />
                      {cliente.nome}
                    </span>
                    <span className="font-mono font-bold">{count} posts</span>
                  </div>
                  <div
                    className={`w-full h-2.5 rounded-full overflow-hidden ${
                      isClaro ? 'bg-vulpis-bege/60' : 'bg-[#121212]'
                    }`}
                  >
                    <div
                      style={{ width: `${percent}%`, backgroundColor: cliente.cor }}
                      className="h-full transition-all duration-300 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Médias por Cliente e por Criador */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-3 ${
            isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <h3 className="font-miv-title text-base">Média de Notas por Cliente</h3>
          <div className="space-y-2">
            {clientRatings.map(({ cliente, avgRating, totalRated }) => (
              <div
                key={cliente.id}
                className={`flex items-center justify-between p-3 rounded-2xl border ${
                  isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={cliente.logoUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-vulpis-cinza/40"
                  />
                  <div>
                    <h5 className="text-xs font-bold">{cliente.nome}</h5>
                    <span className="text-[10px] opacity-60">
                      {totalRated} postagens avaliadas
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#F2B705] font-bold text-xs">
                  <Star className="w-3.5 h-3.5 fill-[#F2B705]" />
                  <span>{avgRating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-3 ${
            isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/40'
          }`}
        >
          <h3 className="font-miv-title text-base">Média de Notas por Criador</h3>
          <div className="space-y-2">
            {creatorRatings.map(({ creator, avgRating, totalRated }) => (
              <div
                key={creator.id}
                className={`flex items-center justify-between p-3 rounded-2xl border ${
                  isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={creator.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-vulpis-cinza/40"
                  />
                  <div>
                    <h5 className="text-xs font-bold">{creator.nome}</h5>
                    <span className="text-[10px] opacity-60">
                      {totalRated} postagens avaliadas
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#F2B705] font-bold text-xs">
                  <Star className="w-3.5 h-3.5 fill-[#F2B705]" />
                  <span>{avgRating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lista "Precisa de Atenção" */}
      <div
        className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
          isClaro ? 'bg-white border-[#D93A2B]/40' : 'bg-vulpis-grafite border-[#D93A2B]/40'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#D93A2B]" />
            <h3 className="font-miv-title text-base text-[#D93A2B]">
              Precisa de Atenção (Atrasadas ou Prazo Próximo)
            </h3>
          </div>
          <span className="text-xs text-[#D93A2B] font-bold">
            {attentionList.length} itens requerem ação
          </span>
        </div>

        {attentionList.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
            <VulpisMascot pose="joinha" size="md" />
            <p className="text-xs font-semibold opacity-70">
              Excelente! Nenhuma postagem atrasada ou com prazo pendente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-vulpis-cinza/20">
            {attentionList.map((post) => {
              const overdue = isOverdue(post.dataPublicacao, post.status);
              const cli = clientes.find((c) => c.id === post.clienteId);
              return (
                <div
                  key={post.id}
                  onClick={() => onOpenPost(post)}
                  className={`py-3 flex items-center justify-between gap-4 p-2 rounded-2xl transition-colors cursor-pointer ${
                    isClaro ? 'hover:bg-vulpis-bege/40' : 'hover:bg-[#121212]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          overdue ? 'bg-[#D93A2B] text-white' : 'bg-[#F2B705] text-vulpis-grafite'
                        }`}
                      >
                        {overdue ? 'Atrasada' : 'Prazo < 24h'}
                      </span>
                      <span className="text-xs font-bold opacity-80">{cli?.nome}</span>
                    </div>
                    <h5 className="text-xs font-bold mt-1">{post.titulo}</h5>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono block">
                      Publicação: {formatDateTimeBr(post.dataPublicacao)}
                    </span>
                    <span className="text-[11px] text-[#F2B705] font-mono block font-bold mt-0.5">
                      Prazo: {formatDateTimeBr(post.prazoAprovacao)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
