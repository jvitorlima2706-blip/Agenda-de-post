import React from 'react';
import { Postagem, Cliente, Usuario } from '../../types';
import { formatTime24h, isOverdue } from '../../utils/dateUtils';
import { SocialIcon, FormatIcon } from '../../utils/socialIcons';
import { STATUS_CONFIG, StatusIcon } from '../../utils/statusConfig';
import { getYouTubeThumbnail, isYouTubeUrl } from '../../utils/mediaUtils';
import { Play, Star, AlertTriangle, MessageSquare, EyeOff, Sparkles, Clock, Lock } from 'lucide-react';
import { isPostHiddenForClient, getPostClientVisibilityInfo } from '../../utils/visibilityUtils';

interface PostCardProps {
  post: Postagem;
  cliente?: Cliente;
  currentUser: Usuario;
  onOpen: (post: Postagem) => void;
  tema?: 'claro' | 'escuro';
  compact?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  cliente,
  currentUser,
  onOpen,
  tema = 'claro',
  compact = false
}) => {
  const isClaro = tema === 'claro';
  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG['Rascunho'];
  const overdue = isOverdue(post.dataPublicacao, post.status);

  const currentVersao = post.versoes?.find((v) => v.numero === post.versaoAtual) || post.versoes?.[0];
  const rawMediaUrl = currentVersao?.midias?.[0]?.url;
  const ytThumb =
    getYouTubeThumbnail(currentVersao?.linkExterno || '') ||
    getYouTubeThumbnail(rawMediaUrl || '');
  const thumbUrl =
    currentVersao?.capaUrl ||
    ytThumb ||
    (currentVersao?.midias?.[0]?.tipo === 'imagem' ? rawMediaUrl : undefined);
  const isVideo =
    currentVersao?.midias?.[0]?.tipo === 'video' ||
    isYouTubeUrl(currentVersao?.linkExterno) ||
    isYouTubeUrl(rawMediaUrl) ||
    ['Reels', 'Shorts', 'Vídeo longo', 'TikTok'].includes(post.formato);

  const clientColor = cliente?.cor || '#F86904';
  const unresolvedComments = (post.comentarios || []).filter((c) => !c.resolvido).length;

  const isClientUser = currentUser.perfil === 'CLIENTE';
  const isHiddenForClient = isPostHiddenForClient(post, currentUser);
  const visInfo = getPostClientVisibilityInfo(post);

  const handleDragStart = (e: React.DragEvent) => {
    if (isClientUser || (post.status === 'Aprovado' && currentUser.perfil !== 'ADMINISTRADOR')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', post.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // RENDERIZAÇÃO EXCLUSIVA PARA CLIENTE QUANDO O POST ESTIVER OCULTO ("DISPONÍVEL EM BREVE")
  if (isClientUser && isHiddenForClient) {
    return (
      <div
        onClick={() => onOpen(post)}
        style={{
          borderLeftColor: clientColor
        }}
        className={`group relative text-left rounded-xl border border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden active:scale-[0.98] ${
          isClaro
            ? 'bg-gradient-to-br from-white to-[#F2B705]/5 border-[#F2B705]/40 text-vulpis-grafite hover:bg-vulpis-bege/40'
            : 'bg-gradient-to-br from-vulpis-grafite to-[#F2B705]/10 border-[#F2B705]/30 text-vulpis-bege hover:bg-vulpis-cinza/30'
        } ${compact ? 'p-1.5' : 'p-2.5'}`}
      >
        {/* Topo do card para o cliente */}
        <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-[10px] font-mono opacity-80">
              {formatTime24h(post.dataPublicacao)}
            </span>
            <div className="flex items-center gap-1">
              {post.redes.map((r) => (
                <span key={r} className="text-vulpis-azul" title={r}>
                  <SocialIcon rede={r} size={11} />
                </span>
              ))}
            </div>
          </div>

          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#F2B705]/20 text-[#B45309] border border-[#F2B705]/40 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Disponível em breve</span>
          </span>
        </div>

        {/* Corpo do card: Ícone + Título suave */}
        <div className="flex gap-2 items-center my-1">
          <div className="w-8 h-8 rounded-lg bg-[#F2B705]/15 border border-[#F2B705]/30 flex items-center justify-center flex-shrink-0 text-[#B45309]">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[11px] font-bold truncate">Conteúdo Programado</h4>
            <span className="text-[9px] opacity-75 block truncate">
              {post.formato} • Clique p/ ver agendamento
            </span>
          </div>
        </div>

        {/* Rodapé informativo */}
        <div className="mt-1 pt-1 border-t border-vulpis-cinza/20 text-[9px] flex items-center justify-between opacity-70">
          <span className="font-medium">Programado pela equipe</span>
          <span className="font-mono">Previsto</span>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={!isClientUser && (post.status !== 'Aprovado' || currentUser.perfil === 'ADMINISTRADOR')}
      onDragStart={handleDragStart}
      onClick={() => onOpen(post)}
      style={{
        borderLeftColor: clientColor
      }}
      className={`group relative text-left rounded-xl border border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden active:scale-[0.98] ${
        isClaro
          ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite hover:bg-vulpis-bege/30'
          : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege hover:bg-vulpis-cinza/30'
      } ${overdue ? 'ring-1 ring-[#D93A2B]' : ''} ${compact ? 'p-1.5' : 'p-2.5'}`}
    >
      {/* Topo do card: Horário 24h, Rede Social e Status */}
      <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-[10px] font-mono opacity-80">
            {formatTime24h(post.dataPublicacao)}
          </span>
          <div className="flex items-center gap-1">
            {post.redes.map((r) => (
              <span key={r} className="text-vulpis-azul" title={r}>
                <SocialIcon rede={r} size={11} />
              </span>
            ))}
          </div>
        </div>

        {/* Status com tag / bolinha e ícone próprio conforme 2.6 */}
        <div className="flex items-center gap-1">
          {overdue && (
            <span title="Postagem Atrasada" className="text-[#D93A2B]">
              <AlertTriangle className="w-3 h-3" />
            </span>
          )}
          <span
            style={{ backgroundColor: statusCfg.hex }}
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            title={post.status}
          />
        </div>
      </div>

      {/* Miniatura da mídia + Título */}
      <div className="flex gap-2 items-start">
        {thumbUrl ? (
          <div className="relative w-8 h-8 rounded-lg bg-black flex-shrink-0 overflow-hidden border border-vulpis-cinza/30">
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
            {isVideo && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Play className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </div>
        ) : (
          <div
            className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border ${
              isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/20 text-vulpis-grafite' : 'bg-[#121212] border-vulpis-cinza/40 text-vulpis-bege'
            }`}
          >
            <FormatIcon formato={post.formato} size={14} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h4
            className={`text-[11px] font-bold line-clamp-2 leading-tight ${
              post.status === 'Cancelado' ? 'line-through opacity-60' : ''
            }`}
          >
            {post.titulo}
          </h4>
          {cliente && (
            <span className="text-[9px] truncate block mt-0.5 font-medium opacity-70">
              {cliente.nome}
            </span>
          )}
        </div>
      </div>

      {/* Rodapé: Versão, Ajustes, Nota e Badge de Visibilidade do Cliente */}
      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-vulpis-cinza/20 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1 py-0.2 rounded font-mono text-[9px] border ${
              isClaro
                ? 'bg-vulpis-bege border-vulpis-grafite/20 text-vulpis-grafite'
                : 'bg-[#121212] border-vulpis-cinza/40 text-vulpis-bege'
            }`}
          >
            V{post.versaoAtual}
          </span>
          {unresolvedComments > 0 && (
            <span
              className="flex items-center gap-0.5 text-[#F2B705] font-bold"
              title={`${unresolvedComments} ajustes pendentes`}
            >
              <MessageSquare className="w-2.5 h-2.5" />
              {unresolvedComments}
            </span>
          )}

          {/* Badge de visibilidade para a equipe (Admin / Gestor / Criador) */}
          {!isClientUser && (
            <>
              {visInfo.status === 'oculto_manual' && (
                <span
                  className="px-1 py-0.2 rounded font-semibold text-[8px] bg-[#D93A2B]/15 text-[#D93A2B] border border-[#D93A2B]/30 flex items-center gap-0.5"
                  title="Oculto para o cliente: cliente vê apenas 'Disponível em breve'"
                >
                  <EyeOff className="w-2.5 h-2.5" />
                  <span>Oculto</span>
                </span>
              )}
              {visInfo.status === 'oculto_2semanas' && (
                <span
                  className="px-1 py-0.2 rounded font-semibold text-[8px] bg-[#F2B705]/15 text-[#B45309] border border-[#F2B705]/30 flex items-center gap-0.5"
                  title="Além de 2 semanas: cliente vê como 'Disponível em breve' pelo padrão do portal"
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>+2 sem</span>
                </span>
              )}
              {visInfo.status === 'liberado_manual' && (
                <span
                  className="px-1 py-0.2 rounded font-semibold text-[8px] bg-[#1E9E5A]/15 text-[#1E9E5A] border border-[#1E9E5A]/30 flex items-center gap-0.5"
                  title="Prévia liberada antecipadamente para o cliente"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Liberado</span>
                </span>
              )}
            </>
          )}
        </div>

        {post.status === 'Aprovado' && (
          <span className="text-[9px] font-bold text-[#1E9E5A]">Aprovado</span>
        )}
      </div>
    </div>
  );
};
