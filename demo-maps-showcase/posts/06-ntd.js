// Post 6 · Is 100% coverage too good to be true? School-age deworming
// coverage by chiefdom over three rounds, and the official school-age
// denominator against WorldPop Global2.
const fs = require('node:fs')
const path = require('node:path')
const { legendSet } = require('../shared/legendSets.js')
const {
    boundaryLayer,
    dashboard,
    earthEngineLayer,
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
const { DEFAULT_COC, DISTRICTS } = require('../shared/sierraLeone.js')
const { randomFor } = require('../random.js')

const WORLDPOP_FILE = path.join(
    __dirname,
    '..',
    'input',
    'sierra-leone',
    'worldpop-school-age.json'
)
const WORLDPOP_AGE_SEX = 'projects/wpgp-global2/assets/agesex_100m'
const SCHOOL_AGE_BANDS = ['f_05', 'f_10', 'm_05', 'm_10']

const ROUNDS = 3

const DE = {
    official: 'NTD_POP_SCHOOL_AGE',
    worldPop: 'NTD_POP_SCHOOL_AGE_WORLDPOP',
    treated: 'NTD_STH_TREATED_SCHOOL_AGE',
}
const IND = {
    coverage: 'NTD_STH_COVERAGE_SCHOOL_AGE',
    ratio: 'NTD_DENOMINATOR_RATIO',
}
const DATA_SET = 'NTD_MDA_YEARLY'

// The planted chiefdoms, one per story, picked in a district each
const PLANTED = {
    // Official denominator far below WorldPop: above 100% every round
    lowDenominator: { district: 'portLoko', ratio: 0.68 },
    // Official denominator far above WorldPop: looks low, isn't
    highDenominator: { district: 'kenema', ratio: 1.42 },
    // A partial round in the middle year
    partialRound: { district: 'bombali', ratio: 1 },
}

const plantedChiefdoms = (chiefdoms) =>
    Object.fromEntries(
        Object.entries(PLANTED).map(([story, { district }]) => [
            story,
            chiefdoms.find((c) => c.districtId === DISTRICTS[district]),
        ])
    )

// The last complete years, oldest first
const roundYears = (runDate) =>
    Array.from(
        { length: ROUNDS },
        (_, i) => runDate.getUTCFullYear() - ROUNDS + i
    )

const generate = ({ runDate }, { chiefdoms, worldPop }) => {
    const years = roundYears(runDate)
    const planted = plantedChiefdoms(chiefdoms)
    const storyOf = (id) =>
        Object.keys(planted).find((story) => planted[story]?.id === id)
    const rows = []
    chiefdoms.forEach((chiefdom) => {
        const story = storyOf(chiefdom.id)
        const random = randomFor('post6', chiefdom.id)
        // Coverage stays below 100% outside the planted chiefdoms, so the one
        // above 100% every round stands out
        const ratio = story ? PLANTED[story].ratio : random.between(0.95, 1.1)
        years.forEach((year, i) => {
            const people = worldPop[year]?.[chiefdom.id]
            if (!people) {
                return
            }
            const yearRandom = randomFor('post6', chiefdom.id, year)
            let trueCoverage = yearRandom.chance(0.08)
                ? yearRandom.between(0.55, 0.72)
                : yearRandom.between(0.78, 0.92)
            if (story === 'lowDenominator' || story === 'highDenominator') {
                trueCoverage = yearRandom.between(0.84, 0.9)
            }
            if (story === 'partialRound') {
                trueCoverage = i === 1 ? 0.35 : yearRandom.between(0.85, 0.92)
            }
            rows.push({
                orgUnit: chiefdom.id,
                year,
                worldPop: people,
                official: Math.round(people * ratio),
                treated: Math.round(people * trueCoverage),
            })
        })
    })
    return { years, rows, planted }
}

const legendSets = {
    coverage: legendSet({
        key: 'MDA_COVERAGE_75',
        name: 'Showcase: MDA coverage, 75% threshold',
        // ColorBrewer YlGn, orange for a round that stopped early, purple for
        // figures to check
        legends: [
            { name: 'Below 50%', start: 0, end: 50, color: '#fe9929' },
            { name: '50 to 64%', start: 50, end: 65, color: '#ffffcc' },
            { name: '65 to 74%', start: 65, end: 75, color: '#c2e699' },
            { name: '75 to 100%', start: 75, end: 100, color: '#31a354' },
            {
                name: 'Above 100% (check)',
                start: 100,
                end: 1000,
                color: '#7a0177',
            },
        ],
    }),
    ratio: legendSet({
        key: 'DENOMINATOR_RATIO',
        name: 'Showcase: official denominator over WorldPop',
        // ColorBrewer BrBG, diverging around agreement
        legends: [
            { name: 'Below 0.8 (low)', start: 0, end: 0.8, color: '#a6611a' },
            { name: '0.8 to 1.2', start: 0.8, end: 1.2, color: '#f5f5f5' },
            { name: 'Above 1.2 (high)', start: 1.2, end: 10, color: '#018571' },
        ],
    }),
}

const dataItem = (key) => ({
    id: indicatorId(key),
    dimensionItemType: 'INDICATOR',
})

const post = {
    number: 6,
    title: 'Is 100% coverage too good to be true?',

    prepare: async ({ orgUnits }) => {
        const { values } = JSON.parse(fs.readFileSync(WORLDPOP_FILE, 'utf8'))
        return {
            chiefdoms: orgUnits.chiefdoms,
            worldPop: values,
            districtName: (id) =>
                orgUnits.districts.find((d) => d.id === id)?.name,
        }
    },

    metadata: ({ importerId }, { chiefdoms }) => ({
        legendSets: Object.values(legendSets),
        dataElements: [
            dataElement({
                key: DE.official,
                name: 'School-age children 5-14 years (official estimate)',
                aggregationType: 'AVERAGE_SUM_ORG_UNIT',
            }),
            dataElement({
                key: DE.worldPop,
                name: 'School-age children 5-14 years (WorldPop Global2)',
                aggregationType: 'AVERAGE_SUM_ORG_UNIT',
                real: true,
            }),
            dataElement({
                key: DE.treated,
                name: 'STH MDA school-age children treated',
            }),
        ],
        dataSets: [
            dataSet({
                key: DATA_SET,
                name: 'NTD MDA yearly report',
                periodType: 'Yearly',
                orgUnits: chiefdoms,
                dataElements: Object.values(DE).map(dataElementId),
                importerId,
            }),
        ],
        indicators: [
            indicator({
                key: IND.coverage,
                name: 'STH MDA coverage, school-age children',
                type: 'percent',
                numerator: `#{${dataElementId(DE.treated)}}`,
                denominator: `#{${dataElementId(DE.official)}}`,
                description:
                    'School-age children treated over the official estimate of school-age children (therapeutic coverage).',
                decimals: 0,
            }),
            indicator({
                key: IND.ratio,
                name: 'School-age denominator over WorldPop',
                type: 'number',
                numerator: `#{${dataElementId(DE.official)}}`,
                denominator: `#{${dataElementId(DE.worldPop)}}`,
                description:
                    'Official estimate of school-age children over the WorldPop Global2 estimate for the same year.',
                decimals: 2,
            }),
        ],
    }),

    data: (ctx, state) => ({
        dataSet: dataSetId(DATA_SET),
        dataValues: generate(ctx, state).rows.flatMap(
            ({ orgUnit, year, worldPop, official, treated }) =>
                [
                    [DE.worldPop, worldPop],
                    [DE.official, official],
                    [DE.treated, treated],
                ].map(([key, value]) => ({
                    dataElement: dataElementId(key),
                    orgUnit,
                    period: String(year),
                    categoryOptionCombo: DEFAULT_COC,
                    attributeOptionCombo: DEFAULT_COC,
                    value: String(value),
                }))
        ),
    }),

    content: (ctx, state) => {
        const { years, rows, planted } = generate(ctx, state)
        const lastYear = years.at(-1)
        const coverageMap = map({
            key: 'post06_coverage',
            post: 6,
            title: 'Deworming coverage, last 3 rounds',
            description:
                'STH MDA coverage of school-age children by chiefdom, one panel per annual round.',
            layers: [
                thematicLayer({
                    name: 'STH MDA coverage',
                    dataItem: dataItem(IND.coverage),
                    // No relative period gives the last 3 years
                    periods: years.map(String),
                    level: 3,
                    legendSet: legendSets.coverage.id,
                    renderingStrategy: 'SPLIT_BY_PERIOD',
                }),
            ],
        })
        const denominatorMap = map({
            key: 'post06_denominator',
            post: 6,
            title: 'School-age denominator against WorldPop',
            description:
                'The official school-age estimate over WorldPop Global2 children aged 5 to 14, by chiefdom.',
            layers: [
                thematicLayer({
                    name: 'School-age denominator over WorldPop',
                    dataItem: dataItem(IND.ratio),
                    periods: ['LAST_YEAR'],
                    level: 3,
                    legendSet: legendSets.ratio.id,
                }),
            ],
        })
        // Where the school-age children of the low-denominator district live
        const low = planted.lowDenominator
        const lowDistrict = DISTRICTS[PLANTED.lowDenominator.district]
        const childrenMap = map({
            key: 'post06_children',
            post: 6,
            title: `School-age children around ${low.name}, WorldPop ${lastYear}`,
            description: `WorldPop Global2 children aged 5 to 14 per hectare in ${state.districtName(
                lowDistrict
            )}, by chiefdom: ${
                low.name
            }'s official estimate counts far fewer children than live there.`,
            layers: [
                earthEngineLayer({
                    name: 'Population age groups WorldPop Global2',
                    datasetId: WORLDPOP_AGE_SEX,
                    bands: SCHOOL_AGE_BANDS,
                    year: lastYear,
                    style: {
                        min: 0,
                        // Rural areas hold under 2 children per hectare
                        max: 2,
                        // ColorBrewer Purples
                        palette: [
                            '#f2f0f7',
                            '#cbc9e2',
                            '#9e9ac8',
                            '#756bb1',
                            '#54278f',
                        ],
                    },
                    orgUnits: [lowDistrict, 'LEVEL-3'],
                }),
                boundaryLayer({
                    name: 'Chiefdoms',
                    orgUnits: [lowDistrict, 'LEVEL-3'],
                    color: '#525252',
                    labels: '{name}',
                    labelColor: '#000000',
                }),
            ],
        })

        const ratioOf = (id) => {
            const row = rows.find(
                (r) => r.orgUnit === id && r.year === lastYear
            )
            return (row.official / row.worldPop).toFixed(2)
        }
        const high = planted.highDenominator
        // Coverage, the denominator behind it, then where the children live
        const maps = [coverageMap, denominatorMap, childrenMap]

        return {
            maps: maps.map((m) => ({ map: m, teams: ['ntd'] })),
            dashboards: [
                dashboard({
                    key: 'post06',
                    post: 6,
                    title: 'NTD denominators',
                    maps,
                }),
            ],
            interpretations: [
                {
                    map: denominatorMap.id,
                    author: 'ntd_manager',
                    text: `${
                        low.name
                    } reports above 100% in every round: its official school-age estimate is ${ratioOf(
                        low.id
                    )} of WorldPop's. ${
                        high.name
                    } looks below 65% coverage, but its estimate is ${ratioOf(
                        high.id
                    )} of WorldPop's. @show_hmis_officer can we check both against the school enrolment lists before the Joint Application Package?`,
                    comments: [
                        {
                            author: 'hmis_officer',
                            text: `${low.name}'s projection still uses the old census growth rate. I'll compare both chiefdoms with this year's enrolment lists.`,
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx, { chiefdoms }) => {
        const years = roundYears(ctx.runDate)
        const planted = plantedChiefdoms(chiefdoms)
        const values = (rows) => {
            const byKey = {}
            rows.forEach(([dx, ou, pe, value]) => {
                byKey[`${dx}:${ou}:${pe}`] = Number(value)
            })
            return byKey
        }
        const coverage = indicatorId(IND.coverage)
        const ratio = indicatorId(IND.ratio)
        const ids = Object.values(planted).map(({ id }) => id)
        return [
            {
                name: 'Planted chiefdoms show their stories',
                path: `/api/analytics?dimension=dx:${coverage};${ratio}&dimension=ou:${ids.join(
                    ';'
                )}&dimension=pe:${years.join(';')}&skipMeta=true`,
                evaluate: (rows) => {
                    const v = values(rows)
                    const cov = (story, i) =>
                        v[`${coverage}:${planted[story].id}:${years[i]}`]
                    const rat = (story) =>
                        v[`${ratio}:${planted[story].id}:${years.at(-1)}`]
                    const lowAbove100 = years.every(
                        (_, i) => cov('lowDenominator', i) > 100
                    )
                    const partial =
                        cov('partialRound', 1) < 75 &&
                        cov('partialRound', 0) >= 75 &&
                        cov('partialRound', 2) >= 75
                    const ok =
                        lowAbove100 &&
                        partial &&
                        rat('lowDenominator') < 0.8 &&
                        rat('highDenominator') > 1.2
                    return {
                        ok,
                        detail: Object.keys(planted)
                            .map(
                                (story) =>
                                    `${planted[story].name}: coverage ${years
                                        .map((_, i) => cov(story, i))
                                        .join('/')}, ratio ${rat(story)}`
                            )
                            .join('; '),
                    }
                },
            },
            {
                name: 'Only the low-denominator chiefdom reports above 100%',
                path: `/api/analytics?dimension=dx:${coverage}&dimension=ou:${Object.values(
                    DISTRICTS
                ).join(';')};LEVEL-3&dimension=pe:${years.join(
                    ';'
                )}&skipMeta=true`,
                evaluate: (rows) => {
                    const above = new Set(
                        rows
                            .filter(([, , , value]) => Number(value) > 100)
                            .map(([, ou]) => ou)
                    )
                    return {
                        ok:
                            above.size === 1 &&
                            above.has(planted.lowDenominator.id),
                        detail: `${above.size} chiefdoms above 100% in a round`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate }
