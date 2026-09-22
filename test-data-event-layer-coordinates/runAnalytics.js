// Kicks off DHIS2 analytics table generation (skipAggregate=true - only
// event/tracker analytics, not the slower aggregate data tables) and polls
// until the job completes, printing progress messages as they come in.
// verify.js needs this to have run at least once for a program before its
// events show up in analytics queries at all (DHIS2 error code E7144).
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { createDebugLog, DEBUG_LOG_PATH } = require('./debugLog.js')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const HEARTBEAT_MS = 60 * 1000

// DHIS2 returns task entries newest-first (confirmed empirically - the
// "Analytics tables updated"/completed:true entry was entries[0], with the
// process-start message last) rather than the chronological/append order
// assumed earlier. Find the true latest by timestamp instead of trusting
// array position either way.
const getLatestEntry = (entries) =>
    entries.reduce(
        (latest, entry) =>
            !latest || entry.time > latest.time ? entry : latest,
        null
    )

// Fallback when the POST response didn't include a Location header to
// parse a job id from: picks whichever job has the most recent entry.
const getMostRecentTaskEntries = async (client) => {
    const tasksByJob = await client.get(
        '/api/system/tasks/ANALYTICS_TABLE.json'
    )
    const jobIds = Object.keys(tasksByJob)
    if (!jobIds.length) {
        return []
    }
    const latestJobId = jobIds.reduce((latest, jobId) => {
        const latestTime = getLatestEntry(tasksByJob[latest])?.time ?? ''
        const thisTime = getLatestEntry(tasksByJob[jobId])?.time ?? ''
        return thisTime > latestTime ? jobId : latest
    })
    return tasksByJob[latestJobId]
}

const run = async () => {
    const config = getConfig()
    const client = createClient(config)

    console.log(`Target: ${config.baseUrl} (user: ${config.username})`)
    console.log(
        'Starting analytics table generation (skipAggregate=true - event/tracker tables only)...'
    )
    const debugLog = createDebugLog(config.debug)
    if (config.debug) {
        console.log(`[debug] writing details to ${DEBUG_LOG_PATH}`)
    }

    const { json, jobId } = await client.postAnalytics()
    debugLog('postAnalytics response body:', json)
    console.log(
        jobId
            ? `Job id: ${jobId}`
            : 'Job id not found in response - polling most recent task.'
    )

    const maxWaitMs = config.maxWaitMinutes * 60 * 1000
    const pollMs = config.pollSeconds * 1000
    const start = Date.now()
    let lastMessage = null
    let lastPrintedAt = Date.now()

    while (Date.now() - start < maxWaitMs) {
        const entries = jobId
            ? await client.get(
                  `/api/system/tasks/ANALYTICS_TABLE/${jobId}.json`
              )
            : await getMostRecentTaskEntries(client)

        debugLog(`\n=== poll at ${new Date().toISOString()} ===`)
        debugLog('raw task entries:', entries)

        const latest = getLatestEntry(entries)
        if (latest && latest.message !== lastMessage) {
            console.log(`[${latest.time}] ${latest.message}`)
            lastMessage = latest.message
            lastPrintedAt = Date.now()
        } else if (Date.now() - lastPrintedAt >= HEARTBEAT_MS) {
            // Nothing new to report, but printing occasionally proves the
            // script is still alive and polling rather than stuck.
            console.log(
                `... still waiting${
                    lastMessage ? ` (last: ${lastMessage})` : ''
                }`
            )
            lastPrintedAt = Date.now()
        }

        if (latest?.completed) {
            const failed = latest.level === 'ERROR'
            if (failed) {
                console.error(
                    'Analytics run finished with an error - see message above.'
                )
                process.exitCode = 1
            } else {
                console.log('Analytics tables are up to date.')
            }
            return
        }

        await sleep(pollMs)
    }

    console.error(
        `Timed out after ${config.maxWaitMinutes} minutes waiting for analytics to complete. It may still be running - check ${config.baseUrl}/api/system/tasks/ANALYTICS_TABLE, or re-run with --maxWaitMinutes=<N>.`
    )
    process.exitCode = 1
}

run().catch((err) => {
    console.error(err)
    process.exitCode = 1
})
