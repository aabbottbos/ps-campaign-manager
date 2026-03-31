const SALESLOFT_API_KEY = process.env.SALESLOFT_API_KEY!
const SALESLOFT_BASE_URL = "https://api.salesloft.com/v2"

async function salesloftFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${SALESLOFT_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${SALESLOFT_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `SalesLoft API error: ${response.status} ${errorText}`
    )
  }

  return response.json()
}

export interface SalesLoftPerson {
  id?: number
  first_name: string
  last_name: string
  email_address?: string
  phone?: string
  title?: string
  company_name?: string
  linkedin_url?: string
  crm_id?: string // Salesforce Contact ID
}

export interface SalesLoftCadence {
  id: number
  name: string
  shared: boolean
  team_cadence: boolean
}

export interface SalesLoftCadenceMembership {
  id: number
  person_id: number
  cadence_id: number
  currently_on_cadence: boolean
}

/**
 * Search for existing person by email
 */
export async function findPersonByEmail(
  email: string
): Promise<SalesLoftPerson | null> {
  const data = await salesloftFetch(
    `/people.json?email_addresses[]=${encodeURIComponent(email)}`
  )

  return data.data && data.data.length > 0 ? data.data[0] : null
}

/**
 * Search for existing person by LinkedIn URL
 */
export async function findPersonByLinkedInUrl(
  linkedinUrl: string
): Promise<SalesLoftPerson | null> {
  const data = await salesloftFetch(
    `/people.json?linkedin_url=${encodeURIComponent(linkedinUrl)}`
  )

  return data.data && data.data.length > 0 ? data.data[0] : null
}

/**
 * Create a new Person in SalesLoft
 */
export async function createPerson(
  person: SalesLoftPerson
): Promise<number> {
  const data = await salesloftFetch("/people.json", {
    method: "POST",
    body: JSON.stringify(person),
  })

  return data.data.id
}

/**
 * Update an existing Person in SalesLoft
 */
export async function updatePerson(
  personId: number,
  updates: Partial<SalesLoftPerson>
): Promise<void> {
  await salesloftFetch(`/people/${personId}.json`, {
    method: "PUT",
    body: JSON.stringify(updates),
  })
}

/**
 * Find or create Person with all enrichment data
 */
export async function syncPerson(params: {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  title?: string | null
  company: string
  linkedinUrl?: string | null
  salesforceContactId?: string | null
}): Promise<{ personId: number; isNew: boolean }> {
  // Try to find existing person
  let existingPerson: SalesLoftPerson | null = null

  if (params.email) {
    existingPerson = await findPersonByEmail(params.email)
  }

  if (!existingPerson && params.linkedinUrl) {
    existingPerson = await findPersonByLinkedInUrl(params.linkedinUrl)
  }

  const personData: SalesLoftPerson = {
    first_name: params.firstName,
    last_name: params.lastName,
    email_address: params.email || undefined,
    phone: params.phone || undefined,
    title: params.title || undefined,
    company_name: params.company,
    linkedin_url: params.linkedinUrl || undefined,
    crm_id: params.salesforceContactId || undefined,
  }

  if (existingPerson) {
    // Update existing person (only if new data is better)
    const updates: Partial<SalesLoftPerson> = {}

    if (params.email && !existingPerson.email_address) {
      updates.email_address = params.email
    }
    if (params.phone && !existingPerson.phone) {
      updates.phone = params.phone
    }
    if (params.title && !existingPerson.title) {
      updates.title = params.title
    }
    if (params.linkedinUrl && !existingPerson.linkedin_url) {
      updates.linkedin_url = params.linkedinUrl
    }
    if (params.salesforceContactId && !existingPerson.crm_id) {
      updates.crm_id = params.salesforceContactId
    }

    if (Object.keys(updates).length > 0) {
      await updatePerson(existingPerson.id!, updates)
    }

    return { personId: existingPerson.id!, isNew: false }
  } else {
    // Create new person
    const personId = await createPerson(personData)
    return { personId, isNew: true }
  }
}

/**
 * Add person to a cadence
 */
export async function addToCadence(
  personId: number,
  cadenceId: number
): Promise<number> {
  const data = await salesloftFetch("/cadence_memberships.json", {
    method: "POST",
    body: JSON.stringify({
      person_id: personId,
      cadence_id: cadenceId,
    }),
  })

  return data.data.id
}

/**
 * Get list of available cadences
 */
export async function getCadences(): Promise<SalesLoftCadence[]> {
  const data = await salesloftFetch("/cadences.json")
  return data.data || []
}

/**
 * Log activity for a person
 */
export async function logActivity(params: {
  personId: number
  subject: string
  body: string
}): Promise<void> {
  await salesloftFetch("/activities.json", {
    method: "POST",
    body: JSON.stringify({
      person_id: params.personId,
      activity_type: "message",
      subject: params.subject,
      body: params.body,
    }),
  })
}
