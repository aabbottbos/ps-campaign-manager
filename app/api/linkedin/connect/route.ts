import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAuthUrl } from "@/lib/unipile"

/**
 * POST /api/linkedin/connect
 * Generate a Unipile hosted auth URL to connect a LinkedIn account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const authUrl = await getAuthUrl()

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error("Error generating Unipile auth URL:", error)
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    )
  }
}
