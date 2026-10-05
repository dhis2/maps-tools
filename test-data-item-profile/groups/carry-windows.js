/*
 * Group 7: where FIRST and LAST take a value from when the query period
 * isn't the collection period (VERSION-FINDINGS.md, finding 3). Every value
 * is unique per element, so the value that comes back names its source
 * period. Two layouts: every period of 2024 and 2025 (dense), and one
 * value in March 2023 and one in August 2024 (sparse). Queries sweep the
 * periods holding the 1st and the 15th of each month, 2023 to mid-2026, at
 * A. Nothing is expected: `summarize` scores candidate rules instead. The
 * fixture gives each case's source period as `observed[version].source`.
 */
const { statusOfValue } = require('../expected.js')
const { periodContaining, periodsOverlapping } = require('../period-types.js')
const {
    DATA_RANGE,
    dataElement,
    dataSet,
    itemOf,
    supportedTypes,
} = require('./shared.js')

const KEY = 'carry-windows'

const AGGREGATION_TYPES = [
    'FIRST',
    'LAST',
    'FIRST_AVERAGE_ORG_UNIT',
    'LAST_AVERAGE_ORG_UNIT',
    'LAST_IN_PERIOD',
]
const PERIOD_TYPES = [
    'Daily',
    'Weekly',
    'WeeklyWednesday',
    'Monthly',
    'Quarterly',
    'Yearly',
    'FinancialApril',
]
const SPARSE_DATES = ['2023-03-15', '2024-08-15']
const SWEEP = { startYear: 2023, endYear: 2026, endMonth: 6 }

const LAYOUTS = {
    dense: (periodType) =>
        periodsOverlapping(
            periodType,
            DATA_RANGE.startDate,
            DATA_RANGE.endDate
        ).map((period, index) => ({ period, value: index + 1 })),
    sparse: (periodType) =>
        SPARSE_DATES.map((date, index) => ({
            period: periodContaining(periodType, date),
            value: 101 + index,
        })),
}

// The periods of a type holding the 1st or the 15th of each month.
const sweepPeriods = (periodType) => {
    const byId = new Map()
    for (let year = SWEEP.startYear; year <= SWEEP.endYear; year++) {
        const lastMonth = year === SWEEP.endYear ? SWEEP.endMonth : 12
        for (let month = 1; month <= lastMonth; month++) {
            ;['01', '15'].forEach((day) => {
                const date = `${year}-${String(month).padStart(2, '0')}-${day}`
                const period = periodContaining(periodType, date)
                byId.set(period.id, period)
            })
        }
    }
    return [...byId.values()]
}

const yearOf = (isoDate) => Number(isoDate.slice(0, 4))
const idYear = (period) => Number(period.id.slice(0, 4))

/*
 * Candidate rules: which data periods count (ended by the query's end, or
 * started by it), and how far back: from 1 January of the query's year,
 * or k years earlier. The years come from start dates (`date`), from the
 * period ids (`id`), or from the data's id and the query's start date
 * (`mixed`, as analytics reads its year tables). FIRST takes the earliest
 * period that counts, LAST the latest.
 */
const YEAR_SOURCES = {
    date: {
        query: (q) => yearOf(q.startDate),
        data: (d) => yearOf(d.startDate),
    },
    id: { query: (q) => idYear(q), data: (d) => idYear(d) },
    mixed: { query: (q) => yearOf(q.startDate), data: (d) => idYear(d) },
}

const RULES = ['end', 'start'].flatMap((eligible) =>
    Object.keys(YEAR_SOURCES).flatMap((yearBy) =>
        [0, 1, 2, Infinity].map((back) => ({
            name: `${eligible}<=q.end, ${yearBy}-year>=q-${back}`,
            eligible,
            yearBy,
            back,
        }))
    )
)

const sourceUnder = (rule, aggregationType, series, queryPeriod) => {
    const years = YEAR_SOURCES[rule.yearBy]
    const firstYear = years.query(queryPeriod) - rule.back
    const counted = series.filter(({ period }) => {
        const bound =
            rule.eligible === 'end' ? period.endDate : period.startDate
        return bound <= queryPeriod.endDate && years.data(period) >= firstYear
    })
    if (!counted.length) {
        return null
    }
    return aggregationType.startsWith('FIRST')
        ? counted[0].period.id
        : counted.at(-1).period.id
}

const buildGroup = (context) => {
    const periodTypes = supportedTypes(context, PERIOD_TYPES)
    const columns = Object.keys(LAYOUTS).flatMap((layout) =>
        periodTypes.map((periodType) => {
            const series = LAYOUTS[layout](periodType)
            const elements = AGGREGATION_TYPES.map((aggregationType) =>
                dataElement(`g7-${layout}-${aggregationType}-${periodType}`, {
                    code: `PTT_G7_${layout.toUpperCase()}_${aggregationType
                        .replace(/AVERAGE/g, 'AVG')
                        .replace(/ORG_UNIT/g, 'OU')
                        .replace('LAST_IN_PERIOD', 'LIP')}_${periodType}`,
                    name: `PTT G7 ${layout} ${aggregationType} ${periodType}`,
                    aggregationType,
                })
            )
            return {
                layout,
                periodType,
                series,
                elements,
                set: dataSet(`g7-ds-${layout}-${periodType}`, {
                    code: `PTT_G7_DS_${layout.toUpperCase()}_${periodType}`,
                    name: `PTT G7 ${layout} data set ${periodType}`,
                    periodType,
                    elements: elements.map(({ id }) => ({ id })),
                    orgUnits: ['A'],
                }),
            }
        })
    )

    const dataValues = columns.flatMap(({ series, elements, set }) =>
        elements.flatMap((element) =>
            series.map(({ period, value }) => ({
                dataSet: set.id,
                dataElement: element.id,
                period: period.id,
                orgUnit: 'A',
                value,
            }))
        )
    )

    const cases = columns.flatMap(
        ({ layout, periodType, series, elements }) => {
            const derive = withSource(series)
            return elements.flatMap((element) =>
                periodTypes.flatMap((queryType) =>
                    sweepPeriods(queryType).map((queryPeriod) => ({
                        id: `carry-${layout}-${element.aggregationType}__col-${periodType}__q-${queryType}__p-${queryPeriod.id}__A`,
                        item: itemOf(
                            element,
                            [periodType],
                            `Layout ${layout}.`
                        ),
                        query: {
                            periodType: queryType,
                            period: queryPeriod.id,
                            orgUnit: 'A',
                        },
                        expected: { status: null, value: null },
                        cells: [
                            { dx: element.id, pe: queryPeriod.id, ou: 'A' },
                        ],
                        // One period per request: the other periods of a
                        // request move FIRST's and LAST's window (pair cases).
                        batchKey: `${layout}|${element.aggregationType}|${queryType}|${queryPeriod.id}`,
                        observe: observeValue(queryType, periodType),
                        derive,
                        analysis: { layout, series, queryPeriod },
                    }))
                )
            )
        }
    )

    return {
        key: KEY,
        number: 7,
        title: 'Carry windows',
        dataElements: columns.flatMap(({ elements }) => elements),
        dataSets: columns.map(({ set }) => set),
        dataValues,
        cases: [...cases, ...pairCases(columns)],
        summarize: (observedCases) => ({
            rules: summarizeRules(
                observedCases.filter((c) => !c.testCase.analysis.companion)
            ),
            pairs: summarizePairs(
                observedCases.filter((c) => c.testCase.analysis.companion)
            ),
        }),
    }
}

const observeValue =
    (queryType, periodType) =>
    ([result]) =>
        result.error
            ? { status: 'ERROR', value: null, error: result.error }
            : {
                  status: statusOfValue(result.value, queryType, [periodType]),
                  value: result.value,
              }

/*
 * The period a value came from: every value is unique per element, so it
 * is worked out from the value when the observations are read, not stored.
 */
const withSource = (series) => {
    const sourceOf = new Map(series.map((s) => [s.value, s.period.id]))
    return (observed) =>
        observed.status === 'ERROR'
            ? observed
            : { ...observed, source: sourceOf.get(observed.value) ?? null }
}

/*
 * The same query alone, then with one more period in the same request:
 * of the same type or not, early in the same year or two years before.
 */
const PAIRS = [
    { periodType: 'Daily', period: '20250715' },
    { periodType: 'Monthly', period: '202507' },
]
const COMPANIONS = [
    'alone',
    '20250101',
    '20240615',
    '20230101',
    '202501',
    '2024',
    '2023',
]

const pairCases = (columns) =>
    columns
        .filter(({ layout }) => layout === 'dense')
        .filter(({ periodType }) => ['Daily', 'Monthly'].includes(periodType))
        .flatMap(({ periodType, series, elements }) => {
            const derive = withSource(series)
            return elements
                .filter((e) => ['FIRST', 'LAST'].includes(e.aggregationType))
                .flatMap((element) =>
                    PAIRS.flatMap((pair) =>
                        COMPANIONS.map((companion) => ({
                            id: `carry-pair-${element.aggregationType}__col-${periodType}__q-${pair.periodType}__p-${pair.period}__with-${companion}__A`,
                            item: itemOf(
                                element,
                                [periodType],
                                'Layout dense.'
                            ),
                            query: {
                                periodType: pair.periodType,
                                period: pair.period,
                                orgUnit: 'A',
                                withPeriod:
                                    companion === 'alone' ? null : companion,
                            },
                            expected: { status: null, value: null },
                            cells: [
                                { dx: element.id, pe: pair.period, ou: 'A' },
                                ...(companion === 'alone'
                                    ? []
                                    : [
                                          {
                                              dx: element.id,
                                              pe: companion,
                                              ou: 'A',
                                          },
                                      ]),
                            ],
                            batchKey: `pair|${element.id}|${pair.period}|${companion}`,
                            observe: observeValue(pair.periodType, periodType),
                            derive,
                            analysis: { companion },
                        }))
                    )
                )
        })

// The source period of each pair case, by query and companion.
const summarizePairs = (observedCases) =>
    Object.fromEntries(
        observedCases.map(({ testCase, observed }) => [
            testCase.id.replace(/^carry-pair-/, '').replace(/__A$/, ''),
            observed.source ?? null,
        ])
    )

/*
 * Per aggregation type and collection type: how many cases each rule
 * predicts (the source period, or nothing), the best rules, and a few
 * cases the best rule misses.
 */
const summarizeRules = (observedCases) => {
    const sourceOfObserved = (observed) => observed.source ?? null
    const groups = new Map()
    observedCases.forEach(({ testCase, observed }) => {
        const key = `${testCase.item.aggregationType} ${testCase.item.collectionPeriodTypes[0]}`
        if (!groups.has(key)) {
            groups.set(key, [])
        }
        groups.get(key).push({ testCase, observed })
    })
    return Object.fromEntries(
        [...groups].map(([key, entries]) => {
            const aggregationType = entries[0].testCase.item.aggregationType
            const scored = RULES.map((rule) => {
                const misses = entries.filter(({ testCase, observed }) => {
                    const { series, queryPeriod } = testCase.analysis
                    const predicted = sourceUnder(
                        rule,
                        aggregationType,
                        series,
                        queryPeriod
                    )
                    return predicted !== sourceOfObserved(observed)
                })
                return { rule: rule.name, misses }
            }).sort((a, b) => a.misses.length - b.misses.length)
            const best = scored[0].misses.length
            return [
                key,
                {
                    cases: entries.length,
                    bestRules: scored
                        .filter((s) => s.misses.length === best)
                        .map((s) => s.rule),
                    matched: entries.length - best,
                    missed: scored[0].misses
                        .slice(0, 5)
                        .map(({ testCase, observed }) => ({
                            id: testCase.id,
                            source: sourceOfObserved(observed),
                            status: observed.status,
                        })),
                },
            ]
        })
    )
}

module.exports = { KEY, RULES, buildGroup, sourceUnder, sweepPeriods }
