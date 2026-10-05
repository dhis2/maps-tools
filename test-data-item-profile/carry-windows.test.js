const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const { RULES, sourceUnder } = require('./groups/carry-windows.js')
const { periodFromId, periodsOverlapping } = require('./period-types.js')

const rule = (name) => RULES.find((r) => r.name === name)
const monthly = periodsOverlapping('Monthly', '2024-01-01', '2025-12-31').map(
    (period, index) => ({ period, value: index + 1 })
)
const source = (ruleName, aggregationType, periodId) =>
    sourceUnder(
        rule(ruleName),
        aggregationType,
        monthly,
        periodFromId(periodId)
    )

describe('carry windows', () => {
    it('names 24 rules', () => {
        assert.equal(RULES.length, 24)
    })

    it('reads a week by its id year, and the query by its start date', () => {
        const weeks = periodsOverlapping(
            'Weekly',
            '2024-12-01',
            '2025-01-31'
        ).map((period, index) => ({ period, value: index + 1 }))
        // Monday week 1 of 2025 starts on 30 December 2024: it touches 2024.
        assert.equal(
            sourceUnder(
                rule('end<=q.end, mixed-year>=q-0'),
                'FIRST',
                weeks,
                periodFromId('2025W1')
            ),
            '2024W48'
        )
    })

    it('takes the last period ended by the query end, for LAST', () => {
        assert.equal(
            source('end<=q.end, date-year>=q-0', 'LAST', '20250715'),
            '202506'
        )
        assert.equal(
            source('start<=q.end, date-year>=q-0', 'LAST', '20250715'),
            '202507'
        )
    })

    it('limits how far back FIRST looks', () => {
        assert.equal(
            source('end<=q.end, date-year>=q-0', 'FIRST', '2025'),
            '202501'
        )
        assert.equal(
            source('end<=q.end, date-year>=q-1', 'FIRST', '2025'),
            '202401'
        )
        assert.equal(
            source('end<=q.end, date-year>=q-Infinity', 'FIRST', '2025'),
            '202401'
        )
    })

    it('finds nothing when no period counts', () => {
        assert.equal(
            source('end<=q.end, date-year>=q-0', 'LAST', '20240115'),
            null
        )
    })

    it('reads the year from the period id when asked', () => {
        // Monday week 1 of 2025 starts on 30 December 2024.
        const weeks = periodsOverlapping(
            'Weekly',
            '2024-12-01',
            '2025-01-31'
        ).map((period, index) => ({ period, value: index + 1 }))
        const query = periodFromId('20250106')
        assert.equal(
            sourceUnder(
                rule('end<=q.end, id-year>=q-0'),
                'FIRST',
                weeks,
                query
            ),
            '2025W1'
        )
        assert.equal(
            sourceUnder(
                rule('end<=q.end, date-year>=q-0'),
                'FIRST',
                weeks,
                query
            ),
            null
        )
    })
})
