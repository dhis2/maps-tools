// Removes everything this tool created on a server: data values,
// completeness registrations, then every object whose code starts with
// PTT_. Lists what it would delete unless --yes is passed.
const { createClient } = require('./client.js')
const { getConfig, parseArgs } = require('./config.js')
const {
    buildDataValueSets,
    buildRegistrationSets,
} = require('./data-values.js')
const { assertWritable } = require('./guard.js')
const { importCount, metadataErrors } = require('./import-report.js')
const { buildMetadata } = require('./metadata.js')
const { buildScenarios } = require('./scenarios.js')
const { getServerInfo } = require('./server.js')

const CODE_PREFIX = 'PTT_'

// Deleted in this order: what refers to others first, org units last.
const METADATA_TYPES = [
    'programIndicators',
    'users',
    'userRoles',
    'programStages',
    'programs',
    'trackedEntityTypes',
    'expressionDimensionItems',
    'indicators',
    'dataSets',
    'dataElements',
    'categoryOptionCombos',
    'categoryCombos',
    'categories',
    'categoryOptions',
    'indicatorTypes',
    'constants',
    'organisationUnitGroups',
    'organisationUnits',
]

const findOwned = async (client) => {
    const owned = {}
    for (const type of METADATA_TYPES) {
        const json = await client.get(
            `/api/${type}.json?filter=code:$like:${CODE_PREFIX}&fields=id,code,level&paging=false`
        )
        owned[type] = (json[type] ?? []).filter((object) =>
            object.code?.startsWith(CODE_PREFIX)
        )
    }
    return owned
}

const deleteMetadata = async (client, type, objects) => {
    if (!objects.length) {
        return []
    }
    const json = await client.postMetadata(
        { [type]: objects.map(({ id }) => ({ id })) },
        'DELETE'
    )
    return metadataErrors(json)
}

const run = async (
    config = getConfig(),
    { yes } = parseArgs(process.argv.slice(2))
) => {
    assertWritable(config.baseUrl)
    const client = createClient(config)
    const owned = await findOwned(client)
    Object.entries(owned).forEach(([type, objects]) =>
        console.log(`${type}: ${objects.length}`)
    )
    if (!yes) {
        console.log('Nothing deleted. Pass --yes to delete all of the above.')
        return owned
    }

    const serverInfo = await getServerInfo(client)
    const model = buildScenarios(serverInfo)
    const { orgUnits } = model.shared

    // Values are deleted per data set, so temporary memberships come back
    // first, as on import.
    await client.postMetadata(
        buildMetadata(model, { ...serverInfo, phase: 'initial' })
    )
    for (const group of model.groups.filter((g) => g.tracker)) {
        const { status } = await client.postTracker(group.tracker, 'DELETE')
        console.log(`Tracker data (${group.key}): HTTP ${status}`)
    }
    for (const set of buildDataValueSets(model.groups, orgUnits)) {
        const { json } = await client.postDataValueSet(set, 'DELETE')
        const count = importCount(json)
        console.log(
            `Values (${set.dataSet}): ${count.status}, deleted ${count.deleted ?? 0}`
        )
    }
    for (const set of buildRegistrationSets(model.groups, orgUnits)) {
        const { status } = await client.postRegistrations(
            set.registrations,
            'DELETE'
        )
        console.log(`Registrations (${set.dataSet}): HTTP ${status}`)
    }
    // Deleted values stay in the table until this runs, and block deleting
    // their data elements.
    const maintenance = await client.send(
        'POST',
        '/api/maintenance?softDeletedDataValueRemoval=true'
    )
    console.log(`Soft-deleted value removal: HTTP ${maintenance.status}`)

    const refreshed = await findOwned(client)
    const byLevel = (a, b) => (b.level ?? 0) - (a.level ?? 0)
    for (const type of METADATA_TYPES) {
        const objects =
            type === 'organisationUnits'
                ? [...refreshed[type]].sort(byLevel)
                : refreshed[type]
        // Org units one at a time, deepest first: a parent with children
        // can't be deleted.
        const batches =
            type === 'organisationUnits'
                ? objects.map((unit) => [unit])
                : [objects]
        const errors = []
        for (const batch of batches) {
            errors.push(...(await deleteMetadata(client, type, batch)))
        }
        console.log(
            `Deleted ${type}: ${objects.length}, ${errors.length} errors`
        )
        errors
            .slice(0, 5)
            .forEach((error) => console.log(`  ${error.id}: ${error.message}`))
    }
    return findOwned(client)
}

if (require.main === module) {
    run().catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { run }
