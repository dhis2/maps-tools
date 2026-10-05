/*
 * Group 1: every aggregation type × every collection type × every query
 * type. One data set per collection type, holding one element per
 * aggregation type. Values at A are 1, 2, 3… by period; at B, 10 times that.
 */
const {
    combineOrgUnits,
    expectedPlaceValue,
    expectedStatus,
} = require('../expected.js')
const { periodsOverlapping } = require('../period-types.js')
const {
    DATA_RANGE,
    ORG_UNITS,
    PLACES,
    abbreviate,
    dataElement,
    dataSet,
    itemOf,
    observeSingle,
    placeValue,
    queryPeriods,
    supportedTypes,
} = require('./shared.js')

const KEY = 'aggregation-by-period-type'

const buildGroup = (context) => {
    const { aggregationTypes } = context
    const collectionTypes = supportedTypes(context)
    const queryTypes = supportedTypes(context)

    const columns = collectionTypes.map((collectionType) => {
        const periods = periodsOverlapping(
            collectionType,
            DATA_RANGE.startDate,
            DATA_RANGE.endDate
        )
        const elements = aggregationTypes.map((aggregationType) =>
            dataElement(`g1-${aggregationType}-${collectionType}`, {
                code: `PTT_G1_${abbreviate(aggregationType)}_${collectionType}`,
                name: `PTT G1 ${aggregationType} ${collectionType}`,
                aggregationType,
            })
        )
        return {
            collectionType,
            periods,
            elements,
            dataSet: dataSet(`g1-ds-${collectionType}`, {
                code: `PTT_G1_DS_${collectionType}`,
                name: `PTT G1 data set ${collectionType}`,
                periodType: collectionType,
                elements: elements.map(({ id }) => ({ id })),
            }),
        }
    })

    const dataValues = columns.flatMap(({ periods, elements, dataSet }) =>
        elements.flatMap((element) =>
            periods.flatMap((period, index) =>
                PLACES.map((place) => ({
                    dataSet: dataSet.id,
                    dataElement: element.id,
                    period: period.id,
                    orgUnit: place,
                    value: placeValue(index, place),
                }))
            )
        )
    )

    const cases = columns.flatMap(({ collectionType, periods, elements }) => {
        const seriesAt = (place) =>
            periods.map((period, index) => ({
                period,
                value: placeValue(index, place),
            }))
        const series = { A: seriesAt('A'), B: seriesAt('B') }

        return elements.flatMap((element) => {
            const { aggregationType } = element
            return queryTypes.flatMap((queryType) =>
                queryPeriods(queryType).flatMap((queryPeriod) => {
                    const placeValues = Object.fromEntries(
                        PLACES.map((place) => [
                            place,
                            expectedPlaceValue({
                                aggregationType,
                                collectionType,
                                queryType,
                                queryPeriod,
                                series: series[place],
                            }),
                        ])
                    )
                    placeValues.region = combineOrgUnits(
                        aggregationType,
                        PLACES.map((place) => placeValues[place])
                    )
                    // A and B have values in the same periods.
                    const status = expectedStatus({
                        aggregationType,
                        collectionType,
                        queryType,
                        series: series.A,
                        queryPeriod,
                    })
                    return ORG_UNITS.map((orgUnit) => ({
                        id: `agg-${aggregationType}__col-${collectionType}__q-${queryType}__p-${queryPeriod.id}__${orgUnit}`,
                        item: itemOf(element, [collectionType]),
                        query: {
                            periodType: queryType,
                            period: queryPeriod.id,
                            orgUnit,
                        },
                        expected: {
                            status,
                            value:
                                status === 'EMPTY' || status === 'ERROR'
                                    ? null
                                    : placeValues[orgUnit],
                        },
                        cells: [
                            { dx: element.id, pe: queryPeriod.id, ou: orgUnit },
                        ],
                        // One period per request: FIRST and LAST read the
                        // year tables of every period in a request.
                        batchKey: `${aggregationType}|${queryType}|${queryPeriod.id}`,
                        observe: observeSingle(queryType, [collectionType]),
                    }))
                })
            )
        })
    })

    return {
        key: KEY,
        number: 1,
        title: 'Aggregation × collection × query',
        dataElements: columns.flatMap(({ elements }) => elements),
        dataSets: columns.map(({ dataSet }) => dataSet),
        dataValues,
        cases,
    }
}

module.exports = { KEY, buildGroup }
