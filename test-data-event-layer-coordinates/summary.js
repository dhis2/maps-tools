const fs = require('node:fs')
const path = require('node:path')
const { toCsv } = require('./csv.js')

const JSON_PATH = path.join(__dirname, 'output', 'import-summary.json')
const CSV_PATH = path.join(__dirname, 'output', 'import-summary.csv')

// Writes a summary of what was generated/imported: the counts already
// printed to the console, plus which instance and when, as both JSON
// (nested) and CSV (one row per category - metadata object types followed
// by tracker data types).
const writeImportSummary = (
    { target, dryRun, metadataCounts, trackerCounts },
    { jsonPath = JSON_PATH, csvPath = CSV_PATH } = {}
) => {
    const summary = {
        target,
        dryRun,
        timestamp: new Date().toISOString(),
        metadataCounts,
        trackerCounts,
    }

    const rows = [
        ...Object.entries(metadataCounts).map(([category, count]) => ({
            category,
            count,
        })),
        ...Object.entries(trackerCounts).map(([category, count]) => ({
            category,
            count,
        })),
    ]

    fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2))
    fs.writeFileSync(csvPath, toCsv(rows))
    return { jsonPath, csvPath }
}

module.exports = { writeImportSummary, JSON_PATH, CSV_PATH }
