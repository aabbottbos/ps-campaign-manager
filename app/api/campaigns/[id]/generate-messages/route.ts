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
            enrichmentStatus: "FOUND",
            messageStatus: "PENDING",
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

    // Check if campaign is in the right status
    if (campaign.status !== "ENRICHMENT_COMPLETE") {
      return NextResponse.json(
        {
          error: `Campaign must be in ENRICHMENT_COMPLETE status to generate messages. Current status: ${campaign.status}`,
        },
        { status: 400 }
      )
    }

    if (campaign.prospects.length === 0) {
      return NextResponse.json(
        { error: "No prospects available for message generation" },
        { status: 400 }
      )
    }

    // Trigger the Inngest message generation job
    await inngest.send({
      name: "campaign/generate-messages",
      data: {
        campaignId,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Message generation started",
      campaignId,
      prospectCount: campaign.prospects.length,
    })
  } catch (error) {
    console.error("Error starting message generation:", error)
    return NextResponse.json(
      { error: "Failed to start message generation" },
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

    // Get message generation statistics
    const stats = await prisma.prospect.groupBy({
      by: ["messageStatus"],
      where: {
        campaignId,
        enrichmentStatus: "FOUND",
      },
      _count: true,
    })

    const statusCounts: Record<string, number> = {}
    stats.forEach((stat) => {
      statusCounts[stat.messageStatus] = stat._count
    })

    const total = await prisma.prospect.count({
      where: {
        campaignId,
        enrichmentStatus: "FOUND",
      },
    })

    return NextResponse.json({
      campaignId,
      campaignStatus: campaign.status,
      total,
      stats: statusCounts,
      pending: statusCounts.PENDING || 0,
      generated: statusCounts.GENERATED || 0,
      edited: statusCounts.EDITED || 0,
      approved: statusCounts.APPROVED || 0,
      skipped: statusCounts.SKIPPED || 0,
    })
  } catch (error) {
    console.error("Error fetching message generation stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch message generation stats" },
      { status: 500 }
    )
  }
}
