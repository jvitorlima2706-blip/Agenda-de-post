import { Cliente, Usuario, Postagem, LogAuditoria, Notificacao } from '../types';

export const SEED_USUARIOS: Usuario[] = [
  // Único perfil mantido: Administrador Principal Vulpis
  {
    id: 'user-admin',
    nome: 'Carlos Silva (Administrador Principal)',
    email: 'j.vitorlima2706@gmail.com',
    senha: 'admin123',
    perfil: 'ADMINISTRADOR',
    clientesIds: [],
    ativo: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    criadoEm: '2026-09-01T10:00:00'
  }
];

export const SEED_CLIENTES: Cliente[] = [];

export const SEED_POSTAGENS: Postagem[] = [];

export const SEED_NOTIFICACOES: Notificacao[] = [];

export const SEED_LOGS: LogAuditoria[] = [];
