import React from 'react';
import { VulpisLogo } from '../common/VulpisLogo';
import { Usuario } from '../../types';
import {
  Calendar,
  LayoutDashboard,
  Building2,
  Users,
  FileDown,
  Shield,
  Sun,
  Moon,
  ExternalLink,
  FileText
} from 'lucide-react';

export type ActiveTab =
  | 'calendario'
  | 'roteiros'
  | 'portal'
  | 'dashboard'
  | 'clientes'
  | 'usuarios'
  | 'exportar';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: Usuario;
  totalPendingApproval: number;
  tema: 'claro' | 'escuro';
  onToggleTema: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  totalPendingApproval,
  tema,
  onToggleTema
}) => {
  const isClientProfile = currentUser.perfil === 'CLIENTE';

  const allNavItems = [
    {
      id: 'portal' as ActiveTab,
      label: isClientProfile ? 'Minha Agenda (Empresa)' : 'Portal do Cliente',
      icon: ExternalLink,
      badge: isClientProfile && totalPendingApproval > 0 ? totalPendingApproval : null,
      clientAllowed: true
    },
    {
      id: 'calendario' as ActiveTab,
      label: 'Calendário Geral',
      icon: Calendar,
      badge: !isClientProfile && totalPendingApproval > 0 ? totalPendingApproval : null,
      clientAllowed: false
    },
    {
      id: 'roteiros' as ActiveTab,
      label: isClientProfile ? 'Meus Roteiros & Ideias' : 'Roteiros & Ideias',
      icon: FileText,
      clientAllowed: true
    },
    {
      id: 'clientes' as ActiveTab,
      label: 'Empresas & Clientes',
      icon: Building2,
      clientAllowed: false
    },
    {
      id: 'usuarios' as ActiveTab,
      label: 'Equipe & Perfis',
      icon: Users,
      adminOnly: true,
      clientAllowed: false
    },
    {
      id: 'dashboard' as ActiveTab,
      label: 'Métricas & Dashboard',
      icon: LayoutDashboard,
      clientAllowed: false
    },
    {
      id: 'exportar' as ActiveTab,
      label: 'Exportar Relatório',
      icon: FileDown,
      clientAllowed: true
    }
  ];

  // Se for um usuário CLIENTE conectado, mostra apenas as abas permitidas ao cliente
  const navItems = isClientProfile
    ? allNavItems.filter((item) => item.clientAllowed)
    : allNavItems;

  return (
    <aside className="w-64 bg-[#121212] text-vulpis-bege border-r border-vulpis-cinza/40 flex flex-col justify-between hidden md:flex h-screen sticky top-0 z-40 select-none font-sans">
      {/* Top Section */}
      <div>
        {/* Logo Vulpis Core no topo com fundo preto (aprovado pelo MIV) */}
        <div className="h-20 px-4 border-b border-vulpis-cinza/30 flex items-center justify-start bg-[#121212]">
          <VulpisLogo variant="principal" size="md" theme="escuro" />
        </div>

        {/* Navigation list */}
        <div className="p-3 space-y-1.5 mt-2">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-vulpis-bege/60">
            {isClientProfile ? 'Portal do Cliente' : 'Navegação'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isRestricted = item.adminOnly && currentUser.perfil !== 'ADMINISTRADOR';

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isRestricted) setActiveTab(item.id);
                }}
                disabled={isRestricted}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                  isActive
                    ? 'bg-vulpis-laranja text-vulpis-grafite font-bold shadow-md'
                    : isRestricted
                    ? 'text-vulpis-bege/30 cursor-not-allowed'
                    : 'text-vulpis-bege hover:text-white hover:bg-vulpis-grafite/50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-vulpis-grafite' : 'text-vulpis-bege/70'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-vulpis-grafite text-vulpis-laranja'
                        : 'bg-vulpis-azul text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isRestricted && (
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-vulpis-grafite text-vulpis-bege/50 font-bold">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-vulpis-cinza/30 space-y-3 bg-[#121212]">
        {/* Botão Alternar Tema Claro / Escuro */}
        <button
          onClick={onToggleTema}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-vulpis-grafite/60 hover:bg-vulpis-grafite text-vulpis-bege text-xs font-medium border border-vulpis-cinza/40 transition-colors"
          title="Alternar entre Tema Claro e Tema Escuro"
        >
          <div className="flex items-center gap-2">
            {tema === 'claro' ? (
              <Sun className="w-4 h-4 text-[#F2B705]" />
            ) : (
              <Moon className="w-4 h-4 text-vulpis-azul" />
            )}
            <span>Tema: {tema === 'claro' ? 'Claro (Bege)' : 'Escuro (Preto)'}</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#121212] text-vulpis-bege">
            Mudar
          </span>
        </button>

        {/* Status de Sincronização */}
        <div className="p-2.5 rounded-xl bg-[#0e0e0e] border border-vulpis-cinza/30 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-vulpis-bege/70">Firestore Sync</span>
            <span className="inline-flex items-center gap-1.5 text-[#1E9E5A] font-bold text-[10px]">
              <span className="w-2 h-2 rounded-full bg-[#1E9E5A] animate-pulse" />
              Ao Vivo
            </span>
          </div>
          <div className="text-[10px] text-vulpis-bege/50 mt-1 font-mono">
            Fuso: America/Sao_Paulo (24h)
          </div>
        </div>

        {/* Usuário conectado */}
        <div className="flex items-center gap-2 px-1 text-xs text-vulpis-bege/80">
          <Shield className="w-3.5 h-3.5 text-vulpis-laranja flex-shrink-0" />
          <span className="truncate">
            Perfil: <strong className="text-vulpis-bege font-semibold">{currentUser.perfil}</strong>
          </span>
        </div>
      </div>
    </aside>
  );
};
