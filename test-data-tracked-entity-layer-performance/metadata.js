// The metadata every dataset needs: shared attributes and option set, then
// one tracked entity type, program and program stage per dataset. Every
// object has a code starting with PTE_, which is what cleanup.js deletes.
const { CODE_PREFIX, datasetCode } = require('./datasets.js')
const { uid } = require('./uid.js')

// Readable and writable, metadata and data, for everyone: test data only.
const SHARING = {
    public: 'rwrw----',
    external: false,
    users: {},
    userGroups: {},
}

const STATUS_OPTIONS = [
    { code: 'FUNCTIONAL', name: 'Functional' },
    { code: 'NON_FUNCTIONAL', name: 'Non functional' },
    { code: 'NEEDS_REPAIR', name: 'Needs repair' },
]

const ATTRIBUTES = {
    age: {
        code: `${CODE_PREFIX}AGE`,
        name: 'PTE Age',
        valueType: 'INTEGER_ZERO_OR_POSITIVE',
    },
    status: {
        code: `${CODE_PREFIX}STATUS`,
        name: 'PTE Status',
        valueType: 'TEXT',
    },
    gps: {
        code: `${CODE_PREFIX}GPS`,
        name: 'PTE GPS',
        valueType: 'COORDINATE',
    },
}

const optionSetId = uid('optionSet:status')
const optionId = (code) => uid(`option:${code}`)
const attributeId = (key) => uid(`attribute:${key}`)

// Ids of one dataset's objects, also used by the payload builder,
// benchmark.js and cleanup.js.
const datasetIds = ({ key }) => ({
    trackedEntityType: uid(`${key}:trackedEntityType`),
    program: uid(`${key}:program`),
    programStage: uid(`${key}:programStage`),
})

const attributeIds = () =>
    Object.fromEntries(
        Object.keys(ATTRIBUTES).map((key) => [key, attributeId(key)])
    )

const buildDatasetMetadata = (dataset, orgUnitIds) => {
    const ids = datasetIds(dataset)
    const code = datasetCode(dataset)
    const label = `PTE ${dataset.key}`
    const attributeRefs = Object.keys(ATTRIBUTES).map((key, sortOrder) => ({
        trackedEntityAttribute: { id: attributeId(key) },
        displayInList: true,
        sortOrder,
    }))

    return {
        trackedEntityType: {
            id: ids.trackedEntityType,
            code,
            name: label,
            shortName: label,
            featureType: dataset.featureType,
            trackedEntityTypeAttributes: attributeRefs.map(
                ({ trackedEntityAttribute, displayInList }) => ({
                    trackedEntityAttribute,
                    displayInList,
                })
            ),
            sharing: SHARING,
        },
        program: {
            id: ids.program,
            code,
            name: `${label} program`,
            shortName: `${label} program`,
            programType: 'WITH_REGISTRATION',
            trackedEntityType: { id: ids.trackedEntityType },
            organisationUnits: orgUnitIds.map((id) => ({ id })),
            programTrackedEntityAttributes: attributeRefs,
            programStages: [{ id: ids.programStage }],
            sharing: SHARING,
        },
        programStage: {
            id: ids.programStage,
            code,
            name: `${label} stage`,
            shortName: `${label} stage`,
            program: { id: ids.program },
            sharing: SHARING,
        },
    }
}

const buildMetadata = (datasets, orgUnitIds) => {
    const perDataset = datasets.map((dataset) =>
        buildDatasetMetadata(dataset, orgUnitIds)
    )

    return {
        options: STATUS_OPTIONS.map(({ code, name }, sortOrder) => ({
            id: optionId(code),
            code: `${CODE_PREFIX}${code}`,
            name: `PTE ${name}`,
            sortOrder,
            optionSet: { id: optionSetId },
        })),
        optionSets: [
            {
                id: optionSetId,
                code: `${CODE_PREFIX}STATUS_OPTIONS`,
                name: 'PTE Status options',
                valueType: 'TEXT',
                options: STATUS_OPTIONS.map(({ code }) => ({
                    id: optionId(code),
                })),
                sharing: SHARING,
            },
        ],
        trackedEntityAttributes: Object.entries(ATTRIBUTES).map(
            ([key, attribute]) => ({
                id: attributeId(key),
                ...attribute,
                shortName: attribute.name,
                aggregationType: 'NONE',
                ...(key === 'status' && { optionSet: { id: optionSetId } }),
                sharing: SHARING,
            })
        ),
        trackedEntityTypes: perDataset.map((m) => m.trackedEntityType),
        programs: perDataset.map((m) => m.program),
        programStages: perDataset.map((m) => m.programStage),
    }
}

module.exports = {
    SHARING,
    STATUS_OPTIONS,
    attributeIds,
    buildMetadata,
    datasetIds,
}
