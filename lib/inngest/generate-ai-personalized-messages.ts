import { inngest } from "./client"
import { prisma } from "@/lib/prisma"
import { generateMessage } from "@/lib/claude"

/**
 * Generate AI-personalized messages for prospects without requiring enrichment.
 *
 * This function is used for AI_PERSONALIZED campaigns and generates unique messages
 * based on whatever prospect data is available (firstName, lastName, company, title,
 * linkedinUrl, etc.) without requiring LinkedIn enrichment via Apify.
 *
 * Unlike the standard message generation flow which requires enrichmentStatus: "FOUND",
 * this function works with partial data and skips enrichment entirely.
 */
export const generateAiPersonalizedMessages = inngest.createFunction(
  {
    id: "campaign-generate-ai-personalized-messages",
    name: "Generate AI-Personalized Messages",
    concurrency: {
      limit: 1, // Process one campaign at a time to respect Claude API rate limits
    },
    retries: 3,
  },
  { event: "campaign/generate-ai-personalized-messages" },
  async ({ event, step }) => {
    const { campaignId } = event.data

    // Get campaign and ALL prospects that haven't been processed yet
    const campaign = await step.run("fetch-campaign", async () => {
      return prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          prospects: {
            where: {
              messageStatus: "PENDING",
            },
          },
        },
      })
    })

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    if (campaign.prospects.length === 0) {
      return { message: "No prospects to generate messages for" }
    }

    // Verify this is an AI_PERSONALIZED campaign
    if (campaign.messageGenerationStrategy !== "AI_PERSONALIZED") {
      throw new Error(
        `Campaign ${campaignId} is not using AI_PERSONALIZED strategy (found: ${campaign.messageGenerationStrategy})`
      )
    }

    // Update campaign status to ENRICHING (repurposing this status for message generation)
    await step.run("update-campaign-status-start", async () => {
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "ENRICHING" },
      })
    })

    let generatedCount = 0
    let skippedCount = 0
    let errorCount = 0
    let retriedCount = 0

    // Process each prospect
    for (const prospect of campaign.prospects) {
      await step.run(`generate-message-${prospect.id}`, async () => {
        try {
          // Check if we have enough data to generate a message
          // At minimum, we need a name (or at least firstName/lastName)
          const hasName = prospect.firstName || prospect.lastName

          if (!hasName) {
            // Skip prospects without any name data
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

          // Generate message using whatever data we have
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

          // Update prospect with generated message
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              generatedMessage: result.message,
              characterCount: result.characterCount,
              messageStatus: "GENERATED",
              enrichmentStatus: "FOUND", // Mark as "found" since we successfully generated a message
            },
          })

          generatedCount++
          if (result.wasRetried) {
            retriedCount++
          }
        } catch (error) {
          console.error(
            `Error generating message for prospect ${prospect.id}:`,
            error
          )

          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              messageStatus: "PENDING",
              enrichmentStatus: "ERROR",
              enrichmentError:
                error instanceof Error
                  ? `Message generation failed: ${error.message}`
                  : "Unknown error during message generation",
            },
          })

          errorCount++
        }

        // Small delay to respect Claude API rate limits
        // Tier 1: 50 requests/min = ~1 req/sec
        await new Promise((resolve) => setTimeout(resolve, 1200))
      })
    }

    // Update campaign status to MESSAGES_GENERATED
    await step.run("update-campaign-status-complete", async () => {
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "MESSAGES_GENERATED" },
      })
    })

    return {
      campaignId,
      totalProcessed: campaign.prospects.length,
      generatedCount,
      skippedCount,
      errorCount,
      retriedCount,
    }
  }
)
