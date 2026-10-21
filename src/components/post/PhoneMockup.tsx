import React, { useState } from 'react';
import { Postagem, Cliente } from '../../types';
import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail
} from '../../utils/mediaUtils';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Music2,
  ChevronLeft,
  ChevronRight,
  Share2,
  MoreVertical,
  ThumbsUp
} from 'lucide-react';

interface PhoneMockupProps {
  post: Postagem;
  cliente?: Cliente;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ post, cliente }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const currentVersao = post.versoes?.find((v) => v.numero === post.versaoAtual) || post.versoes?.[0];
  const midias = currentVersao?.midias || [];
  const currentMedia = midias[slideIndex] || midias[0];

  const rawYouTubeUrl =
    extractYouTubeId(currentMedia?.url)
      ? currentMedia?.url
      : extractYouTubeId(currentVersao?.linkExterno)
      ? currentVersao?.linkExterno
      : undefined;

  const youtubeEmbedUrl = getYouTubeEmbedUrl(rawYouTubeUrl);
  const thumbUrl =
    currentVersao?.capaUrl ||
    (rawYouTubeUrl ? getYouTubeThumbnail(rawYouTubeUrl, 'hqdefault') || undefined : undefined) ||
    currentMedia?.url;

  const clientHandle = cliente
    ? `@${cliente.nome.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    : '@vulpiscliente';

  const isVertical = ['Reels', 'Stories', 'Shorts', 'TikTok'].includes(post.formato);
  const isYouTubeVideo = post.formato === 'Vídeo longo';

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Smartphone Frame */}
      <div className="relative w-[320px] sm:w-[350px] rounded-[42px] bg-slate-950 p-3.5 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[5px] border-slate-800 select-none">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-end px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 mr-2" />
          <div className="w-2 h-2 rounded-full bg-emerald-950" />
        </div>

        {/* Screen Content Container */}
        <div className="relative w-full h-[620px] rounded-[34px] overflow-hidden bg-slate-900 flex flex-col justify-between text-white font-sans">
          {/* Top Status Bar Simulation */}
          <div className="pt-2 px-6 flex items-center justify-between text-[11px] font-semibold z-20 text-slate-300">
            <span>09:41</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-5 h-2.5 rounded border border-white/60 p-0.5 flex items-center">
                <div className="w-3 h-full bg-white rounded-xs" />
              </div>
            </div>
          </div>

          {/* MOCKUP CONTENT BASED ON FORMAT */}
          {isVertical ? (
            /* 9:16 Immersive Reel / TikTok / Stories view */
            <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
              {/* Media Background */}
              <div className="absolute inset-0 bg-black">
                {youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title="YouTube Preview"
                    className="w-full h-full object-cover"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : currentMedia?.tipo === 'video' && currentMedia?.url ? (
                  <video
                    src={currentMedia.url}
                    poster={thumbUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs p-6 text-center">
                    Mídia vertical 9:16 (anexe um vídeo MP4 ou link do YouTube)
                  </div>
                )}
                {/* Gradient vignette for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none" />
              </div>

              {/* Top Bar for Reel / Stories */}
              <div className="relative z-10 px-4 pt-3 flex items-center justify-between text-xs font-bold drop-shadow pointer-events-none">
                <span>{post.formato}</span>
                <MoreVertical className="w-4 h-4" />
              </div>

              {/* Right Side Action Buttons */}
              <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-4 text-white">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className="flex flex-col items-center gap-0.5 active:scale-125 transition-transform"
                >
                  <Heart
                    className={`w-6 h-6 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'}`}
                  />
                  <span className="text-[10px] font-semibold">14.2k</span>
                </button>
                <button className="flex flex-col items-center gap-0.5">
                  <MessageCircle className="w-6 h-6 text-white" />
                  <span className="text-[10px] font-semibold">324</span>
                </button>
                <button className="flex flex-col items-center gap-0.5">
                  <Send className="w-6 h-6 text-white" />
                  <span className="text-[10px] font-semibold">89</span>
                </button>
                <button
                  onClick={() => setIsSaved(!isSaved)}
                  className="flex flex-col items-center gap-0.5"
                >
                  <Bookmark
                    className={`w-6 h-6 ${isSaved ? 'text-amber-400 fill-amber-400' : 'text-white'}`}
                  />
                </button>
              </div>

              {/* Bottom Caption & Client Info */}
              <div className="relative z-10 p-4 pb-6 space-y-2 max-w-[80%] drop-shadow pointer-events-none">
                <div className="flex items-center gap-2">
                  <img
                    src={
                      cliente?.logoUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${cliente?.nome || 'Vulpis'}`
                    }
                    alt=""
                    className="w-8 h-8 rounded-full border border-white/40 object-cover"
                  />
                  <div className="leading-tight">
                    <span className="text-xs font-bold">{clientHandle}</span>
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-semibold backdrop-blur-sm">
                      Seguir
                    </span>
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed line-clamp-3 text-slate-100">
                  {post.legenda || 'Legenda da postagem aparecerá aqui...'}
                </p>

                {post.hashtags && (
                  <p className="text-[10px] text-blue-300 line-clamp-1">{post.hashtags}</p>
                )}

                <div className="flex items-center gap-2 text-[10px] text-slate-300">
                  <Music2 className="w-3 h-3 animate-spin" />
                  <span className="truncate">Áudio original — {cliente?.nome || 'Vulpis Core'}</span>
                </div>
              </div>
            </div>
          ) : isYouTubeVideo || youtubeEmbedUrl ? (
            /* 16:9 YouTube Mobile Layout */
            <div className="flex flex-col h-full bg-slate-950 text-white">
              <div className="w-full aspect-video bg-black relative flex items-center justify-center">
                {youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title="YouTube video"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : currentMedia?.url ? (
                  <video
                    src={currentMedia.url}
                    poster={thumbUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : thumbUrl ? (
                  <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-xs text-slate-500">Vídeo YouTube (16:9)</div>
                )}
              </div>

              <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                <h4 className="text-xs font-bold leading-snug">{post.titulo}</h4>
                <div className="text-[10px] text-slate-400">
                  Vídeo não listado • Visualização do cliente • #YouTube
                </div>

                {/* Channel banner */}
                <div className="flex items-center justify-between py-2 border-y border-slate-800">
                  <div className="flex items-center gap-2">
                    <img
                      src={
                        cliente?.logoUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${cliente?.nome || 'Vulpis'}`
                      }
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-xs font-bold">{cliente?.nome}</div>
                      <div className="text-[9px] text-slate-400">Canal Oficial</div>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-white text-black font-bold text-xs rounded-full">
                    Inscrever-se
                  </button>
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-2 text-xs overflow-x-auto py-1">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-200">
                    <ThumbsUp className="w-3.5 h-3.5" /> 1,2k
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-200">
                    <Share2 className="w-3.5 h-3.5" /> Compartilhar
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-200">
                    <Bookmark className="w-3.5 h-3.5" /> Salvar
                  </button>
                </div>

                {/* Description */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                  {post.legenda || 'Descrição do vídeo...'}
                </div>
              </div>
            </div>
          ) : (
            /* 4:5 or 1:1 Instagram Feed Post */
            <div className="flex flex-col h-full bg-slate-950 text-white justify-between">
              {/* Header */}
              <div className="p-3 flex items-center justify-between border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <img
                    src={
                      cliente?.logoUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${cliente?.nome || 'Vulpis'}`
                    }
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold block leading-tight">{clientHandle}</span>
                    <span className="text-[9px] text-slate-400">Patrocinado</span>
                  </div>
                </div>
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </div>

              {/* Feed Media (Square or 4:5) */}
              <div className="relative w-full aspect-square sm:aspect-4/5 bg-black flex items-center justify-center overflow-hidden">
                {currentMedia?.tipo === 'video' && currentMedia?.url && !youtubeEmbedUrl ? (
                  <video
                    src={currentMedia.url}
                    poster={thumbUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-slate-500">Mídia Feed (1:1 ou 4:5)</div>
                )}

                {/* Multiple slides arrow */}
                {midias.length > 1 && (
                  <>
                    <button
                      onClick={() => setSlideIndex((prev) => (prev > 0 ? prev - 1 : midias.length - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSlideIndex((prev) => (prev < midias.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* Dots */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                      {midias.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            i === slideIndex ? 'bg-vulpis-primary w-3' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsLiked(!isLiked)}>
                      <Heart
                        className={`w-5 h-5 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'}`}
                      />
                    </button>
                    <MessageCircle className="w-5 h-5 text-white" />
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <button onClick={() => setIsSaved(!isSaved)}>
                    <Bookmark
                      className={`w-5 h-5 ${isSaved ? 'text-amber-400 fill-amber-400' : 'text-white'}`}
                    />
                  </button>
                </div>

                <div className="text-[11px] font-bold">1.842 curtidas</div>

                {/* Caption */}
                <div className="text-[11px] leading-relaxed text-slate-200">
                  <strong className="text-white mr-1.5">{clientHandle}</strong>
                  {post.legenda || 'Legenda da postagem...'}
                </div>

                {post.hashtags && (
                  <div className="text-[10px] text-blue-400">{post.hashtags}</div>
                )}

                {post.cta && (
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] font-semibold text-vulpis-primary flex items-center justify-between">
                    <span>{post.cta}</span>
                    <span>Saiba mais →</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Bar Indicator */}
          <div className="pb-1 flex justify-center">
            <div className="w-32 h-1 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
