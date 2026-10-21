import React, { useState, useMemo } from 'react';
import { Postagem, Cliente } from '../../types';
import { VulpisLogo } from '../common/VulpisLogo';
import { formatDateBr, formatTime24h, MESES_PT_BR } from '../../utils/dateUtils';
import { STATUS_CONFIG, StatusIcon } from '../../utils/statusConfig';
import { SocialIcon } from '../../utils/socialIcons';
import {
  Printer,
  FileSpreadsheet,
  Calendar,
  Layers
} from 'lucide-react';

interface ExportModalProps {
  posts: Postagem[];
  clientes: Cliente[];
  selectedClienteId: string;
  tema?: 'claro' | 'escuro';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  posts,
  clientes,
  selectedClienteId,
  tema = 'claro'
}) => {
  const isClaro = tema === 'claro';

  const [targetClienteId, setTargetClienteId] = useState<string>(
    selectedClienteId !== 'todos' ? selectedClienteId : clientes[0]?.id || ''
  );
  const [targetMonth, setTargetMonth] = useState<number>(9); // 9 = Outubro
  const [targetYear, setTargetYear] = useState<number>(2026);

  const targetCliente = clientes.find((c) => c.id === targetClienteId) || clientes[0];

  const clientPosts = useMemo(() => {
    return posts
      .filter((p) => {
        if (targetCliente && p.clienteId !== targetCliente.id) return false;
        const d = new Date(p.dataPublicacao);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      })
      .sort((a, b) => new Date(a.dataPublicacao).getTime() - new Date(b.dataPublicacao).getTime());
  }, [posts, targetCliente, targetMonth, targetYear]);

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Cliente',
      'Titulo',
      'Data_Publicacao',
      'Horario',
      'Redes',
      'Formato',
      'Status',
      'Versao',
      'Nota',
      'Link_Publicado',
      'Legenda'
    ];

    const rows = clientPosts.map((p) => [
      `"${p.id}"`,
      `"${targetCliente?.nome || ''}"`,
      `"${p.titulo.replace(/"/g, '""')}"`,
      `"${formatDateBr(p.dataPublicacao)}"`,
      `"${formatTime24h(p.dataPublicacao)}"`,
      `"${p.redes.join(', ')}"`,
      `"${p.formato}"`,
      `"${p.status}"`,
      `"V${p.versaoAtual}"`,
      `"${p.nota || ''}"`,
      `"${p.linkPublicado || ''}"`,
      `"${(p.legenda || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `cronograma_${targetCliente?.nome.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${MESES_PT_BR[targetMonth]}_${targetYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controles de Exportação (Ocultos na impressão) */}
      <div
        className={`no-print p-6 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-4 ${
          isClaro ? 'bg-white border-vulpis-grafite/15 text-vulpis-grafite' : 'bg-vulpis-grafite border-vulpis-cinza/40 text-vulpis-bege'
        }`}
      >
        <div>
          <h2 className="font-miv-title text-xl tracking-wide">
            Exportar Apresentação & Relatório
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Gere o PDF com a identidade oficial da Vulpis Core para envio ao cliente ou extraia a planilha em CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={targetClienteId}
            onChange={(e) => setTargetClienteId(e.target.value)}
            className={`text-xs rounded-xl px-3 py-2 font-semibold border focus:outline-none focus:border-vulpis-azul ${
              isClaro
                ? 'bg-vulpis-bege/40 border-vulpis-grafite/20 text-vulpis-grafite'
                : 'bg-[#121212] border-vulpis-cinza/50 text-vulpis-bege'
            }`}
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <select
            value={targetMonth}
            onChange={(e) => setTargetMonth(parseInt(e.target.value))}
            className={`text-xs rounded-xl px-3 py-2 font-semibold border focus:outline-none focus:border-vulpis-azul ${
              isClaro
                ? 'bg-vulpis-bege/40 border-vulpis-grafite/20 text-vulpis-grafite'
                : 'bg-[#121212] border-vulpis-cinza/50 text-vulpis-bege'
            }`}
          >
            {MESES_PT_BR.map((m, idx) => (
              <option key={m} value={idx}>
                {m} {targetYear}
              </option>
            ))}
          </select>

          {/* Exportar CSV em Azul Vulpis com texto branco */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-vulpis-azul hover:bg-vulpis-azul/90 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          {/* Imprimir / Salvar PDF em Laranja com texto grafite em negrito conforme MIV! */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-vulpis-laranja hover:bg-vulpis-laranjaVivo text-vulpis-grafite text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* DOCUMENTO DE APRESENTAÇÃO INSTITUCIONAL (Formatado para A4 e impressão) */}
      <div className="bg-white text-vulpis-grafite border border-vulpis-grafite/20 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 max-w-5xl mx-auto print:border-none print:shadow-none print:p-0">
        {/* Cabeçalho Oficial: Logo Principal Vulpis Core + Logo do Cliente */}
        <div className="flex items-center justify-between border-b border-vulpis-grafite/20 pb-6">
          <div className="flex items-center gap-4">
            <VulpisLogo variant="principal" size="lg" theme="claro" />
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-[11px] font-bold text-vulpis-cinza uppercase tracking-wider block">
                Planejamento Mensal de Conteúdo
              </span>
              <h3 className="font-miv-title text-xl text-vulpis-grafite">
                {targetCliente?.nome}
              </h3>
              <span className="text-xs text-vulpis-laranja font-bold font-miv-title">
                {MESES_PT_BR[targetMonth]} de {targetYear}
              </span>
            </div>
            {targetCliente?.logoUrl && (
              <img
                src={targetCliente.logoUrl}
                alt={targetCliente.nome}
                className="w-14 h-14 rounded-2xl object-cover border border-vulpis-grafite/20 bg-vulpis-bege/30"
              />
            )}
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-4 gap-3 p-4 rounded-2xl bg-vulpis-bege/40 border border-vulpis-grafite/15 text-center">
          <div>
            <span className="text-[10px] text-vulpis-cinza uppercase font-bold block">
              Total de Entregas
            </span>
            <span className="text-xl font-miv-title text-vulpis-grafite">
              {clientPosts.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#1E9E5A] uppercase font-bold block">
              Aprovadas
            </span>
            <span className="text-xl font-miv-title text-[#1E9E5A]">
              {clientPosts.filter((p) => p.status === 'Aprovado' || p.status === 'Agendado' || p.status === 'Publicado').length}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#D93A2B] uppercase font-bold block">
              Em Ajustes
            </span>
            <span className="text-xl font-miv-title text-[#D93A2B]">
              {clientPosts.filter((p) => p.status === 'Ajustes solicitados').length}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-vulpis-cinza uppercase font-bold block">
              Redes Ativas
            </span>
            <span className="text-xs font-bold text-vulpis-azul mt-1 block">
              {targetCliente?.redes.join(', ')}
            </span>
          </div>
        </div>

        {/* Relação de Postagens */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-vulpis-cinza flex items-center justify-between">
            <span>Cronograma Detalhado</span>
            <span className="text-[11px] font-normal opacity-70">
              Datas, status e miniaturas
            </span>
          </h4>

          {clientPosts.length === 0 ? (
            <div className="p-12 text-center text-sm opacity-60 bg-vulpis-bege/20 rounded-2xl border border-vulpis-grafite/10">
              Nenhuma postagem encontrada para este cliente no mês selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientPosts.map((post) => {
                const currentVersao =
                  post.versoes?.find((v) => v.numero === post.versaoAtual) || post.versoes?.[0];
                const thumbUrl = currentVersao?.capaUrl || currentVersao?.midias?.[0]?.url;
                const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG['Rascunho'];

                return (
                  <div
                    key={post.id}
                    className="p-4 rounded-2xl bg-white border border-vulpis-grafite/20 shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold font-mono flex items-center gap-1.5 text-vulpis-grafite">
                          <Calendar className="w-3.5 h-3.5 text-vulpis-laranja" />
                          {formatDateBr(post.dataPublicacao)} às {formatTime24h(post.dataPublicacao)}
                        </span>
                        <span
                          style={{ backgroundColor: statusCfg.hex }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            post.status === 'Aguardando aprovação' ? 'text-vulpis-grafite' : 'text-white'
                          }`}
                        >
                          <StatusIcon status={post.status} size={10} />
                          <span>{post.status}</span>
                        </span>
                      </div>

                      <h5 className="font-bold text-sm leading-snug text-vulpis-grafite">
                        {post.titulo}
                      </h5>

                      <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-vulpis-bege font-semibold text-[11px] text-vulpis-grafite">
                          {post.formato}
                        </span>
                        <div className="flex items-center gap-1">
                          {post.redes.map((r) => (
                            <span key={r} title={r} className="text-vulpis-azul">
                              <SocialIcon rede={r} size={13} />
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3 mt-3 items-start">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover border border-vulpis-grafite/20 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-vulpis-bege/50 border border-vulpis-grafite/20 flex items-center justify-center opacity-60 flex-shrink-0">
                            <Layers className="w-6 h-6 text-vulpis-cinza" />
                          </div>
                        )}
                        <p className="text-[11px] leading-relaxed line-clamp-3 opacity-80">
                          {post.legenda || 'Sem legenda cadastrada.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-vulpis-grafite/15 flex items-center justify-between text-[10px] font-mono opacity-70">
                      <span>Versão: V{post.versaoAtual}</span>
                      {post.nota && (
                        <span className="text-[#F2B705] font-bold">Nota: {post.nota}/5 ★</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé Oficial da Vulpis Core */}
        <div className="pt-6 border-t border-vulpis-grafite/20 flex flex-wrap items-center justify-between gap-3 text-xs opacity-70">
          <div>
            Relatório gerado por <strong>Vulpis Core</strong> • Estratégia & Conteúdo Digital
          </div>
          <div className="font-mono text-[11px]">
            {new Date().toLocaleDateString('pt-BR')} — Documento oficial de apresentação.
          </div>
        </div>
      </div>
    </div>
  );
};
