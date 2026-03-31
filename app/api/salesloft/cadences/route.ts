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

    const cadences = await getCadences()

    return NextResponse.json(cadences)
  } catch (error) {
    console.error("Error fetching SalesLoft cadences:", error)
    return NextResponse.json(
      { error: "Failed to fetch cadences" },
      { status: 500 }
    )
  }
}
