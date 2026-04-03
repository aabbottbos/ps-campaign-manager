import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText } from "lucide-react"
import { format } from "date-fns"

async function getCampaigns(userId: string) {
  return prisma.campaign.findMany({
    where: { userId },
    include: {
      _count: {
        select: { prospects: true },
      },
    },
    orderBy: { createdAt: "desc" },
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

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const campaigns = await getCampaigns(session.user.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-ps-text-primary">Your Campaigns</h1>
          <p className="text-ps-text-secondary mt-1">Manage your LinkedIn outreach campaigns</p>
        </div>
        <Link href="/campaigns/new">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="pt-6">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <CardTitle className="mb-2">No campaigns yet</CardTitle>
            <CardDescription className="mb-6">
              Get started by creating your first LinkedIn outreach campaign
            </CardDescription>
            <Link href="/campaigns/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        campaign.status
                      )}`}
                    >
                      {getStatusLabel(campaign.status)}
                    </span>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {campaign.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-ps-text-secondary mb-3">
                    <div>
                      <span className="font-medium">{campaign._count.prospects}</span> prospects
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        campaign.outreachType === "CONNECT"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      {campaign.outreachType}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        campaign.messageGenerationStrategy === "AI_PERSONALIZED"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {campaign.messageGenerationStrategy === "AI_PERSONALIZED" ? "🤖 AI" : "📝 Fixed"}
                    </span>
                    {!campaign.enableCrmSync && (
                      <span className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700">
                        No CRM
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ps-text-secondary">
                    Created {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
