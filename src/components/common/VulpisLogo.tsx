import React from 'react';

export type LogoVariant = 'principal' | 'simbolo' | 'principal-branco' | 'simbolo-branco';

interface VulpisLogoProps {
  variant?: LogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  theme?: 'escuro' | 'claro';
}

export const VulpisLogo: React.FC<VulpisLogoProps> = ({
  variant = 'principal',
  size = 'md',
  className = '',
  theme = 'escuro'
}) => {
  const isWhite = variant.includes('branco');
  const isOnlySymbol = variant === 'simbolo' || variant === 'simbolo-branco';

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  // Color tokens from MIV
  const colorOrange = isWhite ? '#FFFFFF' : '#F86904';
  const colorBlue = isWhite ? '#FFFFFF' : '#0662CB';
  const colorGraphite = isWhite ? '#FFFFFF' : (theme === 'claro' ? '#3D3B3C' : '#6A6869');
  const colorBackSwirl = isWhite ? 'rgba(255,255,255,0.7)' : '#3D3B3C';

  return (
    <div
      className={`inline-flex items-center gap-3 select-none transition-all ${className}`}
      style={{ padding: '0.35rem' }} // Respiro de segurança 3X
    >
      {/* Símbolo Oficial da Raposa Vulpis Core */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-contain"
        >
          {/* Arco circular externo / Base da marca */}
          <path
            d="M 50 8 A 42 42 0 1 0 88 62 C 86 62 82 56 78 50 C 82 34 76 22 66 14 C 61 10 56 8 50 8 Z"
            fill={colorBackSwirl}
            opacity={isWhite ? '0.4' : '0.9'}
          />

          {/* Arco inferior dinâmico em Azul Vulpis (#0662CB) */}
          <path
            d="M 40 88 C 65 92 84 80 88 56 C 84 68 72 78 54 80 C 46 81 38 78 30 72 C 34 78 38 84 40 88 Z"
            fill={colorBlue}
          />
          <path
            d="M 52 75 C 68 76 80 66 84 52 C 78 62 66 70 52 72 C 45 73 38 70 32 66 C 36 71 44 74 52 75 Z"
            fill={colorBlue}
          />

          {/* Cabeça da Raposa em Laranja Vulpis (#F86904) */}
          <path
            d="M 50 20 C 58 14 68 18 72 26 C 76 34 76 44 68 52 C 60 60 48 66 36 68 C 42 62 48 54 52 46 C 56 38 56 28 50 20 Z"
            fill={colorOrange}
          />

          {/* Orelha e Focinho Estilizados da Raposa */}
          <path
            d="M 46 22 L 54 8 L 62 24 C 58 20 52 20 46 22 Z"
            fill={colorOrange}
          />
          {/* Recorte interno da orelha */}
          <path
            d="M 52 14 L 56 22 L 48 20 Z"
            fill={isWhite ? '#121212' : '#FFFFFF'}
          />

          {/* Focinho afiado da raposa */}
          <path
            d="M 64 36 C 72 38 82 44 86 48 C 78 50 70 48 64 44 Z"
            fill={colorOrange}
          />
          {/* Olho da raposa em corte vazado */}
          <path
            d="M 62 34 C 64 33 66 34 68 36 C 66 37 63 36 62 34 Z"
            fill={colorBackSwirl}
          />

          {/* Rabo envolvente inferior da raposa em Laranja */}
          <path
            d="M 32 68 C 24 58 24 44 30 32 C 34 42 40 52 48 58 C 38 62 34 66 32 68 Z"
            fill={colorOrange}
          />
        </svg>
      </div>

      {/* Nome "Vulpis Core" com tipografia oficial Exo 2 Bold Italic */}
      {!isOnlySymbol && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5 font-display font-bold italic tracking-wide">
            <span
              className={`${textSizes[size]}`}
              style={{ color: colorOrange }}
            >
              Vulpis
            </span>
            <span
              className={`${textSizes[size]}`}
              style={{ color: colorBlue }}
            >
              Core
            </span>
          </div>

          {/* Linha azul sutil sob "Vulpis" como no logo da página 6 */}
          {!isWhite && (
            <div className="w-10 h-0.5 bg-vulpis-azul rounded-full mt-0.5" />
          )}
        </div>
      )}
    </div>
  );
};
