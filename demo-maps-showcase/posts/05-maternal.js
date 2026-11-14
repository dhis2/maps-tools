// Post 5 · Two hours to a C-section: EmONC facilities, their two-hour
// catchments and the share of each district's population inside them.
const fs = require('node:fs')
const path = require('node:path')
const { catchment } = require('../shared/catchments.js')
const { loadFacilityPoints } = require('../shared/geometry.js')
const { PUBLIC_READ, code, uid } = require('../shared/ids.js')
const { legendSet } = require('../shared/legendSets.js')
const {
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
const { PALETTE } = require('../shared/palette.js')
const { DEFAULT_COC, DISTRICTS } = require('../shared/sierraLeone.js')
const { lastMonths } = require('../periods.js')
const { randomFor } = require('../random.js')

const COVERAGE_FILE = path.join(
    __dirname,
    '..',
    'input',
    'sierra-leone',
    'emonc-coverage.json'
)
const WORLDPOP_TOTAL = 'projects/sat-io/open-datasets/WORLDPOP/pop'

// Facility Type groups of the Sierra Leone demo database
const HOSPITAL_GROUP = 'tDZVQ1WtwpA'
const CHC_GROUP = 'CXw2yu5fodb'

// Synthetic two-hour reach, in km, by EmONC level
const REACH_KM = { comprehensive: 25, basic: 15 }
const BASIC_PER_DISTRICT = 4
// Koinadugu has no basic EmONC facility: its population is far from care
const BASIC_PER_DISTRICT_EXCEPTIONS = { koinadugu: 0 }

const MONTHS = 12
const BASIC_SIGNAL_FUNCTIONS = 7

const CATCHMENT_ATTRIBUTE = uid('attribute:EMONC_CATCHMENT')
const GROUP_SET = uid('orgUnitGroupSet:EMONC_LEVEL')
const GROUPS = {
    comprehensive: uid('orgUnitGroup:EMONC_COMPREHENSIVE'),
    basic: uid('orgUnitGroup:EMONC_BASIC'),
}
const DE = {
    signalFunctions: 'EMONC_BASIC_SIGNAL_FUNCTIONS',
    caesareans: 'EMONC_CAESAREAN_SECTIONS',
    population: 'EMONC_POP_WORLDPOP',
    populationWithin2h: 'EMONC_POP_WITHIN_2H',
}
const IND = { access: 'EMONC_POP_WITHIN_2H_SHARE' }
const MONTHLY_DATA_SET = 'EMONC_MONTHLY'
const ACCESS_DATA_SET = 'EMONC_ACCESS_YEARLY'

const districtKey = (districtId) =>
    Object.keys(DISTRICTS).find((key) => DISTRICTS[key] === districtId)

const loadGroupMembers = async (client, groupId) => {
    const { organisationUnits } = await client.get(
        `/api/organisationUnitGroups/${groupId}?fields=organisationUnits[id]`
    )
    return new Set(organisationUnits.map(({ id }) => id))
}

// What both the post and snapshot.js need to pick the EmONC facilities
const loadEmoncInputs = async (client, orgUnits) => ({
    facilities: orgUnits.facilities,
    points: await loadFacilityPoints(client),
    hospitals: await loadGroupMembers(client, HOSPITAL_GROUP),
    chcs: await loadGroupMembers(client, CHC_GROUP),
})

// Comprehensive: every hospital with a point. A district without one (the
// demo database has no hospital points in Bo, and no hospital in
// Koinadugu) gets a health centre instead. Basic: a few health centres per
// district.
const selectEmonc = ({ facilities, points, hospitals, chcs }) => {
    const withPoint = facilities.filter((f) => points[f.id])
    return Object.entries(DISTRICTS).flatMap(([key, districtId]) => {
        const inDistrict = withPoint.filter((f) => f.districtId === districtId)
        const centres = inDistrict
            .filter((f) => chcs.has(f.id))
            .map((f) => ({ f, rank: randomFor('post5-basic', f.id).next() }))
            .sort((a, b) => a.rank - b.rank)
            .map(({ f }) => f)
        const districtHospitals = inDistrict.filter((f) => hospitals.has(f.id))
        const comprehensive = districtHospitals.length
            ? districtHospitals
            : centres.slice(0, 1)
        const basic = centres
            .filter((f) => !comprehensive.includes(f))
            .slice(0, BASIC_PER_DISTRICT_EXCEPTIONS[key] ?? BASIC_PER_DISTRICT)
        return [
            ...comprehensive.map(({ id }) => ({ id, level: 'comprehensive' })),
            ...basic.map(({ id }) => ({ id, level: 'basic' })),
        ]
    })
}

const catchmentOf = ({ id, level }, points) =>
    catchment(id, points[id], REACH_KM[level])

const readCoverage = () => JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'))

// Signal functions and caesarean sections of the last months, from which the
// EmONC levels follow: all 7 basic functions every month, plus caesareans
// for comprehensive care
const generate = ({ runDate }, { inputs, emonc }) => {
    const months = lastMonths(runDate, MONTHS)
    const levelOf = new Map(emonc.map(({ id, level }) => [id, level]))
    const reporting = inputs.facilities.filter(
        (f) => inputs.hospitals.has(f.id) || inputs.chcs.has(f.id)
    )
    const rows = []
    reporting.forEach((facility) => {
        const level = levelOf.get(facility.id)
        months.forEach((month, i) => {
            const r = randomFor('post5', facility.id, month.id)
            const recent = i >= months.length - 3
            let signalFunctions = r.int(3, 6)
            if (level) {
                signalFunctions =
                    recent || r.chance(0.85) ? BASIC_SIGNAL_FUNCTIONS : 6
            }
            rows.push({
                orgUnit: facility.id,
                period: month.id,
                signalFunctions,
                caesareans: level === 'comprehensive' ? r.int(4, 30) : 0,
            })
        })
    })
    return { months, rows }
}

const legendSets = {
    access: legendSet({
        key: 'EMONC_ACCESS',
        name: 'Showcase: population within two hours of EmONC (EPMM 60%)',
        legends: [
            { name: 'Below 50%', start: 0, end: 50, color: PALETTE.act },
            { name: '50 to 59%', start: 50, end: 60, color: PALETTE.watch },
            {
                name: '60% and above',
                start: 60,
                end: 100,
                color: PALETTE.target,
            },
        ],
    }),
}

const facilityCatchmentLayer = () => ({
    layer: 'facility',
    name: 'EmONC facilities',
    rows: [
        {
            dimension: 'ou',
            items: [
                ...Object.values(DISTRICTS).map((id) => ({ id })),
                ...Object.values(GROUPS).map((id) => ({
                    id: `OU_GROUP-${id}`,
                })),
            ],
        },
    ],
    organisationUnitGroupSet: { id: GROUP_SET },
    orgUnitField: CATCHMENT_ATTRIBUTE,
    orgUnitFieldDisplayName: 'Two-hour catchment (synthetic)',
    opacity: 1,
    hidden: false,
})

const post = {
    number: 5,
    title: 'Two hours to a C-section',

    prepare: async ({ client, orgUnits }) => {
        const inputs = await loadEmoncInputs(client, orgUnits)
        const coverage = readCoverage()
        // The facilities the coverage was computed for, still on the server
        const emonc = coverage.facilities.filter(({ id }) => inputs.points[id])
        return {
            inputs,
            emonc,
            coverage,
            facilityName: (id) =>
                orgUnits.facilities.find((f) => f.id === id)?.name,
            districtName: (id) =>
                orgUnits.districts.find((d) => d.id === id)?.name,
        }
    },

    metadata: ({ importerId }, { inputs, emonc }) => {
        const members = (level) =>
            emonc.filter((f) => f.level === level).map(({ id }) => ({ id }))
        const reporting = inputs.facilities.filter(
            (f) => inputs.hospitals.has(f.id) || inputs.chcs.has(f.id)
        )
        return {
            attributes: [
                {
                    id: CATCHMENT_ATTRIBUTE,
                    code: code('ATTR_EMONC_CATCHMENT'),
                    name: 'Two-hour catchment (synthetic)',
                    shortName: 'Two-hour catchment (synthetic)',
                    valueType: 'GEOJSON',
                    organisationUnitAttribute: true,
                    sharing: PUBLIC_READ,
                },
            ],
            organisationUnitGroups: [
                {
                    id: GROUPS.comprehensive,
                    code: code('OU_GROUP_EMONC_COMPREHENSIVE'),
                    name: 'EmONC comprehensive',
                    shortName: 'EmONC comprehensive',
                    color: PALETTE.act,
                    symbol: '05.png',
                    organisationUnits: members('comprehensive'),
                    sharing: PUBLIC_READ,
                },
                {
                    id: GROUPS.basic,
                    code: code('OU_GROUP_EMONC_BASIC'),
                    name: 'EmONC basic',
                    shortName: 'EmONC basic',
                    color: PALETTE.watch,
                    symbol: '03.png',
                    organisationUnits: members('basic'),
                    sharing: PUBLIC_READ,
                },
            ],
            organisationUnitGroupSets: [
                {
                    id: GROUP_SET,
                    code: code('OU_GROUP_SET_EMONC_LEVEL'),
                    name: 'EmONC level',
                    shortName: 'EmONC level',
                    compulsory: false,
                    dataDimension: true,
                    organisationUnitGroups: Object.values(GROUPS).map((id) => ({
                        id,
                    })),
                    sharing: PUBLIC_READ,
                },
            ],
            legendSets: Object.values(legendSets),
            dataElements: [
                dataElement({
                    key: DE.signalFunctions,
                    name: 'EmONC basic signal functions performed (of 7)',
                    aggregationType: 'LAST_IN_PERIOD',
                }),
                dataElement({
                    key: DE.caesareans,
                    name: 'Caesarean sections performed',
                    zeroIsSignificant: true,
                }),
                dataElement({
                    key: DE.population,
                    name: 'Population (WorldPop Global2)',
                    aggregationType: 'AVERAGE_SUM_ORG_UNIT',
                }),
                dataElement({
                    key: DE.populationWithin2h,
                    name: 'Population within two hours of EmONC (WorldPop Global2)',
                    aggregationType: 'AVERAGE_SUM_ORG_UNIT',
                }),
            ],
            dataSets: [
                dataSet({
                    key: MONTHLY_DATA_SET,
                    name: 'EmONC monthly report',
                    periodType: 'Monthly',
                    orgUnits: reporting,
                    dataElements: [DE.signalFunctions, DE.caesareans].map(
                        dataElementId
                    ),
                    importerId,
                }),
                dataSet({
                    key: ACCESS_DATA_SET,
                    name: 'EmONC access (WorldPop)',
                    periodType: 'Yearly',
                    orgUnits: Object.values(DISTRICTS).map((id) => ({ id })),
                    dataElements: [DE.population, DE.populationWithin2h].map(
                        dataElementId
                    ),
                    importerId,
                }),
            ],
            indicators: [
                indicator({
                    key: IND.access,
                    name: 'Population within two hours of EmONC',
                    type: 'percent',
                    numerator: `#{${dataElementId(DE.populationWithin2h)}}`,
                    denominator: `#{${dataElementId(DE.population)}}`,
                    description:
                        'Share of the WorldPop Global2 population living inside the two-hour catchment of an EmONC facility (synthetic catchments).',
                    decimals: 0,
                }),
            ],
        }
    },

    orgUnitAttributeValues: (ctx, { emonc, inputs }) =>
        emonc.map((facility) => ({
            orgUnit: facility.id,
            attribute: CATCHMENT_ATTRIBUTE,
            value: JSON.stringify(catchmentOf(facility, inputs.points)),
        })),

    data: (ctx, state) => {
        const { rows } = generate(ctx, state)
        const value = (key, orgUnit, period, v) => ({
            dataElement: dataElementId(key),
            orgUnit,
            period,
            categoryOptionCombo: DEFAULT_COC,
            attributeOptionCombo: DEFAULT_COC,
            value: String(v),
        })
        const access = Object.entries(state.coverage.values).flatMap(
            ([year, byDistrict]) =>
                Object.entries(byDistrict).flatMap(
                    ([district, { total, within2h }]) => [
                        value(DE.population, district, year, total),
                        value(DE.populationWithin2h, district, year, within2h),
                    ]
                )
        )
        return {
            dataValueSets: [
                {
                    dataSet: dataSetId(MONTHLY_DATA_SET),
                    dataValues: rows.flatMap(
                        ({ orgUnit, period, signalFunctions, caesareans }) => [
                            value(
                                DE.signalFunctions,
                                orgUnit,
                                period,
                                signalFunctions
                            ),
                            value(DE.caesareans, orgUnit, period, caesareans),
                        ]
                    ),
                },
                { dataSet: dataSetId(ACCESS_DATA_SET), dataValues: access },
            ],
        }
    },

    content: (ctx, state) => {
        const year = ctx.runDate.getUTCFullYear() - 1
        const accessMap = map({
            key: 'post05_access',
            post: 5,
            title: 'Two hours to emergency obstetric care',
            description:
                'WorldPop Global2 population, the share of each district within two hours of EmONC, and EmONC facilities with their two-hour catchments (synthetic).',
            layers: [
                earthEngineLayer({
                    name: 'Population WorldPop Global2',
                    datasetId: WORLDPOP_TOTAL,
                    year,
                    style: {
                        min: 0,
                        max: 25,
                        palette: [
                            '#fee5d9',
                            '#fcbba1',
                            '#fc9272',
                            '#fb6a4a',
                            '#de2d26',
                            '#a50f15',
                        ],
                    },
                    level: 2,
                    opacity: 0.7,
                }),
                thematicLayer({
                    name: 'Population within two hours of EmONC',
                    dataItem: {
                        id: indicatorId(IND.access),
                        dimensionItemType: 'INDICATOR',
                    },
                    periods: ['LAST_YEAR'],
                    level: 2,
                    legendSet: legendSets.access.id,
                    opacity: 0.45,
                    labels: '{name}\n{value}',
                }),
                facilityCatchmentLayer(),
            ],
        })

        const koinadugu = state.coverage.values[year][DISTRICTS.koinadugu]
        const lowest = {
            district: DISTRICTS.koinadugu,
            share: Math.round((100 * koinadugu.within2h) / koinadugu.total),
        }
        const name = state.districtName

        return {
            maps: [{ map: accessMap, teams: ['maternal'] }],
            dashboards: [
                dashboard({
                    key: 'post05',
                    post: 5,
                    title: 'Maternal access',
                    maps: [accessMap],
                }),
            ],
            interpretations: [
                {
                    map: accessMap.id,
                    author: 'rh_planner',
                    text: `${name(lowest.district)} has ${
                        lowest.share
                    }% of its population within two hours of EmONC, against the EPMM target of 60%, and no basic EmONC facility outside its hospital. Shortlist for this year's plan: upgrade two health centres in ${name(
                        lowest.district
                    )} to basic EmONC and open a maternity waiting home next to the hospital. @show_facility_incharge please confirm staffing for the signal functions. (Synthetic data)`,
                    comments: [
                        {
                            author: 'facility_incharge',
                            text: 'One midwife per centre is trained in assisted vaginal delivery; we need a second for a 24-hour rota.',
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx) => {
        const share = indicatorId(IND.access)
        const districts = Object.values(DISTRICTS).join(';')
        return [
            {
                name: 'Koinadugu is below 50% and most districts reach 60%',
                path: `/api/analytics?dimension=dx:${share}&dimension=ou:${districts}&filter=pe:LAST_YEAR&skipMeta=true`,
                evaluate: (rows) => {
                    const v = Object.fromEntries(
                        rows.map(([, ou, value]) => [ou, Number(value)])
                    )
                    const reaching = Object.values(v).filter((s) => s >= 60)
                    return {
                        ok: v[DISTRICTS.koinadugu] < 50 && reaching.length >= 6,
                        detail: Object.entries(v)
                            .map(([ou, s]) => `${districtKey(ou)} ${s}%`)
                            .join(', '),
                    }
                },
            },
            {
                name: 'EmONC facilities perform all 7 basic signal functions',
                path: `/api/analytics?dimension=dx:${dataElementId(
                    DE.signalFunctions
                )}&dimension=ou:${districts};OU_GROUP-${
                    GROUPS.basic
                };OU_GROUP-${
                    GROUPS.comprehensive
                }&filter=pe:LAST_MONTH&skipMeta=true`,
                evaluate: (rows) => {
                    const below = rows.filter(
                        ([, , value]) => Number(value) < BASIC_SIGNAL_FUNCTIONS
                    )
                    return {
                        ok: rows.length > 0 && below.length === 0,
                        detail: `${rows.length} facilities, ${below.length} below 7`,
                    }
                },
            },
        ]
    },
}

module.exports = {
    ...post,
    REACH_KM,
    catchmentOf,
    generate,
    loadEmoncInputs,
    selectEmonc,
}
