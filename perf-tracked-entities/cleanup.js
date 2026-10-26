// Removes everything this tool created on a server: the relationships, the
// tracked entities of every PTE_ type (with their enrollments), then every
// object whose code starts with PTE_. Lists what it would delete unless --yes is passed.
const { createClient } = require('./client.js')
const { getConfig, parseArgs } = require('./config.js')
const { CODE_PREFIX } = require('./datasets.js')
const { getRootOrgUnit } = require('./facilities.js')
const { assertWritable } = require('./guard.js')
const { metadataErrors, trackerStats } = require('./import-report.js')
const { buildRelationships } = require('./relationships.js')

const PAGE_SIZE = 5000

// Deleted in this order: what refers to others first.
const METADATA_TYPES = [
    'maps',
    'relationshipTypes',
    'programStages',
    'programs',
    'trackedEntityTypes',
    'trackedEntityAttributes',
    'optionSets',
    'options',
]

const findOwned = async (client) => {
    const owned = {}
    for (const type of METADATA_TYPES) {
        const json = await client.get(
            `/api/${type}.json?filter=code:$like:${CODE_PREFIX}&fields=id,code&paging=false`
        )
        owned[type] = (json[type] ?? []).filter((object) =>
            object.code?.startsWith(CODE_PREFIX)
        )
    }
    return owned
}

const trackedEntityPage = async (client, trackedEntityType, root) => {
    const json = await client.get(
        `/api/tracker/trackedEntities?fields=trackedEntity&trackedEntityType=${trackedEntityType}&orgUnits=${root}&orgUnitMode=DESCENDANTS&pageSize=${PAGE_SIZE}&totalPages=true`
    )
    return {
        ids: (json.trackedEntities ?? json.instances ?? []).map(
            ({ trackedEntity }) => trackedEntity
        ),
        total: json.pager?.total ?? json.total ?? null,
    }
}

// Deleting changes the pages, so always take the first one again.
const deleteTrackedEntities = async (client, trackedEntityType, root) => {
    let deleted = 0
    for (;;) {
        const { ids } = await trackedEntityPage(client, trackedEntityType, root)
        if (!ids.length) {
            return deleted
        }
        const res = await client.postTracker(
            {
                trackedEntities: ids.map((trackedEntity) => ({
                    trackedEntity,
                })),
            },
            'DELETE'
        )
        const stats = trackerStats(res.json)
        if (!stats.deleted) {
            throw new Error(
                `Deleting tracked entities failed (${res.status}): ${
                    stats.errors[0] ?? JSON.stringify(res.json).slice(0, 500)
                }`
            )
        }
        deleted += stats.deleted
        console.log(`  deleted ${deleted}`)
    }
}

const run = async (
    config = getConfig(),
    { yes } = parseArgs(process.argv.slice(2))
) => {
    assertWritable(config.baseUrl)
    const client = createClient(config)
    const root = await getRootOrgUnit(client)
    const owned = await findOwned(client)

    for (const { id, code } of owned.trackedEntityTypes) {
        const { total } = await trackedEntityPage(client, id, root.id)
        console.log(`${code}: ${total ?? '?'} tracked entities`)
    }
    Object.entries(owned).forEach(([type, objects]) =>
        console.log(`${type}: ${objects.length}`)
    )
    if (!yes) {
        console.log('Nothing deleted. Pass --yes to delete all of the above.')
        return
    }

    // Ids that don't exist are reported as errors and skipped
    const relationships = buildRelationships().relationships.map(
        ({ relationship }) => ({ relationship })
    )
    const res = await client.postTracker({ relationships }, 'DELETE')
    console.log(`Relationships: deleted ${trackerStats(res.json).deleted}`)

    for (const { id, code } of owned.trackedEntityTypes) {
        console.log(`Deleting ${code} tracked entities`)
        await deleteTrackedEntities(client, id, root.id)
    }
    for (const type of METADATA_TYPES) {
        if (!owned[type].length) {
            continue
        }
        const errors = metadataErrors(
            await client.postMetadata(
                { [type]: owned[type].map(({ id }) => ({ id })) },
                'DELETE'
            )
        )
        console.log(
            `${type}: deleted ${owned[type].length - errors.length}${
                errors.length ? `, errors:\n  ${errors.join('\n  ')}` : ''
            }`
        )
    }
}

if (require.main === module) {
    run().catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { METADATA_TYPES, run }
