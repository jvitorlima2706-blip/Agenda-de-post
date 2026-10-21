import React, { useState } from 'react';
import { MidiaItem, Comentario, Usuario } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';

interface CarouselReviewerProps {
  midias: MidiaItem[];
  comentarios: Comentario[];
  versaoNumero: number;
  currentUser: Usuario;
  isApproved?: boolean;
  onAddComment: (commentData: Omit<Comentario, 'id' | 'resolvido' | 'criadoEm'>) => Promise<void>;
  onResolveComment: (commentId: string, resposta?: string) => Promise<void>;
}

export const CarouselReviewer: React.FC<CarouselReviewerProps> = ({
  midias,
  comentarios,
  versaoNumero,
  currentUser,
  isApproved = false,
  onAddComment,
  onResolveComment
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const currentMedia = midias[activeSlideIndex] || midias[0];

  const slideComments = comentarios.filter(
    (c) => c.versao === versaoNumero && c.tipo === 'slide' && c.slideIndex === activeSlideIndex
  );

  const prevSlide = () => {
    setActiveSlideIndex((prev) => (prev > 0 ? prev - 1 : midias.length - 1));
  };

  const nextSlide = () => {
    setActiveSlideIndex((prev) => (prev < midias.length - 1 ? prev + 1 : 0));
  };

  const handleAddSlideComment = async () => {
    if (!commentText.trim()) return;
    await onAddComment({
      versao: versaoNumero,
      tipo: 'slide',
      slideIndex: activeSlideIndex,
      texto: commentText.trim(),
      autorId: currentUser.id,
      autorNome: currentUser.nome
    });
    setCommentText('');
    setIsCommenting(false);
  };

  const handleResolve = async (commentId: string) => {
    await onResolveComment(commentId, replyText.trim() || undefined);
    setReplyingCommentId(null);
    setReplyText('');
  };

  if (!midias || midias.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
        Nenhuma imagem cadastrada no carrossel.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Carousel Main Viewer */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col items-center">
        <div className="relative w-full aspect-square sm:aspect-4/5 max-h-[500px] flex items-center justify-center bg-slate-900">
          <img
            src={currentMedia?.url}
            alt={`Slide ${activeSlideIndex + 1}`}
            className="w-full h-full object-contain"
          />

          {/* Slide Indicator Badge */}
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold border border-white/10">
            Slide {activeSlideIndex + 1} de {midias.length}
          </div>

          {/* Navigation Arrows */}
          {midias.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-lg active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-lg active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Dots / Strip */}
        <div className="w-full p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {midias.map((m, idx) => {
              const hasSlideComments = comentarios.some(
                (c) => c.versao === versaoNumero && c.tipo === 'slide' && c.slideIndex === idx && !c.resolvido
              );
              return (
                <button
                  key={idx}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    idx === activeSlideIndex
                      ? 'border-vulpis-primary scale-105 shadow-md shadow-vulpis-primary/30'
                      : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] font-bold text-white px-1">
                    {idx + 1}
                  </span>
                  {hasSlideComments && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Comment on current slide button */}
          {!isApproved && (
            <button
              onClick={() => setIsCommenting(!isCommenting)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vulpis-primary text-white font-semibold hover:bg-vulpis-primary-hover text-xs shadow-md transition-all active:scale-95 flex-shrink-0 ml-2"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Comentar no Slide {activeSlideIndex + 1}</span>
            </button>
          )}
        </div>
      </div>

      {/* New comment on slide */}
      {isCommenting && !isApproved && (
        <div className="p-4 rounded-xl bg-slate-850 border border-vulpis-primary/40 shadow-xl space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              Novo apontamento no <strong className="text-vulpis-primary">Slide {activeSlideIndex + 1}</strong>:
            </span>
            <button onClick={() => setIsCommenting(false)} className="text-xs text-slate-400 hover:text-white">
              Cancelar
            </button>
          </div>
          <textarea
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={`Descreva o que alterar no Slide ${activeSlideIndex + 1} (ex: trocar foto, alterar cor da fonte, revisar ortografia)...`}
            className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-vulpis-primary resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCommenting(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Descartar
            </button>
            <button
              onClick={handleAddSlideComment}
              disabled={!commentText.trim()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-vulpis-primary hover:bg-vulpis-primary-hover text-white disabled:opacity-50 transition-all shadow-sm"
            >
              Salvar Apontamento
            </button>
          </div>
        </div>
      )}

      {/* Comments for the active slide */}
      <div className="space-y-2">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Apontamentos no Slide {activeSlideIndex + 1} ({slideComments.length})
        </h5>

        {slideComments.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-500">
            Nenhuma observação cadastrada para este slide.
          </div>
        ) : (
          <div className="space-y-2">
            {slideComments.map((com) => (
              <div
                key={com.id}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  com.resolvido
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-300'
                    : 'bg-slate-850 border-slate-750 text-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
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

                  {!com.resolvido && currentUser.perfil !== 'CLIENTE' && (
                    <button
                      onClick={() => setReplyingCommentId(replyingCommentId === com.id ? null : com.id)}
                      className="text-[11px] text-vulpis-primary hover:underline font-semibold flex-shrink-0"
                    >
                      Resolver
                    </button>
                  )}
                </div>

                {com.resposta && (
                  <div className="mt-2.5 pl-3 border-l-2 border-emerald-500/50 text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-r-lg">
                    <span className="font-semibold text-emerald-400">Resposta:</span> {com.resposta}
                  </div>
                )}

                {replyingCommentId === com.id && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    <input
                      type="text"
                      placeholder="Explique a alteração feita neste slide..."
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
                        onClick={() => handleResolve(com.id)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Marcar Resolvido
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
