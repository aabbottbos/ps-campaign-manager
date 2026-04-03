import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "ps-campaign-manager",
  name: "PS Campaign Manager",
  eventKey: process.env.INNGEST_EVENT_KEY,
})
