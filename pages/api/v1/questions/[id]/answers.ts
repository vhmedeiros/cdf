import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import { UnauthorizedError, ValidationError } from "@/infra/errors";
import database from "@/infra/database";
import QuestionModel from "@/models/question";
import AiRouter from "@/services/ai/router";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.post(postHandler);

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = req.context.user;

  if (("isAnonymous" in user && user.isAnonymous) || !user.id) {
    throw new UnauthorizedError({ message: "Faça login para registrar respostas e acompanhar seu progresso." });
  }

  const { id } = req.query;
  const { chosen, guessed = false, time_ms = 0, context = "free", lesson_id = null, simulado_id = null } = req.body;

  if (typeof id !== "string") {
    throw new ValidationError({ message: "ID da questão inválido." });
  }

  // 1. Grava a resposta e verifica o gabarito
  const result = await QuestionModel.recordAnswer({
    user_id: user.id,
    question_id: id,
    chosen,
    guessed: Boolean(guessed),
    time_ms: Number(time_ms) || 0,
    context,
    lesson_id,
    simulado_id,
  });

  // 2. Se a questão ainda não tem explicação cadastrada e temos GEMINI_API_KEY,
  // tenta gerar a explicação oficial usando a cadeia 'deep' (prioridade 1 para o aluno que acabou de responder)
  if (!result.explanation && process.env.GEMINI_API_KEY) {
    try {
      const q = await QuestionModel.findById(id);
      const altsText = (q.alternatives || [])
        .map((a) => `(${a.letter}) ${a.body}`)
        .join("\n");

      const prompt = `Você é um professor especialista em concursos públicos de alto nível.
Explique didaticamente por que a resposta oficial desta questão está correta e analise cada uma das alternativas.

ENUNCIADO:
${q.statement}

ALTERNATIVAS:
${altsText}

GABARITO OFICIAL DEFINITIVO: ${q.correct_answer}

Formate sua resposta em Markdown claro e estruturado com:
1. Resumo do gabarito e fundamento legal/doutrinário/gramatical.
2. Análise breve de por que a alternativa correta está certa.
3. Análise pontual do erro das outras alternativas.`;

      const aiResponse = await AiRouter.executeAiChain("deep", {
        prompt,
        priority: 1, // Prioridade 1: usuário acabou de responder
        temperature: 0.2,
      });

      if (aiResponse?.text) {
        const insertExp = await database.query({
          text: `
            INSERT INTO explanations (question_id, body, per_alternative, model, prompt_version)
            VALUES ($1, $2, $3, $4, 'v1')
            ON CONFLICT (question_id) DO NOTHING
            RETURNING *;
          `,
          values: [id, aiResponse.text, JSON.stringify({}), aiResponse.model],
        });
        if (insertExp.rowCount && insertExp.rowCount > 0) {
          result.explanation = insertExp.rows[0];
        }
      }
    } catch (aiErr) {
      // Falha na IA não deve travar o envio de resposta do usuário
      console.warn("Aviso: Não foi possível gerar explicação com IA no momento:", aiErr);
    }
  }

  return res.status(200).json(result);
}

export default router.handler(controller.errorHandlers);
