"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface EnrichmentPageProps {
  params: { id: string }
}

interface EnrichmentStats {
  campaignId: string
  campaignStatus: string
  total: number
  pending: number
  processing: number
  found: number
  notFound: number
  stale: number
  error: number
}

export default function EnrichmentPage({ params }: EnrichmentPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [stats, setStats] = useState<EnrichmentStats | null>(null)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    // Auto-start enrichment if campaign is in MAPPING_COMPLETE status
    if (stats && stats.campaignStatus === "MAPPING_COMPLETE" && !starting) {
      startEnrichment()
    }
  }, [stats])

  useEffect(() => {
    // Poll for updates if enrichment is in progress
    if (stats && stats.campaignStatus === "ENRICHING") {
      setPolling(true)
      const interval = setInterval(() => {
        fetchStats()
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(interval)
    } else {
      setPolling(false)
    }
  }, [stats?.campaignStatus])

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/enrich`)

      if (!response.ok) {
        throw new Error("Failed to fetch enrichment stats")
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Failed to load enrichment stats")
    } finally {
      setLoading(false)
    }
  }

  const startEnrichment = async () => {
    setStarting(true)

    try {
      const response = await fetch(`/api/campaigns/${params.id}/enrich`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        // Show user-friendly message for service unavailable
        if (response.status === 503 && data.requiresSetup) {
          toast.error("Enrichment Service Not Configured", {
            description: "Please configure INNGEST_EVENT_KEY and APIFY_API_TOKEN environment variables to enable prospect enrichment.",
            duration: 8000,
          })
        } else {
          toast.error(data.error || "Failed to start enrichment", {
            description: data.message,
          })
        }
        return
      }

      toast.success("Enrichment started")
      fetchStats()
    } catch (error) {
      console.error("Error starting enrichment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start enrichment")
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-ps-text-secondary">Failed to load enrichment data</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completed = stats.found + stats.notFound + stats.stale + stats.error
  const progressPercentage = stats.total > 0 ? (completed / stats.total) * 100 : 0
  const isComplete = stats.campaignStatus === "ENRICHMENT_COMPLETE"
  const isEnriching = stats.campaignStatus === "ENRICHING"

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ps-text-primary">Prospect Enrichment</h1>
        <p className="text-ps-text-secondary mt-1">
          {isComplete
            ? "Enrichment complete"
            : isEnriching
            ? "Enriching prospects with LinkedIn data..."
            : "Ready to enrich"}
        </p>
      </div>

      <div className="space-y-6">
        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Enrichment Progress</span>
              {isEnriching && (
                <Badge variant="info">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  In Progress
                </Badge>
              )}
              {isComplete && (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Processing {stats.total} prospects from your uploaded file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ps-text-secondary">
                  {completed} of {stats.total} prospects enriched
                </span>
                <span className="text-sm text-ps-text-secondary">
                  {progressPercentage.toFixed(0)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {polling && (
              <p className="text-xs text-ps-text-secondary flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Auto-refreshing every 3 seconds...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ps-text-secondary">Found</p>
                  <p className="text-2xl font-bold text-green-600">{stats.found}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ps-text-secondary">Stale</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.stale}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-xs text-ps-text-secondary mt-1">Left company</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ps-text-secondary">Not Found</p>
                  <p className="text-2xl font-bold text-ps-text-secondary">{stats.notFound}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ps-text-secondary">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        {isComplete && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Next Step</CardTitle>
              <CardDescription>
                {stats.found > 0
                  ? `${stats.found} prospects are ready for message generation`
                  : "No prospects were successfully enriched"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.found > 0 ? (
                <Button onClick={() => router.push(`/campaigns/${params.id}`)}>
                  Continue to Campaign
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" onClick={() => router.push(`/campaigns/${params.id}`)}>
                  Back to Campaign
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Enrichment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-ps-text-secondary">
            <p>
              <strong>Found:</strong> LinkedIn profile matched and person is currently at the
              specified company.
            </p>
            <p>
              <strong>Stale:</strong> LinkedIn profile found but person may have left the company
              or low confidence match.
            </p>
            <p>
              <strong>Not Found:</strong> Could not identify a LinkedIn profile for this person.
            </p>
            <p>
              <strong>Errors:</strong> API errors during enrichment (will not be charged).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
