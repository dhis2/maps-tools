// Every DHIS2 period type, with period ids and start and end dates in the
// ISO calendar. Pure: no server calls. The rules were read off the server
// (analytics metadata gives each period's dates), and period-types.test.js
// pins them against those answers.
const DAY_MS = 24 * 60 * 60 * 1000

const toDate = (isoDate) => new Date(`${isoDate}T00:00:00Z`)
const formatDate = (date) => date.toISOString().slice(0, 10)
const addDays = (isoDate, days) =>
    formatDate(new Date(toDate(isoDate).getTime() + days * DAY_MS))
const pad = (number) => String(number).padStart(2, '0')

// Month 1 to 12 of `year`, rolled over into later or earlier years.
const firstOfMonth = (year, month) => {
    const date = new Date(Date.UTC(year, month - 1, 1))
    return formatDate(date)
}
const lastOfMonth = (year, month) =>
    formatDate(new Date(Date.UTC(year, month, 0)))

// Days from start to end, both included.
const daysBetween = (startDate, endDate) =>
    Math.round((toDate(endDate) - toDate(startDate)) / DAY_MS) + 1

const periodDays = (period) => daysBetween(period.startDate, period.endDate)

// Week 1 of a year is the week that holds 4 January, for every week start.
const firstWeekStart = (year, weekStartDay) => {
    const jan4 = toDate(`${year}-01-04`)
    const offset = (jan4.getUTCDay() - weekStartDay + 7) % 7
    return addDays(`${year}-01-04`, -offset)
}

const weeksOfYear = (year, weekStartDay, prefix) => {
    const start = firstWeekStart(year, weekStartDay)
    const nextStart = firstWeekStart(year + 1, weekStartDay)
    const count = (daysBetween(start, nextStart) - 1) / 7
    const periods = []
    for (let week = 0; week < count; week++) {
        const startDate = addDays(start, week * 7)
        periods.push({
            id: `${year}${prefix}W${week + 1}`,
            startDate,
            endDate: addDays(startDate, 6),
        })
    }
    return periods
}

// Bi-weeks follow Monday weeks. A year with 53 weeks gets a 27th bi-week
// that runs into the next year's first bi-week, as the server does
// (2020BiW27 is 2020-12-28 to 2021-01-10).
const biWeeksOfYear = (year) => {
    const weekCount = weeksOfYear(year, 1, '').length
    const start = firstWeekStart(year, 1)
    return Array.from({ length: Math.ceil(weekCount / 2) }, (_, index) => {
        const startDate = addDays(start, index * 14)
        return {
            id: `${year}BiW${index + 1}`,
            startDate,
            endDate: addDays(startDate, 13),
        }
    })
}

const daysOfYear = (year) => {
    const periods = []
    for (
        let date = `${year}-01-01`;
        date <= `${year}-12-31`;
        date = addDays(date, 1)
    ) {
        periods.push({
            id: date.replace(/-/g, ''),
            startDate: date,
            endDate: date,
        })
    }
    return periods
}

// Periods made of whole months. `startMonth` and `startYearOffset` place the
// first period of the year the id names: `2024Nov` starts in November 2023,
// while `2024April` starts in April 2024.
const monthPeriodsOfYear = (
    year,
    { months, startMonth, startYearOffset = 0, id }
) =>
    Array.from({ length: 12 / months }, (_, index) => {
        const firstMonth = startMonth + index * months
        const lastMonth = firstMonth + months - 1
        return {
            id: id(year, index + 1),
            startDate: firstOfMonth(year + startYearOffset, firstMonth),
            endDate: lastOfMonth(year + startYearOffset, lastMonth),
        }
    })

const financial = (name, startMonth, suffix, startYearOffset = 0) => ({
    name,
    frequencyOrder: 365,
    enterable: true,
    pattern: new RegExp(`^\\d{4}${suffix}$`),
    periodsOfYear: (year) =>
        monthPeriodsOfYear(year, {
            months: 12,
            startMonth,
            startYearOffset,
            id: (y) => `${y}${suffix}`,
        }),
})

const weekly = (name, weekStartDay, prefix) => ({
    name,
    frequencyOrder: 7,
    enterable: true,
    pattern: new RegExp(`^\\d{4}${prefix}W\\d{1,2}$`),
    periodsOfYear: (year) => weeksOfYear(year, weekStartDay, prefix),
})

const monthBased = (name, frequencyOrder, pattern, options) => ({
    name,
    frequencyOrder,
    enterable: true,
    pattern,
    periodsOfYear: (year) => monthPeriodsOfYear(year, options),
})

const PERIOD_TYPES = [
    {
        name: 'Daily',
        frequencyOrder: 1,
        enterable: true,
        pattern: /^\d{8}$/,
        periodsOfYear: daysOfYear,
    },
    weekly('Weekly', 1, ''),
    weekly('WeeklyWednesday', 3, 'Wed'),
    weekly('WeeklyThursday', 4, 'Thu'),
    weekly('WeeklyFriday', 5, 'Fri'),
    weekly('WeeklySaturday', 6, 'Sat'),
    weekly('WeeklySunday', 0, 'Sun'),
    {
        name: 'BiWeekly',
        frequencyOrder: 14,
        enterable: true,
        pattern: /^\d{4}BiW\d{1,2}$/,
        periodsOfYear: biWeeksOfYear,
    },
    monthBased('Monthly', 30, /^\d{6}$/, {
        months: 1,
        startMonth: 1,
        id: (year, n) => `${year}${pad(n)}`,
    }),
    monthBased('BiMonthly', 61, /^\d{4}0[1-6]B$/, {
        months: 2,
        startMonth: 1,
        id: (year, n) => `${year}0${n}B`,
    }),
    monthBased('Quarterly', 91, /^\d{4}Q[1-4]$/, {
        months: 3,
        startMonth: 1,
        id: (year, n) => `${year}Q${n}`,
    }),
    monthBased('QuarterlyNov', 91, /^\d{4}NovQ[1-4]$/, {
        months: 3,
        startMonth: 11,
        startYearOffset: -1,
        id: (year, n) => `${year}NovQ${n}`,
    }),
    monthBased('SixMonthly', 182, /^\d{4}S[12]$/, {
        months: 6,
        startMonth: 1,
        id: (year, n) => `${year}S${n}`,
    }),
    monthBased('SixMonthlyApril', 182, /^\d{4}AprilS[12]$/, {
        months: 6,
        startMonth: 4,
        id: (year, n) => `${year}AprilS${n}`,
    }),
    monthBased('SixMonthlyNov', 182, /^\d{4}NovS[12]$/, {
        months: 6,
        startMonth: 11,
        startYearOffset: -1,
        id: (year, n) => `${year}NovS${n}`,
    }),
    monthBased('Yearly', 365, /^\d{4}$/, {
        months: 12,
        startMonth: 1,
        id: (year) => `${year}`,
    }),
    financial('FinancialApril', 4, 'April'),
    financial('FinancialJuly', 7, 'July'),
    financial('FinancialOct', 10, 'Oct'),
    financial('FinancialNov', 11, 'Nov', -1),
    financial('FinancialFeb', 2, 'Feb'),
    financial('FinancialAug', 8, 'Aug'),
    financial('FinancialSep', 9, 'Sep'),
    // No ISO format on the server: it can't be entered or queried by id.
    {
        name: 'TwoYearly',
        frequencyOrder: 730,
        enterable: false,
        pattern: null,
        periodsOfYear: () => [],
    },
]

const PERIOD_TYPE_NAMES = PERIOD_TYPES.map((type) => type.name)
const ENTERABLE_PERIOD_TYPE_NAMES = PERIOD_TYPES.filter(
    (type) => type.enterable
).map((type) => type.name)

const getPeriodType = (name) => {
    const type = PERIOD_TYPES.find((candidate) => candidate.name === name)
    if (!type) {
        throw new Error(`Unknown period type: ${name}`)
    }
    return type
}

const frequencyOrder = (name) => getPeriodType(name).frequencyOrder

const overlaps = (a, b) => a.startDate <= b.endDate && b.startDate <= a.endDate
const contains = (outer, inner) =>
    outer.startDate <= inner.startDate && inner.endDate <= outer.endDate

// Cached: the cases look periods up tens of thousands of times.
const yearCache = new Map()
const periodsOfYear = (type, year) => {
    const key = `${type.name}:${year}`
    if (!yearCache.has(key)) {
        yearCache.set(key, type.periodsOfYear(year))
    }
    return yearCache.get(key)
}

// Every period of a type that overlaps the range, oldest first.
const periodsOverlapping = (typeName, startDate, endDate) => {
    const type = getPeriodType(typeName)
    const range = { startDate, endDate }
    const firstYear = Number(startDate.slice(0, 4)) - 1
    const lastYear = Number(endDate.slice(0, 4)) + 1
    const periods = []
    for (let year = firstYear; year <= lastYear; year++) {
        periods.push(...periodsOfYear(type, year))
    }
    return periods
        .filter((period) => overlaps(period, range))
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

const periodsInside = (typeName, startDate, endDate) =>
    periodsOverlapping(typeName, startDate, endDate).filter((period) =>
        contains({ startDate, endDate }, period)
    )

const periodContaining = (typeName, isoDate) =>
    periodsOverlapping(typeName, isoDate, isoDate)[0] ?? null

const periodTypeOfId = (id) =>
    PERIOD_TYPES.find((type) => type.pattern?.test(id))?.name ?? null

const periodFromId = (id) => {
    const typeName = periodTypeOfId(id)
    if (!typeName) {
        return null
    }
    const year = Number(id.slice(0, 4))
    const type = getPeriodType(typeName)
    const period = [year - 1, year, year + 1]
        .flatMap((y) => periodsOfYear(type, y))
        .find((candidate) => candidate.id === id)
    return period ? { ...period, periodType: typeName } : null
}

// The period of the same type just before, as `.periodOffset(-1)` reads it.
const previousPeriod = (typeName, period) => {
    const before = addDays(period.startDate, -1)
    return periodContaining(typeName, before)
}

module.exports = {
    ENTERABLE_PERIOD_TYPE_NAMES,
    PERIOD_TYPES,
    PERIOD_TYPE_NAMES,
    addDays,
    contains,
    daysBetween,
    frequencyOrder,
    getPeriodType,
    overlaps,
    periodContaining,
    periodDays,
    periodFromId,
    periodTypeOfId,
    periodsInside,
    periodsOverlapping,
    previousPeriod,
}
