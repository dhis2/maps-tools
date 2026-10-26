// Relationship data for the maps-app tracked entity layer:
// - PTE 1k to PTE 100k, between two types without programs: the layer
//   requests the related tracked entities by type, and PTE 100k has more
//   than the tracker API limit (50,000), so it warns about related tracked
//   entities.
// - PTE 100k to PTE 100k, same type without programs: the related tracked
//   entities are among the loaded ones, which the tracker API cuts at its
//   limit, so the layer warns for both. The relationships link tracked
//   entities the API returns first (newest), so the lines show.
// - PTE 1k to PTE 1k without programs, to PTE 1k tracked entities not
//   enrolled in the PTE 1k program: a layer on that program requests them
//   by type, as they are not on the map.
// - PTE 1k to events, which Maps doesn't support: the saved map using it
//   (maps.js) shows the warning for unsupported relationship types (the
//   layer dialog no longer offers these types).
// - Focus area to Malaria Entity in the demo database, between two types
//   without programs: the demo data has none of this type, so these copy
//   the focus area to case pairs of the type with programs.
const { CODE_PREFIX, DATASETS } = require('./datasets.js')
const { SHARING, datasetIds } = require('./metadata.js')
const { buildTrackedEntity, trackedEntityId } = require('./tracked-entities.js')
const { uid } = require('./uid.js')

const SOURCE = DATASETS.find(({ key }) => key === '1k')
const TARGET = DATASETS.find(({ key }) => key === '100k')

const RELATIONSHIP_TYPES = {
    toTrackedEntities: {
        code: `${CODE_PREFIX}REL_1K_TO_100K`,
        name: 'PTE 1k to PTE 100k',
    },
    toEvents: {
        code: `${CODE_PREFIX}REL_1K_TO_EVENT`,
        name: 'PTE 1k to event',
    },
    sameType: {
        code: `${CODE_PREFIX}REL_100K_TO_100K`,
        name: 'PTE 100k to PTE 100k',
    },
    outsideProgram: {
        code: `${CODE_PREFIX}REL_1K_TO_1K`,
        name: 'PTE 1k to PTE 1k',
    },
}

// PTE 1k tracked entities without enrollment, numbered after the dataset
const OUTSIDE_PROGRAM_COUNT = 5
const outsideProgramIndex = (index) => SOURCE.count + index

const buildOutsideProgramTrackedEntities = (facilities) => ({
    trackedEntities: Array.from({ length: OUTSIDE_PROGRAM_COUNT }, (_, i) => {
        // eslint-disable-next-line no-unused-vars
        const { enrollments, ...trackedEntity } = buildTrackedEntity(
            SOURCE,
            outsideProgramIndex(i),
            facilities
        )
        return trackedEntity
    }),
})

// Relationships of "PTE 100k to PTE 100k"
const SAME_TYPE_COUNT = 10

const relationshipTypeId = (key) => uid(`relationshipType:${key}`)
const relationshipId = (index) => uid(`relationship:1k-100k:${index}`)
const sameTypeRelationshipId = (index) => uid(`relationship:100k-100k:${index}`)

// "Focus to Case (NP - NP)" in the Sierra Leone demo database
const DEMO_RELATIONSHIP_TYPE = 'lk5qom94TJb'
// Focus area, then case, of the demo "Focus to Case" relationships
const DEMO_PAIRS = [
    ['dNpxRu1mWG5', 'jZRaFaYkAtE'],
    ['dNpxRu1mWG5', 'Fbru4rg4dYV'],
    ['dNpxRu1mWG5', 'RHA9RWNvAnC'],
    ['neR4cmMY22o', 'DsSlC54GNXy'],
    ['neR4cmMY22o', 'tFxi3V14vHq'],
    ['neR4cmMY22o', 'rEYUGH97Ssd'],
    ['neR4cmMY22o', 'k8TU70vWtnP'],
    ['neR4cmMY22o', 'AuAWm61eD0X'],
    ['Imv2o18b9wX', 'ouQgthfDfU1'],
    ['Imv2o18b9wX', 'JM29jwvw8Ub'],
    ['Imv2o18b9wX', 'TtfoJCZyKey'],
    ['Imv2o18b9wX', 'AuAWm61eD0X'],
    ['Imv2o18b9wX', 'F8yKM85NbxW'],
]
const demoRelationshipId = ([from, to]) =>
    uid(`relationship:demo-np-np:${from}:${to}`)

const relationship = (relationship, relationshipType, from, to) => ({
    relationship,
    relationshipType,
    from: { trackedEntity: { trackedEntity: from } },
    to: { trackedEntity: { trackedEntity: to } },
})

const trackedEntityConstraint = (dataset) => ({
    relationshipEntity: 'TRACKED_ENTITY_INSTANCE',
    trackedEntityType: { id: datasetIds(dataset).trackedEntityType },
})

const buildRelationshipMetadata = () => ({
    relationshipTypes: [
        {
            id: relationshipTypeId('toTrackedEntities'),
            ...RELATIONSHIP_TYPES.toTrackedEntities,
            fromToName: 'related to',
            fromConstraint: trackedEntityConstraint(SOURCE),
            toConstraint: trackedEntityConstraint(TARGET),
            sharing: SHARING,
        },
        {
            id: relationshipTypeId('toEvents'),
            ...RELATIONSHIP_TYPES.toEvents,
            fromToName: 'linked to',
            fromConstraint: trackedEntityConstraint(SOURCE),
            toConstraint: {
                relationshipEntity: 'PROGRAM_STAGE_INSTANCE',
                programStage: { id: datasetIds(SOURCE).programStage },
            },
            sharing: SHARING,
        },
        {
            id: relationshipTypeId('outsideProgram'),
            ...RELATIONSHIP_TYPES.outsideProgram,
            fromToName: 'related to',
            fromConstraint: trackedEntityConstraint(SOURCE),
            toConstraint: trackedEntityConstraint(SOURCE),
            sharing: SHARING,
        },
        {
            id: relationshipTypeId('sameType'),
            ...RELATIONSHIP_TYPES.sameType,
            fromToName: 'related to',
            fromConstraint: trackedEntityConstraint(TARGET),
            toConstraint: trackedEntityConstraint(TARGET),
            sharing: SHARING,
        },
    ],
})

// One relationship per PTE 1k tracked entity, to the PTE 100k one with the
// same number, then pairs of the newest PTE 100k ones, then the demo ones
const buildRelationships = (count = SOURCE.count) => ({
    relationships: [
        ...Array.from({ length: count }, (_, index) =>
            relationship(
                relationshipId(index),
                relationshipTypeId('toTrackedEntities'),
                trackedEntityId(SOURCE, index),
                trackedEntityId(TARGET, index)
            )
        ),
        ...Array.from({ length: SAME_TYPE_COUNT }, (_, index) =>
            relationship(
                sameTypeRelationshipId(index),
                relationshipTypeId('sameType'),
                trackedEntityId(TARGET, TARGET.count - 1 - 2 * index),
                trackedEntityId(TARGET, TARGET.count - 2 - 2 * index)
            )
        ),
        ...Array.from({ length: OUTSIDE_PROGRAM_COUNT }, (_, index) =>
            relationship(
                uid(`relationship:1k-outside:${index}`),
                relationshipTypeId('outsideProgram'),
                trackedEntityId(SOURCE, index),
                trackedEntityId(SOURCE, outsideProgramIndex(index))
            )
        ),
        ...DEMO_PAIRS.map((pair) =>
            relationship(
                demoRelationshipId(pair),
                DEMO_RELATIONSHIP_TYPE,
                ...pair
            )
        ),
    ],
})

module.exports = {
    DEMO_PAIRS,
    DEMO_RELATIONSHIP_TYPE,
    OUTSIDE_PROGRAM_COUNT,
    RELATIONSHIP_TYPES,
    buildOutsideProgramTrackedEntities,
    SAME_TYPE_COUNT,
    buildRelationshipMetadata,
    buildRelationships,
    relationshipId,
    relationshipTypeId,
}
