"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, Send, Pause, Play, ArrowRight, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface SendPageProps {
  params: { id: string }
}

interface SendStats {
  campaignId: string
  campaignStatus: string
  total: number
  sent: number
  failed: number
  pending: number
  hasActiveAccounts: boolean
}

export default function SendPage({ params }: SendPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [stats, setStats] = useState<SendStats | null>(null)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    // Poll for updates if sending is in progress
    if (stats && stats.campaignStatus === "SENDING") {
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
      const response = await fetch(`/api/campaigns/${params.id}/send`)

      if (!response.ok) {
        throw new Error("Failed to fetch send stats")
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Failed to load send stats")
    } finally {
      setLoading(false)
    }
  }

  const startSending = async () => {
    setStarting(true)

    try {
      const response = await fetch(`/api/campaigns/${params.id}/send`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start sending")
      }

      toast.success("Message sending started")
      fetchStats()
    } catch (error) {
      console.error("Error starting send:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start sending")
    } finally {
      setStarting(false)
    }
  }

  const togglePause = async () => {
    if (!stats) return

    setPausing(true)
    const action = stats.campaignStatus === "SENDING" ? "pause" : "resume"

    try {
      const response = await fetch(`/api/campaigns/${params.id}/send`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action}`)
      }

      toast.success(action === "pause" ? "Campaign paused" : "Campaign resumed")
      fetchStats()
    } catch (error) {
      console.error(`Error ${action}ing:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to ${action}`)
    } finally {
      setPausing(false)
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
            <p className="text-center text-gray-600">Failed to load send data</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progressPercentage = stats.total > 0 ? ((stats.sent + stats.failed) / stats.total) * 100 : 0
  const isSending = stats.campaignStatus === "SENDING"
  const isPaused = stats.campaignStatus === "PAUSED"
  const isComplete = stats.campaignStatus === "COMPLETE"
  const canStart = stats.campaignStatus === "CRM_SYNCED" && stats.pending > 0 && stats.hasActiveAccounts

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Send Campaign</h1>
        <p className="text-gray-600 mt-1">
          {isComplete
            ? "Campaign complete"
            : isSending
            ? "Sending LinkedIn messages..."
            : isPaused
            ? "Campaign paused"
            : "Ready to send"}
        </p>
      </div>

      <div className="space-y-6">
        {/* No LinkedIn Account Warning */}
        {!stats.hasActiveAccounts && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 mb-1">
                    No LinkedIn Account Connected
                  </p>
                  <p className="text-sm text-yellow-700 mb-3">
                    You need to connect a LinkedIn account before you can send messages.
                  </p>
                  <Link href="/settings">
                    <Button size="sm" variant="outline">
                      Go to Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Send Progress</span>
              {isSending && (
                <Badge variant="info">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Sending
                </Badge>
              )}
              {isPaused && (
                <Badge variant="warning">
                  <Pause className="h-3 w-3 mr-1" />
                  Paused
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
              Sending messages to {stats.total} prospects via LinkedIn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {stats.sent + stats.failed} of {stats.total} processed
                </span>
                <span className="text-sm text-gray-500">{progressPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {polling && (
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Auto-refreshing every 3 seconds...
              </p>
            )}

            {/* Controls */}
            <div className="flex items-center gap-2 pt-2">
              {canStart && (
                <Button onClick={startSending} disabled={starting}>
                  {starting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Start Sending
                    </>
                  )}
                </Button>
              )}

              {(isSending || isPaused) && stats.pending > 0 && (
                <Button onClick={togglePause} disabled={pausing} variant="outline">
                  {pausing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isSending ? "Pausing..." : "Resuming..."}
                    </>
                  ) : isSending ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sent</p>
                  <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                </div>
                <Loader2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        {isComplete && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Campaign Complete</CardTitle>
              <CardDescription>
                {stats.sent > 0
                  ? `Successfully sent ${stats.sent} LinkedIn messages`
                  : "No messages were sent"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push(`/campaigns/${params.id}`)}>
                Back to Campaign
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              About Message Sending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Human-like Pacing:</strong> Messages are sent with randomized delays (30-90
              seconds) between each send to mimic natural human behavior.
            </p>
            <p>
              <strong>Daily Limits:</strong> Each LinkedIn account can send up to 50 messages per
              day. The system automatically rotates between your connected accounts.
            </p>
            <p>
              <strong>Pause & Resume:</strong> You can pause sending at any time and resume later.
              The system will pick up where it left off.
            </p>
            <p>
              <strong>Activity Logging:</strong> All sent messages are automatically logged as
              activities in SalesLoft for tracking and follow-up.
            </p>
            <p>
              <strong>Error Handling:</strong> If a message fails to send, the prospect will be
              marked as "Send Failed" and you can retry manually.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
