import { Postagem, Usuario } from '../types';

/**
 * Retorna a data de referência para cálculo da janela de 2 semanas.
 * Em ambiente de teste/demonstração onde o cronograma é baseado em outubro de 2026,
 * assegura consistência caso a máquina local esteja em outro período.
 */
export function getEffectiveNow(): Date {
  const realNow = new Date();
  if (realNow.getFullYear() === 2026 && realNow.getMonth() === 9) {
    return realNow;
  }
  return new Date(2026, 9, 2); // 02 de Outubro de 2026
}

/**
 * Determina se uma postagem deve ser exibida como "Disponível em breve" para o cliente.
 * Regras do portal:
 * 1. Se ocultarParaCliente === true: Oculto para o cliente (exibe "Disponível em breve").
 * 2. Se ocultarParaCliente === false: Habilitado para o cliente (mesmo se além de 2 semanas).
 * 3. Se ocultarParaCliente === undefined (padrão):
 *    - Se a data de publicação for superior a 14 dias (2 semanas) no futuro,
 *      o cliente tem acesso limitado com a informação de "Disponível em breve".
 *    - Se estiver dentro de 14 dias, o cliente pode visualizar normalmente.
 */
export function isPostHiddenForClient(
  post: Postagem,
  user?: Usuario,
  refDate?: Date
): boolean {
  // A equipe interna (Admin, Gestor, Criador) nunca tem o conteúdo bloqueado
  if (user && user.perfil !== 'CLIENTE') {
    return false;
  }

  // 1. Controle manual explícito
  if (post.ocultarParaCliente === true) {
    return true;
  }
  if (post.ocultarParaCliente === false) {
    return false;
  }

  // 2. Janela padrão de 2 semanas (14 dias)
  const base = refDate || getEffectiveNow();
  if (!post.dataPublicacao) return false;
  const postDate = new Date(post.dataPublicacao);
  if (isNaN(postDate.getTime())) return false;

  const diffMs = postDate.getTime() - base.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays > 14;
}

export type VisibilityStatusType =
  | 'oculto_manual'
  | 'oculto_2semanas'
  | 'liberado_manual'
  | 'visivel_padrao';

export interface PostVisibilityInfo {
  isHidden: boolean;
  status: VisibilityStatusType;
  badgeText: string;
  shortBadge: string;
  detail: string;
  clientNotice: string;
  diffDays: number;
}

/**
 * Retorna informações completas de visibilidade de uma postagem
 * para exibição em badges, dicas e alternadores de status pela equipe.
 */
export function getPostClientVisibilityInfo(
  post: Postagem,
  refDate?: Date
): PostVisibilityInfo {
  const base = refDate || getEffectiveNow();
  const postDate = post.dataPublicacao ? new Date(post.dataPublicacao) : null;
  const diffDays =
    postDate && !isNaN(postDate.getTime())
      ? Math.round((postDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  const isBeyond2Weeks = diffDays > 14;

  if (post.ocultarParaCliente === true) {
    return {
      isHidden: true,
      status: 'oculto_manual',
      badgeText: 'Oculto para o cliente (Manual)',
      shortBadge: '🔒 Oculto p/ cliente',
      detail:
        'Marcado manualmente pela equipe para exibir apenas "Disponível em breve" no portal do cliente.',
      clientNotice: 'Disponível em breve • Conteúdo Programado',
      diffDays
    };
  }

  if (post.ocultarParaCliente === false) {
    return {
      isHidden: false,
      status: 'liberado_manual',
      badgeText: 'Prévia liberada antecipadamente',
      shortBadge: '🔓 Prévia liberada',
      detail: isBeyond2Weeks
        ? `Liberado antecipadamente pela equipe (${diffDays} dias à frente). O cliente já pode visualizar antes das 2 semanas padrão.`
        : 'Liberado expressamente para visualização no portal do cliente.',
      clientNotice: 'Prévia liberada pela equipe',
      diffDays
    };
  }

  if (isBeyond2Weeks) {
    return {
      isHidden: true,
      status: 'oculto_2semanas',
      badgeText: 'Disponível em breve (+2 semanas)',
      shortBadge: '⏳ Além de 2 semanas',
      detail: `Programado para ${diffDays} dias no futuro. Pelo padrão automático do portal, o cliente vê como "Disponível em breve" até entrar na janela de 2 semanas ou ser liberado.`,
      clientNotice: 'Disponível em breve • Programado pela equipe',
      diffDays
    };
  }

  return {
    isHidden: false,
    status: 'visivel_padrao',
    badgeText: 'Visível para o cliente',
    shortBadge: '👁️ Visível no portal',
    detail: 'Dentro da janela padrão de 2 semanas de prévia do cronograma.',
    clientNotice: 'Disponível para avaliação',
    diffDays
  };
}
