import React, { useState, useRef } from 'react';
import { Cliente, Usuario, FormatoPostagem, RedeSocial, Postagem, MidiaItem } from '../../types';
import { SocialIcon } from '../../utils/socialIcons';
import {
  extractYouTubeId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  generateVideoThumbnailFromFile,
  captureFrameFromVideoElement,
  compressImageToDataUrl,
  uploadMediaFile
} from '../../utils/mediaUtils';
import {
  X,
  Plus,
  Upload,
  Youtube,
  Film,
  Image as ImageIcon,
  Camera,
  CheckCircle2,
  Trash2,
  Eye,
  RefreshCw,
  FileVideo,
  FileImage,
  FileText,
  EyeOff,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { getEffectiveNow } from '../../utils/visibilityUtils';

interface NewPostModalProps {
  clientes: Cliente[];
  usuarios: Usuario[];
  currentUser: Usuario;
  initialDate?: string;
  onClose: () => void;
  onCreate: (postData: Omit<Postagem, 'id' | 'criadoEm' | 'atualizadoEm'>) => Promise<void>;
  tema?: 'claro' | 'escuro';
}

interface AttachedFileItem {
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

export const NewPostModal: React.FC<NewPostModalProps> = ({
  clientes,
  usuarios,
  currentUser,
  initialDate,
  onClose,
  onCreate,
  tema = 'claro'
}) => {
  const isClaro = tema === 'claro';

  const defaultDate = initialDate ? `${initialDate}T15:00` : '2026-10-15T18:00';
  const defaultDeadline = initialDate ? `${initialDate}T12:00` : '2026-10-14T15:00';

  const [titulo, setTitulo] = useState('');
  const [clienteId, setClienteId] = useState(clientes[0]?.id || '');
  const [dataPublicacao, setDataPublicacao] = useState(defaultDate);
  const [prazoAprovacao, setPrazoAprovacao] = useState(defaultDeadline);
  const [formato, setFormato] = useState<FormatoPostagem>('Reels');
  const [redes, setRedes] = useState<RedeSocial[]>(['Instagram']);
  const [legenda, setLegenda] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [cta, setCta] = useState('');
  const [criadorId, setCriadorId] = useState(currentUser.id);
  const [gestorId, setGestorId] = useState(usuarios.find((u) => u.perfil === 'GESTOR')?.id || '');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para a opção "Ocultar para o cliente"
  // 'padrao' = segue prévia de 2 semanas automaticamente
  // 'ocultar' = explicitamente oculto para o cliente (Disponível em breve)
  // 'liberar' = liberado antecipadamente mesmo além de 2 semanas
  const [visibilidadeClienteMode, setVisibilidadeClienteMode] = useState<'padrao' | 'ocultar' | 'liberar'>('padrao');

  // Estados de Mídia (Upload MP4/Arquivos, YouTube Não Listado e Miniatura do Cliente)
  const [mediaSourceTab, setMediaSourceTab] = useState<'mp4' | 'youtube'>('mp4');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [thumbExplicitlyRemoved, setThumbExplicitlyRemoved] = useState(false);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  const [thumbMessage, setThumbMessage] = useState<string>('');

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const youtubeInputRef = useRef<HTMLInputElement>(null);

  const criadores = usuarios.filter((u) => u.perfil === 'CRIADOR' || u.perfil === 'ADMINISTRADOR');
  const gestores = usuarios.filter((u) => u.perfil === 'GESTOR' || u.perfil === 'ADMINISTRADOR');

  const youtubeVideoId = extractYouTubeId(youtubeUrl);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(youtubeUrl);

  const generateThumbnailFromFirstFile = async (file: File) => {
    setIsGeneratingThumb(true);
    setThumbMessage('Gerando miniatura automática do arquivo...');
    try {
      const isVid = file.type.includes('video') || file.name.toLowerCase().endsWith('.mp4');
      if (isVid) {
        const autoThumb = await generateVideoThumbnailFromFile(file, 1.0);
        setThumbnailUrl(autoThumb);
        setThumbExplicitlyRemoved(false);
        setThumbMessage('Miniatura gerada automaticamente do vídeo MP4!');
      } else if (file.type.includes('image')) {
        const imgThumb = await compressImageToDataUrl(file);
        setThumbnailUrl(imgThumb);
        setThumbExplicitlyRemoved(false);
        setThumbMessage('Miniatura definida a partir da imagem enviada!');
      }
    } catch {
      setThumbMessage('Arquivo anexado. Você pode capturar um frame abaixo ou enviar uma capa.');
    } finally {
      setIsGeneratingThumb(false);
    }
  };

  // Adiciona novos arquivos (ou substitui se não for Carrossel)
  const handleAddFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    const newItems: AttachedFileItem[] = Array.from(filesList).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type.includes('video') || file.name.toLowerCase().endsWith('.mp4')
    }));

    const nextList = formato === 'Carrossel' ? [...attachedFiles, ...newItems] : [newItems[0]];
    setAttachedFiles(nextList);

    if (nextList.length > 0 && (!thumbnailUrl || nextList.length === 1)) {
      await generateThumbnailFromFirstFile(nextList[0].file);
    }

    if (addFileInputRef.current) {
      addFileInputRef.current.value = '';
    }
  };

  // Altera um arquivo específico já anexado
  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingFileId) return;

    const isVideo = file.type.includes('video') || file.name.toLowerCase().endsWith('.mp4');
    const updatedItem: AttachedFileItem = {
      id: replacingFileId,
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo
    };

    const nextList = attachedFiles.map((item) =>
      item.id === replacingFileId ? updatedItem : item
    );
    setAttachedFiles(nextList);

    // Se alterou o primeiro arquivo, atualiza a miniatura automática
    if (nextList[0]?.id === replacingFileId) {
      await generateThumbnailFromFirstFile(file);
    }

    setReplacingFileId(null);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
    }
  };

  // Remove um arquivo específico da lista
  const handleRemoveFileItem = async (id: string) => {
    const nextList = attachedFiles.filter((item) => item.id !== id);
    setAttachedFiles(nextList);

    if (addFileInputRef.current) {
      addFileInputRef.current.value = '';
    }
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
    }

    if (nextList.length === 0 && !youtubeUrl.trim()) {
      setThumbnailUrl('');
      setThumbMessage('Arquivo removido.');
    } else if (nextList.length > 0) {
      await generateThumbnailFromFirstFile(nextList[0].file);
    }
  };

  // Remove todos os arquivos carregados
  const handleRemoveAllFiles = () => {
    setAttachedFiles([]);
    if (addFileInputRef.current) {
      addFileInputRef.current.value = '';
    }
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
    }
    if (!youtubeUrl.trim()) {
      setThumbnailUrl('');
      setThumbMessage('Arquivos removidos.');
    }
  };

  // Remove o vídeo do YouTube
  const handleRemoveYoutubeUrl = () => {
    setYoutubeUrl('');
    if (attachedFiles.length === 0) {
      setThumbnailUrl('');
      setThumbMessage('Link do YouTube removido.');
    }
  };

  // Remove apenas a miniatura/capa personalizada
  const handleRemoveThumbnail = () => {
    setThumbnailUrl('');
    setThumbExplicitlyRemoved(true);
    setThumbMessage('Miniatura removida.');
    if (thumbInputRef.current) {
      thumbInputRef.current.value = '';
    }
  };

  // Captura o frame exato em que o vídeo MP4 está pausado para usar como miniatura do cliente
  const handleCaptureCurrentFrame = () => {
    if (!videoPreviewRef.current) return;
    const captured = captureFrameFromVideoElement(videoPreviewRef.current);
    if (captured) {
      setThumbnailUrl(captured);
      setThumbExplicitlyRemoved(false);
      setThumbMessage('Frame atual do vídeo definido como miniatura para o cliente!');
    }
  };

  // Manipula alteração do link do YouTube Não Listado e extrai a miniatura automaticamente
  const handleYoutubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    const ytThumb = getYouTubeThumbnail(url, 'hqdefault');
    if (ytThumb) {
      setThumbnailUrl(ytThumb);
      setThumbExplicitlyRemoved(false);
      setThumbMessage('Miniatura do YouTube Não Listado carregada automaticamente para o cliente!');
    } else if (!url.trim() && attachedFiles.length === 0) {
      setThumbnailUrl('');
      setThumbMessage('');
    }
  };

  // Permite enviar uma imagem personalizada para ser a miniatura do cliente
  const handleCustomThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file);
      setThumbnailUrl(compressed);
      setThumbExplicitlyRemoved(false);
      setThumbMessage('Miniatura personalizada aplicada para visualização do cliente!');
    } catch {
      setThumbnailUrl(URL.createObjectURL(file));
      setThumbExplicitlyRemoved(false);
    }
    if (thumbInputRef.current) {
      thumbInputRef.current.value = '';
    }
  };

  const handleClearMedia = () => {
    setAttachedFiles([]);
    setYoutubeUrl('');
    setThumbnailUrl('');
    setThumbExplicitlyRemoved(true);
    setThumbMessage('Toda a mídia foi removida.');
    if (addFileInputRef.current) addFileInputRef.current.value = '';
    if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    if (thumbInputRef.current) thumbInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !clienteId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const midias: MidiaItem[] = [];
      let linkExterno: string | undefined = undefined;
      let finalCapaUrl: string | undefined = thumbExplicitlyRemoved
        ? undefined
        : thumbnailUrl || undefined;

      if (mediaSourceTab === 'mp4' && attachedFiles.length > 0) {
        for (let i = 0; i < attachedFiles.length; i++) {
          const item = attachedFiles[i];
          const uploadedUrl = await uploadMediaFile(item.file, clienteId);
          midias.push({
            url: uploadedUrl,
            tipo: item.isVideo ? 'video' : 'imagem',
            ordem: i,
            nomeArquivo: item.file.name
          });
          if (i === 0 && !finalCapaUrl && !thumbExplicitlyRemoved && !item.isVideo) {
            finalCapaUrl = uploadedUrl;
          }
        }
      } else if (mediaSourceTab === 'youtube' && youtubeUrl.trim()) {
        linkExterno = youtubeUrl.trim();
        const ytThumb = getYouTubeThumbnail(youtubeUrl.trim(), 'hqdefault');
        if (!finalCapaUrl && !thumbExplicitlyRemoved && ytThumb) {
          finalCapaUrl = ytThumb;
        }
        midias.push({
          url: youtubeUrl.trim(),
          tipo: 'video',
          ordem: 0,
          nomeArquivo: 'Vídeo do YouTube (Não Listado)'
        });
      }

      await onCreate({
        clienteId,
        titulo: titulo.trim(),
        dataPublicacao,
        prazoAprovacao,
        formato,
        redes,
        legenda,
        hashtags,
        cta,
        criadorId: criadorId || currentUser.id,
        gestorId,
        status: 'Rascunho',
        versaoAtual: 1,
        observacoes,
        roteiro: '',
        roteiroNotepad: '',
        roteiroLembretes: [],
        roteiroArquivoNome: undefined,
        roteiroArquivoUrl: undefined,
        ocultarParaCliente:
          visibilidadeClienteMode === 'ocultar'
            ? true
            : visibilidadeClienteMode === 'liberar'
            ? false
            : undefined,
        versoes: [
          {
            id: 'v1',
            numero: 1,
            midias,
            capaUrl: finalCapaUrl,
            linkExterno,
            criadoEm: new Date().toISOString()
          }
        ],
        comentarios: []
      });
      onClose();
    } catch (err: any) {
      console.error('Erro ao criar postagem:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50 font-sans">
      <div
        className={`w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border ${
          isClaro ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite' : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:px-6 border-b flex items-center justify-between ${
            isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-vulpis-laranja text-vulpis-grafite flex items-center justify-center font-bold">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-miv-title text-lg">Nova Postagem</h3>
              <p className="text-xs opacity-70">Planejar conteúdo e mídia para o cronograma</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg opacity-70 hover:opacity-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden input for replacing a specific file */}
        <input
          ref={replaceFileInputRef}
          type="file"
          accept="video/mp4,video/*,image/*"
          onChange={handleReplaceFileChange}
          className="hidden"
        />

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">
              Título Interno do Post <span className="text-vulpis-laranja">*</span>:
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Reels: 3 Dicas de Produtividade"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={`w-full p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">
                Cliente <span className="text-vulpis-laranja">*</span>:
              </label>
              <select
                required
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className={`w-full p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                  isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                }`}
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Formato:</label>
              <select
                value={formato}
                onChange={(e) => setFormato(e.target.value as FormatoPostagem)}
                className={`w-full p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                  isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                }`}
              >
                <option value="Reels">Reels (9:16)</option>
                <option value="Feed">Feed (1:1 ou 4:5)</option>
                <option value="Carrossel">Carrossel (Slides)</option>
                <option value="Stories">Stories (9:16)</option>
                <option value="Shorts">Shorts (9:16)</option>
                <option value="Vídeo longo">Vídeo longo (16:9)</option>
                <option value="TikTok">TikTok (9:16)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Data e Horário de Publicação:
              </label>
              <input
                type="datetime-local"
                required
                value={dataPublicacao}
                onChange={(e) => setDataPublicacao(e.target.value)}
                className={`w-full p-3 rounded-2xl border font-mono focus:outline-none focus:border-vulpis-azul ${
                  isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                }`}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Prazo Limite para Aprovação:
              </label>
              <input
                type="datetime-local"
                required
                value={prazoAprovacao}
                onChange={(e) => setPrazoAprovacao(e.target.value)}
                className={`w-full p-3 rounded-2xl border font-mono focus:outline-none focus:border-vulpis-azul ${
                  isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                }`}
              />
            </div>
          </div>

          {/* Redes */}
          <div>
            <label className="block font-semibold mb-2">Redes Sociais:</label>
            <div className="flex flex-wrap gap-2">
              {(['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook'] as RedeSocial[]).map(
                (r) => {
                  const isChecked = redes.includes(r);
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => {
                        setRedes(isChecked ? redes.filter((x) => x !== r) : [...redes, r]);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 border transition-all ${
                        isChecked
                          ? 'bg-vulpis-azul text-white border-vulpis-azul'
                          : isClaro
                          ? 'bg-vulpis-bege text-vulpis-grafite border-vulpis-grafite/20'
                          : 'bg-[#121212] text-vulpis-bege border-vulpis-cinza'
                      }`}
                    >
                      <SocialIcon rede={r} size={14} />
                      <span>{r}</span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* OPÇÃO: OCULTAR PARA O CLIENTE (PRÉVIA DE 2 SEMANAS / DISPONÍVEL EM BREVE) */}
          {(() => {
            const publicationDateObj = new Date(dataPublicacao);
            const diffDaysFromNow = Math.round(
              (publicationDateObj.getTime() - getEffectiveNow().getTime()) / (1000 * 60 * 60 * 24)
            );
            const isPostBeyondTwoWeeks = diffDaysFromNow > 14;

            return (
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  isClaro
                    ? 'bg-vulpis-bege/35 border-vulpis-grafite/15 text-vulpis-grafite'
                    : 'bg-[#141414] border-vulpis-cinza/40 text-vulpis-bege'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        visibilidadeClienteMode === 'ocultar'
                          ? 'bg-[#D93A2B]/15 text-[#D93A2B] border border-[#D93A2B]/30'
                          : visibilidadeClienteMode === 'liberar'
                          ? 'bg-[#1E9E5A]/15 text-[#1E9E5A] border border-[#1E9E5A]/30'
                          : isPostBeyondTwoWeeks
                          ? 'bg-[#F2B705]/15 text-[#F2B705] border border-[#F2B705]/30'
                          : 'bg-vulpis-azul/15 text-vulpis-azul border border-vulpis-azul/30'
                      }`}
                    >
                      {visibilidadeClienteMode === 'ocultar' ? (
                        <EyeOff className="w-4 h-4" />
                      ) : visibilidadeClienteMode === 'liberar' ? (
                        <Eye className="w-4 h-4" />
                      ) : isPostBeyondTwoWeeks ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs">Ocultar para o cliente</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            visibilidadeClienteMode === 'ocultar'
                              ? 'bg-[#D93A2B]/15 text-[#D93A2B] border-[#D93A2B]/30'
                              : visibilidadeClienteMode === 'liberar'
                              ? 'bg-[#1E9E5A]/15 text-[#1E9E5A] border-[#1E9E5A]/30'
                              : isPostBeyondTwoWeeks
                              ? 'bg-[#F2B705]/15 text-[#F2B705] border-[#F2B705]/30'
                              : 'bg-vulpis-azul/15 text-vulpis-azul border-vulpis-azul/30'
                          }`}
                        >
                          {visibilidadeClienteMode === 'ocultar'
                            ? '🔒 Oculto para o cliente (Disponível em breve)'
                            : visibilidadeClienteMode === 'liberar'
                            ? '🔓 Prévia liberada antecipadamente'
                            : isPostBeyondTwoWeeks
                            ? '⏳ Disponível em breve (além de 2 semanas por padrão)'
                            : '👁️ Visível no portal (janela padrão)'}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-75 mt-0.5 leading-snug">
                        {visibilidadeClienteMode === 'ocultar'
                          ? 'O cliente sabe que haverá algo programado nesta data, mas verá a informação "Disponível em breve" sem prévia de mídia ou texto.'
                          : visibilidadeClienteMode === 'liberar'
                          ? 'O cliente poderá visualizar a prévia completa deste conteúdo imediatamente no portal, mesmo sendo de semanas seguintes.'
                          : isPostBeyondTwoWeeks
                          ? `Programado para ${diffDaysFromNow} dias no futuro. Pelo padrão automático do portal, o cliente verá como "Disponível em breve" até faltar 2 semanas.`
                          : 'Como está programado para os próximos 14 dias, o cliente poderá visualizar a prévia normalmente conforme o padrão de 2 semanas.'}
                      </p>
                    </div>
                  </div>

                  {/* Seletor rápido de modo */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibilidadeClienteMode(
                          visibilidadeClienteMode === 'ocultar' ? 'padrao' : 'ocultar'
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                        visibilidadeClienteMode === 'ocultar'
                          ? 'bg-[#D93A2B] text-white border-[#D93A2B] shadow-sm'
                          : isClaro
                          ? 'bg-white border-vulpis-grafite/20 hover:bg-vulpis-bege'
                          : 'bg-vulpis-grafite border-vulpis-cinza hover:border-vulpis-laranja'
                      }`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{visibilidadeClienteMode === 'ocultar' ? 'Ocultado' : 'Ocultar para o cliente'}</span>
                    </button>

                    {isPostBeyondTwoWeeks && (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibilidadeClienteMode(
                            visibilidadeClienteMode === 'liberar' ? 'padrao' : 'liberar'
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 border transition-all ${
                          visibilidadeClienteMode === 'liberar'
                            ? 'bg-[#1E9E5A] text-white border-[#1E9E5A] shadow-sm font-bold'
                            : isClaro
                            ? 'bg-white border-vulpis-grafite/20 opacity-80 hover:opacity-100'
                            : 'bg-vulpis-grafite border-vulpis-cinza opacity-80 hover:opacity-100'
                        }`}
                        title="Permite que o cliente veja a prévia mesmo estando a mais de 2 semanas de distância"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{visibilidadeClienteMode === 'liberar' ? 'Liberado' : 'Liberar Prévia'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SEÇÃO DE ARQUIVOS / VÍDEO (UPLOAD MP4 / YOUTUBE NÃO LISTADO) E MINIATURA PARA O CLIENTE */}
          <div
            className={`p-4 rounded-2xl border space-y-3.5 ${
              isClaro
                ? 'bg-vulpis-bege/25 border-vulpis-grafite/20'
                : 'bg-[#121212]/80 border-vulpis-cinza'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="font-bold text-xs flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-vulpis-laranja" />
                  <span>Arquivos da Postagem, YouTube &amp; Miniatura</span>
                </label>
                <p className="text-[11px] opacity-70 mt-0.5">
                  Adicione, altere ou remova arquivos MP4/imagens, link do YouTube Não Listado e miniatura.
                </p>
              </div>

              {(attachedFiles.length > 0 || youtubeUrl || thumbnailUrl) && (
                <button
                  type="button"
                  onClick={handleClearMedia}
                  className="px-2.5 py-1 rounded-xl bg-[#D93A2B]/15 hover:bg-[#D93A2B] text-[#D93A2B] hover:text-white border border-[#D93A2B]/30 text-[11px] flex items-center gap-1 font-bold transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remover Toda a Mídia
                </button>
              )}
            </div>

            {/* Seletor de Fonte: Upload de Arquivos vs YouTube Não Listado */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMediaSourceTab('mp4')}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                  mediaSourceTab === 'mp4'
                    ? 'bg-vulpis-azul text-white border-vulpis-azul shadow-sm'
                    : isClaro
                    ? 'bg-white text-vulpis-grafite border-vulpis-grafite/20 hover:bg-vulpis-bege/40'
                    : 'bg-vulpis-grafite text-vulpis-bege border-vulpis-cinza hover:bg-vulpis-cinza/40'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload de Arquivo MP4 / Mídia</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaSourceTab('youtube')}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                  mediaSourceTab === 'youtube'
                    ? 'bg-vulpis-azul text-white border-vulpis-azul shadow-sm'
                    : isClaro
                    ? 'bg-white text-vulpis-grafite border-vulpis-grafite/20 hover:bg-vulpis-bege/40'
                    : 'bg-vulpis-grafite text-vulpis-bege border-vulpis-cinza hover:bg-vulpis-cinza/40'
                }`}
              >
                <Youtube className="w-4 h-4" />
                <span>YouTube Não Listado</span>
              </button>
            </div>

            {/* ABA 1: UPLOAD DE ARQUIVO MP4 / IMAGEM */}
            {mediaSourceTab === 'mp4' && (
              <div className="space-y-3">
                {/* Área de seleção inicial ou adição */}
                <div
                  className={`p-4 rounded-2xl border-2 border-dashed transition-all ${
                    isClaro
                      ? 'bg-white border-vulpis-azul/40 hover:border-vulpis-azul'
                      : 'bg-vulpis-grafite/60 border-vulpis-cinza hover:border-vulpis-laranja'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <Upload className="w-6 h-6 text-vulpis-laranja mb-1.5" />
                    <span className="font-bold text-xs">
                      {attachedFiles.length > 0
                        ? `${attachedFiles.length} arquivo(s) anexado(s) na postagem`
                        : 'Selecione um arquivo .MP4 ou imagem para a postagem'}
                    </span>
                    <span className="text-[11px] opacity-60 mt-0.5">
                      Suporta vídeos .MP4, .MOV ou imagens .JPG/.PNG
                    </span>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                      <label className="px-3.5 py-2 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm">
                        {attachedFiles.length > 0 && formato !== 'Carrossel' ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Alterar Arquivo</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {attachedFiles.length > 0 ? 'Adicionar Mais Arquivos' : 'Selecionar Arquivo'}
                            </span>
                          </>
                        )}
                        <input
                          ref={addFileInputRef}
                          type="file"
                          multiple={formato === 'Carrossel'}
                          accept="video/mp4,video/*,image/*"
                          onChange={handleAddFilesChange}
                          className="hidden"
                        />
                      </label>

                      {attachedFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={handleRemoveAllFiles}
                          className="px-3.5 py-2 rounded-xl bg-[#D93A2B] hover:bg-[#b82d20] text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {attachedFiles.length > 1 ? 'Remover Todos os Arquivos' : 'Remover Arquivo'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de Arquivos Anexados com opções individuais de Alterar e Remover */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold px-1">
                      <span>Arquivos Criados / Anexados ({attachedFiles.length}):</span>
                      <span className="opacity-60 font-normal">
                        Você pode alterar ou remover cada arquivo abaixo
                      </span>
                    </div>

                    {attachedFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border space-y-2.5 ${
                          isClaro
                            ? 'bg-white border-vulpis-grafite/15'
                            : 'bg-vulpis-grafite border-vulpis-cinza/60'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-vulpis-laranja/15 text-vulpis-laranja flex items-center justify-center flex-shrink-0">
                              {item.isVideo ? (
                                <FileVideo className="w-4 h-4" />
                              ) : (
                                <FileImage className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs block truncate max-w-[220px] sm:max-w-[300px]">
                                {formato === 'Carrossel' ? `Slide ${idx + 1}: ` : ''}
                                {item.file.name}
                              </span>
                              <span className="text-[10px] opacity-60">
                                {(item.file.size / (1024 * 1024)).toFixed(2)} MB •{' '}
                                {item.isVideo ? 'Vídeo MP4' : 'Imagem'}
                              </span>
                            </div>
                          </div>

                          {/* Botões Alterar e Remover para cada arquivo */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplacingFileId(item.id);
                                replaceFileInputRef.current?.click();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Alterar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveFileItem(item.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#D93A2B] hover:bg-[#b82d20] text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>

                        {/* Preview visual do arquivo (Vídeo ou Imagem) */}
                        {item.isVideo ? (
                          <div className="p-2.5 rounded-xl bg-black/90 text-white space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-vulpis-bege">
                                Pré-visualização do Vídeo:
                              </span>
                              <button
                                type="button"
                                onClick={handleCaptureCurrentFrame}
                                className="px-2.5 py-1 rounded-lg bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite font-bold flex items-center gap-1 transition-all"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Usar frame atual como Miniatura</span>
                              </button>
                            </div>
                            <video
                              ref={idx === 0 ? videoPreviewRef : undefined}
                              src={item.previewUrl}
                              controls
                              className="w-full max-h-48 rounded-lg object-contain bg-black"
                            />
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-black/85 flex items-center justify-center">
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="max-h-44 rounded-lg object-contain"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: VÍDEO DO YOUTUBE NÃO LISTADO */}
            {mediaSourceTab === 'youtube' && (
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1 text-[11px]">
                    Link do Vídeo do YouTube (Não Listado ou Público):
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      ref={youtubeInputRef}
                      type="url"
                      placeholder="Ex: https://youtu.be/dQw4w9WgXcQ ou https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                      className={`flex-1 p-2.5 rounded-xl border focus:outline-none focus:border-vulpis-azul ${
                        isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-vulpis-grafite border-vulpis-cinza'
                      }`}
                    />
                    {youtubeUrl && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            youtubeInputRef.current?.focus();
                            youtubeInputRef.current?.select();
                          }}
                          className="px-3 py-2 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-all flex-shrink-0"
                          title="Alterar link do YouTube"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Alterar</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveYoutubeUrl}
                          className="px-3 py-2 rounded-xl bg-[#D93A2B] hover:bg-[#b82d20] text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-all flex-shrink-0"
                          title="Remover link do YouTube"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] opacity-70 mt-1">
                    Ao colar o link do vídeo não listado, o sistema cria automaticamente a miniatura e o player integrado para o cliente aprovar.
                  </p>
                </div>

                {youtubeEmbedUrl && (
                  <div className="rounded-2xl overflow-hidden border border-vulpis-cinza/40 bg-black">
                    <div className="px-3 py-2 bg-[#121212] text-vulpis-bege text-[11px] font-semibold flex flex-wrap items-center justify-between gap-2">
                      <span>Player do YouTube Não Listado (ID: {youtubeVideoId})</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            youtubeInputRef.current?.focus();
                            youtubeInputRef.current?.select();
                          }}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-vulpis-azul text-white font-bold flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Alterar Vídeo
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveYoutubeUrl}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-[#D93A2B] text-white font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remover Vídeo
                        </button>
                      </div>
                    </div>
                    <div className="aspect-video w-full">
                      <iframe
                        src={youtubeEmbedUrl}
                        title="Preview YouTube Não Listado"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CARTÃO DE MINIATURA PARA O CLIENTE VER */}
            <div
              className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-center gap-3.5 ${
                isClaro ? 'bg-white border-vulpis-grafite/15' : 'bg-vulpis-grafite border-vulpis-cinza/50'
              }`}
            >
              {/* Preview da Miniatura */}
              <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-vulpis-cinza/30 flex items-center justify-center">
                {thumbnailUrl ? (
                  <>
                    <img
                      src={thumbnailUrl}
                      alt="Miniatura para o cliente"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveThumbnail}
                      title="Remover Miniatura"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#D93A2B] text-white flex items-center justify-center shadow hover:scale-110 transition-transform"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-bold flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5 text-vulpis-laranja" /> Capa
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2 text-[10px] text-white/60 flex flex-col items-center gap-1">
                    <ImageIcon className="w-5 h-5 opacity-60" />
                    <span>Sem miniatura</span>
                  </div>
                )}
              </div>

              {/* Controles da Miniatura do Cliente */}
              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 font-bold text-xs">
                  <span>Miniatura de Visualização do Cliente</span>
                  {thumbnailUrl && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1E9E5A] flex-shrink-0" />
                  )}
                </div>
                <p className="text-[11px] opacity-75 leading-snug">
                  {isGeneratingThumb
                    ? 'Extraindo miniatura do vídeo...'
                    : thumbMessage ||
                      'Esta miniatura será exibida no calendário, na tela de aprovação do gestor/cliente e no PDF.'}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <label className="px-3 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{thumbnailUrl ? 'Alterar Miniatura / Capa' : 'Enviar Miniatura / Capa'}</span>
                    <input
                      ref={thumbInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCustomThumbnailUpload}
                      className="hidden"
                    />
                  </label>

                  {thumbnailUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveThumbnail}
                      className="px-3 py-1.5 rounded-xl bg-[#D93A2B] hover:bg-[#b82d20] text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover Miniatura</span>
                    </button>
                  )}

                  {youtubeVideoId && (
                    <button
                      type="button"
                      onClick={() => {
                        const ytThumb = getYouTubeThumbnail(youtubeUrl, 'hqdefault');
                        if (ytThumb) {
                          setThumbnailUrl(ytThumb);
                          setThumbExplicitlyRemoved(false);
                          setThumbMessage('Miniatura oficial do YouTube restaurada!');
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                        isClaro
                          ? 'bg-vulpis-bege/40 border-vulpis-grafite/20 hover:bg-vulpis-bege'
                          : 'bg-[#121212] border-vulpis-cinza hover:bg-vulpis-cinza/30'
                      }`}
                    >
                      Usar Capa do YouTube
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Legenda Prévia / Copy:</label>
            <textarea
              rows={3}
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              placeholder="Escreva a legenda..."
              className={`w-full p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">
                Responsável (Criador / Editor):
              </label>
              <select
                value={criadorId}
                onChange={(e) => setCriadorId(e.target.value)}
                className={`w-full p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                  isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                }`}
              >
                {criadores.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Aprovador (Gestor):
              </label>
              <select
                value={gestorId}
                onChange={(e) => setGestorId(e.target.value)}
                className={`w-full p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                  isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                }`}
              >
                {gestores.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-vulpis-cinza/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold opacity-70 hover:opacity-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !titulo.trim()}
              className="px-5 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Criando...' : 'Criar Postagem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
