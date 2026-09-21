const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { writeFieldIds } = require('./fieldIds.js')
const { writeScenarioIndex } = require('./idMap.js')
const { buildMetadata } = require('./metadata.js')
const { writeImportSummary } = require('./summary.js')
const { buildTrackerPayload } = require('./trackerPayload.js')
const { deterministicUid } = require('./uid.js')

// Near Freetown, Sierra Leone - arbitrary but realistic-looking default.
const BASE_COORDS = [-13.2317, 8.4657]

const chunk = (array, size) => {
    if (!size) {
        return [array]
    }
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size))
    }
    return chunks
}

const checkForUidCollisions = (allIds) => {
    const seen = new Map()
    allIds.forEach(({ id, label }) => {
        if (seen.has(id)) {
            throw new Error(
                `UID collision: "${label}" and "${seen.get(
                    id
                )}" both generated ${id}`
            )
        }
        seen.set(id, label)
    })
}

const resolveRootOrgUnitId = async (client, { dryRun }) => {
    try {
        // Prefer an org unit the API user actually has data-capture access
        // to - on instances with more than one level-1 org unit (some demo
        // databases have several disconnected root hierarchies), the first
        // level-1 result is not guaranteed to be one the user can write
        // under, which fails every tracker import with E1000/E1006.
        const { organisationUnits: ownOrgUnits } = await client.get(
            '/api/me.json?fields=organisationUnits[id]'
        )
        if (ownOrgUnits?.length) {
            return { rootOrgUnitId: ownOrgUnits[0].id, reachable: true }
        }

        const { organisationUnits } = await client.get(
            '/api/organisationUnits.json?filter=level:eq:1&fields=id&paging=false'
        )
        if (!organisationUnits?.length) {
            throw new Error('No level-1 organisation unit found on instance')
        }
        return { rootOrgUnitId: organisationUnits[0].id, reachable: true }
    } catch (err) {
        if (dryRun) {
            console.warn(
                `\n*** WARNING: could not reach the instance to resolve the root org unit (${err.message}). Using a placeholder id - this dry run does NOT confirm the instance is reachable or importable. ***\n`
            )
            return {
                rootOrgUnitId: deterministicUid('maps-test:dryRun:rootOrgUnit'),
                reachable: false,
            }
        }
        throw err
    }
}

const run = async () => {
    const config = getConfig()
    const client = createClient(config)

    console.log(
        `Target: ${config.baseUrl} (user: ${config.username})${
            config.dryRun ? ' [dry run]' : ''
        }`
    )

    const { rootOrgUnitId, reachable } = await resolveRootOrgUnitId(
        client,
        config
    )
    const { metadata, ids } = buildMetadata({
        rootOrgUnitId,
        withGeometryCoords: BASE_COORDS,
    })
    const { trackedEntities, enrollments, events, scenarioIndex } =
        buildTrackerPayload({ ids, baseCoords: BASE_COORDS })

    const metadataCounts = Object.fromEntries(
        Object.entries(metadata).map(([key, arr]) => [key, arr.length])
    )
    const trackerCounts = {
        trackedEntities: trackedEntities.length,
        enrollments: enrollments.length,
        events: events.length,
    }
    console.log('Metadata object counts:', metadataCounts)
    console.log('Tracker data counts:', trackerCounts)

    const summaryPaths = writeImportSummary({
        target: config.baseUrl,
        dryRun: config.dryRun,
        metadataCounts,
        trackerCounts,
    })
    console.log(
        `Import summary written to ${summaryPaths.jsonPath} and ${summaryPaths.csvPath}`
    )

    checkForUidCollisions([
        ...Object.entries(ids).map(([label, id]) => ({ id, label })),
        ...trackedEntities.map((t) => ({
            id: t.trackedEntity,
            label: 'trackedEntity',
        })),
        ...enrollments.map((e) => ({
            id: e.enrollment,
            label: 'enrollment',
        })),
        ...events.map((e) => ({ id: e.event, label: 'event' })),
    ])
    console.log('No UID collisions found.')

    if (config.dryRun) {
        if (reachable) {
            console.log(
                'Dry run complete - payloads are valid and the instance is reachable. No data was sent.'
            )
        } else {
            console.warn(
                `Dry run complete, but ${config.baseUrl} could NOT be reached - payload shapes/counts are unverified against a real instance.`
            )
        }
        return
    }

    console.log('Importing metadata...')
    const metadataResult = await client.postMetadata(metadata)
    console.log('Metadata import status:', metadataResult.status)
    // status can be 'OK' even when objects were ignored - check stats
    // directly rather than trusting status alone. Metadata import nests
    // stats under `response` (unlike tracker import, where it's top-level).
    if (
        metadataResult.status !== 'OK' ||
        metadataResult.response?.stats?.ignored > 0
    ) {
        console.dir(metadataResult, { depth: 6 })
    }

    console.log('Importing tracker data...')
    const eventChunks = chunk(events, config.chunkSize)
    for (const [chunkIndex, eventsChunk] of eventChunks.entries()) {
        const trackerResult = await client.postTracker({
            // TEIs/enrollments are small and have no natural chunk boundary
            // of their own - send them once, alongside the first chunk.
            trackedEntities: chunkIndex === 0 ? trackedEntities : [],
            enrollments: chunkIndex === 0 ? enrollments : [],
            events: eventsChunk,
        })
        console.log(
            `Tracker import status (chunk ${chunkIndex + 1}/${
                eventChunks.length
            }):`,
            trackerResult.status,
            trackerResult.stats
        )
        // status can be 'OK' even when objects were ignored (DHIS2 doesn't
        // always escalate status to WARNING for that) - check stats
        // directly rather than trusting status alone.
        if (trackerResult.status !== 'OK' || trackerResult.stats?.ignored > 0) {
            console.dir(trackerResult.validationReport, { depth: 6 })
        }
    }

    if (!config.fixturesRepo) {
        console.warn(
            'Skipping fixture file writes: no --fixturesRepo (or DHIS2_FIXTURES_REPO) set. ' +
                'Pass --fixturesRepo=<path to a maps-app checkout> to write them into its cypress/fixtures/.'
        )
        return
    }

    const fixturesDir = path.join(config.fixturesRepo, 'cypress/fixtures')

    const scenarioPaths = writeScenarioIndex(scenarioIndex, {
        jsonPath: path.join(
            fixturesDir,
            'eventCoordinateFallbackScenarios.json'
        ),
        csvPath: path.join(fixturesDir, 'eventCoordinateFallbackScenarios.csv'),
    })
    console.log(
        `Scenario cross-reference written to ${scenarioPaths.jsonPath} and ${scenarioPaths.csvPath}`
    )

    const fieldIdsPaths = writeFieldIds(ids, {
        jsonPath: path.join(
            fixturesDir,
            'eventCoordinateFallbackFieldIds.json'
        ),
    })
    console.log(`Field ids written to ${fieldIdsPaths.jsonPath}`)
}

run().catch((err) => {
    console.error(err)
    process.exitCode = 1
})
