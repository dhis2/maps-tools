/*
 * Group 4: indicators and an expression dimension item over three
 * elements: a monthly count (SUM), and a yearly population, averaged
 * (AVERAGE_SUM_ORG_UNIT) or summed (SUM). One indicator per operand kind.
 * Queried at every period type, two periods each, at A, B and the region.
 */
const {
    combineOrgUnits,
    expectedPlaceValue,
    expectedRateStatus,
    expectedStatus,
    statusOfValue,
} = require('../expected.js')
const {
    periodDays,
    periodsOverlapping,
    previousPeriod,
} = require('../period-types.js')
const { uid } = require('../uid.js')
const {
    DATA_RANGE,
    ORG_UNITS,
    PLACES,
    dataElement,
    dataSet,
    observeSingle,
    placeValue,
    queryPeriods,
    supportedTypes,
} = require('./shared.js')

const KEY = 'indicators-and-expressions'
const POPULATION = { A: [120, 132], B: [1200, 1320] }

const ELEMENTS = {
    count: {
        code: 'PTT_G4_COUNT',
        name: 'PTT G4 count',
        aggregationType: 'SUM',
        periodType: 'Monthly',
    },
    popAvg: {
        code: 'PTT_G4_POP_AVG',
        name: 'PTT G4 population averaged',
        aggregationType: 'AVERAGE_SUM_ORG_UNIT',
        periodType: 'Yearly',
    },
    popSum: {
        code: 'PTT_G4_POP_SUM',
        name: 'PTT G4 population summed',
        aggregationType: 'SUM',
        periodType: 'Yearly',
    },
}

const seriesOf = (name, place) => {
    const { periodType } = ELEMENTS[name]
    const periods = periodsOverlapping(
        periodType,
        DATA_RANGE.startDate,
        DATA_RANGE.endDate
    )
    return periods.map((period, index) => ({
        period,
        value:
            name === 'count'
                ? placeValue(index, place)
                : POPULATION[place][index],
    }))
}

// An operand's expected value at a period and org unit, or null.
// Group 1's weekly elements aren't modelled here: their values are recorded.
const operandValue = (name, queryType, queryPeriod, orgUnit) => {
    if (!ELEMENTS[name]) {
        return null
    }
    const { aggregationType, periodType } = ELEMENTS[name]
    const atPlace = (place) =>
        expectedPlaceValue({
            aggregationType,
            collectionType: periodType,
            queryType,
            queryPeriod,
            series: seriesOf(name, place),
        })
    return orgUnit === 'region'
        ? combineOrgUnits(aggregationType, PLACES.map(atPlace))
        : atPlace(orgUnit)
}

const divide = (a, b) => (a === null || b === null || b === 0 ? null : a / b)

/*
 * Sums: a spec with `sides` (the operands of the numerator, then of the
 * denominator when it isn't 1). As in dhis2-core's SKIP_IF_ALL_VALUES_MISSING
 * (DefaultExpressionService), a missing operand counts as 0, a side has no
 * value when all its operands are missing, and every side needs a value.
 *
 * Expression items behave the same whatever their missingValueStrategy:
 * analytics ignores SKIP_IF_ANY_VALUE_MISSING and NEVER_SKIP on every
 * version (VERSION-FINDINGS.md, finding 8).
 */
const sidesStatus = ({ sides }, queryType) => {
    const missing = (name) => operandStatus(name, queryType) === 'EMPTY'
    if (sides.some((side) => side.every(missing))) {
        return 'EMPTY'
    }
    // A value, but with an operand left out: too low.
    if (sides.flat().some(missing)) {
        return 'PARTIAL'
    }
    const types = sides.flat().map((name) => OPERAND_TYPES[name].periodType)
    return statusOfValue(1, queryType, types)
}

/*
 * A sum is asked with its operands in the same request (all SUM data
 * elements, so the request doesn't change their answers): PARTIAL when it
 * has a value but an operand has none.
 */
const observeSum = (queryType, types) => (results) => {
    const [sum, ...operands] = results
    const observed = observeSingle(queryType, types)([sum])
    const leftOut = operands.some((result) => result.value === null)
    return observed.status === 'VALUE' || observed.status === 'REPEATED'
        ? { ...observed, status: leftOut ? 'PARTIAL' : observed.status }
        : observed
}

// Missing operands count as 0; null where an operand's value isn't computed.
const sidesValue = ({ sides }, v, queryType) => {
    const totals = sides.map((side) =>
        side.reduce((total, name) => {
            const value =
                operandStatus(name, queryType) === 'EMPTY' ? 0 : v(name)
            return total === null || value === null ? null : total + value
        }, 0)
    )
    return totals.length === 2 ? divide(totals[0], totals[1]) : totals[0]
}

/*
 * Each indicator: its expression, the data operands that limit where it has
 * a value, and its exact value where one is computed (null: recorded).
 */
const indicatorSpecs = ({ ids, defaultCocId, constantId, orgUnitGroupId }) => [
    {
        name: 'de',
        numerator: `#{${ids.count}}`,
        operands: ['count'],
        value: (v) => v('count'),
    },
    {
        name: 'de-coc',
        numerator: `#{${ids.count}.${defaultCocId}}`,
        operands: ['count'],
        value: (v) => v('count'),
    },
    {
        name: 'indicator',
        numerator: `N{${uid('g4-ind-de')}}`,
        operands: ['count'],
        // In the fixture, the operand is the nested indicator itself.
        nested: 'de',
        value: (v) => v('count'),
    },
    {
        name: 'reporting-rate',
        numerator: `R{${ids.dataSet}.REPORTING_RATE}`,
        operands: ['rate'],
        value: () => null,
    },
    {
        name: 'constant',
        numerator: `C{${constantId}}`,
        operands: [],
        value: () => 5,
    },
    {
        name: 'org-unit-group',
        numerator: `OUG{${orgUnitGroupId}}`,
        operands: [],
        value: () => null,
    },
    {
        name: 'days',
        numerator: '[days]',
        operands: [],
        value: (v, period) => periodDays(period),
    },
    {
        name: 'period-offset',
        numerator: `#{${ids.count}}.periodOffset(-1)`,
        operands: ['count'],
        value: (v, period, queryType) =>
            v('count', previousPeriod(queryType, period)),
        // Empty when the period before ends before the data starts.
        empty: (period, queryType) =>
            previousPeriod(queryType, period).endDate < DATA_RANGE.startDate,
    },
    {
        name: 'coverage-averaged',
        numerator: `#{${ids.count}}`,
        denominator: `#{${ids.popAvg}}`,
        operands: ['count', 'popAvg'],
        value: (v) => divide(v('count'), v('popAvg')),
    },
    {
        name: 'coverage-averaged-annualized',
        numerator: `#{${ids.count}}`,
        denominator: `#{${ids.popAvg}}`,
        annualized: true,
        operands: ['count', 'popAvg'],
        value: () => null,
    },
    {
        name: 'coverage-summed',
        numerator: `#{${ids.count}}`,
        denominator: `#{${ids.popSum}}`,
        operands: ['count', 'popSum'],
        value: (v) => divide(v('count'), v('popSum')),
    },
    // A monthly count plus a yearly total: the total counts as 0 by month.
    {
        name: 'sum-missing',
        numerator: `#{${ids.count}}+#{${ids.popSum}}`,
        sides: [['count', 'popSum']],
    },
    // Two weekly items, both missing by day: no value.
    {
        name: 'sum-weeks',
        numerator: `#{${ids.weekly}}+#{${ids.wednesday}}`,
        sides: [['weekly', 'wednesday']],
    },
    // The same sum over the yearly total: no value without the total.
    {
        name: 'sum-over-yearly',
        numerator: `#{${ids.count}}+#{${ids.popSum}}`,
        denominator: `#{${ids.popSum}}`,
        sides: [['count', 'popSum'], ['popSum']],
    },
]

// Expression items over the same sum, one per missing value strategy.
const STRATEGY_ITEMS = [
    { name: 'skip-if-all', strategy: 'SKIP_IF_ALL_VALUES_MISSING' },
    { name: 'skip-if-any', strategy: 'SKIP_IF_ANY_VALUE_MISSING' },
    { name: 'never-skip', strategy: 'NEVER_SKIP' },
]

const OPERAND_TYPES = {
    count: ELEMENTS.count,
    popAvg: ELEMENTS.popAvg,
    popSum: ELEMENTS.popSum,
    rate: { aggregationType: 'SUM', periodType: 'Monthly' },
    // Group 1's SUM elements, weekly from Monday and from Wednesday.
    weekly: { aggregationType: 'SUM', periodType: 'Weekly' },
    wednesday: { aggregationType: 'SUM', periodType: 'WeeklyWednesday' },
}

const operandStatus = (name, queryType) =>
    name === 'rate'
        ? expectedRateStatus(OPERAND_TYPES.rate.periodType, queryType)
        : expectedStatus({
              aggregationType: OPERAND_TYPES[name].aggregationType,
              collectionType: OPERAND_TYPES[name].periodType,
              queryType,
          })

const operandsOfSpec = (spec) =>
    spec.operands ?? [...new Set(spec.sides.flat())]

// EMPTY if any data operand is empty, REPEATED if all repeat, else VALUE.
const combinedStatus = (operands, queryType) => {
    const statuses = operands.map((name) => operandStatus(name, queryType))
    if (statuses.includes('EMPTY')) {
        return 'EMPTY'
    }
    return statuses.length && statuses.every((s) => s === 'REPEATED')
        ? 'REPEATED'
        : 'VALUE'
}

// `id` is the UID as written in the expression: the data set for R{}.
const operandItem = (name, ids) => ({
    id: name === 'rate' ? ids.dataSet : ids[name],
    ref: name,
    dimensionItemType: name === 'rate' ? 'REPORTING_RATE' : 'DATA_ELEMENT',
    aggregationType: OPERAND_TYPES[name].aggregationType,
    collectionPeriodTypes: [OPERAND_TYPES[name].periodType],
})

const buildGroup = (context) => {
    const { defaultCocId, constant, orgUnitGroup } = context
    const elements = Object.fromEntries(
        Object.entries(ELEMENTS).map(([name, spec]) => [
            name,
            dataElement(`g4-${name}`, spec),
        ])
    )
    const monthly = dataSet('g4-ds-monthly', {
        code: 'PTT_G4_DS_MONTHLY',
        name: 'PTT G4 data set Monthly',
        periodType: 'Monthly',
        elements: [{ id: elements.count.id }],
    })
    const yearly = dataSet('g4-ds-yearly', {
        code: 'PTT_G4_DS_YEARLY',
        name: 'PTT G4 data set Yearly',
        periodType: 'Yearly',
        elements: [{ id: elements.popAvg.id }, { id: elements.popSum.id }],
    })
    const ids = {
        count: elements.count.id,
        popAvg: elements.popAvg.id,
        popSum: elements.popSum.id,
        weekly: uid('g1-SUM-Weekly'),
        wednesday: uid('g1-SUM-WeeklyWednesday'),
        dataSet: monthly.id,
    }

    const specs = indicatorSpecs({
        ids,
        defaultCocId,
        constantId: constant.id,
        orgUnitGroupId: orgUnitGroup.id,
    })
    const indicators = specs.map((spec) => ({
        key: `g4-ind-${spec.name}`,
        id: uid(`g4-ind-${spec.name}`),
        code: `PTT_G4_IND_${spec.name.toUpperCase().replace(/-/g, '_')}`,
        name: `PTT G4 indicator ${spec.name}`,
        shortName: `PTT G4 ${spec.name}`.slice(0, 50),
        numerator: spec.numerator,
        denominator: spec.denominator ?? '1',
        annualized: !!spec.annualized,
        spec,
    }))
    const expression = (key, name, expressionText, spec, strategy) => ({
        key: `g4-${key}`,
        id: uid(`g4-${key}`),
        code: `PTT_G4_${key.toUpperCase().replace(/-/g, '_')}`,
        name,
        shortName: name.replace('PTT G4 ', 'PTT G4 ').slice(0, 50),
        expression: expressionText,
        ...(strategy ? { missingValueStrategy: strategy } : {}),
        spec,
    })
    const expressionItems = [
        expression(
            'expression',
            'PTT G4 expression count times 2',
            `#{${ids.count}}*2`,
            {
                name: 'expression',
                operands: ['count'],
                value: (v) => (v('count') === null ? null : v('count') * 2),
            }
        ),
        ...STRATEGY_ITEMS.map(({ name, strategy }) =>
            expression(
                `expression-${name}`,
                `PTT G4 expression sum ${name}`,
                `#{${ids.count}}+#{${ids.popSum}}`,
                {
                    name: `expression-${name}`,
                    sides: [['count', 'popSum']],
                },
                strategy
            )
        ),
    ]

    const dataValues = [
        ['count', monthly],
        ['popAvg', yearly],
        ['popSum', yearly],
    ].flatMap(([name, set]) =>
        PLACES.flatMap((place) =>
            seriesOf(name, place).map(({ period, value }) => ({
                dataSet: set.id,
                dataElement: elements[name].id,
                period: period.id,
                orgUnit: place,
                value,
            }))
        )
    )

    // Completeness for R{}: every month at A, every other month at B.
    const registrations = periodsOverlapping(
        'Monthly',
        DATA_RANGE.startDate,
        DATA_RANGE.endDate
    ).flatMap((period, index) =>
        PLACES.filter((place) => place === 'A' || index % 2 === 0).map(
            (place) => ({
                dataSet: monthly.id,
                period: period.id,
                orgUnit: place,
            })
        )
    )

    // An N{} operand is the indicator it names, with its own operands.
    const operandsOf = (indicator) => {
        const { nested } = indicator.spec
        if (!nested) {
            return operandsOfSpec(indicator.spec).map((name) =>
                operandItem(name, ids)
            )
        }
        const inner = indicators.find((i) => i.spec.name === nested)
        return [
            {
                id: inner.id,
                ref: `indicator-${nested}`,
                dimensionItemType: 'INDICATOR',
                numerator: inner.numerator,
                denominator: inner.denominator,
                operands: operandsOf(inner),
            },
        ]
    }

    const items = [
        ...indicators.map((indicator) => ({
            object: indicator,
            item: {
                code: indicator.code,
                dimensionItemType: 'INDICATOR',
                numerator: indicator.numerator,
                denominator: indicator.denominator,
                annualized: indicator.annualized,
                operands: operandsOf(indicator),
            },
        })),
        ...expressionItems.map((expressionItem) => ({
            object: expressionItem,
            item: {
                code: expressionItem.code,
                dimensionItemType: 'EXPRESSION_DIMENSION_ITEM',
                expression: expressionItem.expression,
                ...(expressionItem.missingValueStrategy
                    ? {
                          missingValueStrategy:
                              expressionItem.missingValueStrategy,
                      }
                    : {}),
                operands: operandsOfSpec(expressionItem.spec).map((name) =>
                    operandItem(name, ids)
                ),
            },
        })),
    ]

    const cases = items.flatMap(({ object, item }) =>
        supportedTypes(context).flatMap((queryType) =>
            queryPeriods(queryType).flatMap((queryPeriod) =>
                ORG_UNITS.map((orgUnit) => {
                    const { spec } = object
                    const status = spec.sides
                        ? sidesStatus(spec, queryType)
                        : spec.empty?.(queryPeriod, queryType)
                          ? 'EMPTY'
                          : combinedStatus(spec.operands, queryType)
                    const v = (name, period = queryPeriod) =>
                        operandValue(name, queryType, period, orgUnit)
                    const value = () =>
                        spec.sides
                            ? sidesValue(spec, v, queryType)
                            : spec.value(v, queryPeriod, queryType)
                    return {
                        id: `ind-${object.spec.name}__q-${queryType}__p-${queryPeriod.id}__${orgUnit}`,
                        item,
                        query: {
                            periodType: queryType,
                            period: queryPeriod.id,
                            orgUnit,
                        },
                        expected: {
                            status,
                            value: status === 'EMPTY' ? null : value(),
                        },
                        cells: [
                            { dx: object.id, pe: queryPeriod.id, ou: orgUnit },
                            ...(spec.sides
                                ? operandsOfSpec(spec).map((name) => ({
                                      dx: ids[name],
                                      pe: queryPeriod.id,
                                      ou: orgUnit,
                                  }))
                                : []),
                        ],
                        // One period per request (see carry-windows.js).
                        /*
                         * `.periodOffset(-1)` brings the period before
                         * into the request, so it gets a request of its own.
                         */
                        batchKey: `${queryType}|${queryPeriod.id}|${
                            object.spec.name === 'period-offset'
                                ? 'offset'
                                : 'rest'
                        }`,
                        observe: (spec.sides ? observeSum : observeSingle)(
                            queryType,
                            operandsOfSpec(spec).map(
                                (name) => OPERAND_TYPES[name].periodType
                            )
                        ),
                    }
                })
            )
        )
    )

    return {
        key: KEY,
        number: 4,
        title: 'Indicators and expressions',
        dataElements: Object.values(elements),
        dataSets: [monthly, yearly],
        indicators,
        expressionItems,
        dataValues,
        registrations,
        cases,
    }
}

module.exports = { KEY, buildGroup, combinedStatus }
