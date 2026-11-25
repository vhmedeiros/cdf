import React, { useEffect, useState } from "react";
import { Download, AlertCircle } from "lucide-react";

interface HtmlViewerProps {
  materialId: string;
  title?: string;
}

export default function HtmlViewer({ materialId, title }: HtmlViewerProps) {
  const [sanitizedHtml, setSanitizedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = `/api/v1/stream/${materialId}`;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSanitizedHtml(null);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(async (html) => {
        // DOMPurify só roda no browser
        const DOMPurify = (await import("dompurify")).default;
        const clean = DOMPurify.sanitize(html, {
          // Permite estilos inline e algumas tags comuns de documento
          ADD_TAGS: ["style"],
          ADD_ATTR: ["target", "rel"],
          FORCE_BODY: true,
        });
        setSanitizedHtml(clean);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar HTML:", err);
        setError("Não foi possível carregar o arquivo.");
        setLoading(false);
      });
  }, [fileUrl]);

  return (
    <div className="flex flex-col h-full bg-[#131315] border border-[#2a2a2e] rounded-xl overflow-hidden text-[#ece9e2]">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-[#1b1b1e] border-b border-[#2a2a2e] text-xs sm:px-4">
        <span className="font-medium text-[#ece9e2] truncate sm:max-w-xs">
          {title || "Documento HTML"}
        </span>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex min-h-9 min-w-9 items-center justify-center rounded p-1 hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#d4af37] transition touch-manipulation"
          title="Baixar arquivo"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden bg-[#0f0f11]">
        {loading && (
          <div className="flex items-center justify-center py-20 text-xs text-[#9a978f]">
            Carregando...
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircle className="w-8 h-8 text-[#9a978f]" />
            <p className="text-xs text-[#9a978f]">{error}</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-[#f5d76e] transition text-xs"
            >
              Abrir em nova aba
            </a>
          </div>
        )}

        {sanitizedHtml !== null && !error && (
          // iframe srcdoc isola o DOM do HTML renderizado do resto da página
          <iframe
            srcDoc={sanitizedHtml}
            sandbox="allow-same-origin allow-popups"
            className="w-full h-full min-h-[60dvh] sm:min-h-[600px] border-0 bg-white"
            title={title || "Documento HTML"}
          />
        )}
      </div>
    </div>
  );
}
