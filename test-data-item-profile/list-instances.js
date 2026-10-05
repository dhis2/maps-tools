// Lists the public play instances and the version each one runs. GET only.
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { SUMMARY_DIR } = require('./report.js')

const LIST_URL = 'https://api.im.dhis2.org/instances/public'

const run = async (config = getConfig()) => {
    const list = await (await fetch(LIST_URL)).json()
    const instances = list.flatMap((group) =>
        group.categories.flatMap((category) =>
            category.instances.map((instance) => ({
                name: instance.name,
                category: category.label,
                baseUrl: instance.hostname,
            }))
        )
    )
    const checked = []
    for (const instance of instances) {
        const client = createClient({ ...config, baseUrl: instance.baseUrl })
        try {
            const info = await client.get('/api/system/info.json')
            checked.push({
                ...instance,
                version: info.version,
                reachable: true,
            })
        } catch (err) {
            checked.push({
                ...instance,
                version: null,
                reachable: false,
                error: err.message.slice(0, 120),
            })
        }
        const last = checked.at(-1)
        console.log(
            `${last.name.padEnd(16)} ${(last.version ?? 'unreachable').padEnd(
                16
            )} ${last.baseUrl}`
        )
    }
    fs.mkdirSync(SUMMARY_DIR, { recursive: true })
    fs.writeFileSync(
        path.join(SUMMARY_DIR, 'instances.json'),
        JSON.stringify(
            { checkedAt: new Date().toISOString(), instances: checked },
            null,
            2
        ) + '\n'
    )
    return checked
}

if (require.main === module) {
    run().catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { run }
