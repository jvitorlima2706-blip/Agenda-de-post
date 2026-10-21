import React, { useState } from 'react';
import { VulpisLogo } from '../common/VulpisLogo';
import { Usuario, Notificacao, Cliente } from '../../types';
import {
  Bell,
  Check,
  Plus,
  ChevronDown,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sun,
  Moon,
  LogOut,
  Shield
} from 'lucide-react';
import { formatDateTimeBr } from '../../utils/dateUtils';

interface NavbarProps {
  currentUser: Usuario;
  usuarios: Usuario[];
  onSelectUser: (user: Usuario) => void;
  onLogout?: () => void;
  notificacoes: Notificacao[];
  onMarkNotifRead: (id: string) => void;
  onMarkAllNotifsRead: () => void;
  onOpenPost: (postId: string) => void;
  onNewPost: () => void;
  clientes: Cliente[];
  selectedClienteId: string;
  onSelectClienteId: (id: string) => void;
  tema: 'claro' | 'escuro';
  onToggleTema: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  usuarios,
  onSelectUser,
  onLogout,
  notificacoes,
  onMarkNotifRead,
  onMarkAllNotifsRead,
  onOpenPost,
  onNewPost,
  clientes,
  selectedClienteId,
  onSelectClienteId,
  tema,
  onToggleTema
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const userNotifs = notificacoes.filter((n) => !n.userId || n.userId === currentUser.id);
  const unreadCount = userNotifs.filter((n) => !n.lida).length;

  const isClaro = tema === 'claro';

  const roleColors: Record<string, string> = {
    ADMINISTRADOR: 'bg-vulpis-azul text-white border-vulpis-azul',
    GESTOR: 'bg-[#F2B705] text-vulpis-grafite font-bold border-[#F2B705]',
    CRIADOR: 'bg-vulpis-cinza text-white border-vulpis-cinza',
    CLIENTE: 'bg-[#1E9E5A] text-white font-bold border-[#1E9E5A]'
  };

  // Filtra apenas as empresas que o usuário atual tem permissão para ver
  const accessibleClientes =
    currentUser.perfil === 'ADMINISTRADOR'
      ? clientes
      : clientes.filter(
          (c) =>
            currentUser.clientesIds?.includes(c.id) ||
            c.usuariosClientesIds?.includes(currentUser.id) ||
            c.gestoresIds?.includes(currentUser.id) ||
            c.criadoresIds?.includes(currentUser.id)
        );

  const canCreatePost =
    currentUser.perfil === 'ADMINISTRADOR' || currentUser.perfil === 'CRIADOR';

  return (
    <header
      className={`h-16 border-b sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between transition-colors ${
        isClaro
          ? 'bg-[#F9E8CE]/95 border-vulpis-grafite/20 text-vulpis-grafite'
          : 'bg-[#121212]/95 border-vulpis-cinza/40 text-vulpis-bege'
      } backdrop-blur-md`}
    >
      {/* Left: Brand logo for mobile & Client Filter */}
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <VulpisLogo variant="simbolo" size="sm" theme={tema} />
        </div>

        {/* Global Client Filter (Restrito às empresas associadas ao usuário) */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold hidden sm:inline ${isClaro ? 'text-vulpis-grafite' : 'text-vulpis-bege/70'}`}>
            {currentUser.perfil === 'CLIENTE' ? 'Minha Empresa:' : 'Empresa / Cliente:'}
          </span>
          {accessibleClientes.length === 1 && currentUser.perfil !== 'ADMINISTRADOR' ? (
            <div
              className={`text-xs sm:text-sm rounded-xl px-3 py-1.5 font-bold border flex items-center gap-2 ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                  : 'bg-vulpis-grafite border-vulpis-cinza/50 text-vulpis-bege'
              }`}
            >
              <span
                style={{ backgroundColor: accessibleClientes[0].cor }}
                className="w-2.5 h-2.5 rounded-full"
              />
              <span>{accessibleClientes[0].nome}</span>
            </div>
          ) : (
            <select
              value={selectedClienteId}
              onChange={(e) => onSelectClienteId(e.target.value)}
              className={`text-xs sm:text-sm rounded-xl px-3 py-1.5 font-medium border focus:outline-none focus:border-vulpis-azul ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                  : 'bg-vulpis-grafite border-vulpis-cinza/50 text-vulpis-bege'
              }`}
            >
              {currentUser.perfil === 'ADMINISTRADOR' && (
                <option value="todos">Todas as Empresas</option>
              )}
              {accessibleClientes.length > 1 && currentUser.perfil !== 'ADMINISTRADOR' && (
                <option value="todos">Minhas Empresas Associadas</option>
              )}
              {accessibleClientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Right: Actions, Notifications & Profile Switcher */}
      <div className="flex items-center gap-3">
        {/* Toggle Theme icon on mobile */}
        <button
          onClick={onToggleTema}
          className={`p-2 rounded-xl border transition-colors md:hidden ${
            isClaro
              ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
              : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
          }`}
          title="Alternar tema"
        >
          {isClaro ? <Moon className="w-4 h-4 text-vulpis-azul" /> : <Sun className="w-4 h-4 text-[#F2B705]" />}
        </button>

        {/* "+ Nova postagem" - Somente Admin e Criador */}
        {canCreatePost && (
          <button
            onClick={onNewPost}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Nova Postagem</span>
          </button>
        )}

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className={`relative p-2 rounded-xl border transition-colors ${
              isClaro
                ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite hover:bg-vulpis-bege/50'
                : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege hover:bg-vulpis-cinza/50'
            }`}
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-vulpis-laranja text-vulpis-grafite text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div
              className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden border animate-in fade-in-50 zoom-in-95 ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                  : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
              }`}
            >
              <div
                className={`p-3.5 border-b flex items-center justify-between ${
                  isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">Notificações</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-vulpis-laranja text-vulpis-grafite font-bold">
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllNotifsRead}
                    className="text-xs text-vulpis-azul hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Check className="w-3.5 h-3.5" /> Marcar lidas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-vulpis-cinza/20">
                {userNotifs.length === 0 ? (
                  <div className="p-6 text-center text-xs opacity-60">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  userNotifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        onMarkNotifRead(n.id);
                        if (n.postagemId) {
                          onOpenPost(n.postagemId);
                          setShowNotifDropdown(false);
                        }
                      }}
                      className={`p-3 text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                        !n.lida
                          ? isClaro
                            ? 'bg-vulpis-bege/60'
                            : 'bg-[#121212]/80'
                          : 'hover:bg-vulpis-cinza/10'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          !n.lida ? 'bg-vulpis-laranja' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`leading-snug ${!n.lida ? 'font-bold' : 'opacity-80'}`}>
                          {n.mensagem}
                        </p>
                        <span className="text-[10px] opacity-60 mt-1 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {formatDateTimeBr(n.criadoEm)}
                        </span>
                      </div>
                      {n.postagemId && <ExternalLink className="w-3.5 h-3.5 opacity-60 mt-0.5" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className={`flex items-center gap-2 p-1.5 rounded-2xl border transition-all text-left ${
              isClaro
                ? 'bg-white border-vulpis-grafite/20 hover:border-vulpis-grafite/40'
                : 'bg-vulpis-grafite border-vulpis-cinza/40 hover:border-vulpis-cinza'
            }`}
          >
            <img
              src={
                currentUser.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.nome)}`
              }
              alt={currentUser.nome}
              className="w-8 h-8 rounded-full object-cover border border-vulpis-cinza/50"
            />
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold leading-tight truncate max-w-[130px]">
                {currentUser.nome}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border w-fit mt-0.5 ${
                  roleColors[currentUser.perfil] || 'bg-vulpis-cinza text-white'
                }`}
              >
                {currentUser.perfil}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {/* User switcher dropdown */}
          {showUserDropdown && (
            <div
              className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl z-50 overflow-hidden border animate-in fade-in-50 zoom-in-95 ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                  : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
              }`}
            >
              {currentUser.perfil === 'CLIENTE' ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        currentUser.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.nome)}`
                      }
                      alt={currentUser.nome}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#1E9E5A]"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{currentUser.nome}</div>
                      <div className="text-[10px] opacity-70 font-mono truncate">{currentUser.email}</div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#1E9E5A] text-white uppercase mt-0.5 inline-block">
                        PERFIL CLIENTE
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl text-[11px] space-y-1 border ${
                      isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/30'
                    }`}
                  >
                    <div className="font-bold text-[10px] uppercase opacity-75">
                      Empresa Vinculada:
                    </div>
                    <div className="font-semibold text-vulpis-laranja">
                      {accessibleClientes.map((c) => c.nome).join(', ') || 'Empresa Cadastrada'}
                    </div>
                    <p className="text-[10px] opacity-70 pt-0.5">
                      Suas permissões estão restritas à visualização da agenda e aprovação de conteúdos desta empresa.
                    </p>
                  </div>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#D93A2B] hover:bg-[#b82e21] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da Conta (Logout)</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className={`p-3 border-b ${
                      isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider block">
                      Painel do Administrador Principal
                    </span>
                    <p className="text-[11px] opacity-70 mt-0.5">
                      Você está conectado como Administrador Geral da Vulpis Core.
                    </p>
                  </div>

                  <div className="p-1 max-h-64 overflow-y-auto">
                    {usuarios.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                          u.id === currentUser.id
                            ? 'bg-vulpis-azul/15 font-bold text-vulpis-azul'
                            : 'hover:bg-vulpis-cinza/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={
                              u.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.nome)}`
                            }
                            alt={u.nome}
                            className="w-7 h-7 rounded-full object-cover border border-vulpis-cinza/40 flex-shrink-0"
                          />
                          <div className="text-left truncate">
                            <div className="font-semibold truncate">{u.nome}</div>
                            <div className="text-[10px] opacity-60 truncate font-mono">{u.email}</div>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ml-2 flex-shrink-0 ${
                            roleColors[u.perfil]
                          }`}
                        >
                          {u.perfil}
                        </span>
                      </button>
                    ))}
                  </div>

                  {onLogout && (
                    <div className="p-2 border-t border-vulpis-cinza/20">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair / Tela de Validação &amp; Senha</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              <div
                className={`p-2.5 border-t text-[10px] flex items-center gap-1.5 ${
                  isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-vulpis-azul flex-shrink-0" />
                Segurança ABAC &amp; RBAC no Firestore.
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
