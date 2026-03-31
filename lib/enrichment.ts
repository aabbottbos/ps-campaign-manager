import { LinkedInProfile } from "./proxycurl"

/**
 * Calculate enrichment confidence score based on match quality
 */
export function calculateConfidenceScore(params: {
  nameSimilarity?: number
  emailMatch: boolean
  companyMatch: boolean
  titleMatch: boolean
}): number {
  let score = 0
  let maxScore = 0

  // Name similarity (0-40 points)
  if (params.nameSimilarity !== undefined) {
    score += params.nameSimilarity * 40
    maxScore += 40
  }

  // Email match (30 points)
  if (params.emailMatch) {
    score += 30
  }
  maxScore += 30

  // Company match (20 points)
  if (params.companyMatch) {
    score += 20
  }
  maxScore += 20

  // Title match (10 points)
  if (params.titleMatch) {
    score += 10
  }
  maxScore += 10

  return maxScore > 0 ? score / maxScore : 0
}

/**
 * Check if two company names match (fuzzy matching)
 */
export function companiesMatch(company1: string, company2: string): boolean {
  if (!company1 || !company2) return false

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .replace(/inc$/i, "")
      .replace(/llc$/i, "")
      .replace(/ltd$/i, "")
      .replace(/corporation$/i, "")
      .replace(/corp$/i, "")
      .replace(/company$/i, "")
      .replace(/co$/i, "")

  const norm1 = normalize(company1)
  const norm2 = normalize(company2)

  // Exact match after normalization
  if (norm1 === norm2) return true

  // One contains the other (for cases like "Google" vs "Google Inc.")
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // But must be at least 50% of the length to avoid false positives
    const minLength = Math.min(norm1.length, norm2.length)
    const maxLength = Math.max(norm1.length, norm2.length)
    return minLength / maxLength >= 0.5
  }

  return false
}

/**
 * Check if two job titles match (fuzzy matching)
 */
export function titlesMatch(title1: string, title2: string): boolean {
  if (!title1 || !title2) return false

  const normalize = (str: string) =>
    str.toLowerCase().replace(/\s+/g, " ").trim()

  const norm1 = normalize(title1)
  const norm2 = normalize(title2)

  // Exact match
  if (norm1 === norm2) return true

  // Contains match (for cases like "Senior Product Manager" vs "Product Manager")
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true
  }

  // Common abbreviations
  const abbreviations: Record<string, string[]> = {
    vp: ["vice president"],
    svp: ["senior vice president"],
    evp: ["executive vice president"],
    ceo: ["chief executive officer"],
    cto: ["chief technology officer"],
    cfo: ["chief financial officer"],
    coo: ["chief operating officer"],
    cmo: ["chief marketing officer"],
    pm: ["product manager", "project manager"],
    swe: ["software engineer"],
  }

  for (const [abbr, expansions] of Object.entries(abbreviations)) {
    if (norm1.includes(abbr) || norm2.includes(abbr)) {
      for (const expansion of expansions) {
        if (norm1.includes(expansion) || norm2.includes(expansion)) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * Validate employment: check if the person currently works at the expected company
 */
export function validateEmployment(
  profile: LinkedInProfile,
  expectedCompany: string
): {
  isCurrentEmployee: boolean
  currentCompany: string | null
  currentTitle: string | null
} {
  if (!profile.experiences || profile.experiences.length === 0) {
    return {
      isCurrentEmployee: false,
      currentCompany: null,
      currentTitle: null,
    }
  }

  // Find current position (one with no end date)
  const currentPosition = profile.experiences.find(
    (exp) => !exp.ends_at || exp.ends_at === null
  )

  if (!currentPosition) {
    // No current position found
    return {
      isCurrentEmployee: false,
      currentCompany: null,
      currentTitle: null,
    }
  }

  const currentCompany = currentPosition.company || null
  const currentTitle = currentPosition.title || null

  const isCurrentEmployee = currentCompany
    ? companiesMatch(currentCompany, expectedCompany)
    : false

  return {
    isCurrentEmployee,
    currentCompany,
    currentTitle,
  }
}

/**
 * Extract location string from profile
 */
export function extractLocation(profile: LinkedInProfile): string | null {
  const parts = [profile.city, profile.state, profile.country].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

/**
 * Determine enrichment status based on validation results
 */
export function determineEnrichmentStatus(
  found: boolean,
  isCurrentEmployee: boolean,
  confidenceScore: number
): "FOUND" | "NOT_FOUND" | "STALE" | "ERROR" {
  if (!found) return "NOT_FOUND"
  if (!isCurrentEmployee) return "STALE"
  if (confidenceScore < 0.5) return "STALE" // Low confidence treated as stale
  return "FOUND"
}
