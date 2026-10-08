// Queries analytics for every case of the selected groups and writes what
// came back to input/<instance>/<group>.json. GET requests only.
const { errorMessage } = require('./analytics.js')
const { createClient } = require('./client.js')
const { fetchCaseCells } = require('./cells.js')
const { getConfig } = require('./config.js')
const { countBy, evaluateGroup } = require('./evaluate.js')
const { toRow, writeObservations } = require('./observations.js')
const { periodFromId, periodTypeOfId } = require('./period-types.js')
const { buildScenarios } = require('./scenarios.js')
const { getServerInfo } = require('./server.js')
const { ORG_UNIT_GROUPS } = require('./groups/org-units/org-unit-groups.js')
const { uid } = require('./uid.js')
const { readUserCredentials } = require('./user-credentials.js')

// G1's SUM Monthly element holds 13 at A in January 2025.
const KNOWN_VALUE = { key: 'g1-SUM-Monthly', pe: '202501', value: 13 }

const checkKnownValue = async (client, orgUnitIds) => {
    const path = `/api/analytics.json?dimension=dx:${uid(
        KNOWN_VALUE.key
    )}&dimension=pe:${KNOWN_VALUE.pe}&filter=ou:${orgUnitIds.A}&skipMeta=true`
    const { ok, json } = await client.send('GET', path)
    const value = ok ? Number(json.rows?.[0]?.at(-1)) : null
    if (value !== KNOWN_VALUE.value) {
        throw new Error(
            `Analytics isn't ready: G1 SUM Monthly at A for ${KNOWN_VALUE.pe} is ${
                ok ? value : JSON.stringify(json)
            }, expected ${KNOWN_VALUE.value}. Run run-analytics.js first.`
        )
    }
    console.log('Known value is back: analytics is ready.')
}

// Our start and end dates against the server's, for every queried period.
/*
 * One type at a time, so a type the server can't answer (QuarterlyNov on
 * 2.40 fails with HTTP 500) is recorded as refused, with its message, and
 * its cells become ERROR without a request.
 */
const checkPeriodDates = async (client, periodIds, orgUnitIds) => {
    const mismatches = []
    const refusedTypes = {}
    const ids = [...periodIds].filter((id) => periodFromId(id))
    const byType = new Map()
    ids.forEach((id) => {
        const type = periodTypeOfId(id)
        byType.set(type, [...(byType.get(type) ?? []), id])
    })
    const batches = [...byType].flatMap(([type, typeIds]) =>
        Array.from({ length: Math.ceil(typeIds.length / 100) }, (_, i) => [
            type,
            typeIds.slice(i * 100, i * 100 + 100),
        ])
    )
    for (const [type, batch] of batches) {
        const { ok, status, json } = await client.send(
            'GET',
            `/api/analytics.json?dimension=dx:${uid(
                KNOWN_VALUE.key
            )}&dimension=pe:${batch.join(';')}&filter=ou:${
                orgUnitIds.A
            }&skipData=true&includeMetadataDetails=true`
        )
        if (!ok) {
            refusedTypes[type] = errorMessage(json, status)
            continue
        }
        batch.forEach((id) => {
            const item = json.metaData?.items?.[id]
            const ours = periodFromId(id)
            const server = {
                startDate: item?.startDate?.slice(0, 10),
                endDate: item?.endDate?.slice(0, 10),
            }
            if (
                server.startDate !== ours.startDate ||
                server.endDate !== ours.endDate
            ) {
                mismatches.push({ id, ours, server })
            }
        })
    }
    console.log(
        `Period dates: ${ids.length} checked, ${mismatches.length} differ.`
    )
    mismatches
        .slice(0, 10)
        .forEach((m) => console.warn(`  ${m.id}: ${JSON.stringify(m)}`))
    Object.entries(refusedTypes).forEach(([type, message]) =>
        console.warn(`  ${type} refused: ${message}`)
    )
    return { checked: ids.length, mismatches, refusedTypes }
}

const verifyCellGroup = async (client, group, context) => {
    const lookup = await fetchCaseCells(client, group.cases, {
        ...context,
        onBatch: (done, total) => {
            if (done % 25 === 0 || done === total) {
                console.log(`  ${group.key}: ${done}/${total} requests`)
            }
        },
    })
    return {
        rows: group.cases.map((testCase) =>
            toRow(
                testCase,
                testCase.observe(
                    testCase.cells.map((cell) =>
                        lookup(testCase.batchKey, cell)
                    )
                )
            )
        ),
    }
}

const run = async (config = getConfig()) => {
    const client = createClient(config)
    const serverInfo = await getServerInfo(client)
    console.log(`Verifying ${config.baseUrl} (${serverInfo.version})`)
    const model = buildScenarios(serverInfo, { groups: config.groups })
    const orgUnitIds = Object.fromEntries(
        Object.entries(model.shared.orgUnits).map(([key, unit]) => [
            key,
            unit.id,
        ])
    )
    const groupIds = Object.fromEntries(
        ORG_UNIT_GROUPS.map((group) => [group.key, group.id])
    )
    // The PTT user the user org unit cases sign in as (index.js made it).
    const credentials = readUserCredentials(config.instance)
    const userClient = credentials
        ? createClient({ ...config, ...credentials })
        : null

    await checkKnownValue(client, orgUnitIds)
    const periodIds = new Set(
        model.selectedGroups.flatMap((group) =>
            group.cases.flatMap((c) => (c.cells ?? []).map((cell) => cell.pe))
        )
    )
    const periodCheck = await checkPeriodDates(client, periodIds, orgUnitIds)

    // Only what the cases and the report need (observations.js).
    const header = {
        instance: config.instance,
        version: serverInfo.version,
        revision: serverInfo.revision,
        date: new Date().toISOString().slice(0, 10),
        serverInfo: {
            aggregationTypes: serverInfo.aggregationTypes,
            serverPeriodTypes: serverInfo.serverPeriodTypes,
            defaultCocId: serverInfo.defaultCocId,
            periodTypeDifferences: serverInfo.periodTypeDifferences,
        },
        periodCheck,
    }

    const summaries = {}
    for (const group of model.selectedGroups) {
        const started = Date.now()
        console.log(
            `Group ${group.number} (${group.key}): ${group.cases.length} cases`
        )
        // A group with its own requests (not analytics cells) verifies
        // itself, and returns the same { rows }, with any `responses`.
        const { rows, responses } = group.verify
            ? await group.verify(client, {
                  orgUnitIds,
                  model,
                  serverInfo,
                  groupIds,
                  userClient,
              })
            : await verifyCellGroup(client, group, {
                  orgUnitIds,
                  concurrency: config.concurrency,
                  refusedTypes: periodCheck.refusedTypes,
              })
        const observations = {
            ...header,
            group: group.key,
            ...(responses ? { responses } : {}),
            rows,
        }
        const file = writeObservations(config.instance, group.key, observations)
        const counts = countBy(
            evaluateGroup(group, observations).cases,
            (c) => c.verdict
        )
        const seconds = Math.round((Date.now() - started) / 1000)
        summaries[group.key] = counts
        console.log(`  ${JSON.stringify(counts)} in ${seconds}s → ${file}`)
    }
    return summaries
}

if (require.main === module) {
    run(getConfig()).catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { run }
