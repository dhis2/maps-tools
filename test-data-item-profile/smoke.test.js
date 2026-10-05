const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const {
    buildSmokeFixture,
    buildSmokeShapes,
    itemKey,
    patternKey,
    relationOf,
} = require('./smoke.js')

const element = (aggregationType, type = 'Monthly') => ({
    code: `PTT_${aggregationType}`,
    dimensionItemType: 'DATA_ELEMENT',
    aggregationType,
    collectionPeriodTypes: [type],
})

const testCase = (id, item, periodType, statuses) => ({
    id,
    item,
    // The period is read from the id: `…__p-<period>__…`.
    query: {
        periodType,
        period: id.match(/__p-([^_]+)/)?.[1] ?? 'x',
        orgUnit: 'A',
    },
    observed: Object.fromEntries(
        Object.entries(statuses).map(([v, status]) => [v, { status, value: 1 }])
    ),
})

const fixture = (group, cases) => ({
    schemaVersion: 1,
    group,
    part: 'SUM',
    runs: [{ version: '2.43.1' }, { version: '2.44-SNAPSHOT' }],
    cases,
})

describe('smoke subset', () => {
    it('relates collection and query types', () => {
        assert.equal(relationOf('Monthly', 'Monthly'), 'same')
        assert.equal(relationOf('Monthly', 'Yearly'), 'longer')
        assert.equal(relationOf('Monthly', 'Weekly'), 'shorter')
        assert.equal(
            relationOf('Yearly', 'FinancialApril'),
            'other-type-same-length'
        )
    })

    it('keys plain items by type, others by code', () => {
        assert.equal(
            itemKey({ id: 'a', item: element('SUM') }),
            'DATA_ELEMENT:SUM'
        )
        assert.equal(
            itemKey({
                id: 'a',
                item: { ...element('SUM'), collectionSources: [] },
            }),
            'PTT_SUM'
        )
        assert.equal(itemKey({ id: 'meta-x', item: { notes: 'n' } }), 'meta-x')
    })

    it('marks QuarterlyNov queries and every version status', () => {
        const key = patternKey(
            testCase('a', element('SUM'), 'QuarterlyNov', {
                '2.43.1': 'VALUE',
            }),
            ['2.43.1', '2.44-SNAPSHOT']
        )
        assert.equal(
            key,
            // No org unit selection: an empty part.
            'DATA_ELEMENT:SUM|longer|QuarterlyNov||2.43.1:VALUE,2.44-SNAPSHOT:-'
        )
    })

    it('keeps the first case of each pattern, sorted by id', () => {
        const statuses = { '2.43.1': 'VALUE', '2.44-SNAPSHOT': 'VALUE' }
        const smoke = buildSmokeFixture(
            fixture('g', [
                testCase('b', element('SUM'), 'Yearly', statuses),
                testCase('a', element('SUM'), 'Quarterly', statuses),
                testCase('c', element('SUM'), 'Weekly', statuses),
            ]),
            { startOf: () => '' }
        )
        assert.deepEqual(
            smoke.cases.map((c) => c.id),
            ['a', 'c']
        )
        assert.equal(smoke.smoke, '2 of 3 cases, one per pattern')
        assert.equal('part' in smoke, false)
    })

    it('keeps the cases the library names', () => {
        const statuses = { '2.43.1': 'EMPTY', '2.44-SNAPSHOT': 'EMPTY' }
        const item = {
            code: 'PTT_G4_IND_PERIOD_OFFSET',
            dimensionItemType: 'INDICATOR',
        }
        const smoke = buildSmokeFixture(
            fixture('indicators-and-expressions', [
                testCase(
                    'ind-period-offset__q-Yearly__p-2024__A',
                    item,
                    'Yearly',
                    statuses
                ),
                testCase(
                    'ind-period-offset__q-Yearly__p-2025__A',
                    item,
                    'Yearly',
                    statuses
                ),
                testCase(
                    'ind-period-offset__q-Yearly__p-2023__A',
                    item,
                    'Yearly',
                    statuses
                ),
            ]),
            { startOf: (id) => `${id.slice(0, 4)}-01-01` }
        )
        const ids = smoke.cases.map((c) => c.id)
        assert.ok(ids.includes('ind-period-offset__q-Yearly__p-2024__A'))
        assert.ok(!ids.includes('ind-period-offset__q-Yearly__p-2025__A'))
    })

    it('trims metadata shapes to four objects and the named codes', () => {
        const codes = ['A', 'B', 'C', 'D', 'E', 'PTT_G3_MW']
        const shapes = buildSmokeShapes({
            schemaVersion: 1,
            versions: {
                '2.43.1': {
                    instance: 'i',
                    date: 'd',
                    requests: [
                        {
                            name: 'dataElements',
                            path: 'p',
                            httpStatus: 200,
                            response: {
                                dataElements: codes.map((code) => ({ code })),
                            },
                        },
                        {
                            name: 'periodTypes',
                            path: 'p',
                            httpStatus: 200,
                            response: {},
                        },
                    ],
                },
            },
        })
        const [request] = shapes.versions['2.43.1'].requests
        assert.equal(shapes.versions['2.43.1'].requests.length, 1)
        assert.deepEqual(
            request.response.dataElements.map((o) => o.code),
            ['A', 'B', 'C', 'D', 'PTT_G3_MW']
        )
    })
})
