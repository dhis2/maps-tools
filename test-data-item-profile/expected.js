/*
 * What analytics should return, from the rules VERSION-FINDINGS.md
 * establishes. Pure. A `fail` is a server that doesn't follow them.
 *
 * - A value exists when the query type is the collection type or a longer
 *   one. "Longer" compares the server's frequency order. Equal length but
 *   another type (a Wednesday week asked by Monday week, a financial year
 *   asked by year) is not enough (finding 1).
 * - Averaged aggregations also repeat a value into every shorter period
 *   (finding 2).
 * - FIRST and LAST, and their org unit variants, carry a value in from
 *   another period (finding 3, `carriedSource`).
 * - NONE can't be queried.
 */
const {
    contains,
    frequencyOrder,
    overlaps,
    periodDays,
    periodTypeOfId,
} = require('./period-types.js')

const AVERAGED = ['AVERAGE', 'AVERAGE_SUM_ORG_UNIT']
const CARRIED = [
    'FIRST',
    'LAST',
    'FIRST_AVERAGE_ORG_UNIT',
    'LAST_AVERAGE_ORG_UNIT',
    'FIRST_FIRST_ORG_UNIT',
    'LAST_LAST_ORG_UNIT',
]
const TOLERANCE = 1e-6

/*
 * Finding 3, for a period asked alone: a data period counts when it ended
 * by the end of the query period and its year is the query's start year
 * or later (the years the request touches). FIRST takes the earliest that
 * counts, LAST the latest; none, nothing. `series` is [{ period, value }]
 * oldest first.
 *
 * A data period's year is its start date's, except for weeks: the year in
 * the id (2025W1, from 30 December 2024, is 2025). So 2025NovQ1, from
 * November 2024, and 2025BiW1, from 30 December 2024, are 2024 periods.
 */
const dataYear = (period) =>
    Number(
        (periodTypeOfId(period.id)?.startsWith('Weekly')
            ? period.id
            : period.startDate
        ).slice(0, 4)
    )

const carriedSource = (aggregationType, series, queryPeriod) => {
    const startYear = Number(queryPeriod.startDate.slice(0, 4))
    const counted = series.filter(
        ({ period }) =>
            period.endDate <= queryPeriod.endDate &&
            dataYear(period) >= startYear
    )
    if (!counted.length) {
        return null
    }
    return aggregationType.startsWith('FIRST') ? counted[0] : counted.at(-1)
}

const fits = (collectionType, queryType) =>
    collectionType === queryType ||
    frequencyOrder(queryType) > frequencyOrder(collectionType)

// How the query type relates to the collection type, for the report.
const relation = (collectionType, queryType) => {
    if (collectionType === queryType) {
        return 'same'
    }
    const difference =
        frequencyOrder(queryType) - frequencyOrder(collectionType)
    if (difference > 0) {
        return 'longer'
    }
    return difference < 0 ? 'shorter' : 'equal-length'
}

// A carried type needs the data (`series`) and the `queryPeriod`.
const expectedStatus = ({
    aggregationType,
    collectionType,
    queryType,
    series,
    queryPeriod,
}) => {
    if (aggregationType === 'NONE') {
        return 'ERROR'
    }
    const fitting = fits(collectionType, queryType) ? 'VALUE' : 'REPEATED'
    if (CARRIED.includes(aggregationType)) {
        return carriedSource(aggregationType, series, queryPeriod)
            ? fitting
            : 'EMPTY'
    }
    if (fitting === 'VALUE') {
        return 'VALUE'
    }
    return AVERAGED.includes(aggregationType) ? 'REPEATED' : 'EMPTY'
}

/*
 * Reporting rates, actual and expected reports (finding 9): asked for a
 * shorter period or an equal-length one of another type, they answer a
 * row, with 0, not nothing.
 */
const expectedRateStatus = (collectionType, queryType) =>
    fits(collectionType, queryType) ? 'VALUE' : 'REPEATED'

/*
 * Entries are { value, days }, oldest first. AVERAGE_SUM_ORG_UNIT weights
 * by days and divides by the query period's days, so days without data
 * count as zero (2.43.1: daily data through December 2025, asked for
 * April 2025 to March 2026, gives the sum over 365 days).
 */
const AGGREGATORS = {
    SUM: (entries) => entries.reduce((sum, e) => sum + e.value, 0),
    AVERAGE: (entries) => AGGREGATORS.SUM(entries) / entries.length,
    AVERAGE_SUM_ORG_UNIT: (entries, queryDays) =>
        entries.reduce((sum, e) => sum + e.value * e.days, 0) / queryDays,
    MIN: (entries) => Math.min(...entries.map((e) => e.value)),
    MAX: (entries) => Math.max(...entries.map((e) => e.value)),
    COUNT: (entries) => entries.length,
    FIRST: (entries) => entries[0].value,
    LAST: (entries) => entries.at(-1).value,
}

// Across org units, only sums are certain.
const SUMMED_ACROSS_ORG_UNITS = ['SUM', 'COUNT', 'AVERAGE_SUM_ORG_UNIT']

/*
 * The value at one place, or null where it isn't computed: periods that
 * don't nest, or aggregation types without an exact rule here. `series` is
 * that place's data, [{ period, value }] oldest first.
 */
const expectedPlaceValue = ({
    aggregationType,
    collectionType,
    queryType,
    queryPeriod,
    series,
}) => {
    if (CARRIED.includes(aggregationType)) {
        return (
            carriedSource(aggregationType, series, queryPeriod)?.value ?? null
        )
    }
    const overlapping = series.filter((entry) =>
        overlaps(entry.period, queryPeriod)
    )
    if (!overlapping.length) {
        return null
    }
    if (fits(collectionType, queryType)) {
        const aggregate = AGGREGATORS[aggregationType]
        const nests = overlapping.every((entry) =>
            contains(queryPeriod, entry.period)
        )
        if (!aggregate || !nests) {
            return null
        }
        return aggregate(
            overlapping.map((entry) => ({
                value: entry.value,
                days: periodDays(entry.period),
            })),
            periodDays(queryPeriod)
        )
    }
    const repeats =
        AVERAGED.includes(aggregationType) &&
        overlapping.length === 1 &&
        contains(overlapping[0].period, queryPeriod)
    return repeats ? overlapping[0].value : null
}

const combineOrgUnits = (aggregationType, values) =>
    SUMMED_ACROSS_ORG_UNITS.includes(aggregationType) &&
    values.every((value) => value !== null)
        ? values.reduce((sum, value) => sum + value, 0)
        : null

// The status of a value that came back, for items collected at these types.
const statusOfValue = (value, queryType, collectionTypes) => {
    if (value === null || value === undefined) {
        return 'EMPTY'
    }
    const anyFits =
        !collectionTypes.length ||
        collectionTypes.some((type) => fits(type, queryType))
    return anyFits ? 'VALUE' : 'REPEATED'
}

const sameValue = (a, b) =>
    Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(b))

/*
 * pass or fail against the expected status, and the value where one is
 * computed. `recorded` when the status matches but no value is expected:
 * those values are compared across versions instead.
 */
const verdictOf = (expected, observed) => {
    if (!expected.status) {
        return 'recorded'
    }
    if (expected.status !== observed.status) {
        return 'fail'
    }
    const hasValue = ['VALUE', 'REPEATED', 'PARTIAL'].includes(observed.status)
    if (!hasValue) {
        return 'pass'
    }
    if (expected.value === null || expected.value === undefined) {
        return 'recorded'
    }
    return sameValue(observed.value, expected.value) ? 'pass' : 'fail'
}

module.exports = {
    AVERAGED,
    CARRIED,
    carriedSource,
    combineOrgUnits,
    expectedPlaceValue,
    expectedRateStatus,
    expectedStatus,
    fits,
    relation,
    statusOfValue,
    verdictOf,
}
