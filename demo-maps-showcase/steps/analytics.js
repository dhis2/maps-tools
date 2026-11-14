const POLL_MS = 15000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The last 4 years cover every period the posts show. Event and enrollment
// tables only when a selected post maps events or program indicators.
const analyticsPath = (withEvents) =>
    `/api/resourceTables/analytics?lastYears=4&skipTrackedEntities=true${
        withEvents ? '' : '&skipEvents=true&skipEnrollment=true'
    }`

const runAnalytics = async (client, { withEvents }) => {
    const started = await client.post(analyticsPath(withEvents))
    const endpoint = started.response.relativeNotifierEndpoint
    const startedAt = Date.now()
    for (;;) {
        await sleep(POLL_MS)
        const notifications = await client.get(endpoint)
        const latest = notifications[0]
        if (latest?.level === 'ERROR') {
            throw new Error(`Analytics failed: ${latest.message}`)
        }
        if (notifications.some(({ completed }) => completed)) {
            return Math.round((Date.now() - startedAt) / 1000)
        }
        console.log(`Analytics: ${latest?.message ?? 'waiting'}`)
    }
}

module.exports = { runAnalytics }
