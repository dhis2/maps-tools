// Post 4 · Who hasn't been seen today? Ebola cases and their contacts in two
// tracker programs, linked by a relationship type, with daily follow-up.
const { distanceKm, loadFacilityPoints } = require('../shared/geometry.js')
const { indicator } = require('../shared/metadata.js')
const { legendSet } = require('../shared/legendSets.js')
const {
    boundaryLayer,
    dashboard,
    eventLayer,
    map,
    thematicLayer,
    trackedEntityLayer,
} = require('../shared/maps.js')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const {
    PERSON,
    id,
    mergeParts,
    optionSet,
    point,
    program,
    programIndicator,
    relationshipType,
    styleByBoolean,
    trackerDataElement,
} = require('../shared/tracker.js')
const { addDays, isoDate } = require('../periods.js')
const { randomFor } = require('../random.js')

const CASES = 'EBOLA_CASES'
const CONTACTS = 'EBOLA_CONTACTS'
const INVESTIGATION = 'EBOLA_CASE_INVESTIGATION'
const FOLLOW_UP = 'EBOLA_FOLLOW_UP_VISIT'
const DE = {
    classification: 'EBOLA_CLASSIFICATION',
    knownContact: 'EBOLA_KNOWN_CONTACT',
    seen: 'EBOLA_CONTACT_SEEN',
}
const PI = { seen: 'EBOLA_VISITS_SEEN', visits: 'EBOLA_VISITS' }
const RELATIONSHIP = 'EBOLA_CASE_TO_CONTACT'
const FOLLOW_UP_INDICATOR = 'EBOLA_FOLLOW_UP_RATE'

const OUTBREAK_DAYS = 35
const CASE_COUNT = 20
const CONTACTS_PER_CASE = 15
const FOLLOW_UP_DAYS = 21
const OUTBREAK_DISTRICTS = ['kenema', 'kailahun']
// The map shows the outbreak districts and Kono, where two cases came from
// outside known chains
const AREA = [...OUTBREAK_DISTRICTS, 'kono'].map((key) => DISTRICTS[key])
// Daily visits that find the contact, by health area
const SEEN = 0.975
const SEEN_LOW = 0.8
// Contacts living away from their index case
const AWAY_SHARE = 0.1
// Household and neighbourhood contacts, far enough apart for the lines to
// their case to show on the close-up
const CONTACT_SPREAD_KM = 1.5
// Recent cases: some were known contacts, two came from outside known chains
const KNOWN_CONTACT_CASES = 3

const options = {
    classification: optionSet({
        key: 'EBOLA_CLASSIFICATION',
        name: 'Ebola case classification',
        options: [
            { code: 'CONFIRMED', name: 'Confirmed', color: '#e31a1c' },
            { code: 'PROBABLE', name: 'Probable', color: '#fd8d3c' },
        ],
    }),
    seen: optionSet({
        key: 'EBOLA_CONTACT_SEEN',
        name: 'Contact seen at visit',
        options: [
            { code: 'SEEN', name: 'Seen', color: '#2171b5' },
            { code: 'NOT_SEEN', name: 'Not seen', color: '#e31a1c' },
        ],
    }),
}

const near = (random, [lon, lat], km) => {
    const angle = random.between(0, 2 * Math.PI)
    const distance = km * Math.sqrt(random.next())
    return [
        lon + (distance * Math.cos(angle)) / 109,
        lat + (distance * Math.sin(angle)) / 110.6,
    ]
}

// Half of the index cases live in the health area where follow-up falls
// short, the others within this distance of it: an outbreak with a centre
const LOW_AREA_SHARE = 0.5
const NEAR_KM = 30

// Facilities with a point in the outbreak districts, the health area
// (chiefdom) where follow-up falls short (the busiest one), its facilities
// and those near it
const outbreakArea = (facilities, points) => {
    const inArea = facilities.filter(
        (f) =>
            points[f.id] &&
            OUTBREAK_DISTRICTS.some((key) => DISTRICTS[key] === f.districtId)
    )
    const counts = {}
    inArea.forEach((f) => {
        counts[f.chiefdomId] = (counts[f.chiefdomId] || 0) + 1
    })
    const [lowChiefdom] = Object.entries(counts).sort(
        ([a, x], [b, y]) => y - x || a.localeCompare(b)
    )[0]
    const inLow = inArea.filter((f) => f.chiefdomId === lowChiefdom)
    const centre = [0, 1].map(
        (i) => inLow.reduce((sum, f) => sum + points[f.id][i], 0) / inLow.length
    )
    const nearLow = inArea.filter(
        (f) =>
            f.chiefdomId === lowChiefdom ||
            distanceKm(points[f.id], centre) <= NEAR_KM
    )
    return { inArea, lowChiefdom, inLow, nearLow }
}

// Ids include the org unit. An import doesn't move a tracked entity's program
// owner, which maps filter by, and a deleted id can't be created again: a
// record that moves gets a new id, and the old one goes as stale.
const recordId = (type, key, orgUnit) => id(type, `post4:${key}@${orgUnit}`)

const tei = (key, orgUnit, location) => ({
    trackedEntity: recordId('trackedEntity', key, orgUnit),
    trackedEntityType: PERSON,
    orgUnit,
    geometry: point(location),
})

const enrollment = (key, teiId, programKey, orgUnit, date, status) => ({
    enrollment: recordId('enrollment', key, orgUnit),
    trackedEntity: teiId,
    program: id('program', programKey),
    orgUnit,
    status,
    enrolledAt: isoDate(date),
    occurredAt: isoDate(date),
    ...(status === 'COMPLETED' ? { completedAt: isoDate(date) } : {}),
})

const caseEvent = (
    key,
    enrollmentId,
    orgUnit,
    date,
    classification,
    location,
    knownContact
) => ({
    event: recordId('event', key, orgUnit),
    enrollment: enrollmentId,
    program: id('program', CASES),
    programStage: id('programStage', INVESTIGATION),
    orgUnit,
    status: 'COMPLETED',
    occurredAt: isoDate(date),
    geometry: point(location),
    dataValues: [
        {
            dataElement: id('dataElement', DE.classification),
            value: classification,
        },
        {
            dataElement: id('dataElement', DE.knownContact),
            value: String(knownContact),
        },
    ],
})

const generate = ({ runDate }, { facilities, points }) => {
    const { lowChiefdom, inLow, nearLow } = outbreakArea(facilities, points)
    const pick = (random, list) => list[random.int(0, list.length - 1)]
    const out = {
        trackedEntities: [],
        enrollments: [],
        events: [],
        relationships: [],
    }
    const contacts = []

    // Index cases, one every day or two, each with its contacts
    for (let c = 0; c < CASE_COUNT; c++) {
        const r = randomFor('post4-case', c)
        const facility = pick(r, r.chance(LOW_AREA_SHARE) ? inLow : nearLow)
        const daysAgo = Math.round(
            OUTBREAK_DAYS - (c * (OUTBREAK_DAYS - 8)) / CASE_COUNT
        )
        const date = addDays(runDate, -daysAgo)
        const home = near(r, points[facility.id], 2)
        const caseTei = tei(`case:${c}`, facility.id, home)
        const caseEnrollment = enrollment(
            `case:${c}`,
            caseTei.trackedEntity,
            CASES,
            facility.id,
            date,
            'ACTIVE'
        )
        out.trackedEntities.push(caseTei)
        out.enrollments.push(caseEnrollment)
        out.events.push(
            caseEvent(
                `case:${c}`,
                caseEnrollment.enrollment,
                facility.id,
                date,
                r.chance(0.8) ? 'CONFIRMED' : 'PROBABLE',
                home,
                false
            )
        )

        for (let k = 0; k < CONTACTS_PER_CASE; k++) {
            const key = `contact:${c}:${k}`
            const rc = randomFor('post4', key)
            const away = rc.chance(AWAY_SHARE)
            const contactFacility = away ? pick(rc, nearLow) : facility
            const location = away
                ? near(rc, points[contactFacility.id], 2)
                : near(rc, home, CONTACT_SPREAD_KM)
            const exposure = addDays(date, -rc.int(0, 2))
            const followUpEnd = addDays(exposure, FOLLOW_UP_DAYS)
            const completed = followUpEnd < runDate
            const contactTei = tei(key, contactFacility.id, location)
            const contactEnrollment = enrollment(
                key,
                contactTei.trackedEntity,
                CONTACTS,
                contactFacility.id,
                exposure,
                completed ? 'COMPLETED' : 'ACTIVE'
            )
            out.trackedEntities.push(contactTei)
            out.enrollments.push(contactEnrollment)
            out.relationships.push({
                relationship: recordId('relationship', key, contactFacility.id),
                relationshipType: id('relationshipType', RELATIONSHIP),
                from: {
                    trackedEntity: { trackedEntity: caseTei.trackedEntity },
                },
                to: {
                    trackedEntity: { trackedEntity: contactTei.trackedEntity },
                },
            })
            contacts.push({
                key,
                tei: contactTei,
                facility: contactFacility,
                location,
            })

            // One visit a day until the end of follow-up or yesterday
            const seenRate =
                contactFacility.chiefdomId === lowChiefdom ? SEEN_LOW : SEEN
            for (let day = 1; day <= FOLLOW_UP_DAYS; day++) {
                const visitDate = addDays(exposure, day)
                if (visitDate >= runDate) {
                    break
                }
                const rv = randomFor('post4-visit', key, day)
                out.events.push({
                    event: recordId(
                        'event',
                        `${key}:${day}`,
                        contactFacility.id
                    ),
                    enrollment: contactEnrollment.enrollment,
                    program: id('program', CONTACTS),
                    programStage: id('programStage', FOLLOW_UP),
                    orgUnit: contactFacility.id,
                    status: 'COMPLETED',
                    occurredAt: isoDate(visitDate),
                    dataValues: [
                        {
                            dataElement: id('dataElement', DE.seen),
                            value: rv.chance(seenRate) ? 'SEEN' : 'NOT_SEEN',
                        },
                    ],
                })
            }
        }
    }

    // New cases of the last week: known contacts become cases in their own
    // home; two others come from outside known chains
    const recent = []
    for (let n = 0; n < KNOWN_CONTACT_CASES; n++) {
        const contact = contacts[n * 37 + 5]
        const date = addDays(runDate, -(n + 1))
        // The contact's own id in the key: a new contact record means a new
        // case enrollment
        const knownKey = `known:${n}:${contact.tei.trackedEntity}`
        const caseEnrollment = enrollment(
            knownKey,
            contact.tei.trackedEntity,
            CASES,
            contact.facility.id,
            date,
            'ACTIVE'
        )
        out.enrollments.push(caseEnrollment)
        out.events.push(
            caseEvent(
                knownKey,
                caseEnrollment.enrollment,
                contact.facility.id,
                date,
                'CONFIRMED',
                contact.location,
                true
            )
        )
        recent.push({ known: true, facility: contact.facility })
    }
    const outsideArea = facilities.filter(
        (f) => points[f.id] && f.districtId === DISTRICTS.kono
    )
    for (let n = 0; n < 2; n++) {
        const r = randomFor('post4-unknown', n)
        const facility = outsideArea[r.int(0, outsideArea.length - 1)]
        const date = addDays(runDate, -(n + 2))
        const home = near(r, points[facility.id], 1)
        const caseTei = tei(`unknown:${n}`, facility.id, home)
        const caseEnrollment = enrollment(
            `unknown:${n}`,
            caseTei.trackedEntity,
            CASES,
            facility.id,
            date,
            'ACTIVE'
        )
        out.trackedEntities.push(caseTei)
        out.enrollments.push(caseEnrollment)
        out.events.push(
            caseEvent(
                `unknown:${n}`,
                caseEnrollment.enrollment,
                facility.id,
                date,
                'CONFIRMED',
                home,
                false
            )
        )
        recent.push({ known: false, facility })
    }
    return { ...out, lowChiefdom, recent }
}

const legendSets = {
    followUp: legendSet({
        key: 'CONTACT_FOLLOW_UP',
        name: 'Showcase: contacts seen at daily visits (95% target)',
        // ColorBrewer RdPu, darkest where contacts are missed
        legends: [
            { name: 'Below 90%', start: 0, end: 90, color: '#ae017e' },
            { name: '90 to 95%', start: 90, end: 95, color: '#f768a1' },
            // Visible against the basemap, unlike areas without contacts
            { name: 'Above 95%', start: 95, end: 100, color: '#fcc5c0' },
        ],
    }),
}

const followUpIndicator = indicator({
    key: FOLLOW_UP_INDICATOR,
    name: 'Contacts seen at daily follow-up visits',
    type: 'percent',
    numerator: `I{${id('programIndicator', PI.seen)}}`,
    denominator: `I{${id('programIndicator', PI.visits)}}`,
    description:
        'Daily follow-up visits that found the contact over all daily follow-up visits.',
    decimals: 0,
})

const post = {
    number: 4,
    title: "Who hasn't been seen today?",
    eventAnalytics: true,
    trackedEntityAnalytics: true,

    prepare: async ({ client, orgUnits }) => ({
        facilities: orgUnits.facilities,
        chiefdoms: orgUnits.chiefdoms,
        points: await loadFacilityPoints(client),
    }),

    metadata: (ctx, { facilities }) =>
        mergeParts(
            {
                optionSets: [
                    options.classification.optionSet,
                    options.seen.optionSet,
                ],
                options: [
                    ...options.classification.options,
                    ...options.seen.options,
                ],
                dataElements: [
                    trackerDataElement({
                        key: DE.classification,
                        name: 'Ebola case classification',
                        optionSetKey: 'EBOLA_CLASSIFICATION',
                    }),
                    trackerDataElement({
                        key: DE.knownContact,
                        name: 'Known contact before onset',
                        valueType: 'BOOLEAN',
                    }),
                    trackerDataElement({
                        key: DE.seen,
                        name: 'Contact seen at visit',
                        optionSetKey: 'EBOLA_CONTACT_SEEN',
                    }),
                ],
                legendSets: Object.values(legendSets),
            },
            program({
                key: CASES,
                name: 'Ebola case surveillance',
                registration: true,
                orgUnits: facilities,
                stages: [
                    {
                        key: INVESTIGATION,
                        name: 'Case investigation',
                        dataElements: [DE.classification, DE.knownContact],
                    },
                ],
            }),
            program({
                key: CONTACTS,
                name: 'Ebola contact follow-up',
                registration: true,
                orgUnits: facilities,
                stages: [
                    {
                        key: FOLLOW_UP,
                        name: 'Follow-up visit',
                        repeatable: true,
                        dataElements: [DE.seen],
                    },
                ],
            }),
            {
                relationshipTypes: [
                    relationshipType({
                        key: RELATIONSHIP,
                        name: 'Ebola case to contact',
                        fromProgramKey: CASES,
                        toProgramKey: CONTACTS,
                    }),
                ],
                programIndicators: [
                    programIndicator({
                        key: PI.seen,
                        name: 'Follow-up visits, contact seen',
                        programKey: CONTACTS,
                        expression: 'V{event_count}',
                        filter: `#{${id('programStage', FOLLOW_UP)}.${id(
                            'dataElement',
                            DE.seen
                        )}} == 'SEEN'`,
                    }),
                    programIndicator({
                        key: PI.visits,
                        name: 'Follow-up visits',
                        programKey: CONTACTS,
                        expression: 'V{event_count}',
                    }),
                ],
                indicators: [followUpIndicator],
            }
        ),

    data: (ctx, state) => {
        const { trackedEntities, enrollments, events, relationships } =
            generate(ctx, state)
        return {
            tracker: {
                programs: [id('program', CASES), id('program', CONTACTS)],
                registration: [id('program', CASES), id('program', CONTACTS)],
                trackedEntities,
                enrollments,
                events,
                relationships,
            },
        }
    },

    content: (ctx, state) => {
        const { lowChiefdom, recent } = generate(ctx, state)
        const chiefdomName = (chiefdomId) =>
            state.chiefdoms.find((c) => c.id === chiefdomId)?.name
        const tracing = map({
            key: 'post04_contacts',
            post: 4,
            title: "Who hasn't been seen today?",
            description:
                'Contacts seen at daily visits in the last 7 days by chiefdom, cases, and new cases of the last 7 days by whether they were known contacts.',
            layers: [
                thematicLayer({
                    name: 'Contacts seen at daily visits, last 7 days',
                    dataItem: {
                        id: followUpIndicator.id,
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: ['LAST_7_DAYS'],
                    orgUnits: [...AREA, 'LEVEL-3'],
                    legendSet: legendSets.followUp.id,
                    opacity: 0.85,
                }),
                boundaryLayer({
                    name: 'Districts',
                    orgUnits: AREA,
                    color: '#252525',
                    labels: '{name}',
                    labelColor: '#000000',
                }),
                trackedEntityLayer({
                    name: 'Cases',
                    programId: id('program', CASES),
                    orgUnits: AREA,
                    color: '#000000',
                    radius: 5,
                }),
                eventLayer({
                    name: 'New cases, last 7 days',
                    programId: id('program', CASES),
                    stageId: id('programStage', INVESTIGATION),
                    periods: ['LAST_7_DAYS'],
                    orgUnits: AREA,
                    radius: 9,
                    styleDataItem: styleByBoolean(DE.knownContact, {
                        yes: '#2171b5',
                        no: '#e31a1c',
                    }),
                }),
            ],
        })
        // The health area where follow-up falls short: contacts by status,
        // and on top each case with lines to small dots inside its contacts
        const lowArea = [lowChiefdom]
        const closeUp = map({
            key: 'post04_low_area',
            post: 4,
            title: `Contacts to visit in ${chiefdomName(lowChiefdom)}`,
            description: `Cases in ${chiefdomName(
                lowChiefdom
            )} with lines to their contacts, and contacts under follow-up or done with it.`,
            basemap: 'openStreetMap',
            layers: [
                boundaryLayer({
                    name: 'Chiefdom',
                    orgUnits: lowArea,
                    color: '#252525',
                    labels: '{name}',
                }),
                trackedEntityLayer({
                    name: 'Contacts, follow-up completed',
                    programId: id('program', CONTACTS),
                    programStatus: 'COMPLETED',
                    orgUnits: lowArea,
                    color: '#bdbdbd',
                    radius: 6,
                }),
                trackedEntityLayer({
                    name: 'Contacts under follow-up',
                    programId: id('program', CONTACTS),
                    programStatus: 'ACTIVE',
                    orgUnits: lowArea,
                    color: '#2171b5',
                    radius: 6,
                }),
                trackedEntityLayer({
                    name: 'Cases and their contacts',
                    programId: id('program', CASES),
                    orgUnits: lowArea,
                    color: '#000000',
                    radius: 7,
                    relationship: {
                        typeId: id('relationshipType', RELATIONSHIP),
                        pointColor: '#252525',
                        pointRadius: 2,
                        lineColor: '#525252',
                    },
                }),
            ],
        })
        const unknown = recent.filter(({ known }) => !known)
        // The outbreak area, then the health area to act on
        const maps = [tracing, closeUp]
        return {
            maps: maps.map((m) => ({ map: m, teams: ['surveillance'] })),
            dashboards: [
                dashboard({
                    key: 'post04',
                    post: 4,
                    title: 'Outbreak contact follow-up',
                    maps,
                }),
            ],
            interpretations: [
                {
                    map: tracing.id,
                    author: 'tracing_supervisor',
                    text: `${chiefdomName(
                        lowChiefdom
                    )} is below 90% of contacts seen at daily visits: it needs two more tracers and a motorbike today. ${
                        recent.length - unknown.length
                    } of this week's ${
                        recent.length
                    } new cases were on a contact list. The ${
                        unknown.length
                    } cases near ${
                        unknown[0].facility.name
                    } were not, so they came from outside known chains. @show_surveillance_lead please send an investigation team there.`,
                    comments: [
                        {
                            author: 'surveillance_lead',
                            text: 'Investigation team assigned; active case finding starts in the villages around the two cases tomorrow.',
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx, state) => {
        const { lowChiefdom } = outbreakArea(state.facilities, state.points)
        const chiefdoms = [
            ...new Set(
                outbreakArea(state.facilities, state.points).inArea.map(
                    (f) => f.chiefdomId
                )
            ),
        ]
        return [
            {
                name: 'One health area below 90% of contacts seen, the others above 95%',
                path: `/api/analytics?dimension=dx:${
                    followUpIndicator.id
                }&dimension=ou:${chiefdoms.join(
                    ';'
                )}&filter=pe:LAST_7_DAYS&skipMeta=true`,
                evaluate: (rows) => {
                    const v = Object.fromEntries(
                        rows.map(([, ou, value]) => [ou, Number(value)])
                    )
                    const others = Object.entries(v)
                        .filter(([ou]) => ou !== lowChiefdom)
                        .map(([, value]) => value)
                    const goodOthers = others.filter((value) => value >= 95)
                    return {
                        ok:
                            v[lowChiefdom] < 90 &&
                            goodOthers.length >= 0.6 * others.length,
                        detail: `low area ${v[lowChiefdom]}%, ${goodOthers.length} of ${others.length} other areas above 95%`,
                    }
                },
            },
            {
                name: 'Contacts under follow-up and completed are both on the map',
                path: `/api/tracker/trackedEntities?program=${id(
                    'program',
                    CONTACTS
                )}&ouMode=ACCESSIBLE&fields=trackedEntity,enrollments[program,status]&paging=false`,
                evaluate: (rows, body) => {
                    const list = body.trackedEntities ?? body.instances ?? []
                    const statuses = list.map(
                        (t) =>
                            t.enrollments?.find(
                                (e) => e.program === id('program', CONTACTS)
                            )?.status
                    )
                    const active = statuses.filter((s) => s === 'ACTIVE').length
                    const completed = statuses.filter(
                        (s) => s === 'COMPLETED'
                    ).length
                    return {
                        ok: active > 0 && completed > 0,
                        detail: `${active} under follow-up, ${completed} completed`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate, outbreakArea }
