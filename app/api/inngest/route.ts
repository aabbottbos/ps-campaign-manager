import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { enrichProspects } from "@/lib/inngest/enrich-prospects"
import { generateMessages } from "@/lib/inngest/generate-messages"
import { generateAiPersonalizedMessages } from "@/lib/inngest/generate-ai-personalized-messages"
import { copyFixedMessage } from "@/lib/inngest/copy-fixed-message"
import { syncCRM } from "@/lib/inngest/sync-crm"
import { sendMessages } from "@/lib/inngest/send-messages"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    enrichProspects,
    generateMessages,
    generateAiPersonalizedMessages,
    copyFixedMessage,
    syncCRM,
    sendMessages,
  ],
})
