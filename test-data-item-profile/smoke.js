/*
 * The smoke subset the library keeps in its repo: one case per pattern of
 * each group, plus the cases its tests name. Spec from the library session
 * (2026-10-01). Pure.
 *
 * A pattern is: the item key, how each collection type relates to the
 * query type, whether the query is QuarterlyNov (2.40 answers it with a
 * 500), and the observed status on every version.
 */
const { frequencyOrder } = require('./period-types.js')

const SINGLE_TYPE_ITEMS = ['DATA_ELEMENT', 'REPORTING_RATE']

const itemKey = ({ id, item }) => {
    const types = item.collectionPeriodTypes ?? []
    const plain =
        SINGLE_TYPE_ITEMS.includes(item.dimensionItemType) &&
        types.length === 1 &&
        !item.collectionSources &&
        !item.operands
    if (plain) {
        return `${item.dimensionItemType}:${item.aggregationType ?? item.metric}`
    }
    // Metadata requests (group 6) have no code: each is its own item.
    return item.code ?? id
}

const relationOf = (collectionType, queryType) => {
    if (collectionType === queryType) {
        return 'same'
    }
    const difference =
        frequencyOrder(queryType) - frequencyOrder(collectionType)
    if (difference > 0) {
        return 'longer'
    }
    return difference < 0 ? 'shorter' : 'other-type-same-length'
}

const patternKey = (testCase, versions) => {
    const { item, query } = testCase
    const relations = query.periodType
        ? (item.collectionPeriodTypes ?? [])
              .map((type) => relationOf(type, query.periodType))
              .join(',')
        : ''
    const quarterlyNov =
        query.periodType === 'QuarterlyNov' ? 'QuarterlyNov' : ''
    const statuses = versions
        .map((v) => `${v}:${testCase.observed[v]?.status ?? '-'}`)
        .join(',')
    // Org unit cases differ by the selection asked for.
    const orgUnits = query.orgUnits?.join(';') ?? ''
    return [
        itemKey(testCase),
        relations,
        quarterlyNov,
        orgUnits,
        statuses,
    ].join('|')
}

// Cases the library's tests read by id, kept whatever their pattern.
const REQUIRED = {
    'mixed-collection': [
        { pattern: /^mixed-place__.*__A$/, all: false },
        { pattern: /^mixed-place__.*__B$/, all: false },
        { pattern: /^mixed-history__.*__r-2024/, all: false },
        { pattern: /^mixed-orphan__/, all: false },
    ],
    'indicators-and-expressions': [
        {
            pattern: /^ind-period-offset__/,
            all: true,
            when: ({ query }, startOf) => startOf(query.period) <= '2024-01-01',
        },
    ],
}

const sampleCases = (fixture, { startOf }) => {
    const versions = fixture.runs.map((run) => run.version)
    const sorted = [...fixture.cases].sort((a, b) => a.id.localeCompare(b.id))
    const kept = new Map()
    const seen = new Set()
    sorted.forEach((testCase) => {
        const key = patternKey(testCase, versions)
        if (!seen.has(key)) {
            seen.add(key)
            kept.set(testCase.id, testCase)
        }
    })
    const patterns = kept.size
    ;(REQUIRED[fixture.group] ?? []).forEach(({ pattern, all, when }) => {
        const matching = sorted.filter(
            (c) => pattern.test(c.id) && (!when || when(c, startOf))
        )
        const already = matching.some((c) => kept.has(c.id))
        ;(all ? matching : already ? [] : matching.slice(0, 1)).forEach((c) =>
            kept.set(c.id, c)
        )
    })
    const cases = sorted.filter((c) => kept.has(c.id))
    const required = cases.length - patterns
    return {
        cases,
        note: `${cases.length} of ${fixture.cases.length} cases, one per pattern${
            required ? ` and ${required} the library's tests name` : ''
        }`,
    }
}

const buildSmokeFixture = (fixture, options) => {
    const { part, cases, ...header } = fixture
    const sample = sampleCases(fixture, options)
    return { ...header, smoke: sample.note, cases: sample.cases }
}

// The period requests, and every org unit request (group 15).
const SMOKE_REQUESTS = [
    'dataElements',
    'indicators',
    'dataSets',
    'expressionDimensionItems',
    'periodTypes',
]
const ORG_UNIT_REQUESTS =
    /^(dataElements-aggregationLevels|programIndicators|programs|organisationUnitLevels|count-|list-|me)/
const keptRequest = (name) =>
    SMOKE_REQUESTS.includes(name) || ORG_UNIT_REQUESTS.test(name)
const SHAPE_OBJECTS = 4
const REQUIRED_CODES = { dataElements: ['PTT_G3_MW', 'PTT_G3_ORPHAN'] }

// The first objects of each list, and any the library's tests name.
const trimResponse = (name, response) =>
    Object.fromEntries(
        Object.entries(response ?? {}).map(([key, value]) => {
            if (!Array.isArray(value)) {
                return [key, value]
            }
            const required = REQUIRED_CODES[name] ?? []
            const kept = value.filter(
                (object, index) =>
                    index < SHAPE_OBJECTS || required.includes(object.code)
            )
            return [key, kept]
        })
    )

const buildSmokeShapes = (shapes) => ({
    ...shapes,
    smoke: `Requests ${SMOKE_REQUESTS.join(
        ', '
    )}, and the org unit requests; the first ${SHAPE_OBJECTS} objects of each list, and ${REQUIRED_CODES.dataElements.join(
        ' and '
    )} in dataElements.`,
    versions: Object.fromEntries(
        Object.entries(shapes.versions).map(([version, entry]) => [
            version,
            {
                ...entry,
                requests: entry.requests
                    .filter((request) => keptRequest(request.name))
                    .map((request) => ({
                        ...request,
                        response: trimResponse(request.name, request.response),
                    })),
            },
        ])
    ),
})

module.exports = {
    buildSmokeFixture,
    buildSmokeShapes,
    itemKey,
    patternKey,
    relationOf,
    sampleCases,
}
