export type PerfilUsuario = 'ADMINISTRADOR' | 'GESTOR' | 'CRIADOR' | 'CLIENTE';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  perfil: PerfilUsuario;
  clientesIds: string[];
  ativo: boolean;
  tema?: 'claro' | 'escuro';
  avatarUrl?: string;
  ultimoEmailEnviadoEm?: string;
  tipoUltimoEmail?: 'acesso' | 'redefinicao';
  codigoRecuperacao?: string;
  cargo?: string;
  criadoEm: string;
}

export type RedeSocial = 'Instagram' | 'TikTok' | 'YouTube' | 'LinkedIn' | 'Facebook';

export interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
  segmento?: string;
  responsavelContato?: string;
  logoUrl: string;
  cor: string;
  redes: RedeSocial[];
  criadoresIds: string[];
  gestoresIds: string[];
  usuariosClientesIds?: string[];
  briefing: string;
  emailAcesso?: string;
  senhaAcesso?: string;
  linkAcesso?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export type StatusPostagem =
  | 'Rascunho'
  | 'Em produção'
  | 'Aguardando aprovação'
  | 'Ajustes solicitados'
  | 'Aprovado'
  | 'Agendado'
  | 'Publicado'
  | 'Cancelado';

export type FormatoPostagem =
  | 'Reels'
  | 'Feed'
  | 'Carrossel'
  | 'Stories'
  | 'Shorts'
  | 'Vídeo longo'
  | 'TikTok';

export interface MidiaItem {
  url: string;
  tipo: 'imagem' | 'video';
  ordem: number;
  nomeArquivo?: string;
}

export interface Versao {
  id: string;
  numero: number;
  midias: MidiaItem[];
  capaUrl?: string;
  linkExterno?: string;
  criadoEm: string;
  nota?: number;
  observacaoGeral?: string;
}

export type TipoComentario = 'video' | 'slide' | 'legenda' | 'geral';

export interface Comentario {
  id: string;
  postagemId?: string;
  versao: number;
  tipo: TipoComentario;
  tempoSegundos?: number;
  slideIndex?: number;
  texto: string;
  autorId: string;
  autorNome: string;
  resolvido: boolean;
  resposta?: string;
  respondidoPor?: string;
  respondidoEm?: string;
  criadoEm: string;
}

export interface RoteiroLembrete {
  id: string;
  texto: string;
  cor?: 'amarelo' | 'laranja' | 'azul' | 'verde';
  concluido: boolean;
  criadoEm: string;
}

export interface Postagem {
  id: string;
  clienteId: string;
  titulo: string;
  dataPublicacao: string; // ISO string YYYY-MM-DDTHH:mm
  redes: RedeSocial[];
  formato: FormatoPostagem;
  legenda: string;
  hashtags: string;
  cta: string;
  criadorId: string;
  gestorId: string;
  prazoAprovacao: string;
  status: StatusPostagem;
  versaoAtual: number;
  nota?: number; // 1 to 5
  observacoes?: string;
  roteiro?: string;
  roteiroNotepad?: string;
  roteiroLembretes?: RoteiroLembrete[];
  roteiroArquivoNome?: string;
  roteiroArquivoUrl?: string;
  ocultarParaCliente?: boolean; // Se true, o cliente vê apenas 'Disponível em breve'. Se false, liberado antecipadamente mesmo além de 2 semanas. Se undefined, regra padrão de 2 semanas.
  enviadoEm?: string;
  aprovadoEm?: string;
  linkPublicado?: string;
  dataPublicadoReal?: string;
  criadoEm: string;
  atualizadoEm: string;
  versoes?: Versao[];
  comentarios?: Comentario[];
}

export type TipoNotificacao =
  | 'enviado_aprovacao'
  | 'aprovado'
  | 'ajustes_solicitados'
  | 'novo_comentario'
  | 'prazo_24h'
  | 'atrasada'
  | 'postagem_reaberta';

export interface Notificacao {
  id: string;
  userId: string;
  tipo: TipoNotificacao;
  postagemId: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
}

export interface LogAuditoria {
  id: string;
  postagemId: string;
  acao: string;
  userId: string;
  userName: string;
  detalhes: string;
  criadoEm: string;
}
