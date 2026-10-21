import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ReopenModalProps {
  postTitle: string;
  onConfirm: (motivo: string) => Promise<void>;
  onClose: () => void;
}

export const ReopenModal: React.FC<ReopenModalProps> = ({
  postTitle,
  onConfirm,
  onClose
}) => {
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm(motivo.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">
                Reabrir Postagem Aprovada
              </h3>
              <p className="text-xs text-rose-300 font-medium">Ação restrita ao Administrador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Esta postagem foi previamente aprovada. Ao reabri-la, ela retornará para o status{' '}
          <strong className="text-rose-400">"Ajustes solicitados"</strong> e destrancará a edição
          para o criador. O motivo informado será registrado permanentemente no histórico de auditoria.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo da reabertura <span className="text-rose-400">*</span>:
            </label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Cliente solicitou alteração na data de lançamento / Nova promoção aprovada..."
              className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!motivo.trim() || isSubmitting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              {isSubmitting ? 'Registrando...' : 'Confirmar Reabertura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
