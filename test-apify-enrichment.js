/**
 * Standalone test script for Apify enrichment
 * Usage: node test-apify-enrichment.js
 *
 * Edit the TEST_CASES array below to test different people
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || "***REDACTED_APIFY_TOKEN***"
const APIFY_ACTOR_ID = "ryanclinton~person-enrichment-lookup"

// Edit these test cases to try different people
const TEST_CASES = [
  {
    firstName: "Andrew",
    lastName: "Abbott",
    company: "Product School",
    email: undefined,
  },
  // Add more test cases here:
  // {
  //   firstName: "Your",
  //   lastName: "Test",
  //   company: "Company Name",
  //   email: "optional@email.com",
  // },
]

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function testEnrichment(input) {
  console.log("\n" + "=".repeat(80))
  console.log("Testing enrichment for:", input)
  console.log("=".repeat(80))

  try {
    // Start the Actor run
    console.log("\n[1] Starting Actor run...")
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      throw new Error(`Actor start failed: ${runResponse.status} ${errorText}`)
    }

    const runData = await runResponse.json()
    const runId = runData.data.id
    console.log("✓ Actor run started with ID:", runId)

    // Wait for completion
    console.log("\n[2] Waiting for Actor to complete...")
    let runStatus = runData.data.status
    let attempts = 0
    const maxAttempts = 60

    while (runStatus !== "SUCCEEDED" && runStatus !== "FAILED" && attempts < maxAttempts) {
      await delay(2000)
      attempts++

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      )

      if (!statusResponse.ok) {
        throw new Error(`Failed to check status: ${statusResponse.status}`)
      }

      const statusData = await statusResponse.json()
      runStatus = statusData.data.status

      if (attempts % 5 === 0) {
        console.log(`  Status check (attempt ${attempts}): ${runStatus}`)
      }
    }

    if (runStatus !== "SUCCEEDED") {
      throw new Error(`Actor run ${runStatus === "FAILED" ? "failed" : "timed out"}`)
    }

    console.log("✓ Actor completed successfully")

    // Get results
    console.log("\n[3] Fetching results...")
    const datasetId = runData.data.defaultDatasetId
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
    )

    if (!datasetResponse.ok) {
      throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`)
    }

    const datasetItems = await datasetResponse.json()
    console.log("✓ Retrieved", datasetItems.length, "dataset items")

    // Display full results
    console.log("\n[4] FULL DATASET RESPONSE:")
    console.log(JSON.stringify(datasetItems, null, 2))

    // Analyze the result
    console.log("\n[5] ANALYSIS:")
    const enrichmentResult = datasetItems.find(item => item.type !== "summary")

    if (!enrichmentResult) {
      console.log("❌ No enrichment result found (only summary)")
      return
    }

    console.log("Input Name:", enrichmentResult.inputName)
    console.log("Source:", enrichmentResult.source)
    console.log("LinkedIn URL:", enrichmentResult.linkedinUrl)
    console.log("Match Confidence:", enrichmentResult.matchConfidence)
    console.log("Job Title:", enrichmentResult.jobTitle)
    console.log("Company Name:", enrichmentResult.companyName)
    console.log("Location:", enrichmentResult.location)

    if (enrichmentResult.source === "not_found") {
      console.log("\n⚠️  RESULT: NOT FOUND")
      console.log("Reasons this might happen:")
      console.log("  - Person not in LinkedIn database")
      console.log("  - Name/company combination too ambiguous")
      console.log("  - Spelling doesn't match LinkedIn profile")
      console.log("  - Company name doesn't match (try different format)")
    } else if (!enrichmentResult.linkedinUrl) {
      console.log("\n⚠️  RESULT: NO LINKEDIN URL")
    } else if (enrichmentResult.matchConfidence === null || enrichmentResult.matchConfidence < 20) {
      console.log("\n⚠️  RESULT: LOW CONFIDENCE")
      console.log(`Confidence: ${enrichmentResult.matchConfidence}% (threshold: 20%)`)
    } else {
      console.log("\n✅ RESULT: FOUND")
      console.log(`Confidence: ${enrichmentResult.matchConfidence}%`)
    }

  } catch (error) {
    console.error("\n❌ ERROR:", error.message)
  }
}

async function runTests() {
  console.log("Apify Enrichment Test Suite")
  console.log("Using Actor ID:", APIFY_ACTOR_ID)
  console.log("API Token:", APIFY_API_TOKEN ? "✓ Set" : "❌ Missing")

  if (!APIFY_API_TOKEN) {
    console.error("Please set APIFY_API_TOKEN environment variable")
    process.exit(1)
  }

  for (const testCase of TEST_CASES) {
    await testEnrichment(testCase)
    if (TEST_CASES.indexOf(testCase) < TEST_CASES.length - 1) {
      console.log("\nWaiting 2 seconds before next test...")
      await delay(2000)
    }
  }

  console.log("\n" + "=".repeat(80))
  console.log("All tests complete!")
  console.log("=".repeat(80))
}

runTests()
