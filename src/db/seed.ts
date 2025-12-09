import { db } from './index';
import { collections, entries, revisions, contentModules, media } from './schema';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  // Clear existing tables (in correct order for foreign key constraints)
  console.log('Clearing existing data...');
  await db.run(sql`PRAGMA foreign_keys = OFF`);
  await db.run(sql`DELETE FROM revisions`);
  await db.run(sql`DELETE FROM entries`);
  await db.run(sql`DELETE FROM collections`);
  await db.run(sql`DELETE FROM content_modules`);
  await db.run(sql`DELETE FROM media`);
  await db.run(sql`PRAGMA foreign_keys = ON`);

  // Create "Services" and "Blog" collections
  const [servicesCollection] = await db.insert(collections).values({
    slug: 'services',
    schema: [
      { label: 'Title', type: 'text', key: 'title', required: true },
      { label: 'Description', type: 'textarea', key: 'description', required: true },
      { label: 'Price', type: 'number', key: 'price', required: false },
      { label: 'Featured Image', type: 'image', key: 'image', required: false }
    ]
  }).returning();

  const [blogCollection] = await db.insert(collections).values({
    slug: 'blog',
    schema: [
      { label: 'Title', type: 'text', key: 'title', required: true },
      { label: 'Content', type: 'richtext', key: 'content', required: true },
      { label: 'Author', type: 'text', key: 'author', required: true },
      { label: 'Cover Image', type: 'image', key: 'cover', required: false }
    ]
  }).returning();

  console.log('Collections created');

  // Create sample entries
  const [cleaningEntry] = await db.insert(entries).values({
    collectionId: servicesCollection.id,
    slug: 'services/cleaning',
    data: {
      title: 'Professional Cleaning Service',
      description: 'High-quality cleaning services for homes and offices',
      price: 99,
      image: '/images/cleaning.jpg'
    },
    template: 'ServiceLayout',
    publishedAt: new Date()
  }).returning();

  await db.insert(entries).values({
    collectionId: blogCollection.id,
    slug: 'blog/welcome',
    data: {
      title: 'Welcome to Our Blog',
      content: '<p>This is our first blog post!</p>',
      author: 'Admin',
      cover: '/images/blog-welcome.jpg'
    },
    template: 'BlogLayout',
    publishedAt: new Date()
  });

  console.log('Entries created');

  // Create sample revision (draft)
  await db.insert(revisions).values({
    entryId: cleaningEntry.id,
    data: {
      title: 'Professional Cleaning Service - Updated',
      description: 'High-quality cleaning services for homes and offices - Now with eco-friendly products',
      price: 89,
      image: '/images/cleaning-new.jpg'
    },
    createdAt: new Date(),
    status: 'draft'
  });

  console.log('Revisions created');

  // Create sample content modules
  await db.insert(contentModules).values([
    {
      slug: 'hero',
      name: 'Hero Section',
      schema: [
        { label: 'Title', type: 'text', key: 'title', required: true },
        { label: 'Subtitle', type: 'text', key: 'subtitle', required: false },
        { label: 'Background Image', type: 'image', key: 'backgroundImage', required: false },
        { label: 'CTA Text', type: 'text', key: 'ctaText', required: false }
      ],
      data: {
        title: 'Welcome to Our Site',
        subtitle: 'The best place for your business',
        backgroundImage: '',
        ctaText: 'Get Started'
      },
      updatedAt: new Date()
    }
  ]);

  console.log('Content modules created');
  console.log('Database seeded successfully!');
}

seed().catch(console.error);
