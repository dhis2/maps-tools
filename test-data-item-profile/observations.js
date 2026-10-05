/*
 * The tool's input: what each server answered, in input/<instance>/<group>.json
 * (committed). verify.js writes these files; everything else (verdicts,
 * report, fixtures) is computed from them and the code, offline.
 *
 * A file holds only what can't be recomputed:
 * - the run: instance, version, revision, date;
 * - the server facts the cases depend on (`serverInfo`) and the period date
 *   check;
 * - one row per case: [id, status, value], then error and extras when
 *   there are any;
 * - `responses`: the metadata responses of groups 6 and 15.
 */
const fs = require('node:fs')
const path = require('node:path')

const INPUT_DIR = path.join(__dirname, 'input')
const SCHEMA_VERSION = 1

const fileOf = (instance, group) =>
    path.join(INPUT_DIR, instance, `${group}.json`)

const toRow = (testCase, { status, value, error, extra }) => {
    const row = [testCase.id, status, value ?? null]
    if (error || extra) {
        row.push(error ?? null)
    }
    if (extra) {
        row.push(extra)
    }
    return row
}

const fromRow = ([id, status, value, error, extra]) => ({
    id,
    observed: {
        status,
        value,
        ...(error ? { error } : {}),
        ...(extra ?? {}),
    },
})

// One row per line: diffs between runs show case by case.
const stringify = ({ rows, ...header }) => {
    const head = JSON.stringify(
        { schemaVersion: SCHEMA_VERSION, ...header },
        null,
        4
    ).replace(/\n}$/, '')
    const lines = rows.map((row) => `        ${JSON.stringify(row)}`)
    return `${head},\n    "rows": [\n${lines.join(',\n')}\n    ]\n}\n`
}

const writeObservations = (instance, group, content) => {
    const file = fileOf(instance, group)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, stringify(content))
    return file
}

const readObservations = (instance, group) => {
    const file = fileOf(instance, group)
    return fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, 'utf8'))
        : null
}

const listInstances = () =>
    fs.existsSync(INPUT_DIR)
        ? fs
              .readdirSync(INPUT_DIR, { withFileTypes: true })
              .filter((entry) => entry.isDirectory())
              .map((entry) => entry.name)
              .sort()
        : []

module.exports = {
    INPUT_DIR,
    fromRow,
    listInstances,
    readObservations,
    toRow,
    writeObservations,
}
