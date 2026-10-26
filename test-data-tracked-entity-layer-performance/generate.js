// Imports the metadata, then every dataset's tracked entities in batches.
// --dryRun writes the metadata and a first batch to output/ and sends nothing.
// --relationships only imports the relationship data (see relationships.js),
// for the 1k and 100k datasets imported before. --maps only saves the test
// maps (see maps.js), which need the datasets and relationship data.
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { selectDatasets } = require('./datasets.js')
const { getFacilities } = require('./facilities.js')
const { assertWritable } = require('./guard.js')
const { metadataErrors, trackerStats } = require('./import-report.js')
const { buildMetadata } = require('./metadata.js')
const { buildMaps } = require('./maps.js')
const {
    buildOutsideProgramTrackedEntities,
    buildRelationshipMetadata,
    buildRelationships,
} = require('./relationships.js')
const { buildBatch } = require('./tracked-entities.js')

const OUTPUT_DIR = path.join(__dirname, 'output')

const writeOutput = (name, json) => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    const file = path.join(OUTPUT_DIR, name)
    fs.writeFileSync(file, JSON.stringify(json, null, 2))
    console.log(`Wrote ${path.relative(process.cwd(), file)}`)
}

const importDataset = async (client, dataset, facilities, batchSize) => {
    const started = Date.now()
    const totals = { created: 0, updated: 0, ignored: 0 }

    for (let start = 0; start < dataset.count; start += batchSize) {
        const end = Math.min(start + batchSize, dataset.count)
        const res = await client.postTracker(
            buildBatch(dataset, facilities, start, end)
        )
        const stats = trackerStats(res.json)
        totals.created += stats.created
        totals.updated += stats.updated
        totals.ignored += stats.ignored

        const seconds = (Date.now() - started) / 1000
        console.log(
            `  ${dataset.key}: ${end}/${dataset.count} (objects created ${totals.created}, updated ${totals.updated}, ignored ${totals.ignored}; tracked entities, enrollments and events) ${Math.round(end / seconds)}/s`
        )
        if (!res.ok && !stats.ignored) {
            throw new Error(
                `Tracker import failed (${res.status}): ${JSON.stringify(
                    res.json
                ).slice(0, 2000)}`
            )
        }
        if (stats.errors.length) {
            console.log(`    first error: ${stats.errors[0]}`)
        }
    }
    return totals
}

const importRelationships = async (client, config) => {
    const metadata = buildRelationshipMetadata()
    const { relationships } = buildRelationships()

    if (config.dryRun) {
        writeOutput('relationship-metadata.json', metadata)
        writeOutput('relationships-sample.json', {
            relationships: relationships.slice(0, 10),
        })
        return
    }

    const errors = metadataErrors(await client.postMetadata(metadata))
    if (errors.length) {
        throw new Error(`Relationship types failed:\n${errors.join('\n')}`)
    }
    console.log('Relationship types imported.')

    // The related tracked entities outside the PTE 1k program
    const outside = await client.postTracker(
        buildOutsideProgramTrackedEntities(await getFacilities(client))
    )
    const outsideStats = trackerStats(outside.json)
    if (!outside.ok || outsideStats.errors.length) {
        throw new Error(
            `Tracked entities outside the program failed: ${outsideStats.errors[0]}`
        )
    }
    console.log(
        `Tracked entities outside the program: created ${outsideStats.created}, updated ${outsideStats.updated}`
    )

    const res = await client.postTracker({ relationships })
    const stats = trackerStats(res.json)
    console.log(
        `Relationships: created ${stats.created}, updated ${stats.updated}, ignored ${stats.ignored}`
    )
    // Existing relationships are ignored without an error, so a rerun passes
    if (!res.ok || stats.errors.length) {
        throw new Error(
            `Relationship import failed (${res.status}): ${
                stats.errors[0] ?? JSON.stringify(res.json).slice(0, 2000)
            }`
        )
    }
}

// Saved like the maps-app does, so the maps open as a user's would
const saveMaps = async (client, config) => {
    const maps = buildMaps()

    if (config.dryRun) {
        writeOutput('maps.json', maps)
        return
    }

    for (const map of maps) {
        const exists = (
            await client.send('GET', `/api/maps/${map.id}?fields=id`)
        ).ok
        const saved = exists
            ? await client.send('PUT', `/api/maps/${map.id}`, map)
            : await client.send('POST', '/api/maps', map)
        if (!saved.ok) {
            throw new Error(
                `Saving "${map.name}" failed (${saved.status}): ${JSON.stringify(
                    saved.json
                ).slice(0, 2000)}`
            )
        }
        console.log(
            `${exists ? 'Updated' : 'Created'} "${map.name}" (${map.id})`
        )
    }
}

const run = async (config = getConfig()) => {
    const datasets = selectDatasets(config.datasets)
    if (!config.dryRun) {
        assertWritable(config.baseUrl)
    }
    const client = createClient(config)

    if (config.relationships) {
        await importRelationships(client, config)
        return
    }
    if (config.maps) {
        await saveMaps(client, config)
        return
    }

    const facilities = await getFacilities(client)
    console.log(
        `Target: ${config.baseUrl}. ${facilities.length} facilities with coordinates.`
    )
    const metadata = buildMetadata(
        datasets,
        facilities.map(({ id }) => id)
    )

    if (config.dryRun) {
        writeOutput('metadata.json', metadata)
        writeOutput(
            'tracked-entities-sample.json',
            buildBatch(datasets[0], facilities, 0, 10)
        )
        return
    }

    const errors = metadataErrors(await client.postMetadata(metadata))
    if (errors.length) {
        throw new Error(`Metadata import failed:\n${errors.join('\n')}`)
    }
    console.log('Metadata imported.')

    for (const dataset of datasets) {
        console.log(`Importing ${dataset.key} (${dataset.featureType})`)
        await importDataset(client, dataset, facilities, config.batchSize)
    }
    console.log(
        'Done. Run run-analytics.js before using the data from analytics.'
    )
}

if (require.main === module) {
    run().catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { run }
