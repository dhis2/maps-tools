// Post 9 · One bite, two sectors: dog bites reported by health facilities,
// animal rabies investigations by veterinary officers, and dog vaccination
// coverage, on one map.
const fs = require('node:fs')
const path = require('node:path')
const { loadFacilityPoints } = require('../shared/geometry.js')
const { legendSet } = require('../shared/legendSets.js')
const {
    dashboard,
    eventLayer,
    map,
    thematicLayer,
} = require('../shared/maps.js')
const {
    dataElement,
    dataElementId,
    dataSet,
    dataSetId,
    indicator,
    indicatorId,
} = require('../shared/metadata.js')
const { PALETTE } = require('../shared/palette.js')
const { DEFAULT_COC, DISTRICTS } = require('../shared/sierraLeone.js')
const {
    id,
    mergeParts,
    optionSet,
    point,
    program,
    trackerDataElement,
} = require('../shared/tracker.js')
const { addDays, isoDate } = require('../periods.js')
const { randomFor } = require('../random.js')

const BITES = 'RABIES_BITES'
const BITE_STAGE = 'RABIES_BITE_ASSESSMENT'
const ANIMALS = 'RABIES_ANIMALS'
const ANIMAL_STAGE = 'RABIES_ANIMAL_INVESTIGATION'
const DE = {
    risk: 'RABIES_BITING_ANIMAL_RISK',
    result: 'RABIES_ANIMAL_TEST_RESULT',
    vaccinated: 'RABIES_DOGS_VACCINATED',
    dogs: 'RABIES_DOG_POPULATION',
}
const COVERAGE = 'RABIES_DOG_VACCINATION_COVERAGE'
const DATA_SET = 'RABIES_DOG_CAMPAIGN'

// WorldPop Global2 total population per district and year, from Post 5's
// Earth Engine snapshot
const POPULATION_FILE = path.join(
    __dirname,
    '..',
    'input',
    'sierra-leone',
    'emonc-coverage.json'
)
const districtPopulation = (year) => {
    const { values } = JSON.parse(fs.readFileSync(POPULATION_FILE, 'utf8'))
    return Object.fromEntries(
        Object.entries(values[year]).map(([district, { total }]) => [
            district,
            total,
        ])
    )
}

const DAYS = 365
const BACKGROUND_BITES = 360
// Dogs per person: a locally measured human-to-dog ratio of about 1:10
const DOGS_PER_PERSON = 0.1

const options = {
    risk: optionSet({
        key: 'RABIES_RISK',
        name: 'Biting animal risk assessment',
        options: [
            { code: 'SUSPECT', name: 'Suspect rabid', color: PALETTE.act },
            { code: 'HEALTHY', name: 'Healthy', color: PALETTE.target },
            { code: 'UNKNOWN', name: 'Unknown', color: PALETTE.noData },
        ],
    }),
    result: optionSet({
        key: 'RABIES_RESULT',
        name: 'Animal rabies test result',
        options: [
            { code: 'POSITIVE', name: 'Positive', color: PALETTE.check },
            { code: 'NEGATIVE', name: 'Negative', color: '#91bfdb' },
            { code: 'NOT_TESTED', name: 'Not tested', color: '#636363' },
        ],
    }),
}

// The chiefdoms of the three stories, each the busiest of its district
const STORY_DISTRICTS = {
    // High-risk bites, no animal investigation: veterinary follow-up missing
    uninvestigated: 'bombali',
    // Positive dogs, no bites reported: people not seeking care
    unreported: 'tonkolili',
    // Both, in the district below 70% dog vaccination
    hotspot: 'portLoko',
}
const LOW_COVERAGE_DISTRICT = 'portLoko'

const pickChiefdoms = (facilities, points) =>
    Object.fromEntries(
        Object.entries(STORY_DISTRICTS).map(([story, district]) => {
            const counts = {}
            facilities
                .filter(
                    (f) => f.districtId === DISTRICTS[district] && points[f.id]
                )
                .forEach((f) => {
                    counts[f.chiefdomId] = (counts[f.chiefdomId] || 0) + 1
                })
            const [chiefdomId] = Object.entries(counts).sort(
                ([a, x], [b, y]) => y - x || a.localeCompare(b)
            )[0]
            return [
                story,
                {
                    chiefdomId,
                    facilities: facilities.filter(
                        (f) => f.chiefdomId === chiefdomId && points[f.id]
                    ),
                },
            ]
        })
    )

const near = (random, [lon, lat], km) => {
    const angle = random.between(0, 2 * Math.PI)
    const distance = km * Math.sqrt(random.next())
    return [
        lon + (distance * Math.cos(angle)) / 109,
        lat + (distance * Math.sin(angle)) / 110.6,
    ]
}

const riskOf = (random) => {
    if (random.chance(0.15)) {
        return 'SUSPECT'
    }
    return random.chance(0.7) ? 'HEALTHY' : 'UNKNOWN'
}

const event = (
    programKey,
    stageKey,
    key,
    facility,
    date,
    location,
    de,
    value
) => ({
    event: id('event', `post9:${programKey}:${key}`),
    program: id('program', programKey),
    programStage: id('programStage', stageKey),
    orgUnit: facility.id,
    status: 'COMPLETED',
    occurredAt: isoDate(date),
    geometry: point(location),
    dataValues: [{ dataElement: id('dataElement', de), value }],
})

const generate = ({ runDate }, { facilities, points }) => {
    const stories = pickChiefdoms(facilities, points)
    const storyChiefdoms = new Set(
        Object.values(stories).map(({ chiefdomId }) => chiefdomId)
    )
    const background = facilities.filter(
        (f) => points[f.id] && !storyChiefdoms.has(f.chiefdomId)
    )
    const bites = []
    const animals = []

    // Bites across the country through the year; about 60% of suspect bites
    // lead to an animal investigation near the bite
    for (let n = 0; n < BACKGROUND_BITES; n++) {
        const r = randomFor('post9-bite', n)
        const facility = background[r.int(0, background.length - 1)]
        const date = addDays(runDate, -r.int(1, DAYS))
        const location = near(r, points[facility.id], 3)
        const risk = riskOf(r)
        bites.push(
            event(
                BITES,
                BITE_STAGE,
                `bite:${n}`,
                facility,
                date,
                location,
                DE.risk,
                risk
            )
        )
        if (risk === 'SUSPECT' && r.chance(0.6)) {
            animals.push(
                event(
                    ANIMALS,
                    ANIMAL_STAGE,
                    `animal:${n}`,
                    facility,
                    addDays(date, r.int(1, 4)),
                    near(r, location, 0.5),
                    DE.result,
                    r.chance(0.4) ? 'POSITIVE' : 'NEGATIVE'
                )
            )
        }
    }

    // The three stories, in the last 3 months
    const storyEvents = (story, count, make) => {
        const { facilities: list } = stories[story]
        for (let n = 0; n < count; n++) {
            const r = randomFor('post9', story, n)
            const facility = list[r.int(0, list.length - 1)]
            const date = addDays(runDate, -r.int(1, 80))
            make({
                r,
                n,
                facility,
                date,
                location: near(r, points[facility.id], 2),
            })
        }
    }
    storyEvents('uninvestigated', 8, ({ n, facility, date, location }) =>
        bites.push(
            event(
                BITES,
                BITE_STAGE,
                `uninvestigated:${n}`,
                facility,
                date,
                location,
                DE.risk,
                'SUSPECT'
            )
        )
    )
    storyEvents('unreported', 5, ({ n, facility, date, location }) =>
        animals.push(
            event(
                ANIMALS,
                ANIMAL_STAGE,
                `unreported:${n}`,
                facility,
                date,
                location,
                DE.result,
                'POSITIVE'
            )
        )
    )
    storyEvents('hotspot', 10, ({ r, n, facility, date, location }) => {
        bites.push(
            event(
                BITES,
                BITE_STAGE,
                `hotspot:${n}`,
                facility,
                date,
                location,
                DE.risk,
                'SUSPECT'
            )
        )
        if (n % 2 === 0) {
            animals.push(
                event(
                    ANIMALS,
                    ANIMAL_STAGE,
                    `hotspot:${n}`,
                    facility,
                    addDays(date, 2),
                    near(r, location, 0.5),
                    DE.result,
                    'POSITIVE'
                )
            )
        }
    })
    return { stories, bites, animals }
}

// Last campaign's coverage per district (%), Port Loko below 70
const campaignCoverage = (key) =>
    key === LOW_COVERAGE_DISTRICT
        ? 58
        : Math.round(randomFor('post9-coverage', key).between(72, 88))

const legendSets = {
    coverage: legendSet({
        key: 'DOG_VACCINATION_70',
        name: 'Showcase: dog vaccination coverage (WHO 70%)',
        legends: [
            { name: 'Below 70%', start: 0, end: 70, color: PALETTE.act },
            {
                name: '70% and above',
                start: 70,
                end: 100,
                color: PALETTE.target,
            },
        ],
    }),
}

const post = {
    number: 9,
    title: 'One bite, two sectors',
    eventAnalytics: true,

    prepare: async ({ client, orgUnits }) => ({
        facilities: orgUnits.facilities,
        chiefdoms: orgUnits.chiefdoms,
        districtName: (districtId) =>
            orgUnits.districts.find((d) => d.id === districtId)?.name,
        points: await loadFacilityPoints(client),
    }),

    metadata: ({ importerId }, { facilities }) =>
        mergeParts(
            {
                optionSets: [options.risk.optionSet, options.result.optionSet],
                options: [...options.risk.options, ...options.result.options],
                dataElements: [
                    trackerDataElement({
                        key: DE.risk,
                        name: 'Biting animal risk assessment',
                        optionSetKey: 'RABIES_RISK',
                    }),
                    trackerDataElement({
                        key: DE.result,
                        name: 'Animal rabies test result',
                        optionSetKey: 'RABIES_RESULT',
                    }),
                    dataElement({
                        key: DE.vaccinated,
                        name: 'Dogs vaccinated against rabies',
                    }),
                    dataElement({
                        key: DE.dogs,
                        name: 'Estimated dog population',
                        aggregationType: 'AVERAGE_SUM_ORG_UNIT',
                    }),
                ],
                dataSets: [
                    dataSet({
                        key: DATA_SET,
                        name: 'Dog vaccination campaign',
                        periodType: 'Yearly',
                        orgUnits: Object.values(DISTRICTS).map((d) => ({
                            id: d,
                        })),
                        dataElements: [DE.vaccinated, DE.dogs].map(
                            dataElementId
                        ),
                        importerId,
                    }),
                ],
                indicators: [
                    indicator({
                        key: COVERAGE,
                        name: 'Dog vaccination coverage',
                        type: 'percent',
                        numerator: `#{${dataElementId(DE.vaccinated)}}`,
                        denominator: `#{${dataElementId(DE.dogs)}}`,
                        description:
                            'Dogs vaccinated in the campaign over the estimated dog population.',
                        decimals: 0,
                    }),
                ],
                legendSets: Object.values(legendSets),
            },
            program({
                key: BITES,
                name: 'Animal bite case management',
                orgUnits: facilities,
                stages: [
                    {
                        key: BITE_STAGE,
                        name: 'Bite assessment',
                        dataElements: [DE.risk],
                    },
                ],
            }),
            program({
                key: ANIMALS,
                name: 'Animal rabies investigation',
                orgUnits: facilities,
                stages: [
                    {
                        key: ANIMAL_STAGE,
                        name: 'Animal investigation',
                        dataElements: [DE.result],
                    },
                ],
            })
        ),

    data: (ctx, state) => {
        const { bites, animals } = generate(ctx, state)
        const year = String(ctx.runDate.getUTCFullYear() - 1)
        const value = (key, orgUnit, v) => ({
            dataElement: dataElementId(key),
            orgUnit,
            period: year,
            categoryOptionCombo: DEFAULT_COC,
            attributeOptionCombo: DEFAULT_COC,
            value: String(v),
        })
        const population = districtPopulation(year)
        const campaign = Object.entries(DISTRICTS).flatMap(
            ([key, districtId]) => {
                const dogs = Math.round(
                    population[districtId] * DOGS_PER_PERSON
                )
                return [
                    value(DE.dogs, districtId, dogs),
                    value(
                        DE.vaccinated,
                        districtId,
                        Math.round((dogs * campaignCoverage(key)) / 100)
                    ),
                ]
            }
        )
        return {
            dataValueSets: [
                { dataSet: dataSetId(DATA_SET), dataValues: campaign },
            ],
            tracker: {
                programs: [id('program', BITES), id('program', ANIMALS)],
                events: [...bites, ...animals],
            },
        }
    },

    content: (ctx, state) => {
        const { stories } = generate(ctx, state)
        const chiefdomName = (chiefdomId) =>
            state.chiefdoms.find((c) => c.id === chiefdomId)?.name
        const rabies = map({
            key: 'post09_rabies',
            post: 9,
            title: 'One bite, two sectors',
            description:
                'Dog vaccination coverage of the last campaign by district, dog bites by risk of the biting animal, and animal rabies investigations by test result, last 3 months.',
            layers: [
                thematicLayer({
                    name: 'Dog vaccination coverage',
                    dataItem: {
                        id: indicatorId(COVERAGE),
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: ['LAST_YEAR'],
                    level: 2,
                    legendSet: legendSets.coverage.id,
                    opacity: 0.5,
                }),
                eventLayer({
                    name: 'Dog bites',
                    programId: id('program', BITES),
                    stageId: id('programStage', BITE_STAGE),
                    periods: ['LAST_3_MONTHS'],
                    styleDataItem: {
                        id: id('dataElement', DE.risk),
                        valueType: 'TEXT',
                        optionSet: { id: id('optionSet', 'RABIES_RISK') },
                    },
                    radius: 5,
                }),
                eventLayer({
                    name: 'Animal investigations',
                    programId: id('program', ANIMALS),
                    stageId: id('programStage', ANIMAL_STAGE),
                    periods: ['LAST_3_MONTHS'],
                    styleDataItem: {
                        id: id('dataElement', DE.result),
                        valueType: 'TEXT',
                        optionSet: { id: id('optionSet', 'RABIES_RESULT') },
                    },
                    radius: 8,
                }),
            ],
        })
        return {
            maps: [{ map: rabies, teams: ['oneHealth'] }],
            dashboards: [
                dashboard({
                    key: 'post09',
                    post: 9,
                    title: 'One Health, rabies',
                    maps: [rabies],
                }),
            ],
            interpretations: [
                {
                    map: rabies.id,
                    author: 'veterinary_officer',
                    text: `Suspect rabid dogs bit people in ${chiefdomName(
                        stories.uninvestigated.chiefdomId
                    )}, and we have investigated none of those animals yet. In ${chiefdomName(
                        stories.unreported.chiefdomId
                    )} we found positive dogs, but no bites were reported: @show_surveillance_lead can the health facilities there check access to post-exposure prophylaxis? ${state.districtName(
                        DISTRICTS[LOW_COVERAGE_DISTRICT]
                    )} has both and is below 70% dog vaccination: the committee proposes it for the next campaign. (Synthetic data)`,
                    comments: [
                        {
                            author: 'surveillance_lead',
                            text: `Agreed. PEP stock moves to ${chiefdomName(
                                stories.unreported.chiefdomId
                            )} this week and community health workers will ask about bites at home visits.`,
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx, state) => {
        const stories = pickChiefdoms(state.facilities, state.points)
        const chiefdoms = Object.values(stories)
            .map(({ chiefdomId }) => chiefdomId)
            .join(';')
        // No skipMeta: the events aggregate endpoint answers 500 with it
        const count = (programKey, stageKey, de) =>
            `/api/analytics/events/aggregate/${id(
                'program',
                programKey
            )}?stage=${id(
                'programStage',
                stageKey
            )}&dimension=ou:${chiefdoms}&dimension=${id(
                'programStage',
                stageKey
            )}.${id('dataElement', de)}&filter=pe:LAST_3_MONTHS`
        const byChiefdom = (rows, { headers }) => {
            const ou = headers.findIndex((h) => h.name === 'ou')
            const value = headers.findIndex((h) => h.name === 'value')
            const option = headers.findIndex(
                (h) => h.name !== 'ou' && h.name !== 'value'
            )
            const out = {}
            rows.forEach((row) => {
                out[row[ou]] = out[row[ou]] || {}
                out[row[ou]][row[option]] = Number(row[value])
            })
            return out
        }
        return [
            {
                name: 'Suspect bites without investigation, and in the hotspot',
                path: count(BITES, BITE_STAGE, DE.risk),
                evaluate: (rows, body) => {
                    const v = byChiefdom(rows, body)
                    const suspect = (story) =>
                        v[stories[story].chiefdomId]?.SUSPECT ?? 0
                    return {
                        ok:
                            suspect('uninvestigated') >= 5 &&
                            suspect('hotspot') >= 5 &&
                            suspect('unreported') === 0,
                        detail: `suspect bites: uninvestigated ${suspect(
                            'uninvestigated'
                        )}, hotspot ${suspect('hotspot')}, unreported ${suspect(
                            'unreported'
                        )}`,
                    }
                },
            },
            {
                name: 'Positive animals where no bites are reported, and in the hotspot',
                path: count(ANIMALS, ANIMAL_STAGE, DE.result),
                evaluate: (rows, body) => {
                    const v = byChiefdom(rows, body)
                    const positive = (story) =>
                        v[stories[story].chiefdomId]?.POSITIVE ?? 0
                    return {
                        ok:
                            positive('unreported') >= 3 &&
                            positive('hotspot') >= 3 &&
                            positive('uninvestigated') === 0,
                        detail: `positive animals: unreported ${positive(
                            'unreported'
                        )}, hotspot ${positive(
                            'hotspot'
                        )}, uninvestigated ${positive('uninvestigated')}`,
                    }
                },
            },
            {
                name: 'Port Loko is the one district below 70% dog vaccination',
                path: `/api/analytics?dimension=dx:${indicatorId(
                    COVERAGE
                )}&dimension=ou:${Object.values(DISTRICTS).join(
                    ';'
                )}&filter=pe:LAST_YEAR&skipMeta=true`,
                evaluate: (rows) => {
                    const below = rows.filter(([, , v]) => Number(v) < 70)
                    return {
                        ok:
                            below.length === 1 &&
                            below[0][1] === DISTRICTS[LOW_COVERAGE_DISTRICT],
                        detail: `${rows.length} districts, below 70%: ${below
                            .map(
                                ([, ou, v]) => `${state.districtName(ou)} ${v}%`
                            )
                            .join(', ')}`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate, pickChiefdoms }
