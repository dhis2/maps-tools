// What the tool reads from a server before building anything: its version,
// the aggregation types it knows, the user's root org unit and the default
// category option combo. Offline (--dryRun without a server) it falls back
// to the answers of 2.43.1.
const { PERIOD_TYPES } = require('./period-types.js')

const EXCLUDED_AGGREGATION_TYPES = ['CUSTOM', 'DEFAULT']

const OFFLINE = {
    version: 'offline',
    aggregationTypes: [
        'SUM',
        'AVERAGE',
        'AVERAGE_SUM_ORG_UNIT',
        'LAST',
        'LAST_AVERAGE_ORG_UNIT',
        'LAST_LAST_ORG_UNIT',
        'LAST_IN_PERIOD',
        'LAST_IN_PERIOD_AVERAGE_ORG_UNIT',
        'FIRST',
        'FIRST_AVERAGE_ORG_UNIT',
        'FIRST_FIRST_ORG_UNIT',
        'COUNT',
        'STDDEV',
        'VARIANCE',
        'MIN',
        'MAX',
        'MIN_SUM_ORG_UNIT',
        'MAX_SUM_ORG_UNIT',
        'NONE',
    ],
    rootOrgUnitId: 'ImspTQPwCqd',
    defaultCocId: 'HllvX50cXC0',
    reachable: false,
}

const getAggregationTypes = async (client) => {
    const schema = await client.get(
        '/api/schemas/dataElement.json?fields=properties[fieldName,constants]'
    )
    const property = schema.properties.find(
        (candidate) => candidate.fieldName === 'aggregationType'
    )
    return property.constants.filter(
        (type) => !EXCLUDED_AGGREGATION_TYPES.includes(type)
    )
}

const getRootOrgUnitId = async (client) => {
    const { organisationUnits } = await client.get(
        '/api/me.json?fields=organisationUnits[id]'
    )
    if (!organisationUnits?.length) {
        throw new Error('The user has no data capture org unit')
    }
    return organisationUnits[0].id
}

const getDefaultCocId = async (client) => {
    const { categoryOptionCombos } = await client.get(
        '/api/categoryOptionCombos.json?filter=name:eq:default&fields=id&paging=false'
    )
    return categoryOptionCombos[0].id
}

// Period types whose frequency order or ISO format differs from ours.
const comparePeriodTypes = (serverTypes) =>
    PERIOD_TYPES.flatMap((type) => {
        const server = serverTypes.find((s) => s.name === type.name)
        if (!server) {
            return [`${type.name}: missing on the server`]
        }
        const differences = []
        if (server.frequencyOrder !== type.frequencyOrder) {
            differences.push(
                `${type.name}: frequencyOrder ${server.frequencyOrder}, expected ${type.frequencyOrder}`
            )
        }
        if (!!server.isoFormat !== type.enterable) {
            differences.push(
                `${type.name}: isoFormat ${server.isoFormat ?? 'none'}`
            )
        }
        return differences
    }).concat(
        serverTypes
            .filter((s) => !PERIOD_TYPES.some((t) => t.name === s.name))
            .map((s) => `${s.name}: unknown to this tool`)
    )

const getServerInfo = async (client, { dryRun } = {}) => {
    try {
        const info = await client.get('/api/system/info.json')
        const { periodTypes } = await client.get(
            '/api/periodTypes.json?fields=name,isoFormat,frequencyOrder'
        )
        return {
            version: info.version,
            revision: info.revision,
            lastAnalyticsTableSuccess: info.lastAnalyticsTableSuccess,
            aggregationTypes: await getAggregationTypes(client),
            rootOrgUnitId: await getRootOrgUnitId(client),
            defaultCocId: await getDefaultCocId(client),
            periodTypeDifferences: comparePeriodTypes(periodTypes),
            // 2.40 to 2.42 lack WeeklyFriday, FinancialFeb and FinancialAug,
            // and 2.40 and 2.41 FinancialSep too.
            serverPeriodTypes: periodTypes.map((type) => type.name),
            reachable: true,
        }
    } catch (err) {
        if (!dryRun) {
            throw err
        }
        console.warn(
            `Could not reach the server (${err.message}). Using offline defaults: this dry run checks the payloads only.`
        )
        return {
            ...OFFLINE,
            periodTypeDifferences: [],
            serverPeriodTypes: PERIOD_TYPES.map((type) => type.name),
        }
    }
}

module.exports = { OFFLINE, comparePeriodTypes, getServerInfo }
