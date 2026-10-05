// The version differences VERSION-FINDINGS.md explains, so the report can
// label each one and call out anything new. Pure.
const { periodFromId } = require('./period-types.js')

const BEFORE_2_43 = /^2\.(40|41|42)\./
const PICK_ONE_PLACE = ['FIRST_FIRST_ORG_UNIT', 'LAST_LAST_ORG_UNIT']

const spansTwoYears = (periodId) => {
    const period = periodFromId(periodId)
    return (
        !!period && period.startDate.slice(0, 4) !== period.endDate.slice(0, 4)
    )
}

const usesAveragedData = (item) =>
    item.aggregationType === 'AVERAGE_SUM_ORG_UNIT' ||
    (item.operands ?? []).some(
        (operand) => operand.aggregationType === 'AVERAGE_SUM_ORG_UNIT'
    )

// Versions whose observation differs from the newest version's.
const versionsApart = (byVersion) => {
    const entries = Object.entries(byVersion)
    const newest = entries.find(([v]) => v.startsWith('2.44')) ?? entries.at(-1)
    return entries
        .filter(
            ([, o]) =>
                o.status !== newest[1].status ||
                (typeof o.value === 'number' &&
                    Math.abs(o.value - newest[1].value) >
                        1e-6 * Math.max(1, Math.abs(newest[1].value)))
        )
        .map(([v]) => v)
}

const EXPLANATIONS = [
    {
        finding: 'finding 5: QuarterlyNov fails on 2.40',
        applies: ({ query }, apart) =>
            query.periodType === 'QuarterlyNov' &&
            apart.every((v) => v.startsWith('2.40.')),
    },
    {
        finding: 'finding 4: arbitrary place',
        applies: ({ item, query }) =>
            PICK_ONE_PLACE.includes(item.aggregationType) &&
            query.orgUnit === 'region',
    },
    {
        finding: 'finding 2: 366 or 365 days',
        applies: ({ item, query }, apart) =>
            usesAveragedData(item) &&
            spansTwoYears(query.period) &&
            apart.length > 0 &&
            apart.every((v) => BEFORE_2_43.test(v)),
    },
    {
        finding: 'finding 9: 2.42.7-SNAPSHOT misses 2026W1 (open)',
        applies: ({ item, query }, apart) =>
            item.dimensionItemType === 'REPORTING_RATE' &&
            (periodFromId(query.period)?.endDate ?? '') >= '2026-01-04' &&
            apart.every((v) => v === '2.42.7-SNAPSHOT'),
    },
    {
        finding: 'finding 5: period types by version',
        applies: ({ id }) =>
            id === 'meta-periodTypes' || id === 'raw-row-limit',
    },
]

// The finding that explains a case's difference, or null.
const explain = (testCase, byVersion) => {
    const apart = versionsApart(byVersion)
    return (
        EXPLANATIONS.find((explanation) => explanation.applies(testCase, apart))
            ?.finding ?? null
    )
}

module.exports = { EXPLANATIONS, explain, spansTwoYears, versionsApart }
