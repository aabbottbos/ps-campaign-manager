import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const enrichmentStatus = searchParams.get("enrichmentStatus")
    const messageStatus = searchParams.get("messageStatus")

    // Build filter
    const where: any = { campaignId }

    if (enrichmentStatus) {
      where.enrichmentStatus = enrichmentStatus
    }

    if (messageStatus) {
      where.messageStatus = messageStatus
    }

    // Get prospects
    const prospects = await prisma.prospect.findMany({
      where,
      orderBy: [
        { enrichmentStatus: "asc" },
        { lastName: "asc" },
      ],
    })

    return NextResponse.json(prospects)
  } catch (error) {
    console.error("Error fetching prospects:", error)
    return NextResponse.json(
      { error: "Failed to fetch prospects" },
      { status: 500 }
    )
  }
}
