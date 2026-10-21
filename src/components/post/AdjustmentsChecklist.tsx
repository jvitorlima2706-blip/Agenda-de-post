import React, { useState } from 'react';
import { Comentario, Usuario } from '../../types';
import { formatSecondsToTimecode } from '../../utils/dateUtils';
import { CheckCircle2, Circle, Clock, MessageSquare, AlertCircle } from 'lucide-react';

interface AdjustmentsChecklistProps {
  comentarios: Comentario[];
  versaoNumero: number;
  currentUser: Usuario;
  onResolveComment: (commentId: string, resposta?: string) => Promise<void>;
  onUnresolveComment: (commentId: string) => Promise<void>;
  justificativaPendentes: string;
  setJustificativaPendentes: (val: string) => void;
}

export const AdjustmentsChecklist: React.FC<AdjustmentsChecklistProps> = ({
  comentarios,
  versaoNumero,
  currentUser,
  onResolveComment,
  onUnresolveComment,
  justificativaPendentes,
  setJustificativaPendentes
}) => {
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const currentComments = comentarios.filter((c) => c.versao === versaoNumero);
  const unresolvedCount = currentComments.filter((c) => !c.resolvido).length;
  const isAllResolved = currentComments.length > 0 && unresolvedCount === 0;

  const isClientProfile = currentUser.perfil === 'CLIENTE';

  const handleToggle = async (c: Comentario) => {
    if (isClientProfile) return;
    if (c.resolvido) {
      await onUnresolveComment(c.id);
    } else {
      setActiveReplyId(c.id);
    }
  };

  const submitResolution = async (commentId: string) => {
    await onResolveComment(commentId, replyText.trim() || undefined);
    setActiveReplyId(null);
    setReplyText('');
  };

  if (currentComments.length === 0) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Checklist de Ajustes Solicitados
          </h4>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isAllResolved
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                : 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
            }`}
          >
            {isAllResolved ? 'Todos Resolvidos ✓' : `${unresolvedCount} pendente(s)`}
          </span>
        </div>
      </div>

      {/* List of items */}
      <div className="space-y-2">
        {currentComments.map((com) => (
          <div
            key={com.id}
            className={`p-3 rounded-xl border text-xs transition-all ${
              com.resolvido
                ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-300'
                : 'bg-slate-850 border-amber-900/30 text-slate-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => handleToggle(com)}
                className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-white transition-colors"
              >
                {com.resolvido ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-amber-400" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{com.autorNome}</span>
                  {com.tipo === 'video' && com.tempoSegundos !== undefined && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-vulpis-primary font-mono text-[10px] border border-slate-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatSecondsToTimecode(com.tempoSegundos)}
                    </span>
                  )}
                  {com.tipo === 'slide' && com.slideIndex !== undefined && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 font-mono text-[10px] border border-slate-700">
                      Slide {com.slideIndex + 1}
                    </span>
                  )}
                  {com.tipo === 'legenda' && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-purple-400 text-[10px] border border-slate-700">
                      Legenda
                    </span>
                  )}
                </div>

                <p className="mt-1 text-slate-200 leading-relaxed">{com.texto}</p>

                {com.resposta && (
                  <div className="mt-2 text-[11px] text-emerald-400 bg-slate-900/60 p-2 rounded border border-emerald-900/30">
                    <strong>Resposta:</strong> {com.resposta}
                  </div>
                )}
              </div>
            </div>

            {/* Response dialog */}
            {activeReplyId === com.id && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                <p className="text-[11px] text-slate-400">
                  Descreva o que foi alterado para resolver esta observação:
                </p>
                <input
                  type="text"
                  placeholder="Ex: Trecho regravado / Transição ajustada..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full text-xs p-2 rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setActiveReplyId(null)}
                    className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => submitResolution(com.id)}
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
                  >
                    Confirmar Resolução
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Justificativa para pendentes se houver (somente equipe interna) */}
      {unresolvedCount > 0 && !isClientProfile && (
        <div className="pt-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Justificativa para itens não resolvidos (obrigatória para reenvio):
          </div>
          <textarea
            rows={2}
            value={justificativaPendentes}
            onChange={(e) => setJustificativaPendentes(e.target.value)}
            placeholder="Caso algum ajuste não tenha sido acatado, justifique tecnicamente para a aprovação do gestor..."
            className="w-full text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
      )}
    </div>
  );
};
