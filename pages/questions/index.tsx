import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import useSWR from "swr";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Filter,
  Check,
  RotateCcw,
  Sparkles,
  Award,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Shield,
  Layers,
  Target,
  FileText,
} from "lucide-react";
import UserMenu from "@/components/ui/UserMenu";
import { useUser } from "@/hooks/useUser";
import type { Question, Alternative } from "@/models/question";
import type { Subject } from "@/models/subject";
import type { TopicNode } from "@/models/topic";
import type { DailyGoal } from "@/models/dailyGoal";

export default function QuestionsPage() {
  const { user, isAdmin } = useUser();

  // Filtros
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [onlyUnanswered, setOnlyUnanswered] = useState<boolean>(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

  // Navegação de questões
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Estado de resolução da questão atual
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [struckLetters, setStruckLetters] = useState<Record<string, boolean>>({});
  const [guessed, setGuessed] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [answeredResult, setAnsweredResult] = useState<{
    is_correct: boolean;
    correct_answer: string;
    explanation?: any;
  } | null>(null);

  // Carrega lista de disciplinas e assuntos
  const { data: subjects } = useSWR<Array<Subject & { topics: TopicNode[] }>>("/api/v1/subjects");

  // Carrega metas diárias
  const { data: dailyGoals, mutate: mutateDailyGoals } = useSWR<DailyGoal[]>(
    user ? "/api/v1/me/daily-goals" : null,
  );

  // Monta querystring de busca de questões
  const queryParams = new URLSearchParams();
  if (selectedSubjectId) queryParams.set("subject_id", selectedSubjectId);
  if (selectedTopicId) queryParams.set("topic_id", selectedTopicId);
  if (selectedFormat) queryParams.set("format", selectedFormat);
  if (onlyUnanswered) queryParams.set("only_unanswered", "true");
  queryParams.set("limit", "50");

  const {
    data: questionsData,
    isLoading: loadingQuestions,
    mutate: mutateQuestions,
  } = useSWR<{ questions: Question[]; total: number }>(`/api/v1/questions?${queryParams.toString()}`);

  const questions = questionsData?.questions || [];
  const currentQuestion: Question | undefined = questions[currentIndex];

  // Reseta seleção ao mudar de questão
  useEffect(() => {
    setSelectedLetter(null);
    setStruckLetters({});
    setGuessed(false);
    setAnsweredResult(null);

    // Se a questão já tiver resposta anterior registrada do usuário
    if (currentQuestion?.user_answer) {
      setSelectedLetter(currentQuestion.user_answer.chosen);
      setGuessed(currentQuestion.user_answer.guessed);
      setAnsweredResult({
        is_correct: currentQuestion.user_answer.is_correct,
        correct_answer: currentQuestion.correct_answer,
        explanation: currentQuestion.explanation,
      });
    }
  }, [currentQuestion?.id]);

  // Alterna o risco (strike) de uma alternativa
  const toggleStrike = (letter: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStruckLetters((prev) => ({
      ...prev,
      [letter]: !prev[letter],
    }));
  };

  // Submissão da resposta
  const handleSubmitAnswer = async () => {
    if (!selectedLetter || !currentQuestion || submitting || answeredResult) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/questions/${currentQuestion.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chosen: selectedLetter,
          guessed,
          time_ms: 5000,
          context: "free",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnsweredResult(data);
        mutateDailyGoals();
      }
    } catch (err) {
      console.error("Erro ao enviar resposta:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em campo de texto
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const key = e.key.toUpperCase();

      if (!answeredResult) {
        if (["A", "B", "C", "D", "E"].includes(key)) {
          setSelectedLetter(key);
        } else if (e.key === "Enter" && selectedLetter) {
          e.preventDefault();
          handleSubmitAnswer();
        }
      } else {
        if (e.key === "ArrowRight") {
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLetter, answeredResult, currentIndex, questions.length]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Tópicos da disciplina selecionada
  const activeSubject = subjects?.find((s) => s.id === selectedSubjectId);
  const activeTopics = activeSubject?.topics || [];

  return (
    <>
      <Head>
        <title>Banco de Questões — Aula</title>
      </Head>

      <div className="min-h-screen bg-[#0b0b0c] text-[#ece9e2]">
        {/* Header */}
        <header className="h-16 border-b border-[#2a2a2e] bg-[#131315]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#f5d76e] flex items-center justify-center font-bold text-black font-serif shadow-sm group-hover:scale-105 transition">
                A
              </span>
              <span className="font-serif font-bold text-lg text-[#ece9e2] tracking-wide">
                Aula
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1 text-xs">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e] transition"
              >
                Início
              </Link>
              <Link
                href="/courses"
                className="px-3 py-1.5 rounded-lg text-[#9a978f] hover:text-[#ece9e2] hover:bg-[#1b1b1e] transition"
              >
                Cursos
              </Link>
              <Link
                href="/questions"
                className="px-3 py-1.5 rounded-lg text-[#d4af37] bg-[#1b1b1e] font-medium"
              >
                Questões
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/courses"
                  className="px-3 py-1.5 rounded-lg text-[#d4af37] hover:bg-[#d4af37]/10 transition flex items-center gap-1 font-medium border border-[#d4af37]/30"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <UserMenu />
          </div>
        </header>

        {/* Layout Principal com Painel Lateral de Filtros e Área de Questões */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
          {/* Barra Lateral de Filtros */}
          <aside className="w-full lg:w-72 shrink-0 space-y-6">
            {/* Bloco de Metas Diárias */}
            {dailyGoals && dailyGoals.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#131315] border border-[#2a2a2e] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#d4af37] font-semibold">
                    <Target className="w-4 h-4" />
                    <span>Meta Diária</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {dailyGoals.map((g) => (
                    <div key={g.id} className="text-xs space-y-1">
                      <div className="flex justify-between items-center text-[#9a978f]">
                        <span className="truncate">{g.subject_name || "Geral"}</span>
                        <span className="font-mono tabular-nums text-[#ece9e2]">
                          {g.answered_today || 0}/{g.target}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#1b1b1e] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#d4af37] to-[#f5d76e] transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((g.answered_today || 0) / g.target) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Painel de Filtros */}
            <div className="p-5 rounded-2xl bg-[#131315] border border-[#2a2a2e] space-y-4">
              <div className="flex items-center justify-between border-b border-[#2a2a2e] pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#ece9e2]">
                  <Filter className="w-4 h-4 text-[#d4af37]" />
                  <span>Filtros de Questões</span>
                </div>
                {(selectedSubjectId || selectedTopicId || selectedFormat || onlyUnanswered) && (
                  <button
                    onClick={() => {
                      setSelectedSubjectId("");
                      setSelectedTopicId("");
                      setSelectedFormat("");
                      setOnlyUnanswered(false);
                      setCurrentIndex(0);
                    }}
                    className="text-[11px] text-[#9a978f] hover:text-[#d4af37] transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Limpar
                  </button>
                )}
              </div>

              {/* Disciplina */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#9a978f] uppercase tracking-wider font-semibold">
                  Disciplina
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedTopicId("");
                    setCurrentIndex(0);
                  }}
                  className="w-full bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl px-3 py-2 text-xs text-[#ece9e2] focus:border-[#d4af37] outline-none"
                >
                  <option value="">Todas as disciplinas</option>
                  {subjects?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assunto / Tópico */}
              {activeTopics.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#9a978f] uppercase tracking-wider font-semibold">
                    Assunto
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => {
                      setSelectedTopicId(e.target.value);
                      setCurrentIndex(0);
                    }}
                    className="w-full bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl px-3 py-2 text-xs text-[#ece9e2] focus:border-[#d4af37] outline-none"
                  >
                    <option value="">Todos os assuntos</option>
                    {activeTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Formato */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#9a978f] uppercase tracking-wider font-semibold">
                  Formato da Questão
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => {
                    setSelectedFormat(e.target.value);
                    setCurrentIndex(0);
                  }}
                  className="w-full bg-[#1b1b1e] border border-[#2a2a2e] rounded-xl px-3 py-2 text-xs text-[#ece9e2] focus:border-[#d4af37] outline-none"
                >
                  <option value="">Todos os formatos</option>
                  <option value="multiple_choice">Múltipla Escolha (A, B, C, D, E)</option>
                  <option value="true_false">Certo / Errado (Cebraspe)</option>
                </select>
              </div>

              {/* Checkbox Apenas Não Resolvidas */}
              {user && (
                <label className="flex items-center gap-2 text-xs text-[#9a978f] hover:text-[#ece9e2] cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={onlyUnanswered}
                    onChange={(e) => {
                      setOnlyUnanswered(e.target.checked);
                      setCurrentIndex(0);
                    }}
                    className="rounded border-[#2a2a2e] accent-[#d4af37]"
                  />
                  <span>Apenas questões não resolvidas</span>
                </label>
              )}
            </div>
          </aside>

          {/* Área Principal de Treino / Resolução */}
          <main className="flex-1 min-w-0 space-y-4">
            {loadingQuestions ? (
              <div className="p-12 rounded-2xl bg-[#131315] border border-[#2a2a2e] text-center space-y-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[#1b1b1e] mx-auto" />
                <p className="text-xs text-[#9a978f]">Carregando questões...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="p-12 rounded-2xl bg-[#131315] border border-[#2a2a2e] text-center space-y-4">
                <HelpCircle className="w-12 h-12 text-[#d4af37] mx-auto opacity-70" />
                <h3 className="font-semibold text-base text-[#ece9e2]">Nenhuma questão encontrada</h3>
                <p className="text-xs text-[#9a978f] max-w-sm mx-auto">
                  Tente alterar os filtros laterais para encontrar questões na disciplina ou assunto desejado.
                </p>
              </div>
            ) : currentQuestion ? (
              <div className="bg-[#131315] border border-[#2a2a2e] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
                {/* Metadados do Concurso / Prova */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2a2e] pb-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {currentQuestion.exam && (
                      <>
                        <span className="px-2.5 py-1 rounded-md bg-[#d4af37]/10 text-[#d4af37] font-semibold border border-[#d4af37]/30">
                          {currentQuestion.exam.board_name}
                        </span>
                        <span className="text-[#ece9e2] font-medium">{currentQuestion.exam.organ}</span>
                        <span className="text-[#9a978f]">&bull;</span>
                        <span className="text-[#9a978f]">{currentQuestion.exam.year}</span>
                        <span className="text-[#9a978f]">&bull;</span>
                        <span className="text-[#9a978f] truncate max-w-[200px]">
                          {currentQuestion.exam.position}
                        </span>
                      </>
                    )}

                    {currentQuestion.topics && currentQuestion.topics.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#1b1b1e] border border-[#2a2a2e] text-[11px] text-[#9a978f]">
                        {currentQuestion.topics[0].name}
                      </span>
                    )}
                  </div>

                  {/* Contador de Questões */}
                  <div className="text-xs font-mono text-[#9a978f] flex items-center gap-2">
                    <span>
                      Questão {currentIndex + 1} de {questions.length}
                    </span>
                  </div>
                </div>

                {/* Texto de Apoio se houver */}
                {currentQuestion.support_text && (
                  <div className="p-4 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] text-xs text-[#ece9e2]/90 leading-relaxed space-y-2">
                    <p className="font-semibold text-[#d4af37] flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      {currentQuestion.support_text.label}
                    </p>
                    <p className="whitespace-pre-line">{currentQuestion.support_text.body}</p>
                  </div>
                )}

                {/* Enunciado da Questão */}
                <div className="text-sm sm:text-base text-[#ece9e2] leading-relaxed font-sans font-medium space-y-2">
                  <p className="whitespace-pre-line">{currentQuestion.statement}</p>
                </div>

                {/* Lista de Alternativas */}
                <div className="space-y-3 pt-2">
                  {currentQuestion.alternatives?.map((alt: Alternative) => {
                    const isSelected = selectedLetter === alt.letter;
                    const isStruck = Boolean(struckLetters[alt.letter]);

                    // Estilo pós-resposta
                    let borderClass = "border-[#2a2a2e] hover:border-[#d4af37]/60";
                    let bgClass = "bg-[#1b1b1e]/60";

                    if (answeredResult) {
                      if (alt.letter === answeredResult.correct_answer) {
                        borderClass = "border-[#6fbf73] bg-[#6fbf73]/10 text-[#6fbf73]";
                      } else if (isSelected && !answeredResult.is_correct) {
                        borderClass = "border-[#e5484d] bg-[#e5484d]/10 text-[#e5484d]";
                      } else {
                        borderClass = "border-[#2a2a2e] opacity-40";
                      }
                    } else if (isSelected) {
                      borderClass = "border-[#d4af37] bg-[#d4af37]/10 shadow-lg shadow-[#d4af37]/5";
                    }

                    return (
                      <div
                        key={alt.id}
                        onClick={() => {
                          if (!answeredResult) {
                            setSelectedLetter(alt.letter);
                          }
                        }}
                        className={`group flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border transition cursor-pointer select-none ${borderClass} ${bgClass} ${
                          isStruck ? "opacity-30 line-through" : ""
                        }`}
                      >
                        {/* Letra da Alternativa */}
                        <span
                          className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs border transition ${
                            isSelected
                              ? "bg-[#d4af37] text-black border-[#d4af37]"
                              : "bg-[#131315] text-[#9a978f] border-[#2a2a2e] group-hover:border-[#d4af37]"
                          }`}
                        >
                          {alt.letter}
                        </span>

                        {/* Texto da Alternativa */}
                        <div className="flex-1 text-xs sm:text-sm text-[#ece9e2] leading-relaxed pt-0.5">
                          {alt.body}
                        </div>

                        {/* Botão de Cortar/Riscar alternativa */}
                        {!answeredResult && (
                          <button
                            type="button"
                            onClick={(e) => toggleStrike(alt.letter, e)}
                            className="p-1.5 rounded text-[#9a978f] hover:text-[#e5484d] transition text-xs opacity-0 group-hover:opacity-100"
                            title={isStruck ? "Desfazer risco" : "Riscar alternativa eliminada"}
                          >
                            {isStruck ? "Restaurar" : "Riscar"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Barra de Ações: Responder / Chutei / Próxima */}
                <div className="pt-4 border-t border-[#2a2a2e] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {!answeredResult && (
                      <label className="flex items-center gap-2 text-xs text-[#9a978f] hover:text-[#d4af37] cursor-pointer select-none transition">
                        <input
                          type="checkbox"
                          checked={guessed}
                          onChange={(e) => setGuessed(e.target.checked)}
                          className="rounded border-[#2a2a2e] accent-[#d4af37]"
                        />
                        <span>Chutei esta questão</span>
                      </label>
                    )}

                    <span className="hidden sm:inline text-[11px] text-[#9a978f]/60 font-mono">
                      Atalhos: [A-E] escolher • [Enter] responder • [→] próxima
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                      className="p-2.5 rounded-xl bg-[#1b1b1e] border border-[#2a2a2e] text-[#9a978f] hover:text-[#ece9e2] disabled:opacity-30 transition"
                      title="Questão anterior"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    {!answeredResult ? (
                      <button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedLetter || submitting}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f5d76e] text-black font-semibold text-xs hover:opacity-95 disabled:opacity-40 transition shadow-md flex items-center gap-2"
                      >
                        {submitting ? "Verificando..." : "Responder Questão (Enter)"}
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        disabled={currentIndex === questions.length - 1}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f5d76e] text-black font-semibold text-xs hover:opacity-95 disabled:opacity-40 transition shadow-md flex items-center gap-2"
                      >
                        <span>Próxima Questão</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback e Gabarito após responder */}
                {answeredResult && (
                  <div className="mt-6 p-5 rounded-2xl bg-[#1b1b1e] border border-[#2a2a2e] space-y-4 animate-fade-in">
                    {/* Alerta de Resultado */}
                    <div
                      className={`p-3.5 rounded-xl flex items-center justify-between border ${
                        answeredResult.is_correct
                          ? "bg-[#6fbf73]/10 border-[#6fbf73]/30 text-[#6fbf73]"
                          : "bg-[#e5484d]/10 border-[#e5484d]/30 text-[#e5484d]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 text-xs font-semibold">
                        {answeredResult.is_correct ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <span>Parabéns! Você acertou a questão.</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 shrink-0" />
                            <span>
                              Resposta incorreta. O gabarito oficial é a letra{" "}
                              <strong>{answeredResult.correct_answer}</strong>.
                            </span>
                          </>
                        )}
                      </div>

                      {guessed && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[#d4af37]">
                          Marcada como chute
                        </span>
                      )}
                    </div>

                    {/* Explicação Pedagógica da Questão */}
                    {answeredResult.explanation ? (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37]">
                          <Sparkles className="w-4 h-4" />
                          <span>Explicação Detalhada do Gabarito Oficial</span>
                        </div>
                        <div className="text-xs sm:text-sm text-[#ece9e2]/90 leading-relaxed bg-[#131315] border border-[#2a2a2e] rounded-xl p-4 whitespace-pre-line font-sans">
                          {answeredResult.explanation.body}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#131315] border border-[#2a2a2e] text-center text-xs text-[#9a978f]">
                        Explicação oficial sendo sintetizada pela IA Gemini em segundo plano...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </>
  );
}
