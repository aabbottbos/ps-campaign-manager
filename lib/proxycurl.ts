const PROXYCURL_API_KEY = process.env.PROXYCURL_API_KEY!
const PROXYCURL_BASE_URL = "https://nubela.co/proxycurl/api/v2"

export interface PersonSearchParams {
  first_name: string
  last_name: string
  company_name?: string
  title?: string
  location?: string
  email?: string
}

export interface PersonSearchResult {
  url?: string
  name_similarity_score?: number
  profile?: {
    first_name: string
    last_name: string
    headline?: string
    summary?: string
  }
}

export interface LinkedInProfile {
  public_identifier: string
  profile_pic_url?: string
  first_name: string
  last_name: string
  headline?: string
  summary?: string
  country?: string
  city?: string
  state?: string
  experiences?: {
    company?: string
    company_linkedin_profile_url?: string
    title?: string
    description?: string
    starts_at?: { day?: number; month?: number; year?: number }
    ends_at?: { day?: number; month?: number; year?: number } | null
  }[]
  education?: any[]
}

/**
 * Search for a person on LinkedIn
 * Proxycurl Person Search API: https://nubela.co/proxycurl/docs#people-api-person-search-endpoint
 */
export async function searchPerson(
  params: PersonSearchParams
): Promise<PersonSearchResult | null> {
  try {
    const searchParams = new URLSearchParams()
    searchParams.append("first_name", params.first_name)
    searchParams.append("last_name", params.last_name)

    if (params.company_name) {
      searchParams.append("current_company_name", params.company_name)
    }
    if (params.title) {
      searchParams.append("title", params.title)
    }
    if (params.location) {
      searchParams.append("location", params.location)
    }
    if (params.email) {
      searchParams.append("email", params.email)
    }

    searchParams.append("enrich_profile", "skip") // We'll enrich separately
    searchParams.append("page_size", "1") // Only need the best match

    const response = await fetch(
      `${PROXYCURL_BASE_URL}/search/person?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${PROXYCURL_API_KEY}`,
        },
      }
    )

    if (response.status === 404) {
      return null // No match found
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Proxycurl search failed: ${response.status} ${errorText}`
      )
    }

    const data = await response.json()

    // Return the first result if any
    if (data.results && data.results.length > 0) {
      return data.results[0]
    }

    return null
  } catch (error) {
    console.error("Proxycurl person search error:", error)
    throw error
  }
}

/**
 * Get full LinkedIn profile data
 * Proxycurl Person Profile API: https://nubela.co/proxycurl/docs#people-api-person-profile-endpoint
 */
export async function getLinkedInProfile(
  linkedinUrl: string
): Promise<LinkedInProfile | null> {
  try {
    const searchParams = new URLSearchParams()
    searchParams.append("url", linkedinUrl)
    searchParams.append("fallback_to_cache", "on-error")
    searchParams.append("use_cache", "if-present")

    const response = await fetch(
      `${PROXYCURL_BASE_URL}/linkedin?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${PROXYCURL_API_KEY}`,
        },
      }
    )

    if (response.status === 404) {
      return null // Profile not found
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Proxycurl profile fetch failed: ${response.status} ${errorText}`
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Proxycurl profile fetch error:", error)
    throw error
  }
}

/**
 * Rate limiting helper - simple delay between requests
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
