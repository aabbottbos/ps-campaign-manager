"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, CheckCircle2, XCircle, Edit2, Undo2, Search, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface ReviewPageProps {
  params: { id: string }
}

interface Prospect {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  company: string | null
  currentTitle: string | null
  currentCompany: string | null
  linkedinUrl: string | null
  linkedinHeadline: string | null
  profileImageUrl: string | null
  enrichmentConfidence: number | null
  generatedMessage: string | null
  editedMessage: string | null
  messageStatus: string
  characterCount: number | null
  enrichmentStatus: string
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [filteredProspects, setFilteredProspects] = useState<Prospect[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [outreachType, setOutreachType] = useState<"CONNECT" | "INMAIL">("CONNECT")

  useEffect(() => {
    fetchProspects()
    fetchCampaignInfo()
  }, [])

  useEffect(() => {
    filterProspects()
  }, [prospects, searchTerm, statusFilter])

  const fetchCampaignInfo = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/generate-messages`)
      if (response.ok) {
        const data = await response.json()
        // Check if we need to start generation
        if (data.pending > 0 && data.campaignStatus === "ENRICHMENT_COMPLETE") {
          startGeneration()
        }
      }
    } catch (error) {
      console.error("Error fetching campaign info:", error)
    }
  }

  const fetchProspects = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/prospects?enrichmentStatus=FOUND`)

      if (!response.ok) {
        throw new Error("Failed to fetch prospects")
      }

      const data = await response.json()
      setProspects(data)

      // Get campaign to determine outreach type
      const campaignResponse = await fetch(`/api/campaigns/${params.id}`)
      if (campaignResponse.ok) {
        const campaign = await campaignResponse.json()
        setOutreachType(campaign.outreachType)
      }
    } catch (error) {
      console.error("Error fetching prospects:", error)
      toast.error("Failed to load prospects")
    } finally {
      setLoading(false)
    }
  }

  const startGeneration = async () => {
    setGenerating(true)

    try {
      const response = await fetch(`/api/campaigns/${params.id}/generate-messages`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start message generation")
      }

      toast.success("Message generation started")

      // Poll for updates
      const interval = setInterval(async () => {
        const statsResponse = await fetch(`/api/campaigns/${params.id}/generate-messages`)
        if (statsResponse.ok) {
          const stats = await statsResponse.json()
          if (stats.pending === 0) {
            clearInterval(interval)
            fetchProspects()
            setGenerating(false)
          } else {
            // Refresh prospects to show progress
            fetchProspects()
          }
        }
      }, 3000)
    } catch (error) {
      console.error("Error starting generation:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start generation")
      setGenerating(false)
    }
  }

  const filterProspects = () => {
    let filtered = prospects

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.messageStatus === statusFilter)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.firstName?.toLowerCase().includes(term) ||
          p.lastName?.toLowerCase().includes(term) ||
          p.company?.toLowerCase().includes(term) ||
          p.currentTitle?.toLowerCase().includes(term)
      )
    }

    setFilteredProspects(filtered)
  }

  const handleEdit = (prospect: Prospect) => {
    setEditingId(prospect.id)
    setEditText(prospect.editedMessage || prospect.generatedMessage || "")
  }

  const handleSaveEdit = async (prospectId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${params.id}/prospects/${prospectId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editedMessage: editText }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save edit")
      }

      setEditingId(null)
      fetchProspects()
      toast.success("Message updated")
    } catch (error) {
      console.error("Error saving edit:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save edit")
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText("")
  }

  const handleResetMessage = async (prospectId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${params.id}/prospects/${prospectId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editedMessage: null,
            messageStatus: "GENERATED",
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to reset message")
      }

      fetchProspects()
      toast.success("Message reset to original")
    } catch (error) {
      console.error("Error resetting message:", error)
      toast.error("Failed to reset message")
    }
  }

  const handleApprove = async (prospectId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${params.id}/prospects/${prospectId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageStatus: "APPROVED" }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to approve message")
      }

      fetchProspects()
    } catch (error) {
      console.error("Error approving message:", error)
      toast.error("Failed to approve message")
    }
  }

  const handleSkip = async (prospectId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${params.id}/prospects/${prospectId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageStatus: "SKIPPED" }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to skip prospect")
      }

      fetchProspects()
    } catch (error) {
      console.error("Error skipping prospect:", error)
      toast.error("Failed to skip prospect")
    }
  }

  const handleBulkApprove = async () => {
    const toApprove = filteredProspects.filter(
      (p) => p.messageStatus === "GENERATED" || p.messageStatus === "EDITED"
    )

    for (const prospect of toApprove) {
      await handleApprove(prospect.id)
    }

    toast.success(`Approved ${toApprove.length} messages`)
  }

  const characterLimit = outreachType === "CONNECT" ? 300 : 1900
  const approvedCount = prospects.filter((p) => p.messageStatus === "APPROVED").length
  const canContinue = approvedCount > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Review Messages</h1>
        <p className="text-gray-600 mt-1">
          {generating
            ? "Generating personalized messages..."
            : "Review and edit AI-generated messages before sending"}
        </p>
      </div>

      {generating && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
              <p className="text-sm text-yellow-900">
                Generating personalized messages for all prospects... This may take a few minutes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, company, or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="GENERATED">Generated</SelectItem>
                <SelectItem value="EDITED">Edited</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="SKIPPED">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleBulkApprove} variant="outline">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve All Visible
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border">
        <div className="text-sm">
          <span className="font-medium text-gray-900">{approvedCount}</span>
          <span className="text-gray-600"> of {prospects.length} prospects approved</span>
        </div>
        {canContinue && (
          <Button onClick={() => router.push(`/campaigns/${params.id}`)}>
            Continue to Campaign
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Prospects Table */}
      <div className="space-y-4">
        {filteredProspects.map((prospect) => {
          const finalMessage = prospect.editedMessage || prospect.generatedMessage
          const isEditing = editingId === prospect.id
          const charCount = isEditing
            ? editText.length
            : prospect.characterCount || 0
          const isOverLimit = charCount > characterLimit
          const isNearLimit = charCount > characterLimit * 0.9

          return (
            <Card key={prospect.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {prospect.profileImageUrl && (
                      <img
                        src={prospect.profileImageUrl}
                        alt={`${prospect.firstName} ${prospect.lastName}`}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        {prospect.firstName} {prospect.lastName}
                      </CardTitle>
                      <CardDescription>
                        {prospect.currentTitle} at {prospect.currentCompany}
                      </CardDescription>
                      {prospect.linkedinUrl && (
                        <a
                          href={prospect.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View LinkedIn Profile →
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {prospect.messageStatus === "APPROVED" && (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                    {prospect.messageStatus === "EDITED" && (
                      <Badge variant="info">Edited</Badge>
                    )}
                    {prospect.messageStatus === "SKIPPED" && (
                      <Badge variant="outline">Skipped</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${
                          isOverLimit
                            ? "text-red-600"
                            : isNearLimit
                            ? "text-yellow-600"
                            : "text-gray-600"
                        }`}
                      >
                        {charCount} / {characterLimit} characters
                        {isOverLimit && ` (${charCount - characterLimit} over)`}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(prospect.id)}
                          disabled={isOverLimit}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                      {finalMessage || "No message generated"}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span
                        className={`text-xs font-medium ${
                          isOverLimit
                            ? "text-red-600"
                            : isNearLimit
                            ? "text-yellow-600"
                            : "text-gray-500"
                        }`}
                      >
                        {charCount} / {characterLimit} characters
                        {prospect.editedMessage && " (edited)"}
                      </span>
                      <div className="flex gap-2">
                        {prospect.editedMessage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetMessage(prospect.id)}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Reset
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(prospect)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {prospect.messageStatus !== "SKIPPED" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSkip(prospect.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Skip
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(prospect.id)}
                              disabled={isOverLimit}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(prospect.id)}
                          >
                            Unskip
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProspects.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">No prospects match your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
