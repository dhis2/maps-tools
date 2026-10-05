const escapeCsvValue = (value) => {
    if (value === null || value === undefined) {
        return ''
    }
    const str = String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

// Converts an array of flat objects into a CSV string. Columns are taken
// from the first row's keys - callers must ensure every row has the same
// shape (fill missing fields with '' rather than omitting the key).
const toCsv = (rows) => {
    if (!rows.length) {
        return ''
    }
    const columns = Object.keys(rows[0])
    const lines = rows.map((row) =>
        columns.map((col) => escapeCsvValue(row[col])).join(',')
    )
    return [columns.join(','), ...lines].join('\n') + '\n'
}

module.exports = { toCsv }
