// Post 3 · Drawing the ring around cholera: suspected cholera cases with
// household coordinates, 150 m rings around the RDT-positive ones.
const { loadFacilityPoints } = require('../shared/geometry.js')
const { legendSet } = require('../shared/legendSets.js')
const {
    dashboard,
    earthEngineLayer,
    eventLayer,
    map,
    thematicLayer,
} = require('../shared/maps.js')
const { PALETTE } = require('../shared/palette.js')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const {
    id,
    mergeParts,
    optionSet,
    point,
    program,
    programIndicator,
    trackerDataElement,
} = require('../shared/tracker.js')
const { addDays, isoDate } = require('../periods.js')
const { randomFor } = require('../random.js')

const PROGRAM = 'CHOLERA_CASES'
const STAGE = 'CHOLERA_CASE_REPORT'
const DE = { rdt: 'CHOLERA_RDT_RESULT', outcome: 'CHOLERA_OUTCOME' }
const PI = 'CHOLERA_SUSPECTED_CASES'
const BUILDINGS = 'GOOGLE/Research/open-buildings/v3/polygons'

const OUTBREAK_DAYS = 42
const WITHOUT_COORDINATES = 0.3
const RING_METRES = 150

const options = {
    rdt: optionSet({
        key: 'CHOLERA_RDT',
        name: 'Cholera RDT result',
        options: [
            { code: 'POSITIVE', name: 'Positive', color: PALETTE.act },
            { code: 'NEGATIVE', name: 'Negative', color: PALETTE.target },
            { code: 'NOT_DONE', name: 'Not done', color: PALETTE.noData },
        ],
    }),
    outcome: optionSet({
        key: 'CHOLERA_OUTCOME',
        name: 'Cholera outcome',
        options: [
            { code: 'ALIVE', name: 'Alive', color: PALETTE.watch },
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

// Households of the urban cluster sit around one point
const SPREAD_KM = { cluster: 0.6, earlier: 3, focus: 0.3 }

const generate = ({ runDate }, { facilities, points }) => {
    const places = pickPlaces(facilities, points)
    const events = []
    Object.entries(WAVES).forEach(([place, casesOn]) => {
        const { facilities: placeFacilities } = places[place]
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
                            value: r.chance(0.02) ? 'DEAD' : 'ALIVE',
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
        legends: [
            { name: '1 case', start: 1, end: 2, color: PALETTE.watch },
            {
                name: '2 or more: suspected outbreak',
                start: 2,
                end: 10000,
                color: PALETTE.act,
            },
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
                        name: 'Case report',
                        dataElements: [DE.rdt, DE.outcome],
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
        const [lon, lat] = state.points[places.cluster.facilities[0].id]
        const programId = id('program', PROGRAM)
        const stageId = id('programStage', STAGE)
        const rings = map({
            key: 'post03_rings',
            post: 3,
            title: 'Drawing the ring around cholera',
            description:
                'Suspected cholera cases in the last 7 days by chiefdom, recent cases, and 150 m rings around RDT-positive cases of the last 7 days.',
            view: { latitude: lat, longitude: lon, zoom: 14 },
            layers: [
                thematicLayer({
                    name: 'Suspected cholera cases, last 7 days',
                    dataItem: {
                        id: id('programIndicator', PI),
                        dimensionItemType: 'PROGRAM_INDICATOR',
                    },
                    periods: ['LAST_7_DAYS'],
                    level: 3,
                    legendSet: legendSets.suspected.id,
                    opacity: 0.5,
                }),
                earthEngineLayer({
                    name: 'Building footprints',
                    datasetId: BUILDINGS,
                    style: { color: '#FFA500', strokeWidth: 1 },
                    aggregations: ['count'],
                    orgUnits: [places.cluster.chiefdomId],
                }),
                eventLayer({
                    name: 'Recent cases',
                    programId,
                    stageId,
                    periods: ['LAST_14_DAYS'],
                    color: '#969696',
                    radius: 4,
                }),
                eventLayer({
                    name: 'Active rings',
                    programId,
                    stageId,
                    periods: ['LAST_7_DAYS'],
                    filters: [
                        {
                            dataElement: id('dataElement', DE.rdt),
                            filter: 'IN:POSITIVE',
                        },
                    ],
                    styleDataItem: {
                        id: id('dataElement', DE.outcome),
                        valueType: 'TEXT',
                        optionSet: { id: id('optionSet', 'CHOLERA_OUTCOME') },
                    },
                    areaRadius: RING_METRES,
                }),
            ],
        })
        return {
            maps: [{ map: rings, teams: ['surveillance'] }],
            dashboards: [
                dashboard({
                    key: 'post03',
                    post: 3,
                    title: 'Cholera response',
                    maps: [rings],
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
                    )} has had no case for a week. About a third of the cases have no household coordinates; @show_tracing_supervisor please start from the facility line lists for those. (Synthetic data)`,
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
        return [
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
