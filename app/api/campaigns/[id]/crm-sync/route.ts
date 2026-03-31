import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inngest } from "@/lib/inngest/client"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaignId = params.id

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        prospects: {
          where: {
            messageStatus: "APPROVED",
            crmSyncStatus: "NOT_SYNCED",
          },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if campaign has the right status
    if (campaign.status !== "MESSAGES_GENERATED" && campaign.status !== "REVIEW") {
      return NextResponse.json(
        {
          error: `Campaign must have approved messages to sync to CRM. Current status: ${campaign.status}`,
        },
        { status: 400 }
      )
    }

    if (campaign.prospects.length === 0) {
      return NextResponse.json(
        { error: "No approved prospects to sync" },
        { status: 400 }
      )
    }

    // Trigger the Inngest CRM sync job
    await inngest.send({
      name: "campaign/sync-crm",
      data: {
        campaignId,
      },
    })

    return NextResponse.json({
      success: true,
      message: "CRM sync started",
      campaignId,
      prospectCount: campaign.prospects.length,
    })
  } catch (error) {
    console.error("Error starting CRM sync:", error)
    return NextResponse.json(
      { error: "Failed to start CRM sync" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaignId = params.id

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get CRM sync statistics
    const stats = await prisma.prospect.groupBy({
      by: ["crmSyncStatus"],
      where: {
        campaignId,
        messageStatus: "APPROVED",
      },
      _count: true,
    })

    const statusCounts: Record<string, number> = {}
    stats.forEach((stat) => {
      statusCounts[stat.crmSyncStatus] = stat._count
    })

    const total = await prisma.prospect.count({
      where: {
        campaignId,
        messageStatus: "APPROVED",
      },
    })

    return NextResponse.json({
      campaignId,
      campaignStatus: campaign.status,
      total,
      stats: statusCounts,
      notSynced: statusCounts.NOT_SYNCED || 0,
      syncing: statusCounts.SYNCING || 0,
      synced: statusCounts.SYNCED || 0,
      error: statusCounts.ERROR || 0,
    })
  } catch (error) {
    console.error("Error fetching CRM sync stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch CRM sync stats" },
      { status: 500 }
    )
  }
}
