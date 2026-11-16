// Post 3 · Drawing the ring around cholera: suspected cholera cases with
// household coordinates, 150 m rings around the RDT-positive ones.
const { loadFacilityPoints } = require('../shared/geometry.js')
const { legendSet } = require('../shared/legendSets.js')
const {
    boundaryLayer,
    dashboard,
    eventLayer,
    map,
    thematicLayer,
} = require('../shared/maps.js')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const {
    id,
    mergeParts,
    optionSet,
    point,
    program,
    programIndicator,
    styleByNumber,
    styleByOptions,
    trackerDataElement,
} = require('../shared/tracker.js')
const { addDays, isoDate } = require('../periods.js')
const { randomFor } = require('../random.js')

const PROGRAM = 'CHOLERA_CASES'
const STAGE = 'CHOLERA_CASE_REPORT'
const DE = {
    rdt: 'CHOLERA_RDT_RESULT',
    outcome: 'CHOLERA_OUTCOME',
    onset: 'CHOLERA_DAYS_SINCE_ONSET',
}
const PI = 'CHOLERA_SUSPECTED_CASES'

const OUTBREAK_DAYS = 42
const WITHOUT_COORDINATES = 0.3
const RING_METRES = 150

const options = {
    rdt: optionSet({
        key: 'CHOLERA_RDT',
        name: 'Cholera RDT result',
        options: [
            { code: 'POSITIVE', name: 'Positive', color: '#e31a1c' },
            { code: 'NEGATIVE', name: 'Negative', color: '#1f78b4' },
            { code: 'NOT_DONE', name: 'Not done', color: '#969696' },
        ],
    }),
    outcome: optionSet({
        key: 'CHOLERA_OUTCOME',
        name: 'Cholera outcome',
        options: [
            { code: 'ALIVE', name: 'Alive', color: '#e31a1c' },
            { code: 'DEAD', name: 'Dead', color: '#000000' },
        ],
    }),
}

// The places of the story: an urban cluster in Western Area, an earlier
// wave in Kambia that has stopped, and a new isolated focus in Port Loko,
// each the chiefdom with the most facilities with a point in its district
const pickPlaces = (facilities, points) => {
    const busiestChiefdom = (district) => {
        const counts = {}
        facilities
            .filter((f) => f.districtId === DISTRICTS[district] && points[f.id])
            .forEach((f) => {
                counts[f.chiefdomId] = (counts[f.chiefdomId] || 0) + 1
            })
        const [chiefdomId] = Object.entries(counts).sort(
            ([a, x], [b, y]) => y - x || a.localeCompare(b)
        )[0]
        return {
            chiefdomId,
            facilities: facilities.filter(
                (f) => f.chiefdomId === chiefdomId && points[f.id]
            ),
        }
    }
    return {
        cluster: busiestChiefdom('westernArea'),
        earlier: busiestChiefdom('kambia'),
        focus: busiestChiefdom('portLoko'),
    }
}

// A point within about `km` of a centre
const near = (random, [lon, lat], km) => {
    const angle = random.between(0, 2 * Math.PI)
    const distance = km * Math.sqrt(random.next())
    return [
        lon + (distance * Math.cos(angle)) / 109,
        lat + (distance * Math.sin(angle)) / 110.6,
    ]
}

// Cases per day, days counted back from the run date
const WAVES = {
    // Rising to about 10 suspected cases a day
    cluster: (daysAgo) => Math.round(2 + 8 * (1 - daysAgo / OUTBREAK_DAYS)),
    // An earlier wave that ended 8 days ago
    earlier: (daysAgo) => (daysAgo >= 8 && daysAgo <= 30 ? 3 : 0),
    // Two confirmed cases in the last 2 days, none before
    focus: (daysAgo) => (daysAgo >= 1 && daysAgo <= 2 ? 1 : 0),
}
// About 60% of suspected cases test positive, a few are not tested
const rdtResult = (random) => {
    if (random.chance(0.6)) {
        return 'POSITIVE'
    }
    return random.chance(0.6) ? 'NEGATIVE' : 'NOT_DONE'
}

// Most cases come within a day of symptom onset; those who die came late
const daysSinceOnset = (random, outcome) => {
    if (outcome === 'DEAD') {
        return random.int(4, 7)
    }
    if (random.chance(0.7)) {
        return random.int(0, 1)
    }
    return random.chance(0.67) ? random.int(2, 3) : random.int(4, 6)
}

// Households of the urban cluster sit around one point
const SPREAD_KM = { cluster: 0.4, earlier: 3, focus: 0.3 }

// The facility nearest the middle of the place's facilities comes first: the
// urban cluster sits around it, away from the coast
const centralFirst = (facilities, points) => {
    const mean = (i) =>
        facilities.reduce((s, f) => s + points[f.id][i], 0) / facilities.length
    const middle = [mean(0), mean(1)]
    const distance = (f) =>
        Math.hypot(points[f.id][0] - middle[0], points[f.id][1] - middle[1])
    return [...facilities].sort((a, b) => distance(a) - distance(b))
}

const generate = ({ runDate }, { facilities, points }) => {
    const places = pickPlaces(facilities, points)
    const events = []
    Object.entries(WAVES).forEach(([place, casesOn]) => {
        const placeFacilities = centralFirst(places[place].facilities, points)
        const centre = points[placeFacilities[0].id]
        for (let daysAgo = OUTBREAK_DAYS; daysAgo >= 0; daysAgo--) {
            const date = addDays(runDate, -daysAgo)
            for (let n = 0; n < casesOn(daysAgo); n++) {
                const seed = `${place}:${daysAgo}:${n}`
                const r = randomFor('post3', seed)
                const facility =
                    place === 'cluster'
                        ? placeFacilities[0]
                        : placeFacilities[r.int(0, placeFacilities.length - 1)]
                const household = near(
                    r,
                    place === 'cluster' ? centre : points[facility.id],
                    SPREAD_KM[place]
                )
                const rdt = place === 'focus' ? 'POSITIVE' : rdtResult(r)
                const hasCoordinates =
                    place === 'focus' || !r.chance(WITHOUT_COORDINATES)
                const outcome = r.chance(0.02) ? 'DEAD' : 'ALIVE'
                events.push({
                    event: id('event', `post3:${seed}`),
                    program: id('program', PROGRAM),
                    programStage: id('programStage', STAGE),
                    orgUnit: facility.id,
                    status: 'COMPLETED',
                    occurredAt: isoDate(date),
                    ...(hasCoordinates ? { geometry: point(household) } : {}),
                    dataValues: [
                        { dataElement: id('dataElement', DE.rdt), value: rdt },
                        {
                            dataElement: id('dataElement', DE.outcome),
                            value: outcome,
                        },
                        {
                            dataElement: id('dataElement', DE.onset),
                            value: String(daysSinceOnset(r, outcome)),
                        },
                    ],
                })
            }
        }
    })
    return { places, events }
}

const legendSets = {
    suspected: legendSet({
        key: 'CHOLERA_SUSPECTED_7D',
        name: 'Showcase: suspected cholera cases in 7 days (GTFCC)',
        // ColorBrewer YlOrRd
        legends: [
            { name: '1 case', start: 1, end: 2, color: '#fd8d3c' },
            { name: '2 to 9: outbreak', start: 2, end: 10, color: '#e31a1c' },
            { name: '10 or more', start: 10, end: 10000, color: '#800026' },
        ],
    }),
    onset: legendSet({
        key: 'CHOLERA_DAYS_SINCE_ONSET',
        // Event layer legends show this name
        name: 'Days from symptom onset to consultation',
        // Blue for early, purple for late: apart from the red rings
        legends: [
            { name: '0 to 1 day', start: 0, end: 2, color: '#2c7bb6' },
            { name: '2 to 3 days', start: 2, end: 4, color: '#fdae61' },
            { name: '4 days or more', start: 4, end: 100, color: '#7b3294' },
        ],
    }),
}

const post = {
    number: 3,
    title: 'Drawing the ring around cholera',
    eventAnalytics: true,

    prepare: async ({ client, orgUnits }) => ({
        facilities: orgUnits.facilities,
        chiefdoms: orgUnits.chiefdoms,
        points: await loadFacilityPoints(client),
    }),

    metadata: (ctx, { facilities }) =>
        mergeParts(
            {
                optionSets: [options.rdt.optionSet, options.outcome.optionSet],
                options: [...options.rdt.options, ...options.outcome.options],
                dataElements: [
                    trackerDataElement({
                        key: DE.rdt,
                        name: 'Cholera RDT result',
                        optionSetKey: 'CHOLERA_RDT',
                    }),
                    trackerDataElement({
                        key: DE.outcome,
                        name: 'Cholera outcome',
                        optionSetKey: 'CHOLERA_OUTCOME',
                    }),
                    trackerDataElement({
                        key: DE.onset,
                        name: 'Days from symptom onset to consultation',
                        valueType: 'INTEGER_ZERO_OR_POSITIVE',
                    }),
                ],
                programIndicators: [
                    programIndicator({
                        key: PI,
                        name: 'Suspected cholera cases',
                        programKey: PROGRAM,
                        expression: 'V{event_count}',
                    }),
                ],
                legendSets: Object.values(legendSets),
            },
            program({
                key: PROGRAM,
                name: 'Cholera case surveillance',
                orgUnits: facilities,
                stages: [
                    {
                        key: STAGE,
                        // Event layer legends show the stage name
                        name: 'Suspected cholera case',
                        dataElements: [DE.rdt, DE.outcome, DE.onset],
                    },
                ],
            })
        ),

    data: (ctx, state) => ({
        tracker: {
            programs: [id('program', PROGRAM)],
            events: generate(ctx, state).events,
        },
    }),

    content: (ctx, state) => {
        const { places } = generate(ctx, state)
        const chiefdomName = (chiefdomId) =>
            state.chiefdoms.find((c) => c.id === chiefdomId)?.name
        const programId = id('program', PROGRAM)
        const stageId = id('programStage', STAGE)
        // Every layer selects the cluster's chiefdom only, so the map opens on
        // its streets
        const cluster = [places.cluster.chiefdomId]
        const rings = map({
            key: 'post03_rings',
            post: 3,
            title: 'Drawing the ring around cholera',
            description: `Households of suspected cholera cases in ${chiefdomName(
                places.cluster.chiefdomId
            )}: cases of the last 14 days by days from symptom onset to consultation, and 150 m rings around the RDT-positive ones of the last 7 days.`,
            basemap: 'openStreetMap',
            // Cases on top, so the rings don't tint their colours
            layers: [
                eventLayer({
                    name: 'Active rings, RDT positive',
                    programId,
                    stageId,
                    periods: ['LAST_7_DAYS'],
                    orgUnits: cluster,
                    filters: [
                        {
                            dataElement: id('dataElement', DE.rdt),
                            filter: 'IN:POSITIVE',
                        },
                    ],
                    styleDataItem: styleByOptions(DE.outcome, options.outcome),
                    radius: 3,
                    areaRadius: RING_METRES,
                }),
                eventLayer({
                    name: 'Suspected cases, last 14 days',
                    programId,
                    stageId,
                    periods: ['LAST_14_DAYS'],
                    orgUnits: cluster,
                    styleDataItem: styleByNumber(
                        DE.onset,
                        'INTEGER_ZERO_OR_POSITIVE'
                    ),
                    legendSet: legendSets.onset.id,
                    radius: 5,
                }),
            ],
        })
        // The districts of the cluster, the new focus and the earlier wave
        const area = [
            ...new Set(
                Object.values(places).map(
                    ({ facilities }) => facilities[0].districtId
                )
            ),
        ]
        const country = map({
            key: 'post03_chiefdoms',
            post: 3,
            title: 'Suspected cholera cases by chiefdom, last 7 days',
            description:
                'Suspected cholera cases of the last 7 days by chiefdom: two or more in a chiefdom meet the GTFCC definition of a suspected outbreak.',
            layers: [
                boundaryLayer({
                    name: 'Chiefdoms',
                    orgUnits: [...area, 'LEVEL-3'],
                    color: '#bdbdbd',
                }),
                thematicLayer({
                    name: 'Suspected cholera cases, last 7 days',
                    dataItem: {
                        id: id('programIndicator', PI),
                        dimensionItemType: 'PROGRAM_INDICATOR',
                    },
                    periods: ['LAST_7_DAYS'],
                    orgUnits: [...area, 'LEVEL-3'],
                    legendSet: legendSets.suspected.id,
                    labels: '{name}',
                }),
                boundaryLayer({
                    name: 'Districts',
                    orgUnits: area,
                    color: '#252525',
                    labels: '{name}',
                }),
            ],
        })
        const grouped = map({
            key: 'post03_grouped',
            post: 3,
            title: 'Suspected cholera cases, last 60 days, grouped',
            description:
                'Suspected cholera cases of the last 60 days, grouped where they are close: each group shows its share of RDT results.',
            layers: [
                eventLayer({
                    name: 'Suspected cases by RDT result',
                    programId,
                    stageId,
                    periods: ['LAST_60_DAYS'],
                    orgUnits: area,
                    styleDataItem: styleByOptions(DE.rdt, options.rdt),
                    clustering: true,
                }),
                boundaryLayer({
                    name: 'Districts',
                    orgUnits: area,
                    color: '#252525',
                    labels: '{name}',
                }),
            ],
        })
        // From the overview to the streets of the cluster
        const maps = [country, grouped, rings]
        return {
            maps: maps.map((m) => ({
                map: m,
                teams: ['surveillance'],
            })),
            dashboards: [
                dashboard({
                    key: 'post03',
                    post: 3,
                    title: 'Cholera response',
                    maps,
                }),
            ],
            interpretations: [
                {
                    map: rings.id,
                    author: 'surveillance_lead',
                    text: `Overlapping rings in ${chiefdomName(
                        places.cluster.chiefdomId
                    )}: one village-level response there today. ${chiefdomName(
                        places.focus.chiefdomId
                    )} has two RDT-positive cases and no earlier ones, a new focus and today's first team. ${chiefdomName(
                        places.earlier.chiefdomId
                    )} has had no case for a week. About a third of the cases have no household coordinates; @show_tracing_supervisor please start from the facility line lists for those.`,
                    comments: [
                        {
                            author: 'tracing_supervisor',
                            text: `Team 2 leaves for ${chiefdomName(
                                places.focus.chiefdomId
                            )} at 9:00 with ORS, chlorine and the line list.`,
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx, state) => {
        const places = pickPlaces(state.facilities, state.points)
        const pi = id('programIndicator', PI)
        const programId = id('program', PROGRAM)
        const start = isoDate(addDays(ctx.runDate, -OUTBREAK_DAYS))
        const end = isoDate(ctx.runDate)
        const stageId = id('programStage', STAGE)
        return [
            {
                name: 'Most cases come within a day of symptom onset',
                path: `/api/analytics/events/aggregate/${programId}?stage=${stageId}&dimension=${stageId}.${id(
                    'dataElement',
                    DE.onset
                )}&filter=ou:${Object.values(DISTRICTS).join(
                    ';'
                )}&filter=pe:LAST_60_DAYS`,
                evaluate: (rows, { headers }) => {
                    const days = headers.findIndex((h) => h.name !== 'value')
                    const value = headers.findIndex((h) => h.name === 'value')
                    const total = rows.reduce((s, r) => s + Number(r[value]), 0)
                    const early = rows
                        .filter((r) => Number(r[days]) <= 1)
                        .reduce((s, r) => s + Number(r[value]), 0)
                    return {
                        ok: total > 0 && early / total >= 0.5,
                        detail: `${early} of ${total} cases within a day of onset`,
                    }
                },
            },
            {
                name: 'The cluster is red, the new focus has cases, the earlier wave has stopped',
                path: `/api/analytics?dimension=dx:${pi}&dimension=ou:${places.cluster.chiefdomId};${places.focus.chiefdomId};${places.earlier.chiefdomId}&filter=pe:LAST_7_DAYS&skipMeta=true`,
                evaluate: (rows) => {
                    const v = Object.fromEntries(
                        rows.map(([, ou, value]) => [ou, Number(value)])
                    )
                    const cluster = v[places.cluster.chiefdomId]
                    const focus = v[places.focus.chiefdomId]
                    const earlier = v[places.earlier.chiefdomId]
                    return {
                        ok: cluster >= 2 && focus >= 1 && !earlier,
                        detail: `cluster ${cluster}, focus ${focus}, earlier wave ${
                            earlier ?? 0
                        } in the last 7 days`,
                    }
                },
            },
            {
                name: 'About 30% of the cases have no household coordinates',
                path: `/api/analytics/events/query/${programId}?dimension=ou:${Object.values(
                    DISTRICTS
                ).join(';')}&stage=${id(
                    'programStage',
                    STAGE
                )}&startDate=${start}&endDate=${end}&paging=false&skipMeta=true`,
                evaluate: (rows, { headers }) => {
                    // Events without geometry come back with longitude 0.0
                    const geometry = headers.findIndex(
                        (h) => h.name === 'geometry'
                    )
                    const without = rows.filter((row) => !row[geometry]).length
                    const share = without / rows.length
                    return {
                        ok: share >= 0.2 && share <= 0.4,
                        detail: `${without} of ${rows.length} cases without coordinates`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate, pickPlaces }
