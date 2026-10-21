import { StatusPostagem } from '../types';
import {
  FileEdit,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarCheck,
  Send,
  XCircle,
  PlayCircle
} from 'lucide-react';
import React from 'react';

export interface StatusStyle {
  label: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
  iconName: string;
}

export const STATUS_CONFIG: Record<StatusPostagem, StatusStyle> = {
  Rascunho: {
    label: 'Rascunho',
    hex: '#464646',
    bgClass: 'bg-[#464646]',
    textClass: 'text-white',
    borderClass: 'border-[#464646]',
    badgeClass: 'bg-[#464646] text-white border-[#464646]',
    iconName: 'FileEdit'
  },
  'Em produção': {
    label: 'Em produção',
    hex: '#0662CB',
    bgClass: 'bg-[#0662CB]',
    textClass: 'text-white',
    borderClass: 'border-[#0662CB]',
    badgeClass: 'bg-[#0662CB] text-white border-[#0662CB]',
    iconName: 'PlayCircle'
  },
  'Aguardando aprovação': {
    label: 'Aguardando aprovação',
    hex: '#F2B705',
    bgClass: 'bg-[#F2B705]',
    textClass: 'text-[#3D3B3C] font-bold', // Texto grafite conforme MIV
    borderClass: 'border-[#F2B705]',
    badgeClass: 'bg-[#F2B705] text-[#3D3B3C] font-bold border-[#F2B705]',
    iconName: 'Clock'
  },
  'Ajustes solicitados': {
    label: 'Ajustes solicitados',
    hex: '#D93A2B',
    bgClass: 'bg-[#D93A2B]',
    textClass: 'text-white',
    borderClass: 'border-[#D93A2B]',
    badgeClass: 'bg-[#D93A2B] text-white border-[#D93A2B]',
    iconName: 'AlertTriangle'
  },
  Aprovado: {
    label: 'Aprovado',
    hex: '#1E9E5A',
    bgClass: 'bg-[#1E9E5A]',
    textClass: 'text-white',
    borderClass: 'border-[#1E9E5A]',
    badgeClass: 'bg-[#1E9E5A] text-white border-[#1E9E5A]',
    iconName: 'CheckCircle2'
  },
  Agendado: {
    label: 'Agendado',
    hex: '#04449A',
    bgClass: 'bg-[#04449A]',
    textClass: 'text-white',
    borderClass: 'border-[#04449A]',
    badgeClass: 'bg-[#04449A] text-white border-[#04449A]',
    iconName: 'CalendarCheck'
  },
  Publicado: {
    label: 'Publicado',
    hex: '#146C3E',
    bgClass: 'bg-[#146C3E]',
    textClass: 'text-white',
    borderClass: 'border-[#146C3E]',
    badgeClass: 'bg-[#146C3E] text-white border-[#146C3E]',
    iconName: 'Send'
  },
  Cancelado: {
    label: 'Cancelado',
    hex: '#9CA3AF',
    bgClass: 'bg-[#9CA3AF]',
    textClass: 'text-[#3D3B3C] line-through',
    borderClass: 'border-[#9CA3AF]',
    badgeClass: 'bg-[#9CA3AF] text-[#3D3B3C] border-[#9CA3AF]',
    iconName: 'XCircle'
  }
};

export const StatusIcon: React.FC<{ status: StatusPostagem; className?: string; size?: number }> = ({
  status,
  className = 'w-3.5 h-3.5',
  size = 14
}) => {
  switch (status) {
    case 'Rascunho':
      return <FileEdit className={className} size={size} />;
    case 'Em produção':
      return <PlayCircle className={className} size={size} />;
    case 'Aguardando aprovação':
      return <Clock className={className} size={size} />;
    case 'Ajustes solicitados':
      return <AlertTriangle className={className} size={size} />;
    case 'Aprovado':
      return <CheckCircle2 className={className} size={size} />;
    case 'Agendado':
      return <CalendarCheck className={className} size={size} />;
    case 'Publicado':
      return <Send className={className} size={size} />;
    case 'Cancelado':
      return <XCircle className={className} size={size} />;
    default:
      return null;
  }
};
