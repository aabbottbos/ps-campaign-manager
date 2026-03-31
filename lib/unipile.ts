/**
 * Unipile API Client
 *
 * Handles LinkedIn messaging via Unipile's API proxy.
 * Supports connection requests with notes and InMail messages.
 */

interface UnipileAccount {
  id: string
  provider: string
  email: string
  status: "ACTIVE" | "DISCONNECTED" | "RATE_LIMITED"
  api_id: string
}

interface SendConnectionRequestParams {
  accountId: string
  profileUrl: string
  message: string
}

interface SendInMailParams {
  accountId: string
  profileUrl: string
  subject?: string
  message: string
}

interface UnipileMessageResponse {
  success: boolean
  message_id?: string
  error?: string
  rate_limit_reset?: string
}

const UNIPILE_API_URL = "https://api.unipile.com/api/v1"
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY

if (!UNIPILE_API_KEY) {
  console.warn("Warning: UNIPILE_API_KEY not set")
}

/**
 * Get authorization headers for Unipile API
 */
function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-API-KEY": UNIPILE_API_KEY || "",
  }
}

/**
 * List all connected LinkedIn accounts
 */
export async function listAccounts(): Promise<UnipileAccount[]> {
  try {
    const response = await fetch(`${UNIPILE_API_URL}/accounts`, {
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Unipile API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.accounts || []
  } catch (error) {
    console.error("Error fetching Unipile accounts:", error)
    throw error
  }
}

/**
 * Get a hosted auth URL to connect a LinkedIn account
 */
export async function getAuthUrl(): Promise<string> {
  try {
    const response = await fetch(`${UNIPILE_API_URL}/hosted/accounts/link`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        provider: "LINKEDIN",
        success_redirect_url: `${process.env.NEXTAUTH_URL}/settings/linkedin/callback`,
        failure_redirect_url: `${process.env.NEXTAUTH_URL}/settings?error=linkedin_auth_failed`,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to generate auth URL: ${response.status}`)
    }

    const data = await response.json()
    return data.url
  } catch (error) {
    console.error("Error generating Unipile auth URL:", error)
    throw error
  }
}

/**
 * Send a LinkedIn connection request with a personalized note
 * @param params - Account ID, LinkedIn profile URL, and message (max 300 chars)
 */
export async function sendConnectionRequest(
  params: SendConnectionRequestParams
): Promise<UnipileMessageResponse> {
  try {
    const response = await fetch(`${UNIPILE_API_URL}/messaging/connection-request`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        account_id: params.accountId,
        profile_url: params.profileUrl,
        message: params.message,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `API error: ${response.status}`,
        rate_limit_reset: data.rate_limit_reset,
      }
    }

    return {
      success: true,
      message_id: data.message_id,
    }
  } catch (error) {
    console.error("Error sending connection request:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send a LinkedIn InMail message
 * @param params - Account ID, LinkedIn profile URL, optional subject, and message (max ~1900 chars)
 */
export async function sendInMail(params: SendInMailParams): Promise<UnipileMessageResponse> {
  try {
    const response = await fetch(`${UNIPILE_API_URL}/messaging/inmail`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        account_id: params.accountId,
        profile_url: params.profileUrl,
        subject: params.subject,
        message: params.message,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `API error: ${response.status}`,
        rate_limit_reset: data.rate_limit_reset,
      }
    }

    return {
      success: true,
      message_id: data.message_id,
    }
  } catch (error) {
    console.error("Error sending InMail:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Disconnect a LinkedIn account from Unipile
 */
export async function disconnectAccount(accountId: string): Promise<boolean> {
  try {
    const response = await fetch(`${UNIPILE_API_URL}/accounts/${accountId}`, {
      method: "DELETE",
      headers: getHeaders(),
    })

    return response.ok
  } catch (error) {
    console.error("Error disconnecting account:", error)
    return false
  }
}

/**
 * Check if an account is rate limited
 */
export async function checkAccountStatus(accountId: string): Promise<UnipileAccount | null> {
  try {
    const response = await fetch(`${UNIPILE_API_URL}/accounts/${accountId}`, {
      headers: getHeaders(),
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Error checking account status:", error)
    return null
  }
}
