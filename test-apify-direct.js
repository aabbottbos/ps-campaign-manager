// Direct API call to see what's happening
const APIFY_API_TOKEN = "***REDACTED_APIFY_TOKEN***"

async function test() {
  console.log("Sending this input:")
  const input = {
    firstName: "Andrew",
    lastName: "Abbott", 
    company: "Product School",
    email: ""
  }
  console.log(JSON.stringify(input, null, 2))
  
  const response = await fetch(
    `https://api.apify.com/v2/acts/ryanclinton~person-enrichment-lookup/runs?token=${APIFY_API_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    }
  )
  
  const data = await response.json()
  console.log("\nActor created with ID:", data.data.id)
  console.log("\nFull response:")
  console.log(JSON.stringify(data, null, 2))
}

test()
