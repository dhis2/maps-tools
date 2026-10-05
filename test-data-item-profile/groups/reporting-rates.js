/*
 * Group 5: reporting rates of data sets of several types. A registers
 * every period, B every other one. Each data set's reporting rate, actual
 * and expected reports, queried at every period type.
 */
const { expectedRateStatus, fits, relation } = require('../expected.js')
const {
    contains,
    periodsInside,
    periodsOverlapping,
} = require('../period-types.js')
const {
    DATA_RANGE,
    ORG_UNITS,
    PLACES,
    dataElement,
    dataSet,
    observeSingle,
    queryPeriods,
    supportedTypes,
} = require('./shared.js')

const KEY = 'reporting-rates'
const DATA_SET_TYPES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']
const METRICS = ['REPORTING_RATE', 'ACTUAL_REPORTS', 'EXPECTED_REPORTS']

const isRegistered = (place, index) => place === 'A' || index % 2 === 0

/*
 * Where the data set's periods nest in the query period: expected reports
 * are its periods there, per place; actual reports are the registered
 * ones. Null where they don't nest or the type doesn't fit.
 */
const expectedMetric = (
    metric,
    periodType,
    queryType,
    queryPeriod,
    orgUnit
) => {
    const places = orgUnit === 'region' ? PLACES : [orgUnit]
    /*
     * Finding 9: 0, except expected reports in an equal-length period of
     * another type: one per place.
     */
    if (!fits(periodType, queryType)) {
        const equalLength = relation(periodType, queryType) === 'equal-length'
        return metric === 'EXPECTED_REPORTS' && equalLength ? places.length : 0
    }
    const overlapping = periodsOverlapping(
        periodType,
        queryPeriod.startDate,
        queryPeriod.endDate
    )
    if (!overlapping.every((period) => contains(queryPeriod, period))) {
        return null
    }
    const registered = periodsOverlapping(
        periodType,
        DATA_RANGE.startDate,
        DATA_RANGE.endDate
    )
    const expected =
        periodsInside(periodType, queryPeriod.startDate, queryPeriod.endDate)
            .length * places.length
    const actual = places.reduce(
        (sum, place) =>
            sum +
            registered.filter(
                (period, index) =>
                    isRegistered(place, index) && contains(queryPeriod, period)
            ).length,
        0
    )
    if (metric === 'EXPECTED_REPORTS') {
        return expected
    }
    if (metric === 'ACTUAL_REPORTS') {
        return actual
    }
    return expected ? (actual / expected) * 100 : null
}

const buildGroup = (context) => {
    const columns = DATA_SET_TYPES.map((periodType) => {
        const element = dataElement(`g5-${periodType}`, {
            code: `PTT_G5_${periodType}`,
            name: `PTT G5 ${periodType} value`,
            aggregationType: 'SUM',
        })
        return {
            periodType,
            element,
            set: dataSet(`g5-ds-${periodType}`, {
                code: `PTT_G5_DS_${periodType}`,
                name: `PTT G5 data set ${periodType}`,
                periodType,
                elements: [{ id: element.id }],
            }),
        }
    })

    const registrations = columns.flatMap(({ periodType, set }) =>
        periodsOverlapping(
            periodType,
            DATA_RANGE.startDate,
            DATA_RANGE.endDate
        ).flatMap((period, index) =>
            PLACES.filter((place) => isRegistered(place, index)).map(
                (place) => ({
                    dataSet: set.id,
                    period: period.id,
                    orgUnit: place,
                })
            )
        )
    )

    const cases = columns.flatMap(({ periodType, set }) =>
        METRICS.flatMap((metric) =>
            supportedTypes(context).flatMap((queryType) =>
                queryPeriods(queryType).flatMap((queryPeriod) =>
                    ORG_UNITS.map((orgUnit) => {
                        const status = expectedRateStatus(periodType, queryType)
                        return {
                            id: `rate-${metric}-${periodType}__q-${queryType}__p-${queryPeriod.id}__${orgUnit}`,
                            item: {
                                code: set.code,
                                dimensionItemType: 'REPORTING_RATE',
                                metric,
                                collectionPeriodTypes: [periodType],
                            },
                            query: {
                                periodType: queryType,
                                period: queryPeriod.id,
                                orgUnit,
                            },
                            expected: {
                                status,
                                value:
                                    status === 'EMPTY'
                                        ? null
                                        : expectedMetric(
                                              metric,
                                              periodType,
                                              queryType,
                                              queryPeriod,
                                              orgUnit
                                          ),
                            },
                            cells: [
                                {
                                    dx: `${set.id}.${metric}`,
                                    pe: queryPeriod.id,
                                    ou: orgUnit,
                                },
                            ],
                            // One period per request (see carry-windows.js).
                            batchKey: `${queryType}|${queryPeriod.id}`,
                            observe: observeSingle(queryType, [periodType]),
                        }
                    })
                )
            )
        )
    )

    return {
        key: KEY,
        number: 5,
        title: 'Reporting rates',
        dataElements: columns.map(({ element }) => element),
        dataSets: columns.map(({ set }) => set),
        registrations,
        cases,
    }
}

module.exports = { KEY, buildGroup, expectedMetric }
