const pad = (n) => String(n).padStart(2, '0')

const isoDate = (date) => date.toISOString().slice(0, 10)

const addDays = (date, days) => {
    const copy = new Date(date)
    copy.setUTCDate(copy.getUTCDate() + days)
    return copy
}

// The n months before the run date's month, oldest first, as DHIS2 monthly
// periods. The run date's own month is left out, as in LAST_12_MONTHS.
const lastMonths = (runDate, n) => {
    const year = runDate.getUTCFullYear()
    const month = runDate.getUTCMonth()
    return Array.from({ length: n }, (_, i) => {
        const start = new Date(Date.UTC(year, month - n + i, 1))
        const end = new Date(
            Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)
        )
        return {
            id: `${start.getUTCFullYear()}${pad(start.getUTCMonth() + 1)}`,
            year: start.getUTCFullYear(),
            month: start.getUTCMonth() + 1,
            start,
            end,
        }
    })
}

module.exports = { addDays, isoDate, lastMonths }
