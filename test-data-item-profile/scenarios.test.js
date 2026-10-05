const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const { stringifyFixture } = require('./export-fixtures.js')
const { expectedTypes, sanitize } = require('./groups/detection-requests.js')
const {
    SUBJECTS,
    expectedFor,
    observeProbe,
} = require('./groups/mixed-collection.js')
const { targetOf } = require('./groups/periods-that-dont-nest.js')
const { expectedMetric } = require('./groups/reporting-rates.js')
const { findCollisions } = require('./metadata.js')
const { periodFromId } = require('./period-types.js')
const { buildScenarios } = require('./scenarios.js')
const { OFFLINE } = require('./server.js')

const offline = { ...OFFLINE, serverPeriodTypes: null }
const subject = (name) => SUBJECTS.find((s) => s.name === name)

describe('scenarios', () => {
    const model = buildScenarios(offline)
    const objects = model.groups.flatMap((group) => [
        ...(group.dataElements ?? []),
        ...(group.dataSets ?? []),
        ...(group.indicators ?? []),
    ])

    it('gives every object its own id and code, within 50 characters', () => {
        assert.deepEqual(findCollisions(model), [])
        const codes = objects.map((o) => o.code)
        assert.equal(new Set(codes).size, codes.length)
        objects.forEach((o) => {
            assert.ok(o.code.startsWith('PTT_'), o.code)
            assert.ok(o.code.length <= 50, o.code)
            assert.ok(o.shortName.length <= 50, o.shortName)
        })
    })

    it('gives every case its own id', () => {
        model.groups.forEach((group) => {
            const ids = group.cases.map((c) => c.id)
            assert.equal(new Set(ids).size, ids.length, group.key)
        })
    })

    it('leaves out period types the server lacks', () => {
        const older = buildScenarios({
            ...OFFLINE,
            serverPeriodTypes: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
        })
        const g1 = older.groups.find(
            (g) => g.key === 'aggregation-by-period-type'
        )
        assert.deepEqual(
            [...new Set(g1.dataSets.map((set) => set.periodType))],
            ['Daily', 'Weekly', 'Monthly', 'Yearly']
        )
        assert.equal(g1.cases.length, 19 * 4 * 4 * 2 * 3)
    })
})

describe('mixed collection', () => {
    it('expects the Part 0 findings', () => {
        assert.equal(
            expectedFor(subject('mw'), '2025Q2', 'Weekly', 'A').status,
            'PARTIAL'
        )
        assert.equal(
            expectedFor(subject('mw'), '2025Q2', 'Monthly', 'A').status,
            'VALUE'
        )
        assert.equal(
            expectedFor(subject('place'), '2025Q2', 'Weekly', 'region').status,
            'PARTIAL'
        )
        assert.equal(
            expectedFor(subject('place'), '2025Q2', 'Weekly', 'A').status,
            'EMPTY'
        )
        assert.equal(
            expectedFor(subject('history'), '2024Q2', 'Weekly', 'A').status,
            'EMPTY'
        )
        assert.equal(
            expectedFor(subject('history'), '2025Q2', 'Weekly', 'A').status,
            'VALUE'
        )
    })

    it('reads the coarser probe', () => {
        const probe = observeProbe(2)
        const cell = (value) => ({ value, error: null })
        assert.equal(probe([cell(1), cell(2), cell(3)]).status, 'VALUE')
        assert.equal(probe([cell(1), cell(null), cell(3)]).status, 'PARTIAL')
        assert.equal(probe([cell(null), cell(null), cell(3)]).status, 'EMPTY')
        assert.equal(
            probe([{ value: null, error: 'E7611' }, cell(1), cell(3)]).status,
            'ERROR'
        )
    })
})

describe('periods that do not nest', () => {
    it('places a week by start date, end date or most days', () => {
        const week = periodFromId('2025W1')
        assert.equal(targetOf('start', 'Monthly', week), '202412')
        assert.equal(targetOf('end', 'Monthly', week), '202501')
        assert.equal(targetOf('mostDays', 'Monthly', week), '202501')
        assert.equal(
            targetOf('mostDays', 'Monthly', periodFromId('2024BiW7')),
            'tie'
        )
    })
})

describe('reporting rates', () => {
    it('counts expected and actual reports where periods nest', () => {
        const quarter = periodFromId('2025Q1')
        const metric = (name, orgUnit) =>
            expectedMetric(name, 'Monthly', 'Quarterly', quarter, orgUnit)
        assert.equal(metric('EXPECTED_REPORTS', 'region'), 6)
        assert.equal(metric('ACTUAL_REPORTS', 'A'), 3)
        // B registers every other month: 2025 starts on month 13, index 12.
        assert.equal(metric('ACTUAL_REPORTS', 'B'), 2)
        assert.equal(metric('REPORTING_RATE', 'region'), (5 / 6) * 100)
        // Finding 9: 0 in a shorter period; one expected report per place
        // in an equal-length one of another type.
        assert.equal(
            expectedMetric(
                'REPORTING_RATE',
                'Monthly',
                'Weekly',
                periodFromId('2025W3'),
                'A'
            ),
            0
        )
        assert.equal(
            expectedMetric(
                'EXPECTED_REPORTS',
                'Quarterly',
                'QuarterlyNov',
                periodFromId('2025NovQ1'),
                'region'
            ),
            2
        )
    })
})

describe('detection requests', () => {
    it('expects the period types present in a range', () => {
        const all = { startDate: '2024-01-01', endDate: '2025-12-31' }
        const year = (y) => ({ startDate: `${y}-01-01`, endDate: `${y}-12-31` })
        assert.deepEqual(expectedTypes(subject('history'), all, 'A'), [
            'Monthly',
            'Weekly',
        ])
        assert.deepEqual(expectedTypes(subject('history'), year(2024), 'A'), [
            'Monthly',
        ])
        assert.deepEqual(expectedTypes(subject('place'), all, 'B'), ['Weekly'])
        assert.deepEqual(expectedTypes(subject('orphan'), year(2024), 'A'), [])
    })

    it('drops fields that change with every import', () => {
        assert.deepEqual(
            sanitize({
                id: 'a',
                lastUpdated: 'x',
                list: [{ href: 'y', code: 'c' }],
            }),
            { id: 'a', list: [{ code: 'c' }] }
        )
    })
})

describe('fixtures', () => {
    it('writes valid JSON, one case per line', () => {
        const text = stringifyFixture({
            schemaVersion: 1,
            group: 'g',
            cases: [{ id: 'a' }, { id: 'b' }],
        })
        assert.deepEqual(JSON.parse(text).cases, [{ id: 'a' }, { id: 'b' }])
        assert.equal(
            text.split('\n').filter((l) => l.includes('"id"')).length,
            2
        )
    })
})
