import 'dotenv/config';
import { db } from './index';
import { collections, entries, revisions, contentModules, media, files, users } from './schema';
import { sql } from 'drizzle-orm';
import { hashPassword, normalizeEmail } from '@/lib/auth';

async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing tables (in correct order for foreign key constraints)
  // Uses DELETE ... WHERE 1=1 pattern which succeeds even on empty/non-existent tables
  console.log('🗑️  Clearing existing data...');
  await db.run(sql`PRAGMA foreign_keys = OFF`);

  // Helper to safely delete from a table (no-op if table doesn't exist)
  const safeDelete = async (tableName: string) => {
    try {
      await db.run(sql.raw(`DELETE FROM ${tableName}`));
    } catch (e: unknown) {
      // Table doesn't exist yet - that's fine, skip it
      const error = e as Error;
      if (!error.message?.includes('no such table')) {
        throw e;
      }
    }
  };

  await safeDelete('audit_logs');
  await safeDelete('sessions');
  await safeDelete('invitations');
  await safeDelete('users');
  await safeDelete('revisions');
  await safeDelete('entries');
  await safeDelete('collections');
  await safeDelete('content_modules');
  await safeDelete('media');
  await safeDelete('files');

  await db.run(sql`PRAGMA foreign_keys = ON`);

  // =====================
  // COLLECTIONS
  // =====================
  console.log('📁 Creating collections...');

  const [servicesCollection] = await db.insert(collections).values({
    slug: 'services',
    schema: [
      { label: 'Title', type: 'text', key: 'title', required: true },
      { label: 'Description', type: 'textarea', key: 'description', required: true },
      { label: 'Price', type: 'number', key: 'price', required: false },
      { label: 'Featured Image', type: 'image', key: 'image', required: false },
      { label: 'Brochure', type: 'document', key: 'brochure', required: false }
    ]
  }).returning();

  const [blogCollection] = await db.insert(collections).values({
    slug: 'blog',
    schema: [
      { label: 'Title', type: 'text', key: 'title', required: true },
      { label: 'Content', type: 'richtext', key: 'content', required: true },
      { label: 'Author', type: 'text', key: 'author', required: true },
      { label: 'Cover Image', type: 'image', key: 'cover', required: false },
      { label: 'Category', type: 'text', key: 'category', required: false }
    ]
  }).returning();

  const [productsCollection] = await db.insert(collections).values({
    slug: 'products',
    schema: [
      { label: 'Name', type: 'text', key: 'name', required: true },
      { label: 'Description', type: 'richtext', key: 'description', required: true },
      { label: 'Price', type: 'number', key: 'price', required: true },
      { label: 'SKU', type: 'text', key: 'sku', required: false },
      { label: 'Image', type: 'image', key: 'image', required: false },
      { label: 'Spec Sheet', type: 'document', key: 'specSheet', required: false }
    ]
  }).returning();

  const [teamCollection] = await db.insert(collections).values({
    slug: 'team',
    schema: [
      { label: 'Name', type: 'text', key: 'name', required: true },
      { label: 'Role', type: 'text', key: 'role', required: true },
      { label: 'Bio', type: 'textarea', key: 'bio', required: false },
      { label: 'Photo', type: 'image', key: 'photo', required: false },
      { label: 'Email', type: 'text', key: 'email', required: false },
      { label: 'LinkedIn', type: 'text', key: 'linkedin', required: false }
    ]
  }).returning();

  console.log('✅ Collections created: services, blog, products, team');

  // =====================
  // ENTRIES - Services
  // =====================
  console.log('📝 Creating entries...');

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Services entries
  const [cleaningEntry] = await db.insert(entries).values({
    collectionId: servicesCollection.id,
    slug: 'services/cleaning',
    data: {
      title: 'Professional Cleaning Service',
      description: 'High-quality cleaning services for homes and offices. Our team uses eco-friendly products.',
      price: 99,
      image: '/images/cleaning.jpg',
      brochure: null
    },
    template: 'ServiceLayout',
    publishedAt: yesterday,
    sortOrder: 1,
    seo: {
      metaTitle: 'Professional Cleaning Service | Best Prices',
      metaDescription: 'Get professional cleaning services for your home or office. Eco-friendly products, trained staff.',
      ogTitle: 'Professional Cleaning Service',
      ogDescription: 'High-quality cleaning services for homes and offices',
      noIndex: false,
      noFollow: false
    }
  }).returning();

  await db.insert(entries).values({
    collectionId: servicesCollection.id,
    slug: 'services/gardening',
    data: {
      title: 'Garden Maintenance',
      description: 'Complete garden maintenance including lawn care, hedge trimming, and seasonal planting.',
      price: 149,
      image: '/images/gardening.jpg',
      brochure: null
    },
    template: 'ServiceLayout',
    publishedAt: yesterday,
    sortOrder: 2,
    seo: {
      metaTitle: 'Garden Maintenance Services',
      metaDescription: 'Professional garden maintenance services including lawn care and seasonal planting.'
    }
  });

  await db.insert(entries).values({
    collectionId: servicesCollection.id,
    slug: 'services/consulting',
    data: {
      title: 'Business Consulting',
      description: 'Strategic business consulting to help your company grow and succeed.',
      price: 299,
      image: '/images/consulting.jpg',
      brochure: null
    },
    template: 'ServiceLayout',
    publishedAt: now,
    sortOrder: 3
  });

  // Scheduled entry (future publication)
  await db.insert(entries).values({
    collectionId: servicesCollection.id,
    slug: 'services/new-service',
    data: {
      title: 'Coming Soon: Premium Support',
      description: 'Our new premium support service launching next week!',
      price: 499,
      image: null,
      brochure: null
    },
    template: 'ServiceLayout',
    publishedAt: now,
    scheduledAt: nextWeek,
    sortOrder: 4,
    seo: {
      metaTitle: 'Premium Support Service - Coming Soon',
      noIndex: true
    }
  });

  // Soft-deleted entry
  await db.insert(entries).values({
    collectionId: servicesCollection.id,
    slug: 'services/old-service',
    data: {
      title: 'Discontinued Service',
      description: 'This service is no longer available.',
      price: 50,
      image: null,
      brochure: null
    },
    template: 'ServiceLayout',
    publishedAt: yesterday,
    deletedAt: now,
    sortOrder: 99
  });

  // Blog entries
  const [blogEntry1] = await db.insert(entries).values({
    collectionId: blogCollection.id,
    slug: 'blog/welcome',
    data: {
      title: 'Welcome to Our Blog',
      content: '<p>Welcome to our company blog! Here we will share news, tips, and insights about our industry.</p><p>Stay tuned for regular updates.</p>',
      author: 'Admin',
      cover: '/images/blog-welcome.jpg',
      category: 'News'
    },
    template: 'BlogLayout',
    publishedAt: yesterday,
    sortOrder: 1,
    seo: {
      metaTitle: 'Welcome to Our Blog | Company News',
      metaDescription: 'Welcome to our company blog. Stay updated with news, tips, and industry insights.',
      ogImage: '/images/blog-welcome.jpg'
    }
  }).returning();

  await db.insert(entries).values({
    collectionId: blogCollection.id,
    slug: 'blog/tips-productivity',
    data: {
      title: '10 Tips for Better Productivity',
      content: '<h2>Introduction</h2><p>Productivity is key to success. Here are our top 10 tips...</p><ol><li>Start your day early</li><li>Plan your tasks</li><li>Take regular breaks</li><li>Stay hydrated</li><li>Exercise regularly</li><li>Minimize distractions</li><li>Use productivity tools</li><li>Set realistic goals</li><li>Learn to say no</li><li>Review and improve</li></ol>',
      author: 'Marie Dupont',
      cover: '/images/productivity.jpg',
      category: 'Tips'
    },
    template: 'BlogLayout',
    publishedAt: now,
    sortOrder: 2,
    seo: {
      metaTitle: '10 Tips for Better Productivity | Expert Advice',
      metaDescription: 'Discover our top 10 tips for improving your productivity at work and home.'
    }
  });

  // Scheduled blog post
  await db.insert(entries).values({
    collectionId: blogCollection.id,
    slug: 'blog/upcoming-features',
    data: {
      title: 'Exciting New Features Coming Soon',
      content: '<p>We are working on some exciting new features that will be announced next week!</p>',
      author: 'Product Team',
      cover: null,
      category: 'Announcements'
    },
    template: 'BlogLayout',
    publishedAt: now,
    scheduledAt: tomorrow,
    sortOrder: 3
  });

  // Products entries
  await db.insert(entries).values({
    collectionId: productsCollection.id,
    slug: 'products/widget-pro',
    data: {
      name: 'Widget Pro',
      description: '<p>Our flagship product with advanced features for professionals.</p><ul><li>Feature 1</li><li>Feature 2</li><li>Feature 3</li></ul>',
      price: 199,
      sku: 'WGT-PRO-001',
      image: '/images/widget-pro.jpg',
      specSheet: null
    },
    template: 'ProductLayout',
    publishedAt: yesterday,
    sortOrder: 1,
    seo: {
      metaTitle: 'Widget Pro | Professional Grade Widget',
      metaDescription: 'Get the Widget Pro - our flagship product with advanced features for professionals.'
    }
  });

  await db.insert(entries).values({
    collectionId: productsCollection.id,
    slug: 'products/widget-basic',
    data: {
      name: 'Widget Basic',
      description: '<p>Perfect for beginners and everyday use.</p>',
      price: 49,
      sku: 'WGT-BAS-001',
      image: '/images/widget-basic.jpg',
      specSheet: null
    },
    template: 'ProductLayout',
    publishedAt: now,
    sortOrder: 2
  });

  // Team entries
  await db.insert(entries).values({
    collectionId: teamCollection.id,
    slug: 'team/john-doe',
    data: {
      name: 'John Doe',
      role: 'CEO & Founder',
      bio: 'John founded the company in 2015 with a vision to revolutionize the industry.',
      photo: '/images/team/john.jpg',
      email: 'john@example.com',
      linkedin: 'https://linkedin.com/in/johndoe'
    },
    template: 'TeamMemberLayout',
    publishedAt: yesterday,
    sortOrder: 1
  });

  await db.insert(entries).values({
    collectionId: teamCollection.id,
    slug: 'team/jane-smith',
    data: {
      name: 'Jane Smith',
      role: 'CTO',
      bio: 'Jane leads our technology team with 15 years of experience in software development.',
      photo: '/images/team/jane.jpg',
      email: 'jane@example.com',
      linkedin: 'https://linkedin.com/in/janesmith'
    },
    template: 'TeamMemberLayout',
    publishedAt: yesterday,
    sortOrder: 2
  });

  await db.insert(entries).values({
    collectionId: teamCollection.id,
    slug: 'team/bob-wilson',
    data: {
      name: 'Bob Wilson',
      role: 'Head of Marketing',
      bio: 'Bob brings creative marketing strategies that have doubled our customer base.',
      photo: '/images/team/bob.jpg',
      email: 'bob@example.com',
      linkedin: null
    },
    template: 'TeamMemberLayout',
    publishedAt: now,
    sortOrder: 3
  });

  console.log('✅ Entries created: 5 services, 3 blog posts, 2 products, 3 team members');

  // =====================
  // REVISIONS
  // =====================
  console.log('📋 Creating revisions...');

  await db.insert(revisions).values({
    entryId: cleaningEntry.id,
    data: {
      title: 'Professional Cleaning Service - Updated',
      description: 'High-quality cleaning services for homes and offices - Now with eco-friendly products and 24/7 support!',
      price: 89,
      image: '/images/cleaning-new.jpg',
      brochure: null
    },
    createdAt: now,
    status: 'draft'
  });

  await db.insert(revisions).values({
    entryId: blogEntry1.id,
    data: {
      title: 'Welcome to Our Blog - Revised',
      content: '<p>Welcome to our company blog! Here we will share news, tips, and insights about our industry.</p><p>Stay tuned for regular updates.</p><p><strong>New:</strong> Subscribe to our newsletter!</p>',
      author: 'Admin',
      cover: '/images/blog-welcome.jpg',
      category: 'News'
    },
    createdAt: now,
    status: 'draft'
  });

  console.log('✅ Revisions created');

  // =====================
  // CONTENT MODULES (Singles)
  // =====================
  console.log('🧩 Creating content modules (singles)...');

  await db.insert(contentModules).values([
    {
      slug: 'hero',
      name: 'Hero Section',
      schema: [
        { label: 'Title', type: 'text', key: 'title', required: true },
        { label: 'Subtitle', type: 'text', key: 'subtitle', required: false },
        { label: 'Background Image', type: 'image', key: 'backgroundImage', required: false },
        { label: 'CTA Text', type: 'text', key: 'ctaText', required: false },
        { label: 'CTA Link', type: 'text', key: 'ctaLink', required: false }
      ],
      data: {
        title: 'Welcome to Our Site',
        subtitle: 'The best place for your business needs',
        backgroundImage: '/images/hero-bg.jpg',
        ctaText: 'Get Started',
        ctaLink: '/contact'
      },
      updatedAt: now
    },
    {
      slug: 'about',
      name: 'About Page',
      schema: [
        { label: 'Title', type: 'text', key: 'title', required: true },
        { label: 'Content', type: 'richtext', key: 'content', required: true },
        { label: 'Mission Statement', type: 'textarea', key: 'mission', required: false },
        { label: 'Founded Year', type: 'number', key: 'foundedYear', required: false },
        { label: 'Team Photo', type: 'image', key: 'teamPhoto', required: false }
      ],
      data: {
        title: 'About Us',
        content: '<p>We are a company dedicated to providing excellent services to our customers.</p><p>Founded in 2015, we have grown to serve thousands of clients worldwide.</p>',
        mission: 'To deliver exceptional value and service to every customer.',
        foundedYear: 2015,
        teamPhoto: '/images/team-photo.jpg'
      },
      updatedAt: now
    },
    {
      slug: 'contact',
      name: 'Contact Page',
      schema: [
        { label: 'Title', type: 'text', key: 'title', required: true },
        { label: 'Description', type: 'textarea', key: 'description', required: false },
        { label: 'Email', type: 'text', key: 'email', required: true },
        { label: 'Phone', type: 'text', key: 'phone', required: false },
        { label: 'Address', type: 'textarea', key: 'address', required: false },
        { label: 'Map Image', type: 'image', key: 'mapImage', required: false }
      ],
      data: {
        title: 'Contact Us',
        description: 'Get in touch with us for any questions or inquiries.',
        email: 'contact@example.com',
        phone: '+1 (555) 123-4567',
        address: '123 Business Street\nSuite 100\nNew York, NY 10001',
        mapImage: null
      },
      updatedAt: now
    },
    {
      slug: 'footer',
      name: 'Footer',
      schema: [
        { label: 'Copyright Text', type: 'text', key: 'copyright', required: true },
        { label: 'Social Links', type: 'textarea', key: 'socialLinks', required: false },
        { label: 'Newsletter Title', type: 'text', key: 'newsletterTitle', required: false }
      ],
      data: {
        copyright: '© 2024 Company Name. All rights reserved.',
        socialLinks: 'Twitter: @company\nFacebook: /company\nLinkedIn: /company',
        newsletterTitle: 'Subscribe to our newsletter'
      },
      updatedAt: now
    },
    {
      slug: 'seo-defaults',
      name: 'SEO Defaults',
      schema: [
        { label: 'Site Title', type: 'text', key: 'siteTitle', required: true },
        { label: 'Site Description', type: 'textarea', key: 'siteDescription', required: true },
        { label: 'Default OG Image', type: 'image', key: 'defaultOgImage', required: false },
        { label: 'Twitter Handle', type: 'text', key: 'twitterHandle', required: false }
      ],
      data: {
        siteTitle: 'Company Name - Your Business Solution',
        siteDescription: 'We provide excellent services and products for your business needs.',
        defaultOgImage: '/images/og-default.jpg',
        twitterHandle: '@company'
      },
      updatedAt: now
    }
  ]);

  // Soft-deleted single
  await db.insert(contentModules).values({
    slug: 'old-promo',
    name: 'Old Promotion Banner',
    schema: [
      { label: 'Title', type: 'text', key: 'title', required: true },
      { label: 'Discount', type: 'number', key: 'discount', required: true }
    ],
    data: {
      title: 'Summer Sale!',
      discount: 20
    },
    updatedAt: yesterday,
    deletedAt: now
  });

  console.log('✅ Content modules created: hero, about, contact, footer, seo-defaults');

  // =====================
  // MEDIA
  // =====================
  console.log('🖼️  Creating sample media entries...');

  await db.insert(media).values([
    {
      filename: 'hero-bg-001.jpg',
      originalName: 'hero-background.jpg',
      url: '/uploads/images/hero-bg-001.jpg',
      mimeType: 'image/jpeg',
      size: 245000,
      width: 1920,
      height: 1080,
      alt: 'Hero background image',
      uploadedAt: yesterday
    },
    {
      filename: 'team-photo-001.jpg',
      originalName: 'team-photo.jpg',
      url: '/uploads/images/team-photo-001.jpg',
      mimeType: 'image/jpeg',
      size: 180000,
      width: 1200,
      height: 800,
      alt: 'Our team',
      uploadedAt: yesterday
    },
    {
      filename: 'product-widget-001.png',
      originalName: 'widget-pro.png',
      url: '/uploads/images/product-widget-001.png',
      mimeType: 'image/png',
      size: 95000,
      width: 800,
      height: 600,
      alt: 'Widget Pro product image',
      uploadedAt: now
    },
    {
      filename: 'logo-001.svg',
      originalName: 'company-logo.svg',
      url: '/uploads/images/logo-001.svg',
      mimeType: 'image/svg+xml',
      size: 5000,
      width: 200,
      height: 50,
      alt: 'Company logo',
      uploadedAt: now
    }
  ]);

  console.log('✅ Media entries created');

  // =====================
  // FILES (Documents)
  // =====================
  console.log('📄 Creating sample file entries...');

  await db.insert(files).values([
    {
      filename: 'brochure-2024-001.pdf',
      originalName: 'company-brochure-2024.pdf',
      url: '/uploads/files/brochure-2024-001.pdf',
      mimeType: 'application/pdf',
      size: 2500000,
      description: 'Company brochure for 2024',
      uploadedAt: yesterday
    },
    {
      filename: 'spec-sheet-widget-pro-001.pdf',
      originalName: 'widget-pro-specifications.pdf',
      url: '/uploads/files/spec-sheet-widget-pro-001.pdf',
      mimeType: 'application/pdf',
      size: 450000,
      description: 'Widget Pro technical specifications',
      uploadedAt: yesterday
    },
    {
      filename: 'price-list-001.xlsx',
      originalName: 'price-list-2024.xlsx',
      url: '/uploads/files/price-list-001.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 85000,
      description: 'Current price list',
      uploadedAt: now
    },
    {
      filename: 'terms-conditions-001.docx',
      originalName: 'terms-and-conditions.docx',
      url: '/uploads/files/terms-conditions-001.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 125000,
      description: 'Terms and conditions document',
      uploadedAt: now
    }
  ]);

  console.log('✅ File entries created');

  // =====================
  // ADMIN USER
  // =====================
  const seedEmail = process.env.ADMIN_SEED_EMAIL;
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;

  if (seedEmail && seedPassword) {
    const normalizedEmail = normalizeEmail(seedEmail);
    const now = new Date();

    await db.insert(users).values({
      email: normalizedEmail,
      passwordHash: hashPassword(seedPassword),
      name: 'Admin',
      role: 'super_admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    console.log('');
    console.log('🔐 Admin user created:');
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`   Password: (from ADMIN_SEED_PASSWORD)`);
    console.log(`   Role: super_admin`);
  } else {
    console.warn('');
    console.warn('⚠️  ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD not set; no admin user created.');
    console.warn('   Set both in .env to create an admin user on seed.');
  }

  console.log('');
  console.log('✨ Database seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   - 4 collections (services, blog, products, team)');
  console.log('   - 13 entries (including 2 scheduled, 1 soft-deleted)');
  console.log('   - 2 draft revisions');
  console.log('   - 6 content modules (including 1 soft-deleted)');
  console.log('   - 4 media files');
  console.log('   - 4 document files');
}

seed().catch(console.error);
