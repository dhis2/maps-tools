// Builders for the event and tracker programs the posts create, and their
// data. Programs share their data with everyone, so the demo users can map it.
const { PUBLIC_READ, code, uid } = require('./ids.js')
const { DEFAULT_CATEGORY_COMBO } = require('./metadata.js')

const DATA_SHARING = { public: 'rwrw----', external: false }

// Sierra Leone demo database
const PERSON = 'nEenWmSyUEp'

const id = (type, key) => uid(`${type}:${key}`)

// options: [{ code, name, color }]
const optionSet = ({ key, name, options }) => ({
    optionSet: {
        id: id('optionSet', key),
        code: code(`OS_${key}`),
        name,
        valueType: 'TEXT',
        options: options.map((o) => ({ id: id('option', `${key}:${o.code}`) })),
        sharing: PUBLIC_READ,
    },
    options: options.map((o, i) => ({
        id: id('option', `${key}:${o.code}`),
        code: o.code,
        name: o.name,
        sortOrder: i + 1,
        optionSet: { id: id('optionSet', key) },
        style: { color: o.color },
    })),
})

const trackerDataElement = ({
    key,
    name,
    valueType = 'TEXT',
    optionSetKey,
}) => ({
    id: id('dataElement', key),
    code: code(key),
    name,
    shortName: name.slice(0, 50),
    domainType: 'TRACKER',
    valueType,
    aggregationType: valueType === 'NUMBER' ? 'SUM' : 'NONE',
    categoryCombo: { id: DEFAULT_CATEGORY_COMBO },
    ...(optionSetKey
        ? { optionSet: { id: id('optionSet', optionSetKey) } }
        : {}),
    sharing: PUBLIC_READ,
})

const trackedEntityAttribute = ({ key, name, valueType = 'TEXT' }) => ({
    id: id('trackedEntityAttribute', key),
    code: code(key),
    name,
    shortName: name.slice(0, 50),
    valueType,
    aggregationType: 'NONE',
    sharing: PUBLIC_READ,
})

// stages: [{ key, name, dataElements: [keys], repeatable }]
const program = ({
    key,
    name,
    registration = false,
    orgUnits,
    stages,
    attributes = [],
    featureType = 'POINT',
}) => {
    const programId = id('program', key)
    const programStages = stages.map((stage) => ({
        id: id('programStage', stage.key),
        name: stage.name,
        program: { id: programId },
        featureType,
        repeatable: Boolean(stage.repeatable),
        autoGenerateEvent: false,
        sharing: DATA_SHARING,
        programStageDataElements: stage.dataElements.map((deKey) => ({
            id: id('psde', `${stage.key}:${deKey}`),
            programStage: { id: id('programStage', stage.key) },
            dataElement: { id: id('dataElement', deKey) },
            displayInReports: true,
        })),
    }))
    return {
        programs: [
            {
                id: programId,
                code: code(`PROGRAM_${key}`),
                name,
                shortName: name.slice(0, 50),
                programType: registration
                    ? 'WITH_REGISTRATION'
                    : 'WITHOUT_REGISTRATION',
                ...(registration
                    ? { trackedEntityType: { id: PERSON }, featureType }
                    : {}),
                categoryCombo: { id: DEFAULT_CATEGORY_COMBO },
                organisationUnits: orgUnits.map(({ id: ou }) => ({ id: ou })),
                programStages: programStages.map(({ id: s }) => ({ id: s })),
                programTrackedEntityAttributes: attributes.map((attrKey) => ({
                    id: id('ptea', `${key}:${attrKey}`),
                    program: { id: programId },
                    trackedEntityAttribute: {
                        id: id('trackedEntityAttribute', attrKey),
                    },
                    displayInList: true,
                })),
                sharing: DATA_SHARING,
            },
        ],
        programStages,
    }
}

// Without boundaries, analytics counts events of every period
const periodBoundaries = (analyticsType) => {
    const target = analyticsType === 'EVENT' ? 'EVENT_DATE' : 'ENROLLMENT_DATE'
    return [
        'AFTER_START_OF_REPORTING_PERIOD',
        'BEFORE_END_OF_REPORTING_PERIOD',
    ].map((boundaryType) => ({
        boundaryTarget: target,
        analyticsPeriodBoundaryType: boundaryType,
    }))
}

// Counts events (or enrollments) of a program, optionally filtered
const programIndicator = ({
    key,
    name,
    programKey,
    analyticsType = 'EVENT',
    expression,
    filter,
    decimals = 0,
}) => ({
    id: id('programIndicator', key),
    code: code(key),
    name,
    shortName: name.slice(0, 50),
    program: { id: id('program', programKey) },
    analyticsType,
    expression,
    ...(filter ? { filter } : {}),
    aggregationType: 'COUNT',
    analyticsPeriodBoundaries: periodBoundaries(analyticsType).map(
        (boundary, i) => ({
            id: id('analyticsPeriodBoundary', `${key}:${i}`),
            ...boundary,
        })
    ),
    decimals,
    sharing: PUBLIC_READ,
})

const relationshipType = ({ key, name, fromProgramKey, toProgramKey }) => ({
    id: id('relationshipType', key),
    code: code(`REL_${key}`),
    name,
    fromToName: name,
    toFromName: name,
    bidirectional: true,
    fromConstraint: {
        relationshipEntity: 'TRACKED_ENTITY_INSTANCE',
        trackedEntityType: { id: PERSON },
        program: { id: id('program', fromProgramKey) },
    },
    toConstraint: {
        relationshipEntity: 'TRACKED_ENTITY_INSTANCE',
        trackedEntityType: { id: PERSON },
        program: { id: id('program', toProgramKey) },
    },
    sharing: DATA_SHARING,
})

// Merges metadata parts type by type
const mergeParts = (...parts) => {
    const merged = {}
    parts.forEach((part) =>
        Object.entries(part).forEach(([type, objects]) => {
            merged[type] = [...(merged[type] || []), ...objects]
        })
    )
    return merged
}

const point = ([lon, lat]) => ({
    type: 'Point',
    coordinates: [Number(lon.toFixed(6)), Number(lat.toFixed(6))],
})

module.exports = {
    PERSON,
    id,
    mergeParts,
    optionSet,
    point,
    program,
    programIndicator,
    relationshipType,
    trackedEntityAttribute,
    trackerDataElement,
}
