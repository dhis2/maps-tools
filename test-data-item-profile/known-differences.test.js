const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const {
    explain,
    spansTwoYears,
    versionsApart,
} = require('./known-differences.js')

const value = (v) => ({ status: 'VALUE', value: v })
const averaged = (period) => ({
    id: `agg-AVERAGE_SUM_ORG_UNIT__x__p-${period}__A`,
    item: { aggregationType: 'AVERAGE_SUM_ORG_UNIT' },
    query: { periodType: 'FinancialApril', period, orgUnit: 'A' },
})

describe('known differences', () => {
    it('lists the versions that differ from the newest one', () => {
        assert.deepEqual(
            versionsApart({
                '2.42.6': value(1.2486),
                '2.43.1': value(1.2521),
                '2.44-SNAPSHOT': value(1.2521),
            }),
            ['2.42.6']
        )
    })

    it('knows which periods span two years', () => {
        assert.equal(spansTwoYears('2024April'), true)
        assert.equal(spansTwoYears('2024Q3'), false)
    })

    it('explains the 366 or 365 days of averaged data before 2.43', () => {
        const byVersion = {
            '2.42.6': value(1.2486),
            '2.43.1': value(1.2521),
            '2.44-SNAPSHOT': value(1.2521),
        }
        assert.equal(
            explain(averaged('2024April'), byVersion),
            'finding 2: 366 or 365 days'
        )
        // Not within one year, and not when 2.43 differs.
        assert.equal(explain(averaged('2024Q3'), byVersion), null)
        assert.equal(
            explain(averaged('2024April'), {
                ...byVersion,
                '2.43.1': value(9),
            }),
            null
        )
    })

    it('explains QuarterlyNov on 2.40 only', () => {
        const testCase = {
            id: 'x',
            item: { aggregationType: 'SUM' },
            query: { periodType: 'QuarterlyNov', period: '2025NovQ1' },
        }
        const error = { status: 'ERROR', value: null }
        assert.equal(
            explain(testCase, { '2.40.12': error, '2.44-SNAPSHOT': value(1) }),
            'finding 5: QuarterlyNov fails on 2.40'
        )
        assert.equal(
            explain(testCase, { '2.41.10': error, '2.44-SNAPSHOT': value(1) }),
            null
        )
    })

    it('explains the arbitrary place at the region', () => {
        assert.equal(
            explain(
                {
                    id: 'x',
                    item: { aggregationType: 'LAST_LAST_ORG_UNIT' },
                    query: {
                        periodType: 'Daily',
                        period: '20250715',
                        orgUnit: 'region',
                    },
                },
                { '2.43.1': value(562), '2.44-SNAPSHOT': value(5620) }
            ),
            'finding 4: arbitrary place'
        )
    })
})
