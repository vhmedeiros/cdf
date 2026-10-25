import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, RotateCw } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  materialId: string;
  title?: string;
}

export default function PdfViewer({ materialId, title }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = `/api/v1/stream/${materialId}`;
  const storageKey = `cdf_pdf_page_${materialId}`;

  // Restore last page from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const p = parseInt(saved, 10);
        if (!isNaN(p) && p > 0) {
          setPageNumber(p);
        }
      }
    } catch {}
  }, [storageKey]);

  const handlePageChange = (newPage: number) => {
    if (!numPages) return;
    const clamped = Math.max(1, Math.min(numPages, newPage));
    setPageNumber(clamped);
    try {
      localStorage.setItem(storageKey, clamped.toString());
    } catch {}
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error("PDF load error:", err);
    setError("Não foi possível carregar o PDF diretamente.");
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full bg-[#131315] border border-[#2a2a2e] rounded-xl overflow-hidden text-[#ece9e2]">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1b1b1e] border-b border-[#2a2a2e] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#ece9e2] truncate max-w-[200px] sm:max-w-xs">
            {title || "Documento PDF"}
          </span>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="p-1 rounded hover:bg-[#2a2a2e] disabled:opacity-30 disabled:hover:bg-transparent text-[#9a978f] hover:text-[#ece9e2] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs tabular-nums text-[#9a978f]">
            Página <span className="text-[#d4af37] font-semibold">{pageNumber}</span> de{" "}
            {numPages || "..."}
          </span>
          <button
            onClick={() => handlePageChange(pageNumber + 1)}
            disabled={!!numPages && pageNumber >= numPages}
            className="p-1 rounded hover:bg-[#2a2a2e] disabled:opacity-30 disabled:hover:bg-transparent text-[#9a978f] hover:text-[#ece9e2] transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Download */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
            className="p-1 rounded hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] transition"
            title="Reduzir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-[11px] text-[#9a978f]">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2.0, s + 0.15))}
            className="p-1 rounded hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] transition"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="p-1 rounded hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#d4af37] transition ml-1"
            title="Baixar PDF"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* PDF Canvas / Document */}
      <div className="flex-1 overflow-auto p-4 flex justify-center bg-[#0b0b0c] min-h-[500px]">
        {error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs space-y-3">
            <p className="text-[#9a978f]">{error}</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-[#f5d76e] transition"
            >
              Abrir PDF em nova aba
            </a>
          </div>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-full text-xs text-[#9a978f] py-20">
                Carregando PDF...
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderAnnotationLayer={false}
              renderTextLayer={true}
              className="shadow-2xl rounded"
            />
          </Document>
        )}
      </div>
    </div>
  );
}
