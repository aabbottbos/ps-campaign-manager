/**
 * Unipile API Client
 *
 * Handles LinkedIn messaging via Unipile's API proxy.
 * Supports connection requests with notes and InMail messages.
 */

interface UnipileAccount {
  id: string
  type: string // "LINKEDIN", etc.
  name: string
  created_at: string
  connection_params?: {
    im?: {
      id: string
      publicIdentifier: string
      username: string
      premiumId?: string
      premiumFeatures?: string[]
    }
  }
  sources?: Array<{
    id: string
    status: string // "OK", "ERROR", etc.
  }>
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

const UNIPILE_BASE_URL = process.env.UNIPILE_BASE_URL || "https://api.unipile.com:13443"
const UNIPILE_API_URL = `${UNIPILE_BASE_URL}/api/v1`
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY

if (!UNIPILE_API_KEY) {
  console.warn("Warning: UNIPILE_API_KEY not set")
}

if (!process.env.UNIPILE_BASE_URL) {
  console.warn("Warning: UNIPILE_BASE_URL not set, using default")
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
    // Unipile returns { items: [...] } not { accounts: [...] }
    return data.items || []
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
    // Generate expiration timestamp (24 hours from now)
    const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const requestBody = {
      type: "create",
      providers: ["LINKEDIN"],
      expiresOn,
      api_url: UNIPILE_BASE_URL,
      success_redirect_url: `${process.env.NEXTAUTH_URL}/settings/linkedin/callback`,
      failure_redirect_url: `${process.env.NEXTAUTH_URL}/settings?error=linkedin_auth_failed`,
      bypass_success_screen: false,
    }

    console.log(`[Unipile] Requesting auth URL from: ${UNIPILE_API_URL}/hosted/accounts/link`)
    console.log(`[Unipile] Request body:`, requestBody)

    const response = await fetch(`${UNIPILE_API_URL}/hosted/accounts/link`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Unipile] Auth URL error response (${response.status}):`, errorText)
      throw new Error(`Failed to generate auth URL: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`[Unipile] Successfully generated auth URL:`, data.url)
    return data.url
  } catch (error) {
    console.error("[Unipile] Error generating auth URL:", error)
    throw error
  }
}

/**
 * Send a LinkedIn connection request with a personalized note
 * @param params - Account ID, LinkedIn profile URL, and message (max 300 chars)
 *
 * This is a two-step process:
 * 1. Get the user's profile to retrieve their provider_id (LinkedIn URN)
 * 2. Send the invitation using the provider_id
 */
export async function sendConnectionRequest(
  params: SendConnectionRequestParams
): Promise<UnipileMessageResponse> {
  try {
    console.log(`[UNIPILE] Step 1: Fetching profile to get provider_id`, {
      accountId: params.accountId,
      profileUrl: params.profileUrl,
    })

    // Step 1: Get the user's profile to extract provider_id
    const profileResponse = await fetch(
      `${UNIPILE_API_URL}/users/profile?account_id=${params.accountId}&identifier=${encodeURIComponent(params.profileUrl)}`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    )

    if (!profileResponse.ok) {
      const profileError = await profileResponse.json()
      console.error(`[UNIPILE] Profile fetch failed:`, {
        status: profileResponse.status,
        error: profileError,
      })
      return {
        success: false,
        error: profileError.detail || profileError.message || `Failed to fetch profile: ${profileResponse.status}`,
      }
    }

    const profileData = await profileResponse.json()
    const providerId = profileData.provider_id

    if (!providerId) {
      console.error(`[UNIPILE] No provider_id found in profile response:`, profileData)
      return {
        success: false,
        error: "Could not find LinkedIn profile ID",
      }
    }

    console.log(`[UNIPILE] Step 2: Sending invitation`, {
      providerId,
      messageLength: params.message.length,
    })

    // Step 2: Send the invitation using provider_id
    const inviteResponse = await fetch(`${UNIPILE_API_URL}/users/invite`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        account_id: params.accountId,
        provider_id: providerId,
        message: params.message,
      }),
    })

    console.log(`[UNIPILE] Invitation response status:`, inviteResponse.status, inviteResponse.statusText)

    const inviteData = await inviteResponse.json()
    console.log(`[UNIPILE] Invitation response data:`, inviteData)

    if (!inviteResponse.ok) {
      console.error(`[UNIPILE] Invitation failed:`, {
        status: inviteResponse.status,
        error: inviteData,
      })
      return {
        success: false,
        error: inviteData.detail || inviteData.message || `API error: ${inviteResponse.status}`,
        rate_limit_reset: inviteData.rate_limit_reset,
      }
    }

    console.log(`[UNIPILE] Connection request sent successfully`)
    return {
      success: true,
      message_id: inviteData.id || "invitation_sent",
    }
  } catch (error) {
    console.error("[UNIPILE] Exception sending connection request:", error)
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
