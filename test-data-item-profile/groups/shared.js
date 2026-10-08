// Helpers every case group uses. Pure.
const { statusOfValue } = require('../expected.js')
const {
    ENTERABLE_PERIOD_TYPE_NAMES,
    periodContaining,
} = require('../period-types.js')
const { uid } = require('../uid.js')

const DATA_RANGE = { startDate: '2024-01-01', endDate: '2025-12-31' }
const PLACES = ['A', 'B']
const ORG_UNITS = ['A', 'B', 'region']

// 1, 2, 3… at A, and 10 times that at B.
const placeValue = (index, place) => (place === 'A' ? 1 : 10) * (index + 1)

/*
 * Two periods per query type: the one that holds 1 January 2025 (starting
 * at or crossing the year boundary), and the one that holds mid-July 2025.
 * When one period holds both, as a year does, the second is mid-2024's.
 */
const queryPeriods = (type) => {
    const boundary = periodContaining(type, '2025-01-01')
    const midYear = periodContaining(type, '2025-07-15')
    const mid =
        midYear.id === boundary.id
            ? periodContaining(type, '2024-07-15')
            : midYear
    return [boundary, mid]
}

// Enterable types the server knows. Without the list (older results), all.
const supportedTypes = (
    { serverPeriodTypes },
    types = ENTERABLE_PERIOD_TYPE_NAMES
) =>
    serverPeriodTypes
        ? types.filter((type) => serverPeriodTypes.includes(type))
        : types

// Codes and short names are capped at 50 characters.
const abbreviate = (aggregationType) =>
    aggregationType
        .replace('LAST_IN_PERIOD', 'LIP')
        .replace(/AVERAGE/g, 'AVG')
        .replace(/ORG_UNIT/g, 'OU')
        .replace('VARIANCE', 'VAR')

const dataElement = (
    key,
    { code, name, aggregationType, valueType, domainType, aggregationLevels }
) => ({
    key,
    id: uid(key),
    code,
    name,
    shortName: code.replace(/_/g, ' ').slice(0, 50),
    aggregationType,
    valueType: valueType ?? 'INTEGER',
    ...(domainType ? { domainType } : {}),
    ...(aggregationLevels ? { aggregationLevels } : {}),
})

const dataSet = (key, { code, name, periodType, elements, orgUnits }) => ({
    key,
    id: uid(key),
    code,
    name,
    shortName: code.replace(/_/g, ' ').slice(0, 50),
    periodType,
    // [{ id, temporary }]: a temporary member is removed after its values
    // are in, to leave history behind.
    elements,
    orgUnits: orgUnits ?? PLACES,
})

const itemOf = (element, collectionPeriodTypes, notes) => ({
    code: element.code,
    dimensionItemType: 'DATA_ELEMENT',
    aggregationType: element.aggregationType,
    valueType: element.valueType,
    collectionPeriodTypes,
    ...(notes ? { notes } : {}),
})

// The observed status of a case that reads one cell.
const observeSingle =
    (queryType, collectionTypes) =>
    ([result]) =>
        result.error
            ? { status: 'ERROR', value: null, error: result.error }
            : {
                  status: statusOfValue(
                      result.value,
                      queryType,
                      collectionTypes
                  ),
                  value: result.value,
              }

module.exports = {
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
}
