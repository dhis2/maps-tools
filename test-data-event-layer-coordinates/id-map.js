const fs = require('node:fs')
const path = require('node:path')
const { toCsv } = require('./csv.js')

// Every flag that can appear across any scenario entry - event-program
// entries only carry the first 4, standalone-event entries in scenarioIndex
// of type 'enrollment' only carry the last 4. Fixed so every CSV row has
// the same columns (missing ones written as '').
const FLAG_COLUMNS = [
    'eventGeometry',
    'orgUnitHasGeometry',
    'deCoordinate',
    'deOrgUnit',
    'teiGeometry',
    'enrollmentGeometry',
    'teaCoordinate',
    'teaOrgUnit',
]

const toCsvRow = (entry) => {
    const row = {
        type: entry.type,
        program: entry.program,
        eventId: entry.eventId ?? '',
        enrollmentId: entry.enrollmentId ?? '',
        trackedEntityId: entry.trackedEntityId ?? '',
        orgUnit: entry.orgUnit,
        scenarioCode: entry.scenarioCode,
    }
    FLAG_COLUMNS.forEach((flag) => {
        row[flag] = flag in entry.flags ? entry.flags[flag] : ''
    })
    return row
}

// Writes the tester-facing cross-reference of every generated event
// (standalone or under an enrollment): its ids, org unit, scenario code and
// boolean flags, so a tester can pick a specific event in the maps-app and
// know exactly which geometry sources it has data for. Written as both
// JSON (nested, easy to grep/jq) and CSV (flat, easy to filter/sort in a
// spreadsheet).
const writeScenarioIndex = (scenarioIndex, { jsonPath, csvPath }) => {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
    fs.writeFileSync(jsonPath, JSON.stringify(scenarioIndex, null, 2))
    fs.writeFileSync(csvPath, toCsv(scenarioIndex.map(toCsvRow)))
    return { jsonPath, csvPath }
}

module.exports = { writeScenarioIndex }
