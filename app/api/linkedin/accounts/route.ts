import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/linkedin/accounts
 * List all LinkedIn accounts for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accounts = await prisma.linkedInAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { connectedAt: "desc" },
    })

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("Error fetching LinkedIn accounts:", error)
    return NextResponse.json(
      { error: "Failed to fetch LinkedIn accounts" },
      { status: 500 }
    )
  }
}
