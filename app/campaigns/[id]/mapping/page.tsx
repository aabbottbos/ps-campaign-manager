"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
  autoMapColumns,
  validateMapping,
  getFieldLabel,
  isRequiredField,
  ALL_FIELDS,
  type ColumnMapping,
  type MappingField,
} from "@/lib/column-mapper"

interface MappingPageProps {
  params: { id: string }
}

interface MappingData {
  headers: string[]
  preview: Record<string, string>[]
  totalRows: number
  existingMapping: ColumnMapping | null
}

interface Campaign {
  messageGenerationStrategy: string
  outreachType: string
}

export default function MappingPage({ params }: MappingPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<MappingData | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    fetchMappingData()
  }, [])

  const fetchMappingData = async () => {
    try {
      const [mappingResponse, campaignResponse] = await Promise.all([
        fetch(`/api/campaigns/${params.id}/mapping`),
        fetch(`/api/campaigns/${params.id}`)
      ])

      if (!mappingResponse.ok) {
        throw new Error("Failed to fetch mapping data")
      }

      const result = await mappingResponse.json()
      setData(result)

      // Fetch campaign to determine strategy
      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json()
        setCampaign({
          messageGenerationStrategy: campaignData.messageGenerationStrategy,
          outreachType: campaignData.outreachType
        })
      }

      // Use existing mapping if available, otherwise auto-detect
      const initialMapping = result.existingMapping || autoMapColumns(result.headers)
      setMapping(initialMapping)
    } catch (error) {
      console.error("Error fetching mapping data:", error)
      toast.error("Failed to load file data")
    } finally {
      setLoading(false)
    }
  }

  const handleMappingChange = (field: MappingField, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === "none" ? undefined : value,
    }))
  }

  const handleSaveMapping = async () => {
    const validation = validateMapping(mapping)

    if (!validation.valid) {
      toast.error(`Please map required fields: ${validation.missingFields.map((field) => getFieldLabel(field as any)).join(", ")}`)
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/campaigns/${params.id}/mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save mapping")
      }

      const successMessage = campaign?.messageGenerationStrategy === "FIXED_MESSAGE"
        ? "Column mapping saved. Fixed message will be applied to all prospects."
        : "Column mapping saved successfully"

      toast.success(result.message || successMessage)

      // Redirect back to campaign page
      setTimeout(() => {
        router.push(`/campaigns/${params.id}`)
      }, 500)
    } catch (error) {
      console.error("Error saving mapping:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save mapping")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-ps-text-secondary">Failed to load file data</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const validation = validateMapping(mapping)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ps-text-primary">Map Columns</h1>
        <p className="text-ps-text-secondary mt-1">Step 3: Column Mapping</p>
      </div>

      {campaign?.messageGenerationStrategy === "FIXED_MESSAGE" && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            📝 <strong>Fixed Message Campaign:</strong> Enrichment will be skipped. The same message will be sent to all prospects after mapping.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Map Your File Columns</CardTitle>
            <CardDescription>
              Match the columns from your file to the required prospect fields. Found {data.totalRows} prospects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ALL_FIELDS.map((field) => {
              const required = isRequiredField(field)
              const currentValue = mapping[field]

              return (
                <div key={field} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="flex items-center gap-2">
                    {getFieldLabel(field)}
                    {required && <span className="text-red-500">*</span>}
                  </Label>

                  <div className="col-span-2">
                    <Select
                      value={currentValue || "none"}
                      onValueChange={(value) => handleMappingChange(field, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-ps-text-secondary">-- Not mapped --</span>
                        </SelectItem>
                        {data.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            })}

            {!validation.valid && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-medium">Required fields missing:</p>
                  <p className="mt-1">
                    {validation.missingFields.map((field) => getFieldLabel(field as any)).join(", ")}
                  </p>
                </div>
              </div>
            )}

            {validation.valid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-900 font-medium">
                  All required fields mapped
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              First 5 rows of your file with mapped columns highlighted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-surface">
                    <th className="px-4 py-3 text-left font-medium text-ps-text-secondary">#</th>
                    {data.headers.map((header) => {
                      const isMapped = Object.values(mapping).includes(header)
                      return (
                        <th
                          key={header}
                          className={`px-4 py-3 text-left font-medium ${
                            isMapped
                              ? "bg-primary/10 text-primary"
                              : "text-ps-text-secondary"
                          }`}
                        >
                          {header}
                          {isMapped && (
                            <span className="ml-2 text-xs">
                              ({getFieldLabel(
                                Object.keys(mapping).find(
                                  (key) => mapping[key as MappingField] === header
                                ) as MappingField
                              )})
                            </span>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.preview.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-surface">
                      <td className="px-4 py-3 text-ps-text-secondary">{index + 1}</td>
                      {data.headers.map((header) => {
                        const isMapped = Object.values(mapping).includes(header)
                        return (
                          <td
                            key={header}
                            className={`px-4 py-3 ${
                              isMapped ? "font-medium" : "text-ps-text-secondary"
                            }`}
                          >
                            {row[header] || (
                              <span className="text-gray-400 italic">empty</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => router.push(`/campaigns/${params.id}/upload`)}
            disabled={saving}
          >
            Back to Upload
          </Button>
          <Button onClick={handleSaveMapping} disabled={!validation.valid || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : campaign?.messageGenerationStrategy === "FIXED_MESSAGE" ? (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Start Enrichment
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
