const fs = require('node:fs')
const path = require('node:path')
const { buildMaps, cleanLayers } = require('./clean.js')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { MAP_FIELDS } = require('./fields.js')
const { assertWritable } = require('./guard.js')
const { SCENARIOS } = require('./scenarios.js')

const OUTPUT_DIR = path.join(__dirname, 'output')

const writeOutput = (name, data) => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(path.join(OUTPUT_DIR, name), JSON.stringify(data, null, 4))
}

const readSnapshot = (source) => {
    const file = path.join(__dirname, 'input', source, 'source-maps.json')
    return JSON.parse(fs.readFileSync(file, 'utf8'))
}

const getServerMinor = async (client) => {
    const { version } = await client.get('/api/system/info')
    return Number(version.split('.')[1])
}

const mapExists = (client, id) =>
    client.get(`/api/maps/${id}?fields=id`).then(
        () => true,
        (err) => {
            if (err.status === 404) {
                return false
            }
            throw err
        }
    )

// Saved through /api/maps, as maps-app does, so the server stores the
// layers the same way as for maps saved in the app
const saveMap = async (client, map) => {
    if (await mapExists(client, map.id)) {
        await client.put(`/api/maps/${map.id}`, map)
    } else {
        await client.post('/api/maps', map)
    }
    await client.post(`/api/sharing?type=map&id=${map.id}`, {
        object: {
            publicAccess: 'r-------',
            externalAccess: false,
            userAccesses: [],
            userGroupAccesses: [],
        },
    })
}

// Names of org units and programs differ between servers, so only ids count
const withoutNames = (value) => {
    if (Array.isArray(value)) {
        return value.map(withoutNames)
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value)
                .filter((key) => key !== 'name' || !('id' in value))
                .sort()
                .map((key) => [key, withoutNames(value[key])])
        )
    }
    return value
}

// Reads each map back as maps-app loads it and compares its layers with
// what was sent
const verify = async (client, maps) => {
    const fields = encodeURIComponent(MAP_FIELDS)
    const results = []
    for (const map of maps) {
        const saved = await client.get(`/api/maps/${map.id}?fields=${fields}`)
        const sent = JSON.stringify(withoutNames(map.mapViews))
        const read = JSON.stringify(withoutNames(cleanLayers(saved.mapViews)))
        results.push({
            id: map.id,
            name: map.name,
            layersMatch: sent === read,
            basemap: saved.basemaps?.[0]?.id ?? saved.basemap,
        })
    }
    return results
}

const main = async () => {
    const config = getConfig()
    const client = createClient(config)

    const snapshot = readSnapshot(config.source)
    const serverMinor = await getServerMinor(client)
    const maps = buildMaps(snapshot, SCENARIOS, { serverMinor })

    if (config.dryRun) {
        writeOutput('payload.json', maps)
        console.log(
            `Dry run: wrote ${maps.length} maps to output/payload.json, nothing saved`
        )
        return
    }

    assertWritable(config.baseUrl)

    for (const map of maps) {
        await saveMap(client, map)
    }
    const results = await verify(client, maps)

    writeOutput('import-summary.json', {
        baseUrl: config.baseUrl,
        ranAt: new Date().toISOString(),
        source: { folder: config.source, baseUrl: snapshot.baseUrl },
        maps: results,
    })

    results.forEach(({ id, name }) =>
        console.log(`${name}: ${config.baseUrl}/dhis-web-maps/#/${id}`)
    )
    const mismatches = results.filter(({ layersMatch }) => !layersMatch)
    if (mismatches.length) {
        console.error(
            `Layers read back differ from what was sent: ${mismatches
                .map(({ name }) => name)
                .join(', ')}`
        )
        process.exitCode = 1
    }
}

main().catch((err) => {
    console.error(err.message)
    process.exitCode = 1
})
