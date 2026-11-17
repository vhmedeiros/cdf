import database from "@/infra/database";

export type Category = {
  id: string;
  slug: string;
  name: string;
  position: number;
  created_at: Date;
  updated_at: Date;
};

async function findAll(): Promise<Category[]> {
  const result = await database.query<Category>(
    `SELECT * FROM categories ORDER BY position ASC, name ASC`,
  );
  return result.rows;
}

async function findBySlug(slug: string): Promise<Category | null> {
  const result = await database.query<Category>(
    `SELECT * FROM categories WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

const CategoryModel = {
  findAll,
  findBySlug,
};

export default CategoryModel;
