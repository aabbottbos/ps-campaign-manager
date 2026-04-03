import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCadences } from "@/lib/salesloft"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if SalesLoft is configured
    if (!process.env.SALESLOFT_API_KEY) {
      console.log("[SalesLoft] API key not configured, returning empty cadences list")
      return NextResponse.json([])
    }

    const cadences = await getCadences()

    return NextResponse.json(cadences)
  } catch (error) {
    console.error("Error fetching SalesLoft cadences:", error)
    // Return empty array instead of 500 error - allows campaign creation to proceed
    return NextResponse.json([])
  }
}
