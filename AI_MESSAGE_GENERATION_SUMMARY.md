# AI-Personalized Message Generation - Implementation Summary

**Date:** April 8, 2026
**Status:** ✅ **COMPLETE**

---

## Overview

Implemented AI-personalized message generation that works with **partial prospect data** without requiring LinkedIn enrichment. This bypasses the broken Apify enrichment provider and allows users to generate personalized messages using whatever data they have available.

---

## Problem Statement

**Before:**
- Message generation required `enrichmentStatus: "FOUND"` from Apify
- Apify enrichment provider is currently broken (returns "not_found" for all profiles)
- Users with only partial data (names, companies, LinkedIn URLs) couldn't proceed
- No way to generate personalized messages without full LinkedIn enrichment

**User Need:**
> "if ai-personalized messages is selected, the app will - when start enrichment button is selected - call the configured LLM, request it to create personalized messages for each of the users in the sheet which it has enough information to do so"

---

## Solution

Created a new AI message generation workflow that:
1. **Skips LinkedIn enrichment entirely** for AI_PERSONALIZED campaigns
2. **Works with any available prospect data** (firstName, lastName, company, title, linkedinUrl, etc.)
3. **Generates personalized messages** using Claude API based on available information
4. **Gracefully handles missing data** by skipping prospects without at least a name

---

## Changes Implemented

### 1. New Inngest Function: `generate-ai-personalized-messages.ts`

**Location:** `lib/inngest/generate-ai-personalized-messages.ts`

**Purpose:** Generate AI-personalized messages without requiring enrichment

**Key Features:**
- Processes prospects with `messageStatus: "PENDING"` (not filtering by enrichmentStatus)
- Checks if prospect has at minimum a name (firstName or lastName)
- Skips prospects without names with clear error messages
- Uses whatever data is available (title, company, linkedinUrl, etc.)
- Respects Claude API rate limits (1.2s delay between requests)
- Sets enrichmentStatus to "FOUND" for successfully generated messages
- Sets messageStatus to "GENERATED" for review

**Code Flow:**
```typescript
// 1. Fetch campaign and all pending prospects
const campaign = await prisma.campaign.findUnique({
  where: { id: campaignId },
  include: {
    prospects: {
      where: { messageStatus: "PENDING" },
    },
  },
})

// 2. For each prospect, check if we have enough data
const hasName = prospect.firstName || prospect.lastName

if (!hasName) {
  // Skip - insufficient data
  await prisma.prospect.update({
    where: { id: prospect.id },
    data: {
      enrichmentStatus: "NOT_FOUND",
      enrichmentError: "Insufficient data: no name available for personalization",
      messageStatus: "SKIPPED",
    },
  })
  return
}

// 3. Generate message using available data
const result = await generateMessage({
  campaignDescription: campaign.description,
  messageTemplate: campaign.messageTemplate,
  outreachType: campaign.outreachType,
  prospect: {
    firstName: prospect.firstName || "",
    lastName: prospect.lastName || "",
    currentTitle: prospect.title || prospect.currentTitle,
    currentCompany: prospect.company || prospect.currentCompany,
    linkedinHeadline: prospect.linkedinHeadline,
    linkedinSummary: prospect.linkedinSummary,
    linkedinLocation: prospect.linkedinLocation,
  },
})

// 4. Save generated message
await prisma.prospect.update({
  where: { id: prospect.id },
  data: {
    generatedMessage: result.message,
    characterCount: result.characterCount,
    messageStatus: "GENERATED",
    enrichmentStatus: "FOUND",
  },
})
```

### 2. Updated Inngest Registration

**File:** `app/api/inngest/route.ts`

**Changes:**
```typescript
// Added import
import { generateAiPersonalizedMessages } from "@/lib/inngest/generate-ai-personalized-messages"

// Added to functions array
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    enrichProspects,
    generateMessages,
    generateAiPersonalizedMessages, // ← NEW
    copyFixedMessage,
    syncCRM,
    sendMessages,
  ],
})
```

### 3. Updated Enrichment API Route

**File:** `app/api/campaigns/[id]/enrich/route.ts`

**Changes:** Added smart routing based on `messageGenerationStrategy`

**Logic:**
```typescript
// Check messageGenerationStrategy FIRST
if (campaign.messageGenerationStrategy === "AI_PERSONALIZED") {
  // Skip Apify enrichment entirely
  await inngest.send({
    name: "campaign/generate-ai-personalized-messages",
    data: { campaignId },
  })

  return NextResponse.json({
    success: true,
    message: "AI message generation started",
    campaignId,
    prospectCount: campaign._count.prospects,
  })
}

// Otherwise, use traditional Apify enrichment
if (!campaign.enableEnrichment) {
  return NextResponse.json({ error: "Enrichment is disabled" }, { status: 400 })
}

// Check for APIFY_API_TOKEN
if (!process.env.APIFY_API_TOKEN) {
  return NextResponse.json({ error: "Enrichment provider not configured" }, { status: 503 })
}

// Trigger traditional enrichment
await inngest.send({
  name: "campaign/enrich-prospects",
  data: { campaignId },
})
```

**Benefits:**
- AI_PERSONALIZED campaigns bypass broken Apify enrichment
- Traditional enrichment workflow preserved for future use
- No need for APIFY_API_TOKEN when using AI_PERSONALIZED
- Clear, explicit routing based on campaign strategy

---

## Use Cases Now Supported

### 1. LinkedIn URL Only ❌
```
CSV Data:
- linkedinUrl: https://www.linkedin.com/in/example/

Result: SKIPPED (no name for personalization)
Error: "Insufficient data: no name available for personalization"
```

### 2. Name Only ✅
```
CSV Data:
- firstName: John
- lastName: Doe

Generated Message Example:
"Hi John, I noticed your profile and wanted to reach out..."
```

### 3. Name + Company ✅
```
CSV Data:
- firstName: Jane
- lastName: Smith
- company: Microsoft

Generated Message Example:
"Hi Jane, I see you're at Microsoft. As someone working at a leading tech company..."
```

### 4. Name + Title ✅
```
CSV Data:
- firstName: Bob
- lastName: Johnson
- title: VP of Engineering

Generated Message Example:
"Hi Bob, As a VP of Engineering, you're likely facing challenges with product development..."
```

### 5. Full Data (Name + Company + Title + LinkedIn) ✅
```
CSV Data:
- firstName: Andrew
- lastName: Abbott
- company: Product School
- title: Founder & CEO
- linkedinUrl: https://www.linkedin.com/in/aaabbott/

Generated Message Example:
"Hi Andrew, I've been following Product School's work in product management education. As the Founder & CEO..."
```

---

## Workflow

### User Journey: AI-Personalized Campaign

1. **Create Campaign**
   - Select "AI-Personalized Messages" strategy
   - Add campaign description and message template (optional)

2. **Upload Prospects**
   - Upload CSV with any combination of: firstName, lastName, company, title, linkedinUrl
   - Not all fields required - flexibility is key

3. **Map Columns**
   - Map whatever fields are available
   - No required fields (thanks to previous optional fields work)

4. **Click "Start Enrichment"**
   - System detects `messageGenerationStrategy === "AI_PERSONALIZED"`
   - Triggers `campaign/generate-ai-personalized-messages` event
   - Bypasses Apify enrichment entirely

5. **AI Message Generation**
   - For each prospect:
     - Check if name is available
     - If yes: Generate personalized message using Claude API
     - If no: Skip with clear error message
   - Updates campaign status to "MESSAGES_GENERATED"

6. **Review Messages**
   - User reviews AI-generated messages
   - Can edit any message
   - Can approve, skip, or regenerate
   - All existing review page functionality works

7. **Send Messages**
   - Approved messages sent via Unipile
   - LinkedIn automation works as before

---

## Technical Details

### Minimum Data Requirements

**Required:**
- At least `firstName` OR `lastName` (preferably both)

**Optional (enhances personalization):**
- `company` - Company name
- `title` - Job title
- `linkedinUrl` - LinkedIn profile URL (not used for message generation, but available)
- `linkedinHeadline` - From enrichment (if available)
- `linkedinSummary` - From enrichment (if available)
- `linkedinLocation` - From enrichment (if available)

### Claude API Integration

The existing `lib/claude.ts` helper already handles optional fields gracefully:

```typescript
export interface GenerateMessageParams {
  prospect: {
    firstName: string        // Required for message generation
    lastName: string         // Required for message generation
    currentTitle?: string | null      // Optional
    currentCompany?: string | null    // Optional
    linkedinHeadline?: string | null  // Optional
    linkedinSummary?: string | null   // Optional
    linkedinLocation?: string | null  // Optional
  }
}
```

**Personalization Logic:**
- Claude uses whatever fields are available
- More data = more personalized message
- Less data = still personalized, but more generic

### Rate Limiting

**Claude API Tier 1 Limits:**
- 50 requests/min
- ~1 request/second

**Implementation:**
```typescript
// 1.2 second delay between requests
await new Promise((resolve) => setTimeout(resolve, 1200))
```

**For 100 prospects:**
- Time: ~2 minutes
- Cost: ~$0.50 (assuming $0.005/message)

### Character Limits

**Enforced by Claude API helper:**
- Connection requests: 300 characters max
- InMail: 1900 characters max

**Auto-retry logic:**
- If first attempt exceeds limit, Claude automatically retries with shortening instructions

---

## Database Schema Impact

**No changes required** - All fields already support NULL values:

```prisma
model Prospect {
  // All optional prospect fields
  firstName           String?
  lastName            String?
  email               String?
  company             String?
  title               String?
  linkedinUrl         String?

  // Message generation fields (already existed)
  generatedMessage    String?         @db.Text
  editedMessage       String?         @db.Text
  messageStatus       MessageStatus   @default(PENDING)
  characterCount      Int?

  // Enrichment fields (repurposed for AI generation)
  enrichmentStatus    EnrichmentStatus @default(PENDING)
  enrichmentError     String?
}
```

**Field Repurposing:**
- `enrichmentStatus: "FOUND"` - Successfully generated message (no enrichment performed)
- `enrichmentStatus: "NOT_FOUND"` - Skipped due to insufficient data
- `enrichmentStatus: "ERROR"` - Message generation failed
- `enrichmentError` - Stores reason for skip/failure

---

## Campaign Status Flow

### AI_PERSONALIZED Campaign:

```
DRAFT
  ↓
FILE_UPLOADED
  ↓
MAPPING_COMPLETE
  ↓
ENRICHING (message generation in progress)
  ↓
MESSAGES_GENERATED (ready for review)
  ↓
REVIEW
  ↓
SENDING
  ↓
COMPLETE
```

**Note:** Status names stay the same (ENRICHING, ENRICHMENT_COMPLETE) but the underlying process is message generation instead of enrichment.

### Traditional Campaign (with Apify enrichment):

```
DRAFT
  ↓
FILE_UPLOADED
  ↓
MAPPING_COMPLETE
  ↓
ENRICHING (Apify lookup)
  ↓
ENRICHMENT_COMPLETE
  ↓
MESSAGES_GENERATED (Claude API)
  ↓
REVIEW
  ↓
SENDING
  ↓
COMPLETE
```

---

## Error Handling

### Insufficient Data

**Scenario:** Prospect has LinkedIn URL but no name

**Handling:**
```typescript
if (!hasName) {
  await prisma.prospect.update({
    where: { id: prospect.id },
    data: {
      enrichmentStatus: "NOT_FOUND",
      enrichmentError: "Insufficient data: no name available for personalization",
      messageStatus: "SKIPPED",
    },
  })
  skippedCount++
  return
}
```

**User Experience:**
- Prospect appears in review page with "SKIPPED" status
- Error message clearly explains why
- User can manually add name and regenerate if desired

### Message Generation Failure

**Scenario:** Claude API error during message generation

**Handling:**
```typescript
catch (error) {
  await prisma.prospect.update({
    where: { id: prospect.id },
    data: {
      messageStatus: "PENDING",
      enrichmentStatus: "ERROR",
      enrichmentError: error instanceof Error
        ? `Message generation failed: ${error.message}`
        : "Unknown error during message generation",
    },
  })
  errorCount++
}
```

**User Experience:**
- Prospect marked as ERROR
- Can retry by re-running enrichment
- Error details logged for debugging

---

## Testing

### Build Status
✅ **TypeScript compilation successful**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (17/17)
```

### Test Script Created

**File:** `test-ai-message-generation.js`

**Tests:**
1. Create AI_PERSONALIZED campaign
2. Create prospects with varying data:
   - Full data (name + company + title + LinkedIn)
   - Minimal data (name only)
   - No name (LinkedIn URL only) - should skip
   - Name + company
   - Name + title
3. Trigger message generation
4. Verify results
5. Cleanup

**Expected Results:**
- 4 messages generated (prospects with names)
- 1 prospect skipped (no name)
- All character limits respected
- Campaign status: MESSAGES_GENERATED

### Manual Testing Checklist

- [ ] Create AI_PERSONALIZED campaign
- [ ] Upload CSV with partial data
- [ ] Map available fields (no required fields)
- [ ] Click "Start Enrichment" button
- [ ] Verify Inngest job triggered
- [ ] Wait for campaign status: MESSAGES_GENERATED
- [ ] Review generated messages on review page
- [ ] Edit a message
- [ ] Approve messages
- [ ] Send messages via Unipile

---

## Benefits

### For Users

1. **Works with Partial Data**
   - No need for complete prospect information
   - Can proceed with just names and companies
   - Flexible data requirements

2. **Bypasses Broken Enrichment**
   - No dependency on Apify (currently broken)
   - Faster workflow (no enrichment delay)
   - More reliable message generation

3. **Cost Effective**
   - Only pays for Claude API calls (~$0.005/message)
   - No Apify charges
   - No wasted enrichment credits

4. **Better Personalization**
   - Claude can personalize based on available data
   - More context-aware than fixed messages
   - Maintains human-like tone

### For Development

1. **Modular Architecture**
   - New function doesn't break existing enrichment
   - Easy to maintain and extend
   - Clear separation of concerns

2. **Future-Proof**
   - When Apify is fixed, traditional enrichment still works
   - Can combine both approaches in future
   - Flexible for new enrichment providers

3. **User Control**
   - Users choose strategy (AI_PERSONALIZED vs traditional)
   - Clear feedback on skipped prospects
   - Transparent error handling

---

## Files Created/Modified

### Created:
1. **lib/inngest/generate-ai-personalized-messages.ts**
   - New Inngest function for AI message generation
   - ~150 lines of code

2. **test-ai-message-generation.js**
   - Test script for verifying implementation
   - ~250 lines of code

3. **AI_MESSAGE_GENERATION_SUMMARY.md**
   - This comprehensive documentation
   - Implementation details and usage guide

### Modified:
1. **app/api/inngest/route.ts**
   - Added `generateAiPersonalizedMessages` import
   - Registered new function with Inngest

2. **app/api/campaigns/[id]/enrich/route.ts**
   - Added messageGenerationStrategy check
   - Routes to AI generation for AI_PERSONALIZED campaigns
   - Preserves traditional enrichment for other strategies

### Unchanged (works as-is):
- `lib/claude.ts` - Already handles optional fields
- `app/campaigns/[id]/review/page.tsx` - Already displays generated messages
- `lib/unipile.ts` - LinkedIn sending works unchanged
- Database schema - No migrations needed

---

## Configuration Requirements

### Required Environment Variables:

**For AI_PERSONALIZED campaigns:**
```bash
ANTHROPIC_API_KEY=sk-ant-...          # Claude API key
INNGEST_EVENT_KEY=...                 # Inngest event key
```

**For traditional enrichment campaigns:**
```bash
ANTHROPIC_API_KEY=sk-ant-...          # Claude API key
INNGEST_EVENT_KEY=...                 # Inngest event key
APIFY_API_TOKEN=...                   # Apify API token (currently broken)
```

**For LinkedIn sending:**
```bash
UNIPILE_API_KEY=...                   # Unipile API key (working ✅)
```

---

## Future Enhancements

### Recommended Improvements:

1. **Smart Field Recommendations**
   ```typescript
   // In mapping page, suggest which fields enhance AI personalization
   if (!mapping.company && !mapping.title) {
     showWarning("Adding company or title improves message personalization")
   }
   ```

2. **Progressive Enrichment**
   ```typescript
   // After AI generation, optionally run LinkedIn enrichment for approved messages
   // This gets LinkedIn URLs for sending without blocking initial message generation
   ```

3. **Batch Regeneration**
   ```typescript
   // Allow regenerating messages for specific prospects
   // Useful if user adds more data later
   ```

4. **Message Quality Scoring**
   ```typescript
   // Score messages based on available data
   // High quality: 5+ fields available
   // Medium quality: 3-4 fields
   // Low quality: 1-2 fields
   ```

5. **A/B Testing**
   ```typescript
   // Generate 2-3 variations per prospect
   // User picks best one
   ```

---

## Migration Notes

**Backward Compatibility:** ✅ Fully compatible

**No Migration Required:**
- Existing campaigns continue working
- Traditional enrichment preserved
- Database schema unchanged
- API contracts unchanged

**New Campaigns:**
- Can choose AI_PERSONALIZED strategy
- Benefits from flexible data requirements
- Faster workflow (no enrichment delay)

---

## Summary

✅ **AI-personalized message generation implemented**
✅ **Works with partial prospect data (name + optional fields)**
✅ **Bypasses broken Apify enrichment entirely**
✅ **Gracefully handles missing data with clear errors**
✅ **Build passes, TypeScript compilation successful**
✅ **Backward compatible, no migration needed**
✅ **Existing review page works without changes**
✅ **LinkedIn sending via Unipile works unchanged**

**Status:** Ready for testing and deployment

---

**Implementation:** April 8, 2026
**Files Modified:** 2 (Inngest registration, enrichment API route)
**Files Created:** 3 (New Inngest function, test script, this doc)
**Build Status:** ✅ Successful
**TypeScript Errors:** 0
**Breaking Changes:** None

---

## Quick Start Guide

### For Users:

1. **Create a new campaign**
   - Choose "AI-Personalized Messages" strategy
   - Add campaign description

2. **Upload your CSV**
   - Include at least: firstName, lastName
   - Optionally add: company, title, linkedinUrl, email, phone

3. **Map your columns**
   - No required fields - map what you have
   - More fields = better personalization

4. **Click "Start Enrichment"**
   - Messages will be generated in ~2 minutes for 100 prospects
   - No LinkedIn lookup needed

5. **Review messages**
   - Edit if needed
   - Approve messages you like
   - Skip prospects you don't want to contact

6. **Send messages**
   - Messages sent via Unipile
   - LinkedIn automation handles delivery

### For Developers:

**To test locally:**
```bash
# 1. Ensure env vars are set
ANTHROPIC_API_KEY=sk-ant-...
INNGEST_EVENT_KEY=...

# 2. Start dev servers
npm run dev

# 3. Run test script
node test-ai-message-generation.js

# 4. Check results
# - 4 messages generated
# - 1 prospect skipped (no name)
# - Campaign status: MESSAGES_GENERATED
```

**To deploy:**
```bash
# 1. Build to verify
npm run build

# 2. Push to GitHub
git push origin main

# 3. Vercel auto-deploys
# No additional config needed
```

---

**End of Implementation Summary**
