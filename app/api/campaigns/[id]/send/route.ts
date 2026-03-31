import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inngest } from "@/lib/inngest/client"

/**
 * GET /api/campaigns/[id]/send
 * Get send statistics for a campaign
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Get send statistics
    const total = await prisma.prospect.count({
      where: {
        campaignId: params.id,
        messageStatus: "APPROVED",
        crmSyncStatus: "SYNCED",
      },
    })

    const sent = await prisma.prospect.count({
      where: {
        campaignId: params.id,
        sendStatus: "SENT",
      },
    })

    const failed = await prisma.prospect.count({
      where: {
        campaignId: params.id,
        sendStatus: "FAILED",
      },
    })

    const pending = await prisma.prospect.count({
      where: {
        campaignId: params.id,
        messageStatus: "APPROVED",
        crmSyncStatus: "SYNCED",
        sendStatus: "NOT_SENT",
      },
    })

    // Check if user has any active LinkedIn accounts
    const activeAccounts = await prisma.linkedInAccount.count({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
    })

    return NextResponse.json({
      campaignId: params.id,
      campaignStatus: campaign.status,
      total,
      sent,
      failed,
      pending,
      hasActiveAccounts: activeAccounts > 0,
    })
  } catch (error) {
    console.error("Error fetching send stats:", error)
    return NextResponse.json({ error: "Failed to fetch send stats" }, { status: 500 })
  }
}

/**
 * POST /api/campaigns/[id]/send
 * Start sending messages for a campaign
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Check if campaign is ready to send
    if (campaign.status !== "CRM_SYNCED" && campaign.status !== "PAUSED") {
      return NextResponse.json(
        { error: "Campaign must be in CRM_SYNCED or PAUSED status" },
        { status: 400 }
      )
    }

    // Check if user has active LinkedIn accounts
    const activeAccounts = await prisma.linkedInAccount.count({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
    })

    if (activeAccounts === 0) {
      return NextResponse.json(
        { error: "No active LinkedIn accounts. Please connect a LinkedIn account in Settings." },
        { status: 400 }
      )
    }

    // Check if there are prospects to send
    const pendingCount = await prisma.prospect.count({
      where: {
        campaignId: params.id,
        messageStatus: "APPROVED",
        crmSyncStatus: "SYNCED",
        sendStatus: "NOT_SENT",
      },
    })

    if (pendingCount === 0) {
      return NextResponse.json({ error: "No prospects ready to send" }, { status: 400 })
    }

    // Update campaign status to SENDING
    await prisma.campaign.update({
      where: { id: params.id },
      data: { status: "SENDING" },
    })

    // Trigger Inngest job
    await inngest.send({
      name: "campaign/send-messages",
      data: { campaignId: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error starting send:", error)
    return NextResponse.json({ error: "Failed to start sending" }, { status: 500 })
  }
}

/**
 * PATCH /api/campaigns/[id]/send
 * Pause or resume sending
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()

    if (!["pause", "resume"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (action === "pause") {
      if (campaign.status !== "SENDING") {
        return NextResponse.json({ error: "Campaign is not currently sending" }, { status: 400 })
      }

      await prisma.campaign.update({
        where: { id: params.id },
        data: { status: "PAUSED" },
      })
    } else {
      // resume
      if (campaign.status !== "PAUSED") {
        return NextResponse.json({ error: "Campaign is not paused" }, { status: 400 })
      }

      // Restart the send job
      await prisma.campaign.update({
        where: { id: params.id },
        data: { status: "SENDING" },
      })

      await inngest.send({
        name: "campaign/send-messages",
        data: { campaignId: params.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error pausing/resuming send:", error)
    return NextResponse.json({ error: "Failed to update send status" }, { status: 500 })
  }
}
