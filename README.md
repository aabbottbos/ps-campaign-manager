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

# Enrichment (required for Sprint 3)
PROXYCURL_API_KEY=your-proxycurl-api-key
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# Message Generation (required for Sprint 4)
ANTHROPIC_API_KEY=your-anthropic-api-key

# CRM Integration (required for Sprints 5-6)
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret
SALESFORCE_REFRESH_TOKEN=your-salesforce-refresh-token
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
SALESLOFT_API_KEY=your-salesloft-api-key

# LinkedIn Sending (required for Sprint 7)
UNIPILE_API_KEY=your-unipile-api-key
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
│   │   ├── auth/[...nextauth]/           # NextAuth handlers
│   │   ├── inngest/                      # Inngest webhook
│   │   └── campaigns/
│   │       ├── route.ts                  # GET/POST campaigns
│   │       └── [id]/
│   │           ├── route.ts              # NEW: GET campaign details
│   │           ├── upload/               # File upload API
│   │           ├── mapping/              # Column mapping API
│   │           ├── enrich/               # Enrichment trigger & stats
│   │           ├── generate-messages/    # NEW: Message generation trigger & stats
│   │           └── prospects/
│   │               ├── route.ts          # NEW: GET prospects with filters
│   │               └── [prospectId]/
│   │                   └── route.ts      # NEW: PATCH prospect (edit/approve/skip)
│   ├── campaigns/
│   │   ├── page.tsx                      # Campaign list
│   │   ├── new/page.tsx                  # New campaign form
│   │   └── [id]/
│   │       ├── page.tsx                  # Campaign detail
│   │       ├── upload/page.tsx           # File upload UI
│   │       ├── mapping/page.tsx          # Column mapping UI
│   │       ├── enrichment/page.tsx       # Enrichment progress
│   │       └── review/page.tsx           # NEW: Message review & editing
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
│   │   ├── select.tsx
│   │   ├── radio-group.tsx
│   │   ├── badge.tsx                 # NEW in Sprint 3
│   │   └── progress.tsx              # NEW in Sprint 3
│   └── providers.tsx                 # SessionProvider wrapper
├── lib/
│   ├── auth.ts                       # NextAuth configuration
│   ├── prisma.ts                     # Prisma client
│   ├── utils.ts                      # Utility functions
│   ├── file-parser.ts                # CSV/Excel parsing
│   ├── column-mapper.ts              # Auto-mapping logic
│   ├── proxycurl.ts                  # Proxycurl API client
│   ├── enrichment.ts                 # Confidence scoring & validation
│   ├── claude.ts                     # NEW: Claude API client + prompt builder
│   └── inngest/
│       ├── client.ts                 # Inngest client
│       ├── enrich-prospects.ts       # Enrichment background job
│       └── generate-messages.ts      # NEW: Message generation background job
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

## Sprint 3: Enrichment Processing — ✅ Complete

### What's Been Built

#### 1. Proxycurl Integration
- **API Client** (`lib/proxycurl.ts`)
  - Person Search API: Find LinkedIn profiles by name + company
  - Person Profile API: Pull full LinkedIn profile data
  - Rate limiting with configurable delays
  - Error handling for 404s and API failures
  - Caching support (fallback-to-cache, use-cache)

#### 2. Enrichment Intelligence
- **Confidence Scoring** (`lib/enrichment.ts`)
  - Weighted scoring algorithm (0.0 - 1.0)
    - Name similarity: 40 points
    - Email match: 30 points
    - Company match: 20 points
    - Title match: 10 points
  - Low confidence (<0.5) treated as STALE

- **Employment Validation**
  - Fuzzy company name matching
    - Normalizes: "Google Inc." = "Google LLC" = "Google"
    - Handles common suffixes (Inc, LLC, Corp, Co, Ltd)
  - Current position detection (no end_date)
  - Company mismatch flagged as STALE

- **Title Matching**
  - Fuzzy job title comparison
  - Common abbreviation handling (VP, CEO, PM, etc.)
  - Containment logic for seniority levels

#### 3. Background Job Processing (Inngest)
- **Inngest Setup**
  - Client configuration (`lib/inngest/client.ts`)
  - Webhook endpoint (`/api/inngest`)
  - Function registration and deployment

- **Enrichment Job** (`lib/inngest/enrich-prospects.ts`)
  - Processes prospects sequentially with rate limiting
  - 1 second delay between API calls (conservative)
  - Updates prospect status in real-time (PENDING → PROCESSING → FOUND/NOT_FOUND/STALE/ERROR)
  - Campaign status tracking (MAPPING_COMPLETE → ENRICHING → ENRICHMENT_COMPLETE)
  - Comprehensive error handling per prospect
  - Returns detailed stats on completion

#### 4. Enrichment API
- **POST /api/campaigns/[id]/enrich**
  - Triggers Inngest enrichment job
  - Validates campaign status and ownership
  - Returns job started confirmation

- **GET /api/campaigns/[id]/enrich**
  - Real-time enrichment statistics
  - Grouped by enrichment status
  - Totals for: pending, processing, found, not_found, stale, error

#### 5. Enrichment Progress UI
- **Real-Time Dashboard** (`/campaigns/[id]/enrichment`)
  - Auto-starts enrichment on page load
  - Live progress bar with percentage
  - 3-second polling for updates while enriching
  - Color-coded stat cards:
    - ✅ Found (green) - Current employee, high confidence
    - ⚠️ Stale (yellow) - Left company or low confidence
    - ❌ Not Found (gray) - No LinkedIn profile
    - 🔴 Error (red) - API failures
  - Auto-refreshing status indicator
  - Next step guidance on completion

#### 6. Prospect Data Model Updates
- Enhanced Prospect fields:
  - `enrichmentStatus`: PENDING | PROCESSING | FOUND | NOT_FOUND | STALE | ERROR
  - `enrichmentConfidence`: Float (0.0 - 1.0)
  - `linkedinUrl`: Profile URL from Proxycurl
  - `linkedinHeadline`: Current headline
  - `linkedinSummary`: About section
  - `linkedinLocation`: City, State, Country
  - `currentCompany`: Validated from profile
  - `currentTitle`: Validated from profile
  - `profileImageUrl`: Profile photo URL
  - `linkedinProviderId`: LinkedIn's internal user ID
  - `enrichmentError`: Error message for debugging
  - `enrichedAt`: Timestamp

#### 7. Additional UI Components
- Badge component (with success, warning, error variants)
- Progress bar component (Radix UI)

### API Routes Added

```
POST   /api/campaigns/[id]/enrich   — Trigger enrichment job
GET    /api/campaigns/[id]/enrich   — Get enrichment stats
GET    /api/inngest                 — Inngest webhook (dev)
POST   /api/inngest                 — Inngest webhook (execute)
PUT    /api/inngest                 — Inngest webhook (register)
```

### Enrichment Workflow

1. **Person Search**: Query Proxycurl with firstName + lastName + company
2. **Profile Fetch**: If found, pull full LinkedIn profile
3. **Validation**: Check current employment matches uploaded company
4. **Scoring**: Calculate confidence based on multiple match signals
5. **Classification**: Determine FOUND | STALE | NOT_FOUND
6. **Storage**: Save all LinkedIn data + confidence score

### Complete User Flow (Sprints 1-3)

1. **Login** with Google → Campaign list
2. **Create Campaign** → Name, description, outreach type
3. **Upload File** → CSV/Excel with drag-and-drop
4. **Map Columns** → Auto-detected, editable mapping
5. **Enrich Prospects** → Automated LinkedIn data pull
   - Real-time progress tracking
   - ~1 second per prospect (Proxycurl rate limits)
   - FOUND prospects ready for message generation
6. **Message Generation** → (Ready for Sprint 4)

## Sprint 4: Message Generation — ✅ Complete

### What's Been Built

#### 1. Claude API Integration
- **API Client** (`lib/claude.ts`)
  - Claude Sonnet 4 (20250514) for message generation
  - System prompt with sales copywriting guidelines
  - User prompt builder with campaign + prospect context
  - Character validation and retry logic
  - Automatic shortening if over limit

#### 2. Prompt Engineering
- **System Prompt Design**
  - Sales copywriter persona for Product School
  - Key principles: personalization-first, conversational tone, low-friction CTA
  - Anti-patterns: no filler phrases, max 1 exclamation mark, no emojis
  - Varied opening instruction to avoid repetition

- **User Prompt Construction**
  - Campaign description (value prop, talking points)
  - Message template (optional additional instructions)
  - Outreach type + character limit
  - Prospect profile data:
    - Name, title, company
    - LinkedIn headline
    - Location
    - Summary (first 500 chars to avoid token bloat)
  - Clear response format instruction

#### 3. Character Validation & Retry
- **Validation Logic**
  - Connect requests: 300 character hard limit
  - InMail: 1,900 character hard limit
  - Real-time character counting
  - Over-limit detection with "exceeded by" calculation

- **Automatic Retry**
  - If first attempt exceeds limit, re-prompt Claude
  - Explicit shortening instruction with context
  - Conversation history maintained for context
  - Max 2 attempts (1 retry)
  - Tracks `wasRetried` flag for analytics

#### 4. Message Generation Background Job
- **Inngest Function** (`lib/inngest/generate-messages.ts`)
  - Processes all FOUND prospects with PENDING messages
  - Sequential processing with 1.2 second delay (Claude rate limits)
  - Updates campaign status to MESSAGES_GENERATED
  - Stores generated message + character count
  - Sets messageStatus to GENERATED
  - Error handling per prospect (doesn't fail entire batch)
  - Returns stats: generated, errors, retried count

#### 5. Message Generation API
- **POST /api/campaigns/[id]/generate-messages**
  - Triggers Inngest message generation job
  - Validates campaign status (must be ENRICHMENT_COMPLETE)
  - Validates prospects available
  - Returns job started confirmation

- **GET /api/campaigns/[id]/generate-messages**
  - Real-time message generation statistics
  - Grouped by messageStatus
  - Totals for: pending, generated, edited, approved, skipped

#### 6. Prospect Management API
- **GET /api/campaigns/[id]/prospects**
  - Fetch prospects with optional filtering
  - Filter by enrichmentStatus, messageStatus
  - Ordered by status and name

- **PATCH /api/campaigns/[id]/prospects/[prospectId]**
  - Update prospect message and status
  - Validate message length
  - Set messageStatus (EDITED, APPROVED, SKIPPED)
  - Update character count

- **GET /api/campaigns/[id]**
  - Fetch single campaign with metadata
  - Used by review UI to get outreach type

#### 7. Message Review UI
- **Comprehensive Review Interface** (`/campaigns/[id]/review`)
  - **Auto-starts message generation** on page load if needed
  - **Real-time progress polling** during generation (3-second intervals)

  - **Prospect Cards**:
    - Profile image, name, title, company
    - LinkedIn profile link
    - Full message display with monospace font
    - Character count with color coding (green → yellow → red)
    - Status badges (Approved, Edited, Skipped)

  - **Inline Editing**:
    - Click "Edit" to open textarea
    - Live character counter while typing
    - Over-limit prevention (can't save if over)
    - Cancel or Save
    - "Reset" button to restore original AI message

  - **Actions Per Prospect**:
    - Edit message
    - Reset to original (if edited)
    - Approve (marks as APPROVED)
    - Skip (marks as SKIPPED)
    - Unskip (revert from SKIPPED)

  - **Filters & Search**:
    - Free-text search (name, company, title)
    - Status filter dropdown (all, pending, generated, edited, approved, skipped)
    - "Approve All Visible" bulk action

  - **Progress Tracking**:
    - "X of Y prospects approved" counter
    - Enabled "Continue" button when ≥1 approved
    - Visual feedback for generation in progress

#### 8. Campaign Workflow Updates
- Updated campaign detail page with next steps:
  - ENRICHMENT_COMPLETE → "Review Messages"
  - MESSAGES_GENERATED → "Review Messages"
- Progress tracker shows message generation stage

### API Routes Added

```
POST   /api/campaigns/[id]/generate-messages  — Trigger generation
GET    /api/campaigns/[id]/generate-messages  — Get generation stats
GET    /api/campaigns/[id]/prospects          — List prospects with filters
PATCH  /api/campaigns/[id]/prospects/[id]     — Update prospect message/status
GET    /api/campaigns/[id]                    — Get campaign details
```

### Message Generation Workflow

1. **Trigger**: User lands on `/campaigns/[id]/review`
2. **Auto-Start**: If ENRICHMENT_COMPLETE and pending messages, start generation
3. **For Each FOUND Prospect**:
   - Build prompt with campaign context + prospect profile
   - Call Claude Sonnet 4 API
   - Validate character count
   - If over limit → retry with shortening instruction
   - Store message + character count
   - Mark as GENERATED
4. **Poll Progress**: UI refreshes every 3s during generation
5. **Review**: User sees all generated messages
6. **Edit**: Inline editing with live character counter
7. **Approve**: Mark messages for sending
8. **Continue**: Move to CRM sync (Sprint 5-6) or send (Sprint 7)

### Complete User Flow (Sprints 1-4)

1. **Login** with Google
2. **Create Campaign** → Details, outreach type
3. **Upload File** → CSV/Excel prospects
4. **Map Columns** → Auto-detected mapping
5. **Enrich Prospects** → LinkedIn data pull (~1 sec/prospect)
6. **Generate Messages** → AI personalization (~1.2 sec/prospect)
   - Auto-starts on review page
   - Claude writes personalized messages
   - Character validation ensures compliance
7. **Review & Edit Messages** →
   - Inline editing
   - Character counter
   - Approve/Skip per prospect
   - Bulk approve option
8. **CRM Sync & Send** → (Ready for Sprints 5-7)

## Sprints 5-6: CRM Integration — ✅ Complete

### What's Been Built

#### 1. Salesforce Integration
- **API Client** (`lib/salesforce.ts`)
  - jsforce library for Salesforce REST API
  - OAuth 2.0 with refresh token flow
  - Connection caching with automatic token refresh
  - Account and Contact management

- **Contact Sync Logic**
  - **Duplicate Detection**: Search by email first, then by name + company
  - **Account Lookup/Create**: Find existing Account or create new one
  - **Contact Create/Update**:
    - Creates new Contact if none exists
    - Updates existing Contact with enriched data (non-destructive)
    - Links to Account (company)
    - Stores LinkedIn URL in custom field `LinkedIn_Profile__c`
  - **Smart Updates**: Only updates fields if existing value is empty

- **Fields Synced**:
  - FirstName, LastName
  - Email, Phone
  - Title (from LinkedIn)
  - AccountId (company)
  - LinkedIn_Profile__c (custom field)
  - LeadSource: "LinkedIn Outreach"
  - Description: "Enriched via PS Campaign Manager"

#### 2. SalesLoft Integration
- **API Client** (`lib/salesloft.ts`)
  - API key authentication (Bearer token)
  - Person and Cadence management
  - Activity logging

- **Person Sync Logic**
  - **Duplicate Detection**: Search by email first, then by LinkedIn URL
  - **Person Create/Update**:
    - Creates new Person if none exists
    - Updates existing Person with enriched data
    - Links to Salesforce Contact via `crm_id` field
  - **Cadence Enrollment**: Automatically adds Person to specified cadence
  - **Smart Updates**: Non-destructive updates for existing records

- **Fields Synced**:
  - first_name, last_name
  - email_address, phone
  - title (from LinkedIn)
  - company_name
  - linkedin_url
  - crm_id (Salesforce Contact ID for bidirectional sync)

#### 3. CRM Sync Background Job
- **Inngest Function** (`lib/inngest/sync-crm.ts`)
  - Processes all APPROVED prospects
  - Concurrency: 2 campaigns can sync simultaneously
  - Campaign status: MESSAGES_GENERATED/REVIEW → CRM_SYNCING → CRM_SYNCED

- **Sync Process Per Prospect**:
  1. Mark as SYNCING
  2. **Salesforce**: Find or create Contact + Account
  3. **SalesLoft**: Find or create Person (linked to SFDC Contact)
  4. **Cadence**: Enroll in cadence if campaign has one specified
  5. Store all CRM IDs on Prospect record
  6. Mark as SYNCED or ERROR

- **Error Handling**:
  - Salesforce failure doesn't block SalesLoft sync
  - SalesLoft failure stores error but doesn't fail batch
  - Per-prospect error logging with messages
  - Continues processing remaining prospects

- **Returns**:
  - Total processed, synced, errors
  - Salesforce: created vs updated counts
  - SalesLoft: created vs updated, cadence enrolled count

#### 4. Campaign Creation Enhancement
- **Cadence Selector** added to campaign form
  - Fetches available cadences from SalesLoft API
  - Optional field (can create campaign without cadence)
  - Stored on `Campaign.salesloftCadenceId`
  - Used during CRM sync for auto-enrollment

#### 5. CRM Sync API
- **POST /api/campaigns/[id]/crm-sync**
  - Triggers Inngest CRM sync job
  - Validates approved prospects exist
  - Returns job started confirmation

- **GET /api/campaigns/[id]/crm-sync**
  - Real-time sync statistics
  - Grouped by crmSyncStatus
  - Totals for: not_synced, syncing, synced, error

- **GET /api/salesloft/cadences**
  - Lists available SalesLoft cadences
  - Used by campaign creation form dropdown

#### 6. CRM Sync Progress UI
- **Auto-Start Sync** (`/campaigns/[id]/crm-sync`)
  - Automatically triggers sync on page load if prospects ready
  - Real-time progress tracking with 2-second polling
  - Progress bar with percentage
  - Status badges (In Progress, Complete)

- **Stats Display**:
  - Synced count (green, success)
  - Error count (red, with error messages)
  - Auto-refresh during sync

- **Info Card**:
  - Explains Salesforce Contact creation
  - Explains SalesLoft Person creation + Cadence enrollment
  - Documents duplicate detection logic
  - User education about the sync process

#### 7. Workflow Integration
- Campaign detail page updated with CRM sync next step
- Status transitions: REVIEW → CRM_SYNCING → CRM_SYNCED → Ready to Send
- Graceful error handling with retry capability

### API Routes Added

```
POST   /api/campaigns/[id]/crm-sync    — Trigger CRM sync
GET    /api/campaigns/[id]/crm-sync    — Get sync stats
GET    /api/salesloft/cadences         — List available cadences
```

### Duplicate Detection Strategy

**Salesforce Contact:**
1. Search by email (exact match)
2. If not found, search by firstName + lastName + Account.Name
3. If found → update with enriched data (non-destructive)
4. If not found → create new Contact

**SalesLoft Person:**
1. Search by email_address (exact match)
2. If not found, search by linkedin_url
3. If found → update with enriched data
4. If not found → create new Person

This prevents creating duplicate records across multiple campaign syncs.

### Complete User Flow (Sprints 1-6)

1. **Login** with Google
2. **Create Campaign** → Details, outreach type, **SalesLoft cadence (optional)** ← **NEW**
3. **Upload File** → CSV/Excel prospects
4. **Map Columns** → Auto-detected mapping
5. **Enrich Prospects** → LinkedIn data pull (~1 sec/prospect)
6. **Generate Messages** → AI personalization (~1.2 sec/prospect)
7. **Review & Edit Messages** → Inline editing, approve/skip
8. **Sync to CRM** → ← **NEW**
   - Auto-starts on CRM sync page
   - Creates/updates Salesforce Contacts
   - Creates/updates SalesLoft People
   - Enrolls in SalesLoft Cadence (if selected)
   - Links SFDC ↔ SalesLoft via crm_id
   - Real-time progress tracking
9. **Sync to CRM** → ← **Sprint 5-6**
   - Auto-starts on CRM sync page
   - Creates/updates Salesforce Contacts
   - Creates/updates SalesLoft People
   - Enrolls in SalesLoft Cadence (if selected)
   - Links SFDC ↔ SalesLoft via crm_id
   - Real-time progress tracking
10. **Send Messages** → ← **Sprint 7** 🎉
   - Connect LinkedIn account via Unipile
   - Automated sending with human-like pacing
   - Daily send limits per account
   - Pause/resume controls
   - Activity logging to SalesLoft

## Sprint 7: LinkedIn Sending — ✅ Complete

Sprint 7 implements automated LinkedIn message delivery using Unipile as a proxy to LinkedIn. Messages are sent with randomized human-like pacing and daily send limits to avoid triggering LinkedIn's spam detection.

### Key Features

1. **LinkedIn Account Connection (Unipile):**
   - OAuth flow via Unipile hosted auth
   - Multiple account support per user
   - Account status tracking (ACTIVE, DISCONNECTED, RATE_LIMITED)
   - Daily send limit visualization (50 messages/day per account)

2. **Intelligent Account Rotation:**
   - System selects account with most remaining daily sends
   - Automatic load distribution across multiple accounts
   - Prevents any single account from hitting limits

3. **Human-like Send Pacing:**
   - Randomized delays: 30-90 seconds between sends
   - Mimics natural human behavior on LinkedIn
   - Reduces risk of spam detection

4. **Send Progress Tracking:**
   - Real-time progress UI with auto-refresh (3s polling)
   - Pause/resume controls
   - Sent/Failed/Pending statistics
   - Campaign status badges (SENDING, PAUSED, COMPLETE)

5. **SalesLoft Activity Logging:**
   - Automatic activity creation on successful send
   - Type: `linkedin_connection` or `linkedin_inmail`
   - Message content logged as notes
   - Linked to Person record via salesloftPersonId

6. **Error Handling:**
   - Individual send failures don't stop the entire campaign
   - Failed sends marked with error message
   - Rate limit detection with automatic retry support
   - Campaign can be paused and resumed at any time

### Implementation Details

**Files Created:**

```
lib/unipile.ts                              — Unipile API client
lib/inngest/send-messages.ts                — Background send job
app/api/linkedin/accounts/route.ts          — List LinkedIn accounts
app/api/linkedin/connect/route.ts           — Generate auth URL
app/api/linkedin/accounts/[id]/route.ts     — Disconnect account
app/api/linkedin/callback/route.ts          — Complete OAuth connection
app/api/campaigns/[id]/send/route.ts        — Send API (GET/POST/PATCH)
app/settings/page.tsx                       — Settings UI (updated)
app/settings/linkedin/callback/page.tsx     — OAuth callback handler
app/campaigns/[id]/send/page.tsx            — Send progress UI (updated)
```

**Database Changes:**

Updated `LinkedInAccount` model:
- Added `email` field (from Unipile)
- Added `dailySendCount` (resets daily)
- Added `lastSendDate` (tracks last send time)
- Changed `status` default to "ACTIVE"

**API Endpoints:**

```
GET    /api/linkedin/accounts              — List connected LinkedIn accounts
POST   /api/linkedin/connect               — Generate Unipile auth URL
DELETE /api/linkedin/accounts/[id]         — Disconnect account
POST   /api/linkedin/callback              — Complete OAuth and store account

GET    /api/campaigns/[id]/send            — Get send statistics
POST   /api/campaigns/[id]/send            — Start sending messages
PATCH  /api/campaigns/[id]/send            — Pause/resume sending
```

**Unipile API Integration:**

The Unipile client supports:
- `listAccounts()` — Get all connected LinkedIn accounts
- `getAuthUrl()` — Generate hosted OAuth URL
- `sendConnectionRequest()` — Send connection request with note (300 chars)
- `sendInMail()` — Send InMail message (~1900 chars)
- `disconnectAccount()` — Remove LinkedIn account
- `checkAccountStatus()` — Verify account is active

**Send Job Logic:**

1. Select prospects with `messageStatus = APPROVED`, `crmSyncStatus = SYNCED`, `sendStatus = NOT_SENT`
2. For each prospect:
   - Check if campaign is paused (break if paused)
   - Select best LinkedIn account (most remaining sends)
   - Send message via Unipile (connection request or InMail)
   - Update prospect `sendStatus` to SENT or FAILED
   - Increment account's `dailySendCount`
   - Log activity to SalesLoft
   - Add randomized delay (30-90s)
3. Update campaign to COMPLETE if no prospects remain

**Daily Send Limit Tracking:**

- Each LinkedIn account limited to 50 sends/day
- `dailySendCount` resets when date changes
- Account selection prioritizes accounts with most remaining sends
- Settings page shows progress bar for each account

### Complete User Flow (Sprints 1-7)

1. **Login** with Google
2. **Create Campaign** → Details, outreach type, SalesLoft cadence (optional)
3. **Upload File** → CSV/Excel prospects
4. **Map Columns** → Auto-detected mapping
5. **Enrich Prospects** → LinkedIn data pull (~1 sec/prospect)
6. **Generate Messages** → AI personalization (~1.2 sec/prospect)
7. **Review & Edit Messages** → Inline editing, approve/skip
8. **Sync to CRM** → Salesforce + SalesLoft sync with cadence enrollment
9. **Send Messages** → 🎉
   - Navigate to Settings → Connect LinkedIn account
   - Campaign page → "Send Campaign" button
   - Auto-starts sending with human-like pacing
   - Monitor real-time progress
   - Pause/resume as needed
   - Activity automatically logged to SalesLoft

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
