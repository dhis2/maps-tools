const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { OUTPUT_DIR, POST_NUMBERS, loadContext } = require('./context.js')
const { assertWritable } = require('./guard.js')
const { loadPasswords, savePasswords } = require('./shared/users.js')
const { runAnalytics } = require('./steps/analytics.js')
const { buildContent, saveContent } = require('./steps/content.js')
const { buildData, importData } = require('./steps/data.js')
const {
    applyOrgUnitAttributeValues,
    applySystemSettings,
    buildMetadata,
    buildOrgUnitAttributeValues,
    buildSystemSettings,
    importMetadata,
} = require('./steps/metadata.js')

const writeOutput = (name, data) => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(path.join(OUTPUT_DIR, name), JSON.stringify(data, null, 4))
}

const main = async () => {
    const config = getConfig(process.argv.slice(2), POST_NUMBERS)
    const client = createClient(config)
    const loaded = await loadContext(client, config)
    const passwords = loadPasswords(OUTPUT_DIR)
    const has = (step) => config.steps.includes(step)

    const metadata = has('metadata') ? buildMetadata(loaded, passwords) : null
    const systemSettings = has('metadata') ? buildSystemSettings(loaded) : null
    const orgUnitAttributeValues = has('metadata')
        ? buildOrgUnitAttributeValues(loaded)
        : null
    const data = has('data') ? buildData(loaded) : null
    const content = has('content') ? buildContent(loaded) : null

    if (config.dryRun) {
        const withoutPasswords = metadata && {
            ...metadata,
            users: metadata.users.map(({ password, ...user }) => user),
        }
        writeOutput('payload.json', {
            systemSettings,
            orgUnitAttributeValues,
            metadata: withoutPasswords,
            data,
            content,
        })
        console.log(
            `Dry run for posts ${config.posts.join(
                ', '
            )}: wrote output/payload.json, nothing saved`
        )
        return
    }

    assertWritable(config.baseUrl)
    savePasswords(OUTPUT_DIR, config.baseUrl, passwords)
    const summary = {
        baseUrl: config.baseUrl,
        ranAt: new Date().toISOString(),
        runDate: config.runDate.toISOString().slice(0, 10),
        posts: config.posts,
        steps: config.steps,
    }

    if (systemSettings) {
        await applySystemSettings(client, systemSettings)
        summary.systemSettings = systemSettings
    }
    if (metadata) {
        summary.metadata = await importMetadata(client, metadata)
        console.log(`Metadata: ${JSON.stringify(summary.metadata)}`)
    }
    if (orgUnitAttributeValues) {
        summary.orgUnitAttributeValues = await applyOrgUnitAttributeValues(
            client,
            orgUnitAttributeValues
        )
    }
    if (data) {
        summary.data = await importData(client, data)
    }
    if (has('analytics')) {
        summary.analyticsSeconds = await runAnalytics(client, {
            withEvents: loaded.posts.some((post) => post.eventAnalytics),
        })
        console.log(`Analytics done in ${summary.analyticsSeconds} s`)
    }
    if (content) {
        summary.links = await saveContent(client, config, passwords, content)
        summary.links.forEach(({ name, url }) => console.log(`${name}: ${url}`))
    }

    writeOutput('import-summary.json', summary)
}

main().catch((err) => {
    console.error(err.message)
    process.exitCode = 1
})
