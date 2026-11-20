// Post 1 · Where are the unvaccinated? Penta1 coverage (access) and
// Penta1-Penta3 dropout (utilization) by district, in RED/REC categories.
const { loadFacilityPoints } = require('../shared/geometry.js')
const { legendSet } = require('../shared/legendSets.js')
const {
    boundaryLayer,
    dashboard,
    map,
    thematicLayer,
} = require('../shared/maps.js')
const { dataSet, dataSetId, indicator } = require('../shared/metadata.js')
const { facilitiesIn } = require('../shared/orgUnits.js')
const {
    DEFAULT_COC,
    DISTRICTS,
    POPULATION_UNDER_1,
} = require('../shared/sierraLeone.js')
const { lastMonths } = require('../periods.js')
const { randomFor } = require('../random.js')

// Sierra Leone demo database
const CHILD_HEALTH = 'BfMAe6Itzgt'
const PENTA1 = 'fClA2Erf6IO'
const PENTA3 = 'n6aMJNLdvep'
const FIXED_UNDER_1 = 'Prlt0C1RF0s'
const OUTREACH_UNDER_1 = 'V6L425pT3A0'
const PENTA1_COVERAGE = 'i7WSgSJpnfu'
const PENTA_DROPOUT = 'EdN7qlmI5FS'

const MONTHS = 24
const FIXED_SHARE = 0.7

// Coverage and dropout per district (%), away from the 90% and 10% cut-offs
// so noise keeps each district in its category. Western Area is above 100%:
// a denominator to check.
const PROFILES = {
    westernArea: { coverage: 108, dropout: 4 },
    bo: { coverage: 95, dropout: 5 },
    kenema: { coverage: 94, dropout: 6 },
    kono: { coverage: 93, dropout: 5 },
    bombali: { coverage: 96, dropout: 14 },
    moyamba: { coverage: 95, dropout: 16 },
    portLoko: { coverage: 94, dropout: 17 },
    kailahun: { coverage: 84, dropout: 5 },
    pujehun: { coverage: 75, dropout: 6 },
    tonkolili: { coverage: 85, dropout: 4 },
    koinadugu: { coverage: 72, dropout: 19 },
    kambia: { coverage: 83, dropout: 15 },
    bonthe: { coverage: 77, dropout: 14 },
}

// Recording errors: more Penta3 than Penta1 doses
const NEGATIVE_DROPOUT_DISTRICTS = ['bo', 'kenema', 'koinadugu']

const category = ({ coverage, dropout }) => {
    if (coverage >= 90) {
        return dropout < 10 ? 1 : 2
    }
    return dropout < 10 ? 3 : 4
}

const legendSets = {
    coverage: legendSet({
        key: 'PENTA1_COVERAGE',
        name: 'Showcase: Penta1 coverage (RED cut-offs)',
        // ColorBrewer RdBu, with purple for figures to check; light enough for
        // black district labels
        legends: [
            { name: 'Below 80%', start: 0, end: 80, color: '#d6604d' },
            { name: '80 to 89%', start: 80, end: 90, color: '#f4a582' },
            { name: '90 to 100%', start: 90, end: 100, color: '#92c5de' },
            {
                name: 'Above 100% (check)',
                start: 100,
                end: 1000,
                color: '#9970ab',
            },
        ],
    }),
    category: legendSet({
        key: 'RED_REC_CATEGORY',
        name: 'Showcase: RED/REC category',
        // ColorBrewer RdYlBu, with purple for figures to check
        legends: [
            {
                name: '0: over 100%, check',
                start: 0,
                end: 1,
                color: '#9970ab',
            },
            { name: '1: no problem', start: 1, end: 2, color: '#91bfdb' },
            { name: '2: utilization', start: 2, end: 3, color: '#fee090' },
            { name: '3: access', start: 3, end: 4, color: '#fc8d59' },
            { name: '4: access and use', start: 4, end: 5, color: '#d73027' },
        ],
    }),
    dropout: legendSet({
        key: 'PENTA_DROPOUT_FACILITY',
        name: 'Showcase: Penta1 to Penta3 dropout by facility',
        // ColorBrewer RdYlBu, red where defaulters are most
        legends: [
            {
                name: 'Below 0% (check)',
                start: -100,
                end: 0,
                color: '#9970ab',
            },
            { name: '0 to 9.9%', start: 0, end: 10, color: '#4575b4' },
            { name: '10 to 14.9%', start: 10, end: 15, color: '#fee090' },
            { name: '15 to 19.9%', start: 15, end: 20, color: '#fc8d59' },
            { name: '20% and above', start: 20, end: 100, color: '#d73027' },
        ],
    }),
}

// Child Health uses the Implementing Partner attribute combo, but the demo's
// Penta values sit in the default one, and the importer refuses that for
// Child Health. Importing through a data set with the default combo
// overwrites the demo's values instead of adding to them.
const IMPORT_DATA_SET = 'EPI_IMPORT'

const importDataSet = (facilities, importerId) =>
    dataSet({
        key: IMPORT_DATA_SET,
        name: 'Showcase: EPI doses (synthetic data import)',
        periodType: 'Monthly',
        orgUnits: facilities,
        dataElements: [PENTA1, PENTA3],
        importerId,
    })

const missedIndicator = indicator({
    key: 'EPI_MISSED_PENTA1',
    name: 'Children who missed Penta1',
    type: 'number',
    numerator: `#{${POPULATION_UNDER_1}}-(#{${PENTA1}.${FIXED_UNDER_1}}+#{${PENTA1}.${OUTREACH_UNDER_1}})`,
    denominator: '1',
    description:
        'Surviving infants (total population under 1 year) minus Penta1 doses given under 1 year.',
    decimals: 0,
})

const PENTA1_UNDER_1 = `(#{${PENTA1}.${FIXED_UNDER_1}}+#{${PENTA1}.${OUTREACH_UNDER_1}})`
const PENTA3_UNDER_1 = `(#{${PENTA3}.${FIXED_UNDER_1}}+#{${PENTA3}.${OUTREACH_UNDER_1}})`
const LOW_DROPOUT = `(${PENTA1_UNDER_1}-${PENTA3_UNDER_1})/${PENTA1_UNDER_1} < 0.1`

const PENTA1_COVERAGE_RATIO = `${PENTA1_UNDER_1}/#{${POPULATION_UNDER_1}}`

// The category follows the same 90% and 10% cut-offs as category() below;
// 0 flags coverage above 100%, a denominator to check
const categoryIndicator = indicator({
    key: 'EPI_RED_REC_CATEGORY',
    name: 'RED/REC category (Penta)',
    type: 'number',
    numerator: `if(${PENTA1_COVERAGE_RATIO} > 1, 0, if(${PENTA1_COVERAGE_RATIO} >= 0.9, if(${LOW_DROPOUT}, 1, 2), if(${LOW_DROPOUT}, 3, 4)))`,
    denominator: '1',
    description:
        '0: coverage above 100%, check the denominator. 1: coverage 90% or more and dropout below 10%. 2: dropout 10% or more. 3: coverage below 90%. 4: both.',
    decimals: 0,
})

const prepare = async ({ client, orgUnits }) => {
    const { organisationUnits } = await client.get(
        `/api/dataSets/${CHILD_HEALTH}?fields=organisationUnits[id]`
    )
    const assigned = new Set(organisationUnits.map(({ id }) => id))
    const { dataValues = [] } = await client.get(
        `/api/dataValueSets?dataElement=${POPULATION_UNDER_1}&orgUnit=${orgUnits.districts
            .map(({ id }) => id)
            .join(
                '&orgUnit='
            )}&children=true&startDate=2000-01-01&endDate=2100-12-31`
    )
    const population = {}
    dataValues.forEach(({ orgUnit, period, value }) => {
        population[orgUnit] = population[orgUnit] || {}
        population[orgUnit][period] = Number(value)
    })
    return {
        facilities: orgUnits.facilities.filter(({ id }) => assigned.has(id)),
        population,
        points: await loadFacilityPoints(client),
    }
}

const latestYearUpTo = (byYear, year) =>
    Object.keys(byYear)
        .map(Number)
        .filter((y) => y <= year)
        .sort((a, b) => b - a)[0]

const populationOf = (population, orgUnitId, year) => {
    const byYear = population[orgUnitId]
    if (!byYear) {
        return undefined
    }
    const y = byYear[year] === undefined ? latestYearUpTo(byYear, year) : year
    return y === undefined ? undefined : byYear[y]
}

// Each facility keeps its own dropout level, so a district's facilities
// rank on the map; monthly noise comes on top
const FACILITY_SPREAD = 8
const MONTHLY_NOISE = 3

const generateDistrict = ({
    key,
    districtId,
    facilities,
    population,
    points,
    months,
}) => {
    const profile = PROFILES[key]
    const inDistrict = facilities.filter((f) => f.districtId === districtId)
    const latestYear = months[months.length - 1].year
    // Doses follow each facility's population, so chiefdom coverage stays
    // near the district's; facilities without a population value get none
    const weights = inDistrict.map(
        (f) => populationOf(population, f.id, latestYear) ?? 0
    )
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    // With a point, so the facility maps show it
    const negativeFacility = NEGATIVE_DROPOUT_DISTRICTS.includes(key)
        ? inDistrict.find((f) => population[f.id] && (!points || points[f.id]))
              ?.id
        : undefined
    const offsets = inDistrict.map((f) =>
        randomFor('post1-dropout', f.id).between(
            -FACILITY_SPREAD,
            FACILITY_SPREAD
        )
    )

    const doses = []
    months.forEach((month) => {
        const districtPopulation = inDistrict.reduce(
            (sum, f) => sum + (populationOf(population, f.id, month.year) ?? 0),
            0
        )
        const season =
            1 + 0.06 * Math.sin((2 * Math.PI * (month.month - 1)) / 12)
        const districtDoses =
            ((profile.coverage / 100) * districtPopulation * season) / 12

        inDistrict.forEach((facility, i) => {
            const random = randomFor('post1', facility.id, month.id)
            const penta1 = Math.round(
                (districtDoses * weights[i] * random.between(0.85, 1.15)) /
                    totalWeight
            )
            const dropout =
                facility.id === negativeFacility
                    ? -random.between(0.05, 0.1)
                    : Math.max(
                          0.005,
                          (profile.dropout +
                              offsets[i] +
                              random.between(-MONTHLY_NOISE, MONTHLY_NOISE)) /
                              100
                      )
            doses.push({
                orgUnit: facility.id,
                districtId,
                period: month.id,
                year: month.year,
                penta1,
                penta3: Math.round(penta1 * (1 - dropout)),
            })
        })
    })
    return { doses, negativeFacility }
}

const generate = ({ runDate }, { facilities, population, points }) => {
    const months = lastMonths(runDate, MONTHS)
    const results = Object.entries(DISTRICTS).map(([key, districtId]) =>
        generateDistrict({
            key,
            districtId,
            facilities,
            population,
            points,
            months,
        })
    )
    return {
        months,
        doses: results.flatMap(({ doses }) => doses),
        negativeFacilities: results
            .map(({ negativeFacility }) => negativeFacility)
            .filter(Boolean),
    }
}

const splitLocation = (dataElement, orgUnit, period, total) => {
    const fixed = Math.round(total * FIXED_SHARE)
    return [
        { coc: FIXED_UNDER_1, value: fixed },
        { coc: OUTREACH_UNDER_1, value: total - fixed },
    ]
        .filter(({ value }) => value > 0)
        .map(({ coc, value }) => ({
            dataElement,
            orgUnit,
            period,
            categoryOptionCombo: coc,
            attributeOptionCombo: DEFAULT_COC,
            value: String(value),
        }))
}

// Coverage and dropout per district over the last 12 months of generated
// data, as analytics will compute them
const summarize = (generated, population, facilities) => {
    const last12 = new Set(generated.months.slice(-12).map(({ id }) => id))
    const years = generated.months.slice(-12).map(({ year }) => year)
    return Object.fromEntries(
        Object.entries(DISTRICTS).map(([key, districtId]) => {
            const rows = generated.doses.filter(
                (d) => d.districtId === districtId && last12.has(d.period)
            )
            const penta1 = rows.reduce((sum, d) => sum + d.penta1, 0)
            const penta3 = rows.reduce((sum, d) => sum + d.penta3, 0)
            const inDistrict = facilitiesIn({ facilities }, districtId)
            const meanPopulation =
                years.reduce(
                    (sum, year) =>
                        sum +
                        inDistrict.reduce(
                            (s, f) =>
                                s + (populationOf(population, f.id, year) ?? 0),
                            0
                        ),
                    0
                ) / years.length
            const coverage = (100 * penta1) / meanPopulation
            const dropout = (100 * (penta1 - penta3)) / penta1
            return [key, { districtId, coverage, dropout }]
        })
    )
}

// The facilities with the highest dropout in a district, last 12 months,
// among those with a point, so the map shows them
const highestDropout = (
    generated,
    districtId,
    { facilities, points },
    count
) => {
    const last12 = new Set(generated.months.slice(-12).map(({ id }) => id))
    const totals = {}
    generated.doses
        .filter((d) => d.districtId === districtId && last12.has(d.period))
        .forEach(({ orgUnit, penta1, penta3 }) => {
            totals[orgUnit] = totals[orgUnit] || { penta1: 0, penta3: 0 }
            totals[orgUnit].penta1 += penta1
            totals[orgUnit].penta3 += penta3
        })
    return Object.entries(totals)
        .filter(([id, t]) => t.penta1 >= 20 && points[id])
        .map(([id, t]) => ({ id, dropout: (t.penta1 - t.penta3) / t.penta1 }))
        .sort((a, b) => b.dropout - a.dropout)
        .slice(0, count)
        .map(({ id }) => facilities.find((f) => f.id === id).name)
}

const MAP_KEY = 'post01_red_rec'

const post = {
    number: 1,
    title: 'Where are the unvaccinated?',

    prepare,

    metadata: ({ importerId }, { facilities }) => ({
        legendSets: Object.values(legendSets),
        indicators: [missedIndicator, categoryIndicator],
        dataSets: [importDataSet(facilities, importerId)],
    }),

    data: (ctx, state) => {
        const { doses } = generate(ctx, state)
        // Facilities without doses lose the values earlier runs gave them
        const withoutDoses = doses
            .filter(({ penta1 }) => penta1 === 0)
            .flatMap(({ orgUnit, period }) =>
                [PENTA1, PENTA3].flatMap((dataElement) =>
                    [FIXED_UNDER_1, OUTREACH_UNDER_1].map((coc) => ({
                        dataElement,
                        orgUnit,
                        period,
                        categoryOptionCombo: coc,
                        attributeOptionCombo: DEFAULT_COC,
                    }))
                )
            )
        return {
            dataValueSets: [
                {
                    dataSet: dataSetId(IMPORT_DATA_SET),
                    dataValues: doses.flatMap(
                        ({ orgUnit, period, penta1, penta3 }) => [
                            ...splitLocation(PENTA1, orgUnit, period, penta1),
                            ...splitLocation(PENTA3, orgUnit, period, penta3),
                        ]
                    ),
                },
                {
                    dataSet: dataSetId(IMPORT_DATA_SET),
                    importStrategy: 'DELETE',
                    dataValues: withoutDoses,
                },
            ],
        }
    },

    content: (ctx, state) => {
        const generated = generate(ctx, state)
        const summary = summarize(generated, state.population, state.facilities)
        const koinadugu = summary.koinadugu
        const worst = highestDropout(generated, DISTRICTS.koinadugu, state, 3)
        const koinaduguName = ctx.districtName(DISTRICTS.koinadugu)

        const redRec = map({
            key: MAP_KEY,
            post: 1,
            title: 'Where are the unvaccinated?',
            description:
                'RED/REC category of each district, last 12 months: Penta1 coverage (access) and Penta1 to Penta3 dropout (utilization) against 90% and 10%.',
            layers: [
                thematicLayer({
                    name: 'RED/REC category',
                    dataItem: {
                        id: categoryIndicator.id,
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: ['LAST_12_MONTHS'],
                    level: 2,
                    legendSet: legendSets.category.id,
                    labels: '{name}',
                    labelColor: '#000000',
                }),
            ],
        })
        const coverage = map({
            key: 'post01_coverage',
            post: 1,
            title: 'Penta1 coverage by chiefdom',
            description:
                'Penta1 coverage of children under 1 by chiefdom, last 12 months: pockets inside each district.',
            layers: [
                thematicLayer({
                    name: 'Penta1 coverage <1y',
                    dataItem: {
                        id: PENTA1_COVERAGE,
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: ['LAST_12_MONTHS'],
                    level: 3,
                    legendSet: legendSets.coverage.id,
                }),
                boundaryLayer({
                    name: 'Districts',
                    level: 2,
                    color: '#252525',
                    labels: '{name}',
                    labelColor: '#000000',
                }),
            ],
        })

        const dropoutMap = map({
            key: 'post01_koinadugu',
            post: 1,
            title: `Dropout by facility in ${koinaduguName}`,
            description: `Penta1 to Penta3 dropout of each facility in ${koinaduguName}, last 12 months: where defaulter tracing starts.`,
            // Chiefdoms on top, so the points don't cover their names
            layers: [
                thematicLayer({
                    name: 'Penta1 to Penta3 dropout',
                    dataItem: {
                        id: PENTA_DROPOUT,
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: ['LAST_12_MONTHS'],
                    orgUnits: [DISTRICTS.koinadugu, 'LEVEL-4'],
                    legendSet: legendSets.dropout.id,
                    radiusLow: 6,
                    opacity: 1,
                }),
                boundaryLayer({
                    name: 'Chiefdoms',
                    orgUnits: [DISTRICTS.koinadugu, 'LEVEL-3'],
                    color: '#525252',
                    labels: '{name}',
                    labelColor: '#000000',
                }),
            ],
        })
        // The country, then the chiefdoms, then the district to act on
        const maps = [redRec, coverage, dropoutMap]

        return {
            maps: maps.map((m) => ({ map: m, teams: ['epi'] })),
            dashboards: [
                dashboard({
                    key: 'post01',
                    post: 1,
                    title: 'Immunization',
                    maps,
                }),
            ],
            interpretations: [
                {
                    map: redRec.id,
                    author: 'epi_officer',
                    text: `${koinaduguName} is in RED/REC category 4: Penta1 coverage ${Math.round(
                        koinadugu.coverage
                    )}% and dropout ${Math.round(
                        koinadugu.dropout
                    )}% over the last 12 months. Drilling down, ${new Intl.ListFormat(
                        'en'
                    ).format(
                        worst
                    )} have the highest dropout. @show_facility_incharge please start defaulter tracing there; an extra outreach session goes into the district microplan.`,
                    comments: [
                        {
                            author: 'facility_incharge',
                            text: `Defaulter list printed for ${worst[0]}. Tracing starts this week, and the outreach session is booked for the next market day.`,
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx) => {
        const districts = Object.values(DISTRICTS).join(';')
        const expected = Object.fromEntries(
            Object.entries(PROFILES).map(([key, p]) => [
                DISTRICTS[key],
                { key, category: category(p), above100: p.coverage > 100 },
            ])
        )
        return [
            {
                name: 'Districts fall in all four RED/REC categories, as planned',
                path: `/api/analytics?dimension=dx:${PENTA1_COVERAGE};${PENTA_DROPOUT}&dimension=ou:${districts}&filter=pe:LAST_12_MONTHS&skipMeta=true`,
                evaluate: (rows) => {
                    const values = {}
                    rows.forEach(([dx, ou, value]) => {
                        values[ou] = values[ou] || {}
                        values[ou][
                            dx === PENTA1_COVERAGE ? 'coverage' : 'dropout'
                        ] = Number(value)
                    })
                    const wrong = Object.entries(expected).filter(
                        ([ou, e]) =>
                            !values[ou] ||
                            category(values[ou]) !== e.category ||
                            values[ou].coverage > 100 !== e.above100
                    )
                    return {
                        ok: wrong.length === 0,
                        detail: wrong.length
                            ? `Not as planned: ${wrong
                                  .map(
                                      ([ou, e]) =>
                                          `${ctx.districtName(
                                              ou
                                          )} (planned category ${
                                              e.category
                                          }, got ${JSON.stringify(values[ou])})`
                                  )
                                  .join('; ')}`
                            : 'All 13 districts in their planned category; Western Area above 100%',
                    }
                },
            },
            {
                name: 'At least two facilities have a negative dropout',
                path: `/api/analytics?dimension=dx:${PENTA_DROPOUT}&dimension=ou:${NEGATIVE_DROPOUT_DISTRICTS.map(
                    (key) => DISTRICTS[key]
                ).join(';')};LEVEL-4&filter=pe:LAST_12_MONTHS&skipMeta=true`,
                evaluate: (rows) => {
                    const negative = rows.filter(
                        ([, , value]) => Number(value) < 0
                    )
                    return {
                        ok: negative.length >= 2,
                        detail: `${negative.length} facilities below 0%`,
                    }
                },
            },
        ]
    },
}

module.exports = {
    ...post,
    // For tests
    PROFILES,
    category,
    generate,
    summarize,
}
