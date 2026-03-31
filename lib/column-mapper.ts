export interface ColumnMapping {
  firstName?: string
  lastName?: string
  email?: string
  company?: string
  title?: string
  phone?: string
}

export const REQUIRED_FIELDS = ['firstName', 'lastName', 'company'] as const
export const OPTIONAL_FIELDS = ['email', 'title', 'phone'] as const
export const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const

export type MappingField = typeof ALL_FIELDS[number]

// Patterns for auto-detecting column names
const FIELD_PATTERNS: Record<MappingField, RegExp[]> = {
  firstName: [
    /^first[\s_-]?name$/i,
    /^fname$/i,
    /^given[\s_-]?name$/i,
    /^first$/i,
  ],
  lastName: [
    /^last[\s_-]?name$/i,
    /^lname$/i,
    /^surname$/i,
    /^family[\s_-]?name$/i,
    /^last$/i,
  ],
  email: [
    /^email$/i,
    /^email[\s_-]?address$/i,
    /^e[\s_-]?mail$/i,
    /^contact[\s_-]?email$/i,
  ],
  company: [
    /^company$/i,
    /^company[\s_-]?name$/i,
    /^organization$/i,
    /^org$/i,
    /^employer$/i,
    /^business$/i,
  ],
  title: [
    /^title$/i,
    /^job[\s_-]?title$/i,
    /^position$/i,
    /^role$/i,
    /^job$/i,
  ],
  phone: [
    /^phone$/i,
    /^phone[\s_-]?number$/i,
    /^mobile$/i,
    /^tel$/i,
    /^telephone$/i,
    /^contact[\s_-]?number$/i,
  ],
}

/**
 * Auto-detect column mappings based on header names
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}

  for (const field of ALL_FIELDS) {
    const patterns = FIELD_PATTERNS[field]

    for (const header of headers) {
      const normalizedHeader = header.trim()

      // Check if header matches any pattern for this field
      const isMatch = patterns.some(pattern => pattern.test(normalizedHeader))

      if (isMatch) {
        mapping[field] = header // Store the original header name
        break // Found a match, move to next field
      }
    }
  }

  return mapping
}

/**
 * Validate that required fields are mapped
 */
export function validateMapping(mapping: ColumnMapping): {
  valid: boolean
  missingFields: string[]
} {
  const missingFields: string[] = []

  for (const field of REQUIRED_FIELDS) {
    if (!mapping[field]) {
      missingFields.push(field)
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Extract mapped values from a row
 */
export function extractMappedValues(
  row: Record<string, string>,
  mapping: ColumnMapping
): {
  firstName: string | null
  lastName: string | null
  email: string | null
  company: string | null
  title: string | null
  phone: string | null
} {
  return {
    firstName: mapping.firstName ? (row[mapping.firstName] || null) : null,
    lastName: mapping.lastName ? (row[mapping.lastName] || null) : null,
    email: mapping.email ? (row[mapping.email] || null) : null,
    company: mapping.company ? (row[mapping.company] || null) : null,
    title: mapping.title ? (row[mapping.title] || null) : null,
    phone: mapping.phone ? (row[mapping.phone] || null) : null,
  }
}

/**
 * Get display label for a field
 */
export function getFieldLabel(field: MappingField): string {
  const labels: Record<MappingField, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    company: 'Company',
    title: 'Title / Role',
    phone: 'Phone',
  }
  return labels[field]
}

/**
 * Check if a field is required
 */
export function isRequiredField(field: MappingField): boolean {
  return REQUIRED_FIELDS.includes(field as any)
}
