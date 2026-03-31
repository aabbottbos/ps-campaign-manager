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

# File Storage (required for Sprint 2)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# The following are placeholders for future sprints:
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
│   │   ├── auth/[...nextauth]/       # NextAuth handlers
│   │   └── campaigns/
│   │       ├── route.ts              # GET/POST campaigns
│   │       └── [id]/
│   │           ├── upload/           # File upload API
│   │           └── mapping/          # Column mapping API
│   ├── campaigns/
│   │   ├── page.tsx                  # Campaign list
│   │   ├── new/page.tsx              # New campaign form
│   │   └── [id]/
│   │       ├── page.tsx              # Campaign detail
│   │       ├── upload/page.tsx       # File upload UI
│   │       └── mapping/page.tsx      # Column mapping UI
│   ├── login/                        # Login page
│   ├── templates/                    # Templates (future)
│   ├── settings/                     # Settings (Sprint 7)
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Global styles
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx                # NEW in Sprint 2
│   │   └── radio-group.tsx
│   └── providers.tsx                 # SessionProvider wrapper
├── lib/
│   ├── auth.ts                       # NextAuth configuration
│   ├── prisma.ts                     # Prisma client
│   ├── utils.ts                      # Utility functions
│   ├── file-parser.ts                # NEW: CSV/Excel parsing
│   └── column-mapper.ts              # NEW: Auto-mapping logic
├── prisma/
│   └── schema.prisma                 # Database schema
└── types/
    └── next-auth.d.ts                # NextAuth type extensions
```

## Sprint 2: File Processing — ✅ Complete

### What's Been Built

#### 1. File Parsing Utilities
- **CSV Parser** (`lib/file-parser.ts`)
  - Handles CSV files with proper quote and delimiter handling
  - Validates headers and data rows
  - Gracefully handles empty cells and malformed data

- **Excel Parser**
  - Supports both .xlsx and .xls formats
  - Uses `xlsx` library for robust parsing
  - Extracts headers from first row
  - Filters empty rows automatically

- **Unified Parser Interface**
  - Returns structured data: headers, rows, preview (first 5), total count
  - File type validation (.csv, .xlsx, .xls)
  - File size validation (10MB limit)
  - Row limit validation (5,000 max)

#### 2. Column Mapping Intelligence
- **Auto-Detection Logic** (`lib/column-mapper.ts`)
  - Pattern matching for common column names
  - Supports variations: "First Name", "first_name", "fname", etc.
  - Handles all required fields: firstName, lastName, company
  - Optional fields: email, title, phone

- **Validation System**
  - Required field checking
  - Clear error messages for missing mappings
  - Field label utilities for UI display

- **Data Extraction**
  - Converts mapped columns to structured prospect data
  - Preserves original row data in `rawData` JSON field
  - Null-safe value extraction

#### 3. File Upload API
- **POST /api/campaigns/[id]/upload**
  - Vercel Blob storage integration
  - Multi-part form data handling
  - File validation (type, size)
  - Automatic file parsing and preview generation
  - Campaign status update to FILE_UPLOADED
  - Returns headers and preview for mapping UI

#### 4. Column Mapping API
- **POST /api/campaigns/[id]/mapping**
  - Accepts column mapping configuration
  - Re-fetches and parses uploaded file
  - Validates required field mappings
  - Creates Prospect records in batch
  - Stores both rawData and mapped fields
  - Updates campaign status to MAPPING_COMPLETE

- **GET /api/campaigns/[id]/mapping**
  - Returns file headers and preview
  - Returns existing mapping if available
  - Enables edit/re-map functionality

#### 5. Upload UI
- **Drag-and-Drop Upload** (`/campaigns/[id]/upload`)
  - Visual drag-and-drop zone with hover states
  - File browser fallback
  - File preview with name and size
  - Upload progress indicators
  - File requirements checklist
  - Error handling with user-friendly messages
  - Automatic redirect to mapping page

#### 6. Column Mapping UI
- **Interactive Mapping Interface** (`/campaigns/[id]/mapping`)
  - Dropdown selectors for each field
  - Auto-populated with detected mappings
  - Required field indicators (red asterisks)
  - Visual validation feedback (green/red alerts)
  - Real-time mapping validation

- **Data Preview Table**
  - Shows first 5 rows of uploaded data
  - Highlights mapped columns in primary color
  - Shows field labels next to column headers
  - Scrollable for wide datasets
  - Empty cell indicators

#### 7. Campaign Detail Page
- **Overview Dashboard** (`/campaigns/[id]`)
  - Campaign metadata display
  - Status badge with color coding
  - Prospect count
  - Uploaded file info
  - Next step guidance based on campaign status
  - Progress tracker for multi-step workflow

#### 8. Additional UI Components
- Select dropdown (Radix UI)
- Enhanced card layouts
- Status badges and indicators
- Progress checklist

### API Routes Added

```
POST   /api/campaigns/[id]/upload   — Upload and parse prospect file
GET    /api/campaigns/[id]/mapping  — Get file data for mapping
POST   /api/campaigns/[id]/mapping  — Save mapping and create prospects
```

### Complete User Flow (Sprints 1-2)

1. **Login** with Google → Campaign list
2. **Create Campaign** → Name, description, outreach type
3. **Upload File** → CSV/Excel with drag-and-drop
4. **Map Columns** → Auto-detected, editable mapping
5. **Start Enrichment** → (Ready for Sprint 3)

The campaign data is now fully structured in the database with both original raw data and mapped prospect fields, ready for enrichment.

## What's Next: Sprint 3

The next sprint will implement:

1. Proxycurl integration for LinkedIn enrichment
2. Background job processing with Inngest
3. Person lookup and profile pull
4. Employment validation logic
5. Confidence scoring
6. Enrichment progress UI with real-time updates

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
