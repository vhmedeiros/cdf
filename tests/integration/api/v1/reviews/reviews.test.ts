import orchestrator from "@/tests/orchestrator";
import database from "@/infra/database";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("Reviews & Stats API (/api/v1/me/reviews & /api/v1/me/stats)", () => {
  describe("Anonymous user", () => {
    test("Receives 401 Unauthorized for reviews and stats", async () => {
      const resReviews = await fetch("http://localhost:3000/api/v1/me/reviews");
      expect(resReviews.status).toBe(401);

      const resStats = await fetch("http://localhost:3000/api/v1/me/stats");
      expect(resStats.status).toBe(401);
    });
  });

  describe("Enrolled Student", () => {
    test("Auto-schedules 1d, 7d, 30d reviews upon lesson completion and calculates stats", async () => {
      const { default: User } = await import("@/models/user");
      const { default: Session } = await import("@/models/session");
      const { default: CourseModel } = await import("@/models/course");
      const { default: EnrollmentModel } = await import("@/models/enrollment");

      // 1. Cria aluno e sessão
      const student = await User.create({
        email: "aluno.reviews@teste.com",
        password: "senha-reviews-123",
        display_name: "Aluno Reviews",
        features: ["read:course"],
      });
      const session = await Session.create(student.id);

      // 2. Cria curso
      const course = await CourseModel.create({
        title: "Curso Direito Constitucional",
        slug: "direito-constitucional",
        driveUrl: "https://drive.google.com/drive/folders/pasta-const",
        driveFolderId: "pasta-const",
        status: "published",
      });

      await EnrollmentModel.create({
        userId: student.id,
        courseId: course.id,
      });

      await CourseModel.syncTreeToDatabase(course.id, {
        totalDurationSeconds: 100,
        materialsCount: 1,
        modules: [
          {
            rawName: "Modulo 1",
            title: "Modulo 1",
            position: 1,
            lessons: [
              {
                rawName: "Aula 1",
                title: "Aula 1",
                position: 1,
                durationSeconds: 100,
                materials: [
                  {
                    driveFileId: "file-rev-1",
                    rawName: "Aula01.mp4",
                    title: "Direitos Fundamentais",
                    kind: "video",
                    mime: "video/mp4",
                    sizeBytes: 5000,
                    durationSeconds: 100,
                    position: 1,
                  },
                ],
              },
            ],
          },
        ],
      });

      const tree = await CourseModel.getTree(course.id);
      const materialId = tree.modules[0].lessons[0].materials[0].id;

      // 3. Aluno assiste até 95 segundos (>= 90% de 100s -> auto-completes)
      const progressRes = await fetch(`http://localhost:3000/api/v1/progress/${materialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          position_seconds: 95,
          watched_delta: 95,
        }),
      });

      expect(progressRes.status).toBe(200);
      const progData = await progressRes.json();
      expect(progData.is_completed).toBe(true);

      // 4. Verifica se as 3 revisões foram agendadas no banco
      const dbReviews = await database.query<{ stage: string; due_date: Date }>(
        `SELECT stage, due_date FROM reviews WHERE user_id = $1 AND material_id = $2 ORDER BY stage ASC`,
        [student.id, materialId],
      );

      expect(dbReviews.rows).toHaveLength(3);
      const stages = dbReviews.rows.map((r) => r.stage);
      expect(new Set(stages)).toEqual(new Set(["1d", "7d", "30d"]));

      // 5. Como as revisões foram agendadas para o futuro (1, 7, 30 dias),
      // a lista de revisões vencidas hoje deve estar vazia inicialmente
      const initialReviewsRes = await fetch("http://localhost:3000/api/v1/me/reviews", {
        headers: {
          cookie: `session_id=${session.token}`,
        },
      });
      expect(initialReviewsRes.status).toBe(200);
      const initialReviewsData = await initialReviewsRes.json();
      expect(initialReviewsData.reviews).toHaveLength(0);

      // 6. Simula a passagem do tempo: ajusta a data da revisão '1d' para ontem
      await database.query(
        `UPDATE reviews 
         SET due_date = now() - INTERVAL '1 day' 
         WHERE user_id = $1 AND stage = '1d'`,
        [student.id],
      );

      // Agora a revisão '1d' deve aparecer como pendente hoje
      const dueReviewsRes = await fetch("http://localhost:3000/api/v1/me/reviews", {
        headers: {
          cookie: `session_id=${session.token}`,
        },
      });
      const dueData = await dueReviewsRes.json();
      expect(dueData.pending_count).toBe(1);
      expect(dueData.reviews).toHaveLength(1);
      expect(dueData.reviews[0].material_title).toBe("Direitos Fundamentais");
      expect(dueData.reviews[0].stage).toBe("1d");

      // 7. Marca a revisão como concluída
      const reviewId = dueData.reviews[0].id;
      const completeRes = await fetch(
        `http://localhost:3000/api/v1/me/reviews/${reviewId}/complete`,
        {
          method: "POST",
          headers: {
            cookie: `session_id=${session.token}`,
          },
        },
      );
      expect(completeRes.status).toBe(200);
      const completedReview = await completeRes.json();
      expect(completedReview.done_at).not.toBeNull();

      // 8. Consulta as estatísticas (/api/v1/me/stats)
      const statsRes = await fetch("http://localhost:3000/api/v1/me/stats", {
        headers: {
          cookie: `session_id=${session.token}`,
        },
      });
      expect(statsRes.status).toBe(200);
      const stats = await statsRes.json();

      expect(stats.streak.current).toBe(1);
      expect(stats.completed_materials).toBe(1);
      expect(stats.total_seconds).toBe(95);
      expect(stats.last_studied).not.toBeNull();
      expect(stats.last_studied.material_title).toBe("Direitos Fundamentais");
      expect(stats.last_studied.course_slug).toBe("direito-constitucional");
      expect(stats.heatmap.length).toBeGreaterThan(0);
    });
  });
});
