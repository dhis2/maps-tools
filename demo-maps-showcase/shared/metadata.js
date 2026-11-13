const { PUBLIC_READ, code, dataSetSharing, uid } = require('./ids.js')

// Sierra Leone demo database
const DEFAULT_CATEGORY_COMBO = 'bjDvmb4bfuf'
const INDICATOR_TYPES = {
    percent: 'bWuNrMHEoZ0',
    number: 'JkWynlWMjJR',
    perThousand: 'mmey8xSvORj',
}

const dataSetId = (key) => uid(`dataSet:${key}`)
const dataElementId = (key) => uid(`dataElement:${key}`)
const indicatorId = (key) => uid(`indicator:${key}`)

// dataElements: ids, of the demo database or of dataElement() below
const dataSet = ({
    key,
    name,
    periodType,
    orgUnits,
    dataElements = [],
    importerId,
    timelyDays,
}) => ({
    id: dataSetId(key),
    code: code(`DS_${key}`),
    name,
    shortName: name.slice(0, 50),
    periodType,
    ...(timelyDays === undefined ? {} : { timelyDays }),
    expiryDays: 0,
    openFuturePeriods: 0,
    categoryCombo: { id: DEFAULT_CATEGORY_COMBO },
    dataSetElements: dataElements.map((id) => ({ dataElement: { id } })),
    organisationUnits: orgUnits.map(({ id }) => ({ id })),
    sharing: dataSetSharing(importerId),
})

const dataElement = ({
    key,
    name,
    aggregationType = 'SUM',
    zeroIsSignificant = false,
}) => ({
    id: dataElementId(key),
    code: code(key),
    name,
    shortName: name.slice(0, 50),
    domainType: 'AGGREGATE',
    valueType: 'NUMBER',
    aggregationType,
    zeroIsSignificant,
    categoryCombo: { id: DEFAULT_CATEGORY_COMBO },
    sharing: PUBLIC_READ,
})

const indicator = ({
    key,
    name,
    type,
    numerator,
    denominator,
    description,
    decimals,
}) => ({
    id: indicatorId(key),
    code: code(key),
    name,
    shortName: name.slice(0, 50),
    description,
    indicatorType: { id: INDICATOR_TYPES[type] },
    numerator,
    numeratorDescription: name,
    denominator,
    denominatorDescription: name,
    annualized: false,
    ...(decimals === undefined ? {} : { decimals }),
    sharing: PUBLIC_READ,
})

module.exports = {
    DEFAULT_CATEGORY_COMBO,
    dataElement,
    dataElementId,
    dataSet,
    dataSetId,
    indicator,
    indicatorId,
}
