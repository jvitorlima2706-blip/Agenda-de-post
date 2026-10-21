// Date utilities conforming to America/Sao_Paulo fuso, dd/mm/aaaa and 24h time format

export const MESES_PT_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

export const DIAS_SEMANA_PT_BR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DIAS_SEMANA_COMPLETO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export function formatDateBr(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch {
    return dateString;
  }
}

export function formatDateTimeBr(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const ano = d.getFullYear();
    const hora = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
  } catch {
    return dateString;
  }
}

export function formatTime24h(dateString: string | undefined): string {
  if (!dateString) return '--:--';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '--:--';
    const hora = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${hora}:${min}`;
  } catch {
    return '--:--';
  }
}

export function formatSecondsToTimecode(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export function isOverdue(dateString: string | undefined, status: string): boolean {
  if (!dateString) return false;
  if (status === 'Publicado' || status === 'Aprovado' || status === 'Agendado' || status === 'Cancelado') {
    return false;
  }
  try {
    const target = new Date(dateString);
    const now = new Date();
    return target < now;
  } catch {
    return false;
  }
}

export function isDueWithin24h(dateString: string | undefined, status: string): boolean {
  if (!dateString) return false;
  if (status === 'Publicado' || status === 'Aprovado' || status === 'Agendado' || status === 'Cancelado') {
    return false;
  }
  try {
    const target = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diff = target - now;
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}
