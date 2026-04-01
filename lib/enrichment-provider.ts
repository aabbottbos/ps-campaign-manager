const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN!
const APIFY_ACTOR_ID = "ryanclinton~person-enrichment-lookup" // API v2 uses ~ separator

export interface EnrichmentInput {
  firstName: string
  lastName: string
  company: string
  email?: string
}

export interface EnrichmentResult {
  linkedinUrl: string
  linkedinHeadline?: string
  linkedinSummary?: string
  currentTitle?: string
  currentCompany?: string
  linkedinLocation?: string
  confidenceScore: number
  linkedinProviderId: string
}

interface ApifyEnrichmentResult {
  inputName?: string
  inputEmail?: string | null
  inputCompany?: string
  fullName?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  jobTitle?: string | null
  companyName?: string | null
  linkedinUrl?: string | null
  location?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  matchConfidence?: number | null
  source?: string
  type?: string
}

interface ApifySummary {
  type: "summary"
  totalProcessed: number
  enrichedCount: number
  notFoundCount: number
}

/**
 * Enrich a person using Apify's person-enrichment-lookup Actor
 * Apify Actor: https://apify.com/ryanclinton/person-enrichment-lookup
 */
export async function enrichPerson(
  input: EnrichmentInput
): Promise<EnrichmentResult | null> {
  console.log("[Apify] Starting enrichment for:", {
    firstName: input.firstName,
    lastName: input.lastName,
    company: input.company,
    email: input.email ? "provided" : "not provided",
  })

  try {
    // Step 1: Start the Actor run
    // The Actor expects a "persons" array with objects containing "name" and "company"
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          persons: [
            {
              name: `${input.firstName} ${input.lastName}`,
              company: input.company,
              email: input.email || undefined,
            },
          ],
        }),
      }
    )

    console.log("[Apify] Actor start response status:", runResponse.status)

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error("[Apify] Actor start failed:", errorText)
      throw new Error(
        `Apify Actor start failed: ${runResponse.status} ${errorText}`
      )
    }

    const runData = await runResponse.json()
    const runId = runData.data.id
    console.log("[Apify] Actor run started with ID:", runId)

    // Step 2: Wait for the Actor run to complete
    let runStatus = runData.data.status
    let attempts = 0
    const maxAttempts = 60 // 60 attempts * 2 seconds = 2 minutes max wait

    console.log("[Apify] Waiting for Actor to complete (initial status:", runStatus, ")")

    while (runStatus !== "SUCCEEDED" && runStatus !== "FAILED" && attempts < maxAttempts) {
      await delay(2000) // Wait 2 seconds between polls
      attempts++

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      )

      if (!statusResponse.ok) {
        throw new Error(`Failed to check Actor run status: ${statusResponse.status}`)
      }

      const statusData = await statusResponse.json()
      runStatus = statusData.data.status

      if (attempts % 5 === 0) {
        console.log(`[Apify] Status check (attempt ${attempts}): ${runStatus}`)
      }
    }

    console.log("[Apify] Actor completed with status:", runStatus)

    if (runStatus === "FAILED") {
      console.error("[Apify] Actor run failed")
      throw new Error("Apify Actor run failed")
    }

    if (runStatus !== "SUCCEEDED") {
      console.error("[Apify] Actor run timed out after", attempts, "attempts")
      throw new Error("Apify Actor run timed out")
    }

    // Step 3: Get the results from the dataset
    const datasetId = runData.data.defaultDatasetId
    console.log("[Apify] Fetching results from dataset:", datasetId)

    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
    )

    if (!datasetResponse.ok) {
      console.error("[Apify] Failed to fetch dataset:", datasetResponse.status)
      throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`)
    }

    const datasetItems: (ApifyEnrichmentResult | ApifySummary)[] = await datasetResponse.json()
    console.log("[Apify] Dataset items received:", datasetItems.length)
    console.log("[Apify] Dataset structure:", JSON.stringify(datasetItems, null, 2))

    // Step 4: Process the results
    if (!datasetItems || datasetItems.length === 0) {
      console.log("[Apify] No dataset items returned")
      return null
    }

    // Find the first enrichment result (skip summary items)
    const enrichmentResult = datasetItems.find(
      (item): item is ApifyEnrichmentResult => item.type !== "summary"
    )

    if (!enrichmentResult) {
      console.log("[Apify] No enrichment result found in dataset")
      return null
    }

    console.log("[Apify] Enrichment result found:", {
      inputName: enrichmentResult.inputName,
      linkedinUrl: enrichmentResult.linkedinUrl,
      matchConfidence: enrichmentResult.matchConfidence,
      source: enrichmentResult.source,
    })

    // Check if person was not found
    if (
      enrichmentResult.source === "not_found" ||
      !enrichmentResult.linkedinUrl ||
      enrichmentResult.matchConfidence === null
    ) {
      console.log("[Apify] Person not found or no LinkedIn URL available")
      return null
    }

    // matchConfidence is on 0-100 scale, convert to 0.0-1.0
    const confidenceScore = enrichmentResult.matchConfidence / 100
    console.log("[Apify] Confidence score (0-1 scale):", confidenceScore)

    // Filter out low-confidence matches (< 0.20, equivalent to < 20 on 0-100 scale)
    if (confidenceScore < 0.2) {
      console.log("[Apify] Match confidence too low (<0.20):", confidenceScore)
      return null
    }

    // Extract publicIdentifier from LinkedIn URL
    // LinkedIn URLs are like: https://www.linkedin.com/in/john-doe-123456/
    let publicIdentifier = ""
    try {
      const urlMatch = enrichmentResult.linkedinUrl.match(/\/in\/([^\/]+)/)
      if (urlMatch) {
        publicIdentifier = urlMatch[1]
      }
    } catch (e) {
      console.warn("[Apify] Could not extract publicIdentifier from LinkedIn URL")
    }

    const result = {
      linkedinUrl: enrichmentResult.linkedinUrl,
      linkedinHeadline: enrichmentResult.jobTitle || undefined,
      linkedinSummary: undefined, // Apify doesn't provide summary
      currentTitle: enrichmentResult.jobTitle || undefined,
      currentCompany: enrichmentResult.companyName || undefined,
      linkedinLocation: enrichmentResult.location || undefined,
      confidenceScore,
      linkedinProviderId: publicIdentifier,
    }

    console.log("[Apify] Enrichment result:", {
      linkedinUrl: result.linkedinUrl,
      confidenceScore: result.confidenceScore,
      currentCompany: result.currentCompany,
      currentTitle: result.currentTitle,
      linkedinProviderId: result.linkedinProviderId,
    })

    return result
  } catch (error) {
    console.error("Apify enrichment error:", error)
    throw error
  }
}

/**
 * Rate limiting helper - simple delay between requests
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
