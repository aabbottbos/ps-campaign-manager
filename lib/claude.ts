import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SYSTEM_PROMPT = `You are a sales copywriter for Product School. Your job is to write personalized LinkedIn outreach messages that feel human, relevant, and non-spammy.

Key principles:
- Lead with something specific to the PROSPECT, not the pitch. Reference their role, recent work, company, or something from their LinkedIn profile.
- Keep it conversational — write like a real person, not a marketing email.
- The value proposition should feel like a natural extension of the personalization, not a pivot.
- End with a low-friction CTA (not "book a call" — something lighter like "would love to share more" or "curious if this resonates").
- Never use filler phrases like "I hope this message finds you well" or "I came across your profile."
- Never use exclamation marks more than once.
- Do not use emojis.
- Vary your openings — do not start every message the same way.`

export interface GenerateMessageParams {
  campaignDescription: string
  messageTemplate?: string | null
  outreachType: "CONNECT" | "INMAIL"
  prospect: {
    firstName: string
    lastName: string
    currentTitle?: string | null
    currentCompany?: string | null
    linkedinHeadline?: string | null
    linkedinSummary?: string | null
    linkedinLocation?: string | null
  }
}

export interface GenerateMessageResult {
  message: string
  characterCount: number
  wasRetried: boolean
}

/**
 * Construct the user prompt for Claude message generation
 */
function buildUserPrompt(params: GenerateMessageParams): string {
  const { campaignDescription, messageTemplate, outreachType, prospect } = params

  const characterLimit = outreachType === "CONNECT" ? 300 : 1900
  const recommendedLength =
    outreachType === "CONNECT" ? "250-290 characters" : "800-1200 characters"

  let prompt = `Write a personalized LinkedIn ${
    outreachType === "CONNECT" ? "connection request" : "InMail"
  } message for the following prospect.

**Character Limit**: ${characterLimit} characters MAXIMUM. This is a hard limit — the message will be rejected if it exceeds this. For Connect requests, aim for ${recommendedLength}.

**Campaign Context**:
${campaignDescription}`

  if (messageTemplate) {
    prompt += `

**Additional Instructions**:
${messageTemplate}`
  }

  prompt += `

**Prospect Profile**:
- Name: ${prospect.firstName} ${prospect.lastName}`

  if (prospect.currentTitle) {
    prompt += `
- Current Title: ${prospect.currentTitle}`
  }

  if (prospect.currentCompany) {
    prompt += `
- Current Company: ${prospect.currentCompany}`
  }

  if (prospect.linkedinHeadline) {
    prompt += `
- LinkedIn Headline: ${prospect.linkedinHeadline}`
  }

  if (prospect.linkedinLocation) {
    prompt += `
- Location: ${prospect.linkedinLocation}`
  }

  if (prospect.linkedinSummary && prospect.linkedinSummary.length > 0) {
    // Limit summary to first 500 chars to avoid token bloat
    const summary =
      prospect.linkedinSummary.length > 500
        ? prospect.linkedinSummary.substring(0, 500) + "..."
        : prospect.linkedinSummary
    prompt += `
- Summary: ${summary}`
  }

  prompt += `

Respond with ONLY the message text. No subject line, no salutation prefix, no quotes, no explanation. Just the message body ready to paste.`

  return prompt
}

/**
 * Generate a personalized LinkedIn message using Claude
 */
export async function generateMessage(
  params: GenerateMessageParams
): Promise<GenerateMessageResult> {
  const characterLimit = params.outreachType === "CONNECT" ? 300 : 1900
  let wasRetried = false

  const userPrompt = buildUserPrompt(params)

  // First attempt
  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  })

  let message = extractMessageText(response)
  let characterCount = message.length

  // If over limit, retry with explicit shortening instruction
  if (characterCount > characterLimit) {
    wasRetried = true

    const retryPrompt = `The message you generated is ${characterCount} characters, but the limit is ${characterLimit}. Rewrite it to be under ${characterLimit} characters while keeping the personalization and core value prop. Respond with ONLY the message text.`

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "assistant",
          content: message,
        },
        {
          role: "user",
          content: retryPrompt,
        },
      ],
    })

    message = extractMessageText(response)
    characterCount = message.length
  }

  return {
    message,
    characterCount,
    wasRetried,
  }
}

/**
 * Extract the text content from Claude's response
 */
function extractMessageText(
  response: Anthropic.Messages.Message
): string {
  const textContent = response.content.find((block) => block.type === "text")
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in Claude response")
  }

  return textContent.text.trim()
}

/**
 * Validate message length
 */
export function validateMessageLength(
  message: string,
  outreachType: "CONNECT" | "INMAIL"
): {
  valid: boolean
  characterCount: number
  characterLimit: number
  exceededBy?: number
} {
  const characterLimit = outreachType === "CONNECT" ? 300 : 1900
  const characterCount = message.length

  return {
    valid: characterCount <= characterLimit,
    characterCount,
    characterLimit,
    exceededBy:
      characterCount > characterLimit
        ? characterCount - characterLimit
        : undefined,
  }
}
