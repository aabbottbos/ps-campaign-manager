import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete all campaigns for the current user
    // Prisma will cascade delete all related records (prospects, enrichments, etc.)
    const result = await prisma.campaign.deleteMany({
      where: {
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} campaign${result.count === 1 ? "" : "s"}`,
      count: result.count,
    })
  } catch (error) {
    console.error("Error deleting all campaigns:", error)
    return NextResponse.json(
      { error: "Failed to delete campaigns" },
      { status: 500 }
    )
  }
}
