const POLL_MS = 15000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Aggregate posts only need the aggregate tables; the last 3 years cover
// every period the posts show
const ANALYTICS_PATH =
    '/api/resourceTables/analytics?lastYears=3&skipEvents=true&skipEnrollment=true&skipTrackedEntities=true'

const runAnalytics = async (client) => {
    const started = await client.post(ANALYTICS_PATH)
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
