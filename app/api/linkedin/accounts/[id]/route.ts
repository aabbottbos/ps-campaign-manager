import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { disconnectAccount } from "@/lib/unipile"

/**
 * DELETE /api/linkedin/accounts/[id]
 * Disconnect a LinkedIn account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find the account
    const account = await prisma.linkedInAccount.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Disconnect from Unipile
    await disconnectAccount(account.unipileAccountId)

    // Delete from database
    await prisma.linkedInAccount.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error disconnecting LinkedIn account:", error)
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    )
  }
}
