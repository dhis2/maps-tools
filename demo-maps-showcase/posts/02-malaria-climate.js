// Post 2 · Rain today, malaria next month: confirmed malaria cases generated
// from real CHIRPS rainfall one to two months earlier, next to the rain.
const { readClimate } = require('../shared/climate.js')
const { legendSet } = require('../shared/legendSets.js')
const {
    boundaryLayer,
    dashboard,
    earthEngineLayer,
    eeMonth,
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
const {
    districtPopulation,
    populationId,
    populationMetadata,
    populationValueSet,
} = require('../shared/population.js')
const { DEFAULT_COC, DISTRICTS } = require('../shared/sierraLeone.js')
const { lastMonths } = require('../periods.js')
const { randomFor } = require('../random.js')

const MONTHS = 36
const DE = {
    cases: 'MAL_CONFIRMED_CASES',
    rain: 'CLIM_PRECIPITATION_CHIRPS',
    temperature: 'CLIM_TEMPERATURE_ERA5',
}
const IND = { incidence: 'MAL_CONFIRMED_PER_1000' }
const MALARIA_DATA_SET = 'MAL_MONTHLY'
const CLIMATE_DATA_SET = 'CLIM_MONTHLY'

// Irrigated sugar cane around Magbass: cases rise in the dry season
const IRRIGATED_DISTRICT = 'tonkolili'

const monthId = (year, month) => `${year}${String(month).padStart(2, '0')}`
const monthsBefore = (id, n) => {
    const date = new Date(
        Date.UTC(Number(id.slice(0, 4)), Number(id.slice(4)) - 1 - n, 1)
    )
    return monthId(date.getUTCFullYear(), date.getUTCMonth() + 1)
}

// Transmission is limited to about 16-34 °C and peaks near 25 °C
const temperatureSuitability = (celsius) =>
    Math.max(0, 1 - ((celsius - 25) / 9) ** 2)

const meanNormal = (climate, districtId) =>
    Array.from({ length: 12 }, (_, i) =>
        climate.normal(districtId, i + 1)
    ).reduce((a, b) => a + b, 0) / 12

// Confirmed cases per 1,000 people in a month
const incidence = (climate, key, districtId, id) => {
    const base = randomFor('post2-base', key).between(6, 11)
    const noise = randomFor('post2', key, id).between(0.9, 1.1)
    const average = meanNormal(climate, districtId)
    if (key === IRRIGATED_DISTRICT) {
        const dryness = Math.max(0, 1 - climate.rain(districtId, id) / average)
        return base * (0.8 + 0.6 * dryness) * noise
    }
    const lagged =
        0.5 * climate.rain(districtId, monthsBefore(id, 1)) +
        0.5 * climate.rain(districtId, monthsBefore(id, 2))
    return (
        base *
        (0.3 + (0.9 * lagged) / average) *
        temperatureSuitability(climate.temperature(districtId, id)) *
        noise
    )
}

const generate = ({ runDate }, { facilities, climate, population }) => {
    const months = lastMonths(runDate, MONTHS)
    const latestYear = (year) =>
        population[year] ??
        population[Math.max(...Object.keys(population).map(Number))]
    const rows = []
    const climateRows = []
    Object.entries(DISTRICTS).forEach(([key, districtId]) => {
        const inDistrict = facilities.filter((f) => f.districtId === districtId)
        const weights = inDistrict.map((f) =>
            randomFor('post2-weight', f.id).between(0.3, 1.7)
        )
        const total = weights.reduce((a, b) => a + b, 0)
        months.forEach(({ id, year }) => {
            const cases =
                (incidence(climate, key, districtId, id) *
                    latestYear(year)[districtId]) /
                1000
            inDistrict.forEach((facility, i) => {
                const value = Math.round((cases * weights[i]) / total)
                if (value > 0) {
                    rows.push({ orgUnit: facility.id, period: id, value })
                }
            })
            climateRows.push({
                orgUnit: districtId,
                period: id,
                rain: climate.rain(districtId, id),
                temperature: climate.temperature(districtId, id),
            })
        })
    })
    return { months, rows, climateRows }
}

// The rainy season the maps show: July to September of the latest year the
// climate snapshot covers to September
const seasonYear = (climate) => {
    const year = Number(climate.lastMonth.slice(0, 4))
    return Number(climate.lastMonth.slice(4)) >= 9 ? year : year - 1
}

const legendSets = {
    incidence: legendSet({
        key: 'MALARIA_INCIDENCE_MONTHLY',
        name: 'Showcase: confirmed malaria cases per 1,000 per month',
        legends: [
            { name: 'Below 5', start: 0, end: 5, color: PALETTE.target },
            { name: '5 to 14.9', start: 5, end: 15, color: PALETTE.watch },
            { name: '15 and above', start: 15, end: 1000, color: PALETTE.act },
        ],
    }),
    rain: legendSet({
        key: 'MONTHLY_RAINFALL',
        name: 'Showcase: monthly rainfall (mm)',
        legends: [
            { name: 'Below 100 mm', start: 0, end: 100, color: '#c6dbef' },
            { name: '100 to 249 mm', start: 100, end: 250, color: '#6baed6' },
            { name: '250 to 399 mm', start: 250, end: 400, color: '#2171b5' },
            {
                name: '400 mm and above',
                start: 400,
                end: 5000,
                color: '#08306b',
            },
        ],
    }),
}

const post = {
    number: 2,
    title: 'Rain today, malaria next month',

    prepare: async ({ orgUnits }) => ({
        facilities: orgUnits.facilities,
        districtName: (id) => orgUnits.districts.find((d) => d.id === id)?.name,
        climate: readClimate(),
        population: districtPopulation(),
    }),

    metadata: ({ importerId }, { facilities }) => {
        const population = populationMetadata({ importerId })
        return {
            legendSets: Object.values(legendSets),
            dataElements: [
                dataElement({ key: DE.cases, name: 'Confirmed malaria cases' }),
                dataElement({
                    key: DE.rain,
                    name: 'Precipitation (CHIRPS)',
                    aggregationType: 'AVERAGE',
                }),
                dataElement({
                    key: DE.temperature,
                    name: 'Air temperature (ERA5-Land)',
                    aggregationType: 'AVERAGE',
                }),
                ...population.dataElements,
            ],
            dataSets: [
                dataSet({
                    key: MALARIA_DATA_SET,
                    name: 'Malaria monthly report',
                    periodType: 'Monthly',
                    orgUnits: facilities,
                    dataElements: [dataElementId(DE.cases)],
                    importerId,
                }),
                dataSet({
                    key: CLIMATE_DATA_SET,
                    name: 'Climate (CHIRPS and ERA5-Land)',
                    periodType: 'Monthly',
                    orgUnits: Object.values(DISTRICTS).map((id) => ({ id })),
                    dataElements: [DE.rain, DE.temperature].map(dataElementId),
                    importerId,
                }),
                ...population.dataSets,
            ],
            indicators: [
                indicator({
                    key: IND.incidence,
                    name: 'Confirmed malaria cases per 1,000 population',
                    type: 'perThousand',
                    numerator: `#{${dataElementId(DE.cases)}}`,
                    denominator: `#{${populationId}}`,
                    description:
                        'Confirmed malaria cases over the WorldPop Global2 population, per 1,000, in the period.',
                    decimals: 1,
                }),
            ],
        }
    },

    data: (ctx, state) => {
        const { rows, climateRows } = generate(ctx, state)
        const value = (key, orgUnit, period, v) => ({
            dataElement: dataElementId(key),
            orgUnit,
            period,
            categoryOptionCombo: DEFAULT_COC,
            attributeOptionCombo: DEFAULT_COC,
            value: String(v),
        })
        return {
            dataValueSets: [
                {
                    dataSet: dataSetId(MALARIA_DATA_SET),
                    dataValues: rows.map(({ orgUnit, period, value: v }) =>
                        value(DE.cases, orgUnit, period, v)
                    ),
                },
                {
                    dataSet: dataSetId(CLIMATE_DATA_SET),
                    dataValues: climateRows.flatMap(
                        ({ orgUnit, period, rain, temperature }) => [
                            value(DE.rain, orgUnit, period, rain),
                            value(DE.temperature, orgUnit, period, temperature),
                        ]
                    ),
                },
                populationValueSet(),
            ],
        }
    },

    content: (ctx, state) => {
        const year = seasonYear(state.climate)
        const season = [7, 8, 9].map((m) => monthId(year, m))
        const incidenceItem = {
            id: indicatorId(IND.incidence),
            dimensionItemType: 'INDICATOR',
        }
        const rainMap = map({
            key: 'post02_rain',
            post: 2,
            title: `Rain, July ${year}`,
            description: `CHIRPS rainfall and ERA5-Land air temperature in July ${year} by district, from Earth Engine.`,
            layers: [
                earthEngineLayer({
                    name: 'Precipitation monthly (CHIRPS)',
                    datasetId: 'UCSB-CHG/CHIRPS/MONTHLY/precipitation',
                    period: eeMonth(year, 7),
                    aggregations: ['mean'],
                    level: 2,
                }),
                earthEngineLayer({
                    name: 'Air temperature monthly (ERA5-Land)',
                    datasetId: 'ECMWF/ERA5_LAND/MONTHLY_AGGR/temperature_2m',
                    bands: 'temperature_2m',
                    period: eeMonth(year, 7),
                    aggregations: ['mean'],
                    level: 2,
                    opacity: 0.5,
                    hidden: true,
                }),
                boundaryLayer({
                    name: 'Districts',
                    level: 2,
                    labels: '{name}',
                }),
            ],
        })
        const casesMap = map({
            key: 'post02_cases',
            post: 2,
            title: `Confirmed malaria cases, July to September ${year}`,
            description:
                'Confirmed malaria cases per 1,000 population by district, one panel per month.',
            layers: [
                thematicLayer({
                    name: 'Confirmed malaria cases per 1,000 population',
                    dataItem: incidenceItem,
                    periods: season,
                    level: 2,
                    legendSet: legendSets.incidence.id,
                    renderingStrategy: 'SPLIT_BY_PERIOD',
                }),
            ],
        })
        const bothMap = map({
            key: 'post02_rain_and_cases',
            post: 2,
            title: `Rain and malaria cases, July to September ${year}`,
            description:
                'Confirmed malaria cases per 1,000 population (fill) and CHIRPS rainfall imported as data (bubbles) by district, one panel per month.',
            layers: [
                thematicLayer({
                    name: 'Confirmed malaria cases per 1,000 population',
                    dataItem: incidenceItem,
                    periods: season,
                    level: 2,
                    legendSet: legendSets.incidence.id,
                    renderingStrategy: 'SPLIT_BY_PERIOD',
                }),
                thematicLayer({
                    name: 'Precipitation (CHIRPS)',
                    dataItem: {
                        id: dataElementId(DE.rain),
                        dimensionItemType: 'DATA_ELEMENT',
                    },
                    periods: season,
                    level: 2,
                    legendSet: legendSets.rain.id,
                    renderingStrategy: 'SPLIT_BY_PERIOD',
                    bubble: true,
                    radiusLow: 4,
                    radiusHigh: 16,
                }),
            ],
        })
        const irrigated = state.districtName(DISTRICTS[IRRIGATED_DISTRICT])
        return {
            maps: [rainMap, casesMap, bothMap].map((m) => ({
                map: m,
                teams: ['surveillance'],
            })),
            dashboards: [
                dashboard({
                    key: 'post02',
                    post: 2,
                    title: 'Malaria and climate',
                    maps: [rainMap, casesMap, bothMap],
                }),
            ],
            interpretations: [
                {
                    map: bothMap.id,
                    author: 'surveillance_lead',
                    text: `Cases follow the rain by one to two months almost everywhere: the wettest districts in July are the darkest in August and September. ${irrigated} is the exception: cases are high in the dry months too. Irrigation around the sugar estate? @show_hmis_officer can we check testing and net distribution there before we change the chemoprevention calendar? (Synthetic data)`,
                    comments: [
                        {
                            author: 'hmis_officer',
                            text: `Testing rates in ${irrigated} are stable, so the cases are real. I'll add the irrigated chiefdoms to next season's net campaign list.`,
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx, state) => {
        const year = seasonYear(state.climate)
        const yearMonths = Array.from({ length: 12 }, (_, i) =>
            monthId(year, i + 1)
        ).filter((id) => id <= lastMonths(ctx.runDate, 1)[0].id)
        const peak = (values) =>
            Object.entries(values).sort((a, b) => b[1] - a[1])[0][0]
        return [
            {
                name: 'Cases peak one to two months after the rain, except in the irrigated district',
                path: `/api/analytics?dimension=dx:${indicatorId(
                    IND.incidence
                )}&dimension=ou:${Object.values(DISTRICTS).join(
                    ';'
                )}&dimension=pe:${yearMonths.join(';')}&skipMeta=true`,
                evaluate: (rows) => {
                    const results = Object.entries(DISTRICTS).map(
                        ([key, districtId]) => {
                            const cases = Object.fromEntries(
                                rows
                                    .filter(([, ou]) => ou === districtId)
                                    .map(([, , pe, v]) => [pe, Number(v)])
                            )
                            const rain = Object.fromEntries(
                                yearMonths.map((id) => [
                                    id,
                                    state.climate.rain(districtId, id),
                                ])
                            )
                            const lag =
                                Number(peak(cases).slice(4)) -
                                Number(peak(rain).slice(4))
                            return { key, lag, casesPeak: peak(cases) }
                        }
                    )
                    const following = results.filter(
                        ({ key, lag }) =>
                            key !== IRRIGATED_DISTRICT && lag >= 1 && lag <= 2
                    )
                    const irrigated = results.find(
                        ({ key }) => key === IRRIGATED_DISTRICT
                    )
                    const dryPeak = [1, 2, 3, 4, 5, 12].includes(
                        Number(irrigated.casesPeak.slice(4))
                    )
                    return {
                        ok: following.length >= 10 && dryPeak,
                        detail: `${following.length} of 12 districts peak 1-2 months after the rain; ${IRRIGATED_DISTRICT} peaks in ${irrigated.casesPeak}`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate, incidence, seasonYear }
