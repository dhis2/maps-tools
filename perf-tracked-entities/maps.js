// Saved maps for testing the maps-app tracked entity layer: one per case to
// check (a warning, a filter, a request), plus a few that should just work.
// Each map has one tracked entity layer, saved as the maps-app saves it.
const { CODE_PREFIX, DATASETS } = require('./datasets.js')
const { datasetIds } = require('./metadata.js')
const {
    DEMO_RELATIONSHIP_TYPE,
    relationshipTypeId,
} = require('./relationships.js')
const { uid } = require('./uid.js')

const dataset = (key) => datasetIds(DATASETS.find((d) => d.key === key))

// Sierra Leone demo database
const DEMO = {
    country: 'ImspTQPwCqd',
    // A chiefdom whose children are 40 facilities
    kakua: 'U6Kr7Gtpidn',
    malariaEntity: 'Zy2SEgA61ys',
    malariaCaseProgram: 'qDkgAbB5Jlk',
    focusArea: 'We9I19a3vO1',
    focusProgram: 'M3xtLkYBlKI',
    focusToCase: 'Mv8R4MPcNcX',
    // Between Focus area and Malaria Entity, without programs
    focusToCaseWithoutPrograms: DEMO_RELATIONSHIP_TYPE,
}

// The PTE data was last updated in October 2026
const PTE_PERIOD = {
    startDate: '2024-01-01T00:00:00.000',
    endDate: '2026-12-31T00:00:00.000',
}
const DEMO_PERIOD = {
    startDate: '2000-01-01T00:00:00.000',
    endDate: '2026-12-31T00:00:00.000',
}

const trackedEntityView = ({
    trackedEntityType,
    program,
    programStatus,
    followUp,
    periodType,
    period,
    orgUnits = [DEMO.country],
    mode = 'DESCENDANTS',
    // No mode saved, so the maps-app default applies
    withoutMode = false,
    relationshipType,
}) => ({
    layer: 'trackedEntity',
    // The maps-app default for a new tracked entity layer
    opacity: 0.5,
    trackedEntityType: { id: trackedEntityType },
    ...(program && { program: { id: program } }),
    ...(programStatus && { programStatus }),
    ...(followUp && { followUp: true }),
    ...(!withoutMode && { organisationUnitSelectionMode: mode }),
    ...period,
    config: JSON.stringify({
        ...(relationshipType && { relationships: { type: relationshipType } }),
        ...(periodType && { periodType }),
    }),
    rows: [{ dimension: 'ou', items: orgUnits.map((id) => ({ id })) }],
})

const MAPS = [
    // Cases
    {
        key: 'trackerLimit',
        name: 'PTE test: tracker limit',
        view: {
            trackedEntityType: dataset('100k').trackedEntityType,
            period: PTE_PERIOD,
        },
    },
    {
        key: 'followUp',
        name: 'PTE test: follow-up',
        view: {
            trackedEntityType: dataset('1k').trackedEntityType,
            program: dataset('1k').program,
            followUp: true,
            period: PTE_PERIOD,
        },
    },
    {
        key: 'relatedLimit',
        name: 'PTE test: related limit',
        view: {
            trackedEntityType: dataset('1k').trackedEntityType,
            relationshipType: relationshipTypeId('toTrackedEntities'),
            period: PTE_PERIOD,
        },
    },
    {
        key: 'relatedLimitSameType',
        name: 'PTE test: related limit, same type',
        view: {
            trackedEntityType: dataset('100k').trackedEntityType,
            relationshipType: relationshipTypeId('sameType'),
            period: PTE_PERIOD,
        },
    },
    {
        key: 'relatedOutsideProgram',
        name: 'PTE test: related outside the layer program',
        view: {
            trackedEntityType: dataset('1k').trackedEntityType,
            program: dataset('1k').program,
            relationshipType: relationshipTypeId('outsideProgram'),
            period: PTE_PERIOD,
        },
    },
    {
        key: 'relationshipToEvents',
        name: 'PTE test: relationship to events',
        view: {
            trackedEntityType: dataset('1k').trackedEntityType,
            relationshipType: relationshipTypeId('toEvents'),
            period: PTE_PERIOD,
        },
    },
    {
        key: 'typesWithoutPrograms',
        name: 'PTE test: different types without programs',
        view: {
            trackedEntityType: DEMO.focusArea,
            relationshipType: DEMO.focusToCaseWithoutPrograms,
            period: DEMO_PERIOD,
        },
    },
    {
        key: 'defaultMode',
        name: 'PTE test: default mode',
        view: {
            trackedEntityType: dataset('10k').trackedEntityType,
            program: dataset('10k').program,
            withoutMode: true,
            period: PTE_PERIOD,
        },
    },
    {
        key: 'immediateChildren',
        name: 'PTE test: immediate children',
        view: {
            trackedEntityType: dataset('100k').trackedEntityType,
            program: dataset('100k').program,
            followUp: true,
            orgUnits: [DEMO.kakua],
            mode: 'CHILDREN',
            period: PTE_PERIOD,
        },
    },
    {
        key: 'polygons',
        name: 'PTE test: polygons',
        view: {
            trackedEntityType: dataset('poly-10k').trackedEntityType,
            program: dataset('poly-10k').program,
            period: PTE_PERIOD,
        },
    },
    // Just working
    {
        key: 'activeEnrollments',
        name: 'PTE test: active enrollments',
        view: {
            trackedEntityType: dataset('10k').trackedEntityType,
            program: dataset('10k').program,
            programStatus: 'ACTIVE',
            periodType: 'program',
            period: PTE_PERIOD,
        },
    },
    {
        key: 'malariaCases',
        name: 'PTE test: malaria cases',
        view: {
            trackedEntityType: DEMO.malariaEntity,
            program: DEMO.malariaCaseProgram,
            period: DEMO_PERIOD,
        },
    },
    {
        key: 'focusAreasWithCases',
        name: 'PTE test: focus areas with cases',
        view: {
            trackedEntityType: DEMO.focusArea,
            program: DEMO.focusProgram,
            relationshipType: DEMO.focusToCase,
            period: DEMO_PERIOD,
        },
    },
]

// "relationshipToEvents" keeps the id of the first map this tool created
const mapId = (key) => uid(`map:${key}`)

const mapCode = (key) =>
    `${CODE_PREFIX}MAP_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`

const buildMaps = () =>
    MAPS.map(({ key, name, view }) => ({
        id: mapId(key),
        code: mapCode(key),
        name,
        latitude: 8.5,
        longitude: -11.8,
        zoom: 7,
        basemap: 'osmLight',
        mapViews: [{ name, ...trackedEntityView(view) }],
    }))

module.exports = { DEMO, MAPS, buildMaps, mapCode, mapId }
