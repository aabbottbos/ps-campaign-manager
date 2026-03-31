import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure API connections and preferences</p>
      </div>

      <Card className="text-center py-12">
        <CardContent className="pt-6">
          <Settings className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <CardTitle className="mb-2">Settings Coming Soon</CardTitle>
          <CardDescription>
            Configure LinkedIn accounts, API connections, and send limits in Sprint 7
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}
