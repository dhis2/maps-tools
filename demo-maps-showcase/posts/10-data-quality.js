// Post 10 · Map the data before you map the disease: reporting completeness
// and timeliness of a monthly report, by district and by facility.
const { code, dataSetSharing, uid } = require('../shared/ids.js')
const { legendSet } = require('../shared/legendSets.js')
const {
    dashboard,
    facilityLayer,
    map,
    thematicLayer,
} = require('../shared/maps.js')
const { PALETTE } = require('../shared/palette.js')
const { DEFAULT_COC, DISTRICTS, ROOT } = require('../shared/sierraLeone.js')
const { addDays, isoDate, lastMonths } = require('../periods.js')
const { randomFor } = require('../random.js')

const DEFAULT_CATEGORY_COMBO = 'bjDvmb4bfuf'
const MONTHS = 12
const TIMELY_DAYS = 15

// A data set of the tool's own, so its registrations can be planted without
// deleting the demo's registrations for other data sets
const dataSet = (facilities, importerId) => ({
    id: uid('dataSet:HMIS_MONTHLY'),
    code: code('DS_HMIS_MONTHLY'),
    name: 'Monthly HMIS report',
    shortName: 'Monthly HMIS report',
    periodType: 'Monthly',
    timelyDays: TIMELY_DAYS,
    expiryDays: 0,
    openFuturePeriods: 0,
    categoryCombo: { id: DEFAULT_CATEGORY_COMBO },
    dataSetElements: [],
    organisationUnits: facilities.map(({ id }) => ({ id })),
    sharing: dataSetSharing(importerId),
})

const DATA_SET_ID = uid('dataSet:HMIS_MONTHLY')

// On-time reports arrive within 10 days, late ones up to 45 days after the
// month ends
const ON_TIME_DAYS = 10
const LATEST_DAYS = 45

// Facilities keep their reporting habits from month to month: share of
// months reported, and share of reports sent after the deadline
const HABITS = {
    reliable: { reported: 0.998, late: 0.005 },
    sometimesLate: { reported: 0.97, late: 0.12 },
    lateReporter: { reported: 0.97, late: 0.75 },
    struggling: { reported: 0.55, late: 0.35 },
}

// Share of each district's facilities with each habit
const DEFAULT_MIX = { reliable: 0.92, sometimesLate: 0.08 }
const MIXES = {
    // Complete but late: reports arrive, after the monthly review
    tonkolili: { lateReporter: 0.8, sometimesLate: 0.2 },
    kambia: { reliable: 0.3, sometimesLate: 0.5, struggling: 0.2 },
    // A whole red district: a system problem
    koinadugu: { struggling: 0.8, sometimesLate: 0.2 },
    // Green, so its one red facility stands out
    bo: { reliable: 1 },
}
// One red facility inside a green district: a supervision visit
const RED_FACILITY_DISTRICT = 'bo'
const RED_FACILITY_HABIT = { reported: 0.25, late: 0.5 }

const districtKey = (districtId) =>
    Object.keys(DISTRICTS).find((key) => DISTRICTS[key] === districtId)

const redFacility = (facilities) =>
    facilities.find((f) => f.districtId === DISTRICTS[RED_FACILITY_DISTRICT])

const habitOf = (facility) => {
    const mix = MIXES[districtKey(facility.districtId)] ?? DEFAULT_MIX
    const draw = randomFor('post10-habit', facility.id).next()
    let cumulative = 0
    const entries = Object.entries(mix)
    const [habit] =
        entries.find(([, share]) => {
            cumulative += share
            return draw < cumulative
        }) ?? entries.at(-1)
    return HABITS[habit]
}

const generate = ({ runDate }, { facilities }) => {
    const months = lastMonths(runDate, MONTHS)
    const red = redFacility(facilities)
    const registrations = []
    facilities.forEach((facility) => {
        const profile =
            facility.id === red?.id ? RED_FACILITY_HABIT : habitOf(facility)
        months.forEach((month) => {
            const random = randomFor('post10', facility.id, month.id)
            if (!random.chance(profile.reported)) {
                return
            }
            const delay = random.chance(profile.late)
                ? random.int(TIMELY_DAYS + 1, LATEST_DAYS)
                : random.int(1, ON_TIME_DAYS)
            const date = addDays(month.end, delay)
            // Reports not sent yet on the run date
            if (date > runDate) {
                return
            }
            registrations.push({
                dataSet: DATA_SET_ID,
                period: month.id,
                organisationUnit: facility.id,
                attributeOptionCombo: DEFAULT_COC,
                date: isoDate(date),
                completed: true,
            })
        })
    })
    return { months, registrations }
}

const legendSets = {
    reporting: legendSet({
        key: 'REPORTING_RATE',
        name: 'Showcase: reporting rate (75% and 90%)',
        legends: [
            { name: 'Below 75%', start: 0, end: 75, color: PALETTE.act },
            { name: '75 to 89%', start: 75, end: 90, color: PALETTE.watch },
            {
                name: '90% and above',
                start: 90,
                end: 100,
                color: PALETTE.target,
            },
        ],
    }),
}

const reportingRate = (metric) => ({
    id: `${DATA_SET_ID}.${metric}`,
    dimensionItemType: 'REPORTING_RATE',
})

const post = {
    number: 10,
    title: 'Map the data before you map the disease',

    prepare: async ({ orgUnits }) => ({ facilities: orgUnits.facilities }),

    metadata: ({ importerId }, { facilities }) => ({
        legendSets: Object.values(legendSets),
        dataSets: [dataSet(facilities, importerId)],
    }),

    data: (ctx, state) => {
        const { months, registrations } = generate(ctx, state)
        return {
            completeDataSetRegistrations: registrations,
            registrationWindow: {
                dataSet: DATA_SET_ID,
                orgUnit: ROOT,
                startDate: isoDate(months[0].start),
                endDate: isoDate(months.at(-1).end),
            },
        }
    },

    content: (ctx, { facilities }) => {
        const completeness = map({
            key: 'post10_completeness',
            post: 10,
            title: 'Reporting completeness, last 3 months',
            description:
                'Reporting rate of the monthly HMIS report by district, one panel per month.',
            layers: [
                thematicLayer({
                    name: 'Reporting rate',
                    dataItem: reportingRate('REPORTING_RATE'),
                    periods: ['LAST_3_MONTHS'],
                    level: 2,
                    legendSet: legendSets.reporting.id,
                    renderingStrategy: 'SPLIT_BY_PERIOD',
                    labels: '{value}',
                }),
            ],
        })
        const timeliness = map({
            key: 'post10_timeliness',
            post: 10,
            title: 'Reports on time by facility, last 6 months',
            description:
                'Share of months each facility reported by the deadline, over all facilities.',
            layers: [
                facilityLayer({ name: 'Facilities' }),
                thematicLayer({
                    name: 'Reporting rate on time',
                    dataItem: reportingRate('REPORTING_RATE_ON_TIME'),
                    periods: ['LAST_6_MONTHS'],
                    level: 4,
                    legendSet: legendSets.reporting.id,
                }),
            ],
        })

        const red = redFacility(facilities)
        const tonkolili = ctx.districtName(DISTRICTS.tonkolili)
        const koinadugu = ctx.districtName(DISTRICTS.koinadugu)

        return {
            maps: [
                { map: completeness, teams: ['hmis'] },
                { map: timeliness, teams: ['hmis'] },
            ],
            dashboards: [
                dashboard({
                    key: 'post10',
                    post: 10,
                    title: 'Data quality review',
                    maps: [completeness, timeliness],
                }),
            ],
            interpretations: [
                {
                    map: timeliness.id,
                    author: 'hmis_officer',
                    text: `${
                        red.name
                    } reported only a few of the last six months, while the rest of ${ctx.districtName(
                        DISTRICTS[RED_FACILITY_DISTRICT]
                    )} is on time. @show_facility_incharge can we schedule a supervision visit this month? ${tonkolili} reports are complete but mostly after the deadline, and ${koinadugu} is red across the district: connectivity or staffing, to raise at the review meeting. (Synthetic data)`,
                    comments: [
                        {
                            author: 'facility_incharge',
                            text: 'The data clerk post has been vacant since June. We will send the backlog this week and agree a date for the visit.',
                        },
                    ],
                },
            ],
        }
    },

    checks: (ctx, { facilities }) => {
        const districts = Object.values(DISTRICTS).join(';')
        const red = redFacility(facilities)
        const rates = (rows) => {
            const values = {}
            rows.forEach(([dx, ou, value]) => {
                values[ou] = values[ou] || {}
                values[ou][dx.split('.')[1]] = Number(value)
            })
            return values
        }
        // The 6 latest months whose late reports have all arrived
        const settled = lastMonths(ctx.runDate, MONTHS)
            .filter(({ end }) => addDays(end, LATEST_DAYS) <= ctx.runDate)
            .slice(-6)
            .map(({ id }) => id)
        return [
            {
                name: 'Tonkolili is complete but late; Koinadugu is red',
                path: `/api/analytics?dimension=dx:${DATA_SET_ID}.REPORTING_RATE;${DATA_SET_ID}.REPORTING_RATE_ON_TIME&dimension=ou:${districts}&filter=pe:${settled.join(
                    ';'
                )}&skipMeta=true`,
                evaluate: (rows) => {
                    const values = rates(rows)
                    const t = values[DISTRICTS.tonkolili] || {}
                    const k = values[DISTRICTS.koinadugu] || {}
                    const ok =
                        t.REPORTING_RATE >= 90 &&
                        t.REPORTING_RATE_ON_TIME < 75 &&
                        k.REPORTING_RATE < 75
                    return {
                        ok,
                        detail: `Tonkolili ${JSON.stringify(
                            t
                        )}, Koinadugu ${JSON.stringify(k)}`,
                    }
                },
            },
            {
                name: 'One red facility inside a green district',
                path: `/api/analytics?dimension=dx:${DATA_SET_ID}.REPORTING_RATE&dimension=ou:${red.id};${DISTRICTS[RED_FACILITY_DISTRICT]}&filter=pe:LAST_12_MONTHS&skipMeta=true`,
                evaluate: (rows) => {
                    const values = rates(rows)
                    const facility = values[red.id]?.REPORTING_RATE
                    const district =
                        values[DISTRICTS[RED_FACILITY_DISTRICT]]?.REPORTING_RATE
                    return {
                        ok: facility < 75 && district >= 90,
                        detail: `${red.name} ${facility}%, district ${district}%`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate }
