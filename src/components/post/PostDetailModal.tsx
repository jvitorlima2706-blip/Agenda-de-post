import React, { useState } from 'react';
import { Postagem, Cliente, Usuario, FormatoPostagem, RedeSocial, MidiaItem, Comentario } from '../../types';
import { STATUS_CONFIG, StatusIcon } from '../../utils/statusConfig';
import { SocialIcon } from '../../utils/socialIcons';
import { formatDateTimeBr } from '../../utils/dateUtils';
import { VideoReviewer } from './VideoReviewer';
import { CarouselReviewer } from './CarouselReviewer';
import { AdjustmentsChecklist } from './AdjustmentsChecklist';
import { PhoneMockup } from './PhoneMockup';
import { ReopenModal } from './ReopenModal';
import {
  extractYouTubeId,
  getYouTubeThumbnail,
  generateVideoThumbnailFromFile,
  compressImageToDataUrl,
  uploadMediaFile
} from '../../utils/mediaUtils';
import {
  X,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Send,
  Eye,
  FileEdit,
  Smartphone,
  History,
  Layers,
  Info,
  ExternalLink,
  Upload,
  Lock,
  Youtube,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  FileText,
  EyeOff,
  Sparkles,
  Clock,
  Laptop
} from 'lucide-react';
import { isPostHiddenForClient, getPostClientVisibilityInfo, getEffectiveNow } from '../../utils/visibilityUtils';

interface PostDetailModalProps {
  post: Postagem;
  clientes: Cliente[];
  usuarios: Usuario[];
  currentUser: Usuario;
  onClose: () => void;
  onUpdatePost: (id: string, updates: Partial<Postagem>) => Promise<void>;
  onDeletePost?: (id: string) => Promise<void>;
  onSendForApproval: (id: string) => Promise<void>;
  onApprove: (id: string, nota?: number, obs?: string) => Promise<void>;
  onRequestAdjustments: (id: string, nota: number | undefined, obs: string) => Promise<void>;
  onReopen: (id: string, motivo: string) => Promise<void>;
  onAddComment: (postId: string, commentData: Omit<Comentario, 'id' | 'resolvido' | 'criadoEm'>) => Promise<void>;
  onResolveComment: (postId: string, commentId: string, resposta?: string) => Promise<void>;
  onUnresolveComment: (postId: string, commentId: string) => Promise<void>;
  onCreateNewVersion: (postId: string, midias: MidiaItem[], capaUrl?: string, linkExterno?: string, obs?: string) => Promise<void>;
  tema?: 'claro' | 'escuro';
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  clientes,
  usuarios,
  currentUser,
  onClose,
  onUpdatePost,
  onDeletePost,
  onSendForApproval,
  onApprove,
  onRequestAdjustments,
  onReopen,
  onAddComment,
  onResolveComment,
  onUnresolveComment,
  onCreateNewVersion,
  tema = 'claro'
}) => {
  const isClaro = tema === 'claro';

  const [activeTab, setActiveTab] = useState<'revisao' | 'edicao' | 'mockup' | 'versoes' | 'historico'>('revisao');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showAdjustmentsDialog, setShowAdjustmentsDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Review states
  const [reviewNote, setReviewNote] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Publish states
  const [publishLink, setPublishLink] = useState(post.linkPublicado || '');
  const [publishDate, setPublishDate] = useState(post.dataPublicadoReal || new Date().toISOString().substring(0, 16));

  // Edit form state
  const [formData, setFormData] = useState<{
    titulo: string;
    clienteId: string;
    dataPublicacao: string;
    redes: RedeSocial[];
    formato: FormatoPostagem;
    legenda: string;
    hashtags: string;
    cta: string;
    criadorId: string;
    gestorId: string;
    prazoAprovacao: string;
    observacoes: string;
    ocultarParaCliente?: boolean;
  }>({
    titulo: post.titulo,
    clienteId: post.clienteId,
    dataPublicacao: post.dataPublicacao,
    redes: post.redes,
    formato: post.formato,
    legenda: post.legenda,
    hashtags: post.hashtags,
    cta: post.cta,
    criadorId: post.criadorId,
    gestorId: post.gestorId,
    prazoAprovacao: post.prazoAprovacao,
    observacoes: post.observacoes || '',
    ocultarParaCliente: post.ocultarParaCliente
  });

  const [newVersionLink, setNewVersionLink] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [justificativaPendentes, setJustificativaPendentes] = useState('');
  const [isAddingCaptionComment, setIsAddingCaptionComment] = useState(false);
  const [captionCommentText, setCaptionCommentText] = useState('');

  const isClientProfile = currentUser.perfil === 'CLIENTE';
  const isApproved = post.status === 'Aprovado' || post.status === 'Publicado';

  // Visibilidade para o cliente
  const isHiddenForClient = isPostHiddenForClient(post, currentUser);
  const visInfo = getPostClientVisibilityInfo(post);

  const publicationDateObj = new Date(formData.dataPublicacao || post.dataPublicacao);
  const diffDaysFromNow = Math.round(
    (publicationDateObj.getTime() - getEffectiveNow().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isPostBeyondTwoWeeks = diffDaysFromNow > 14;

  const cliente = clientes.find((c) => c.id === post.clienteId);
  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG['Rascunho'];

  const currentVersao = post.versoes?.find((v) => v.numero === post.versaoAtual) || post.versoes?.[0];
  const midias = currentVersao?.midias || [];
  const [tipoOrigemMidia, setTipoOrigemMidia] = useState<'computador' | 'youtube'>(
    currentVersao?.linkExterno ? 'youtube' : 'computador'
  );

  const getCharLimit = () => {
    if (formData.redes.includes('TikTok')) return 2200;
    if (formData.redes.includes('LinkedIn')) return 3000;
    if (formData.redes.includes('Instagram')) return 2200;
    return 2000;
  };

  const isLockedForCreator =
    currentUser.perfil === 'CRIADOR' &&
    (post.status === 'Aguardando aprovação' || post.status === 'Aprovado' || post.status === 'Publicado');

  const isLockedForManager =
    (currentUser.perfil === 'GESTOR' || currentUser.perfil === 'CLIENTE') && activeTab === 'edicao';

  const canApproveOrAdjust =
    currentUser.perfil === 'ADMINISTRADOR' ||
    currentUser.perfil === 'GESTOR' ||
    currentUser.perfil === 'CLIENTE';

  const canSendForApproval =
    (currentUser.perfil === 'CRIADOR' || currentUser.perfil === 'ADMINISTRADOR') &&
    post.status !== 'Aguardando aprovação' &&
    post.status !== 'Aprovado' &&
    post.status !== 'Publicado';

  const handleSend = async () => {
    try {
      await onSendForApproval(post.id);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Aprovação direta sem necessidade de comentário ou avaliação por estrelas
  const handleDirectApproval = async () => {
    if (isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      await onApprove(post.id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleConfirmAdjustments = async () => {
    setIsSubmittingReview(true);
    try {
      await onRequestAdjustments(post.id, undefined, reviewNote);
      setShowAdjustmentsDialog(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleMarkPublished = async () => {
    try {
      await onUpdatePost(post.id, {
        status: 'Publicado',
        linkPublicado: publishLink,
        dataPublicadoReal: publishDate
      });
      setShowPublishDialog(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedForCreator || isLockedForManager) return;
    try {
      await onUpdatePost(post.id, formData);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSubmitCaptionComment = async () => {
    if (!captionCommentText.trim() || isApproved) return;
    await onAddComment(post.id, {
      versao: post.versaoAtual,
      tipo: 'legenda',
      texto: captionCommentText.trim(),
      autorId: currentUser.id,
      autorNome: currentUser.nome
    });
    setCaptionCommentText('');
    setIsAddingCaptionComment(false);
  };

  const handleSimulateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadProgress(25);
    try {
      const uploadedUrl = await uploadMediaFile(file, post.clienteId);
      setUploadProgress(70);
      const isVid = file.type.includes('video') || file.name.toLowerCase().endsWith('.mp4');
      let thumbUrl: string | undefined = currentVersao?.capaUrl;

      if (isVid) {
        try {
          thumbUrl = await generateVideoThumbnailFromFile(file, 1.0);
        } catch {
          // Mantém miniatura anterior caso não consiga extrair frame
        }
      } else {
        try {
          thumbUrl = await compressImageToDataUrl(file);
        } catch {
          thumbUrl = uploadedUrl;
        }
      }

      const newMidia: MidiaItem = {
        url: uploadedUrl,
        tipo: isVid ? 'video' : 'imagem',
        ordem: 0,
        nomeArquivo: file.name
      };

      setUploadProgress(100);
      await onCreateNewVersion(post.id, [newMidia], thumbUrl, undefined, `Upload de arquivo: ${file.name}`);
    } finally {
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  // Remove mídia atual da versão ativa
  const handleRemoveCurrentMedia = async () => {
    if (!currentVersao) return;
    const updatedVersoes = (post.versoes || []).map((v) =>
      v.numero === post.versaoAtual
        ? { ...v, midias: [], linkExterno: undefined }
        : v
    );
    await onUpdatePost(post.id, { versoes: updatedVersoes });
  };

  // Remove apenas a miniatura/capa da versão ativa
  const handleRemoveCurrentThumb = async () => {
    if (!currentVersao) return;
    const updatedVersoes = (post.versoes || []).map((v) =>
      v.numero === post.versaoAtual ? { ...v, capaUrl: undefined } : v
    );
    await onUpdatePost(post.id, { versoes: updatedVersoes });
  };

  const handleCustomThumbChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentVersao) return;
    try {
      const compressed = await compressImageToDataUrl(file);
      const updatedVersoes = (post.versoes || []).map((v) =>
        v.numero === post.versaoAtual ? { ...v, capaUrl: compressed } : v
      );
      await onUpdatePost(post.id, { versoes: updatedVersoes });
    } catch (err) {
      console.error(err);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in-50 font-sans">
      <div
        className={`w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border ${
          isClaro
            ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
            : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
        }`}
      >
        {/* Top Header */}
        <div
          className={`p-4 sm:px-6 border-b flex flex-wrap items-center justify-between gap-3 ${
            isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              style={{ backgroundColor: cliente?.cor || '#F86904' }}
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/30"
              title={cliente?.nome}
            />
            <div>
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: statusCfg.hex }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    post.status === 'Aguardando aprovação' ? 'text-vulpis-grafite' : 'text-white'
                  }`}
                >
                  <StatusIcon status={post.status} size={11} />
                  <span>{post.status}</span>
                </span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded border ${
                    isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-vulpis-grafite border-vulpis-cinza'
                  }`}
                >
                  V{post.versaoAtual}
                </span>
                <span className="text-xs font-semibold opacity-70 hidden sm:inline">
                  {cliente?.nome}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-miv-title mt-0.5 line-clamp-1">
                {post.titulo}
              </h2>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Enviar para aprovação */}
            {canSendForApproval && (
              <button
                onClick={handleSend}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Enviar para Aprovação</span>
              </button>
            )}

            {/* Ações de revisão (Cliente / Gestor / Admin) */}
            {canApproveOrAdjust &&
              post.status !== 'Aprovado' &&
              post.status !== 'Publicado' &&
              (isClientProfile ||
                currentUser.perfil === 'ADMINISTRADOR' ||
                post.status === 'Aguardando aprovação') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAdjustmentsDialog(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#D93A2B] hover:bg-[#c33326] text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Solicitar Ajustes</span>
                  </button>
                  <button
                    onClick={handleDirectApproval}
                    disabled={isSubmittingReview}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#1E9E5A] hover:bg-[#18854b] text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{isSubmittingReview ? 'Aprovando...' : 'Aprovar Postagem'}</span>
                  </button>
                </div>
              )}

            {/* Indicador de Aprovado */}
            {post.status === 'Aprovado' && (
              <span className="px-3 py-1.5 rounded-2xl bg-[#1E9E5A]/15 text-[#1E9E5A] border border-[#1E9E5A]/30 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Postagem Aprovada</span>
              </span>
            )}

            {/* Reabertura por Administrador */}
            {currentUser.perfil === 'ADMINISTRADOR' && post.status === 'Aprovado' && (
              <button
                onClick={() => setShowReopenModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reabrir Postagem</span>
              </button>
            )}

            {/* Registrar publicação (apenas Equipe Interna / Admin) */}
            {!isClientProfile &&
              (post.status === 'Aprovado' || post.status === 'Agendado') && (
                <button
                  onClick={() => setShowPublishDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#146C3E] hover:bg-[#105631] text-white text-xs font-bold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Registrar Publicação</span>
                </button>
              )}

            {/* Alternador de Visibilidade para o Cliente (Equipe) */}
            {!isClientProfile && (
              <button
                type="button"
                onClick={async () => {
                  const nextVal = visInfo.isHidden ? false : true;
                  await onUpdatePost(post.id, { ocultarParaCliente: nextVal });
                  setFormData((prev) => ({ ...prev, ocultarParaCliente: nextVal }));
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all ${
                  visInfo.isHidden
                    ? 'bg-[#D93A2B]/15 text-[#D93A2B] border-[#D93A2B]/40 hover:bg-[#D93A2B] hover:text-white'
                    : visInfo.status === 'liberado_manual'
                    ? 'bg-[#1E9E5A]/15 text-[#1E9E5A] border-[#1E9E5A]/40 hover:bg-[#1E9E5A] hover:text-white'
                    : 'bg-vulpis-azul/15 text-vulpis-azul border-vulpis-azul/40 hover:bg-vulpis-azul hover:text-white'
                }`}
                title={visInfo.detail}
              >
                {visInfo.isHidden ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Oculto p/ cliente</span>
                  </>
                ) : visInfo.status === 'liberado_manual' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Prévia Liberada</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visível p/ cliente</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl opacity-70 hover:opacity-100 transition-opacity ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Se o usuário for CLIENTE e a postagem estiver oculta ("Disponível em breve") */}
        {isClientProfile && isHiddenForClient ? (
          <div
            className={`p-6 sm:p-10 overflow-y-auto flex-1 flex flex-col items-center justify-center text-center space-y-6 ${
              isClaro ? 'bg-[#F9E8CE]/30 text-vulpis-grafite' : 'bg-vulpis-preto/40 text-vulpis-bege'
            }`}
          >
            <div className="w-20 h-20 rounded-3xl bg-[#F2B705]/15 border-2 border-[#F2B705]/40 flex items-center justify-center text-[#B45309] shadow-lg animate-pulse">
              <Sparkles className="w-10 h-10 text-[#F2B705]" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#F2B705]/20 text-[#B45309] border border-[#F2B705]/40 inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Disponível em breve no Portal</span>
              </span>
              <h3 className="font-miv-title text-xl sm:text-2xl">
                Conteúdo Programado para sua Marca
              </h3>
              <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
                Esta postagem já foi incluída no cronograma oficial. Nossa equipe de criação e estratégia está produzindo os criativos visuais e conteúdos para publicação.
              </p>
            </div>

            {/* Informações do Agendamento */}
            <div
              className={`w-full max-w-xl p-5 rounded-3xl border text-left space-y-3.5 shadow-sm ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
                  : 'bg-[#121212] border-vulpis-cinza/40 text-vulpis-bege'
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="opacity-60 block text-[11px]">Data Prevista de Publicação:</span>
                  <strong className="font-mono text-sm text-vulpis-azul">
                    {formatDateTimeBr(post.dataPublicacao)}
                  </strong>
                </div>
                <div>
                  <span className="opacity-60 block text-[11px]">Prazo Limite para Aprovação:</span>
                  <strong className="font-mono text-sm text-[#F2B705]">
                    {formatDateTimeBr(post.prazoAprovacao)}
                  </strong>
                </div>
                <div>
                  <span className="opacity-60 block text-[11px]">Formato Previsto:</span>
                  <strong>{post.formato}</strong>
                </div>
                <div>
                  <span className="opacity-60 block text-[11px]">Redes Sociais:</span>
                  <div className="flex gap-1.5 mt-0.5">
                    {post.redes.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1"
                      >
                        <SocialIcon rede={r} size={11} className="text-vulpis-azul" />
                        <span>{r}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-vulpis-cinza/20 text-[11px] opacity-80 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-vulpis-azul flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Janela de prévia de 2 semanas:</strong> Como padrão do portal, a prévia completa deste conteúdo fica disponível automaticamente para sua avaliação e aprovação <strong>2 semanas antes da postagem</strong>, ou assim que nossa equipe finalizar a produção.
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md transition-all active:scale-95"
            >
              Entendido, Fechar Janela
            </button>
          </div>
        ) : (
          <>
            {/* Abas de Navegação */}
            <div
              className={`flex items-center gap-1 px-4 sm:px-6 border-b overflow-x-auto text-xs font-semibold ${
                isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/15' : 'bg-[#121212]/70 border-vulpis-cinza/40'
              }`}
            >
              <button
                onClick={() => setActiveTab('revisao')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                  activeTab === 'revisao'
                    ? 'border-vulpis-azul text-vulpis-azul font-bold'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Revisão &amp; Aprovação</span>
              </button>
              {!isClientProfile && (
                <button
                  onClick={() => setActiveTab('edicao')}
                  className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                    activeTab === 'edicao'
                      ? 'border-vulpis-azul text-vulpis-azul font-bold'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <FileEdit className="w-4 h-4" />
                  <span>Editar Dados &amp; Mídia</span>
                  {(isLockedForCreator || isLockedForManager) && (
                    <Lock className="w-3 h-3 opacity-60" />
                  )}
                </button>
              )}
              <button
                onClick={() => setActiveTab('mockup')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                  activeTab === 'mockup'
                    ? 'border-vulpis-azul text-vulpis-azul font-bold'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Mockup Celular</span>
              </button>
              {!isClientProfile && (
                <>
                  <button
                    onClick={() => setActiveTab('versoes')}
                    className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                      activeTab === 'versoes'
                        ? 'border-vulpis-azul text-vulpis-azul font-bold'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Versões ({post.versoes?.length || 1})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('historico')}
                    className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                      activeTab === 'historico'
                        ? 'border-vulpis-azul text-vulpis-azul font-bold'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Histórico / Auditoria</span>
                  </button>
                </>
              )}
            </div>

        {/* Modal Body */}
        <div
          className={`p-4 sm:p-6 overflow-y-auto flex-1 ${
            isClaro ? 'bg-[#F9E8CE]/30' : 'bg-vulpis-preto/40'
          }`}
        >
          {/* TAB 1: REVISÃO & APROVAÇÃO */}
          {activeTab === 'revisao' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna Esquerda: Player & Ajustes (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {post.formato === 'Carrossel' ? (
                  <CarouselReviewer
                    midias={midias}
                    comentarios={post.comentarios || []}
                    versaoNumero={post.versaoAtual}
                    currentUser={currentUser}
                    isApproved={isApproved}
                    onAddComment={(data) => onAddComment(post.id, data)}
                    onResolveComment={(cId, res) => onResolveComment(post.id, cId, res)}
                  />
                ) : (
                  <VideoReviewer
                    videoUrl={midias[0]?.tipo === 'video' ? midias[0]?.url : undefined}
                    externalLink={currentVersao?.linkExterno}
                    capaUrl={currentVersao?.capaUrl}
                    comentarios={post.comentarios || []}
                    versaoNumero={post.versaoAtual}
                    currentUser={currentUser}
                    isApproved={isApproved}
                    onAddComment={(data) => onAddComment(post.id, data)}
                    onResolveComment={(cId, res) => onResolveComment(post.id, cId, res)}
                  />
                )}

                {!isApproved && (
                  <AdjustmentsChecklist
                    comentarios={post.comentarios || []}
                    versaoNumero={post.versaoAtual}
                    currentUser={currentUser}
                    onResolveComment={(cId, res) => onResolveComment(post.id, cId, res)}
                    onUnresolveComment={(cId) => onUnresolveComment(post.id, cId)}
                    justificativaPendentes={justificativaPendentes}
                    setJustificativaPendentes={setJustificativaPendentes}
                  />
                )}
              </div>

              {/* Coluna Direita: Briefing, Legenda, Detalhes (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Banner de postagem aprovada (sem opção de comentário ou avaliação) */}
                {isApproved && (
                  <div className="p-4 rounded-2xl bg-[#1E9E5A]/15 border border-[#1E9E5A]/40 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#1E9E5A] flex-shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-[#1E9E5A] block">Postagem Aprovada</span>
                      <span className="opacity-80">
                        Esta postagem já foi aprovada e está pronta para publicação.
                      </span>
                    </div>
                  </div>
                )}

                {/* Briefing Fixo do Cliente */}
                {cliente?.briefing && (
                  <div
                    className={`p-4 rounded-2xl border space-y-2 ${
                      isClaro
                        ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-vulpis-azul">
                      <Info className="w-4 h-4" />
                      <span>Briefing Fixo do Cliente</span>
                    </div>
                    <p className="text-xs leading-relaxed max-h-28 overflow-y-auto pr-1 opacity-90">
                      {cliente.briefing}
                    </p>
                  </div>
                )}

                {/* Legenda / Copy Oficial */}
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    isClaro
                      ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
                      : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Legenda / Copy Oficial:</span>
                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => setIsAddingCaptionComment(!isAddingCaptionComment)}
                        className="text-vulpis-azul hover:underline font-bold"
                      >
                        + Comentar na legenda / postagem
                      </button>
                    )}
                  </div>

                  {isAddingCaptionComment && !isApproved && (
                    <div
                      className={`p-3 rounded-xl border space-y-2 ${
                        isClaro
                          ? 'bg-vulpis-bege/40 border-vulpis-laranja/50'
                          : 'bg-[#121212] border-vulpis-laranja/50'
                      }`}
                    >
                      <textarea
                        rows={2}
                        value={captionCommentText}
                        onChange={(e) => setCaptionCommentText(e.target.value)}
                        placeholder="Escreva seu comentário ou ajuste para a legenda ou postagem..."
                        className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-vulpis-laranja ${
                          isClaro
                            ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                            : 'bg-vulpis-grafite border-vulpis-cinza text-vulpis-bege'
                        }`}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingCaptionComment(false)}
                          className="px-3 py-1 text-xs opacity-70 hover:opacity-100"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitCaptionComment}
                          disabled={!captionCommentText.trim()}
                          className="px-3.5 py-1.5 rounded-xl bg-vulpis-laranja text-vulpis-grafite text-xs font-bold shadow-sm disabled:opacity-50"
                        >
                          Salvar Comentário
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    className={`p-3 rounded-xl border text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto ${
                      isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
                    }`}
                  >
                    {post.legenda || '(Nenhuma legenda preenchida ainda)'}
                  </div>

                  {post.hashtags && (
                    <div className="text-xs text-vulpis-azul font-mono">{post.hashtags}</div>
                  )}

                  {post.cta && (
                    <div
                      className={`text-xs p-2 rounded-xl border font-medium ${
                        isClaro ? 'bg-vulpis-bege/40 border-vulpis-grafite/15' : 'bg-[#121212] border-vulpis-cinza/40'
                      }`}
                    >
                      <strong className="text-vulpis-laranja">CTA:</strong> {post.cta}
                    </div>
                  )}
                </div>

                {/* Dados da Postagem */}
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
                    isClaro
                      ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
                      : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                  }`}
                >
                  <h4 className="font-miv-title text-sm mb-2">Dados de Publicação</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="opacity-60 block">Data de Publicação:</span>
                      <strong className="font-mono">{formatDateTimeBr(post.dataPublicacao)}</strong>
                    </div>
                    <div>
                      <span className="opacity-60 block">Prazo de Aprovação:</span>
                      <strong className="text-[#F2B705] font-mono font-bold">
                        {formatDateTimeBr(post.prazoAprovacao)}
                      </strong>
                    </div>
                    <div>
                      <span className="opacity-60 block">Formato:</span>
                      <strong>{post.formato}</strong>
                    </div>
                    <div>
                      <span className="opacity-60 block">Redes:</span>
                      <div className="flex gap-1.5 mt-0.5">
                        {post.redes.map((r) => (
                          <SocialIcon key={r} rede={r} size={14} className="text-vulpis-azul" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {post.linkPublicado && (
                    <div className="pt-2 border-t border-vulpis-cinza/20">
                      <span className="opacity-70 block mb-1">Post Publicado:</span>
                      <a
                        href={post.linkPublicado}
                        target="_blank"
                        rel="noreferrer"
                        className="text-vulpis-azul hover:underline flex items-center gap-1 font-bold truncate"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{post.linkPublicado}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDITAR DADOS & MÍDIA */}
          {activeTab === 'edicao' && (
            <form onSubmit={handleSaveEdits} className="max-w-3xl mx-auto space-y-5">
              {(isLockedForCreator || isLockedForManager) && (
                <div className="p-3.5 rounded-2xl bg-[#F2B705]/20 border border-[#F2B705] text-vulpis-grafite text-xs font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-vulpis-laranja flex-shrink-0" />
                  <span>
                    {isLockedForCreator
                      ? 'Edição bloqueada para o criador enquanto a postagem estiver em aprovação ou aprovada.'
                      : 'O gestor avalia e comenta, mas a edição de conteúdo da postagem é exclusiva do criador/admin.'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    Título Interno da Postagem:
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLockedForCreator || isLockedForManager}
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                      isClaro
                        ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Cliente:</label>
                  <select
                    disabled={isLockedForCreator || isLockedForManager}
                    value={formData.clienteId}
                    onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                    className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                      isClaro
                        ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
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
                  <label className="block text-xs font-semibold mb-1">Formato:</label>
                  <select
                    disabled={isLockedForCreator || isLockedForManager}
                    value={formData.formato}
                    onChange={(e) =>
                      setFormData({ ...formData, formato: e.target.value as FormatoPostagem })
                    }
                    className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                      isClaro
                        ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
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
                  <label className="block text-xs font-semibold mb-1">
                    Data e Horário de Publicação:
                  </label>
                  <input
                    type="datetime-local"
                    required
                    disabled={isLockedForCreator || isLockedForManager}
                    value={formData.dataPublicacao}
                    onChange={(e) => setFormData({ ...formData, dataPublicacao: e.target.value })}
                    className={`w-full text-xs p-3 rounded-2xl border font-mono focus:outline-none focus:border-vulpis-azul ${
                      isClaro
                        ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Prazo Limite para Aprovação:
                  </label>
                  <input
                    type="datetime-local"
                    required
                    disabled={isLockedForCreator || isLockedForManager}
                    value={formData.prazoAprovacao}
                    onChange={(e) => setFormData({ ...formData, prazoAprovacao: e.target.value })}
                    className={`w-full text-xs p-3 rounded-2xl border font-mono focus:outline-none focus:border-vulpis-azul ${
                      isClaro
                        ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                    }`}
                  />
                </div>

                {/* Redes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-2">Redes Sociais:</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook'] as RedeSocial[]).map(
                      (rede) => {
                        const isSelected = formData.redes.includes(rede);
                        return (
                          <button
                            type="button"
                            key={rede}
                            disabled={isLockedForCreator || isLockedForManager}
                            onClick={() => {
                              const newRedes = isSelected
                                ? formData.redes.filter((r) => r !== rede)
                                : [...formData.redes, rede];
                              setFormData({ ...formData, redes: newRedes });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                              isSelected
                                ? 'bg-vulpis-azul text-white border-vulpis-azul'
                                : isClaro
                                ? 'bg-white text-vulpis-grafite border-vulpis-grafite/20'
                                : 'bg-[#121212] text-vulpis-bege border-vulpis-cinza/40'
                            }`}
                          >
                            <SocialIcon rede={rede} size={14} />
                            <span>{rede}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Legenda com contador */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold">Legenda / Copy:</label>
                    <span className="text-[11px] font-mono opacity-70">
                      {formData.legenda.length} / {getCharLimit()} caracteres
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    required
                    disabled={isLockedForCreator || isLockedForManager}
                    value={formData.legenda}
                    onChange={(e) => setFormData({ ...formData, legenda: e.target.value })}
                    placeholder="Escreva a legenda completa..."
                    className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                      isClaro
                        ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Hashtags:</label>
                  <input
                    type="text"
                    disabled={isLockedForCreator || isLockedForManager}
                    value={formData.hashtags}
                    onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                    placeholder="#Vulpis #Marketing"
                    className={`w-full text-xs p-3 rounded-2xl border font-mono focus:outline-none focus:border-vulpis-azul ${
                      isClaro
                        ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">CTA:</label>
                  <input
                    type="text"
                    disabled={isLockedForCreator || isLockedForManager}
                    value={formData.cta}
                    onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                    placeholder="Ex: Clique no link da bio..."
                    className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-vulpis-azul ${
                      isClaro
                        ? 'bg-white border-vulpis-grafite/20 text-vulpis-grafite'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
                    }`}
                  />
                </div>

                {/* VISIBILIDADE PARA O CLIENTE / OCULTAR PARA O CLIENTE */}
                <div
                  className={`md:col-span-2 p-3.5 rounded-2xl border transition-all ${
                    isClaro
                      ? 'bg-vulpis-bege/35 border-vulpis-grafite/15 text-vulpis-grafite'
                      : 'bg-[#141414] border-vulpis-cinza/40 text-vulpis-bege'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          formData.ocultarParaCliente === true
                            ? 'bg-[#D93A2B]/15 text-[#D93A2B] border border-[#D93A2B]/30'
                            : formData.ocultarParaCliente === false
                            ? 'bg-[#1E9E5A]/15 text-[#1E9E5A] border border-[#1E9E5A]/30'
                            : isPostBeyondTwoWeeks
                            ? 'bg-[#F2B705]/15 text-[#F2B705] border border-[#F2B705]/30'
                            : 'bg-vulpis-azul/15 text-vulpis-azul border border-vulpis-azul/30'
                        }`}
                      >
                        {formData.ocultarParaCliente === true ? (
                          <EyeOff className="w-4 h-4" />
                        ) : formData.ocultarParaCliente === false ? (
                          <Eye className="w-4 h-4" />
                        ) : isPostBeyondTwoWeeks ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs">Visibilidade para o Cliente (Portal)</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              formData.ocultarParaCliente === true
                                ? 'bg-[#D93A2B]/15 text-[#D93A2B] border-[#D93A2B]/30'
                                : formData.ocultarParaCliente === false
                                ? 'bg-[#1E9E5A]/15 text-[#1E9E5A] border-[#1E9E5A]/30'
                                : isPostBeyondTwoWeeks
                                ? 'bg-[#F2B705]/15 text-[#F2B705] border-[#F2B705]/30'
                                : 'bg-vulpis-azul/15 text-vulpis-azul border-vulpis-azul/30'
                            }`}
                          >
                            {formData.ocultarParaCliente === true
                              ? '🔒 Oculto para o cliente (Disponível em breve)'
                              : formData.ocultarParaCliente === false
                              ? '🔓 Prévia liberada antecipadamente'
                              : isPostBeyondTwoWeeks
                              ? '⏳ Disponível em breve (além de 2 semanas por padrão)'
                              : '👁️ Visível no portal (janela padrão de 2 semanas)'}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-75 mt-0.5 leading-snug">
                          {formData.ocultarParaCliente === true
                            ? 'O cliente vê no portal dele apenas "Disponível em breve", sabendo que há algo planejado sem acesso antecipado à mídia ou ao texto.'
                            : formData.ocultarParaCliente === false
                            ? 'O cliente tem acesso liberado para pré-visualizar a mídia e a legenda imediatamente no portal.'
                            : isPostBeyondTwoWeeks
                            ? `Programado para ${diffDaysFromNow} dias no futuro. Pelo padrão automático do portal, o cliente verá como "Disponível em breve" até faltar 2 semanas.`
                            : 'Como está dentro dos próximos 14 dias, o cliente visualiza normalmente pelo padrão do portal.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={isLockedForCreator || isLockedForManager}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            ocultarParaCliente: formData.ocultarParaCliente === true ? undefined : true
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                          formData.ocultarParaCliente === true
                            ? 'bg-[#D93A2B] text-white border-[#D93A2B] shadow-sm'
                            : isClaro
                            ? 'bg-white border-vulpis-grafite/20 hover:bg-vulpis-bege'
                            : 'bg-vulpis-grafite border-vulpis-cinza hover:border-vulpis-laranja'
                        }`}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>{formData.ocultarParaCliente === true ? 'Ocultado' : 'Ocultar para o cliente'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLockedForCreator || isLockedForManager}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            ocultarParaCliente: formData.ocultarParaCliente === false ? undefined : false
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 border transition-all ${
                          formData.ocultarParaCliente === false
                            ? 'bg-[#1E9E5A] text-white border-[#1E9E5A] shadow-sm font-bold'
                            : isClaro
                            ? 'bg-white border-vulpis-grafite/20 opacity-80 hover:opacity-100'
                            : 'bg-vulpis-grafite border-vulpis-cinza opacity-80 hover:opacity-100'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{formData.ocultarParaCliente === false ? 'Liberado' : 'Liberar Prévia'}</span>
                      </button>

                      {formData.ocultarParaCliente !== undefined && (
                        <button
                          type="button"
                          disabled={isLockedForCreator || isLockedForManager}
                          onClick={() => setFormData({ ...formData, ocultarParaCliente: undefined })}
                          className="px-2 py-1.5 rounded-xl text-[11px] font-semibold opacity-65 hover:opacity-100"
                        >
                          Redefinir Padrão
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Campo Único Menor: Upload de Arquivo no Computador / YouTube Não Listado e Miniatura */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${
                  isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-vulpis-grafite border-vulpis-cinza/40'
                }`}
              >
                {/* Linha superior: Título e Seletor no mesmo campo */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-vulpis-laranja" />
                    <span className="text-xs font-bold">Mídia da Postagem</span>
                    {(midias.length > 0 || currentVersao?.linkExterno) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#1E9E5A]/15 text-[#1E9E5A] border border-[#1E9E5A]/30">
                        {currentVersao?.linkExterno ? 'YouTube Vinculado' : 'Arquivo Carregado'}
                      </span>
                    )}
                  </div>

                  {/* Escolher entre upload no computador ou YouTube no mesmo local */}
                  <div className="flex items-center p-0.5 rounded-xl bg-black/10 dark:bg-black/30 border border-vulpis-cinza/30 text-xs">
                    <button
                      type="button"
                      onClick={() => setTipoOrigemMidia('computador')}
                      className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs ${
                        tipoOrigemMidia === 'computador'
                          ? 'bg-vulpis-azul text-white shadow-sm font-bold'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>Arquivo no Computador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoOrigemMidia('youtube')}
                      className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs ${
                        tipoOrigemMidia === 'youtube'
                          ? 'bg-vulpis-azul text-white shadow-sm font-bold'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Youtube className="w-3.5 h-3.5 text-[#FF0000]" />
                      <span>YouTube Não Listado</span>
                    </button>
                  </div>
                </div>

                {/* Área interativa única e menor */}
                {tipoOrigemMidia === 'computador' ? (
                  <div
                    className={`p-3 rounded-xl border border-dashed flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                      isClaro
                        ? 'bg-vulpis-bege/20 border-vulpis-grafite/20 hover:border-vulpis-azul'
                        : 'bg-[#121212] border-vulpis-cinza/50 hover:border-vulpis-laranja'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-vulpis-laranja/10 flex items-center justify-center text-vulpis-laranja flex-shrink-0">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">
                          {midias[0]?.nomeArquivo ? midias[0].nomeArquivo : 'Upload do arquivo no computador'}
                        </span>
                        <span className="text-[11px] opacity-65 block">
                          {uploadProgress !== null
                            ? `Enviando arquivo (${uploadProgress}%)...`
                            : midias[0]?.nomeArquivo
                            ? 'Arquivo pronto para aprovação (.mp4 ou imagem)'
                            : 'Formatos aceitos: .MP4, .MOV, .JPG ou .PNG'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="px-3.5 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm">
                        <RefreshCw className={`w-3.5 h-3.5 ${uploadProgress !== null ? 'animate-spin' : ''}`} />
                        <span>
                          {uploadProgress !== null
                            ? 'Enviando...'
                            : midias.length > 0
                            ? 'Alterar no Computador'
                            : 'Escolher no Computador'}
                        </span>
                        <input
                          type="file"
                          accept="video/mp4,video/*,image/*"
                          onChange={handleSimulateUpload}
                          className="hidden"
                        />
                      </label>

                      {midias.length > 0 && (
                        <button
                          type="button"
                          onClick={handleRemoveCurrentMedia}
                          className="px-2.5 py-1.5 rounded-xl bg-[#D93A2B]/15 hover:bg-[#D93A2B] text-[#D93A2B] hover:text-white border border-[#D93A2B]/30 text-xs font-bold flex items-center gap-1 transition-all"
                          title="Remover arquivo atual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${
                      isClaro ? 'bg-vulpis-bege/20 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza/50'
                    }`}
                  >
                    <div className="flex-1 relative">
                      <input
                        type="url"
                        placeholder="Cole o link do YouTube Não Listado (ex: https://youtu.be/...)"
                        value={newVersionLink}
                        onChange={(e) => setNewVersionLink(e.target.value)}
                        className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-vulpis-azul ${
                          isClaro ? 'bg-white border-vulpis-grafite/20' : 'bg-vulpis-grafite border-vulpis-cinza'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newVersionLink.trim()) return;
                        const trimmed = newVersionLink.trim();
                        const ytId = extractYouTubeId(trimmed);
                        const ytThumb = getYouTubeThumbnail(trimmed, 'hqdefault') || currentVersao?.capaUrl;
                        const newMidias: MidiaItem[] = ytId
                          ? [
                              {
                                url: trimmed,
                                tipo: 'video',
                                ordem: 0,
                                nomeArquivo: 'Vídeo do YouTube (Não Listado)'
                              }
                            ]
                          : [];
                        onCreateNewVersion(
                          post.id,
                          newMidias,
                          ytThumb,
                          trimmed,
                          ytId ? 'Vídeo do YouTube Não Listado vinculado' : 'Link externo vinculado'
                        );
                        setNewVersionLink('');
                      }}
                      className="px-4 py-2 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold whitespace-nowrap transition-all shadow-sm"
                    >
                      {currentVersao?.linkExterno ? 'Atualizar Link' : 'Vincular'}
                    </button>
                    {currentVersao?.linkExterno && (
                      <button
                        type="button"
                        onClick={handleRemoveCurrentMedia}
                        className="px-3 py-2 rounded-xl bg-[#D93A2B]/15 hover:bg-[#D93A2B] text-[#D93A2B] hover:text-white border border-[#D93A2B]/30 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Miniatura do cliente integrada no mesmo campo de forma compacta */}
                <div
                  className="pt-2.5 border-t border-vulpis-cinza/25 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {currentVersao?.capaUrl ? (
                      <img
                        src={currentVersao.capaUrl}
                        alt="Miniatura"
                        className="w-12 h-9 rounded-lg object-cover border border-vulpis-cinza/40 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-9 rounded-lg bg-black/40 text-[9px] opacity-60 flex items-center justify-center flex-shrink-0">
                        Sem capa
                      </div>
                    )}
                    <div>
                      <span className="font-semibold block text-[11px]">Miniatura para o Cliente</span>
                      <span className="text-[10px] opacity-60 block">Exibida no calendário e na aprovação</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="px-2.5 py-1 rounded-xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all">
                      <ImageIcon className="w-3 h-3" />
                      <span>{currentVersao?.capaUrl ? 'Alterar Miniatura' : 'Enviar Miniatura'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomThumbChange}
                        className="hidden"
                      />
                    </label>

                    {currentVersao?.capaUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveCurrentThumb}
                        className="p-1 rounded-lg text-[#D93A2B] hover:bg-[#D93A2B]/10 transition-colors"
                        title="Remover miniatura"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {!isLockedForCreator && !isLockedForManager && (
                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    Salvar Alterações
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 3: MOCKUP CELULAR */}
          {activeTab === 'mockup' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs opacity-70">
                  Simulação móvel fiel do formato <strong>{post.formato}</strong> para{' '}
                  <strong>{post.redes[0] || 'Instagram'}</strong>.
                </span>
              </div>
              <PhoneMockup post={post} cliente={cliente} />
            </div>
          )}

          {/* TAB 4: VERSÕES */}
          {activeTab === 'versoes' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <h3 className="font-miv-title text-base">Histórico de Versões de Mídia</h3>
              <div className="space-y-3">
                {(post.versoes || []).map((v) => (
                  <div
                    key={v.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      v.numero === post.versaoAtual
                        ? 'border-vulpis-laranja ring-1 ring-vulpis-laranja shadow-md'
                        : isClaro
                        ? 'bg-white border-vulpis-grafite/15'
                        : 'bg-vulpis-grafite border-vulpis-cinza/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-vulpis-laranja text-vulpis-grafite font-bold font-miv-title flex items-center justify-center text-sm">
                          V{v.numero}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs">Versão {v.numero}</span>
                            {v.numero === post.versaoAtual && (
                              <span className="px-2 py-0.5 rounded-full bg-vulpis-laranja text-vulpis-grafite text-[9px] font-bold">
                                Ativa
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] opacity-60 font-mono">
                            Criada em {formatDateTimeBr(v.criadoEm)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: HISTÓRICO */}
          {activeTab === 'historico' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <h3 className="font-miv-title text-base">Trilha de Auditoria &amp; Alterações</h3>
              <div className="relative pl-6 border-l-2 border-vulpis-cinza/40 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-vulpis-laranja ring-4 ring-white" />
                  <span className="text-[10px] opacity-60 font-mono block">
                    {formatDateTimeBr(post.criadoEm)}
                  </span>
                  <h4 className="text-xs font-bold mt-0.5">Postagem Criada</h4>
                  <p className="text-xs opacity-70">Status inicial: {post.status}</p>
                </div>
                {post.enviadoEm && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-vulpis-azul ring-4 ring-white" />
                    <span className="text-[10px] opacity-60 font-mono block">
                      {formatDateTimeBr(post.enviadoEm)}
                    </span>
                    <h4 className="text-xs font-bold mt-0.5">Enviada para Aprovação</h4>
                    <p className="text-xs opacity-70">Trava ativada para o criador</p>
                  </div>
                )}
                {post.aprovadoEm && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#1E9E5A] ring-4 ring-white" />
                    <span className="text-[10px] opacity-60 font-mono block">
                      {formatDateTimeBr(post.aprovadoEm)}
                    </span>
                    <h4 className="text-xs font-bold mt-0.5">Postagem Aprovada</h4>
                    <p className="text-xs opacity-70">Aprovada e pronta para publicação.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </>
      )}
      </div>

      {/* SOLICITAR AJUSTES DIALOG */}
      {showAdjustmentsDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div
            className={`w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 border ${
              isClaro ? 'bg-white border-[#D93A2B]/40 text-vulpis-grafite' : 'bg-vulpis-grafite border-[#D93A2B]/40 text-vulpis-bege'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D93A2B]/15 text-[#D93A2B] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-miv-title text-base text-[#D93A2B]">Solicitar Ajustes</h3>
                <p className="text-xs opacity-70">A postagem voltará destravada ao criador</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Observações do que precisa ser alterado <span className="text-[#D93A2B]">*</span>:
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Descreva as alterações necessárias..."
                  className={`w-full text-xs p-3 rounded-2xl border focus:outline-none focus:border-[#D93A2B] ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowAdjustmentsDialog(false)}
                className="px-4 py-2 text-xs font-semibold opacity-70 hover:opacity-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAdjustments}
                disabled={isSubmittingReview || !reviewNote.trim()}
                className="px-5 py-2.5 rounded-2xl bg-[#D93A2B] hover:bg-[#c33326] text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4" />
                {isSubmittingReview ? 'Enviando...' : 'Solicitar Ajustes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRAR PUBLICAÇÃO DIALOG */}
      {showPublishDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div
            className={`w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 border ${
              isClaro ? 'bg-white border-[#146C3E]/40 text-vulpis-grafite' : 'bg-vulpis-grafite border-[#146C3E]/40 text-vulpis-bege'
            }`}
          >
            <h3 className="font-miv-title text-base text-[#146C3E]">
              Registrar Postagem Publicada
            </h3>
            <p className="text-xs opacity-70">
              Informe a data real de publicação e o link público na rede.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Link do Post Publicado:</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/p/..."
                  value={publishLink}
                  onChange={(e) => setPublishLink(e.target.value)}
                  className={`w-full text-xs p-3 rounded-2xl border ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Data e Horário Real:</label>
                <input
                  type="datetime-local"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className={`w-full text-xs p-3 rounded-2xl border font-mono ${
                    isClaro ? 'bg-vulpis-bege/30 border-vulpis-grafite/20' : 'bg-[#121212] border-vulpis-cinza'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowPublishDialog(false)}
                className="px-4 py-2 text-xs font-semibold opacity-70 hover:opacity-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkPublished}
                className="px-5 py-2.5 rounded-2xl bg-[#146C3E] hover:bg-[#105631] text-white text-xs font-bold shadow-md"
              >
                Salvar Publicação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN MODAL (ADMIN ONLY) */}
      {showReopenModal && (
        <ReopenModal
          postTitle={post.titulo}
          onConfirm={async (motivo) => {
            await onReopen(post.id, motivo);
            setShowReopenModal(false);
          }}
          onClose={() => setShowReopenModal(false)}
        />
      )}
    </div>
  );
};
