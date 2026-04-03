import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

export default function TemplatesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ps-text-primary">Campaign Templates</h1>
        <p className="text-ps-text-secondary mt-1">Save and reuse campaign configurations</p>
      </div>

      <Card className="text-center py-12">
        <CardContent className="pt-6">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <CardTitle className="mb-2">Templates Coming Soon</CardTitle>
          <CardDescription>
            This feature will be available in a future update
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}
