// Optional: verifies an instance again and compares with its observations
// in input/, to show that a second run gives the same answers. GET only.
// The new run replaces input/<instance>/ (git shows the change); the
// earlier one is kept in output/repeat-before/<instance>/.
const fs = require('node:fs')
const path = require('node:path')
const { getConfig } = require('./config.js')
const { INPUT_DIR, fromRow } = require('./observations.js')
const verify = require('./verify.js')

const BEFORE_DIR = path.join(__dirname, 'output', 'repeat-before')
const TOLERANCE = 1e-6

const sameObserved = (a, b) =>
    a.status === b.status &&
    (a.value === b.value ||
        (typeof a.value === 'number' &&
            typeof b.value === 'number' &&
            Math.abs(a.value - b.value) <=
                TOLERANCE * Math.max(1, Math.abs(b.value))))

// Cases whose observation changed, counted by the first part of their id.
const compareRows = (beforeRows, afterRows) => {
    const before = new Map(beforeRows.map((row) => [row[0], fromRow(row)]))
    const changed = {}
    afterRows.map(fromRow).forEach((after) => {
        const earlier = before.get(after.id)
        if (!earlier || !sameObserved(earlier.observed, after.observed)) {
            const head = after.id.split('__')[0]
            changed[head] = (changed[head] ?? 0) + 1
        }
    })
    return changed
}

const run = async (config = getConfig()) => {
    const resultsDir = path.join(INPUT_DIR, config.instance)
    if (!fs.existsSync(resultsDir)) {
        throw new Error(
            `No observations for ${config.instance}: run verify.js first.`
        )
    }
    const beforeDir = path.join(BEFORE_DIR, config.instance)
    fs.rmSync(beforeDir, { recursive: true, force: true })
    fs.cpSync(resultsDir, beforeDir, { recursive: true })

    await verify.run(config)

    const report = {}
    fs.readdirSync(beforeDir).forEach((file) => {
        const before = JSON.parse(fs.readFileSync(path.join(beforeDir, file)))
        const after = JSON.parse(fs.readFileSync(path.join(resultsDir, file)))
        report[file.replace('.json', '')] = compareRows(before.rows, after.rows)
    })
    console.log('\nCases that changed since the last run, by kind:')
    Object.entries(report).forEach(([group, changed]) =>
        console.log(
            `  ${group}: ${
                Object.keys(changed).length ? JSON.stringify(changed) : 'none'
            }`
        )
    )
    console.log(
        'FIRST_FIRST_ORG_UNIT and LAST_LAST_ORG_UNIT at the region pick a place at random (finding 4).'
    )
    return report
}

if (require.main === module) {
    run().catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { compareRows, run }
