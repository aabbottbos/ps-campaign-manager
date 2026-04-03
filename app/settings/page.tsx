"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Linkedin, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface LinkedInAccount {
  id: string
  unipileAccountId: string
  email: string
  status: string
  dailySendCount: number
  lastSendDate: string | null
  connectedAt: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([])
  const [connecting, setConnecting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/linkedin/accounts")

      if (!response.ok) {
        throw new Error("Failed to fetch LinkedIn accounts")
      }

      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast.error("Failed to load LinkedIn accounts")
    } finally {
      setLoading(false)
    }
  }

  const connectAccount = async () => {
    setConnecting(true)

    try {
      const response = await fetch("/api/linkedin/connect", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect account")
      }

      // Redirect to Unipile hosted auth
      window.location.href = data.authUrl
    } catch (error) {
      console.error("Error connecting account:", error)
      toast.error(error instanceof Error ? error.message : "Failed to connect LinkedIn account")
      setConnecting(false)
    }
  }

  const disconnectAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to disconnect this LinkedIn account?")) {
      return
    }

    try {
      const response = await fetch(`/api/linkedin/accounts/${accountId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to disconnect account")
      }

      toast.success("LinkedIn account disconnected")
      fetchAccounts()
    } catch (error) {
      console.error("Error disconnecting account:", error)
      toast.error("Failed to disconnect account")
    }
  }

  const deleteAllCampaigns = async () => {
    // First confirmation
    const firstConfirm = confirm(
      "⚠️ WARNING: This will permanently delete ALL of your campaigns and all associated data (prospects, messages, enrichments, etc.).\n\nThis action CANNOT be reversed.\n\nAre you absolutely sure you want to continue?"
    )

    if (!firstConfirm) {
      return
    }

    // Second confirmation for extra safety
    const secondConfirm = confirm(
      "🚨 FINAL WARNING 🚨\n\nYou are about to delete EVERYTHING. This includes:\n• All campaigns\n• All prospects\n• All enrichment data\n• All generated messages\n• All CRM sync data\n\nType DELETE in the next prompt to confirm."
    )

    if (!secondConfirm) {
      return
    }

    // Third confirmation with text input
    const userInput = prompt('Type "DELETE" in all caps to confirm deletion:')

    if (userInput !== "DELETE") {
      toast.error("Deletion cancelled - confirmation text did not match")
      return
    }

    setDeleting(true)

    try {
      const response = await fetch("/api/campaigns/delete-all", {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete campaigns")
      }

      toast.success(data.message || "All campaigns deleted successfully")
    } catch (error) {
      console.error("Error deleting campaigns:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete campaigns")
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case "RATE_LIMITED":
        return (
          <Badge variant="warning">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rate Limited
          </Badge>
        )
      case "DISCONNECTED":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        )
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getDailySendStatus = (account: LinkedInAccount) => {
    const today = new Date().toISOString().split("T")[0]
    const lastSendDate = account.lastSendDate?.split("T")[0]
    const isToday = lastSendDate === today
    const count = isToday ? account.dailySendCount : 0
    const limit = 50 // Daily send limit
    const percentage = (count / limit) * 100

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-ps-text-secondary">Daily sends</span>
          <span className="text-sm font-medium">
            {count} / {limit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              percentage >= 100
                ? "bg-red-500"
                : percentage >= 80
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ps-text-primary">Settings</h1>
        <p className="text-ps-text-secondary mt-1">Manage your LinkedIn accounts and integrations</p>
      </div>

      <div className="space-y-6">
        {/* LinkedIn Accounts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Linkedin className="h-5 w-5 text-blue-600" />
                  LinkedIn Accounts
                </CardTitle>
                <CardDescription className="mt-1">
                  Connect LinkedIn accounts for automated message sending
                </CardDescription>
              </div>
              <Button onClick={connectAccount} disabled={connecting}>
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Account
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <Linkedin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-ps-text-secondary mb-4">No LinkedIn accounts connected</p>
                <Button onClick={connectAccount} disabled={connecting}>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Your First Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="border rounded-lg p-4 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Linkedin className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">{account.email}</span>
                        {getStatusBadge(account.status)}
                      </div>
                      <p className="text-xs text-ps-text-secondary mb-3">
                        Connected {new Date(account.connectedAt).toLocaleDateString()}
                      </p>
                      {getDailySendStatus(account)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Limits Info */}
        <Card>
          <CardHeader>
            <CardTitle>About Daily Send Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-ps-text-secondary">
            <p>
              <strong>Daily Limit:</strong> Each LinkedIn account can send up to 50 messages per
              day to avoid triggering LinkedIn&apos;s spam detection.
            </p>
            <p>
              <strong>Sending Pace:</strong> Messages are sent with randomized delays (30-90
              seconds) to mimic human behavior.
            </p>
            <p>
              <strong>Connection Requests:</strong> Limited to 300 characters per message.
            </p>
            <p>
              <strong>InMail Messages:</strong> Limited to approximately 1,900 characters per
              message.
            </p>
            <p>
              <strong>Account Rotation:</strong> If multiple accounts are connected, the system
              will automatically rotate between them to distribute the sending load.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-700">
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-red-300 bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">Delete All Campaigns</h3>
                  <p className="text-sm text-red-700 mb-3">
                    Permanently delete all campaigns and associated data including prospects,
                    enrichments, messages, and sync history. This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">
                      You will be asked to confirm this action multiple times
                    </span>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={deleteAllCampaigns}
                  disabled={deleting}
                  className="shrink-0"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Campaigns
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
