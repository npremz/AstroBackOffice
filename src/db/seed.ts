import { db } from './index';
import { collections, entries, revisions } from './schema';

async function seed() {
  console.log('Seeding database...');

  // Create "Services" and "Blog" collections
  await db.insert(collections).values([
    {
      slug: 'services',
      schema: [
        { label: 'Title', type: 'text', key: 'title', required: true },
        { label: 'Description', type: 'textarea', key: 'description', required: true },
        { label: 'Price', type: 'number', key: 'price', required: false },
        { label: 'Featured Image', type: 'image', key: 'image', required: false }
      ]
    },
    {
      slug: 'blog',
      schema: [
        { label: 'Title', type: 'text', key: 'title', required: true },
        { label: 'Content', type: 'richtext', key: 'content', required: true },
        { label: 'Author', type: 'text', key: 'author', required: true },
        { label: 'Cover Image', type: 'image', key: 'cover', required: false }
      ]
    }
  ]);

  console.log('Collections created');

  // Create sample entries
  await db.insert(entries).values([
    {
      collectionId: 1,
      slug: 'services/cleaning',
      data: {
        title: 'Professional Cleaning Service',
        description: 'High-quality cleaning services for homes and offices',
        price: 99,
        image: '/images/cleaning.jpg'
      },
      template: 'ServiceLayout',
      publishedAt: new Date()
    },
    {
      collectionId: 2,
      slug: 'blog/welcome',
      data: {
        title: 'Welcome to Our Blog',
        content: '<p>This is our first blog post!</p>',
        author: 'Admin',
        cover: '/images/blog-welcome.jpg'
      },
      template: 'BlogLayout',
      publishedAt: new Date()
    }
  ]);

  console.log('Entries created');

  // Create sample revision (draft)
  await db.insert(revisions).values([
    {
      entryId: 1,
      data: {
        title: 'Professional Cleaning Service - Updated',
        description: 'High-quality cleaning services for homes and offices - Now with eco-friendly products',
        price: 89,
        image: '/images/cleaning-new.jpg'
      },
      createdAt: new Date(),
      status: 'draft'
    }
  ]);

  console.log('Revisions created');
  console.log('Database seeded successfully!');
}

seed().catch(console.error);
