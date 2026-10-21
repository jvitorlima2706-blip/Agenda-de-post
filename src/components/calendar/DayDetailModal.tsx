import React from 'react';
import { Postagem, Cliente, Usuario } from '../../types';
import { PostCard } from './PostCard';
import { X, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { formatDateBr } from '../../utils/dateUtils';
import { VulpisMascot } from '../common/VulpisMascot';

interface DayDetailModalProps {
  date: string;
  posts: Postagem[];
  clientes: Cliente[];
  currentUser: Usuario;
  onClose: () => void;
  onOpenPost: (post: Postagem) => void;
  onNewPostWithDate: (date: string) => void;
  tema?: 'claro' | 'escuro';
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  date,
  posts,
  clientes,
  currentUser,
  onClose,
  onOpenPost,
  onNewPostWithDate,
  tema = 'claro'
}) => {
  const getCliente = (id: string) => clientes.find((c) => c.id === id);
  const isClaro = tema === 'claro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
      <div
        className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border ${
          isClaro ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite' : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="w-5 h-5 text-vulpis-laranja" />
            <div>
              <h3 className="font-miv-title text-base">
                Postagens do Dia
              </h3>
              <p className="text-xs opacity-70 font-mono">{formatDateBr(date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNewPostWithDate(date)}
              className="px-3 py-1.5 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Postar neste dia
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {posts.length === 0 ? (
            <div className="text-center py-8 flex flex-col items-center justify-center space-y-2">
              <VulpisMascot pose="vazio" size="md" />
              <p className="text-xs font-semibold opacity-70">
                Nenhuma postagem agendada para este dia.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                cliente={getCliente(post.clienteId)}
                currentUser={currentUser}
                tema={tema}
                onOpen={(p) => {
                  onClose();
                  onOpenPost(p);
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
