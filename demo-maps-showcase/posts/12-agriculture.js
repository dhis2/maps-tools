// Post 12 · Green fields, empty granaries? Rainfall since the start of the
// season against the 1991-2020 normal, vegetation from Earth Engine, and
// households assessed as food insecure every two weeks.
const { readClimate } = require('../shared/climate.js')
const { legendSet } = require('../shared/legendSets.js')
const {
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
const { CLASS_SCALES, PALETTE } = require('../shared/palette.js')
const { districtPopulation } = require('../shared/population.js')
const { DEFAULT_COC, DISTRICTS } = require('../shared/sierraLeone.js')
const { randomFor } = require('../random.js')

// Sierra Leone's main season: sowing from April, harvest from October
const SEASON_START = 4
const SEASON_END = 10
// August, during flowering, is the critical month for vegetation
const CRITICAL_MONTH = 8
// The latest year of MODIS landcover (MCD12Q1 v061) in Earth Engine
const LANDCOVER_YEAR = 2025
const DRY_SHARE = 0.7
const BIWEEKS = 26
const PEOPLE_PER_HOUSEHOLD = 5
const ASSESSED_SHARE = 0.02

const DE = {
    rain: 'AGR_RAIN_SEASON',
    normal: 'AGR_RAIN_SEASON_NORMAL',
    assessed: 'AGR_HH_ASSESSED',
    insecure: 'AGR_HH_FOOD_INSECURE',
}
const IND = { rainVsNormal: 'AGR_RAIN_PCT_NORMAL' }
const RAIN_DATA_SET = 'AGR_SEASON_RAIN'
const FOOD_DATA_SET = 'AGR_FOOD_ASSESSMENT'

// The season the map shows: the latest year the climate snapshot has
// rainfall for from April
const seasonOf = (climate) => {
    const lastYear = Number(climate.lastMonth.slice(0, 4))
    const lastMonth = Number(climate.lastMonth.slice(4))
    const year = lastMonth >= SEASON_START ? lastYear : lastYear - 1
    const end = year === lastYear ? Math.min(lastMonth, SEASON_END) : SEASON_END
    const months = []
    for (let m = SEASON_START; m <= end; m++) {
        months.push(m)
    }
    return { year, months }
}

// Rainfall since the start of the season and its normal, per district. The
// driest district is planted below 75% of normal if real rain wasn't that low.
const seasonRain = (climate) => {
    const { year, months } = seasonOf(climate)
    const sums = Object.entries(DISTRICTS).map(([key, districtId]) => {
        const rain = months.reduce(
            (s, m) =>
                s +
                climate.rain(
                    districtId,
                    `${year}${String(m).padStart(2, '0')}`
                ),
            0
        )
        const normal = months.reduce(
            (s, m) => s + climate.normal(districtId, m),
            0
        )
        return { key, districtId, rain, normal, ratio: rain / normal }
    })
    const driest = [...sums].sort((a, b) => a.ratio - b.ratio)[0]
    if (driest.ratio >= 0.75) {
        driest.rain = driest.normal * DRY_SHARE
        driest.ratio = DRY_SHARE
        driest.planted = true
    }
    const green = sums
        .filter((s) => s !== driest && s.key !== 'westernArea')
        .sort((a, b) => Math.abs(a.ratio - 1) - Math.abs(b.ratio - 1))[0]
    return { year, months, sums, driest, green }
}

// ISO week of a date, as DHIS2 numbers bi-weeks from them
const isoWeek = (date) => {
    const d = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    )
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return {
        year: d.getUTCFullYear(),
        week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7),
    }
}

// The complete bi-weeks before the run date, oldest first, as DHIS2 period
// ids (2026BiW21 covers ISO weeks 41 and 42)
const lastBiWeeks = (runDate, n) => {
    const current = isoWeek(runDate)
    const currentId = `${current.year}BiW${Math.ceil(current.week / 2)}`
    const ids = []
    for (let back = 0; ids.length < n; back += 7) {
        const { year, week } = isoWeek(new Date(runDate - back * 86400000))
        const id = `${year}BiW${Math.ceil(week / 2)}`
        if (id !== currentId && !ids.includes(id)) {
            ids.push(id)
        }
    }
    return ids.reverse()
}

// Share of assessed households found food insecure
const insecureShare = (story, i, random) => {
    const progress = i / (BIWEEKS - 1)
    if (story === 'driest') {
        // Rising through the lean months as the poor harvest shows
        return 0.12 + 0.25 * Math.max(0, (progress - 0.5) / 0.5)
    }
    if (story === 'green') {
        return random.between(0.28, 0.32)
    }
    return random.between(0.08, 0.14)
}

const generate = ({ runDate }, { climate }) => {
    const rain = seasonRain(climate)
    const population = districtPopulation()
    const latest = population[Math.max(...Object.keys(population).map(Number))]
    const biweeks = lastBiWeeks(runDate, BIWEEKS)
    const assessments = Object.entries(DISTRICTS).flatMap(
        ([key, districtId]) => {
            let story
            if (districtId === rain.driest.districtId) {
                story = 'driest'
            } else if (districtId === rain.green.districtId) {
                story = 'green'
            }
            const households = latest[districtId] / PEOPLE_PER_HOUSEHOLD
            return biweeks.map((period, i) => {
                const r = randomFor('post12', key, period)
                const assessed = Math.round(
                    households * ASSESSED_SHARE * r.between(0.9, 1.1)
                )
                return {
                    orgUnit: districtId,
                    period,
                    assessed,
                    insecure: Math.round(assessed * insecureShare(story, i, r)),
                }
            })
        }
    )
    return { rain, biweeks, assessments }
}

const legendSets = {
    rainVsNormal: legendSet({
        key: 'RAIN_PCT_NORMAL',
        name: 'Showcase: rainfall since season start, % of 1991-2020 normal',
        legends: [
            { name: 'Below 75%', start: 0, end: 75, color: PALETTE.act },
            { name: '75 to 89%', start: 75, end: 90, color: PALETTE.watch },
            { name: '90 to 110%', start: 90, end: 110, color: PALETTE.target },
            {
                name: 'Above 110%: flood watch',
                start: 110,
                end: 1000,
                color: PALETTE.check,
            },
        ],
    }),
}

const ndviLayer = (name, year, hidden) =>
    earthEngineLayer({
        name,
        datasetId: 'MODIS/061/MOD13Q1/VI/MONTHLY',
        bands: 'NDVI',
        period: eeMonth(year, CRITICAL_MONTH),
        aggregations: ['mean'],
        level: 2,
        hidden,
    })

const post = {
    number: 12,
    title: 'Green fields, empty granaries?',

    prepare: async ({ orgUnits }) => ({
        climate: readClimate(),
        districtName: (id) => orgUnits.districts.find((d) => d.id === id)?.name,
    }),

    metadata: ({ importerId }) => {
        const districts = Object.values(DISTRICTS).map((id) => ({ id }))
        return {
            legendSets: Object.values(legendSets),
            dataElements: [
                dataElement({
                    key: DE.rain,
                    name: 'Rainfall since season start (CHIRPS)',
                    aggregationType: 'AVERAGE',
                }),
                dataElement({
                    key: DE.normal,
                    name: 'Normal rainfall since season start (CHIRPS 1991-2020)',
                    aggregationType: 'AVERAGE',
                }),
                dataElement({
                    key: DE.assessed,
                    name: 'Households assessed (food security)',
                }),
                dataElement({
                    key: DE.insecure,
                    name: 'Households assessed as food insecure',
                    zeroIsSignificant: true,
                }),
            ],
            dataSets: [
                dataSet({
                    key: RAIN_DATA_SET,
                    name: 'Season rainfall (CHIRPS)',
                    periodType: 'Yearly',
                    orgUnits: districts,
                    dataElements: [DE.rain, DE.normal].map(dataElementId),
                    importerId,
                }),
                dataSet({
                    key: FOOD_DATA_SET,
                    name: 'Rapid household food assessment',
                    periodType: 'BiWeekly',
                    orgUnits: districts,
                    dataElements: [DE.assessed, DE.insecure].map(dataElementId),
                    importerId,
                }),
            ],
            indicators: [
                indicator({
                    key: IND.rainVsNormal,
                    name: 'Rainfall since season start, % of normal',
                    type: 'percent',
                    numerator: `#{${dataElementId(DE.rain)}}`,
                    denominator: `#{${dataElementId(DE.normal)}}`,
                    description:
                        'CHIRPS rainfall since the start of the season (April) over the 1991-2020 average for the same months.',
                    decimals: 0,
                }),
            ],
        }
    },

    data: (ctx, state) => {
        const { rain, assessments } = generate(ctx, state)
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
                    dataSet: dataSetId(RAIN_DATA_SET),
                    dataValues: rain.sums.flatMap((s) => [
                        value(
                            DE.rain,
                            s.districtId,
                            String(rain.year),
                            Math.round(s.rain)
                        ),
                        value(
                            DE.normal,
                            s.districtId,
                            String(rain.year),
                            Math.round(s.normal)
                        ),
                    ]),
                },
                {
                    dataSet: dataSetId(FOOD_DATA_SET),
                    dataValues: assessments.flatMap((a) => [
                        value(DE.assessed, a.orgUnit, a.period, a.assessed),
                        value(DE.insecure, a.orgUnit, a.period, a.insecure),
                    ]),
                },
            ],
        }
    },

    content: (ctx, state) => {
        const { rain } = generate(ctx, state)
        const referenceYear = rain.year - 2
        const foodMap = map({
            key: 'post12_food_security',
            post: 12,
            title: `Green fields, empty granaries? Season ${rain.year}`,
            description: `Rainfall since April ${rain.year} as a share of the 1991-2020 normal, MODIS vegetation in August of ${rain.year} and ${referenceYear}, landcover, and households assessed as food insecure in the last two weeks, by district.`,
            layers: [
                ndviLayer(
                    `Vegetation index, August ${referenceYear} (reference)`,
                    referenceYear,
                    true
                ),
                ndviLayer(
                    `Vegetation index, August ${rain.year}`,
                    rain.year,
                    true
                ),
                earthEngineLayer({
                    name: 'Landcover',
                    datasetId: 'MODIS/006/MCD12Q1',
                    bands: 'LC_Type1',
                    // Yearly periods of a dataset filtered on system:index
                    // take the image index as id
                    period: {
                        id: `${LANDCOVER_YEAR}_01_01`,
                        startDate: `${LANDCOVER_YEAR}-01-01T00:00:00.000Z`,
                        endDate: `${LANDCOVER_YEAR}-12-31T23:59:59.000Z`,
                        year: LANDCOVER_YEAR,
                        name: String(LANDCOVER_YEAR),
                    },
                    aggregations: [],
                    level: 2,
                    opacity: 0.5,
                    hidden: true,
                }),
                thematicLayer({
                    name: 'Rainfall since season start, % of normal',
                    dataItem: {
                        id: indicatorId(IND.rainVsNormal),
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: [String(rain.year)],
                    level: 2,
                    legendSet: legendSets.rainVsNormal.id,
                    opacity: 0.7,
                    labels: '{name}\n{value}',
                }),
                thematicLayer({
                    name: 'Households assessed as food insecure',
                    dataItem: {
                        id: dataElementId(DE.insecure),
                        dimensionItemType: 'DATA_ELEMENT',
                    },
                    periods: ['LAST_BIWEEK'],
                    level: 2,
                    colorScale: CLASS_SCALES.reds3,
                    bubble: true,
                }),
            ],
        })
        const name = state.districtName
        return {
            maps: [{ map: foodMap, teams: ['agriculture'] }],
            dashboards: [
                dashboard({
                    key: 'post12',
                    post: 12,
                    title: 'Food security bulletin',
                    maps: [foodMap],
                }),
            ],
            interpretations: [
                {
                    map: foodMap.id,
                    author: 'agriculture_planner',
                    text: `${name(rain.driest.districtId)} has had ${Math.round(
                        rain.driest.ratio * 100
                    )}% of its normal rain since April, and food insecure households have risen over the last months: early action there, with targeted support and market monitoring. ${name(
                        rain.green.districtId
                    )} had normal rain but still many food insecure households: prices or post-harvest losses, not climate. @show_nutrition_coordinator please add both to the MUAC screening plan. (Synthetic data)`,
                    comments: [
                        {
                            author: 'nutrition_coordinator',
                            text: `Screening teams go to ${name(
                                rain.driest.districtId
                            )} first; ${name(
                                rain.green.districtId
                            )} follows in the next round.`,
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx, state) => {
        const { rain, biweeks } = generate(ctx, state)
        const share = (rows, ou, period) => {
            const v = (de) =>
                Number(
                    rows.find(
                        ([dx, o, pe]) =>
                            dx === dataElementId(de) &&
                            o === ou &&
                            pe === period
                    )?.[3]
                )
            return v(DE.insecure) / v(DE.assessed)
        }
        const ous = [rain.driest.districtId, rain.green.districtId]
        return [
            {
                name: 'The driest district is below 75% of normal rain',
                path: `/api/analytics?dimension=dx:${indicatorId(
                    IND.rainVsNormal
                )}&dimension=ou:${ous.join(';')}&filter=pe:${
                    rain.year
                }&skipMeta=true`,
                evaluate: (rows) => {
                    const v = Object.fromEntries(
                        rows.map(([, ou, value]) => [ou, Number(value)])
                    )
                    return {
                        ok:
                            v[rain.driest.districtId] < 75 &&
                            v[rain.green.districtId] >= 90 &&
                            v[rain.green.districtId] <= 110,
                        detail: `${rain.driest.key} ${
                            v[rain.driest.districtId]
                        }%${rain.driest.planted ? ' (planted)' : ''}, ${
                            rain.green.key
                        } ${v[rain.green.districtId]}%`,
                    }
                },
            },
            {
                name: 'Food insecurity rises in the driest district and is high in the green one',
                path: `/api/analytics?dimension=dx:${dataElementId(
                    DE.insecure
                )};${dataElementId(DE.assessed)}&dimension=ou:${ous.join(
                    ';'
                )}&dimension=pe:${biweeks[0]};${biweeks.at(-1)}&skipMeta=true`,
                evaluate: (rows) => {
                    const first = share(
                        rows,
                        rain.driest.districtId,
                        biweeks[0]
                    )
                    const last = share(
                        rows,
                        rain.driest.districtId,
                        biweeks.at(-1)
                    )
                    const green = share(
                        rows,
                        rain.green.districtId,
                        biweeks.at(-1)
                    )
                    return {
                        ok: last - first >= 0.15 && green >= 0.25,
                        detail: `${rain.driest.key} ${Math.round(
                            first * 100
                        )}% to ${Math.round(last * 100)}%, ${
                            rain.green.key
                        } ${Math.round(green * 100)}%`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate, lastBiWeeks, seasonRain }
