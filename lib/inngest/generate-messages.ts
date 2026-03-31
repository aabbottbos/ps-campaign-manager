import { inngest } from "./client"
import { prisma } from "@/lib/prisma"
import { generateMessage } from "@/lib/claude"

export const generateMessages = inngest.createFunction(
  {
    id: "campaign-generate-messages",
    name: "Generate Campaign Messages",
    concurrency: {
      limit: 1, // Process one campaign at a time to respect Claude API rate limits
    },
    retries: 3,
  },
  { event: "campaign/generate-messages" },
  async ({ event, step }) => {
    const { campaignId } = event.data

    // Get campaign and prospects
    const campaign = await step.run("fetch-campaign", async () => {
      return prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          prospects: {
            where: {
              enrichmentStatus: "FOUND",
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

    // Update campaign status
    await step.run("update-campaign-status", async () => {
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "MESSAGES_GENERATED" }, // Set to final status optimistically
      })
    })

    let generatedCount = 0
    let errorCount = 0
    let retriedCount = 0

    // Process each prospect
    for (const prospect of campaign.prospects) {
      await step.run(`generate-message-${prospect.id}`, async () => {
        try {
          const result = await generateMessage({
            campaignDescription: campaign.description,
            messageTemplate: campaign.messageTemplate,
            outreachType: campaign.outreachType,
            prospect: {
              firstName: prospect.firstName!,
              lastName: prospect.lastName!,
              currentTitle: prospect.currentTitle,
              currentCompany: prospect.currentCompany,
              linkedinHeadline: prospect.linkedinHeadline,
              linkedinSummary: prospect.linkedinSummary,
              linkedinLocation: prospect.linkedinLocation,
            },
          })

          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              generatedMessage: result.message,
              characterCount: result.characterCount,
              messageStatus: "GENERATED",
            },
          })

          generatedCount++
          if (result.wasRetried) {
            retriedCount++
          }
        } catch (error) {
          console.error(`Error generating message for prospect ${prospect.id}:`, error)

          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              messageStatus: "PENDING",
              // Could store error in a field if needed
            },
          })

          errorCount++
        }

        // Small delay to respect Claude API rate limits
        // Tier 1: 50 requests/min = ~1 req/sec
        await new Promise((resolve) => setTimeout(resolve, 1200))
      })
    }

    return {
      campaignId,
      totalProcessed: campaign.prospects.length,
      generatedCount,
      errorCount,
      retriedCount,
    }
  }
)
