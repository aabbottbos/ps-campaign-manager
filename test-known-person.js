const APIFY_API_TOKEN = "***REDACTED_APIFY_TOKEN***"
const APIFY_ACTOR_ID = "ryanclinton~person-enrichment-lookup"

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function test(name, company) {
  console.log("\n" + "=".repeat(60))
  console.log("Testing: " + name + " at " + company)
  console.log("=".repeat(60))

  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persons: [{ name, company }]
      })
    }
  )

  const runData = await runResponse.json()
  const runId = runData.data.id

  let status = "RUNNING"
  while (status !== "SUCCEEDED" && status !== "FAILED") {
    await delay(2000)
    const statusResp = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
    )
    const statusData = await statusResp.json()
    status = statusData.data.status
  }

  const datasetId = runData.data.defaultDatasetId
  const datasetResp = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
  )
  const items = await datasetResp.json()
  const result = items.find(i => i.type !== "summary")

  if (result.source === "not_found") {
    console.log("❌ NOT FOUND")
  } else {
    console.log("✅ FOUND!")
    console.log("LinkedIn:", result.linkedinUrl)
    console.log("Confidence:", result.matchConfidence)
    console.log("Title:", result.jobTitle)
  }
}

async function run() {
  await test("Satya Nadella", "Microsoft")
  await test("Tim Cook", "Apple")
  await test("Sundar Pichai", "Google")
}

run()
