import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "@/infra/controller";
import SubjectModel from "@/models/subject";
import TopicModel from "@/models/topic";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const subjects = await SubjectModel.listAll();

  // Para cada disciplina, busca os tópicos e constrói a árvore
  const subjectsWithTopics = await Promise.all(
    subjects.map(async (s) => {
      const topics = await TopicModel.listBySubject(s.id);
      const tree = TopicModel.buildTree(topics);
      return {
        ...s,
        topics: tree,
        topics_count: topics.length,
      };
    }),
  );

  return res.status(200).json(subjectsWithTopics);
}

export default router.handler(controller.errorHandlers);
