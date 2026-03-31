import jsforce from "jsforce"

const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID!
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET!
const SALESFORCE_REFRESH_TOKEN = process.env.SALESFORCE_REFRESH_TOKEN!
const SALESFORCE_INSTANCE_URL = process.env.SALESFORCE_INSTANCE_URL!

let cachedConnection: jsforce.Connection | null = null
let tokenExpiresAt: number | null = null

/**
 * Get authenticated Salesforce connection
 * Uses cached connection if token is still valid
 */
export async function getSalesforceConnection(): Promise<jsforce.Connection> {
  // Return cached connection if token is still valid (with 5 min buffer)
  if (cachedConnection && tokenExpiresAt && Date.now() < tokenExpiresAt - 300000) {
    return cachedConnection
  }

  const oauth2 = new jsforce.OAuth2({
    clientId: SALESFORCE_CLIENT_ID,
    clientSecret: SALESFORCE_CLIENT_SECRET,
    redirectUri: "http://localhost:3000/api/salesforce/callback", // Not used with refresh token flow
  })

  const conn = new jsforce.Connection({
    oauth2,
    instanceUrl: SALESFORCE_INSTANCE_URL,
    refreshToken: SALESFORCE_REFRESH_TOKEN,
  })

  // Refresh access token
  await conn.on("refresh", (accessToken, res) => {
    console.log("Salesforce access token refreshed")
    // Token typically expires in 2 hours
    tokenExpiresAt = Date.now() + 7200000
  })

  // Trigger initial token refresh
  await conn.identity()

  cachedConnection = conn
  return conn
}

export interface SalesforceContact {
  Id?: string
  FirstName: string
  LastName: string
  Email?: string
  Phone?: string
  Title?: string
  AccountId?: string
  LinkedIn_Profile__c?: string
  LeadSource?: string
  Description?: string
}

export interface SalesforceAccount {
  Id?: string
  Name: string
}

/**
 * Search for existing contact by email
 */
export async function findContactByEmail(
  email: string
): Promise<SalesforceContact | null> {
  const conn = await getSalesforceConnection()

  const query = `SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId, LinkedIn_Profile__c
                 FROM Contact
                 WHERE Email = '${email.replace(/'/g, "\\'")}'
                 LIMIT 1`

  const result = await conn.query<SalesforceContact>(query)

  return result.records.length > 0 ? result.records[0] : null
}

/**
 * Search for existing contact by name and company
 */
export async function findContactByNameAndCompany(
  firstName: string,
  lastName: string,
  companyName: string
): Promise<SalesforceContact | null> {
  const conn = await getSalesforceConnection()

  const query = `SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId, LinkedIn_Profile__c
                 FROM Contact
                 WHERE FirstName = '${firstName.replace(/'/g, "\\'")}'
                 AND LastName = '${lastName.replace(/'/g, "\\'")}'
                 AND Account.Name = '${companyName.replace(/'/g, "\\'")}'
                 LIMIT 1`

  const result = await conn.query<SalesforceContact>(query)

  return result.records.length > 0 ? result.records[0] : null
}

/**
 * Find or create Account by company name
 */
export async function findOrCreateAccount(
  companyName: string
): Promise<string> {
  const conn = await getSalesforceConnection()

  // Search for existing Account
  const query = `SELECT Id, Name FROM Account WHERE Name = '${companyName.replace(/'/g, "\\'")}'LIMIT 1`

  const result = await conn.query<SalesforceAccount>(query)

  if (result.records.length > 0) {
    return result.records[0].Id!
  }

  // Create new Account
  const newAccount = await conn.sobject("Account").create({
    Name: companyName,
  })

  if (!newAccount.success) {
    throw new Error(`Failed to create Account: ${JSON.stringify(newAccount.errors)}`)
  }

  return newAccount.id
}

/**
 * Create a new Contact in Salesforce
 */
export async function createContact(
  contact: SalesforceContact
): Promise<string> {
  const conn = await getSalesforceConnection()

  const result = await conn.sobject("Contact").create(contact)

  if (!result.success) {
    throw new Error(`Failed to create Contact: ${JSON.stringify(result.errors)}`)
  }

  return result.id
}

/**
 * Update an existing Contact in Salesforce
 */
export async function updateContact(
  contactId: string,
  updates: Partial<SalesforceContact>
): Promise<void> {
  const conn = await getSalesforceConnection()

  const result = await conn.sobject("Contact").update({
    Id: contactId,
    ...updates,
  })

  if (!result.success) {
    throw new Error(`Failed to update Contact: ${JSON.stringify(result.errors)}`)
  }
}

/**
 * Find or create Contact with all enrichment data
 */
export async function syncContact(params: {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  title?: string | null
  company: string
  linkedinUrl?: string | null
}): Promise<{ contactId: string; isNew: boolean }> {
  // Try to find existing contact
  let existingContact: SalesforceContact | null = null

  if (params.email) {
    existingContact = await findContactByEmail(params.email)
  }

  if (!existingContact) {
    existingContact = await findContactByNameAndCompany(
      params.firstName,
      params.lastName,
      params.company
    )
  }

  // Find or create Account
  const accountId = await findOrCreateAccount(params.company)

  const contactData: SalesforceContact = {
    FirstName: params.firstName,
    LastName: params.lastName,
    Email: params.email || undefined,
    Phone: params.phone || undefined,
    Title: params.title || undefined,
    AccountId: accountId,
    LinkedIn_Profile__c: params.linkedinUrl || undefined,
    LeadSource: "LinkedIn Outreach",
    Description: "Enriched via PS Campaign Manager",
  }

  if (existingContact) {
    // Update existing contact (only if new data is better)
    const updates: Partial<SalesforceContact> = {}

    if (params.email && !existingContact.Email) {
      updates.Email = params.email
    }
    if (params.phone && !existingContact.Phone) {
      updates.Phone = params.phone
    }
    if (params.title && !existingContact.Title) {
      updates.Title = params.title
    }
    if (params.linkedinUrl && !existingContact.LinkedIn_Profile__c) {
      updates.LinkedIn_Profile__c = params.linkedinUrl
    }

    if (Object.keys(updates).length > 0) {
      await updateContact(existingContact.Id!, updates)
    }

    return { contactId: existingContact.Id!, isNew: false }
  } else {
    // Create new contact
    const contactId = await createContact(contactData)
    return { contactId, isNew: true }
  }
}
