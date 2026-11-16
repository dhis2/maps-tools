// Post 11 · Watching the lean season: severe acute malnutrition admissions
// on a timeline, and how outpatient therapeutic programme (OTP) sites keep up.
const { PUBLIC_READ, code, uid } = require('../shared/ids.js')
const { legendSet } = require('../shared/legendSets.js')
const { loadFacilityPoints } = require('../shared/geometry.js')
const {
    boundaryLayer,
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
const {
    DEFAULT_COC,
    DISTRICTS,
    POPULATION_UNDER_1,
} = require('../shared/sierraLeone.js')
const {
    id,
    mergeParts,
    point,
    program,
    styleByNumber,
    trackerDataElement,
} = require('../shared/tracker.js')
const { addDays, isoDate, lastMonths } = require('../periods.js')
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
const SCREENING = 'NUT_MUAC_SCREENING'
const SCREENING_STAGE = 'NUT_MUAC_SCREENING_VISIT'
const MUAC = 'NUT_MUAC_MM'
const SCREENING_DAYS = 30
const SCREENINGS_PER_FACILITY = 6
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

// A point within about `km` of a centre
const near = (random, [lon, lat], km) => {
    const angle = random.between(0, 2 * Math.PI)
    const distance = km * Math.sqrt(random.next())
    return [
        lon + (distance * Math.cos(angle)) / 109,
        lat + (distance * Math.sin(angle)) / 110.6,
    ]
}

// MUAC in mm: about 7% SAM and 18% MAM in the lean season, twice as many SAM
// children around the busy OTP site
const muac = (random, nearBusySite) => {
    const p = random.next()
    const sam = nearBusySite ? 0.15 : 0.07
    if (p < sam) {
        return random.int(100, 114)
    }
    return p < sam + 0.18 ? random.int(115, 124) : random.int(125, 160)
}

// Some facilities of the demo database have coordinates far from their
// district: those more than 25 km from the district's median point
const MAX_KM_FROM_MEDIAN = 25

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
}

const nearTheirDistrict = (facilities, points) => {
    const lon = median(facilities.map((f) => points[f.id][0]))
    const lat = median(facilities.map((f) => points[f.id][1]))
    return facilities.filter(
        (f) =>
            Math.hypot(
                (points[f.id][0] - lon) * 109,
                (points[f.id][1] - lat) * 110.6
            ) <= MAX_KM_FROM_MEDIAN
    )
}

// Community screening around the facilities of the low-cure district, last
// 30 days
const generateScreening = ({ runDate }, { facilities, points }, planted) =>
    nearTheirDistrict(
        facilities.filter(
            (f) => f.districtId === DISTRICTS[LOW_CURE_DISTRICT] && points[f.id]
        ),
        points
    ).flatMap((facility) =>
        Array.from({ length: SCREENINGS_PER_FACILITY }, (_, n) => {
            const r = randomFor('post11-muac', facility.id, n)
            const nearBusySite =
                facility.chiefdomId === planted.busy?.chiefdomId
            return {
                event: id('event', `post11:${facility.id}:${n}`),
                program: id('program', SCREENING),
                programStage: id('programStage', SCREENING_STAGE),
                orgUnit: facility.id,
                status: 'COMPLETED',
                occurredAt: isoDate(
                    addDays(runDate, -r.int(1, SCREENING_DAYS))
                ),
                geometry: point(near(r, points[facility.id], 3)),
                dataValues: [
                    {
                        dataElement: id('dataElement', MUAC),
                        value: String(muac(r, nearBusySite)),
                    },
                ],
            }
        })
    )

const legendSets = {
    muac: legendSet({
        key: 'MUAC_MM',
        // Event layer legends show this name
        name: 'MUAC, children 6-59 months (mm)',
        // ColorBrewer RdYlGn, as on MUAC tapes
        legends: [
            { name: 'Below 115 mm: SAM', start: 0, end: 115, color: '#d7191c' },
            {
                name: '115 to 124 mm: MAM',
                start: 115,
                end: 125,
                color: '#fdae61',
            },
            {
                name: '125 mm and above',
                start: 125,
                end: 300,
                color: '#1a9641',
            },
        ],
    }),
    admissions: legendSet({
        key: 'SAM_ADMISSION_RATE',
        name: 'Showcase: SAM admissions per 1,000 children 6-59 months',
        // ColorBrewer Oranges
        legends: [
            { name: 'Below 1', start: 0, end: 1, color: '#feedde' },
            { name: '1 to 1.9', start: 1, end: 2, color: '#fdbe85' },
            { name: '2 to 2.9', start: 2, end: 3, color: '#fd8d3c' },
            { name: '3 and above', start: 3, end: 100, color: '#d94701' },
        ],
    }),
    cure: legendSet({
        key: 'OTP_CURE_RATE',
        name: 'Showcase: OTP cure rate (Sphere 75%)',
        // ColorBrewer BrBG
        legends: [
            { name: 'Below 75%', start: 0, end: 75, color: '#d8b365' },
            { name: '75% and above', start: 75, end: 100, color: '#5ab4ac' },
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
    eventAnalytics: true,

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
            chiefdoms: orgUnits.chiefdoms,
            districtName: (ou) =>
                orgUnits.districts.find((d) => d.id === ou)?.name,
            population,
            points: await loadFacilityPoints(client),
        }
    },

    metadata: ({ importerId, runDate }, state) => {
        const { sites } = generate({ runDate }, state)
        const screening = mergeParts(
            {
                dataElements: [
                    trackerDataElement({
                        key: MUAC,
                        name: 'MUAC (mm)',
                        valueType: 'INTEGER_POSITIVE',
                    }),
                ],
            },
            program({
                key: SCREENING,
                name: 'Nutrition screening (MUAC)',
                orgUnits: state.facilities,
                stages: [
                    {
                        key: SCREENING_STAGE,
                        name: 'MUAC screening',
                        dataElements: [MUAC],
                    },
                ],
            })
        )
        return mergeParts(screening, {
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
        })
    },

    data: (ctx, state) => {
        const { populationRows, otpRows, planted } = generate(ctx, state)
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
            tracker: {
                programs: [id('program', SCREENING)],
                events: generateScreening(ctx, state, planted),
            },
        }
    },

    content: (ctx, state) => {
        const { planted } = generate(ctx, state)
        const timeline = map({
            key: 'post11_timeline',
            post: 11,
            title: 'SAM admissions, last 12 months',
            description:
                'New SAM admissions per 1,000 children 6-59 months by chiefdom, month by month.',
            layers: [
                thematicLayer({
                    name: 'SAM admissions per 1,000 children 6-59 months',
                    dataItem: dataItem(IND.admissionRate),
                    periods: ['LAST_12_MONTHS'],
                    level: 3,
                    legendSet: legendSets.admissions.id,
                    renderingStrategy: 'TIMELINE',
                }),
                boundaryLayer({
                    name: 'Districts',
                    level: 2,
                    color: '#252525',
                    labels: '{name}',
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
                    labels: '{name}',
                }),
                thematicLayer({
                    name: 'OTP exits',
                    dataItem: dataItem(IND.exits),
                    periods: ['LAST_QUARTER'],
                    orgUnits: [
                        ...Object.values(DISTRICTS),
                        `OU_GROUP-${OTP_GROUP}`,
                    ],
                    color: '#e7298a',
                    bubble: true,
                    radiusLow: 3,
                    radiusHigh: 16,
                    opacity: 1,
                }),
            ],
        })
        const districtName = state.districtName
        const lowCure = DISTRICTS[LOW_CURE_DISTRICT]
        const screening = map({
            key: 'post11_screening',
            post: 11,
            title: `MUAC screening in ${districtName(lowCure)}, last 30 days`,
            description: `Children 6-59 months screened in the community in ${districtName(
                lowCure
            )}, by mid-upper arm circumference (MUAC): below 115 mm is severe acute malnutrition.`,
            layers: [
                boundaryLayer({
                    name: 'Chiefdoms',
                    orgUnits: [lowCure, 'LEVEL-3'],
                    color: '#252525',
                    labels: '{name}',
                }),
                eventLayer({
                    name: 'MUAC screening',
                    programId: id('program', SCREENING),
                    stageId: id('programStage', SCREENING_STAGE),
                    periods: ['LAST_30_DAYS'],
                    orgUnits: [lowCure],
                    styleDataItem: styleByNumber(MUAC, 'INTEGER_POSITIVE'),
                    legendSet: legendSets.muac.id,
                    radius: 5,
                }),
            ],
        })
        // The country wave, then treatment, then the screening close-up
        const maps = [timeline, treatment, screening]
        return {
            maps: maps.map((m) => ({ map: m, teams: ['nutrition'] })),
            dashboards: [
                dashboard({
                    key: 'post11',
                    post: 11,
                    title: 'Nutrition, lean season',
                    maps,
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
                    } this quarter?`,
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
            {
                name: 'More SAM children screened around the busy site than in its district',
                path: `/api/analytics/events/aggregate/${id(
                    'program',
                    SCREENING
                )}?stage=${id('programStage', SCREENING_STAGE)}&dimension=${id(
                    'programStage',
                    SCREENING_STAGE
                )}.${id('dataElement', MUAC)}&dimension=ou:${
                    planted.busy.chiefdomId
                };${DISTRICTS[LOW_CURE_DISTRICT]}&filter=pe:LAST_30_DAYS`,
                evaluate: (rows, { headers }) => {
                    const ou = headers.findIndex((h) => h.name === 'ou')
                    const value = headers.findIndex((h) => h.name === 'value')
                    const mm = headers.findIndex(
                        (h) => h.name !== 'ou' && h.name !== 'value'
                    )
                    const samShare = (orgUnit) => {
                        const own = rows.filter((row) => row[ou] === orgUnit)
                        const total = own.reduce(
                            (s, r) => s + Number(r[value]),
                            0
                        )
                        const sam = own
                            .filter((r) => Number(r[mm]) < 115)
                            .reduce((s, r) => s + Number(r[value]), 0)
                        return total ? Math.round((100 * sam) / total) : 0
                    }
                    const site = samShare(planted.busy.chiefdomId)
                    const district = samShare(DISTRICTS[LOW_CURE_DISTRICT])
                    return {
                        ok: site > district,
                        detail: `SAM ${site}% around ${planted.busy.name}, ${district}% in the district`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate }
