import { inngest } from "./client"
import { prisma } from "@/lib/prisma"
import { sendConnectionRequest, sendInMail } from "@/lib/unipile"
import { logActivity } from "@/lib/salesloft"

/**
 * Send LinkedIn messages via Unipile
 *
 * This job:
 * - Selects prospects with status APPROVED and crmSyncStatus SYNCED
 * - Uses account rotation to distribute sends across LinkedIn accounts
 * - Sends messages with randomized delays (30-90s) to mimic human behavior
 * - Tracks daily send limits per account
 * - Logs activities to SalesLoft
 * - Updates prospect status to SENT or SEND_FAILED
 */
export const sendMessages = inngest.createFunction(
  {
    id: "campaign-send-messages",
    concurrency: {
      limit: 1, // Only one sending job at a time to maintain pacing
    },
    retries: 0, // Don't retry the entire job, handle errors per-prospect
  },
  { event: "campaign/send-messages" },
  async ({ event, step }) => {
    const { campaignId } = event.data

    // Get campaign details
    const campaign = await step.run("get-campaign", async () => {
      return prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          user: {
            include: {
              linkedinAccounts: {
                where: { status: "ACTIVE" },
                orderBy: { lastSendDate: "asc" },
              },
            },
          },
        },
      })
    })

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    // Check if we have any active LinkedIn accounts
    const activeAccounts = campaign.user.linkedinAccounts
    if (activeAccounts.length === 0) {
      throw new Error("No active LinkedIn accounts available for sending")
    }

    // Update campaign status to SENDING
    await step.run("update-campaign-status", async () => {
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "SENDING" },
      })
    })

    // Get all prospects ready to send
    const prospects = await step.run("get-prospects", async () => {
      // For campaigns with CRM sync, require SYNCED status
      // For campaigns without CRM sync, just need APPROVED
      const whereClause = campaign.enableCrmSync
        ? {
            campaignId,
            messageStatus: "APPROVED" as const,
            crmSyncStatus: "SYNCED" as const,
            sendStatus: "NOT_SENT" as const,
          }
        : {
            campaignId,
            messageStatus: "APPROVED" as const,
            sendStatus: "NOT_SENT" as const,
          }

      return prisma.prospect.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
      })
    })

    console.log(`[SEND_MESSAGES] Starting send for campaign ${campaignId}`)
    console.log(`[SEND_MESSAGES] Found ${prospects.length} prospects ready to send`)
    console.log(`[SEND_MESSAGES] Campaign details:`, {
      outreachType: campaign.outreachType,
      enableCrmSync: campaign.enableCrmSync,
      activeAccounts: activeAccounts.length,
    })

    let sentCount = 0
    let failedCount = 0

    // Process each prospect
    for (const prospect of prospects) {
      console.log(`[SEND_MESSAGES] Processing prospect ${prospect.id}:`, {
        name: `${prospect.firstName} ${prospect.lastName}`,
        linkedinUrl: prospect.linkedinUrl,
        hasMessage: !!(prospect.editedMessage || prospect.generatedMessage),
      })
      // Check if campaign is paused
      const currentCampaign = await step.run(`check-campaign-status-${prospect.id}`, async () => {
        return prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { status: true },
        })
      })

      if (currentCampaign?.status === "PAUSED") {
        console.log("Campaign paused, stopping send job")
        break
      }

      // Select LinkedIn account with most available sends today
      const account = await step.run(`select-account-${prospect.id}`, async () => {
        return selectBestAccount(campaign.userId)
      })

      if (!account) {
        console.log("No accounts available with remaining sends, stopping")
        break
      }

      // Send the message
      const result = await step.run(`send-message-${prospect.id}`, async () => {
        const message = prospect.editedMessage || prospect.generatedMessage

        console.log(`[SEND_MESSAGES] Attempting to send to ${prospect.firstName} ${prospect.lastName}`)

        if (!message) {
          console.error(`[SEND_MESSAGES] ERROR: No message available for prospect ${prospect.id}`)
          return { success: false, error: "No message available" }
        }

        if (!prospect.linkedinUrl) {
          console.error(`[SEND_MESSAGES] ERROR: No LinkedIn URL for prospect ${prospect.id}`)
          return { success: false, error: "No LinkedIn URL" }
        }

        console.log(`[SEND_MESSAGES] Sending via Unipile:`, {
          accountId: account.unipileAccountId,
          profileUrl: prospect.linkedinUrl,
          outreachType: campaign.outreachType,
          messageLength: message.length,
        })

        try {
          // Send based on outreach type
          let sendResult
          if (campaign.outreachType === "CONNECT") {
            sendResult = await sendConnectionRequest({
              accountId: account.unipileAccountId,
              profileUrl: prospect.linkedinUrl,
              message,
            })
          } else {
            sendResult = await sendInMail({
              accountId: account.unipileAccountId,
              profileUrl: prospect.linkedinUrl,
              message,
              subject: `Re: ${prospect.company || "Your work"}`,
            })
          }

          console.log(`[SEND_MESSAGES] Unipile response:`, sendResult)
          return sendResult
        } catch (error) {
          console.error(`[SEND_MESSAGES] Exception during send:`, error)
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      })

      console.log(`[SEND_MESSAGES] Send result for ${prospect.id}:`, result)

      // Update prospect status
      await step.run(`update-prospect-${prospect.id}`, async () => {
        const message = prospect.editedMessage || prospect.generatedMessage

        if (result.success) {
          sentCount++

          // Update prospect
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              sendStatus: "SENT",
              sentAt: new Date(),
              unipileMessageId: result.message_id,
            },
          })

          // Increment daily send count
          await incrementDailySendCount(account.id)

          // Log activity to SalesLoft
          if (prospect.salesloftPersonId && message) {
            try {
              await logActivity({
                personId: parseInt(prospect.salesloftPersonId!),
                subject: `LinkedIn ${campaign.outreachType === "CONNECT" ? "Connection Request" : "InMail"} Sent`,
                body: message,
              })
            } catch (error) {
              console.error("Failed to log SalesLoft activity:", error)
            }
          }
        } else {
          failedCount++
          console.error(`[SEND_MESSAGES] Send FAILED for ${prospect.id}:`, result.error)

          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              sendStatus: "FAILED",
              sendError: result.error,
            },
          })
        }
      })

      // Add randomized delay between sends (30-90 seconds)
      if (prospects.indexOf(prospect) < prospects.length - 1) {
        await step.sleep(`delay-${prospect.id}`, Math.floor(Math.random() * 60 + 30) * 1000)
      }
    }

    // Update campaign to COMPLETE if all sent
    const remainingToSend = await step.run("check-remaining", async () => {
      const whereClause = campaign.enableCrmSync
        ? {
            campaignId,
            messageStatus: "APPROVED" as const,
            crmSyncStatus: "SYNCED" as const,
            sendStatus: "NOT_SENT" as const,
          }
        : {
            campaignId,
            messageStatus: "APPROVED" as const,
            sendStatus: "NOT_SENT" as const,
          }

      return prisma.prospect.count({
        where: whereClause,
      })
    })

    if (remainingToSend === 0) {
      await step.run("mark-complete", async () => {
        return prisma.campaign.update({
          where: { id: campaignId },
          data: { status: "COMPLETE" },
        })
      })
    }

    return {
      campaignId,
      sent: sentCount,
      failed: failedCount,
      total: prospects.length,
    }
  }
)

/**
 * Select the best LinkedIn account for sending
 * Prioritizes accounts with the most remaining daily sends
 */
async function selectBestAccount(userId: string) {
  const today = new Date().toISOString().split("T")[0]

  const accounts = await prisma.linkedInAccount.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
  })

  // Calculate remaining sends for each account
  const accountsWithRemaining = accounts.map((account) => {
    const lastSendDate = account.lastSendDate?.toISOString().split("T")[0]
    const isToday = lastSendDate === today
    const usedToday = isToday ? account.dailySendCount : 0
    const remaining = 50 - usedToday // 50 is the daily limit

    return { account, remaining }
  })

  // Filter out accounts at limit
  const available = accountsWithRemaining.filter((a) => a.remaining > 0)

  if (available.length === 0) {
    return null
  }

  // Sort by most remaining sends first
  available.sort((a, b) => b.remaining - a.remaining)

  return available[0].account
}

/**
 * Increment the daily send count for an account
 */
async function incrementDailySendCount(accountId: string) {
  const today = new Date().toISOString().split("T")[0]
  const account = await prisma.linkedInAccount.findUnique({
    where: { id: accountId },
  })

  if (!account) return

  const lastSendDate = account.lastSendDate?.toISOString().split("T")[0]
  const isToday = lastSendDate === today

  if (isToday) {
    // Increment count
    await prisma.linkedInAccount.update({
      where: { id: accountId },
      data: {
        dailySendCount: account.dailySendCount + 1,
        lastSendDate: new Date(),
      },
    })
  } else {
    // Reset count for new day
    await prisma.linkedInAccount.update({
      where: { id: accountId },
      data: {
        dailySendCount: 1,
        lastSendDate: new Date(),
      },
    })
  }
}
