import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { enrichProspects } from "@/lib/inngest/enrich-prospects"
import { generateMessages } from "@/lib/inngest/generate-messages"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    enrichProspects,
    generateMessages,
    // Additional Inngest functions will be added here in future sprints
  ],
})
