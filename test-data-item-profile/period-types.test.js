const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const {
    ENTERABLE_PERIOD_TYPE_NAMES,
    PERIOD_TYPE_NAMES,
    periodContaining,
    periodDays,
    periodFromId,
    periodTypeOfId,
    periodsInside,
    periodsOverlapping,
    previousPeriod,
} = require('./period-types.js')

// Start and end dates as analytics metadata gave them on 2.43.1
// (includeMetadataDetails=true).
const SERVER_PERIODS = [
    ['20240229', '2024-02-29', '2024-02-29'],
    ['2024W1', '2024-01-01', '2024-01-07'],
    ['2024W52', '2024-12-23', '2024-12-29'],
    ['2025W1', '2024-12-30', '2025-01-05'],
    ['2025W52', '2025-12-22', '2025-12-28'],
    ['2026W1', '2025-12-29', '2026-01-04'],
    ['2020W53', '2020-12-28', '2021-01-03'],
    ['2024WedW1', '2024-01-03', '2024-01-09'],
    ['2025WedW1', '2025-01-01', '2025-01-07'],
    ['2024ThuW1', '2024-01-04', '2024-01-10'],
    ['2025ThuW1', '2025-01-02', '2025-01-08'],
    ['2024FriW1', '2023-12-29', '2024-01-04'],
    ['2025FriW1', '2025-01-03', '2025-01-09'],
    ['2024SatW1', '2023-12-30', '2024-01-05'],
    ['2025SatW1', '2025-01-04', '2025-01-10'],
    ['2024SatW53', '2024-12-28', '2025-01-03'],
    ['2024SunW1', '2023-12-31', '2024-01-06'],
    ['2025SunW1', '2024-12-29', '2025-01-04'],
    ['2025SunW53', '2025-12-28', '2026-01-03'],
    ['2024BiW1', '2024-01-01', '2024-01-14'],
    ['2024BiW26', '2024-12-16', '2024-12-29'],
    ['2025BiW1', '2024-12-30', '2025-01-12'],
    ['2025BiW26', '2025-12-15', '2025-12-28'],
    ['2020BiW26', '2020-12-14', '2020-12-27'],
    ['2020BiW27', '2020-12-28', '2021-01-10'],
    ['202401B', '2024-01-01', '2024-02-29'],
    ['2024Q4', '2024-10-01', '2024-12-31'],
    ['2024NovQ1', '2023-11-01', '2024-01-31'],
    ['2024NovQ4', '2024-08-01', '2024-10-31'],
    ['2025NovQ1', '2024-11-01', '2025-01-31'],
    ['2024S2', '2024-07-01', '2024-12-31'],
    ['2024AprilS1', '2024-04-01', '2024-09-30'],
    ['2024AprilS2', '2024-10-01', '2025-03-31'],
    ['2024NovS1', '2023-11-01', '2024-04-30'],
    ['2025NovS2', '2025-05-01', '2025-10-31'],
    ['2024', '2024-01-01', '2024-12-31'],
    ['2024Feb', '2024-02-01', '2025-01-31'],
    ['2024April', '2024-04-01', '2025-03-31'],
    ['2024July', '2024-07-01', '2025-06-30'],
    ['2024Aug', '2024-08-01', '2025-07-31'],
    ['2024Sep', '2024-09-01', '2025-08-31'],
    ['2024Oct', '2024-10-01', '2025-09-30'],
    ['2024Nov', '2023-11-01', '2024-10-31'],
    ['2025Nov', '2024-11-01', '2025-10-31'],
]

// Ids the server refused as "Period not valid".
const INVALID_IDS = [
    '2024W53',
    '2024BiW27',
    '2025BiW27',
    '2025SatW53',
    '2025FriW53',
    '2020WedW53',
    '2026SunW53',
    '202412B',
]

describe('period-types', () => {
    it('knows the 24 period types, all but TwoYearly enterable', () => {
        assert.equal(PERIOD_TYPE_NAMES.length, 24)
        assert.equal(ENTERABLE_PERIOD_TYPE_NAMES.length, 23)
        assert.ok(!ENTERABLE_PERIOD_TYPE_NAMES.includes('TwoYearly'))
    })

    SERVER_PERIODS.forEach(([id, startDate, endDate]) => {
        it(`gives ${id} the server's dates`, () => {
            const period = periodFromId(id)
            assert.ok(period, `${id} not generated`)
            assert.equal(period.startDate, startDate)
            assert.equal(period.endDate, endDate)
        })
    })

    INVALID_IDS.forEach((id) => {
        it(`doesn't generate ${id}, which the server refuses`, () => {
            assert.equal(periodFromId(id), null)
        })
    })

    it('reads the type from an id', () => {
        assert.equal(periodTypeOfId('20240101'), 'Daily')
        assert.equal(periodTypeOfId('202401'), 'Monthly')
        assert.equal(periodTypeOfId('2024'), 'Yearly')
        assert.equal(periodTypeOfId('2024WedW3'), 'WeeklyWednesday')
        assert.equal(periodTypeOfId('2024W3'), 'Weekly')
        assert.equal(periodTypeOfId('2024NovQ2'), 'QuarterlyNov')
        assert.equal(periodTypeOfId('2024Nov'), 'FinancialNov')
        assert.equal(periodTypeOfId('2024NovS1'), 'SixMonthlyNov')
        assert.equal(periodTypeOfId('nonsense'), null)
    })

    it('tiles each year without gaps or overlaps', () => {
        ENTERABLE_PERIOD_TYPE_NAMES.forEach((type) => {
            const periods = periodsOverlapping(type, '2024-01-01', '2025-12-31')
            periods.slice(1).forEach((period, index) => {
                const before = periods[index]
                const dayAfter = new Date(`${before.endDate}T00:00:00Z`)
                dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)
                assert.equal(
                    period.startDate,
                    dayAfter.toISOString().slice(0, 10),
                    `${type}: ${before.id} then ${period.id}`
                )
            })
        })
    })

    it('lists the periods overlapping a range, and those inside it', () => {
        const overlapping = periodsOverlapping(
            'Weekly',
            '2025-04-01',
            '2025-06-30'
        )
        assert.equal(overlapping[0].id, '2025W14')
        assert.equal(overlapping.at(-1).id, '2025W27')
        const inside = periodsInside('Weekly', '2025-04-01', '2025-06-30')
        assert.equal(inside[0].id, '2025W15')
        assert.equal(inside.at(-1).id, '2025W26')
    })

    it('counts the days of a period', () => {
        assert.equal(periodDays(periodFromId('2024')), 366)
        assert.equal(periodDays(periodFromId('202402')), 29)
        assert.equal(periodDays(periodFromId('2025W1')), 7)
    })

    it('finds the period holding a date, and the one before', () => {
        assert.equal(periodContaining('Weekly', '2025-01-01').id, '2025W1')
        assert.equal(
            periodContaining('FinancialNov', '2025-01-01').id,
            '2025Nov'
        )
        const previous = previousPeriod('Monthly', periodFromId('202501'))
        assert.equal(previous.id, '202412')
    })
})
