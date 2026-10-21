import React from 'react';

export type MascotPose = 'joinha' | 'notebook' | 'vazio' | 'sucesso';

interface VulpisMascotProps {
  pose?: MascotPose;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const VulpisMascot: React.FC<VulpisMascotProps> = ({
  pose = 'joinha',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-44 h-44',
    xl: 'w-60 h-60'
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Fundo do corpo / Moletom Preto (#121212 / #3D3B3C) */}
        <path
          d="M 60 140 C 50 160 40 195 40 195 L 160 195 C 160 195 150 160 140 140 C 130 135 118 132 100 132 C 82 132 70 135 60 140 Z"
          fill="#121212"
        />
        {/* Dobras do moletom em grafite */}
        <path
          d="M 75 145 C 85 142 115 142 125 145 C 135 152 145 180 148 195 L 132 195 C 130 180 125 160 115 155 L 100 170 L 85 155 C 75 160 70 180 68 195 L 52 195 C 55 180 65 152 75 145 Z"
          fill="#3D3B3C"
        />

        {/* Cordões do moletom em Laranja e Azul Vulpis */}
        <path d="M 90 142 Q 88 165 85 178" stroke="#F86904" strokeWidth="3" strokeLinecap="round" />
        <path d="M 110 142 Q 112 165 115 178" stroke="#0662CB" strokeWidth="3" strokeLinecap="round" />

        {/* Logo Vulpis Core no peito do moletom */}
        <g transform="translate(86, 158) scale(0.28)">
          <circle cx="50" cy="50" r="40" fill="#3D3B3C" />
          <path d="M 40 88 C 65 92 84 80 88 56 C 72 78 54 80 40 88 Z" fill="#0662CB" />
          <path d="M 50 20 C 68 18 72 26 76 34 C 60 60 48 66 36 68 C 52 46 56 38 50 20 Z" fill="#F86904" />
        </g>

        {/* Capuz ao redor do pescoço */}
        <path
          d="M 58 135 C 50 118 64 100 78 95 C 88 92 112 92 122 95 C 136 100 150 118 142 135 C 134 142 120 144 100 144 C 80 144 66 142 58 135 Z"
          fill="#121212"
          stroke="#3D3B3C"
          strokeWidth="3"
        />

        {/* Bochechas brancas fofas da raposa */}
        <path
          d="M 64 105 C 52 102 46 115 54 125 C 62 135 80 138 90 138 C 76 128 70 115 64 105 Z"
          fill="#FFFFFF"
        />
        <path
          d="M 136 105 C 148 102 154 115 146 125 C 138 135 120 138 110 138 C 124 128 130 115 136 105 Z"
          fill="#FFFFFF"
        />

        {/* Cabeça da Raposa em Laranja Vulpis (#F86904) */}
        <path
          d="M 66 75 C 60 92 70 120 100 125 C 130 120 140 92 134 75 C 130 65 120 62 100 62 C 80 62 70 65 66 75 Z"
          fill="#F86904"
        />

        {/* Orelhas grandes expressivas */}
        {/* Orelha Esquerda */}
        <path d="M 68 70 L 46 22 C 55 24 75 38 82 52 Z" fill="#F86904" />
        <path d="M 66 65 L 52 30 C 58 32 70 42 76 52 Z" fill="#FFFFFF" />
        <path d="M 46 22 L 50 32 L 44 28 Z" fill="#3D3B3C" />

        {/* Orelha Direita */}
        <path d="M 132 70 L 154 22 C 145 24 125 38 118 52 Z" fill="#F86904" />
        <path d="M 134 65 L 148 30 C 142 32 130 42 124 52 Z" fill="#FFFFFF" />
        <path d="M 154 22 L 150 32 L 156 28 Z" fill="#3D3B3C" />

        {/* Pelinhos do topete da cabeça */}
        <path d="M 94 62 L 100 48 L 106 62 Z" fill="#F86904" />
        <path d="M 104 60 L 112 52 L 110 64 Z" fill="#FB7009" />
        <path d="M 90 64 L 88 54 L 96 62 Z" fill="#FB7009" />

        {/* Focinho branco central */}
        <path
          d="M 86 100 C 86 92 92 88 100 88 C 108 88 114 92 114 100 C 114 112 108 122 100 122 C 92 122 86 112 86 100 Z"
          fill="#FFFFFF"
        />

        {/* Narizinho de raposa em grafite escuro */}
        <path
          d="M 95 100 C 95 98 100 96 100 96 C 100 96 105 98 105 100 C 105 104 100 108 100 108 C 100 108 95 104 95 100 Z"
          fill="#3D3B3C"
        />
        {/* Brilho no nariz */}
        <circle cx="98" cy="99" r="1.5" fill="#FFFFFF" />

        {/* Sorriso simpático */}
        <path
          d="M 96 110 Q 100 114 104 110"
          stroke="#3D3B3C"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Olhos expressivos em Azul Vulpis (#0662CB) */}
        {/* Olho Esquerdo */}
        <ellipse cx="82" cy="85" rx="9" ry="12" fill="#FFFFFF" />
        <ellipse cx="83" cy="86" rx="7" ry="9" fill="#0662CB" />
        <circle cx="84" cy="86" r="4.5" fill="#121212" />
        <circle cx="81" cy="82" r="2.5" fill="#FFFFFF" />
        <circle cx="85" cy="89" r="1" fill="#FFFFFF" />

        {/* Olho Direito */}
        <ellipse cx="118" cy="85" rx="9" ry="12" fill="#FFFFFF" />
        <ellipse cx="117" cy="86" rx="7" ry="9" fill="#0662CB" />
        <circle cx="116" cy="86" r="4.5" fill="#121212" />
        <circle cx="115" cy="82" r="2.5" fill="#FFFFFF" />
        <circle cx="119" cy="89" r="1" fill="#FFFFFF" />

        {/* Sobrancelhas expressivas */}
        <path d="M 74 72 Q 82 68 90 74" stroke="#3D3B3C" strokeWidth="3" strokeLinecap="round" />
        <path d="M 126 72 Q 118 68 110 74" stroke="#3D3B3C" strokeWidth="3" strokeLinecap="round" />

        {/* Poses customizadas */}
        {pose === 'joinha' && (
          /* Mão enluvada/patinha dando joinha 👍 */
          <g transform="translate(140, 120)">
            <ellipse cx="16" cy="24" rx="14" ry="14" fill="#F86904" />
            <path d="M 12 18 C 12 8 20 6 22 14 L 20 22 Z" fill="#F86904" stroke="#3D3B3C" strokeWidth="2" />
            <rect x="6" y="20" width="16" height="18" rx="5" fill="#F86904" stroke="#3D3B3C" strokeWidth="2" />
            <circle cx="18" cy="10" r="3" fill="#FFFFFF" />
          </g>
        )}

        {pose === 'notebook' && (
          /* Laptop moderno com adesivo Vulpis */
          <g transform="translate(60, 150)">
            <rect x="0" y="10" width="80" height="42" rx="4" fill="#3D3B3C" stroke="#464646" strokeWidth="2" />
            <rect x="4" y="14" width="72" height="34" rx="2" fill="#121212" />
            <circle cx="40" cy="31" r="9" fill="#F86904" />
            <path d="M 36 34 C 44 34 46 28 42 24" stroke="#0662CB" strokeWidth="2" fill="none" />
            <rect x="-6" y="48" width="92" height="6" rx="2" fill="#464646" />
          </g>
        )}

        {pose === 'sucesso' && (
          /* Estrelinhas e festa de aprovação */
          <g>
            <polygon points="35,45 38,52 46,53 40,58 42,66 35,62 28,66 30,58 24,53 32,52" fill="#F2B705" />
            <polygon points="165,45 168,52 176,53 170,58 172,66 165,62 158,66 160,58 154,53 162,52" fill="#F2B705" />
          </g>
        )}
      </svg>
    </div>
  );
};
