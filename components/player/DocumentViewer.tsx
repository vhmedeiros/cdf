import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  FileText,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Image as ImageIcon,
  HelpCircle,
  Eye,
  BookOpen,
} from "lucide-react";

// Lazy load PdfViewer para não pesar no carregamento inicial
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 text-xs text-[#9a978f]">
      Carregando leitor de PDF...
    </div>
  ),
});

interface DocumentViewerProps {
  materialId: string;
  driveFileId: string;
  title: string;
  mime: string;
  kind: string;
  sizeBytes?: number;
}

export default function DocumentViewer({
  materialId,
  driveFileId,
  title,
  mime,
  kind,
  sizeBytes,
}: DocumentViewerProps) {
  const [viewMode, setViewMode] = useState<"embedded" | "canvas">(
    kind === "pdf" ? "canvas" : "embedded",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const downloadUrl = `/api/v1/stream/${materialId}`;
  const drivePreviewUrl = `https://drive.google.com/file/d/${driveFileId}/preview`;
  const driveOpenUrl = `https://drive.google.com/file/d/${driveFileId}/view`;

  // Detecta o tipo de documento e ícone correspondente
  const isPdf = kind === "pdf" || mime.includes("pdf");
  const isPresentation =
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    title.endsWith(".pptx") ||
    title.endsWith(".ppt");
  const isSpreadsheet =
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    title.endsWith(".xlsx") ||
    title.endsWith(".xls");
  const isWord =
    mime.includes("word") ||
    mime.includes("document") ||
    title.endsWith(".docx") ||
    title.endsWith(".doc");

  const getFormatBadge = () => {
    if (isPresentation) {
      return {
        label: "Apresentação / Slides",
        icon: Presentation,
        color: "text-[#f5d76e] bg-[#f5d76e]/10 border-[#f5d76e]/30",
      };
    }
    if (isSpreadsheet) {
      return {
        label: "Planilha",
        icon: FileSpreadsheet,
        color: "text-[#6fbf73] bg-[#6fbf73]/10 border-[#6fbf73]/30",
      };
    }
    if (isWord) {
      return {
        label: "Documento Word / Apostila",
        icon: FileText,
        color: "text-[#6bb8ff] bg-[#6bb8ff]/10 border-[#6bb8ff]/30",
      };
    }
    if (isPdf) {
      return {
        label: "Documento PDF",
        icon: BookOpen,
        color: "text-[#d4af37] bg-[#d4af37]/10 border-[#d4af37]/30",
      };
    }
    return {
      label: "Material Complementar",
      icon: FileCode,
      color: "text-[#ece9e2] bg-[#1b1b1e] border-[#2a2a2e]",
    };
  };

  const badge = getFormatBadge();
  const BadgeIcon = badge.icon;

  function formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return "";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <div
      className={`flex flex-col bg-[#131315] border border-[#2a2a2e] rounded-2xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? "fixed inset-4 z-50 rounded-2xl" : "w-full"
      }`}
    >
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#1b1b1e] border-b border-[#2a2a2e]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium font-mono ${badge.color}`}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </span>

          <h3 className="font-semibold text-xs sm:text-sm text-[#ece9e2] truncate max-w-[200px] sm:max-w-md">
            {title}
          </h3>

          {sizeBytes && sizeBytes > 0 && (
            <span className="text-[10px] text-[#9a978f] font-mono hidden sm:inline">
              ({formatBytes(sizeBytes)})
            </span>
          )}
        </div>

        {/* Botoes de Ação */}
        <div className="flex items-center gap-2">
          {isPdf && (
            <div className="flex items-center bg-[#131315] p-0.5 rounded-lg border border-[#2a2a2e] text-[11px]">
              <button
                onClick={() => setViewMode("canvas")}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMode === "canvas"
                    ? "bg-[#d4af37] text-black font-semibold shadow"
                    : "text-[#9a978f] hover:text-[#ece9e2]"
                }`}
              >
                Leitor CDF
              </button>
              <button
                onClick={() => setViewMode("embedded")}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMode === "embedded"
                    ? "bg-[#d4af37] text-black font-semibold shadow"
                    : "text-[#9a978f] hover:text-[#ece9e2]"
                }`}
              >
                Drive
              </button>
            </div>
          )}

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d4af37]/10 hover:bg-[#d4af37] text-[#d4af37] hover:text-black border border-[#d4af37]/30 transition text-xs font-semibold shadow-sm"
            title="Baixar material para o computador"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Baixar</span>
          </a>

          <a
            href={driveOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-[#9a978f] hover:text-[#d4af37] transition text-xs"
            title="Abrir no Google Drive em nova aba"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-[#9a978f] hover:text-[#ece9e2] transition text-xs"
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Área do Visualizador */}
      <div className="relative flex-1 bg-[#0b0b0c] flex items-center justify-center min-h-[550px] sm:min-h-[680px]">
        {isPdf && viewMode === "canvas" ? (
          <div className="w-full h-full">
            <PdfViewer materialId={materialId} title={title} />
          </div>
        ) : (
          <div className="w-full h-full relative">
            <iframe
              src={drivePreviewUrl}
              className="w-full h-[550px] sm:h-[680px] border-0 rounded-b-2xl bg-[#0b0b0c]"
              allow="autoplay; encrypted-media"
              loading="lazy"
              title={title}
            />

            {/* Banner de apoio no rodapé se o iframe precisar de login da conta Google */}
            <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-[#131315]/90 backdrop-blur-md border border-[#2a2a2e] px-3 py-1.5 rounded-xl text-[11px] text-[#9a978f] shadow-lg">
              <span>Pré-visualização do Google Drive</span>
              <a
                href={driveOpenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#d4af37] hover:underline flex items-center gap-1 font-medium ml-1"
              >
                <span>Abrir direto</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
