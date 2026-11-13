// Post 8 · Seeing stockouts before patients do: months of stock of tracer
// products, facility by facility.
const { distanceKm, loadFacilityPoints } = require('../shared/geometry.js')
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
const { PALETTE } = require('../shared/palette.js')
const { DEFAULT_COC, DISTRICTS } = require('../shared/sierraLeone.js')
const { lastMonths } = require('../periods.js')
const { randomFor } = require('../random.js')

// 12 months shown, and 3 before them for the first average consumption
const MONTHS = 15
const MIN_MONTHS = 2
const MAX_MONTHS = 4
// Facilities order up to this level when they fall below the reorder level
const REORDER_BELOW = 3
const ORDER_UP_TO = 4.5
const DELIVERY_RELIABILITY = 0.9

const PRODUCTS = {
    AL: {
        name: 'Artemether-lumefantrine 6x4',
        demand: [20, 120],
        // Malaria peaks in August
        peakMonth: 8,
        seasonality: 0.35,
    },
    ORS: {
        name: 'ORS sachets',
        demand: [30, 150],
        peakMonth: 7,
        seasonality: 0.2,
    },
}
const DATA_SET = 'STOCK_MONTHLY'

const sohKey = (product) => `STOCK_${product}_SOH`
const consumptionKey = (product) => `STOCK_${product}_CONSUMPTION`
const amcKey = (product) => `STOCK_${product}_AMC`
const monthsOfStockKey = (product) => `STOCK_${product}_MONTHS_OF_STOCK`

// Planted for the main tracer product
const PLANTED_PRODUCT = 'AL'
const PAIR_DISTRICT = 'kenema'
const CLUSTER_DISTRICT = 'kailahun'
const NOT_REPORTING_SHARE = 0.03

// A stocked-out facility and its nearest neighbour with coordinates, which
// is overstocked: a lateral transfer waiting to happen
const plantedPair = (facilities, points) => {
    const inDistrict = facilities.filter(
        (f) => f.districtId === DISTRICTS[PAIR_DISTRICT] && points[f.id]
    )
    const [stockout, ...others] = inDistrict
    const overstock = others
        .map((f) => ({ f, km: distanceKm(points[stockout.id], points[f.id]) }))
        .sort((a, b) => a.km - b.km)[0]
    return { stockout, overstock: overstock.f, km: overstock.km }
}

// A chiefdom whose district store missed the last three deliveries
const plantedCluster = (facilities) => {
    const byChiefdom = {}
    facilities
        .filter((f) => f.districtId === DISTRICTS[CLUSTER_DISTRICT])
        .forEach((f) => {
            byChiefdom[f.chiefdomId] = [...(byChiefdom[f.chiefdomId] || []), f]
        })
    const [chiefdomId] = Object.entries(byChiefdom)
        .filter(([, list]) => list.length >= 5)
        .sort(([a], [b]) => a.localeCompare(b))[0]
    return chiefdomId
}

const season = ({ peakMonth, seasonality }, month) =>
    1 + seasonality * Math.cos((2 * Math.PI * (month - peakMonth)) / 12)

// One facility's stock card for one product: stock on hand at the end of
// each month and consumption during it
const stockCard = ({ facility, product, months, cutOff, story }) => {
    const spec = PRODUCTS[product]
    const random = randomFor('post8', facility.id, product)
    const baseDemand = random.between(...spec.demand)
    let soh = Math.round(baseDemand * random.between(2.5, 4))
    const consumed = []
    return months.map((month, i) => {
        const r = randomFor('post8', facility.id, product, month.id)
        const isLast = i === months.length - 1
        // Orders follow the average consumption of the last 3 months
        const recent = consumed.slice(-3)
        const amc = recent.length
            ? recent.reduce((a, b) => a + b, 0) / recent.length
            : baseDemand
        const delivered =
            !(cutOff && i >= months.length - 3) &&
            r.chance(DELIVERY_RELIABILITY)
        let received =
            delivered && soh < REORDER_BELOW * amc
                ? Math.round(ORDER_UP_TO * amc - soh)
                : 0
        if (story === 'overstock' && isLast) {
            received = Math.round(7 * amc)
        }
        const demand = Math.round(
            baseDemand * season(spec, month.month) * r.between(0.8, 1.2)
        )
        // A stocked-out facility can only dispense what it has
        let consumption = Math.min(demand, soh + received)
        if (story === 'stockout' && isLast) {
            consumption = soh + received
        }
        soh = soh + received - consumption
        consumed.push(consumption)
        const lastThree = consumed.slice(-3)
        const averageConsumption =
            lastThree.reduce((a, b) => a + b, 0) / lastThree.length
        return {
            period: month.id,
            soh,
            consumption,
            amc: Math.round(averageConsumption * 10) / 10,
        }
    })
}

const generate = ({ runDate }, { facilities, points }) => {
    const months = lastMonths(runDate, MONTHS)
    const pair = plantedPair(facilities, points)
    const cluster = plantedCluster(facilities)
    const rows = []
    facilities.forEach((facility) => {
        const notReporting = randomFor('post8-missing', facility.id).chance(
            NOT_REPORTING_SHARE
        )
        Object.keys(PRODUCTS).forEach((product) => {
            const planted = product === PLANTED_PRODUCT
            let story
            if (planted && facility.id === pair.stockout.id) {
                story = 'stockout'
            } else if (planted && facility.id === pair.overstock.id) {
                story = 'overstock'
            }
            const card = stockCard({
                facility,
                product,
                months,
                cutOff: facility.chiefdomId === cluster,
                story,
            })
            card.forEach((entry, i) => {
                // Reports missing for the last month
                if (notReporting && !story && i === months.length - 1) {
                    return
                }
                rows.push({ orgUnit: facility.id, product, ...entry })
            })
        })
    })
    return { months, rows, pair, cluster }
}

const legendSets = {
    monthsOfStock: legendSet({
        key: 'MONTHS_OF_STOCK',
        name: 'Showcase: months of stock (min 2, max 4)',
        legends: [
            { name: 'Stockout', start: 0, end: 0.01, color: PALETTE.act },
            {
                name: 'Below 2 months: understock',
                start: 0.01,
                end: MIN_MONTHS,
                color: PALETTE.watch,
            },
            {
                name: '2 to 4 months',
                start: MIN_MONTHS,
                end: MAX_MONTHS,
                color: PALETTE.target,
            },
            {
                name: 'Above 4 months: overstock',
                start: MAX_MONTHS,
                end: 100,
                color: PALETTE.check,
            },
        ],
    }),
}

// Average monthly consumption is reported as a value, as an LMIS computes it:
// an indicator averaging with periodOffset is wrong when the period is a
// filter, as maps-app sends it (2.43.2 ignores the offsets there)
const monthsOfStockExpression = (product) => ({
    numerator: `#{${dataElementId(sohKey(product))}}`,
    denominator: `#{${dataElementId(amcKey(product))}}`,
})

const productMap = (product) =>
    map({
        key: `post08_${product.toLowerCase()}`,
        post: 8,
        title: `${PRODUCTS[product].name}, months of stock`,
        description: `Months of stock of ${PRODUCTS[product].name} by facility last month: stock on hand over average monthly consumption.`,
        layers: [
            facilityLayer({ name: 'Facilities' }),
            thematicLayer({
                name: `${PRODUCTS[product].name} months of stock`,
                dataItem: {
                    id: indicatorId(monthsOfStockKey(product)),
                    dimensionItemType: 'INDICATOR',
                },
                periods: ['LAST_MONTH'],
                level: 4,
                legendSet: legendSets.monthsOfStock.id,
            }),
        ],
    })

const post = {
    number: 8,
    title: 'Seeing stockouts before patients do',

    // Without it, stored zeros stay out of analytics even for data elements
    // where zero is significant, and stockouts show as no data (2.43.2)
    systemSettings: { keyIncludeZeroValuesInAnalytics: true },

    prepare: async ({ client, orgUnits }) => ({
        facilities: orgUnits.facilities,
        chiefdoms: orgUnits.chiefdoms,
        points: await loadFacilityPoints(client),
    }),

    metadata: ({ importerId }, { facilities }) => {
        const products = Object.entries(PRODUCTS)
        return {
            legendSets: Object.values(legendSets),
            dataElements: products.flatMap(([product, { name }]) => [
                dataElement({
                    key: sohKey(product),
                    name: `${name} stock on hand`,
                    aggregationType: 'LAST_IN_PERIOD',
                    zeroIsSignificant: true,
                }),
                dataElement({
                    key: consumptionKey(product),
                    name: `${name} consumption`,
                    zeroIsSignificant: true,
                }),
                dataElement({
                    key: amcKey(product),
                    name: `${name} average monthly consumption`,
                    aggregationType: 'LAST_IN_PERIOD',
                }),
            ]),
            dataSets: [
                dataSet({
                    key: DATA_SET,
                    name: 'Monthly stock report',
                    periodType: 'Monthly',
                    orgUnits: facilities,
                    dataElements: products.flatMap(([product]) => [
                        dataElementId(sohKey(product)),
                        dataElementId(consumptionKey(product)),
                        dataElementId(amcKey(product)),
                    ]),
                    importerId,
                }),
            ],
            indicators: products.map(([product, { name }]) =>
                indicator({
                    key: monthsOfStockKey(product),
                    name: `${name} months of stock`,
                    type: 'number',
                    ...monthsOfStockExpression(product),
                    description:
                        'Stock on hand at the end of the month over the average monthly consumption of the last 3 months (stock coverage time).',
                    decimals: 1,
                })
            ),
        }
    },

    data: (ctx, state) => ({
        dataSet: dataSetId(DATA_SET),
        dataValues: generate(ctx, state).rows.flatMap(
            ({ orgUnit, product, period, soh, consumption, amc }) =>
                [
                    [sohKey(product), soh],
                    [consumptionKey(product), consumption],
                    [amcKey(product), amc],
                ].map(([key, value]) => ({
                    dataElement: dataElementId(key),
                    orgUnit,
                    period,
                    categoryOptionCombo: DEFAULT_COC,
                    attributeOptionCombo: DEFAULT_COC,
                    value: String(value),
                }))
        ),
    }),

    content: (ctx, state) => {
        const { pair, cluster } = generate(ctx, state)
        const maps = Object.keys(PRODUCTS).map((product) => productMap(product))
        const chiefdom = state.chiefdoms.find(({ id }) => id === cluster)
        return {
            maps: maps.map((m) => ({ map: m, teams: ['supply'] })),
            dashboards: [
                dashboard({
                    key: 'post08',
                    post: 8,
                    title: 'Stock status',
                    maps,
                }),
            ],
            interpretations: [
                {
                    map: maps[0].id,
                    author: 'district_pharmacist',
                    text: `${pair.stockout.name} is stocked out of ${
                        PRODUCTS[PLANTED_PRODUCT].name
                    }, while ${pair.overstock.name}, ${Math.round(
                        pair.km
                    )} km away, holds more than 4 months. @show_facility_incharge please send two months of stock from ${
                        pair.overstock.name
                    } this week. Facilities in ${
                        chiefdom.name
                    } are all low: their district store missed the last three deliveries, raised with the central warehouse. (Synthetic data)`,
                    comments: [
                        {
                            author: 'facility_incharge',
                            text: `Transfer agreed by phone; the motorbike leaves for ${pair.stockout.name} tomorrow morning.`,
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx, { facilities, points }) => {
        const pair = plantedPair(facilities, points)
        const cluster = plantedCluster(facilities)
        const clusterIds = facilities
            .filter((f) => f.chiefdomId === cluster)
            .map(({ id }) => id)
        const mos = indicatorId(monthsOfStockKey(PLANTED_PRODUCT))
        const toValues = (rows) =>
            Object.fromEntries(rows.map(([, ou, value]) => [ou, Number(value)]))
        return [
            {
                name: 'A stocked-out facility next to an overstocked one',
                path: `/api/analytics?dimension=dx:${mos}&dimension=ou:${pair.stockout.id};${pair.overstock.id}&filter=pe:LAST_MONTH&skipMeta=true`,
                evaluate: (rows) => {
                    const v = toValues(rows)
                    return {
                        ok:
                            v[pair.stockout.id] === 0 &&
                            v[pair.overstock.id] > MAX_MONTHS,
                        detail: `${pair.stockout.name} ${
                            v[pair.stockout.id]
                        }, ${pair.overstock.name} ${
                            v[pair.overstock.id]
                        } months, ${Math.round(pair.km)} km apart`,
                    }
                },
            },
            {
                name: 'Facilities under one district store are low together',
                path: `/api/analytics?dimension=dx:${mos}&dimension=ou:${clusterIds.join(
                    ';'
                )}&filter=pe:LAST_MONTH&skipMeta=true`,
                evaluate: (rows) => {
                    const low = rows.filter(
                        ([, , value]) => Number(value) < MIN_MONTHS
                    )
                    return {
                        ok: low.length >= 0.7 * clusterIds.length,
                        detail: `${low.length} of ${clusterIds.length} below ${MIN_MONTHS} months`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate }
