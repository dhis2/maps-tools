const fs = require('node:fs')
const path = require('node:path')
const { toCsv } = require('./csv.js')

const SUMMARY_JSON_PATH = path.join(__dirname, 'output', 'verify-summary.json')
const SUMMARY_CSV_PATH = path.join(__dirname, 'output', 'verify-summary.csv')
const DETAILS_JSON_PATH = path.join(__dirname, 'output', 'verify-details.json')
const DETAILS_CSV_PATH = path.join(__dirname, 'output', 'verify-details.csv')

// Writes the verify.js run as both JSON and CSV, at two granularities:
// - summary: one row per coordinateField/fallbackCoordinateField
//   combination tested, with pass/fail counts.
// - details: one row per event checked within each combination - the full
//   audit trail behind the summary, filterable/sortable in a spreadsheet.
const writeVerifyReport = (
    { mode, target, caseSummaries, details },
    {
        summaryJsonPath = SUMMARY_JSON_PATH,
        summaryCsvPath = SUMMARY_CSV_PATH,
        detailsJsonPath = DETAILS_JSON_PATH,
        detailsCsvPath = DETAILS_CSV_PATH,
    } = {}
) => {
    const summaryReport = {
        target,
        mode,
        timestamp: new Date().toISOString(),
        totalPass: caseSummaries.reduce((sum, c) => sum + c.passed, 0),
        totalFail: caseSummaries.reduce((sum, c) => sum + c.failed, 0),
        cases: caseSummaries,
    }

    fs.mkdirSync(path.dirname(summaryJsonPath), { recursive: true })
    fs.writeFileSync(summaryJsonPath, JSON.stringify(summaryReport, null, 2))
    fs.writeFileSync(summaryCsvPath, toCsv(caseSummaries))
    fs.writeFileSync(detailsJsonPath, JSON.stringify(details, null, 2))
    fs.writeFileSync(detailsCsvPath, toCsv(details))

    return { summaryJsonPath, summaryCsvPath, detailsJsonPath, detailsCsvPath }
}

module.exports = {
    writeVerifyReport,
    SUMMARY_JSON_PATH,
    SUMMARY_CSV_PATH,
    DETAILS_JSON_PATH,
    DETAILS_CSV_PATH,
}
