const { pointForChannel } = require('./geometry.js')
const { deterministicUid } = require('./uid.js')

// System default category combo - present on every DHIS2 instance since
// DB initialization. Set explicitly (rather than relying on the API's
// implicit default) so imports stay deterministic.
const DEFAULT_CATEGORY_COMBO_ID = 'bjDvmb4bfuf'

const uid = (seed) => deterministicUid(`maps-test:${seed}`)

// The legacy publicAccess string isn't reliably applied to newly-created
// objects on some DHIS2 versions (observed: admin got "not allowed to read
// data for Program" even with publicAccess: 'rwrw----' set) - setting the
// modern nested `sharing` object explicitly alongside it is the robust fix.
// Used for Program/ProgramStage/TrackedEntityType, which all carry a data
// sharing dimension that gates tracker/event data reads.
const sharing = (publicAccess) => ({
    public: publicAccess,
    external: false,
    users: {},
    userGroups: {},
})

// Builds the full /api/metadata payload plus a map of every id it created,
// which the tracker-data builder needs to reference. `withGeometryCoords`
// is a [lon, lat] pair used for the "with geometry" test org unit.
const buildMetadata = ({ rootOrgUnitId, withGeometryCoords }) => {
    const ids = {
        ouWithGeometry: uid('orgUnit:withGeometry'),
        ouNoGeometry: uid('orgUnit:noGeometry'),

        deCoordinate: uid('dataElement:coordinate'),
        deOrgUnit: uid('dataElement:orgUnit'),
        deScenarioCode: uid('dataElement:scenarioCode'),

        teaCoordinate: uid('trackedEntityAttribute:coordinate'),
        teaOrgUnit: uid('trackedEntityAttribute:orgUnit'),
        teaScenarioCode: uid('trackedEntityAttribute:scenarioCode'),

        trackedEntityType: uid('trackedEntityType:person'),

        trackerProgram: uid('program:tracker'),
        trackerProgramStage: uid('programStage:tracker'),

        eventProgram: uid('program:event'),
        eventProgramStage: uid('programStage:event'),

        // programTrackedEntityAttribute join rows
        trackerPteaCoordinate: uid('ptea:tracker:coordinate'),
        trackerPteaOrgUnit: uid('ptea:tracker:orgUnit'),
        trackerPteaScenarioCode: uid('ptea:tracker:scenarioCode'),

        // programStageDataElement join rows (one set per program stage)
        trackerPsdeCoordinate: uid('psde:tracker:coordinate'),
        trackerPsdeOrgUnit: uid('psde:tracker:orgUnit'),
        trackerPsdeScenarioCode: uid('psde:tracker:scenarioCode'),
        eventPsdeCoordinate: uid('psde:event:coordinate'),
        eventPsdeOrgUnit: uid('psde:event:orgUnit'),
        eventPsdeScenarioCode: uid('psde:event:scenarioCode'),
    }

    const organisationUnits = [
        {
            id: ids.ouWithGeometry,
            name: 'Maps Test OU (with geometry)',
            shortName: 'Maps Test OU (geom)',
            openingDate: '2020-01-01',
            parent: { id: rootOrgUnitId },
            geometry: {
                type: 'Point',
                coordinates: pointForChannel(withGeometryCoords, 'ougeometry'),
            },
        },
        {
            id: ids.ouNoGeometry,
            name: 'Maps Test OU (no geometry)',
            shortName: 'Maps Test OU (no geom)',
            openingDate: '2020-01-01',
            parent: { id: rootOrgUnitId },
        },
    ]

    const dataElements = [
        {
            id: ids.deCoordinate,
            name: 'Maps Test Coordinate DE',
            shortName: 'Maps Test Coord DE',
            domainType: 'TRACKER',
            valueType: 'COORDINATE',
            aggregationType: 'NONE',
            categoryCombo: { id: DEFAULT_CATEGORY_COMBO_ID },
            publicAccess: 'rw------',
        },
        {
            id: ids.deOrgUnit,
            name: 'Maps Test OrgUnit DE',
            shortName: 'Maps Test OrgUnit DE',
            domainType: 'TRACKER',
            valueType: 'ORGANISATION_UNIT',
            aggregationType: 'NONE',
            categoryCombo: { id: DEFAULT_CATEGORY_COMBO_ID },
            publicAccess: 'rw------',
        },
        {
            id: ids.deScenarioCode,
            name: 'Maps Test Scenario Code DE',
            shortName: 'Maps Test Scenario DE',
            domainType: 'TRACKER',
            valueType: 'TEXT',
            aggregationType: 'NONE',
            categoryCombo: { id: DEFAULT_CATEGORY_COMBO_ID },
            publicAccess: 'rw------',
        },
    ]

    const trackedEntityAttributes = [
        {
            id: ids.teaCoordinate,
            name: 'Maps Test Coordinate TEA',
            shortName: 'Maps Test Coord TEA',
            valueType: 'COORDINATE',
            aggregationType: 'NONE',
            publicAccess: 'rw------',
        },
        {
            id: ids.teaOrgUnit,
            name: 'Maps Test OrgUnit TEA',
            shortName: 'Maps Test OrgUnit TEA',
            valueType: 'ORGANISATION_UNIT',
            aggregationType: 'NONE',
            publicAccess: 'rw------',
        },
        {
            id: ids.teaScenarioCode,
            name: 'Maps Test Scenario Code TEA',
            shortName: 'Maps Test Scenario TEA',
            valueType: 'TEXT',
            aggregationType: 'NONE',
            publicAccess: 'rw------',
        },
    ]

    const trackedEntityTypes = [
        {
            id: ids.trackedEntityType,
            name: 'Maps Test Person',
            shortName: 'Maps Test Person',
            featureType: 'POINT',
            publicAccess: 'rwrw----',
            sharing: sharing('rwrw----'),
        },
    ]

    const programStageDataElements = (
        programStageId,
        { coordinate, orgUnit, scenarioCode }
    ) => [
        {
            id: coordinate,
            programStage: { id: programStageId },
            dataElement: { id: ids.deCoordinate },
        },
        {
            id: orgUnit,
            programStage: { id: programStageId },
            dataElement: { id: ids.deOrgUnit },
        },
        {
            id: scenarioCode,
            programStage: { id: programStageId },
            dataElement: { id: ids.deScenarioCode },
            // Shows the scenario code as a data table column (Event layer
            // "display in reports" - see util/event.js's getEventColumns).
            displayInReports: true,
        },
    ]

    const programStages = [
        {
            id: ids.trackerProgramStage,
            name: 'Maps Test Stage (Tracker)',
            program: { id: ids.trackerProgram },
            featureType: 'POINT',
            // We deliberately create 16 events per enrollment (one per
            // event-level scenario) - program stages default to
            // non-repeatable (max one event per enrollment) and
            // auto-generate a placeholder event on enrollment creation,
            // either of which would silently reject/crowd out our events
            // (DHIS2 error E1039: "is not repeatable and an Event already
            // exists").
            repeatable: true,
            autoGenerateEvent: false,
            publicAccess: 'rwrw----',
            sharing: sharing('rwrw----'),
            programStageDataElements: programStageDataElements(
                ids.trackerProgramStage,
                {
                    coordinate: ids.trackerPsdeCoordinate,
                    orgUnit: ids.trackerPsdeOrgUnit,
                    scenarioCode: ids.trackerPsdeScenarioCode,
                }
            ),
        },
        {
            id: ids.eventProgramStage,
            name: 'Maps Test Stage (Event)',
            program: { id: ids.eventProgram },
            featureType: 'POINT',
            publicAccess: 'rwrw----',
            sharing: sharing('rwrw----'),
            programStageDataElements: programStageDataElements(
                ids.eventProgramStage,
                {
                    coordinate: ids.eventPsdeCoordinate,
                    orgUnit: ids.eventPsdeOrgUnit,
                    scenarioCode: ids.eventPsdeScenarioCode,
                }
            ),
        },
    ]

    const programs = [
        {
            id: ids.trackerProgram,
            name: 'Maps Test Coordinates (Tracker)',
            shortName: 'Maps Test Coords (Tracker)',
            programType: 'WITH_REGISTRATION',
            trackedEntityType: { id: ids.trackedEntityType },
            featureType: 'POINT',
            categoryCombo: { id: DEFAULT_CATEGORY_COMBO_ID },
            organisationUnits: [
                { id: ids.ouWithGeometry },
                { id: ids.ouNoGeometry },
            ],
            programStages: [{ id: ids.trackerProgramStage }],
            publicAccess: 'rwrw----',
            sharing: sharing('rwrw----'),
            programTrackedEntityAttributes: [
                {
                    id: ids.trackerPteaCoordinate,
                    program: { id: ids.trackerProgram },
                    trackedEntityAttribute: { id: ids.teaCoordinate },
                    mandatory: false,
                },
                {
                    id: ids.trackerPteaOrgUnit,
                    program: { id: ids.trackerProgram },
                    trackedEntityAttribute: { id: ids.teaOrgUnit },
                    mandatory: false,
                },
                {
                    id: ids.trackerPteaScenarioCode,
                    program: { id: ids.trackerProgram },
                    trackedEntityAttribute: { id: ids.teaScenarioCode },
                    mandatory: false,
                    // Tracked entity layer equivalent of displayInReports
                    // above (see util/trackedEntity.js).
                    displayInList: true,
                },
            ],
        },
        {
            id: ids.eventProgram,
            name: 'Maps Test Coordinates (Event)',
            shortName: 'Maps Test Coords (Event)',
            programType: 'WITHOUT_REGISTRATION',
            categoryCombo: { id: DEFAULT_CATEGORY_COMBO_ID },
            organisationUnits: [
                { id: ids.ouWithGeometry },
                { id: ids.ouNoGeometry },
            ],
            programStages: [{ id: ids.eventProgramStage }],
            publicAccess: 'rwrw----',
            sharing: sharing('rwrw----'),
        },
    ]

    const metadata = {
        organisationUnits,
        dataElements,
        trackedEntityAttributes,
        trackedEntityTypes,
        programStages,
        programs,
    }

    return { metadata, ids }
}

module.exports = { buildMetadata, DEFAULT_CATEGORY_COMBO_ID }
