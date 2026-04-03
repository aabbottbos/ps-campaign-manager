import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, FileText, Users } from "lucide-react"
import { format } from "date-fns"

interface CampaignDetailPageProps {
  params: { id: string }
}

async function getCampaign(id: string, userId: string) {
  return prisma.campaign.findFirst({
    where: { id, userId },
    include: {
      _count: {
        select: { prospects: true },
      },
    },
  })
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-elevated text-ps-text-primary",
    FILE_UPLOADED: "bg-blue-100 text-blue-800",
    MAPPING_COMPLETE: "bg-blue-100 text-blue-800",
    ENRICHING: "bg-yellow-100 text-yellow-800",
    ENRICHMENT_COMPLETE: "bg-yellow-100 text-yellow-800",
    MESSAGES_GENERATED: "bg-purple-100 text-purple-800",
    REVIEW: "bg-purple-100 text-purple-800",
    CRM_SYNCING: "bg-indigo-100 text-indigo-800",
    CRM_SYNCED: "bg-indigo-100 text-indigo-800",
    SENDING: "bg-orange-100 text-orange-800",
    PAUSED: "bg-elevated text-ps-text-primary",
    COMPLETE: "bg-green-100 text-green-800",
  }
  return colors[status] || "bg-elevated text-ps-text-primary"
}

function getStatusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
}

function getNextStepInfo(
  status: string,
  campaignId: string,
  messageGenerationStrategy: string,
  enableCrmSync: boolean
) {
  switch (status) {
    case "DRAFT":
      return {
        message: "Upload your prospect list to get started",
        action: "Upload Prospects",
        href: `/campaigns/${campaignId}/upload`,
      }
    case "FILE_UPLOADED":
      return {
        message: "Map the columns in your file to prospect fields",
        action: "Map Columns",
        href: `/campaigns/${campaignId}/mapping`,
      }
    case "MAPPING_COMPLETE":
      if (messageGenerationStrategy === "FIXED_MESSAGE") {
        return {
          message: "Review your fixed message before sending",
          action: "Review Message",
          href: `/campaigns/${campaignId}/review`,
        }
      }
      return {
        message: "Ready to enrich prospects with LinkedIn data",
        action: "Start Enrichment",
        href: `/campaigns/${campaignId}/enrichment`,
      }
    case "ENRICHMENT_COMPLETE":
      return {
        message: "Generate personalized messages for your prospects",
        action: "Review Messages",
        href: `/campaigns/${campaignId}/review`,
      }
    case "MESSAGES_GENERATED":
      return {
        message: "Review and approve messages before sending",
        action: "Review Messages",
        href: `/campaigns/${campaignId}/review`,
      }
    case "REVIEW":
      if (enableCrmSync) {
        return {
          message: "Sync approved prospects to Salesforce and SalesLoft",
          action: "Sync to CRM",
          href: `/campaigns/${campaignId}/crm-sync`,
        }
      }
      // No CRM sync - go straight to send
      return {
        message: "Messages approved and ready to send via LinkedIn",
        action: "Send Campaign",
        href: `/campaigns/${campaignId}/send`,
      }
    case "CRM_SYNCED":
      return {
        message: "Ready to send messages via LinkedIn",
        action: "Send Campaign",
        href: `/campaigns/${campaignId}/send`,
      }
    default:
      return null
  }
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const campaign = await getCampaign(params.id, session.user.id)

  if (!campaign) {
    redirect("/campaigns")
  }

  const nextStep = getNextStepInfo(
    campaign.status,
    campaign.id,
    campaign.messageGenerationStrategy,
    campaign.enableCrmSync
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ps-text-primary">{campaign.name}</h1>
            <p className="text-ps-text-secondary mt-1">
              Created {format(new Date(campaign.createdAt), "MMMM d, yyyy")}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
              campaign.status
            )}`}
          >
            {getStatusLabel(campaign.status)}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-ps-text-secondary">Outreach Type</label>
              <p className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                    campaign.outreachType === "CONNECT"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-purple-50 text-purple-700"
                  }`}
                >
                  {campaign.outreachType}
                </span>
                <span className="ml-2 text-sm text-ps-text-secondary">
                  {campaign.outreachType === "CONNECT"
                    ? "(300 character limit)"
                    : "(~1,900 character limit)"}
                </span>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-ps-text-secondary">Description</label>
              <p className="mt-1 text-ps-text-primary">{campaign.description}</p>
            </div>

            {campaign.messageTemplate && (
              <div>
                <label className="text-sm font-medium text-ps-text-secondary">
                  Message Instructions
                </label>
                <p className="mt-1 text-ps-text-primary">{campaign.messageTemplate}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium text-ps-text-secondary">Prospects</label>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="h-5 w-5 text-gray-400" />
                  <p className="text-2xl font-bold text-ps-text-primary">
                    {campaign._count.prospects}
                  </p>
                </div>
              </div>

              {campaign.uploadedFileName && (
                <div>
                  <label className="text-sm font-medium text-ps-text-secondary">Uploaded File</label>
                  <div className="flex items-center gap-2 mt-1">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <p className="text-sm text-ps-text-primary truncate">
                      {campaign.uploadedFileName}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {nextStep && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Next Step</CardTitle>
              <CardDescription>{nextStep.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={nextStep.href}>
                <Button>
                  {nextStep.action}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {campaign.status !== "DRAFT" && campaign._count.prospects > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Progress</CardTitle>
              <CardDescription>Track your campaign through each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">File Upload</span>
                  <span className="text-green-600">✓ Complete</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Column Mapping</span>
                  <span
                    className={
                      campaign.status === "FILE_UPLOADED"
                        ? "text-orange-600"
                        : "text-green-600"
                    }
                  >
                    {campaign.status === "FILE_UPLOADED" ? "→ In Progress" : "✓ Complete"}
                  </span>
                </div>
                {campaign.messageGenerationStrategy === "AI_PERSONALIZED" && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Enrichment</span>
                      <span
                        className={
                          ["ENRICHING", "ENRICHMENT_COMPLETE", "MESSAGES_GENERATED", "REVIEW", "CRM_SYNCING", "CRM_SYNCED", "SENDING", "COMPLETE"].includes(campaign.status)
                            ? campaign.status === "ENRICHING"
                              ? "text-orange-600"
                              : "text-green-600"
                            : "text-gray-400"
                        }
                      >
                        {campaign.status === "ENRICHING"
                          ? "→ In Progress"
                          : ["ENRICHMENT_COMPLETE", "MESSAGES_GENERATED", "REVIEW", "CRM_SYNCING", "CRM_SYNCED", "SENDING", "COMPLETE"].includes(campaign.status)
                          ? "✓ Complete"
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Message Generation</span>
                      <span
                        className={
                          ["MESSAGES_GENERATED", "REVIEW", "CRM_SYNCING", "CRM_SYNCED", "SENDING", "COMPLETE"].includes(campaign.status)
                            ? "text-green-600"
                            : "text-gray-400"
                        }
                      >
                        {["MESSAGES_GENERATED", "REVIEW", "CRM_SYNCING", "CRM_SYNCED", "SENDING", "COMPLETE"].includes(campaign.status)
                          ? "✓ Complete"
                          : "Pending"}
                      </span>
                    </div>
                  </>
                )}
                {campaign.messageGenerationStrategy === "FIXED_MESSAGE" && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Fixed Message Applied</span>
                    <span
                      className={
                        ["REVIEW", "CRM_SYNCING", "CRM_SYNCED", "SENDING", "COMPLETE"].includes(campaign.status)
                          ? "text-green-600"
                          : campaign.status === "MAPPING_COMPLETE"
                          ? "text-orange-600"
                          : "text-gray-400"
                      }
                    >
                      {["REVIEW", "CRM_SYNCING", "CRM_SYNCED", "SENDING", "COMPLETE"].includes(campaign.status)
                        ? "✓ Complete"
                        : campaign.status === "MAPPING_COMPLETE"
                        ? "→ In Progress"
                        : "Pending"}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
