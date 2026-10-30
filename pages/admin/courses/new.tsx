import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  FolderPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Video,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface PreviewData {
  folder_id: string;
  total_duration_seconds: number;
  materials_count: number;
  modules_count: number;
  modules: Array<{
    title: string;
    lessons_count: number;
    lessons: Array<{
      title: string;
      materials_count: number;
      materials: Array<{
        title: string;
        kind: string;
        duration_seconds: number;
      }>;
    }>;
  }>;
  warning?: string;
}

export default function NewCourseAdminPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [description, setDescription] = useState("");
  const [lessonStrategy, setLessonStrategy] = useState("auto");

  // Estados de Preview e Salvamento
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-slugify ao digitar o título
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const autoSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(autoSlug);
  };

  // Testar conexão e pré-visualizar pasta do Google Drive
  const handlePreview = async () => {
    if (!driveUrl.trim()) {
      setPreviewError("Por favor, cole o link da pasta do Google Drive primeiro.");
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      const res = await fetch("/api/v1/admin/courses/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drive_url: driveUrl.trim(),
          lesson_strategy: lessonStrategy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao consultar Google Drive.");
      }

      setPreviewData(data);
    } catch (err: any) {
      setPreviewError(err.message || "Não foi possível acessar a pasta do Google Drive.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Cadastrar e sincronizar curso
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !driveUrl.trim()) {
      setSaveError("Preencha todos os campos obrigatórios (Título, Slug e Link do Drive).");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // 1. Cria o curso no banco
      const createRes = await fetch("/api/v1/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          drive_url: driveUrl.trim(),
          description: description.trim() || null,
          lesson_strategy: lessonStrategy,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.message || "Erro ao criar curso no banco.");
      }

      const courseId = createData.id;

      // 2. Dispara a sincronização e autoinscrição do admin
      const syncRes = await fetch(`/api/v1/admin/courses/${courseId}/sync?direct=true`, {
        method: "POST",
      });

      if (!syncRes.ok) {
        const syncData = await syncRes.json();
        throw new Error(syncData.message || "Curso criado, mas falhou ao sincronizar arquivos.");
      }

      // 3. Sucesso! Redireciona para a sala de aula do novo curso
      router.push(`/courses/${slug.trim()}`);
    } catch (err: any) {
      setSaveError(err.message || "Erro durante o cadastro do curso.");
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Cadastrar Novo Curso — Painel do Administrador</title>
      </Head>

      <div className="min-h-screen bg-[#0b0b0c] text-[#ece9e2]">
        {/* Header */}
        <header className="border-b border-[#2a2a2e] bg-[#131315]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/courses"
                className="p-2 rounded-xl bg-[#1b1b1e] hover:bg-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] transition flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar aos Cursos
              </Link>

              <div className="h-4 w-px bg-[#2a2a2e]" />

              <span className="font-semibold text-sm">Novo Curso</span>
            </div>
          </div>
        </header>

        {/* Formulário Principal */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-8 space-y-6">
          <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="pb-4 border-b border-[#2a2a2e]">
              <div className="flex items-center gap-3 mb-1">
                <FolderPlus className="w-6 h-6 text-[#d4af37]" />
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#ece9e2]">
                  Cadastrar Novo Curso
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#9a978f]">
                Informe o nome do curso e o link da pasta no seu Google Drive. O sistema mapeará os
                módulos e as aulas automaticamente.
              </p>
            </div>

            {saveError && (
              <div className="p-4 rounded-xl bg-[#e5484d]/10 border border-[#e5484d]/30 text-[#e5484d] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nome do Curso */}
              <div>
                <label className="block text-xs font-semibold text-[#ece9e2] mb-1.5">
                  Título do Curso <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Ex: Direito Constitucional para Concursos"
                  className="w-full bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#ece9e2] placeholder-[#9a978f]/50 focus:border-[#d4af37] outline-none transition"
                />
              </div>

              {/* Slug do Curso */}
              <div>
                <label className="block text-xs font-semibold text-[#ece9e2] mb-1.5">
                  Identificador na URL (Slug) <span className="text-[#d4af37]">*</span>
                </label>
                <div className="flex items-center bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl px-3 py-2 text-xs font-mono text-[#9a978f]">
                  <span>http://localhost:3000/courses/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-transparent text-[#d4af37] font-semibold outline-none flex-1 ml-0.5"
                  />
                </div>
              </div>

              {/* Link do Google Drive */}
              <div>
                <label className="block text-xs font-semibold text-[#ece9e2] mb-1.5">
                  Link da Pasta no Google Drive <span className="text-[#d4af37]">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="Cole aqui: https://drive.google.com/drive/folders/1a2b3c4d5e... ou o link de compartilhamento"
                    className="flex-1 bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl px-3.5 py-2.5 text-xs text-[#ece9e2] placeholder-[#9a978f]/50 focus:border-[#d4af37] outline-none transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={previewLoading || !driveUrl.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] hover:border-[#d4af37] text-xs font-semibold text-[#d4af37] transition flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <Search className={`w-3.5 h-3.5 ${previewLoading ? "animate-spin" : ""}`} />
                    {previewLoading ? "Consultando Drive..." : "Pré-visualizar Pasta"}
                  </button>
                </div>
                <p className="text-[11px] text-[#9a978f] mt-1.5 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Lembre-se de dar permissão de Leitor na pasta para o e-mail da sua Service
                  Account:{" "}
                  <code className="text-[#d4af37] bg-[#1b1b1e] px-1 py-0.5 rounded">
                    drive-bot@cdf-plataforma.iam.gserviceaccount.com
                  </code>
                </p>
              </div>

              {/* Caixa de Pré-visualização do Drive */}
              {previewError && (
                <div className="p-4 rounded-xl bg-[#e5484d]/10 border border-[#e5484d]/30 text-[#e5484d] text-xs space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Erro ao consultar pasta do Drive
                  </p>
                  <p>{previewError}</p>
                </div>
              )}

              {previewData && (
                <div className="bg-[#1b1b1e] border border-[#d4af37]/40 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2e]">
                    <span className="text-xs font-semibold text-[#d4af37] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Pré-visualização da Estrutura do Drive
                    </span>
                    <span className="text-[11px] font-mono text-[#6fbf73] bg-[#6fbf73]/10 px-2 py-0.5 rounded-full border border-[#6fbf73]/30">
                      Pasta Validada
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#131315] p-2 rounded-lg border border-[#2a2a2e]">
                      <span className="block font-bold text-base font-mono text-[#ece9e2]">
                        {previewData.modules_count}
                      </span>
                      <span className="text-[10px] text-[#9a978f]">Módulos</span>
                    </div>
                    <div className="bg-[#131315] p-2 rounded-lg border border-[#2a2a2e]">
                      <span className="block font-bold text-base font-mono text-[#d4af37]">
                        {previewData.materials_count}
                      </span>
                      <span className="text-[10px] text-[#9a978f]">Aulas / Materiais</span>
                    </div>
                    <div className="bg-[#131315] p-2 rounded-lg border border-[#2a2a2e]">
                      <span className="block font-bold text-base font-mono text-[#f5d76e]">
                        {formatDuration(previewData.total_duration_seconds)}
                      </span>
                      <span className="text-[10px] text-[#9a978f]">Duração Total</span>
                    </div>
                  </div>

                  {previewData.modules.length > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                      {previewData.modules.map((m, idx) => (
                        <div
                          key={idx}
                          className="bg-[#131315] p-2 rounded-lg border border-[#2a2a2e] flex items-center justify-between"
                        >
                          <span className="font-medium text-[#ece9e2] truncate">{m.title}</span>
                          <span className="text-[10px] font-mono text-[#9a978f] shrink-0 ml-2">
                            {m.lessons_count} aulas
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Descrição Opcional */}
              <div>
                <label className="block text-xs font-semibold text-[#ece9e2] mb-1.5">
                  Descrição do Curso <span className="text-[#9a978f] font-normal">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações sobre o conteúdo programático, professor ou recomendações de estudo..."
                  className="w-full bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl px-3.5 py-2.5 text-xs text-[#ece9e2] placeholder-[#9a978f]/50 focus:border-[#d4af37] outline-none transition resize-y"
                />
              </div>

              {/* Botões de Submissão */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2a2a2e]">
                <Link
                  href="/admin/courses"
                  className="px-4 py-2.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] text-xs font-semibold text-[#9a978f] hover:text-[#ece9e2] transition"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={saving || !title.trim() || !driveUrl.trim()}
                  className="px-6 py-2.5 rounded-xl bg-[#d4af37] text-black hover:bg-[#f5d76e] text-xs font-semibold transition flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Search className="w-4 h-4 animate-spin" />
                      <span>Cadastrando e Importando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar e Sincronizar Curso</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
