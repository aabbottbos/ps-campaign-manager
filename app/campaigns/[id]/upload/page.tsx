import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UploadPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Upload Prospects</h1>
        <p className="text-gray-600 mt-1">Step 2: File Upload (Coming Soon)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Your Prospect List</CardTitle>
          <CardDescription>
            This feature will be implemented in Sprint 2
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            You'll be able to upload CSV or Excel files with your prospect data here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
