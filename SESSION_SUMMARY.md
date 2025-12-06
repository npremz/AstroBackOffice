# Session Summary - Custom CMS with Astro + SQLite

## 📋 Ce qui a été construit

### 1. Configuration de base
- **Framework**: Astro v5 en mode SSR (Server-Side Rendering)
- **Base de données**: SQLite locale avec Drizzle ORM
- **UI**: React + Tailwind CSS
- **Runtime**: Node.js standalone (adapté pour VPS/Docker)

### 2. Architecture de la base de données

#### Schéma (src/db/schema.ts)
Trois tables principales:

**collections** - Définitions des types de contenu
- `id`: PRIMARY KEY (auto-increment)
- `slug`: TEXT UNIQUE (ex: "services", "blog")
- `schema`: JSON (définition des champs dynamiques)

**entries** - Contenu de production (publié)
- `id`: PRIMARY KEY
- `collectionId`: FOREIGN KEY → collections
- `slug`: TEXT UNIQUE (URL complète, ex: "services/cleaning")
- `data`: JSON (contenu selon le schéma)
- `template`: TEXT (nom du layout Astro)
- `publishedAt`: TIMESTAMP

**revisions** - Historique et brouillons
- `id`: PRIMARY KEY
- `entryId`: FOREIGN KEY → entries
- `data`: JSON (snapshot du contenu)
- `createdAt`: TIMESTAMP
- `status`: TEXT ('draft', 'archived')

### 3. API Routes (REST)

#### Collections
- `GET /api/collections` - Liste toutes les collections
- `POST /api/collections` - Créer une collection
- `GET /api/collections/[id]` - Récupérer une collection
- `PUT /api/collections/[id]` - Modifier une collection
- `DELETE /api/collections/[id]` - Supprimer une collection

#### Entries
- `GET /api/entries?collectionId=X` - Liste les entries (optionnel: par collection)
- `POST /api/entries` - Créer une entry
- `GET /api/entries/[id]` - Récupérer une entry
- `PUT /api/entries/[id]` - Modifier une entry (crée automatiquement une révision)
- `DELETE /api/entries/[id]` - Supprimer une entry

### 4. Interface Admin (/admin)

**Composants React** (src/components/admin/)
- `AdminDashboard.tsx` - Hub principal avec gestion de navigation
- `CollectionsList.tsx` - Grille des collections avec boutons CRUD
- `CollectionEditor.tsx` - Éditeur de schéma dynamique pour créer/modifier collections
- `EntriesList.tsx` - Liste des entries d'une collection
- `EntryEditor.tsx` - Formulaire dynamique généré depuis le schéma

**Fonctionnalités**
- Création de collections personnalisées avec schéma flexible
- Types de champs supportés: text, textarea, number, richtext, image
- Ajout/suppression de champs dynamiques
- Validation des champs requis
- Auto-génération des slugs et keys
- Historique automatique (révisions) avant chaque modification
- Interface CRUD complète pour les entries

### 5. Système de pages dynamiques

**Routing**
- `/` - Page d'accueil publique
- `/admin` - Interface d'administration
- `/db-test` - Visualisation de la base de données
- `/[...slug]` - Routes dynamiques (ex: /services/cleaning, /blog/welcome)
- `/404` - Page d'erreur personnalisée

**Layouts personnalisés** (src/layouts/)
- `BaseLayout.astro` - Layout de base avec Tailwind global
- `ServiceLayout.astro` - Pour les services (design 2 colonnes, pricing, features)
- `BlogLayout.astro` - Pour les articles (cover, auteur, date, prose)

**Système de rendu**
- Les entries sont automatiquement rendues en pages publiques
- Le layout est choisi dynamiquement selon le champ `template`
- Fallback vers un layout par défaut si le template n'existe pas
- Meta tags (title, description) extraits automatiquement des données

### 6. Fichiers clés

```
/
├── src/
│   ├── db/
│   │   ├── schema.ts          # Définition des tables Drizzle
│   │   ├── index.ts           # Connexion SQLite + Drizzle
│   │   └── seed.ts            # Données d'exemple
│   ├── pages/
│   │   ├── index.astro        # Homepage publique
│   │   ├── admin/
│   │   │   └── index.astro    # Interface admin
│   │   ├── api/
│   │   │   ├── collections/   # Routes API collections
│   │   │   └── entries/       # Routes API entries
│   │   ├── [...slug].astro    # Routes dynamiques
│   │   ├── db-test.astro      # Page de debug DB
│   │   └── 404.astro          # Page erreur
│   ├── components/
│   │   └── admin/             # Composants React de l'admin
│   ├── layouts/
│   │   ├── BaseLayout.astro   # Layout de base
│   │   ├── ServiceLayout.astro
│   │   └── BlogLayout.astro
│   └── styles/
│       └── global.css         # Tailwind CSS
├── drizzle.config.ts          # Config Drizzle Kit
├── astro.config.mjs           # Config Astro (SSR, Node adapter)
├── data.db                    # Base SQLite (ignorée par git)
└── package.json
```

### 7. Scripts npm disponibles

```bash
npm run dev              # Serveur de développement
npm run build            # Build production
npm run preview          # Preview du build

npm run db:migrate       # Applique le schéma à la DB
npm run db:seed          # Remplit avec données d'exemple
npm run db:studio        # Ouvre Drizzle Studio (UI pour DB)
```

### 8. Données d'exemple actuelles

**Collections:**
- `services` (4 champs: title, description, price, image)
- `blog` (4 champs: title, content, author, cover)

**Entries:**
- `/services/cleaning` - Professional Cleaning Service ($99)
- `/blog/welcome` - Welcome to Our Blog

## 🎯 Prochaines étapes suggérées

### Priorité haute
1. **Système de cache en RAM** (comme spécifié dans les specs)
   - Cache warming au démarrage
   - Invalidation automatique lors des modifications
   - Performance optimale pour production

2. **Upload d'images**
   - Intégration avec un service de stockage (local ou cloud)
   - Preview dans les formulaires
   - Gestion des tailles/optimisation

3. **Authentification admin**
   - Protéger la route `/admin`
   - Système de login simple
   - Session management

### Fonctionnalités additionnelles
4. **Navigation publique**
   - Menu de navigation généré depuis les collections
   - Listing des entries par collection
   - Recherche/filtres

5. **SEO et performance**
   - Génération automatique de sitemap.xml
   - Meta tags Open Graph
   - Images optimisées (Astro Image)

6. **Améliorations de l'éditeur**
   - Rich text editor visuel (TipTap, Quill)
   - Upload d'images par drag & drop
   - Preview du rendu en temps réel

7. **Déploiement**
   - Configuration pour VPS (PM2, Nginx)
   - Docker compose setup
   - Variables d'environnement pour production

## 🔑 Points clés à retenir

- **Base SQLite locale** = Zéro dépendance externe, parfait pour petits clients
- **Schéma JSON flexible** = Créer n'importe quel type de contenu sans migration
- **SSR Astro** = Performance optimale + SEO-friendly
- **React pour l'admin** = Interface moderne et réactive
- **Layouts personnalisables** = Design sur mesure pour chaque type de contenu

## 🚀 Démarrage rapide (prochaine session)

```bash
# 1. Installer les dépendances
npm install

# 2. Créer/réinitialiser la base de données
npm run db:migrate
npm run db:seed

# 3. Lancer le serveur de dev
npm run dev

# URLs disponibles:
# - http://localhost:4321/ (Homepage)
# - http://localhost:4321/admin (Interface admin)
# - http://localhost:4321/services/cleaning (Page service exemple)
# - http://localhost:4321/blog/welcome (Article blog exemple)
```

## 📝 Notes techniques

- Astro DB a été remplacé par Drizzle + SQLite pour éviter la dépendance à Turso
- Le mode WAL est activé sur SQLite pour de meilleures performances concurrentes
- Les révisions sont créées automatiquement avant chaque modification d'entry
- Les layouts sont chargés dynamiquement via import.meta.glob
- Tailwind CSS v4 est utilisé avec la directive @import
