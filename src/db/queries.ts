import { db } from './index';
import { contentModules } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Get a content module by its slug
 * Usage in Astro pages:
 * ```astro
 * ---
 * import { getContentModule } from '@/db/queries';
 * const aboutData = await getContentModule('about-us');
 * ---
 * <h1>{aboutData.title}</h1>
 * ```
 */
export async function getContentModule(slug: string) {
  const [module] = await db
    .select()
    .from(contentModules)
    .where(eq(contentModules.slug, slug));

  if (!module) {
    throw new Error(`Content module with slug "${slug}" not found`);
  }

  return module.data;
}

/**
 * Get all content modules
 */
export async function getAllContentModules() {
  return await db.select().from(contentModules);
}

/**
 * Check if a content module exists
 */
export async function contentModuleExists(slug: string): Promise<boolean> {
  const [module] = await db
    .select()
    .from(contentModules)
    .where(eq(contentModules.slug, slug));

  return !!module;
}
