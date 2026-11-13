// Reads the source maps from a server and writes them, as maps-app loads
// them, to input/<source>/source-maps.json. Only reads from the server.
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { MAP_FIELDS } = require('./fields.js')
const { SCENARIOS } = require('./scenarios.js')

const main = async () => {
    const config = getConfig()
    const client = createClient(config)

    const { version } = await client.get('/api/system/info')
    const fields = encodeURIComponent(MAP_FIELDS)
    const maps = []
    for (const { sourceId } of SCENARIOS) {
        maps.push(await client.get(`/api/maps/${sourceId}?fields=${fields}`))
    }

    const dir = path.join(__dirname, 'input', config.source)
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'source-maps.json')
    fs.writeFileSync(
        file,
        JSON.stringify(
            {
                baseUrl: config.baseUrl,
                version,
                fetchedAt: new Date().toISOString(),
                maps,
            },
            null,
            4
        ) + '\n'
    )
    console.log(
        `Wrote ${maps.length} maps from ${
            config.baseUrl
        } (${version}) to ${path.relative(__dirname, file)}`
    )
}

main().catch((err) => {
    console.error(err.message)
    process.exitCode = 1
})
