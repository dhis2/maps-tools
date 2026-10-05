/*
 * Group 6: the requests a library would make to find an item's period
 * types. GET only, no data of its own.
 *
 * - metadata: the fields each version returns for the test items; the
 *   sanitized responses become metadata-shapes.json.
 * - rawData: the period types present for group 3's items in a date range,
 *   read from each row's period id, and how the range and row limit behave.
 * The coarser probe is group 3's own check (see mixed-collection.js).
 */
const {
    overlaps,
    periodFromId,
    periodTypeOfId,
    periodsInside,
} = require('../period-types.js')
const { toRow } = require('../observations.js')
const { uid } = require('../uid.js')
const { SUBJECTS } = require('./mixed-collection.js')
const { ORG_UNITS, supportedTypes } = require('./shared.js')

const KEY = 'detection-requests'

const METADATA_REQUESTS = [
    {
        name: 'dataElements',
        path: '/api/dataElements.json?filter=code:$like:PTT_G3&fields=id,code,name,aggregationType,valueType,domainType,dataSetElements[dataSet[id,periodType]]&paging=false&order=code:asc',
    },
    {
        name: 'dataElements-dataSets',
        path: '/api/dataElements.json?filter=code:$like:PTT_G3&fields=id,code,dataSets[id,periodType]&paging=false&order=code:asc',
    },
    {
        name: 'indicators',
        path: '/api/indicators.json?filter=code:$like:PTT_G4&fields=id,code,name,numerator,denominator,annualized,indicatorType[id,factor]&paging=false&order=code:asc',
    },
    {
        name: 'dataSets',
        path: '/api/dataSets.json?filter=code:$like:PTT_G5&fields=id,code,periodType,dataSetElements[dataElement[id]]&paging=false&order=code:asc',
    },
    {
        name: 'expressionDimensionItems',
        path: '/api/expressionDimensionItems.json?filter=code:$like:PTT&fields=id,code,expression&paging=false',
    },
    {
        name: 'dataItems',
        path: '/api/dataItems.json?filter=name:ilike:PTT G4&fields=id,name,dimensionItemType,expression,aggregationType,valueType&paging=false&order=name:asc',
    },
    {
        name: 'periodTypes',
        path: '/api/periodTypes.json?fields=name,isoFormat,isoDuration,frequencyOrder',
    },
    {
        name: 'aggregationTypes',
        path: '/api/schemas/dataElement.json?fields=properties[fieldName,constants]',
        pick: (json) =>
            json.properties?.filter((p) => p.fieldName === 'aggregationType'),
    },
]

// Fields that change with every import or say nothing about shape.
const DROPPED_FIELDS = new Set([
    'href',
    'created',
    'lastUpdated',
    'createdBy',
    'lastUpdatedBy',
    'user',
    'access',
    'sharing',
    'translations',
    'pager',
])

const sanitize = (value) => {
    if (Array.isArray(value)) {
        return value.map(sanitize)
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => !DROPPED_FIELDS.has(key))
                .map(([key, inner]) => [key, sanitize(inner)])
        )
    }
    return value
}

const countObjects = (json) =>
    Object.values(json).find(Array.isArray)?.length ?? 0

const RAW_RANGES = [
    { name: 'all', startDate: '2024-01-01', endDate: '2025-12-31' },
    { name: '2024', startDate: '2024-01-01', endDate: '2024-12-31' },
    { name: '2025', startDate: '2025-01-01', endDate: '2025-12-31' },
]

// Period types of the streams that fall in the range, at the org unit.
const expectedTypes = (subject, range, orgUnit) => {
    const places = orgUnit === 'region' ? ['A', 'B'] : [orgUnit]
    return [
        ...new Set(
            subject.streams
                .filter(
                    (stream) =>
                        overlaps(periodFromId(stream.range), range) &&
                        stream.places.some((p) => places.includes(p))
                )
                .map((stream) => stream.periodType)
        ),
    ].sort()
}

const rawDataPath = ({ dx, ou, startDate, endDate }) =>
    `/api/analytics/rawData.json?dimension=dx:${dx.join(
        ';'
    )}&dimension=ou:${ou}&startDate=${startDate}&endDate=${endDate}`

const readRawRows = (json) => {
    const names = (json.headers ?? []).map((h) => h.name)
    const peIndex = names.indexOf('pe')
    return (json.rows ?? []).map((row) => row[peIndex])
}

const rawCases = () =>
    SUBJECTS.flatMap((subject) =>
        RAW_RANGES.flatMap((range) =>
            ORG_UNITS.map((orgUnit) => {
                const types = expectedTypes(subject, range, orgUnit)
                return {
                    id: `raw-${subject.name}__r-${range.name}__${orgUnit}`,
                    item: {
                        code: `PTT_G3_${subject.name.toUpperCase()}`,
                        dimensionItemType: 'DATA_ELEMENT',
                        aggregationType: 'SUM',
                        collectionPeriodTypes: subject.collectionPeriodTypes,
                        notes: subject.notes,
                    },
                    query: {
                        request: 'rawData',
                        startDate: range.startDate,
                        endDate: range.endDate,
                        orgUnit,
                    },
                    // At the region, rawData returns the rows of A and B.
                    expected: {
                        status: types.length ? 'VALUE' : 'EMPTY',
                        value: null,
                        periodTypes: types,
                    },
                    dx: uid(`g3-${subject.name}`),
                }
            })
        )
    )

const RANGE_CASE = {
    id: 'raw-range-inside-only',
    item: { code: 'PTT_G1_SUM_Weekly', notes: 'And PTT_G1_SUM_Monthly.' },
    query: {
        request: 'rawData',
        startDate: '2025-04-15',
        endDate: '2025-05-15',
        orgUnit: 'A',
    },
    expected: { status: null, value: null },
    dx: [uid('g1-SUM-Weekly'), uid('g1-SUM-Monthly')],
}

const LIMIT_TYPES = [
    'Daily',
    'Weekly',
    'WeeklyWednesday',
    'WeeklyThursday',
    'WeeklyFriday',
    'WeeklySaturday',
    'WeeklySunday',
    'BiWeekly',
    'Monthly',
]

/*
 * Rows fully inside the range, as rawData returns them, at A and B: over
 * 50,000 where WeeklyFriday exists (2.43 on), a little under before.
 */
const limitCase = (context) => {
    const types = context.aggregationTypes.filter((type) => type !== 'NONE')
    const periodTypes = supportedTypes(context, LIMIT_TYPES)
    const range = { startDate: '2024-01-01', endDate: '2025-12-31' }
    const rows = periodTypes.reduce(
        (sum, periodType) =>
            sum +
            periodsInside(periodType, range.startDate, range.endDate).length *
                types.length *
                2,
        0
    )
    return {
        id: 'raw-row-limit',
        item: {
            notes: `G1 elements but NONE, collected ${periodTypes.join(
                ', '
            )}: ${rows} values.`,
        },
        query: { request: 'rawData', ...range, orgUnit: 'A;B' },
        expected: { status: 'VALUE', value: rows },
        dx: types.flatMap((type) =>
            periodTypes.map((periodType) => uid(`g1-${type}-${periodType}`))
        ),
    }
}

// Status, and the period types or the row count where they're expected.
const verdictOfRaw = (expected, observed) => {
    if (!expected.status) {
        return 'recorded'
    }
    const sameTypes =
        !expected.periodTypes ||
        JSON.stringify(expected.periodTypes) ===
            JSON.stringify(observed.periodTypes ?? [])
    const sameCount =
        expected.value === null || expected.value === observed.value
    return expected.status === observed.status && sameTypes && sameCount
        ? 'pass'
        : 'fail'
}

const buildGroup = (context) => {
    const metadataCases = METADATA_REQUESTS.map((request) => ({
        id: `meta-${request.name}`,
        item: {
            notes: 'Metadata request; the response is in metadata-shapes.json.',
        },
        query: { request: request.path },
        expected: { status: 'VALUE', value: null },
        request,
        judge: (expected, observed) =>
            observed.status === expected.status ? 'pass' : 'fail',
    }))
    const cases = [
        ...metadataCases,
        ...[...rawCases(), RANGE_CASE, limitCase(context)].map((testCase) => ({
            ...testCase,
            judge: verdictOfRaw,
        })),
    ]

    const verify = async (client, { orgUnitIds }) => {
        const rows = []
        const shapes = []

        for (const testCase of metadataCases) {
            const { ok, status, json } = await client.send(
                'GET',
                testCase.request.path
            )
            const response = sanitize(
                testCase.request.pick ? testCase.request.pick(json) : json
            )
            shapes.push({
                name: testCase.request.name,
                path: testCase.request.path,
                httpStatus: status,
                response,
            })
            const count = ok
                ? countObjects(testCase.request.pick ? { r: response } : json)
                : 0
            const observed = ok
                ? { status: count ? 'VALUE' : 'EMPTY', value: count }
                : {
                      status: 'ERROR',
                      value: null,
                      error: `${status}: ${json?.message}`,
                  }
            rows.push(toRow(testCase, observed))
        }

        for (const testCase of cases.filter(
            (c) => c.query.request === 'rawData'
        )) {
            const ou = testCase.query.orgUnit
                .split(';')
                .map((key) => orgUnitIds[key])
                .join(';')
            const dx = Array.isArray(testCase.dx) ? testCase.dx : [testCase.dx]
            const { ok, status, json } = await client.send(
                'GET',
                rawDataPath({
                    dx,
                    ou,
                    startDate: testCase.query.startDate,
                    endDate: testCase.query.endDate,
                })
            )
            let observed
            if (!ok) {
                observed = {
                    status: 'ERROR',
                    value: null,
                    error: `${json?.errorCode ?? status}: ${json?.message}`,
                }
            } else {
                const periods = readRawRows(json)
                const periodTypes = [
                    ...new Set(periods.map(periodTypeOfId)),
                ].sort()
                observed = {
                    status: periods.length ? 'VALUE' : 'EMPTY',
                    value: periods.length,
                    extra: {
                        periodTypes,
                        ...(testCase.id === 'raw-range-inside-only'
                            ? { periods: [...new Set(periods)].sort() }
                            : {}),
                    },
                }
            }
            rows.push(toRow(testCase, observed))
        }
        return { rows, responses: shapes }
    }

    return {
        key: KEY,
        number: 6,
        title: 'Detection requests',
        cases,
        verify,
    }
}

module.exports = { KEY, buildGroup, expectedTypes, sanitize }
