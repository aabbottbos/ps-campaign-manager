import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMessageLength } from "@/lib/claude"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; prospectId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: campaignId, prospectId } = params

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

    // Verify prospect belongs to campaign
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
    })

    if (!prospect || prospect.campaignId !== campaignId) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    const body = await request.json()
    const { editedMessage, messageStatus } = body

    // Validate message length if provided
    if (editedMessage !== undefined) {
      const validation = validateMessageLength(editedMessage, campaign.outreachType)

      if (!validation.valid) {
        return NextResponse.json(
          {
            error: `Message exceeds ${validation.characterLimit} character limit by ${validation.exceededBy} characters`,
          },
          { status: 400 }
        )
      }
    }

    // Update prospect
    const updateData: any = {}

    if (editedMessage !== undefined) {
      updateData.editedMessage = editedMessage
      updateData.characterCount = editedMessage.length
      // If user edits, mark as EDITED
      if (messageStatus !== "SKIPPED") {
        updateData.messageStatus = "EDITED"
      }
    }

    if (messageStatus) {
      updateData.messageStatus = messageStatus
    }

    const updatedProspect = await prisma.prospect.update({
      where: { id: prospectId },
      data: updateData,
    })

    return NextResponse.json(updatedProspect)
  } catch (error) {
    console.error("Error updating prospect:", error)
    return NextResponse.json(
      { error: "Failed to update prospect" },
      { status: 500 }
    )
  }
}
