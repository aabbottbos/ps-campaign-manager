import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { put } from "@vercel/blob"
import { parseFile, validateFileSize, validateFileType } from "@/lib/file-parser"

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

    // Get file from form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!validateFileType(file.name)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a CSV or Excel file." },
        { status: 400 }
      )
    }

    // Validate file size
    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse file to extract headers and preview data
    let parsedData
    try {
      parsedData = await parseFile(buffer, file.name)
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to parse file",
        },
        { status: 400 }
      )
    }

    if (parsedData.totalRows === 0) {
      return NextResponse.json(
        { error: "File contains no data rows" },
        { status: 400 }
      )
    }

    if (parsedData.totalRows > 5000) {
      return NextResponse.json(
        {
          error: `File contains ${parsedData.totalRows} rows. Maximum is 5,000 rows per campaign.`,
        },
        { status: 400 }
      )
    }

    // Upload file to Vercel Blob
    const blob = await put(
      `campaigns/${campaignId}/${file.name}`,
      buffer,
      {
        access: "public",
        addRandomSuffix: true,
      }
    )

    // Update campaign with file info
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        uploadedFileName: file.name,
        uploadedFileUrl: blob.url,
        status: "FILE_UPLOADED",
      },
    })

    return NextResponse.json({
      success: true,
      fileUrl: blob.url,
      fileName: file.name,
      headers: parsedData.headers,
      preview: parsedData.preview,
      totalRows: parsedData.totalRows,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
