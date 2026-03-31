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
    setLoading(true)

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create campaign")
      }

      const campaign = await response.json()
      toast.success("Campaign created successfully")
      router.push(`/campaigns/${campaign.id}/upload`)
    } catch (error) {
      toast.error("Failed to create campaign")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="text-gray-600 mt-1">Step 1: Campaign Details</p>
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
              <p className="text-xs text-gray-500">
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
                    <p className="text-xs text-gray-500">
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
                    <p className="text-xs text-gray-500">
                      Send InMail messages to prospects outside your network (~1,900 character limit)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

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
              <p className="text-xs text-gray-500">
                Example: "Promoting our Product Management certification program to mid-level PMs
                at tech companies. Focus on career advancement, hands-on learning, and the
                certificate's industry recognition."
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
              <p className="text-xs text-gray-500">
                Example: "Keep tone casual and friendly. Always mention our upcoming cohort start
                date. End with a question, not a hard CTA."
              </p>
            </div>

            <div className="space-y-2">
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
              <p className="text-xs text-gray-500">
                Prospects will be added to this SalesLoft cadence after CRM sync. Leave blank if you don't want to enroll prospects in a cadence.
              </p>
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
