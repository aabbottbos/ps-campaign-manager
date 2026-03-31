"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, ArrowRight, Database } from "lucide-react"
import { toast } from "sonner"

interface CRMSyncPageProps {
  params: { id: string }
}

interface SyncStats {
  campaignId: string
  campaignStatus: string
  total: number
  notSynced: number
  syncing: number
  synced: number
  error: number
}

export default function CRMSyncPage({ params }: CRMSyncPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    // Auto-start sync if campaign is ready
    if (stats && stats.notSynced > 0 && stats.campaignStatus !== "CRM_SYNCING" && !starting) {
      startSync()
    }
  }, [stats])

  useEffect(() => {
    // Poll for updates if sync is in progress
    if (stats && stats.campaignStatus === "CRM_SYNCING") {
      setPolling(true)
      const interval = setInterval(() => {
        fetchStats()
      }, 2000) // Poll every 2 seconds

      return () => clearInterval(interval)
    } else {
      setPolling(false)
    }
  }, [stats?.campaignStatus])

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/crm-sync`)

      if (!response.ok) {
        throw new Error("Failed to fetch CRM sync stats")
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Failed to load CRM sync stats")
    } finally {
      setLoading(false)
    }
  }

  const startSync = async () => {
    setStarting(true)

    try {
      const response = await fetch(`/api/campaigns/${params.id}/crm-sync`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start CRM sync")
      }

      toast.success("CRM sync started")
      fetchStats()
    } catch (error) {
      console.error("Error starting sync:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start CRM sync")
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
            <p className="text-center text-gray-600">Failed to load CRM sync data</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completed = stats.synced + stats.error
  const progressPercentage = stats.total > 0 ? (completed / stats.total) * 100 : 0
  const isComplete = stats.campaignStatus === "CRM_SYNCED"
  const isSyncing = stats.campaignStatus === "CRM_SYNCING"

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">CRM Sync</h1>
        <p className="text-gray-600 mt-1">
          {isComplete
            ? "CRM sync complete"
            : isSyncing
            ? "Syncing prospects to Salesforce and SalesLoft..."
            : "Ready to sync"}
        </p>
      </div>

      <div className="space-y-6">
        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sync Progress</span>
              {isSyncing && (
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
              Syncing {stats.total} approved prospects to Salesforce and SalesLoft
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {completed} of {stats.total} prospects synced
                </span>
                <span className="text-sm text-gray-500">
                  {progressPercentage.toFixed(0)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {polling && (
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Auto-refreshing every 2 seconds...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Synced</p>
                  <p className="text-2xl font-bold text-green-600">{stats.synced}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Successfully synced to both CRMs</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Failed to sync</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        {isComplete && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Next Step</CardTitle>
              <CardDescription>
                {stats.synced > 0
                  ? `${stats.synced} prospects are synced and ready for outreach`
                  : "No prospects were successfully synced"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.synced > 0 ? (
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
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              About CRM Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Salesforce:</strong> Each prospect is created or updated as a Contact. If the
              company doesn't exist in Salesforce, a new Account is created automatically.
            </p>
            <p>
              <strong>SalesLoft:</strong> Each prospect is created or updated as a Person. The
              Salesforce Contact ID is linked for CRM integration.
            </p>
            <p>
              <strong>Cadence Enrollment:</strong> If you selected a SalesLoft cadence for this
              campaign, prospects will be automatically enrolled after being synced.
            </p>
            <p>
              <strong>Duplicate Detection:</strong> The system checks for existing records by email
              and LinkedIn URL to avoid creating duplicates.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
