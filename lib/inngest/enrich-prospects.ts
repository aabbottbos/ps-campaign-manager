import { inngest } from "./client"
import { prisma } from "@/lib/prisma"
import { enrichPerson, delay } from "@/lib/enrichment-provider"
import {
  validateEmployment,
  determineEnrichmentStatus,
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

          // Enrich person using Apify
          const enrichmentResult = await enrichPerson({
            firstName: prospect.firstName!,
            lastName: prospect.lastName!,
            company: prospect.company!,
            email: prospect.email || undefined,
          })

          // If no match found or confidence too low
          if (!enrichmentResult) {
            await prisma.prospect.update({
              where: { id: prospect.id },
              data: {
                enrichmentStatus: "NOT_FOUND",
                enrichmentError: "Could not find LinkedIn profile or confidence too low",
                enrichedAt: new Date(),
              },
            })
            notFoundCount++
            return
          }

          // Validate employment (check if still at the company)
          const employment = validateEmployment(
            {
              experiences: enrichmentResult.currentCompany
                ? [
                    {
                      company: enrichmentResult.currentCompany,
                      title: enrichmentResult.currentTitle,
                      ends_at: null, // Assume current if returned by Apify
                    },
                  ]
                : [],
            } as any,
            prospect.company!
          )

          // Determine final status using existing logic
          const enrichmentStatus = determineEnrichmentStatus(
            true, // profileFound
            employment.isCurrentEmployee,
            enrichmentResult.confidenceScore
          )

          // Update prospect with enrichment data
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              enrichmentStatus,
              enrichmentConfidence: enrichmentResult.confidenceScore,
              linkedinUrl: enrichmentResult.linkedinUrl,
              linkedinHeadline: enrichmentResult.linkedinHeadline,
              linkedinSummary: enrichmentResult.linkedinSummary,
              linkedinLocation: enrichmentResult.linkedinLocation,
              currentCompany: enrichmentResult.currentCompany,
              currentTitle: enrichmentResult.currentTitle,
              linkedinProviderId: enrichmentResult.linkedinProviderId,
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

        // Rate limiting: wait between requests to respect Apify Actor limits
        // Apify Actors can take 2-10 seconds to run, so no additional delay needed
        // The Actor polling already provides natural rate limiting
        await delay(100)
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
