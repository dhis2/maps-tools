/*
 * Group 2: periods that don't nest in months, quarters or years. One SUM
 * element per collection type, value 1 in every period at A, queried by
 * month, quarter and year through 2024 and 2025. Each value then counts the
 * periods analytics placed there, which tells the assignment rule apart:
 * by start date, by end date, or by most days.
 */
const { expectedStatus } = require('../expected.js')
const {
    daysBetween,
    frequencyOrder,
    overlaps,
    periodContaining,
    periodsOverlapping,
} = require('../period-types.js')
const {
    DATA_RANGE,
    dataElement,
    dataSet,
    itemOf,
    observeSingle,
    supportedTypes,
} = require('./shared.js')

const KEY = 'periods-that-dont-nest'

const COLLECTION_TYPES = [
    'Weekly',
    'WeeklyWednesday',
    'WeeklyThursday',
    'WeeklyFriday',
    'WeeklySaturday',
    'WeeklySunday',
    'BiWeekly',
    'QuarterlyNov',
    'SixMonthlyApril',
    'SixMonthlyNov',
    'FinancialApril',
    'FinancialJuly',
    'FinancialOct',
    'FinancialNov',
    'FinancialFeb',
    'FinancialAug',
    'FinancialSep',
]
const QUERY_TYPES = ['Monthly', 'Quarterly', 'Yearly']
const RULES = ['start', 'end', 'mostDays']

const overlapDays = (a, b) => {
    const start = a.startDate > b.startDate ? a.startDate : b.startDate
    const end = a.endDate < b.endDate ? a.endDate : b.endDate
    return start <= end ? daysBetween(start, end) : 0
}

// The query period a data period lands in, under each rule.
const targetOf = (rule, queryType, period) => {
    if (rule === 'start') {
        return periodContaining(queryType, period.startDate).id
    }
    if (rule === 'end') {
        return periodContaining(queryType, period.endDate).id
    }
    const candidates = periodsOverlapping(
        queryType,
        period.startDate,
        period.endDate
    )
    const best = Math.max(...candidates.map((c) => overlapDays(c, period)))
    const winners = candidates.filter((c) => overlapDays(c, period) === best)
    return winners.length === 1 ? winners[0].id : 'tie'
}

const countsByRule = (queryType, dataPeriods, queryPeriod) =>
    Object.fromEntries(
        RULES.map((rule) => [
            rule,
            dataPeriods.filter(
                (period) => targetOf(rule, queryType, period) === queryPeriod.id
            ).length,
        ])
    )

const buildGroup = (context) => {
    const columns = supportedTypes(context, COLLECTION_TYPES).map(
        (collectionType) => {
            const element = dataElement(`g2-${collectionType}`, {
                code: `PTT_G2_${collectionType}`,
                name: `PTT G2 SUM ${collectionType}`,
                aggregationType: 'SUM',
            })
            return {
                collectionType,
                element,
                periods: periodsOverlapping(
                    collectionType,
                    DATA_RANGE.startDate,
                    DATA_RANGE.endDate
                ),
                dataSet: dataSet(`g2-ds-${collectionType}`, {
                    code: `PTT_G2_DS_${collectionType}`,
                    name: `PTT G2 data set ${collectionType}`,
                    periodType: collectionType,
                    elements: [{ id: element.id }],
                    orgUnits: ['A'],
                }),
            }
        }
    )

    const cases = columns.flatMap(({ collectionType, element, periods }) =>
        QUERY_TYPES.filter(
            (queryType) =>
                frequencyOrder(queryType) >= frequencyOrder(collectionType)
        ).flatMap((queryType) =>
            periodsOverlapping(
                queryType,
                DATA_RANGE.startDate,
                DATA_RANGE.endDate
            ).map((queryPeriod) => ({
                id: `nest-${collectionType}__q-${queryType}__p-${queryPeriod.id}__A`,
                item: itemOf(element, [collectionType]),
                query: {
                    periodType: queryType,
                    period: queryPeriod.id,
                    orgUnit: 'A',
                },
                expected: {
                    status: expectedStatus({
                        aggregationType: 'SUM',
                        collectionType,
                        queryType,
                    }),
                    value: null,
                },
                byRule: countsByRule(
                    queryType,
                    periods.filter((p) => overlaps(p, queryPeriod)),
                    queryPeriod
                ),
                cells: [{ dx: element.id, pe: queryPeriod.id, ou: 'A' }],
                // One period per request (see carry-windows.js).
                batchKey: `${queryType}|${queryPeriod.id}`,
                observe: observeSingle(queryType, [collectionType]),
            }))
        )
    )

    return {
        key: KEY,
        number: 2,
        title: "Periods that don't nest",
        dataElements: columns.map(({ element }) => element),
        dataSets: columns.map(({ dataSet }) => dataSet),
        dataValues: columns.flatMap(({ element, dataSet, periods }) =>
            periods.map((period) => ({
                dataSet: dataSet.id,
                dataElement: element.id,
                period: period.id,
                orgUnit: 'A',
                value: 1,
            }))
        ),
        cases,
        summarize: summarizeRules,
    }
}

// For each collection and query type pair, the rules that give every
// observed count.
const summarizeRules = (observedCases) => {
    const pairs = new Map()
    observedCases.forEach(({ testCase, observed }) => {
        const pair = `${testCase.item.collectionPeriodTypes[0]} by ${testCase.query.periodType}`
        if (!pairs.has(pair)) {
            pairs.set(pair, { matching: new Set(RULES), empty: 0, cases: 0 })
        }
        const entry = pairs.get(pair)
        entry.cases++
        if (observed.status === 'EMPTY') {
            entry.empty++
        }
        const count = observed.value ?? 0
        RULES.forEach((rule) => {
            if (testCase.byRule[rule] !== count) {
                entry.matching.delete(rule)
            }
        })
    })
    return Object.fromEntries(
        [...pairs].map(([pair, entry]) => [
            pair,
            {
                rules: [...entry.matching],
                empty: entry.empty,
                cases: entry.cases,
            },
        ])
    )
}

module.exports = { KEY, RULES, buildGroup, summarizeRules, targetOf }
