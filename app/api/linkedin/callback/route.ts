import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkAccountStatus } from "@/lib/unipile"

/**
 * POST /api/linkedin/callback
 * Complete LinkedIn account connection after Unipile OAuth redirect
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "Missing account ID" }, { status: 400 })
    }

    // Fetch account details from Unipile
    const unipileAccount = await checkAccountStatus(accountId)

    if (!unipileAccount) {
      return NextResponse.json(
        { error: "Failed to fetch account from Unipile" },
        { status: 400 }
      )
    }

    console.log("[LinkedIn Callback] Unipile account data:", JSON.stringify(unipileAccount, null, 2))

    // Extract LinkedIn-specific data
    const linkedinUsername = unipileAccount.connection_params?.im?.username || unipileAccount.name || "Unknown"
    const publicIdentifier = unipileAccount.connection_params?.im?.publicIdentifier || ""

    // Derive email from public identifier or use placeholder
    const email = publicIdentifier ? `${publicIdentifier}@linkedin.com` : `${accountId}@linkedin.com`

    // Determine status from sources
    const accountStatus = unipileAccount.sources?.[0]?.status === "OK" ? "ACTIVE" : "DISCONNECTED"

    // Check if account already exists
    const existing = await prisma.linkedInAccount.findFirst({
      where: {
        userId: session.user.id,
        unipileAccountId: accountId,
      },
    })

    if (existing) {
      // Update existing account with latest info
      const updated = await prisma.linkedInAccount.update({
        where: { id: existing.id },
        data: {
          linkedinName: linkedinUsername,
          status: accountStatus,
        },
      })
      return NextResponse.json({ account: updated })
    }

    // Create account in database
    const account = await prisma.linkedInAccount.create({
      data: {
        userId: session.user.id,
        unipileAccountId: accountId,
        email,
        linkedinName: linkedinUsername,
        linkedinProfileUrl: publicIdentifier ? `https://www.linkedin.com/in/${publicIdentifier}` : null,
        status: accountStatus,
        dailySendCount: 0,
        lastSendDate: null,
      },
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error("Error completing LinkedIn connection:", error)
    return NextResponse.json(
      { error: "Failed to complete LinkedIn connection" },
      { status: 500 }
    )
  }
}
