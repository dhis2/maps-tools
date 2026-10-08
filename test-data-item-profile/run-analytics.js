// Starts the aggregate analytics tables job and waits for it to finish.
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { assertWritable } = require('./guard.js')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const HEARTBEAT_MS = 60 * 1000

// Task entries come newest first, but find the latest by time anyway.
const latestEntry = (entries) =>
    (entries ?? []).reduce(
        (latest, entry) =>
            !latest || entry.time > latest.time ? entry : latest,
        null
    )

// Without a job id, follow the job with the most recent entry.
const mostRecentJobEntries = async (client) => {
    const tasksByJob = await client.get(
        '/api/system/tasks/ANALYTICS_TABLE.json'
    )
    const jobIds = Object.keys(tasksByJob)
    if (!jobIds.length) {
        return []
    }
    const latestJobId = jobIds.reduce((latest, jobId) =>
        (latestEntry(tasksByJob[jobId])?.time ?? '') >
        (latestEntry(tasksByJob[latest])?.time ?? '')
            ? jobId
            : latest
    )
    return tasksByJob[latestJobId]
}

const run = async (config = getConfig()) => {
    assertWritable(config.baseUrl)
    const client = createClient(config)
    console.log(
        `Target: ${config.baseUrl}. Starting aggregate analytics tables.`
    )

    const started = Date.now()
    const { jobId } = await client.postAnalytics()
    console.log(jobId ? `Job ${jobId}` : 'No job id: following the latest job.')

    const maxWaitMs = config.maxWaitMinutes * 60 * 1000
    let lastMessage = null
    let lastPrintedAt = Date.now()

    while (Date.now() - started < maxWaitMs) {
        await sleep(config.pollSeconds * 1000)
        const entries = jobId
            ? await client.get(
                  `/api/system/tasks/ANALYTICS_TABLE/${jobId}.json`
              )
            : await mostRecentJobEntries(client)
        const latest = latestEntry(entries)

        if (latest && latest.message !== lastMessage) {
            console.log(`[${latest.time}] ${latest.message}`)
            lastMessage = latest.message
            lastPrintedAt = Date.now()
        } else if (Date.now() - lastPrintedAt >= HEARTBEAT_MS) {
            console.log(
                `... still waiting (${lastMessage ?? 'no message yet'})`
            )
            lastPrintedAt = Date.now()
        }

        if (latest?.completed) {
            const minutes = ((Date.now() - started) / 60000).toFixed(1)
            if (latest.level === 'ERROR') {
                throw new Error(
                    `Analytics failed after ${minutes} min: ${latest.message}`
                )
            }
            console.log(`Analytics tables done in ${minutes} min.`)
            return { minutes: Number(minutes) }
        }
    }
    throw new Error(
        `Analytics still running after ${config.maxWaitMinutes} min. Check ${config.baseUrl}/api/system/tasks/ANALYTICS_TABLE, or pass --maxWaitMinutes.`
    )
}

if (require.main === module) {
    run().catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { latestEntry, run }
