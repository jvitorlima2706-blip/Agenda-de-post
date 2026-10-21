import React, { useState, useRef } from 'react';
import { RoteiroLembrete } from '../../types';
import { uploadMediaFile } from '../../utils/mediaUtils';
import {
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  Download,
  Copy,
  Check,
  Sparkles,
  Bold,
  Italic,
  List,
  Heading,
  Film,
  Megaphone,
  Clock,
  FileUp,
  AlertTriangle,
  X,
  Send
} from 'lucide-react';

interface ScriptEditorSectionProps {
  clienteId?: string;
  itemTitle?: string;
  roteiro: string;
  onChangeRoteiro: (val: string) => void;
  notepad?: string;
  onChangeNotepad?: (val: string) => void;
  lembretes?: RoteiroLembrete[];
  onChangeLembretes?: (list: RoteiroLembrete[]) => void;
  arquivoNome?: string;
  arquivoUrl?: string;
  onChangeArquivo: (nome?: string, url?: string) => void;
  onSave?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  deleteLabel?: string;
  isSaving?: boolean;
  readOnly?: boolean;
  tema?: 'claro' | 'escuro';
}

export const ScriptEditorSection: React.FC<ScriptEditorSectionProps> = ({
  clienteId = 'geral',
  itemTitle,
  roteiro,
  onChangeRoteiro,
  arquivoNome,
  arquivoUrl,
  onChangeArquivo,
  onSave,
  onDelete,
  deleteLabel = 'Excluir Roteiro',
  isSaving = false,
  readOnly = false,
  tema = 'claro'
}) => {
  const isClaro = tema === 'claro';

  const [copied, setCopied] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Confirmação em duas etapas ("excluir") igual à de empresas
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estatísticas de leitura / locução
  const wordsCount = roteiro.trim() ? roteiro.trim().split(/\s+/).length : 0;
  const charsCount = roteiro.length;
  // Média de locução: ~130 palavras por minuto (~2.16 palavras/segundo)
  const estimatedSeconds = Math.round((wordsCount / 130) * 60);

  const insertAtCursor = (snippet: string) => {
    if (readOnly) return;
    const el = textareaRef.current;
    if (!el) {
      onChangeRoteiro(roteiro ? `${roteiro}\n${snippet}` : snippet);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = roteiro.substring(start, end);
    const replacement = selected ? `${snippet}${selected}` : snippet;
    const nextValue = roteiro.substring(0, start) + replacement + roteiro.substring(end);
    onChangeRoteiro(nextValue);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 10);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      // Se for arquivo de texto (.txt, .md, .srt), também extrai o texto diretamente para o editor
      const lowerName = file.name.toLowerCase();
      if (
        file.type.startsWith('text/') ||
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.srt')
      ) {
        const textContent = await file.text();
        if (textContent && textContent.trim()) {
          onChangeRoteiro(
            roteiro.trim()
              ? `${roteiro}\n\n--- Conteúdo importado de ${file.name} ---\n${textContent}`
              : textContent
          );
        }
      }

      const uploadedUrl = await uploadMediaFile(file, clienteId);
      onChangeArquivo(file.name, uploadedUrl);
    } catch (err) {
      console.error('Erro ao anexar arquivo de roteiro:', err);
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    onChangeArquivo(undefined, undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(roteiro || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const content = `ROTEIRO DE POSTAGEM\n====================================\n${itemTitle ? `TÍTULO: ${itemTitle}\n====================================\n\n` : '\n'}${
      roteiro || '(Sem roteiro digitado)'
    }`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roteiro-${itemTitle ? itemTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'postagem'}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* CARD PRINCIPAL DO ROTEIRO: DIGITAÇÃO, FORMATAÇÃO OU UPLOAD DE DOCUMENTO */}
      <div
        className={`flex flex-col rounded-3xl border shadow-sm overflow-hidden ${
          isClaro
            ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
            : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
        }`}
      >
        {/* Cabeçalho do Roteiro */}
        <div
          className={`px-4 sm:px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
            isClaro
              ? 'bg-vulpis-azul/10 border-vulpis-grafite/15'
              : 'bg-[#121212] border-vulpis-cinza/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-vulpis-azul text-white flex items-center justify-center font-bold shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-miv-title text-sm sm:text-base">
                {itemTitle || 'Roteiro & Ideias de Conteúdo'}
              </h4>
              <p className="text-[11px] sm:text-xs opacity-70">
                Campo para digitação, formatação ou upload de documento
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyScript}
              disabled={!roteiro.trim()}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/20 hover:bg-vulpis-bege/40'
                  : 'bg-[#181818] border-vulpis-cinza/50 hover:bg-vulpis-cinza/30 text-vulpis-bege'
              }`}
              title="Copiar texto do roteiro para a área de transferência"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#1E9E5A]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              disabled={!roteiro.trim()}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isClaro
                  ? 'bg-white border-vulpis-grafite/20 hover:bg-vulpis-bege/40'
                  : 'bg-[#181818] border-vulpis-cinza/50 hover:bg-vulpis-cinza/30 text-vulpis-bege'
              }`}
              title="Baixar arquivo de texto (.txt)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar .TXT</span>
            </button>

            {/* Upload de Arquivo de Documento */}
            {!readOnly && (
              <label className="px-3.5 py-1.5 rounded-xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm">
                {arquivoNome ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Alterar Documento</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-3.5 h-3.5" />
                    <span>{isUploadingFile ? 'Subindo...' : 'Upload de Documento'}</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.doc,.docx,.pdf,.srt,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Card do Arquivo Anexado (se houver) */}
        {arquivoNome && (
          <div
            className={`px-4 sm:px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
              isClaro
                ? 'bg-vulpis-bege/40 border-vulpis-grafite/15'
                : 'bg-[#121212]/90 border-vulpis-cinza/40'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Upload className="w-4 h-4 text-vulpis-laranja flex-shrink-0" />
              <span className="font-bold truncate">Documento Anexado: {arquivoNome}</span>
            </div>
            <div className="flex items-center gap-2">
              {arquivoUrl && (
                <a
                  href={arquivoUrl}
                  download={arquivoNome}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" /> Baixar / Abrir
                </a>
              )}
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="px-2.5 py-1 rounded-lg bg-[#D93A2B] hover:bg-[#b82d20] text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>
          </div>
        )}

        {/* Barra de Ferramentas de Formatação de Roteiro */}
        {!readOnly && (
          <div
            className={`px-3.5 py-2 border-b flex flex-wrap items-center gap-1.5 ${
              isClaro
                ? 'bg-vulpis-bege/25 border-vulpis-grafite/15'
                : 'bg-[#181818] border-vulpis-cinza/40'
            }`}
          >
            <button
              type="button"
              onClick={() => insertAtCursor('# TÍTULO DA CENA\n')}
              className="p-1.5 rounded-lg border border-transparent hover:border-vulpis-cinza/40 hover:bg-black/5 text-xs font-bold flex items-center gap-1"
              title="Inserir Título"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertAtCursor('**Texto em Destaque** ')}
              className="p-1.5 rounded-lg border border-transparent hover:border-vulpis-cinza/40 hover:bg-black/5 text-xs font-bold"
              title="Negrito"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertAtCursor('_Entonação / Rubrica_ ')}
              className="p-1.5 rounded-lg border border-transparent hover:border-vulpis-cinza/40 hover:bg-black/5 text-xs"
              title="Itálico / Rubrica"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertAtCursor('\n• ')}
              className="p-1.5 rounded-lg border border-transparent hover:border-vulpis-cinza/40 hover:bg-black/5 text-xs"
              title="Lista de Tópicos"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            <span className="h-4 w-px bg-vulpis-cinza/30 mx-1" />

            {/* Blocos Prontos de Roteiro */}
            <button
              type="button"
              onClick={() =>
                insertAtCursor(
                  '\n[GANCHO INICIAL — 00:00 a 00:04]\nFala (Câmera): \nTexto na Tela (Lettering): \n'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-vulpis-laranja/15 hover:bg-vulpis-laranja text-vulpis-laranja hover:text-vulpis-grafite text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <Sparkles className="w-3 h-3" />
              <span>+ Gancho</span>
            </button>

            <button
              type="button"
              onClick={() =>
                insertAtCursor(
                  '\n[CENA / DESENVOLVIMENTO]\nÁudio / Locução: \nImagem / B-Roll: \n'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-vulpis-azul/15 hover:bg-vulpis-azul text-vulpis-azul hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <Film className="w-3 h-3" />
              <span>+ Cena</span>
            </button>

            <button
              type="button"
              onClick={() =>
                insertAtCursor(
                  '\n[CHAMADA PARA AÇÃO — CTA FINAL]\nFala Final: \nAção Esperada: \n'
                )
              }
              className="px-2.5 py-1 rounded-lg bg-[#1E9E5A]/15 hover:bg-[#1E9E5A] text-[#1E9E5A] hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <Megaphone className="w-3 h-3" />
              <span>+ CTA</span>
            </button>
          </div>
        )}

        {/* Campo de Digitação e Formatação do Roteiro */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            rows={14}
            readOnly={readOnly}
            value={roteiro}
            onChange={(e) => onChangeRoteiro(e.target.value)}
            placeholder={`Escreva o roteiro completo da postagem aqui dentro...\n\nExemplo estruturado:\n[GANCHO - 00:00 a 00:03]\nFala: Você sabia que 80% das postagens perdem retenção nos primeiros 3 segundos?\n\n[DESENVOLVIMENTO - 00:04 a 00:25]\nFala: Para evitar isso, estruturamos este conteúdo em 3 passos práticos...\n\n[CTA FINAL]\nFala: Comente aqui abaixo e salve este post!`}
            className={`w-full flex-1 p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed focus:outline-none focus:border-vulpis-azul resize-y font-sans ${
              isClaro
                ? 'bg-[#FDFBF7] border-vulpis-grafite/15 text-vulpis-grafite shadow-inner'
                : 'bg-[#121212] border-vulpis-cinza text-vulpis-bege'
            }`}
          />

          {/* Rodapé: Contagem de palavras e tempo estimado de fala */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-[11px] opacity-75">
            <div className="flex items-center gap-3 font-mono">
              <span>{wordsCount} palavras</span>
              <span>•</span>
              <span>{charsCount} caracteres</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-vulpis-laranja">
              <Clock className="w-3.5 h-3.5" />
              <span>Tempo estimado de fala: ~{estimatedSeconds}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR DE AÇÕES: EXCLUIR ROTEIRO (CONFIRMAÇÃO EM 2 ETAPAS) & SALVAR */}
      {!readOnly && (
        <div
          className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-3 ${
            isClaro
              ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite'
              : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmText('');
              setIsDeleteModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#D93A2B]/15 hover:bg-[#D93A2B] text-[#D93A2B] hover:text-white border border-[#D93A2B]/30 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleteLabel}</span>
          </button>

          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Roteiro'}</span>
            </button>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO EM DUAS ETAPAS PARA EXCLUIR ROTEIRO (DIGITAR "excluir") */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
              isClaro
                ? 'bg-white border-[#D93A2B]/40 text-vulpis-grafite'
                : 'bg-vulpis-grafite border-[#D93A2B]/40 text-vulpis-bege'
            }`}
          >
            <div className="p-5 bg-[#D93A2B] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-90 block">
                    Confirmação em Duas Etapas
                  </span>
                  <h3 className="font-miv-title text-base">{deleteLabel}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText('');
                }}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div
                className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  isClaro
                    ? 'bg-[#D93A2B]/10 border-[#D93A2B]/30'
                    : 'bg-[#121212] border-[#D93A2B]/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#D93A2B]/20 text-[#D93A2B] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm block text-[#D93A2B]">
                    {itemTitle || 'Roteiro de Postagem'}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {onDelete
                      ? 'Esta ação excluirá o roteiro selecionado permanentemente.'
                      : 'Esta ação limpará o texto do roteiro e os documentos anexados.'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5">
                  Etapa 2: Para confirmar a exclusão, escreva{' '}
                  <span className="px-1.5 py-0.5 rounded bg-[#D93A2B]/15 text-[#D93A2B] font-mono">
                    excluir
                  </span>{' '}
                  no campo abaixo:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (
                      e.key === 'Enter' &&
                      deleteConfirmText.trim().toLowerCase() === 'excluir' &&
                      !isDeleting
                    ) {
                      e.preventDefault();
                      setIsDeleting(true);
                      try {
                        if (onDelete) {
                          await onDelete();
                        } else {
                          onChangeRoteiro('');
                          onChangeArquivo(undefined, undefined);
                        }
                        setIsDeleteModalOpen(false);
                        setDeleteConfirmText('');
                      } finally {
                        setIsDeleting(false);
                      }
                    }
                  }}
                  placeholder='Digite "excluir" para habilitar o botão'
                  className={`w-full p-3 rounded-xl border font-mono text-xs focus:outline-none focus:border-[#D93A2B] ${
                    isClaro
                      ? 'bg-vulpis-bege/20 border-vulpis-grafite/25 text-vulpis-grafite'
                      : 'bg-[#121212] border-vulpis-cinza text-vulpis-bege'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 rounded-xl font-semibold opacity-70 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting || deleteConfirmText.trim().toLowerCase() !== 'excluir'}
                  onClick={async () => {
                    if (deleteConfirmText.trim().toLowerCase() !== 'excluir') return;
                    setIsDeleting(true);
                    try {
                      if (onDelete) {
                        await onDelete();
                      } else {
                        onChangeRoteiro('');
                        onChangeArquivo(undefined, undefined);
                      }
                      setIsDeleteModalOpen(false);
                      setDeleteConfirmText('');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#D93A2B] hover:bg-[#b82d20] text-white font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
