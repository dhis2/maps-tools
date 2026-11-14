// Post 11 · Watching the lean season: severe acute malnutrition admissions
// on a timeline, and how outpatient therapeutic programme (OTP) sites keep up.
const { PUBLIC_READ, code, uid } = require('../shared/ids.js')
const { legendSet } = require('../shared/legendSets.js')
const {
    dashboard,
    facilityLayer,
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
const {
    DEFAULT_COC,
    DISTRICTS,
    POPULATION_UNDER_1,
} = require('../shared/sierraLeone.js')
const { lastMonths } = require('../periods.js')
const { randomFor } = require('../random.js')

const MONTHS = 24
const OTP_SHARE = 0.45
// Children 6 to 59 months per child under 1 (4.5 years of births, less
// mortality)
const CHILDREN_PER_INFANT = 4.4
// New SAM admissions per 1,000 children 6-59 months per month, outside and
// at the peak of the lean season
const BASE_RATE = 1.2
const PEAK_FACTOR = 2.6

// The lean season wave reaches the north first and the south-west last
const PEAK_MONTH = {
    koinadugu: 6,
    bombali: 6,
    kono: 6,
    kambia: 7,
    portLoko: 7,
    tonkolili: 7,
    kailahun: 7,
    kenema: 8,
    bo: 8,
    moyamba: 8,
    pujehun: 8,
    bonthe: 8,
    westernArea: 8,
}
const DEFAULT_CURE = [0.8, 0.9]
// RUTF ran short in Kambia: a red district with a busy site
const LOW_CURE_DISTRICT = 'kambia'
const LOW_CURE = [0.58, 0.66]
const TINY_SITE_DISTRICT = 'pujehun'

const DE = {
    population: 'NUT_POP_6_59M',
    admissions: 'NUT_SAM_ADMISSIONS',
    cured: 'NUT_OTP_CURED',
    died: 'NUT_OTP_DIED',
    defaulted: 'NUT_OTP_DEFAULTED',
}
const IND = {
    admissionRate: 'NUT_SAM_ADMISSION_RATE',
    cureRate: 'NUT_OTP_CURE_RATE',
    exits: 'NUT_OTP_EXITS',
}
const MONTHLY_DATA_SET = 'NUT_OTP_MONTHLY'
const POPULATION_DATA_SET = 'NUT_POPULATION_YEARLY'
const OTP_GROUP = uid('orgUnitGroup:OTP_SITE')

const districtKey = (districtId) =>
    Object.keys(DISTRICTS).find((key) => DISTRICTS[key] === districtId)

const isOtpSite = (facility) =>
    randomFor('post11-otp', facility.id).chance(OTP_SHARE)

// The busiest OTP site of the low-cure district, and the smallest one of
// another district
const plantedSites = (sites, population, year) => {
    const pop = (f) => population[f.id]?.[year] ?? 0
    const inDistrict = (key) =>
        sites
            .filter((f) => f.districtId === DISTRICTS[key] && pop(f) > 0)
            .sort((a, b) => pop(b) - pop(a) || a.id.localeCompare(b.id))
    return {
        busy: inDistrict(LOW_CURE_DISTRICT)[0],
        tiny: inDistrict(TINY_SITE_DISTRICT).at(-1),
    }
}

const latestYear = (byYear, year) =>
    byYear?.[year] ??
    byYear?.[
        Object.keys(byYear)
            .map(Number)
            .filter((y) => y <= year)
            .sort((a, b) => b - a)[0]
    ]

const leanSeason = (key, month) => {
    // Months away from the district's peak, around the calendar
    const distance = Math.min(
        Math.abs(month - PEAK_MONTH[key]),
        12 - Math.abs(month - PEAK_MONTH[key])
    )
    return 1 + (PEAK_FACTOR - 1) * Math.max(0, 1 - distance / 2.5)
}

const generate = ({ runDate }, { facilities, population }) => {
    const months = lastMonths(runDate, MONTHS)
    const years = [...new Set(months.map(({ year }) => year))]
    const sites = facilities.filter(isOtpSite)
    const children = (f, year) =>
        Math.round(
            (latestYear(population[f.id], year) ?? 0) * CHILDREN_PER_INFANT
        )
    const planted = plantedSites(
        sites,
        Object.fromEntries(
            facilities.map((f) => [
                f.id,
                Object.fromEntries(years.map((y) => [y, children(f, y)])),
            ])
        ),
        years.at(-1)
    )

    const populationRows = facilities.flatMap((f) =>
        years
            .map((year) => ({
                orgUnit: f.id,
                year,
                children: children(f, year),
            }))
            .filter(({ children: c }) => c > 0)
    )

    const otpRows = []
    sites.forEach((site) => {
        const key = districtKey(site.districtId)
        const isTiny = site.id === planted.tiny?.id
        const isBusy = site.id === planted.busy?.id
        const cureRange = key === LOW_CURE_DISTRICT ? LOW_CURE : DEFAULT_CURE
        // Each OTP site also serves the children of nearby facilities
        const catchment = isTiny ? 0.25 : isBusy ? 3 : 1 / OTP_SHARE
        const admitted = []
        months.forEach((month, i) => {
            const r = randomFor('post11', site.id, month.id)
            const expected =
                (children(site, month.year) *
                    catchment *
                    BASE_RATE *
                    leanSeason(key, month.month)) /
                1000
            const admissions = Math.round(expected * r.between(0.75, 1.25))
            admitted.push(admissions)
            // Children leave the programme about two months after admission
            const exits = admitted[i - 2] ?? Math.round(expected)
            const cured = Math.round(exits * r.between(...cureRange))
            const died = Math.round(exits * r.between(0.01, 0.04))
            const defaulted = Math.max(0, exits - cured - died)
            otpRows.push({
                orgUnit: site.id,
                period: month.id,
                admissions,
                cured,
                died,
                defaulted,
            })
        })
    })
    return { months, sites, planted, populationRows, otpRows }
}

const legendSets = {
    admissions: legendSet({
        key: 'SAM_ADMISSION_RATE',
        name: 'Showcase: SAM admissions per 1,000 children 6-59 months',
        legends: [
            { name: 'Below 1.5', start: 0, end: 1.5, color: PALETTE.target },
            { name: '1.5 to 2.9', start: 1.5, end: 3, color: PALETTE.watch },
            { name: '3 and above', start: 3, end: 100, color: PALETTE.act },
        ],
    }),
    cure: legendSet({
        key: 'OTP_CURE_RATE',
        name: 'Showcase: OTP cure rate (Sphere 75%)',
        legends: [
            { name: 'Below 75%', start: 0, end: 75, color: PALETTE.act },
            {
                name: '75% and above',
                start: 75,
                end: 100,
                color: PALETTE.target,
            },
        ],
    }),
}

const dataItem = (key) => ({
    id: indicatorId(key),
    dimensionItemType: 'INDICATOR',
})

const exitsExpression = `#{${dataElementId(DE.cured)}}+#{${dataElementId(
    DE.died
)}}+#{${dataElementId(DE.defaulted)}}`

const post = {
    number: 11,
    title: 'Watching the lean season',

    prepare: async ({ client, orgUnits }) => {
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
            facilities: orgUnits.facilities,
            districtName: (id) =>
                orgUnits.districts.find((d) => d.id === id)?.name,
            population,
        }
    },

    metadata: ({ importerId, runDate }, state) => {
        const { sites } = generate({ runDate }, state)
        return {
            organisationUnitGroups: [
                {
                    id: OTP_GROUP,
                    code: code('OU_GROUP_OTP_SITE'),
                    name: 'OTP site',
                    shortName: 'OTP site',
                    organisationUnits: sites.map(({ id }) => ({ id })),
                    sharing: PUBLIC_READ,
                },
            ],
            legendSets: Object.values(legendSets),
            dataElements: [
                dataElement({
                    key: DE.population,
                    name: 'Children 6-59 months (estimate)',
                    aggregationType: 'AVERAGE_SUM_ORG_UNIT',
                }),
                dataElement({
                    key: DE.admissions,
                    name: 'SAM new admissions 6-59 months',
                }),
                dataElement({ key: DE.cured, name: 'OTP exits cured' }),
                dataElement({ key: DE.died, name: 'OTP exits died' }),
                dataElement({ key: DE.defaulted, name: 'OTP exits defaulted' }),
            ],
            dataSets: [
                dataSet({
                    key: MONTHLY_DATA_SET,
                    name: 'OTP monthly report',
                    periodType: 'Monthly',
                    orgUnits: sites,
                    dataElements: [
                        DE.admissions,
                        DE.cured,
                        DE.died,
                        DE.defaulted,
                    ].map(dataElementId),
                    importerId,
                }),
                dataSet({
                    key: POPULATION_DATA_SET,
                    name: 'Nutrition population estimates',
                    periodType: 'Yearly',
                    orgUnits: state.facilities,
                    dataElements: [dataElementId(DE.population)],
                    importerId,
                }),
            ],
            indicators: [
                indicator({
                    key: IND.admissionRate,
                    name: 'SAM admissions per 1,000 children 6-59 months',
                    type: 'perThousand',
                    numerator: `#{${dataElementId(DE.admissions)}}`,
                    denominator: `#{${dataElementId(DE.population)}}`,
                    description:
                        'New SAM admissions over the estimated children aged 6 to 59 months, per 1,000, in the period.',
                    decimals: 1,
                }),
                indicator({
                    key: IND.cureRate,
                    name: 'OTP cure rate',
                    type: 'percent',
                    numerator: `#{${dataElementId(DE.cured)}}`,
                    denominator: exitsExpression,
                    description:
                        'Children cured over children who left the outpatient therapeutic programme (cured, died or defaulted).',
                    decimals: 0,
                }),
                indicator({
                    key: IND.exits,
                    name: 'OTP exits',
                    type: 'number',
                    numerator: exitsExpression,
                    denominator: '1',
                    description:
                        'Children who left the outpatient therapeutic programme: cured, died or defaulted.',
                    decimals: 0,
                }),
            ],
        }
    },

    data: (ctx, state) => {
        const { populationRows, otpRows } = generate(ctx, state)
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
                    dataSet: dataSetId(POPULATION_DATA_SET),
                    dataValues: populationRows.map(
                        ({ orgUnit, year, children }) =>
                            value(
                                DE.population,
                                orgUnit,
                                String(year),
                                children
                            )
                    ),
                },
                {
                    dataSet: dataSetId(MONTHLY_DATA_SET),
                    dataValues: otpRows.flatMap(
                        ({ orgUnit, period, ...counts }) =>
                            Object.entries(counts)
                                .filter(([, v]) => v > 0)
                                .map(([key, v]) =>
                                    value(DE[key], orgUnit, period, v)
                                )
                    ),
                },
            ],
        }
    },

    content: (ctx, state) => {
        const { planted } = generate(ctx, state)
        const timeline = map({
            key: 'post11_timeline',
            post: 11,
            title: 'SAM admissions, last 12 months',
            description:
                'New SAM admissions per 1,000 children 6-59 months by district, month by month.',
            layers: [
                thematicLayer({
                    name: 'SAM admissions per 1,000 children 6-59 months',
                    dataItem: dataItem(IND.admissionRate),
                    periods: ['LAST_12_MONTHS'],
                    level: 2,
                    legendSet: legendSets.admissions.id,
                    renderingStrategy: 'TIMELINE',
                }),
            ],
        })
        const treatment = map({
            key: 'post11_treatment',
            post: 11,
            title: 'OTP cure rate and exits, last quarter',
            description:
                'OTP cure rate by district, and children who left each OTP site, last quarter.',
            layers: [
                thematicLayer({
                    name: 'OTP cure rate',
                    dataItem: dataItem(IND.cureRate),
                    periods: ['LAST_QUARTER'],
                    level: 2,
                    legendSet: legendSets.cure.id,
                }),
                facilityLayer({ name: 'Facilities' }),
                {
                    ...thematicLayer({
                        name: 'OTP exits',
                        dataItem: dataItem(IND.exits),
                        periods: ['LAST_QUARTER'],
                        level: 4,
                        colorScale: CLASS_SCALES.reds3,
                        bubble: true,
                    }),
                    rows: [
                        {
                            dimension: 'ou',
                            items: [
                                ...Object.values(DISTRICTS).map((id) => ({
                                    id,
                                })),
                                { id: `OU_GROUP-${OTP_GROUP}` },
                            ],
                        },
                    ],
                },
            ],
        })
        const districtName = state.districtName
        return {
            maps: [
                { map: timeline, teams: ['nutrition'] },
                { map: treatment, teams: ['nutrition'] },
            ],
            dashboards: [
                dashboard({
                    key: 'post11',
                    post: 11,
                    title: 'Nutrition, lean season',
                    maps: [timeline, treatment],
                }),
            ],
            interpretations: [
                {
                    map: treatment.id,
                    author: 'nutrition_coordinator',
                    text: `Admissions peaked in June in ${districtName(
                        DISTRICTS.koinadugu
                    )} and reached ${districtName(
                        DISTRICTS.bo
                    )} and the south in August. ${districtName(
                        DISTRICTS[LOW_CURE_DISTRICT]
                    )} is below the 75% cure rate, and ${
                        planted.busy.name
                    } discharged the most children there. @show_district_pharmacist was RUTF short at ${
                        planted.busy.name
                    } this quarter? (Synthetic data)`,
                    comments: [
                        {
                            author: 'district_pharmacist',
                            text: `Yes, RUTF ran out for several weeks last quarter. A double delivery reached ${planted.busy.name} last week.`,
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx, state) => {
        const { planted } = generate(ctx, state)
        const rate = indicatorId(IND.admissionRate)
        const cure = indicatorId(IND.cureRate)
        const exits = indicatorId(IND.exits)
        const months = lastMonths(ctx.runDate, 12).map(({ id }) => id)
        const peakOf = (rows, ou) =>
            rows
                .filter((r) => r[1] === ou)
                .sort((a, b) => Number(b[3]) - Number(a[3]))[0]?.[2]
        return [
            {
                name: 'The lean season wave reaches the north before the south-west',
                path: `/api/analytics?dimension=dx:${rate}&dimension=ou:${
                    DISTRICTS.koinadugu
                };${DISTRICTS.bo}&dimension=pe:${months.join(
                    ';'
                )}&skipMeta=true`,
                evaluate: (rows) => {
                    const north = peakOf(rows, DISTRICTS.koinadugu)
                    const south = peakOf(rows, DISTRICTS.bo)
                    return {
                        ok: Boolean(north && south && north < south),
                        detail: `Koinadugu peaks ${north}, Bo peaks ${south}`,
                    }
                },
            },
            {
                name: 'A busy low-cure site, a red district and a tiny site',
                path: `/api/analytics?dimension=dx:${cure};${exits}&dimension=ou:${planted.busy.id};${planted.tiny.id};${DISTRICTS[LOW_CURE_DISTRICT]}&filter=pe:LAST_QUARTER&skipMeta=true`,
                evaluate: (rows) => {
                    const v = {}
                    rows.forEach(([dx, ou, value]) => {
                        v[`${dx}:${ou}`] = Number(value)
                    })
                    const busyCure = v[`${cure}:${planted.busy.id}`]
                    const busyExits = v[`${exits}:${planted.busy.id}`]
                    const tinyExits = v[`${exits}:${planted.tiny.id}`]
                    const districtCure =
                        v[`${cure}:${DISTRICTS[LOW_CURE_DISTRICT]}`]
                    return {
                        ok:
                            busyCure < 75 &&
                            busyExits >= 30 &&
                            districtCure < 75 &&
                            !(tinyExits > 6),
                        detail: `${
                            planted.busy.name
                        }: cure ${busyCure}%, ${busyExits} exits; ${
                            planted.tiny.name
                        }: ${
                            tinyExits ?? 0
                        } exits; district cure ${districtCure}%`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate }
