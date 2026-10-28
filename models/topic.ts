import database from "@/infra/database";
import { NotFoundError, ValidationError } from "@/infra/errors";

export interface Topic {
  id: string;
  subject_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  aliases: string[];
  created_at: Date;
  updated_at: Date;
}

export interface TopicNode extends Topic {
  children: TopicNode[];
}

export interface CreateTopicInput {
  subject_id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  aliases?: string[];
}

async function create(input: CreateTopicInput): Promise<Topic> {
  const { subject_id, parent_id = null, name, slug, aliases = [] } = input;

  if (!subject_id) {
    throw new ValidationError({ message: "ID da disciplina é obrigatório." });
  }
  if (!name?.trim()) {
    throw new ValidationError({ message: "Nome do assunto é obrigatório." });
  }
  if (!slug?.trim()) {
    throw new ValidationError({ message: "Slug do assunto é obrigatório." });
  }

  const query = {
    text: `
      INSERT INTO topics (subject_id, parent_id, name, slug, aliases)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (subject_id, slug) DO UPDATE SET
        name = EXCLUDED.name,
        aliases = EXCLUDED.aliases,
        updated_at = now()
      RETURNING *;
    `,
    values: [subject_id, parent_id, name.trim(), slug.trim().toLowerCase(), aliases],
  };

  const result = await database.query(query);
  return result.rows[0];
}

async function findById(id: string): Promise<Topic> {
  const query = {
    text: `SELECT * FROM topics WHERE id = $1 LIMIT 1;`,
    values: [id],
  };

  const result = await database.query(query);
  if (result.rowCount === 0) {
    throw new NotFoundError({ message: "Assunto não encontrado." });
  }
  return result.rows[0];
}

async function listBySubject(subjectId: string): Promise<Topic[]> {
  const query = {
    text: `SELECT * FROM topics WHERE subject_id = $1 ORDER BY name ASC;`,
    values: [subjectId],
  };

  const result = await database.query(query);
  return result.rows;
}

function buildTree(topics: Topic[]): TopicNode[] {
  const map = new Map<string, TopicNode>();
  const roots: TopicNode[] = [];

  for (const t of topics) {
    map.set(t.id, { ...t, children: [] });
  }

  for (const t of topics) {
    const node = map.get(t.id)!;
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const TopicModel = {
  create,
  findById,
  listBySubject,
  buildTree,
};

export default TopicModel;
