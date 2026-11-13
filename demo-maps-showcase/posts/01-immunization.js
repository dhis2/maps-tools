// Post 1 · Where are the unvaccinated? Penta1 coverage (access) and
// Penta1-Penta3 dropout (utilization) by district, in RED/REC categories.
const { PUBLIC_READ, code, dataSetSharing, uid } = require('../shared/ids.js')
const { legendSet } = require('../shared/legendSets.js')
const { dashboard, map, thematicLayer } = require('../shared/maps.js')
const { facilitiesIn } = require('../shared/orgUnits.js')
const { PALETTE } = require('../shared/palette.js')
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
const NUMBER_FACTOR_1 = 'JkWynlWMjJR'
const DEFAULT_CATEGORY_COMBO = 'bjDvmb4bfuf'

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
const NEGATIVE_DROPOUT_DISTRICTS = ['bo', 'kenema']

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
        legends: [
            { name: 'Below 80%', start: 0, end: 80, color: PALETTE.act },
            { name: '80 to 89%', start: 80, end: 90, color: PALETTE.watch },
            { name: '90 to 100%', start: 90, end: 100, color: PALETTE.target },
            {
                name: 'Above 100%: check the denominator',
                start: 100,
                end: 1000,
                color: PALETTE.check,
            },
        ],
    }),
    dropout: legendSet({
        key: 'PENTA_DROPOUT',
        name: 'Showcase: Penta1 to Penta3 dropout',
        // Bubbles are sized over the legend set's range, so it stays close to
        // the dropout values met in practice
        legends: [
            {
                name: 'Below 0%: data check',
                start: -50,
                end: 0,
                color: PALETTE.check,
            },
            { name: '0 to 9.9%', start: 0, end: 10, color: PALETTE.target },
            { name: '10% and above', start: 10, end: 50, color: PALETTE.act },
        ],
    }),
}

// Child Health uses the Implementing Partner attribute combo, but the demo's
// Penta values sit in the default one, and the importer refuses that for
// Child Health. Importing through a data set with the default combo
// overwrites the demo's values instead of adding to them.
const importDataSet = (facilities, importerId) => ({
    id: uid('dataSet:EPI_IMPORT'),
    code: code('DS_EPI_IMPORT'),
    name: 'Showcase: EPI doses (synthetic data import)',
    shortName: 'Showcase: EPI import',
    periodType: 'Monthly',
    categoryCombo: { id: DEFAULT_CATEGORY_COMBO },
    dataSetElements: [PENTA1, PENTA3].map((id) => ({
        dataElement: { id },
    })),
    organisationUnits: facilities.map(({ id }) => ({ id })),
    sharing: dataSetSharing(importerId),
})

const missedIndicator = {
    id: uid('indicator:EPI_MISSED_PENTA1'),
    code: code('EPI_MISSED_PENTA1'),
    name: 'Children who missed Penta1',
    shortName: 'Children who missed Penta1',
    decimals: 0,
    description:
        'Surviving infants (total population under 1 year) minus Penta1 doses given under 1 year.',
    indicatorType: { id: NUMBER_FACTOR_1 },
    numerator: `#{${POPULATION_UNDER_1}}-(#{${PENTA1}.${FIXED_UNDER_1}}+#{${PENTA1}.${OUTREACH_UNDER_1}})`,
    numeratorDescription: 'Surviving infants minus Penta1 doses',
    denominator: '1',
    denominatorDescription: 'One',
    annualized: false,
    sharing: PUBLIC_READ,
}

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

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
}

const generateDistrict = ({
    key,
    districtId,
    facilities,
    population,
    months,
}) => {
    const profile = PROFILES[key]
    const inDistrict = facilities.filter((f) => f.districtId === districtId)
    const latestYear = months[months.length - 1].year
    const known = inDistrict
        .map((f) => populationOf(population, f.id, latestYear))
        .filter((p) => p !== undefined)
    // Facilities without a population value still vaccinate: they get the
    // district's median weight, while the district target stays on the
    // population analytics will divide by
    const fallback = known.length ? median(known) : 1
    const weights = inDistrict.map(
        (f) => populationOf(population, f.id, latestYear) ?? fallback
    )
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    const negativeFacility = NEGATIVE_DROPOUT_DISTRICTS.includes(key)
        ? inDistrict.find((f) => population[f.id])?.id
        : undefined

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
                          random.between(
                              profile.dropout - 4,
                              profile.dropout + 4
                          ) / 100
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

const generate = ({ runDate }, { facilities, population }) => {
    const months = lastMonths(runDate, MONTHS)
    const results = Object.entries(DISTRICTS).map(([key, districtId]) =>
        generateDistrict({ key, districtId, facilities, population, months })
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

// The facilities with the highest dropout in a district, last 12 months
const highestDropout = (generated, districtId, facilities, count) => {
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
        .filter(([, t]) => t.penta1 >= 20)
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
        indicators: [missedIndicator],
        dataSets: [importDataSet(facilities, importerId)],
    }),

    data: (ctx, state) => ({
        dataSet: uid('dataSet:EPI_IMPORT'),
        dataValues: generate(ctx, state).doses.flatMap(
            ({ orgUnit, period, penta1, penta3 }) => [
                ...splitLocation(PENTA1, orgUnit, period, penta1),
                ...splitLocation(PENTA3, orgUnit, period, penta3),
            ]
        ),
    }),

    content: (ctx, state) => {
        const generated = generate(ctx, state)
        const summary = summarize(generated, state.population, state.facilities)
        const koinadugu = summary.koinadugu
        const worst = highestDropout(
            generated,
            DISTRICTS.koinadugu,
            state.facilities,
            3
        )
        const koinaduguName = ctx.districtName(DISTRICTS.koinadugu)

        const redRec = map({
            key: MAP_KEY,
            post: 1,
            title: 'Where are the unvaccinated?',
            description:
                'Penta1 coverage (fill) and Penta1 to Penta3 dropout (bubbles) by district for the last 12 months, read as RED/REC categories.',
            layers: [
                thematicLayer({
                    name: 'Penta1 coverage <1y',
                    dataItem: {
                        id: PENTA1_COVERAGE,
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: ['LAST_12_MONTHS'],
                    level: 2,
                    legendSet: legendSets.coverage.id,
                }),
                thematicLayer({
                    name: 'Penta1 to Penta3 dropout',
                    dataItem: {
                        id: PENTA_DROPOUT,
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: ['LAST_12_MONTHS'],
                    level: 2,
                    legendSet: legendSets.dropout.id,
                    bubble: true,
                    radiusLow: 5,
                    radiusHigh: 20,
                    // Labels of a bubble layer sit below the bubble, where
                    // they stay readable
                    labels: '{name}',
                }),
                thematicLayer({
                    name: 'Children who missed Penta1',
                    dataItem: {
                        id: missedIndicator.id,
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: ['LAST_12_MONTHS'],
                    level: 2,
                    colorScale: `#fee090,${PALETTE.watch},${PALETTE.act}`,
                    bubble: true,
                    hidden: true,
                }),
            ],
        })

        return {
            maps: [{ map: redRec, teams: ['epi'] }],
            dashboards: [
                dashboard({
                    key: 'post01',
                    post: 1,
                    title: 'Immunization',
                    maps: [redRec],
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
                    )} have the highest dropout. @show_facility_incharge please start defaulter tracing there; an extra outreach session goes into the district microplan. (Synthetic data)`,
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
