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
        _count: {
          select: {
            prospects: true,
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

    // Check if enrichment is enabled for this campaign
    if (!campaign.enableEnrichment) {
      return NextResponse.json(
        {
          error: "Enrichment is disabled for this campaign",
          message: "This campaign is configured to skip enrichment. Proceed to the review step.",
        },
        { status: 400 }
      )
    }

    // Check if campaign is in the right status
    if (campaign.status !== "MAPPING_COMPLETE") {
      return NextResponse.json(
        {
          error: `Campaign must be in MAPPING_COMPLETE status to start enrichment. Current status: ${campaign.status}`,
        },
        { status: 400 }
      )
    }

    if (campaign._count.prospects === 0) {
      return NextResponse.json(
        { error: "No prospects to enrich" },
        { status: 400 }
      )
    }

    // Check if required services are configured
    if (!process.env.INNGEST_EVENT_KEY) {
      return NextResponse.json(
        {
          error: "Enrichment service not configured",
          message: "INNGEST_EVENT_KEY environment variable is missing. Please configure Inngest to enable prospect enrichment.",
          requiresSetup: true,
        },
        { status: 503 }
      )
    }

    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json(
        {
          error: "Enrichment provider not configured",
          message: "APIFY_API_TOKEN environment variable is missing. Please configure Apify to enable prospect enrichment.",
          requiresSetup: true,
        },
        { status: 503 }
      )
    }

    // Trigger the Inngest enrichment job
    try {
      await inngest.send({
        name: "campaign/enrich-prospects",
        data: {
          campaignId,
        },
      })

      return NextResponse.json({
        success: true,
        message: "Enrichment started",
        campaignId,
        prospectCount: campaign._count.prospects,
      })
    } catch (inngestError: any) {
      console.error("Inngest error:", inngestError)
      return NextResponse.json(
        {
          error: "Failed to start enrichment job",
          message: inngestError.message || "Unknown error with background job service",
          requiresSetup: true,
        },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error("Error starting enrichment:", error)
    return NextResponse.json(
      { error: "Failed to start enrichment" },
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

    // Get enrichment statistics
    const stats = await prisma.prospect.groupBy({
      by: ["enrichmentStatus"],
      where: { campaignId },
      _count: true,
    })

    const statusCounts: Record<string, number> = {}
    stats.forEach((stat) => {
      statusCounts[stat.enrichmentStatus] = stat._count
    })

    const total = await prisma.prospect.count({
      where: { campaignId },
    })

    return NextResponse.json({
      campaignId,
      campaignStatus: campaign.status,
      total,
      stats: statusCounts,
      pending: statusCounts.PENDING || 0,
      processing: statusCounts.PROCESSING || 0,
      found: statusCounts.FOUND || 0,
      notFound: statusCounts.NOT_FOUND || 0,
      stale: statusCounts.STALE || 0,
      error: statusCounts.ERROR || 0,
    })
  } catch (error) {
    console.error("Error fetching enrichment stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch enrichment stats" },
      { status: 500 }
    )
  }
}
