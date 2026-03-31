# PS Campaign Manager

LinkedIn outreach campaign management tool for Product School.

## Sprint 1: Foundation — ✅ Complete

### What's Been Built

#### 1. Project Setup
- Next.js 14 with TypeScript and App Router
- Tailwind CSS configured with custom design system
- shadcn/ui component library integrated
- ESLint and PostCSS configured

#### 2. Database & Schema
- Prisma ORM configured with PostgreSQL
- Complete database schema implemented with all models:
  - User, Account, Session (NextAuth)
  - Campaign, Prospect
  - LinkedInAccount
  - CampaignTemplate
  - DailySendLog
- All enums defined (OutreachType, CampaignStatus, EnrichmentStatus, etc.)

#### 3. Authentication
- NextAuth.js v5 configured with Google OAuth
- JWT-based sessions
- Protected routes with server-side session checks
- Type-safe session with user ID extension

#### 4. Layout & Navigation
- Responsive sidebar navigation
- Header with user info and sign-out
- Auth-gated layouts for:
  - `/campaigns` — Campaign management
  - `/templates` — Campaign templates
  - `/settings` — Settings and configuration

#### 5. Campaign Management UI
- **Campaign List Page** (`/campaigns`)
  - Shows all user campaigns with status badges
  - Empty state with "Create First Campaign" CTA
  - Campaign cards showing:
    - Campaign name, description
    - Status badge (color-coded)
    - Outreach type (Connect/InMail)
    - Prospect count
    - Created date

- **New Campaign Form** (`/campaigns/new`)
  - Step 1 of campaign creation wizard
  - Form fields:
    - Campaign name (required, max 100 chars)
    - Outreach type (Connect/InMail radio selection)
    - Campaign description (required, for AI message generation)
    - Message instructions (optional, additional AI guidance)
  - Character limit indicators and helper text
  - Form validation

- **Upload Page Placeholder** (`/campaigns/[id]/upload`)
  - Ready for Sprint 2 file upload implementation

#### 6. API Routes
- **POST /api/campaigns** — Create new campaign
- **GET /api/campaigns** — List user's campaigns
- Server-side auth validation
- Proper error handling and status codes

#### 7. UI Components (shadcn/ui)
- Button (with variants and sizes)
- Card (with Header, Title, Description, Content, Footer)
- Input
- Textarea
- Label
- RadioGroup
- Toast notifications (sonner)

## Setup Instructions

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or hosted)
- Google OAuth credentials

### 1. Clone and Install

```bash
git clone <repository-url>
cd ps-campaign-manager
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ps_campaign_manager

# Auth (required for Sprint 1)
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# The following are placeholders for future sprints:
BLOB_READ_WRITE_TOKEN=
PROXYCURL_API_KEY=
ANTHROPIC_API_KEY=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_REFRESH_TOKEN=
SALESFORCE_INSTANCE_URL=
SALESLOFT_API_KEY=
UNIPILE_API_KEY=
UNIPILE_BASE_URL=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### 3. Database Setup

```bash
# Push the schema to your database
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ps-campaign-manager/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth handlers
│   │   └── campaigns/             # Campaign API routes
│   ├── campaigns/                 # Campaign pages
│   │   ├── new/                   # New campaign form
│   │   └── [id]/upload/           # Upload page (Sprint 2)
│   ├── login/                     # Login page
│   ├── templates/                 # Templates (Sprint 2+)
│   ├── settings/                  # Settings (Sprint 7)
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   ├── ui/                        # shadcn/ui components
│   └── providers.tsx              # SessionProvider wrapper
├── lib/
│   ├── auth.ts                    # NextAuth configuration
│   ├── prisma.ts                  # Prisma client
│   └── utils.ts                   # Utility functions
├── prisma/
│   └── schema.prisma              # Database schema
└── types/
    └── next-auth.d.ts             # NextAuth type extensions
```

## What's Next: Sprint 2

The next sprint will implement:

1. File upload (CSV/XLSX) with Vercel Blob storage
2. File parsing and column extraction
3. Column mapping UI with auto-detection
4. Prospect record creation from mapped data
5. Data preview table

## Design Decisions & Insights

### Architecture Highlights

**Prisma Schema Design:**
- `rawData` as JSON preserves full uploaded row for reprocessing
- `editedMessage` vs `generatedMessage` maintains AI draft audit trail
- Cascade delete on Campaign → Prospects ensures clean data removal
- Separate `LinkedInAccount` model enables multi-account management per user

**NextAuth Session Strategy:**
- JWT sessions (no database session table needed)
- Extended with user ID for easy authorization checks
- Server-side session validation on protected routes

**Tailwind + shadcn/ui:**
- CSS variables for theming (easy brand color changes)
- Radix UI primitives for accessibility
- Component composition over configuration

**Type Safety:**
- Strict TypeScript mode enabled
- Prisma generates types from schema
- NextAuth session types extended via declaration merging

## Development Notes

- **No database migrations yet** — using `prisma db push` for rapid iteration
- **Google OAuth only** — team uses Google Workspace
- **No mobile responsive design** — internal desktop tool
- **Dev dependencies warnings** — non-critical, can be addressed before production

---

Built with Next.js 14, Prisma, NextAuth.js, Tailwind CSS, and shadcn/ui.
