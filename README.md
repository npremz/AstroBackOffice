# Custom CMS - Astro + SQLite

High-performance, schema-flexible CMS built with Astro and SQLite. Perfect for small clients (artisans, blogs, small e-commerce sites).

## ✨ Features

- 🗄️ **SQLite local** - Zero external dependencies, fully offline
- 🎨 **Schema flexible** - Create custom content types without migrations
- ⚡ **SSR Astro** - Optimal performance + SEO-friendly
- 🎯 **Admin React** - Modern, reactive interface
- 🎭 **Dynamic layouts** - Custom design for each content type
- 📝 **Revision history** - Automatic versioning of changes
- 🔌 **REST API** - Full CRUD operations
- 🔍 **SEO Metadata** - Meta title, description, OG tags, canonical URL, robots directives
- 🗑️ **Soft Delete** - Trash with restore functionality
- 📅 **Scheduled Publishing** - Schedule content for future publication

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Initialize database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

Visit:
- **http://localhost:4321/** - Public homepage
- **http://localhost:4321/admin** - Admin panel
- **http://localhost:4321/services/cleaning** - Example service page
- **http://localhost:4321/blog/welcome** - Example blog post

## 🧞 Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview build locally |
| `npm run db:migrate` | Apply database schema |
| `npm run db:seed` | Populate with sample data |
| `npm run db:studio` | Open Drizzle Studio (DB UI) |

## 📁 Project Structure

```
/
├── src/
│   ├── db/
│   │   ├── schema.ts       # Database tables (Drizzle)
│   │   ├── index.ts        # DB connection
│   │   └── seed.ts         # Sample data
│   ├── pages/
│   │   ├── index.astro     # Public homepage
│   │   ├── admin/          # Admin interface
│   │   ├── api/            # REST API routes
│   │   └── [...slug].astro # Dynamic pages
│   ├── components/
│   │   └── admin/          # React admin components
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── ServiceLayout.astro
│   │   └── BlogLayout.astro
│   └── styles/
│       └── global.css      # Tailwind CSS
├── data.db                 # SQLite database
└── drizzle.config.ts       # Drizzle configuration
```

## 🎯 How It Works

### 1. Collections (Content Types)
Define flexible content structures in the admin:
```json
{
  "slug": "products",
  "schema": [
    { "label": "Name", "type": "text", "key": "name", "required": true },
    { "label": "Price", "type": "number", "key": "price", "required": true },
    { "label": "Image", "type": "image", "key": "image", "required": false }
  ]
}
```

### 2. Entries (Content)
Create content using the dynamic form generated from the schema:
```json
{
  "slug": "products/awesome-product",
  "data": {
    "name": "Awesome Product",
    "price": 99,
    "image": "/images/product.jpg"
  },
  "template": "ProductLayout"
}
```

### 3. Dynamic Pages
Pages are automatically generated from entries:
- Entry slug → URL path
- Template field → Layout component
- Data → Props for the layout

## 🔌 API Endpoints

### Collections
- `GET /api/collections` - List all collections
- `POST /api/collections` - Create collection
- `GET /api/collections/[id]` - Get collection
- `PUT /api/collections/[id]` - Update collection
- `DELETE /api/collections/[id]` - Delete collection

### Entries
- `GET /api/entries?collectionId=X` - List entries (excludes deleted by default)
- `GET /api/entries?includeDeleted=true` - Include soft-deleted entries
- `POST /api/entries` - Create entry (supports `scheduledAt` for scheduling)
- `GET /api/entries/[id]` - Get entry
- `PUT /api/entries/[id]` - Update entry (auto-creates revision)
- `DELETE /api/entries/[id]` - Soft delete entry (moves to trash)
- `DELETE /api/entries/[id]?permanent=true` - Permanently delete entry
- `POST /api/entries/[id]/restore` - Restore soft-deleted entry
- `GET /api/entries/trash` - List all soft-deleted entries

## 📝 Creating Custom Layouts

Create a new layout in `src/layouts/YourLayout.astro`:

```astro
---
interface Props {
  entry: {
    id: number;
    slug: string;
    data: Record<string, any>;
  };
}

const { entry } = Astro.props;
---

<article>
  <h1>{entry.data.title}</h1>
  <div set:html={entry.data.content} />
</article>
```

Then use `YourLayout` as the template name when creating entries.

## 🛠️ Tech Stack

- **Astro** 5.16+ (SSR mode)
- **React** 19+ (Admin UI)
- **Drizzle ORM** (Database)
- **SQLite** (better-sqlite3)
- **Tailwind CSS** 4+
- **TypeScript**

## 📚 Documentation

See [SESSION_SUMMARY.md](./SESSION_SUMMARY.md) for detailed documentation about:
- Database architecture
- API specifications
- Component structure
- Next steps and roadmap

## 🚢 Deployment

This CMS is designed for VPS/Docker deployment:

1. Build: `npm run build`
2. Preview: `npm run preview`
3. Deploy to Node.js hosting (VPS, Docker, etc.)

**Note:** Requires Node.js runtime (not compatible with serverless platforms like Vercel/Netlify due to SQLite)

## 📄 License

MIT
