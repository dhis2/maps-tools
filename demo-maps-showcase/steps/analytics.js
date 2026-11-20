const POLL_MS = 15000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The last 4 years cover every period the posts show, but such a run keeps
// the columns of existing tables: a data element added to an existing program
// needs a full run. Event and enrollment tables only when a selected post
// maps events or program indicators; tracked entity tables when it has
// tracked entity layers, which maps-app reads from tracked entity analytics.
const analyticsPath = ({ full, withEvents, withTrackedEntities }) =>
    `/api/resourceTables/analytics?${full ? '' : 'lastYears=4'}${
        withEvents ? '' : '&skipEvents=true&skipEnrollment=true'
    }${withTrackedEntities ? '' : '&skipTrackedEntities=true'}`

const runAnalytics = async (client, options) => {
    const started = await client.post(analyticsPath(options))
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
