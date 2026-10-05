const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const {
    combineOrgUnits,
    expectedPlaceValue,
    expectedStatus,
    relation,
    statusOfValue,
    verdictOf,
} = require('./expected.js')
const { periodFromId, periodsOverlapping } = require('./period-types.js')

// 1, 2, 3… by month through 2024 and 2025.
const monthlySeries = periodsOverlapping(
    'Monthly',
    '2024-01-01',
    '2025-12-31'
).map((period, index) => ({ period, value: index + 1 }))

const yearlySeries = [
    { period: periodFromId('2024'), value: 120 },
    { period: periodFromId('2025'), value: 132 },
]

const monthlyValue = (aggregationType, queryType, periodId) =>
    expectedPlaceValue({
        aggregationType,
        collectionType: 'Monthly',
        queryType,
        queryPeriod: periodFromId(periodId),
        series: monthlySeries,
    })

describe('expected', () => {
    it('expects a value for the same or a longer type only', () => {
        const status = (aggregationType, queryType) =>
            expectedStatus({
                aggregationType,
                collectionType: 'Monthly',
                queryType,
            })
        assert.equal(status('SUM', 'Monthly'), 'VALUE')
        assert.equal(status('SUM', 'Quarterly'), 'VALUE')
        assert.equal(status('SUM', 'Weekly'), 'EMPTY')
        assert.equal(status('AVERAGE', 'Weekly'), 'REPEATED')
        assert.equal(status('AVERAGE_SUM_ORG_UNIT', 'Daily'), 'REPEATED')
        assert.equal(status('NONE', 'Monthly'), 'ERROR')
    })

    it('carries FIRST and LAST from the years the period touches', () => {
        const carried = (aggregationType, periodId) => {
            const queryPeriod = periodFromId(periodId)
            const args = {
                aggregationType,
                collectionType: 'Monthly',
                queryType: queryPeriod.periodType,
                queryPeriod,
                series: monthlySeries,
            }
            return [expectedStatus(args), expectedPlaceValue(args)]
        }
        // June 2025, the last month ended by 15 July.
        assert.deepEqual(carried('LAST', '20250715'), ['REPEATED', 18])
        // January 2025, not the day's month.
        assert.deepEqual(carried('FIRST', '20250715'), ['REPEATED', 13])
        // December 2024 is in a year the request doesn't touch.
        assert.deepEqual(carried('LAST', '20250101'), ['EMPTY', null])
        // Monday week 1 of 2025 starts in 2024: 2024 counts.
        assert.deepEqual(carried('FIRST', '2025W1'), ['REPEATED', 1])
    })

    it('reads a period by its start year, but a week by its id', () => {
        const series = (type) =>
            periodsOverlapping(type, '2024-01-01', '2025-12-31').map(
                (period, index) => ({ period, value: index + 1 })
            )
        const first = (type, periodId) =>
            expectedPlaceValue({
                aggregationType: 'FIRST',
                collectionType: type,
                queryType: 'Daily',
                queryPeriod: periodFromId(periodId),
                series: series(type),
            })
        // 2025NovQ1 and 2025BiW1 start in 2024: not 2025 periods.
        assert.equal(series('QuarterlyNov')[4].period.id, '2025NovQ1')
        assert.equal(first('QuarterlyNov', '20250715'), 6)
        assert.equal(series('BiWeekly')[26].period.id, '2025BiW1')
        assert.equal(first('BiWeekly', '20250715'), 28)
        // 2025W1 starts in 2024 but is a 2025 week.
        assert.equal(series('Weekly')[52].period.id, '2025W1')
        assert.equal(first('Weekly', '20250715'), 53)
    })

    it("doesn't count an equal-length type of another kind", () => {
        assert.equal(
            expectedStatus({
                aggregationType: 'SUM',
                collectionType: 'WeeklyWednesday',
                queryType: 'Weekly',
            }),
            'EMPTY'
        )
        assert.equal(relation('WeeklyWednesday', 'Weekly'), 'equal-length')
        assert.equal(relation('Monthly', 'Weekly'), 'shorter')
        assert.equal(relation('Monthly', 'Yearly'), 'longer')
        assert.equal(relation('Monthly', 'Monthly'), 'same')
    })

    it('gives Q1 of 1, 2, 3 by month for each aggregation type', () => {
        assert.equal(monthlyValue('SUM', 'Quarterly', '2024Q1'), 6)
        assert.equal(monthlyValue('AVERAGE', 'Quarterly', '2024Q1'), 2)
        assert.equal(monthlyValue('LAST', 'Quarterly', '2024Q1'), 3)
        assert.equal(monthlyValue('FIRST', 'Quarterly', '2024Q1'), 1)
        assert.equal(monthlyValue('MIN', 'Quarterly', '2024Q1'), 1)
        assert.equal(monthlyValue('MAX', 'Quarterly', '2024Q1'), 3)
        assert.equal(monthlyValue('COUNT', 'Quarterly', '2024Q1'), 3)
    })

    it('weights AVERAGE_SUM_ORG_UNIT by days', () => {
        // Months 13 to 24 are 2025, not a leap year: 6.53 once shifted by 12.
        const value = monthlyValue('AVERAGE_SUM_ORG_UNIT', 'Yearly', '2025')
        assert.equal(Math.round((value - 12) * 100) / 100, 6.53)
        assert.equal(monthlyValue('AVERAGE', 'Yearly', '2025') - 12, 6.5)
    })

    it('counts days without data as zero in AVERAGE_SUM_ORG_UNIT', () => {
        // Data ends in December 2025; 2025July runs to June 2026.
        const value = monthlyValue(
            'AVERAGE_SUM_ORG_UNIT',
            'FinancialJuly',
            '2025July'
        )
        const julyToDecember = [31, 31, 30, 31, 30, 31].reduce(
            (sum, days, index) => sum + (19 + index) * days,
            0
        )
        assert.equal(value, julyToDecember / 365)
    })

    it("computes no value where periods don't nest", () => {
        // April 2024 to March 2025: months 4 to 15.
        assert.equal(monthlyValue('SUM', 'FinancialApril', '2024April'), 114)
        assert.equal(monthlyValue('SUM', 'Weekly', '2024W5'), null)
        assert.equal(monthlyValue('SUM', 'BiMonthly', '202401B'), 3)
        // Months nest in November quarters: 11 + 12 + 13.
        assert.equal(monthlyValue('SUM', 'QuarterlyNov', '2025NovQ1'), 36)
        assert.equal(
            expectedPlaceValue({
                aggregationType: 'SUM',
                collectionType: 'Weekly',
                queryType: 'Monthly',
                queryPeriod: periodFromId('202401'),
                series: periodsOverlapping(
                    'Weekly',
                    '2024-01-01',
                    '2024-02-29'
                ).map((period) => ({ period, value: 1 })),
            }),
            null
        )
    })

    it('computes no value for aggregation types without a rule', () => {
        assert.equal(monthlyValue('STDDEV', 'Quarterly', '2024Q1'), null)
        assert.equal(
            monthlyValue('LAST_IN_PERIOD', 'Quarterly', '2024Q1'),
            null
        )
    })

    it('repeats an averaged value into shorter periods', () => {
        const repeated = (aggregationType, periodId, queryType) =>
            expectedPlaceValue({
                aggregationType,
                collectionType: 'Yearly',
                queryType,
                queryPeriod: periodFromId(periodId),
                series: yearlySeries,
            })
        assert.equal(repeated('AVERAGE', '202403', 'Monthly'), 120)
        assert.equal(
            repeated('AVERAGE_SUM_ORG_UNIT', '2025Q3', 'Quarterly'),
            132
        )
        assert.equal(
            repeated('AVERAGE', '2024AprilS2', 'SixMonthlyApril'),
            null
        )
        assert.equal(repeated('SUM', '202403', 'Monthly'), null)
    })

    it('sums across org units only for summed types', () => {
        assert.equal(combineOrgUnits('SUM', [1, 10]), 11)
        assert.equal(combineOrgUnits('AVERAGE_SUM_ORG_UNIT', [1, 10]), 11)
        assert.equal(combineOrgUnits('SUM', [1, null]), null)
        assert.equal(combineOrgUnits('AVERAGE', [1, 10]), null)
    })

    it('reads the status of a returned value', () => {
        assert.equal(statusOfValue(null, 'Weekly', ['Monthly']), 'EMPTY')
        assert.equal(statusOfValue(4, 'Weekly', ['Monthly']), 'REPEATED')
        assert.equal(statusOfValue(4, 'Yearly', ['Monthly']), 'VALUE')
        assert.equal(statusOfValue(4, 'Weekly', []), 'VALUE')
    })

    it('gives a verdict', () => {
        const value = (v) => ({ status: 'VALUE', value: v })
        assert.equal(verdictOf(value(6), value(6)), 'pass')
        assert.equal(verdictOf(value(6), value(6.0000000001)), 'pass')
        assert.equal(verdictOf(value(6), value(7)), 'fail')
        assert.equal(verdictOf(value(null), value(7)), 'recorded')
        assert.equal(
            verdictOf({ status: 'EMPTY', value: null }, value(7)),
            'fail'
        )
        assert.equal(
            verdictOf(
                { status: 'EMPTY', value: null },
                { status: 'EMPTY', value: null }
            ),
            'pass'
        )
        assert.equal(verdictOf({ status: null }, value(1)), 'recorded')
    })
})
