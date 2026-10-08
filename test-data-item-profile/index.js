// Imports the test metadata, data values, completeness registrations and
// tracker data. Safe to re-run: every id is deterministic and imports
// create or update.
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const {
    buildDataValueSets,
    buildRegistrationSets,
} = require('./data-values.js')
const { assertWritable } = require('./guard.js')
const { importCount, metadataErrors } = require('./import-report.js')
const { buildMetadata, findCollisions, listIds } = require('./metadata.js')
const { buildScenarios } = require('./scenarios.js')
const { getServerInfo } = require('./server.js')
const { userCredentials, withPassword } = require('./user-credentials.js')

const OUTPUT_DIR = path.join(__dirname, 'output')

const countObjects = (metadata) =>
    Object.fromEntries(
        Object.entries(metadata).map(([type, objects]) => [
            type,
            objects.length,
        ])
    )

const postMetadata = async (client, metadata, label) => {
    const json = await client.postMetadata(metadata)
    const errors = metadataErrors(json)
    console.log(
        `Metadata (${label}): ${json.status ?? json.response?.status}, ${
            errors.length
        } errors`
    )
    errors
        .slice(0, 20)
        .forEach((error) =>
            console.log(`  ${error.type} ${error.id}: ${error.message}`)
        )
    return errors
}

const postValues = async (client, valueSets) => {
    const failures = []
    for (const [index, set] of valueSets.entries()) {
        const { json } = await client.postDataValueSet(set)
        const count = importCount(json)
        const label = `Values ${index + 1}/${valueSets.length} (${
            set.dataSet
        }, ${set.dataValues.length})`
        console.log(
            `${label}: ${count.status}, imported ${count.imported ?? 0}, updated ${
                count.updated ?? 0
            }, ignored ${count.ignored ?? 0}`
        )
        if (count.ignored || count.conflicts.length) {
            count.conflicts.slice(0, 5).forEach((c) => console.log(`  ${c}`))
            failures.push({ dataSet: set.dataSet, ...count })
        }
    }
    return failures
}

const postRegistrations = async (client, registrationSets) => {
    const failures = []
    for (const set of registrationSets) {
        const { status, json } = await client.postRegistrations(
            set.registrations
        )
        const count = importCount(json)
        console.log(
            `Registrations (${set.dataSet}, ${set.registrations.length}): HTTP ${status}, ${count.status}, imported ${count.imported ?? 0}, updated ${count.updated ?? 0}, ignored ${count.ignored ?? 0}`
        )
        if (status >= 400 || count.ignored || count.conflicts.length) {
            count.conflicts.slice(0, 5).forEach((c) => console.log(`  ${c}`))
            failures.push({
                dataSet: set.dataSet,
                httpStatus: status,
                ...count,
            })
        }
    }
    return failures
}

const trackerErrors = (json) =>
    (json?.validationReport?.errorReports ?? []).map(
        (error) => `${error.trackerType} ${error.uid}: ${error.message}`
    )

// Tracked entities and events, then ownership moves.
const postTrackerData = async (client, groups) => {
    const failures = []
    for (const group of groups.filter((g) => g.tracker)) {
        const { status, json } = await client.postTracker(group.tracker)
        const errors = trackerErrors(json)
        console.log(
            `Tracker (${group.key}): HTTP ${status}, ${json?.status}, ${JSON.stringify(
                json?.stats ?? {}
            )}`
        )
        errors.slice(0, 5).forEach((error) => console.log(`  ${error}`))
        if (status >= 400 || errors.length) {
            failures.push({ group: group.key, httpStatus: status, errors })
        }
        for (const transfer of group.ownershipTransfers ?? []) {
            const result = await client.transferOwnership(transfer)
            console.log(
                `Ownership transfer: HTTP ${result.status} ${
                    result.json?.message ?? ''
                }`
            )
            // On a re-run the owner is already the target: done.
            const alreadyOwner = /already/i.test(result.json?.message ?? '')
            if (!result.ok && !alreadyOwner) {
                failures.push({
                    group: group.key,
                    transfer,
                    httpStatus: result.status,
                    message: result.json?.message,
                })
            }
        }
    }
    return failures
}

// Two runs in a row must leave exactly one object per code.
const findDuplicates = async (client, model) => {
    const ownedIds = new Set(listIds(model).map(([id]) => id))
    const types = [
        'organisationUnits',
        'dataElements',
        'dataSets',
        'indicators',
        'constants',
        'programs',
        'programIndicators',
    ]
    const problems = []
    for (const type of types) {
        const json = await client.get(
            `/api/${type}.json?filter=code:$like:PTT_&fields=id,code&paging=false`
        )
        const objects = (json[type] ?? []).filter((object) =>
            object.code?.startsWith('PTT_')
        )
        const codes = objects.map((object) => object.code)
        codes
            .filter((code, index) => codes.indexOf(code) !== index)
            .forEach((code) => problems.push(`${type}: ${code} twice`))
        objects
            .filter((object) => !ownedIds.has(object.id))
            .forEach((object) =>
                problems.push(
                    `${type}: ${object.code} (${object.id}) not in the model`
                )
            )
    }
    return problems
}

const run = async (config = getConfig()) => {
    const client = createClient(config)
    console.log(
        `Target: ${config.baseUrl} (${config.instance})${
            config.dryRun ? ' [dry run]' : ''
        }`
    )
    if (!config.dryRun) {
        assertWritable(config.baseUrl)
    }

    const serverInfo = await getServerInfo(client, config)
    console.log(
        `Version ${serverInfo.version}, ${serverInfo.aggregationTypes.length} aggregation types`
    )
    serverInfo.periodTypeDifferences?.forEach((difference) =>
        console.warn(`Period type difference: ${difference}`)
    )

    const model = buildScenarios(serverInfo)
    const collisions = findCollisions(model)
    if (collisions.length) {
        throw new Error(`UID collisions:\n${collisions.join('\n')}`)
    }

    const initial = buildMetadata(model, { ...serverInfo, phase: 'initial' })
    const final = buildMetadata(model, { ...serverInfo, phase: 'final' })
    const { orgUnits } = model.shared
    const valueSets = buildDataValueSets(model.groups, orgUnits)
    const registrationSets = buildRegistrationSets(model.groups, orgUnits)
    const valueCount = valueSets.reduce((n, s) => n + s.dataValues.length, 0)
    const caseCount = model.groups.reduce((n, g) => n + g.cases.length, 0)

    const plan = {
        target: config.baseUrl,
        version: serverInfo.version,
        metadata: countObjects(final),
        dataValues: valueCount,
        dataValueRequests: valueSets.length,
        registrations: registrationSets.reduce(
            (n, s) => n + s.registrations.length,
            0
        ),
        cases: Object.fromEntries(
            model.groups.map((group) => [group.key, group.cases.length])
        ),
    }
    console.log('Plan:', JSON.stringify(plan, null, 2))
    console.log(`No UID collisions. ${caseCount} cases in all.`)

    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'metadata-initial.json'),
        JSON.stringify(initial, null, 2)
    )
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'metadata-final.json'),
        JSON.stringify(final, null, 2)
    )

    if (config.dryRun) {
        console.log(`Dry run: payloads written to ${OUTPUT_DIR}, nothing sent.`)
        return { plan }
    }

    const started = Date.now()
    const report = { plan, startedAt: new Date(started).toISOString() }
    const credentials = userCredentials(config.instance)
    report.initialMetadataErrors = await postMetadata(
        client,
        withPassword(initial, credentials),
        'initial'
    )
    report.valueFailures = await postValues(client, valueSets)
    report.registrationFailures = await postRegistrations(
        client,
        registrationSets
    )
    report.trackerFailures = await postTrackerData(client, model.groups)
    report.finalMetadataErrors = await postMetadata(
        client,
        withPassword(final, credentials),
        'final'
    )
    report.duplicates = await findDuplicates(client, model)
    report.seconds = Math.round((Date.now() - started) / 1000)

    report.duplicates.forEach((problem) =>
        console.warn(`Duplicate: ${problem}`)
    )
    console.log(`Import done in ${report.seconds}s.`)
    fs.writeFileSync(
        path.join(OUTPUT_DIR, `import-${config.instance}.json`),
        JSON.stringify(report, null, 2)
    )
    return report
}

if (require.main === module) {
    run().catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { run }
