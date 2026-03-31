"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface UploadPageProps {
  params: { id: string }
}

export default function UploadPage({ params }: UploadPageProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string>("")

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    const validExtensions = [".csv", ".xlsx", ".xls"]

    const extension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf("."))

    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(extension)) {
      toast.error("Invalid file type. Please upload a CSV or Excel file.")
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.")
      return
    }

    setFile(selectedFile)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress("Uploading file...")

    try {
      const formData = new FormData()
      formData.append("file", file)

      setUploadProgress("Parsing file...")

      const response = await fetch(`/api/campaigns/${params.id}/upload`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file")
      }

      setUploadProgress("File uploaded successfully!")
      toast.success(`File uploaded: ${data.totalRows} prospects found`)

      // Redirect to column mapping page
      setTimeout(() => {
        router.push(`/campaigns/${params.id}/mapping`)
      }, 500)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload file")
      setUploadProgress("")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Upload Prospects</h1>
        <p className="text-gray-600 mt-1">Step 2: File Upload</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Your Prospect List</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file with your prospect data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!file ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                disabled={uploading}
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                Drop your file here, or{" "}
                <label
                  htmlFor="file-upload"
                  className="text-primary cursor-pointer hover:underline"
                >
                  browse
                </label>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                CSV, XLSX, or XLS files up to 10MB • Maximum 5,000 rows
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-6 bg-gray-50">
              <div className="flex items-start gap-4">
                <FileText className="h-10 w-10 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  {uploadProgress && (
                    <div className="flex items-center gap-2 mt-2">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      <p className="text-sm text-gray-700">{uploadProgress}</p>
                    </div>
                  )}
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null)
                      setUploadProgress("")
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-2">File Requirements:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Must include columns for: First Name, Last Name, Company</li>
                  <li>• Recommended: Email, Title/Role, Phone</li>
                  <li>• First row should be column headers</li>
                  <li>• Accepted formats: CSV, XLSX, XLS</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => router.push("/campaigns")}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Continue to Mapping"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
