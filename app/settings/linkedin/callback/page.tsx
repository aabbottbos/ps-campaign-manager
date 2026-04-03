"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LinkedInCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const accountId = searchParams.get("account_id")

    if (!accountId) {
      setStatus("error")
      setError("Missing account ID from Unipile callback")
      return
    }

    completeConnection(accountId)
  }, [searchParams])

  const completeConnection = async (accountId: string) => {
    try {
      const response = await fetch("/api/linkedin/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect LinkedIn account")
      }

      setStatus("success")

      // Redirect to settings after 2 seconds
      setTimeout(() => {
        router.push("/settings")
      }, 2000)
    } catch (error) {
      console.error("Error completing LinkedIn connection:", error)
      setStatus("error")
      setError(error instanceof Error ? error.message : "Unknown error")
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="pt-6">
          {status === "loading" && (
            <div className="text-center py-12">
              <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connecting LinkedIn Account</h2>
              <p className="text-ps-text-secondary">Please wait while we complete the connection...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">LinkedIn Account Connected!</h2>
              <p className="text-ps-text-secondary mb-4">
                Your LinkedIn account has been successfully connected.
              </p>
              <p className="text-sm text-ps-text-secondary">Redirecting to settings...</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-12">
              <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
              <p className="text-ps-text-secondary mb-4">{error || "Failed to connect LinkedIn account"}</p>
              <Button onClick={() => router.push("/settings")}>Back to Settings</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
