import React from 'react';
import { RedeSocial, FormatoPostagem } from '../types';
import { Instagram, Youtube, Linkedin, Facebook, Video, Layers, Smartphone, Film } from 'lucide-react';

export const SocialIcon: React.FC<{ rede: RedeSocial; className?: string; size?: number }> = ({
  rede,
  className = 'w-4 h-4',
  size = 16
}) => {
  switch (rede) {
    case 'Instagram':
      return <Instagram className={className} size={size} />;
    case 'YouTube':
      return <Youtube className={className} size={size} />;
    case 'LinkedIn':
      return <Linkedin className={className} size={size} />;
    case 'Facebook':
      return <Facebook className={className} size={size} />;
    case 'TikTok':
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="currentColor"
          className={className}
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.78 4.54 6.27 6.27 0 0 0 2.05-4.53V8.8a8.28 8.28 0 0 0 4.84 1.55v-3.5a4.85 4.85 0 0 1-1.08-.16Z" />
        </svg>
      );
    default:
      return null;
  }
};

export const FormatIcon: React.FC<{ formato: FormatoPostagem; className?: string; size?: number }> = ({
  formato,
  className = 'w-4 h-4',
  size = 16
}) => {
  switch (formato) {
    case 'Reels':
    case 'Shorts':
    case 'TikTok':
      return <Film className={className} size={size} />;
    case 'Stories':
      return <Smartphone className={className} size={size} />;
    case 'Carrossel':
      return <Layers className={className} size={size} />;
    case 'Vídeo longo':
      return <Video className={className} size={size} />;
    default:
      return <Smartphone className={className} size={size} />;
  }
};
