import database from "@/infra/database";

export type SearchCourseResult = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  total_duration_seconds: number;
  materials_count: number;
};

export type SearchMaterialResult = {
  id: string;
  title: string;
  kind: string;
  duration_seconds: number;
  lesson_title: string;
  module_title: string;
  course_title: string;
  course_slug: string;
};

export type SearchNoteResult = {
  id: string;
  body: string;
  timestamp_seconds: number | null;
  is_important: boolean;
  created_at: Date;
  material_id: string;
  material_title: string;
  course_title: string;
  course_slug: string;
};

export type SearchResults = {
  courses: SearchCourseResult[];
  materials: SearchMaterialResult[];
  notes: SearchNoteResult[];
};

async function searchAll(
  userId: string,
  queryText: string,
  limit: number = 8,
): Promise<SearchResults> {
  const cleanQuery = queryText.trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return {
      courses: [],
      materials: [],
      notes: [],
    };
  }

  // 1. Cursos correspondentes
  const coursesRes = await database.query<SearchCourseResult>(
    `SELECT 
       id,
       title,
       slug,
       description,
       total_duration_seconds,
       materials_count
     FROM courses
     WHERE status != 'archived'
       AND (
         unaccent(lower(title)) LIKE unaccent(lower('%' || $1 || '%'))
         OR unaccent(lower(COALESCE(description, ''))) LIKE unaccent(lower('%' || $1 || '%'))
       )
     ORDER BY title ASC
     LIMIT $2`,
    [cleanQuery, limit],
  );

  // 2. Aulas e materiais correspondentes
  const materialsRes = await database.query<SearchMaterialResult>(
    `SELECT 
       m.id,
       m.title,
       m.kind,
       m.duration_seconds,
       l.title as lesson_title,
       mod.title as module_title,
       c.title as course_title,
       c.slug as course_slug
     FROM materials m
     INNER JOIN lessons l ON l.id = m.lesson_id
     INNER JOIN modules mod ON mod.id = l.module_id
     INNER JOIN courses c ON c.id = mod.course_id
     WHERE m.is_active = true AND c.status != 'archived'
       AND (
         unaccent(lower(m.title)) LIKE unaccent(lower('%' || $1 || '%'))
         OR unaccent(lower(l.title)) LIKE unaccent(lower('%' || $1 || '%'))
       )
     ORDER BY m.title ASC
     LIMIT $2`,
    [cleanQuery, limit],
  );

  // 3. Notas do usuário correspondentes
  const notesRes = await database.query<SearchNoteResult>(
    `SELECT 
       n.id,
       n.body,
       n.timestamp_seconds,
       n.is_important,
       n.created_at,
       m.id as material_id,
       m.title as material_title,
       c.slug as course_slug,
       c.title as course_title
     FROM notes n
     INNER JOIN materials m ON m.id = n.material_id
     INNER JOIN courses c ON c.id = n.course_id
     WHERE n.user_id = $1
       AND unaccent(lower(n.body)) LIKE unaccent(lower('%' || $2 || '%'))
     ORDER BY n.created_at DESC
     LIMIT $3`,
    [userId, cleanQuery, limit],
  );

  return {
    courses: coursesRes.rows.map((c) => ({
      ...c,
      total_duration_seconds: parseInt(c.total_duration_seconds as any, 10) || 0,
      materials_count: parseInt(c.materials_count as any, 10) || 0,
    })),
    materials: materialsRes.rows.map((m) => ({
      ...m,
      duration_seconds: parseFloat(m.duration_seconds as any) || 0,
    })),
    notes: notesRes.rows.map((n) => ({
      ...n,
      timestamp_seconds: n.timestamp_seconds ? parseFloat(n.timestamp_seconds as any) : null,
    })),
  };
}

const SearchModel = {
  searchAll,
};

export default SearchModel;
