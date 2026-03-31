import { inngest } from "./client"
import { prisma } from "@/lib/prisma"
import { searchPerson, getLinkedInProfile, delay } from "@/lib/proxycurl"
import {
  calculateConfidenceScore,
  validateEmployment,
  extractLocation,
  determineEnrichmentStatus,
  companiesMatch,
  titlesMatch,
} from "@/lib/enrichment"

export const enrichProspects = inngest.createFunction(
  {
    id: "campaign-enrich-prospects",
    name: "Enrich Campaign Prospects",
    concurrency: {
      limit: 1, // Process one campaign at a time to respect rate limits
    },
    retries: 3,
  },
  { event: "campaign/enrich-prospects" },
  async ({ event, step }) => {
    const { campaignId } = event.data

    // Get campaign and prospects
    const campaign = await step.run("fetch-campaign", async () => {
      return prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          prospects: {
            where: {
              enrichmentStatus: "PENDING",
            },
          },
        },
      })
    })

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    if (campaign.prospects.length === 0) {
      return { message: "No pending prospects to enrich" }
    }

    // Update campaign status to ENRICHING
    await step.run("update-campaign-status", async () => {
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "ENRICHING" },
      })
    })

    let enrichedCount = 0
    let foundCount = 0
    let notFoundCount = 0
    let staleCount = 0
    let errorCount = 0

    // Process each prospect with rate limiting
    for (const prospect of campaign.prospects) {
      await step.run(`enrich-prospect-${prospect.id}`, async () => {
        try {
          // Mark as processing
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: { enrichmentStatus: "PROCESSING" },
          })

          // Search for the person on LinkedIn
          const searchResult = await searchPerson({
            first_name: prospect.firstName!,
            last_name: prospect.lastName!,
            company_name: prospect.company || undefined,
            title: prospect.title || undefined,
            email: prospect.email || undefined,
          })

          // If no LinkedIn profile found
          if (!searchResult || !searchResult.url) {
            await prisma.prospect.update({
              where: { id: prospect.id },
              data: {
                enrichmentStatus: "NOT_FOUND",
                enrichmentError: "Could not find LinkedIn profile",
                enrichedAt: new Date(),
              },
            })
            notFoundCount++
            return
          }

          // Get full profile data
          const profile = await getLinkedInProfile(searchResult.url)

          if (!profile) {
            await prisma.prospect.update({
              where: { id: prospect.id },
              data: {
                enrichmentStatus: "NOT_FOUND",
                enrichmentError: "LinkedIn profile not accessible",
                enrichedAt: new Date(),
              },
            })
            notFoundCount++
            return
          }

          // Validate employment
          const employment = validateEmployment(profile, prospect.company!)

          // Calculate confidence score
          const confidenceScore = calculateConfidenceScore({
            nameSimilarity: searchResult.name_similarity_score,
            emailMatch: prospect.email
              ? profile.public_identifier.includes(prospect.email.split("@")[0])
              : false,
            companyMatch: employment.isCurrentEmployee,
            titleMatch: prospect.title && employment.currentTitle
              ? titlesMatch(prospect.title, employment.currentTitle)
              : false,
          })

          // Determine final status
          const enrichmentStatus = determineEnrichmentStatus(
            true,
            employment.isCurrentEmployee,
            confidenceScore
          )

          // Update prospect with enrichment data
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              enrichmentStatus,
              enrichmentConfidence: confidenceScore,
              linkedinUrl: searchResult.url,
              linkedinHeadline: profile.headline,
              linkedinSummary: profile.summary,
              linkedinLocation: extractLocation(profile),
              currentCompany: employment.currentCompany,
              currentTitle: employment.currentTitle,
              profileImageUrl: profile.profile_pic_url,
              linkedinProviderId: profile.public_identifier,
              enrichedAt: new Date(),
            },
          })

          enrichedCount++
          if (enrichmentStatus === "FOUND") foundCount++
          if (enrichmentStatus === "STALE") staleCount++
        } catch (error) {
          console.error(`Error enriching prospect ${prospect.id}:`, error)

          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              enrichmentStatus: "ERROR",
              enrichmentError:
                error instanceof Error ? error.message : "Unknown error",
              enrichedAt: new Date(),
            },
          })

          errorCount++
        }

        // Rate limiting: wait 1 second between requests to respect Proxycurl limits
        // Proxycurl standard plan: ~300 req/min = 1 req every 200ms, but we'll be conservative
        await delay(1000)
      })
    }

    // Update campaign status to ENRICHMENT_COMPLETE
    await step.run("complete-enrichment", async () => {
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "ENRICHMENT_COMPLETE" },
      })
    })

    return {
      campaignId,
      totalProcessed: campaign.prospects.length,
      enrichedCount,
      foundCount,
      notFoundCount,
      staleCount,
      errorCount,
    }
  }
)
