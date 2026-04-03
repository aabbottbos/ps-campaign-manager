import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaigns = await prisma.campaign.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { prospects: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(campaigns)
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      outreachType,
      messageTemplate,
      messageGenerationStrategy,
      fixedMessage,
      enableCrmSync,
      enableEnrichment,
      salesloftCadenceId
    } = body

    // Validation
    if (!name || !outreachType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!["CONNECT", "INMAIL"].includes(outreachType)) {
      return NextResponse.json(
        { error: "Invalid outreach type" },
        { status: 400 }
      )
    }

    const strategy = messageGenerationStrategy || "AI_PERSONALIZED"

    // Strategy-specific validation
    if (strategy === "AI_PERSONALIZED" && !description) {
      return NextResponse.json(
        { error: "Description required for AI-personalized campaigns" },
        { status: 400 }
      )
    }

    if (strategy === "FIXED_MESSAGE" && !fixedMessage) {
      return NextResponse.json(
        { error: "Fixed message required for fixed-message campaigns" },
        { status: 400 }
      )
    }

    // Debug: Log user ID
    console.log("[Campaign Create] User ID:", session.user.id)
    console.log("[Campaign Create] User email:", session.user.email)
    console.log("[Campaign Create] Campaign name:", name)

    // Validate user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!userExists) {
      console.error("[Campaign Create] User ID not found in database:", session.user.id)
      return NextResponse.json(
        { error: "Invalid session. Please sign out and sign back in." },
        { status: 401 }
      )
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        userId: session.user.id,
        name,
        description: description || "",
        outreachType,
        messageTemplate: messageTemplate || null,
        messageGenerationStrategy: strategy,
        fixedMessage: fixedMessage || null,
        enableCrmSync: enableCrmSync !== undefined ? enableCrmSync : true,
        enableEnrichment: enableEnrichment !== undefined ? enableEnrichment : true,
        salesloftCadenceId: salesloftCadenceId || null,
        status: "DRAFT",
      },
    })

    console.log("[Campaign Create] Created campaign:", campaign.id)

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error("Error creating campaign:", error)
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    )
  }
}
