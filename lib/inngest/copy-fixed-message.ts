import { inngest } from "./client"
import { prisma } from "@/lib/prisma"

export const copyFixedMessage = inngest.createFunction(
  {
    id: "campaign-copy-fixed-message",
    name: "Copy Fixed Message to Prospects",
    retries: 3,
  },
  { event: "campaign/copy-fixed-message" },
  async ({ event, step }) => {
    const { campaignId } = event.data

    console.log(`[COPY_FIXED_MESSAGE] Starting for campaign ${campaignId}`)

    // Get campaign with fixed message
    const campaign = await step.run("fetch-campaign", async () => {
      const camp = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          prospects: {
            where: { messageStatus: "PENDING" }
          }
        }
      })
      console.log(`[COPY_FIXED_MESSAGE] Campaign found:`, {
        id: camp?.id,
        name: camp?.name,
        messageGenerationStrategy: camp?.messageGenerationStrategy,
        hasFixedMessage: !!camp?.fixedMessage,
        fixedMessageLength: camp?.fixedMessage?.length,
        pendingProspects: camp?.prospects.length,
      })
      return camp
    })

    if (!campaign) {
      console.error(`[COPY_FIXED_MESSAGE] Campaign ${campaignId} not found`)
      throw new Error(`Campaign ${campaignId} not found`)
    }

    if (!campaign.fixedMessage) {
      console.error(`[COPY_FIXED_MESSAGE] Campaign ${campaignId} has no fixed message`)
      throw new Error(`Campaign ${campaignId} has no fixed message`)
    }

    if (campaign.prospects.length === 0) {
      console.log(`[COPY_FIXED_MESSAGE] No prospects to update for campaign ${campaignId}`)
      return { message: "No prospects to update" }
    }

    const characterCount = campaign.fixedMessage.length
    console.log(`[COPY_FIXED_MESSAGE] Copying message (${characterCount} chars) to ${campaign.prospects.length} prospects`)

    // Copy fixed message to all prospects
    // For FIXED_MESSAGE campaigns, auto-approve since user already wrote the message
    const updateResult = await step.run("copy-to-prospects", async () => {
      const result = await prisma.prospect.updateMany({
        where: {
          campaignId,
          messageStatus: "PENDING"
        },
        data: {
          generatedMessage: campaign.fixedMessage,
          characterCount: characterCount,
          messageStatus: "APPROVED"  // Auto-approve for fixed messages
        }
      })
      console.log(`[COPY_FIXED_MESSAGE] Updated ${result.count} prospects to APPROVED status`)
      return result
    })

    // Update campaign status to REVIEW
    await step.run("update-campaign-status", async () => {
      console.log(`[COPY_FIXED_MESSAGE] Updating campaign status to REVIEW`)
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "REVIEW" }
      })
    })

    console.log(`[COPY_FIXED_MESSAGE] Completed for campaign ${campaignId}`)

    return {
      campaignId,
      prospectsUpdated: campaign.prospects.length,
      characterCount
    }
  }
)
