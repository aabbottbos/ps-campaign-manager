import { inngest } from "./client"
import { prisma } from "@/lib/prisma"
import { syncContact } from "@/lib/salesforce"
import { syncPerson, addToCadence } from "@/lib/salesloft"

export const syncCRM = inngest.createFunction(
  {
    id: "campaign-sync-crm",
    name: "Sync Campaign to CRM",
    concurrency: {
      limit: 2, // Process up to 2 campaigns concurrently
    },
    retries: 3,
  },
  { event: "campaign/sync-crm" },
  async ({ event, step }) => {
    const { campaignId } = event.data

    // Get campaign and approved prospects
    const campaign = await step.run("fetch-campaign", async () => {
      return prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          prospects: {
            where: {
              messageStatus: "APPROVED",
              crmSyncStatus: "NOT_SYNCED",
            },
          },
        },
      })
    })

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    // Check if CRM sync is enabled for this campaign
    if (!campaign.enableCrmSync) {
      // Skip CRM sync, proceed directly to sending or complete
      await step.run("skip-crm-sync", async () => {
        return prisma.campaign.update({
          where: { id: campaignId },
          data: { status: "SENDING" }
        })
      })

      return {
        message: "CRM sync disabled for this campaign",
        skipped: true
      }
    }

    if (campaign.prospects.length === 0) {
      return { message: "No approved prospects to sync" }
    }

    // Update campaign status to CRM_SYNCING
    await step.run("update-campaign-status-syncing", async () => {
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "CRM_SYNCING" },
      })
    })

    let syncedCount = 0
    let errorCount = 0
    let salesforceCreated = 0
    let salesforceUpdated = 0
    let salesloftCreated = 0
    let salesloftUpdated = 0
    let cadenceEnrolled = 0

    // Process each prospect
    for (const prospect of campaign.prospects) {
      await step.run(`sync-prospect-${prospect.id}`, async () => {
        try {
          // Mark as syncing
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: { crmSyncStatus: "SYNCING" },
          })

          let salesforceContactId: string | null = null
          let salesloftPersonId: number | null = null
          let salesloftCadenceEnrollmentId: number | null = null

          // Sync to Salesforce
          try {
            const sfResult = await syncContact({
              firstName: prospect.firstName!,
              lastName: prospect.lastName!,
              email: prospect.email,
              phone: prospect.phone,
              title: prospect.currentTitle,
              company: prospect.currentCompany || prospect.company!,
              linkedinUrl: prospect.linkedinUrl,
            })

            salesforceContactId = sfResult.contactId
            if (sfResult.isNew) {
              salesforceCreated++
            } else {
              salesforceUpdated++
            }
          } catch (error) {
            console.error(`Salesforce sync error for prospect ${prospect.id}:`, error)
            // Continue to SalesLoft even if Salesforce fails
          }

          // Sync to SalesLoft
          try {
            const slResult = await syncPerson({
              firstName: prospect.firstName!,
              lastName: prospect.lastName!,
              email: prospect.email,
              phone: prospect.phone,
              title: prospect.currentTitle,
              company: prospect.currentCompany || prospect.company!,
              linkedinUrl: prospect.linkedinUrl,
              salesforceContactId,
            })

            salesloftPersonId = slResult.personId
            if (slResult.isNew) {
              salesloftCreated++
            } else {
              salesloftUpdated++
            }

            // Enroll in cadence if specified
            if (campaign.salesloftCadenceId && salesloftPersonId) {
              const enrollmentId = await addToCadence(
                salesloftPersonId,
                parseInt(campaign.salesloftCadenceId)
              )
              salesloftCadenceEnrollmentId = enrollmentId
              cadenceEnrolled++
            }
          } catch (error) {
            console.error(`SalesLoft sync error for prospect ${prospect.id}:`, error)
            // If SalesLoft fails, we still have the Salesforce record
          }

          // Update prospect with CRM IDs
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              salesforceContactId,
              salesloftPersonId: salesloftPersonId?.toString(),
              salesloftCadenceEnrollmentId: salesloftCadenceEnrollmentId?.toString(),
              crmSyncStatus: "SYNCED",
            },
          })

          syncedCount++
        } catch (error) {
          console.error(`Error syncing prospect ${prospect.id}:`, error)

          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              crmSyncStatus: "ERROR",
              crmSyncError:
                error instanceof Error ? error.message : "Unknown error",
            },
          })

          errorCount++
        }
      })
    }

    // Update campaign status to CRM_SYNCED
    await step.run("update-campaign-status-synced", async () => {
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "CRM_SYNCED" },
      })
    })

    return {
      campaignId,
      totalProcessed: campaign.prospects.length,
      syncedCount,
      errorCount,
      salesforce: {
        created: salesforceCreated,
        updated: salesforceUpdated,
      },
      salesloft: {
        created: salesloftCreated,
        updated: salesloftUpdated,
        cadenceEnrolled,
      },
    }
  }
)
