import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateMapping, extractMappedValues, type ColumnMapping } from "@/lib/column-mapper"
import { parseFile } from "@/lib/file-parser"
import { get } from "@vercel/blob"
import { inngest } from "@/lib/inngest/client"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaignId = params.id

    // Verify campaign ownership and get file URL
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!campaign.uploadedFileUrl || !campaign.uploadedFileName) {
      return NextResponse.json(
        { error: "No file uploaded for this campaign" },
        { status: 400 }
      )
    }

    // Get mapping from request body
    const body = await request.json()
    const mapping: ColumnMapping = body.mapping

    // Validate mapping
    const validation = validateMapping(mapping)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: `Missing required field mappings: ${validation.missingFields.join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Download and re-parse the uploaded file from private Blob storage
    const blobResult = await get(campaign.uploadedFileUrl, {
      access: 'private',
    })

    if (!blobResult || blobResult.statusCode !== 200) {
      throw new Error("Failed to download file from storage")
    }

    // Convert Web ReadableStream to Buffer
    const reader = blobResult.stream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const fileBuffer = Buffer.concat(chunks)
    const parsedData = await parseFile(fileBuffer, campaign.uploadedFileName)

    // Delete existing prospects if any (in case user re-uploads)
    await prisma.prospect.deleteMany({
      where: { campaignId },
    })

    // Create prospects from parsed rows
    const prospects = parsedData.rows.map((row, index) => {
      const mappedValues = extractMappedValues(row, mapping)

      console.log(`[MAPPING] Row ${index + 1} - Raw data:`, row)
      console.log(`[MAPPING] Row ${index + 1} - Mapped values:`, mappedValues)
      console.log(`[MAPPING] Row ${index + 1} - LinkedIN URL:`, mappedValues.linkedinUrl)

      return {
        campaignId,
        rawData: row, // Store the full row as JSON
        firstName: mappedValues.firstName,
        lastName: mappedValues.lastName,
        email: mappedValues.email,
        company: mappedValues.company,
        title: mappedValues.title,
        phone: mappedValues.phone,
        linkedinUrl: mappedValues.linkedinUrl,
        enrichmentStatus: "PENDING" as const,
        messageStatus: "PENDING" as const,
        crmSyncStatus: "NOT_SYNCED" as const,
        sendStatus: "NOT_SENT" as const,
      }
    })

    console.log(`[MAPPING] Creating ${prospects.length} prospects for campaign ${campaignId}`)
    console.log(`[MAPPING] Prospects to create:`, JSON.stringify(prospects, null, 2))

    // Batch create prospects
    const created = await prisma.prospect.createMany({
      data: prospects,
    })

    console.log(`[MAPPING] Successfully created ${created.count} prospects`)

    // Verify creation
    const verifyProspects = await prisma.prospect.findMany({
      where: { campaignId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        linkedinUrl: true,
        messageStatus: true,
        sendStatus: true,
      }
    })
    console.log(`[MAPPING] Verification - Found ${verifyProspects.length} prospects in DB:`, JSON.stringify(verifyProspects, null, 2))

    // Workflow branching based on message generation strategy
    if (campaign.messageGenerationStrategy === "FIXED_MESSAGE") {
      // Fixed message: Copy the same message to all prospects and skip enrichment
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          columnMapping: mapping as any,
          status: "MAPPING_COMPLETE",
        },
      })

      // Trigger fixed message copy job
      await inngest.send({
        name: "campaign/copy-fixed-message",
        data: { campaignId }
      })

      return NextResponse.json({
        success: true,
        prospectsCreated: prospects.length,
        message: `Successfully created ${prospects.length} prospects. Fixed message will be copied to all.`,
        strategy: "FIXED_MESSAGE"
      })
    } else {
      // AI personalized: Proceed to enrichment workflow
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          columnMapping: mapping as any,
          status: "MAPPING_COMPLETE",
        },
      })

      return NextResponse.json({
        success: true,
        prospectsCreated: prospects.length,
        message: `Successfully created ${prospects.length} prospects`,
        strategy: "AI_PERSONALIZED"
      })
    }
  } catch (error) {
    console.error("Error saving column mapping:", error)
    return NextResponse.json(
      { error: "Failed to save column mapping" },
      { status: 500 }
    )
  }
}

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

    // Verify campaign ownership and get file info
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!campaign.uploadedFileUrl || !campaign.uploadedFileName) {
      return NextResponse.json(
        { error: "No file uploaded for this campaign" },
        { status: 400 }
      )
    }

    // Download and parse the uploaded file from private Blob storage to get headers and preview
    const blobResult = await get(campaign.uploadedFileUrl, {
      access: 'private',
    })

    if (!blobResult || blobResult.statusCode !== 200) {
      throw new Error("Failed to download file from storage")
    }

    // Convert Web ReadableStream to Buffer
    const reader = blobResult.stream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const fileBuffer = Buffer.concat(chunks)
    const parsedData = await parseFile(fileBuffer, campaign.uploadedFileName)

    return NextResponse.json({
      headers: parsedData.headers,
      preview: parsedData.preview,
      totalRows: parsedData.totalRows,
      existingMapping: campaign.columnMapping || null,
    })
  } catch (error) {
    console.error("Error fetching mapping data:", error)
    return NextResponse.json(
      { error: "Failed to fetch mapping data" },
      { status: 500 }
    )
  }
}
