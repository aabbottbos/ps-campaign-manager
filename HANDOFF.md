# PS Campaign Manager - Development Handoff

**Last Updated:** March 31, 2026
**Current Status:** All sprints implemented, actively debugging file upload functionality

---

## Executive Summary

The PS Campaign Manager is a LinkedIn outreach automation tool for Product School. All 7 sprints have been implemented in code, including authentication, campaign management, file uploads, data enrichment, message generation, CRM integration, and LinkedIn automation. However, we are currently debugging the file upload functionality - **no prospect file has been successfully uploaded yet**.

---

## Sprint Implementation Status

### ✅ Sprint 1: Authentication & Basic Campaign Setup
- NextAuth v4 with Google OAuth
- PostgreSQL database (Neon) with Prisma ORM
- Campaign creation with basic details
- **Status:** Working

### ⚠️ Sprint 2: File Upload & Column Mapping
- Vercel Blob storage integration
- CSV/Excel file parsing
- File validation (type, size, row count)
- **Status:** Implemented but NOT working - debugging Blob access configuration

### ✅ Sprint 3: Data Enrichment (ProxyCurl)
- Background jobs with Inngest
- ProxyCurl API integration
- LinkedIn profile enrichment
- **Status:** Implemented (not tested)

### ✅ Sprint 4: AI Message Generation
- Anthropic Claude API integration
- Personalized message generation based on prospect data
- Character limit handling (300 for connect, 1900 for InMail)
- **Status:** Implemented (not tested)

### ✅ Sprint 5: Salesforce Integration
- OAuth authentication flow
- Contact/Lead creation and sync
- Campaign member association
- **Status:** Implemented and verified (not tested with real data)

### ✅ Sprint 6: SalesLoft Integration
- API key authentication
- Person creation and cadence enrollment
- Bidirectional sync with Salesforce
- **Status:** Implemented and verified (not tested with real data)

### ✅ Sprint 7: LinkedIn Automation (Unipile)
- Connection requests with personalized messages
- InMail sending
- Response tracking
- **Status:** Implemented (not tested)

---

## Current Issues

### 🔴 CRITICAL: File Upload Not Working

**Problem:** File uploads to Vercel Blob storage failing with access configuration errors.

**Root Cause:** Mismatch between Blob store configuration and code parameters.

**What We Know:**
- User created a PRIVATE Blob store in Vercel dashboard
- Code now correctly uses `access: "private"` parameter
- BLOB_READ_WRITE_TOKEN is properly configured in .env.local
- Server is running cleanly on port 3000

**Recent Changes:**
1. Changed from `access: "public"` to `access: "private"` in `/app/api/campaigns/[id]/upload/route.ts:95`
2. Cleaned up environment variable conflicts (.env.local now takes precedence)
3. Restarted dev server

**Next Steps:**
1. Test file upload with current configuration
2. If still failing, check Blob store configuration in Vercel dashboard
3. Verify BLOB_READ_WRITE_TOKEN has correct permissions
4. Check server logs for specific error messages

**File:** `app/api/campaigns/[id]/upload/route.ts:91-99`

---

## Key Technical Details

### Technology Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **Authentication:** NextAuth v4 with Google OAuth
- **File Storage:** Vercel Blob (private storage)
- **Background Jobs:** Inngest
- **AI:** Anthropic Claude
- **CRM:** Salesforce + SalesLoft
- **LinkedIn:** Unipile API

### Database
- **Connection:** Neon PostgreSQL with connection pooling
- **Schema:** All tables created via `npx prisma db push`
- **Strategy:** Using `db push` (not migrations) for deployment
- **Deployment:** `postbuild` script runs `prisma db push --accept-data-loss`

### Environment Variables

**Required Variables (.env.local):**
```bash
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=***REDACTED_NEXTAUTH_SECRET***
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=722313097131-...
GOOGLE_CLIENT_SECRET=GOCSPX-...

# File Storage (CRITICAL)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_jkin4iLk7cH8jcRV_..."

# Enrichment
PROXYCURL_API_KEY=your-proxycurl-api-key
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# Message Generation
ANTHROPIC_API_KEY=your-anthropic-api-key

# CRM (Sprint 5 & 6)
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_REFRESH_TOKEN=
SALESFORCE_INSTANCE_URL=
SALESLOFT_API_KEY=

# LinkedIn Automation (Sprint 7)
UNIPILE_API_KEY=
UNIPILE_BASE_URL=
```

**Important:** .env.local takes precedence over .env. Remove duplicates from .env to avoid conflicts.

---

## Errors Fixed This Session

### 1. NextAuth Version Incompatibility
- **Error:** `getServerSession is not a function`
- **Fix:** Downgraded from v5 beta to v4.24.7, updated adapter
- **Files:** package.json, lib/auth.ts

### 2. Port Conflicts
- **Error:** Server running on wrong ports (3001, 3002, 3003)
- **Fix:** Killed processes on ports 3000-3002, cleared .next cache

### 3. Home Page 500 Error
- **Error:** Redirect in non-async function
- **Fix:** Made HomePage async in app/page.tsx

### 4. Database Tables Missing
- **Error:** OAuth callback failing, Account table not found
- **Fix:** Ran `npx prisma db push --accept-data-loss`

### 5. Select Component Error
- **Error:** "A <Select.Item /> must have a value prop that is not an empty string"
- **Fix:** Changed empty value to "none" in app/campaigns/new/page.tsx

### 6. Environment Variable Conflict
- **Error:** BLOB_READ_WRITE_TOKEN not being used
- **Fix:** Removed placeholder from .env, real token in .env.local

### 7. Build Cache Corruption
- **Error:** "Cannot find module './vendor-chunks/openid-client.js'"
- **Fix:** Killed servers, removed .next directory, restarted

### 8. Vercel Blob Access Configuration (ONGOING)
- **Error:** Various access control errors
- **Fix:** Changed to `access: "private"` to match Blob store config
- **Status:** Awaiting test results

---

## Key Files Modified This Session

### Authentication
- `package.json` - NextAuth version, adapter, postbuild script
- `lib/auth.ts` - NextAuth v4 compatibility, added secret field

### Pages
- `app/page.tsx` - Made async for redirect
- `app/campaigns/page.tsx` - Added session check with redirect
- `app/campaigns/new/page.tsx` - Fixed Select component empty value

### API Routes
- `app/api/campaigns/[id]/upload/route.ts` - Blob storage access configuration

### Environment
- `.env` - Removed BLOB_READ_WRITE_TOKEN placeholder
- `.env.local` - Contains real Blob token

---

## Testing Checklist

### Not Yet Tested
- [ ] File upload (CSV/Excel)
- [ ] Column mapping interface
- [ ] ProxyCurl enrichment
- [ ] Message generation with Claude
- [ ] Salesforce sync with real credentials
- [ ] SalesLoft cadence enrollment with real credentials
- [ ] LinkedIn message sending with real credentials

### Tested & Working
- [x] Google OAuth login
- [x] Campaign creation
- [x] Database schema sync (local and remote)
- [x] Server startup on port 3000

---

## Development Commands

```bash
# Start dev server
npm run dev

# Database operations
npx prisma generate              # Generate Prisma client
npx prisma db push               # Sync schema to database
npx prisma studio                # Open database GUI

# Clean restart (if needed)
pkill -9 -f "next dev"           # Kill all dev servers
rm -rf .next                     # Clear build cache
npm run dev                      # Start fresh
```

---

## Architecture Notes

### Campaign Workflow
1. User creates campaign (name, description, outreach type)
2. User uploads prospect file (CSV/Excel) ⬅️ **CURRENT BLOCKER**
3. User maps columns to required fields
4. System enriches prospects via ProxyCurl (background job)
5. System generates personalized messages via Claude
6. User reviews and approves messages
7. System syncs to Salesforce/SalesLoft
8. System sends LinkedIn messages via Unipile

### Data Model
- **Campaign:** Core entity with settings
- **Prospect:** Individual contact in a campaign
- **ProspectEnrichment:** LinkedIn data from ProxyCurl
- **LinkedInAccount:** Unipile connection details
- **SalesforceIntegration:** OAuth tokens and sync status
- **SalesLoftIntegration:** API key and configuration

### Security Considerations
- Private Blob storage for prospect data (contains PII)
- NextAuth JWT strategy for sessions
- OAuth flows for Salesforce
- API key authentication for SalesLoft, ProxyCurl, Unipile
- Environment variables never committed to git

---

## Next Steps

### Immediate (Unblock Sprint 2)
1. **Test file upload** with current `access: "private"` configuration
2. **If failing:** Verify Blob store settings in Vercel dashboard
3. **If failing:** Check token permissions and expiration
4. **If failing:** Review server logs for specific error messages

### After File Upload Works
1. Test column mapping interface
2. Test ProxyCurl enrichment with sample prospect
3. Test Claude message generation
4. Add real API credentials for Salesforce, SalesLoft
5. Test end-to-end workflow with 1-2 prospects

### Before Production
1. Switch from `db push` to proper migrations
2. Add comprehensive error handling
3. Add rate limiting for external APIs
4. Add webhook handlers for async operations
5. Add proper logging and monitoring
6. Security audit of OAuth flows
7. Load testing with 1000+ prospects

---

## Known Technical Debt

1. **Database migrations:** Using `db push` instead of migrations (acceptable for MVP)
2. **Error handling:** Basic try/catch, needs more granular error messages
3. **Rate limiting:** No rate limiting on external API calls
4. **Testing:** No automated tests yet
5. **Validation:** Client-side only, needs server-side validation
6. **Logging:** Console.log only, needs proper logging service
7. **Type safety:** Some `any` types in API integrations

---

## Resources

### Documentation
- [Vercel Blob - Private Storage](https://vercel.com/docs/vercel-blob/private-storage)
- [Vercel Blob - Using SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [NextAuth v4 Docs](https://next-auth.js.org/)
- [Prisma Docs](https://www.prisma.io/docs)

### API Documentation
- ProxyCurl: https://nubela.co/proxycurl/docs
- Anthropic Claude: https://docs.anthropic.com/
- Salesforce REST API: https://developer.salesforce.com/docs/apis
- SalesLoft API: https://developers.salesloft.com/
- Unipile API: https://docs.unipile.com/

---

## Contact & Context

This application is being developed for Product School to automate LinkedIn outreach campaigns. The development approach has been sprint-based, implementing features incrementally. All sprints are now implemented in code, but we're in the debugging/testing phase.

**Current Blocker:** File upload functionality must work before we can test any downstream features (enrichment, message generation, CRM sync, LinkedIn automation).

**Priority:** Get Sprint 2 file upload working, then test end-to-end workflow with sample data before connecting real CRM/LinkedIn accounts.
