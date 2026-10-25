import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import database from "@/infra/database";
import { NotFoundError } from "@/infra/errors";
import { driveQueue } from "@/infra/queue";
import CourseModel from "@/models/course";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);

router.post(controller.canRequest("create:course"), postHandler);
router.get(controller.canRequest("create:course"), getHandler);

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  const course = await CourseModel.findById(id);
  if (!course) {
    throw new NotFoundError({ message: "Curso não encontrado." });
  }

  // Enfileira o job no BullMQ com jobId determinístico para evitar duplicatas simultâneas
  await driveQueue.add(
    "syncCourse",
    { courseId: id },
    {
      jobId: `sync:${id}`,
    },
  );

  await database.query(`UPDATE courses SET sync_status = 'queued' WHERE id = $1`, [id]);

  return res.status(202).json({
    message: "Sincronização enfileirada com sucesso.",
    course_id: id,
    sync_status: "queued",
  });
}

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  const course = await CourseModel.findById(id);
  if (!course) {
    throw new NotFoundError({ message: "Curso não encontrado." });
  }

  // Busca a última execução de sincronização
  const syncRunsResult = await database.query(
    `SELECT * FROM sync_runs WHERE course_id = $1 ORDER BY started_at DESC LIMIT 1`,
    [id],
  );

  return res.status(200).json({
    course_id: course.id,
    sync_status: course.sync_status,
    sync_error: course.sync_error,
    last_synced_at: course.last_synced_at,
    latest_run: syncRunsResult.rows[0] || null,
  });
}

export default router.handler(controller.errorHandlers);
