const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { assertWritable } = require('./guard.js')
const { buildMetadata } = require('./payload.js')

const OUTPUT_DIR = path.join(__dirname, 'output')

const writeOutput = (name, data) => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(path.join(OUTPUT_DIR, name), JSON.stringify(data, null, 4))
}

// The parent's children are districts, so chiefdoms are two levels below it
const getChiefdomLevel = async (client, parentId) => {
    const parent = await client.get(
        `/api/organisationUnits/${parentId}?fields=id,name,level`
    )
    const level = parent.level + 2
    const { organisationUnitLevels } = await client.get(
        `/api/organisationUnitLevels?filter=level:eq:${level}&fields=id,name,level`
    )
    if (!organisationUnitLevels.length) {
        throw new Error(`No org unit level ${level} below ${parent.name}`)
    }
    return { parent, chiefdomLevel: organisationUnitLevels[0] }
}

const importOrganisationUnits = async (client, organisationUnits) => {
    const report = await client.post(
        '/api/metadata?importStrategy=CREATE_AND_UPDATE&atomicMode=ALL',
        { organisationUnits }
    )
    // The status can be OK while objects were ignored
    const { stats } = report.response
    if (report.status !== 'OK' || stats.ignored > 0) {
        throw new Error(`Org unit import failed: ${JSON.stringify(report)}`)
    }
    return stats
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
// layer's org unit selection the same way as for maps saved in the app
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

const verify = async (client, { district, chiefdoms, chiefdomLevel, maps }) => {
    const features = await client.get(
        `/api/geoFeatures?ou=ou:${district.id};LEVEL-${chiefdomLevel.id}&displayProperty=NAME`
    )
    const names = new Set(features.map((feature) => feature.na))
    const missing = chiefdoms
        .filter(({ name }) => !names.has(name))
        .map(({ name }) => name)

    const { mapViews } = await client.get(
        `/api/maps/${maps[0].id}?fields=mapViews[organisationUnits[id],organisationUnitLevels,labels]`
    )

    return { features: features.length, missing, labelsMapView: mapViews[0] }
}

const main = async () => {
    const config = getConfig()
    const client = createClient(config)

    const { parent, chiefdomLevel } = await getChiefdomLevel(
        client,
        config.parentId
    )
    const metadata = buildMetadata({
        parentId: parent.id,
        chiefdomLevelId: chiefdomLevel.id,
    })

    if (config.dryRun) {
        writeOutput('payload.json', metadata)
        console.log('Dry run: wrote output/payload.json, nothing imported')
        return
    }

    assertWritable(config.baseUrl)

    const stats = await importOrganisationUnits(client, [
        metadata.district,
        ...metadata.chiefdoms,
    ])
    await Promise.all(metadata.maps.map((map) => saveMap(client, map)))
    const result = await verify(client, { ...metadata, chiefdomLevel })

    const summary = {
        baseUrl: config.baseUrl,
        ranAt: new Date().toISOString(),
        parent: { id: parent.id, name: parent.name },
        district: { id: metadata.district.id, name: metadata.district.name },
        importStats: stats,
        maps: metadata.maps.map(({ id, name }) => ({ id, name })),
        verification: result,
    }
    writeOutput('import-summary.json', summary)

    console.log(
        `District "${metadata.district.name}" (${metadata.district.id}) under ${parent.name}`
    )
    console.log(
        `Org unit features at ${chiefdomLevel.name} level: ${result.features}`
    )
    metadata.maps.forEach(({ id, name }) =>
        console.log(`Map "${name}": ${config.baseUrl}/dhis-web-maps/#/${id}`)
    )

    if (result.missing.length) {
        console.error(`Missing from org unit features: ${result.missing}`)
        process.exitCode = 1
    }
}

main().catch((err) => {
    console.error(err.message)
    process.exitCode = 1
})
