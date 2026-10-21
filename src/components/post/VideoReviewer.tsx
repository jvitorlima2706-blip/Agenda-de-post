import React, { useRef, useState } from 'react';
import { Comentario, Usuario } from '../../types';
import { formatSecondsToTimecode } from '../../utils/dateUtils';
import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail
} from '../../utils/mediaUtils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  MessageSquarePlus,
  Clock,
  CheckCircle2,
  ExternalLink,
  Youtube,
  Image as ImageIcon
} from 'lucide-react';

interface VideoReviewerProps {
  videoUrl?: string;
  externalLink?: string;
  capaUrl?: string;
  comentarios: Comentario[];
  versaoNumero: number;
  currentUser: Usuario;
  isApproved?: boolean;
  onAddComment: (commentData: Omit<Comentario, 'id' | 'resolvido' | 'criadoEm'>) => Promise<void>;
  onResolveComment: (commentId: string, resposta?: string) => Promise<void>;
}

export const VideoReviewer: React.FC<VideoReviewerProps> = ({
  videoUrl,
  externalLink,
  capaUrl,
  comentarios,
  versaoNumero,
  currentUser,
  isApproved = false,
  onAddComment,
  onResolveComment
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [youtubeStartSeconds, setYoutubeStartSeconds] = useState<number>(0);
  const [showThumbModal, setShowThumbModal] = useState(false);

  // New comment state
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentTime, setCommentTime] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply state
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Detecta se é vídeo do YouTube (Não listado ou público) em videoUrl ou externalLink
  const rawYouTubeUrl =
    extractYouTubeId(videoUrl) ? videoUrl : extractYouTubeId(externalLink) ? externalLink : undefined;
  const youtubeId = extractYouTubeId(rawYouTubeUrl);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(rawYouTubeUrl, youtubeStartSeconds);
  const effectiveThumbUrl = capaUrl || (rawYouTubeUrl ? getYouTubeThumbnail(rawYouTubeUrl, 'hqdefault') || undefined : undefined);

  const isNativeVideo = Boolean(videoUrl && !extractYouTubeId(videoUrl));

  // Filter comments for current version & video
  const videoComments = comentarios.filter(
    (c) => c.versao === versaoNumero && c.tipo === 'video'
  );

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const seekTo = (seconds: number) => {
    if (youtubeId) {
      setYoutubeStartSeconds(seconds);
      setCurrentTime(seconds);
      return;
    }
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const handleCommentAtCurrentTime = () => {
    if (isNativeVideo && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      setCommentTime(Math.floor(videoRef.current.currentTime));
    } else {
      setCommentTime(Math.floor(currentTime) || 0);
    }
    setIsCommenting(true);
  };

  const submitComment = async () => {
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddComment({
        versao: versaoNumero,
        tipo: 'video',
        tempoSegundos: commentTime,
        texto: commentText.trim(),
        autorId: currentUser.id,
        autorNome: currentUser.nome
      });
      setCommentText('');
      setIsCommenting(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveWithReply = async (commentId: string) => {
    await onResolveComment(commentId, replyText.trim() || undefined);
    setReplyingCommentId(null);
    setReplyText('');
  };

  return (
    <div className="space-y-4">
      {/* Video Player Box */}
      <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
        {youtubeEmbedUrl ? (
          /* PLAYER INTEGRADO DO YOUTUBE (NÃO LISTADO / PÚBLICO) */
          <div className="w-full flex flex-col">
            <div className="px-4 py-2 bg-[#121212] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-[#FF0000]" />
                <span className="font-bold">Vídeo do YouTube (Não Listado)</span>
              </div>
              <div className="flex items-center gap-3">
                {effectiveThumbUrl && (
                  <button
                    type="button"
                    onClick={() => setShowThumbModal(!showThumbModal)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-vulpis-bege flex items-center gap-1 font-semibold transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-vulpis-laranja" />
                    <span>{showThumbModal ? 'Voltar ao Player' : 'Ver Miniatura do Cliente'}</span>
                  </button>
                )}
                <a
                  href={rawYouTubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-vulpis-azul hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Abrir no YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {showThumbModal && effectiveThumbUrl ? (
              <div className="relative w-full aspect-video bg-black flex flex-col items-center justify-center p-4">
                <img
                  src={effectiveThumbUrl}
                  alt="Miniatura para o cliente"
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                />
                <span className="mt-2 text-[11px] text-vulpis-bege bg-black/80 px-3 py-1 rounded-full border border-white/15">
                  Miniatura de visualização para o cliente
                </span>
              </div>
            ) : (
              <div className="relative w-full aspect-video bg-black">
                <iframe
                  key={youtubeEmbedUrl}
                  src={youtubeEmbedUrl}
                  title="YouTube video player"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        ) : isNativeVideo && videoUrl ? (
          /* PLAYER NATIVO PARA ARQUIVO .MP4 */
          <div className="w-full flex flex-col">
            {effectiveThumbUrl && (
              <div className="px-4 py-2 bg-[#121212] border-b border-slate-800 flex items-center justify-between text-xs text-white">
                <span className="font-semibold text-slate-300">Arquivo de Vídeo MP4</span>
                <button
                  type="button"
                  onClick={() => setShowThumbModal(!showThumbModal)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-vulpis-bege flex items-center gap-1 font-semibold transition-all"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-vulpis-laranja" />
                  <span>{showThumbModal ? 'Voltar ao Vídeo MP4' : 'Ver Miniatura do Cliente'}</span>
                </button>
              </div>
            )}

            {showThumbModal && effectiveThumbUrl ? (
              <div className="relative w-full aspect-video bg-black flex flex-col items-center justify-center p-4">
                <img
                  src={effectiveThumbUrl}
                  alt="Miniatura para o cliente"
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                />
                <span className="mt-2 text-[11px] text-vulpis-bege bg-black/80 px-3 py-1 rounded-full border border-white/15">
                  Miniatura de visualização para o cliente
                </span>
              </div>
            ) : (
              <div className="relative w-full aspect-video sm:aspect-16/9 bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  poster={effectiveThumbUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  onClick={togglePlay}
                  muted={isMuted}
                  className="w-full h-full object-contain cursor-pointer"
                />

                {/* Custom Center Play Button when paused */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-vulpis-primary/90 hover:bg-vulpis-primary text-white flex items-center justify-center shadow-xl backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                  >
                    <Play className="w-8 h-8 fill-white ml-1" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : externalLink ? (
          <div className="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center p-6 text-center relative">
            {effectiveThumbUrl && (
              <img
                src={effectiveThumbUrl}
                alt="Miniatura"
                className="w-40 h-24 object-cover rounded-xl mb-3 border border-white/20 shadow-md"
              />
            )}
            <ExternalLink className="w-10 h-10 text-vulpis-primary mb-2" />
            <h4 className="font-semibold text-white text-base">Mídia Hospedada Externamente</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              O arquivo foi enviado via link externo para revisão.
            </p>
            <a
              href={externalLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 px-4 py-2 rounded-lg bg-vulpis-primary text-white text-xs font-semibold hover:bg-vulpis-primary-hover flex items-center gap-1.5 transition-all shadow-md"
            >
              Abrir Arquivo Externo <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : effectiveThumbUrl ? (
          <div className="w-full aspect-video bg-slate-950 flex flex-col items-center justify-center p-4">
            <img
              src={effectiveThumbUrl}
              alt="Miniatura da postagem"
              className="max-h-full max-w-full object-contain rounded-xl"
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-500">
            Nenhum vídeo MP4 ou link do YouTube anexado a esta versão.
          </div>
        )}

        {/* Video Scrubber & Controls (Only if native MP4 video exists) */}
        {isNativeVideo && videoUrl && !showThumbModal && (
          <div className="w-full bg-slate-950/90 border-t border-slate-800 p-3 space-y-2">
            {/* Timeline with Comment Markers */}
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-vulpis-primary"
              />

              {/* Pin markers on timeline */}
              {duration > 0 &&
                videoComments.map((com) => {
                  if (com.tempoSegundos === undefined) return null;
                  const leftPercent = (com.tempoSegundos / duration) * 100;
                  return (
                    <button
                      key={com.id}
                      onClick={() => seekTo(com.tempoSegundos!)}
                      style={{ left: `${Math.min(99, Math.max(1, leftPercent))}%` }}
                      title={`${formatSecondsToTimecode(com.tempoSegundos)}: ${com.texto}`}
                      className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-slate-950 transition-transform hover:scale-150 ${
                        com.resolvido ? 'bg-emerald-500' : 'bg-vulpis-primary animate-pulse'
                      }`}
                    />
                  );
                })}
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1 rounded hover:bg-slate-800 text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-mono text-slate-400 text-[11px]">
                  {formatSecondsToTimecode(currentTime)} / {formatSecondsToTimecode(duration)}
                </span>
              </div>

              {/* "Comentar neste momento" Button */}
              {!isApproved && (
                <button
                  onClick={handleCommentAtCurrentTime}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vulpis-primary text-white font-semibold hover:bg-vulpis-primary-hover shadow-sm active:scale-95 transition-all text-xs"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>Comentar neste momento ({formatSecondsToTimecode(currentTime)})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card da Miniatura para o Cliente + botão de comentar se for YouTube ou Link Externo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {effectiveThumbUrl ? (
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white">
            <img
              src={effectiveThumbUrl}
              alt="Miniatura para o cliente"
              onClick={() => setShowThumbModal(!showThumbModal)}
              className="w-16 h-11 rounded-lg object-cover border border-white/20 cursor-pointer hover:opacity-90"
            />
            <div className="text-xs">
              <span className="font-bold block text-vulpis-bege">Miniatura para o Cliente</span>
              <span className="text-[10px] text-slate-400">
                Clique na imagem para ampliar a capa do vídeo
              </span>
            </div>
          </div>
        ) : (
          <div />
        )}

        {!isNativeVideo && !isApproved && (
          <button
            onClick={handleCommentAtCurrentTime}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-vulpis-primary text-white font-semibold hover:bg-vulpis-primary-hover shadow-sm active:scale-95 transition-all text-xs"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Adicionar Observação com Minutagem</span>
          </button>
        )}
      </div>

      {/* Comment Creation Box Modal/Card */}
      {isCommenting && !isApproved && (
        <div className="p-4 rounded-xl bg-slate-850 border border-vulpis-primary/40 shadow-xl space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-vulpis-primary" />
              Comentário no minuto (segundos):{' '}
              {isNativeVideo ? (
                <span className="font-mono font-bold text-vulpis-primary bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {formatSecondsToTimecode(commentTime)}
                </span>
              ) : (
                <input
                  type="number"
                  min={0}
                  placeholder="Segundos (ex: 35)"
                  value={commentTime || ''}
                  onChange={(e) => setCommentTime(parseInt(e.target.value) || 0)}
                  className="w-24 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                />
              )}
            </span>
            <button
              onClick={() => setIsCommenting(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <textarea
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Descreva exatamente o que precisa ser ajustado ou melhorado neste ponto do vídeo..."
            className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-vulpis-primary resize-none"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCommenting(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-medium"
            >
              Descartar
            </button>
            <button
              onClick={submitComment}
              disabled={!commentText.trim() || isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-vulpis-primary hover:bg-vulpis-primary-hover text-white disabled:opacity-50 transition-all shadow-sm"
            >
              Salvar Comentário
            </button>
          </div>
        </div>
      )}

      {/* List of Timecoded Comments for this video */}
      <div className="space-y-2">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Comentários na Linha do Tempo ({videoComments.length})</span>
          <span className="text-[10px] lowercase font-normal text-slate-500">
            Clique no tempo para pular o vídeo
          </span>
        </h5>

        {videoComments.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-500">
            Nenhum apontamento feito neste vídeo até o momento.
          </div>
        ) : (
          <div className="space-y-2">
            {videoComments.map((com) => (
              <div
                key={com.id}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  com.resolvido
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-300'
                    : 'bg-slate-850 border-slate-750 text-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {/* Clickable time badge */}
                    <button
                      onClick={() => com.tempoSegundos !== undefined && seekTo(com.tempoSegundos)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-vulpis-primary text-vulpis-primary hover:text-white font-mono font-bold text-[11px] border border-slate-700 transition-colors flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" />
                      {formatSecondsToTimecode(com.tempoSegundos || 0)}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{com.autorNome}</span>
                        {com.resolvido && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Resolvido
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-slate-300 leading-relaxed">{com.texto}</p>
                    </div>
                  </div>

                  {/* Resolve action for creator / admin */}
                  {!com.resolvido && currentUser.perfil !== 'CLIENTE' && (
                    <button
                      onClick={() => setReplyingCommentId(replyingCommentId === com.id ? null : com.id)}
                      className="text-[11px] text-vulpis-primary hover:underline font-semibold flex-shrink-0"
                    >
                      Resolver Ajuste
                    </button>
                  )}
                </div>

                {/* Creator's reply if exists */}
                {com.resposta && (
                  <div className="mt-2.5 pl-3 border-l-2 border-emerald-500/50 text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-r-lg">
                    <span className="font-semibold text-emerald-400">
                      Resposta de {com.respondidoPor || 'Criador'}:
                    </span>{' '}
                    {com.resposta}
                  </div>
                )}

                {/* Reply form */}
                {replyingCommentId === com.id && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    <input
                      type="text"
                      placeholder="Explique como foi corrigido (ex: transição suavizada e volume equalizado)..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full text-xs p-2 rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingCommentId(null)}
                        className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleResolveWithReply(com.id)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Marcar como Resolvido
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
