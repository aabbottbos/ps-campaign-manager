"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Cadence {
  id: number
  name: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [loadingCadences, setLoadingCadences] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    outreachType: "CONNECT" as "CONNECT" | "INMAIL",
    messageTemplate: "",
    messageGenerationStrategy: "AI_PERSONALIZED" as "AI_PERSONALIZED" | "FIXED_MESSAGE",
    fixedMessage: "",
    enableCrmSync: true,
    salesloftCadenceId: "",
  })

  useEffect(() => {
    fetchCadences()
  }, [])

  const fetchCadences = async () => {
    try {
      const response = await fetch("/api/salesloft/cadences")
      if (response.ok) {
        const data = await response.json()
        setCadences(data)
      }
    } catch (error) {
      console.error("Error fetching cadences:", error)
      // Non-blocking error - user can still create campaign without cadence
    } finally {
      setLoadingCadences(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation based on strategy
    if (formData.messageGenerationStrategy === "AI_PERSONALIZED") {
      if (!formData.description) {
        toast.error("Campaign description required for AI personalization")
        return
      }
    } else if (formData.messageGenerationStrategy === "FIXED_MESSAGE") {
      if (!formData.fixedMessage) {
        toast.error("Fixed message required")
        return
      }

      const charLimit = formData.outreachType === "CONNECT" ? 300 : 1900
      if (formData.fixedMessage.length > charLimit) {
        toast.error(`Message exceeds ${charLimit} character limit`)
        return
      }
    }

    setLoading(true)

    try {
      // Auto-disable enrichment for fixed messages
      const payload = {
        ...formData,
        enableEnrichment: formData.messageGenerationStrategy === "AI_PERSONALIZED"
      }

      console.log("Submitting campaign:", payload)

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API Error:", errorData)
        throw new Error(errorData.error || "Failed to create campaign")
      }

      const campaign = await response.json()
      toast.success("Campaign created successfully")
      router.push(`/campaigns/${campaign.id}/upload`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create campaign"
      toast.error(errorMessage)
      console.error("Submit error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ps-text-primary">Create New Campaign</h1>
        <p className="text-ps-text-secondary mt-1">Step 1: Campaign Details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
          <CardDescription>
            Provide the basic details about your LinkedIn outreach campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Campaign Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q2 AI Product Managers Outreach"
                maxLength={100}
                required
              />
              <p className="text-xs text-ps-text-secondary">
                A descriptive name to identify this campaign
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outreachType">
                Outreach Type <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={formData.outreachType}
                onValueChange={(value) =>
                  setFormData({ ...formData, outreachType: value as "CONNECT" | "INMAIL" })
                }
              >
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <RadioGroupItem value="CONNECT" id="connect" />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="connect" className="font-normal cursor-pointer">
                      LinkedIn Connect Request
                    </Label>
                    <p className="text-xs text-ps-text-secondary">
                      Send connection requests with personalized messages (300 character limit)
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <RadioGroupItem value="INMAIL" id="inmail" />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="inmail" className="font-normal cursor-pointer">
                      LinkedIn InMail
                    </Label>
                    <p className="text-xs text-ps-text-secondary">
                      Send InMail messages to prospects outside your network (~1,900 character limit)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Message Strategy</Label>
              <RadioGroup
                value={formData.messageGenerationStrategy}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    messageGenerationStrategy: value as "AI_PERSONALIZED" | "FIXED_MESSAGE"
                  })
                }
              >
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <RadioGroupItem value="AI_PERSONALIZED" id="ai" />
                  <div className="space-y-1 leading-none flex-1">
                    <Label htmlFor="ai" className="font-medium cursor-pointer">
                      🤖 AI-Personalized Messages
                    </Label>
                    <p className="text-xs text-ps-text-secondary">
                      Enrich prospects with LinkedIn data and generate unique messages for each person using Claude AI
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <RadioGroupItem value="FIXED_MESSAGE" id="fixed" />
                  <div className="space-y-1 leading-none flex-1">
                    <Label htmlFor="fixed" className="font-medium cursor-pointer">
                      📝 Fixed Message
                    </Label>
                    <p className="text-xs text-ps-text-secondary">
                      Send the same message to all prospects. No enrichment or AI customization needed.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {formData.messageGenerationStrategy === "AI_PERSONALIZED" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Campaign Description <span className="text-red-500">*</span>
                  </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what you're promoting, the value proposition, and any specific talking points. This is used by AI to personalize each message."
                rows={6}
                required
              />
              <p className="text-xs text-ps-text-secondary">
                Example: &quot;Promoting our Product Management certification program to mid-level PMs
                at tech companies. Focus on career advancement, hands-on learning, and the
                certificate&apos;s industry recognition.&quot;
              </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="messageTemplate">Message Instructions (Optional)</Label>
                  <Textarea
                    id="messageTemplate"
                    value={formData.messageTemplate}
                    onChange={(e) =>
                      setFormData({ ...formData, messageTemplate: e.target.value })
                    }
                    placeholder="Any specific instructions for the AI when drafting messages — tone, things to mention/avoid, CTA preferences."
                    rows={4}
                  />
                  <p className="text-xs text-ps-text-secondary">
                    Example: &quot;Keep tone casual and friendly. Always mention our upcoming cohort start
                    date. End with a question, not a hard CTA.&quot;
                  </p>
                </div>
              </>
            )}

            {formData.messageGenerationStrategy === "FIXED_MESSAGE" && (
              <div className="space-y-2">
                <Label htmlFor="fixedMessage">
                  Your Message <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="fixedMessage"
                  value={formData.fixedMessage}
                  onChange={(e) => setFormData({ ...formData, fixedMessage: e.target.value })}
                  placeholder="Enter the message that will be sent to all prospects..."
                  rows={6}
                  maxLength={formData.outreachType === "CONNECT" ? 300 : 1900}
                  required
                />
                <p className="text-xs text-ps-text-secondary">
                  Character count: {formData.fixedMessage?.length || 0} /{" "}
                  {formData.outreachType === "CONNECT" ? 300 : 1900}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  id="enableCrmSync"
                  checked={formData.enableCrmSync}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      enableCrmSync: e.target.checked,
                      salesloftCadenceId: e.target.checked ? formData.salesloftCadenceId : ""
                    })
                  }
                  className="h-4 w-4 rounded border-ps-border"
                />
                <Label htmlFor="enableCrmSync" className="font-normal cursor-pointer">
                  Sync prospects to Salesforce &amp; SalesLoft
                </Label>
              </div>
              <p className="text-xs text-ps-text-secondary ml-6">
                When enabled, prospects will be created/updated in Salesforce and SalesLoft before sending.
                Disable if you&apos;re not using CRM integration for this campaign.
              </p>

              {formData.enableCrmSync && (
                <div className="ml-6 mt-3 space-y-2">
                  <Label htmlFor="cadence">SalesLoft Cadence (Optional)</Label>
              <Select
                    value={formData.salesloftCadenceId || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, salesloftCadenceId: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCadences ? "Loading cadences..." : "Select a cadence..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No cadence (optional)</SelectItem>
                      {cadences.map((cadence) => (
                        <SelectItem key={cadence.id} value={cadence.id.toString()}>
                          {cadence.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-ps-text-secondary">
                    Prospects will be added to this SalesLoft cadence after CRM sync. Leave blank if you don&apos;t want to enroll prospects in a cadence.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/campaigns")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Next: Upload Prospects
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
