/*
 * Group 14: program data. Program indicators count events
 * (V{event_count}); their orgUnitField decides where a count lands.
 *
 * - An event program assigned to F1 and F2: 3 events at F1 (one with the
 *   org unit data element set to F3), 2 at F2.
 * - A tracker program assigned to F1, F2 and F3: one tracked entity
 *   registered at F2, enrolled at F1, with 2 events at F1; ownership then
 *   moves to F3 (today, so after the query period).
 *
 * `lands` is the hypothesis: the events counted at each facility.
 */
const { uid } = require('../../uid.js')
const { dataElement } = require('../shared.js')
const { orgUnitCase, verifyOrgUnitCases } = require('./shared.js')

const KEY = 'programs'
const PUBLIC_DATA_WRITE = { public: 'rwrw----', users: {}, userGroups: {} }
const PLACES = ['F1', 'F2', 'F3', 'region']
const FACILITIES = ['F1', 'F2', 'F3']

const named = (key, name, extra = {}) => ({
    id: uid(key),
    code: `PTT_${key.toUpperCase().replace(/-/g, '_')}`,
    name,
    shortName: name.slice(0, 50),
    ...extra,
})

const buildGroup = ({ orgUnits }) => {
    const ids = (keys) => keys.map((key) => ({ id: orgUnits[key].id }))
    const place = dataElement('prog-place', {
        code: 'PTT_PROG_PLACE',
        name: 'PTT program place',
        aggregationType: 'NONE',
        valueType: 'ORGANISATION_UNIT',
        domainType: 'TRACKER',
    })
    const personType = named('prog-person', 'PTT person', {
        sharing: PUBLIC_DATA_WRITE,
    })
    const eventStage = named('prog-event-stage', 'PTT event program stage', {
        program: { id: uid('prog-event') },
        programStageDataElements: [{ dataElement: { id: place.id } }],
        sharing: PUBLIC_DATA_WRITE,
    })
    const trackerStage = named(
        'prog-tracker-stage',
        'PTT tracker program stage',
        {
            program: { id: uid('prog-tracker') },
            // Two events in one enrollment.
            repeatable: true,
            sharing: PUBLIC_DATA_WRITE,
        }
    )
    const eventProgram = named('prog-event', 'PTT event program', {
        programType: 'WITHOUT_REGISTRATION',
        organisationUnits: ids(['F1', 'F2']),
        programStages: [{ id: eventStage.id }],
        sharing: PUBLIC_DATA_WRITE,
    })
    const trackerProgram = named('prog-tracker', 'PTT tracker program', {
        programType: 'WITH_REGISTRATION',
        trackedEntityType: { id: personType.id },
        organisationUnits: ids(FACILITIES),
        programStages: [{ id: trackerStage.id }],
        sharing: PUBLIC_DATA_WRITE,
    })

    const INDICATORS = [
        {
            key: 'event',
            program: eventProgram,
            field: null,
            lands: { F1: 3, F2: 2 },
        },
        {
            key: 'event-place',
            program: eventProgram,
            field: place.id,
            lands: { F3: 1 },
        },
        {
            key: 'tracker',
            program: trackerProgram,
            field: null,
            lands: { F1: 2 },
        },
        {
            key: 'tracker-registration',
            program: trackerProgram,
            field: 'REGISTRATION',
            lands: { F2: 2 },
        },
        {
            key: 'tracker-enrollment',
            program: trackerProgram,
            field: 'ENROLLMENT',
            lands: { F1: 2 },
        },
        {
            key: 'tracker-owner-start',
            program: trackerProgram,
            field: 'OWNER_AT_START',
            lands: { F1: 2 },
        },
        {
            key: 'tracker-owner-end',
            program: trackerProgram,
            field: 'OWNER_AT_END',
            lands: { F1: 2 },
        },
    ]
    const programIndicators = INDICATORS.map((spec) =>
        named(`prog-pi-${spec.key}`, `PTT program indicator ${spec.key}`, {
            program: { id: spec.program.id },
            analyticsType: 'EVENT',
            expression: 'V{event_count}',
            aggregationType: 'SUM',
            /*
             * As the maintenance app sets them. Without boundaries, 2.40 to
             * 2.42 build broken SQL ("syntax error at or near and").
             */
            analyticsPeriodBoundaries: [
                'AFTER_START_OF_REPORTING_PERIOD',
                'BEFORE_END_OF_REPORTING_PERIOD',
            ].map((type) => ({
                boundaryTarget: 'EVENT_DATE',
                analyticsPeriodBoundaryType: type,
            })),
            ...(spec.field ? { orgUnitField: spec.field } : {}),
        })
    )

    const assigned = (program) =>
        program === eventProgram ? ['F1', 'F2'] : FACILITIES
    // A field other than the event's own unit can place counts anywhere.
    const movesValues = (field) =>
        field &&
        !['ENROLLMENT', 'OWNER_AT_START', 'OWNER_AT_END'].includes(field)

    const cases = INDICATORS.flatMap((spec, index) => {
        const indicator = programIndicators[index]
        const sources = assigned(spec.program)
        const item = {
            code: indicator.code,
            dimensionItemType: 'PROGRAM_INDICATOR',
            collectionSources: [
                {
                    program: spec.program.name,
                    orgUnits: sources,
                    ...(spec.field
                        ? {
                              orgUnitField:
                                  spec.field === place.id
                                      ? 'DATA_ELEMENT'
                                      : spec.field,
                          }
                        : {}),
                },
            ],
        }
        return PLACES.map((where) => {
            const under = where === 'region' ? FACILITIES : [where]
            const count = under.reduce(
                (sum, unit) => sum + (spec.lands[unit] ?? 0),
                0
            )
            const prediction = movesValues(spec.field)
                ? { compatibility: 'full', reasons: ['ORG_UNIT_FIELD'] }
                : under.some((unit) => sources.includes(unit))
                  ? { compatibility: 'full', reasons: [] }
                  : { compatibility: 'none', reasons: ['NOT_ASSIGNED'] }
            return orgUnitCase({
                id: `ou-prog-${spec.key}__${where}`,
                item,
                dx: indicator.id,
                orgUnits: [where],
                contributes: [],
                value: count,
                prediction,
            })
        })
    })

    const event = (key, unit, date, values = []) => ({
        event: uid(`prog-ev-${key}`),
        program: eventProgram.id,
        programStage: eventStage.id,
        orgUnit: orgUnits[unit].id,
        occurredAt: date,
        status: 'COMPLETED',
        dataValues: values,
    })
    const trackedEntity = {
        trackedEntity: uid('prog-te'),
        trackedEntityType: personType.id,
        orgUnit: orgUnits.F2.id,
        enrollments: [
            {
                enrollment: uid('prog-enrollment'),
                program: trackerProgram.id,
                orgUnit: orgUnits.F1.id,
                enrolledAt: '2025-01-10',
                occurredAt: '2025-01-10',
                status: 'ACTIVE',
                events: ['2025-01-12', '2025-02-12'].map((date, n) => ({
                    event: uid(`prog-te-ev-${n}`),
                    program: trackerProgram.id,
                    programStage: trackerStage.id,
                    orgUnit: orgUnits.F1.id,
                    occurredAt: date,
                    status: 'COMPLETED',
                    dataValues: [],
                })),
            },
        ],
    }

    return {
        key: KEY,
        number: 14,
        title: 'Programs',
        fixtureSet: 'org-units',
        dataElements: [place],
        extraMetadata: {
            trackedEntityTypes: [personType],
            programs: [eventProgram, trackerProgram],
            programStages: [eventStage, trackerStage],
            programIndicators,
        },
        tracker: {
            trackedEntities: [trackedEntity],
            events: [
                event('f1-jan', 'F1', '2025-01-15'),
                event('f1-feb', 'F1', '2025-02-15', [
                    { dataElement: place.id, value: orgUnits.F3.id },
                ]),
                event('f1-mar', 'F1', '2025-03-15'),
                event('f2-jan', 'F2', '2025-01-20'),
                event('f2-feb', 'F2', '2025-02-20'),
            ],
        },
        ownershipTransfers: [
            {
                trackedEntity: trackedEntity.trackedEntity,
                program: trackerProgram.id,
                orgUnit: orgUnits.F3.id,
            },
        ],
        cases,
        verify: verifyOrgUnitCases(cases),
    }
}

module.exports = { KEY, buildGroup }
