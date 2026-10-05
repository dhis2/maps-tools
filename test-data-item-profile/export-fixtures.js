/*
 * Writes the fixtures the library tests read, in the agreed format
 * (schemaVersion 1): fixtures/period-types/<group>.json, one case per line,
 * with every version's observation and verdict, and metadata-shapes.json.
 * Also the smoke subset the library keeps in its repo, in
 * fixtures/period-types-smoke/ (smoke.js).
 */
const fs = require('node:fs')
const path = require('node:path')
const { loadAll } = require('./evaluate.js')
const { toolVersion } = require('./tool-version.js')
const { periodFromId } = require('./period-types.js')
const {
    GROUP_MODULES,
    buildHierarchy,
    buildScenarios,
} = require('./scenarios.js')
const { buildSmokeFixture, buildSmokeShapes } = require('./smoke.js')

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'period-types')
const SMOKE_DIR = path.join(__dirname, 'fixtures', 'period-types-smoke')

// Pretty at the top, one line per case: readable, diffable, and small.
const stringifyFixture = ({ cases, ...rest }) => {
    const head = JSON.stringify(rest, null, 4).replace(/\n}$/, '')
    const lines = cases.map((c) => `        ${JSON.stringify(c)}`)
    return `${head},\n    "cases": [\n${lines.join(',\n')}\n    ]\n}\n`
}

const buildGroupFixture = (key, runs) => {
    const groupRuns = runs.filter((run) => run.groups[key])
    const byId = new Map()
    groupRuns.forEach((run) =>
        run.groups[key].cases.forEach(({ testCase, observed, verdict }) => {
            if (!byId.has(testCase.id)) {
                byId.set(testCase.id, {
                    id: testCase.id,
                    item: testCase.item,
                    query: testCase.query,
                    expected: testCase.expected,
                    observed: {},
                    verdict: {},
                })
            }
            const entry = byId.get(testCase.id)
            entry.observed[run.version] = observed
            entry.verdict[run.version] = verdict
        })
    )
    const findings = Object.fromEntries(
        groupRuns
            .filter((run) => run.groups[key].findings)
            .map((run) => [run.version, run.groups[key].findings])
    )
    return {
        schemaVersion: 1,
        group: key,
        provisional: false,
        // Verdicts are recomputed now, so this version explains them.
        source: toolVersion(),
        runs: groupRuns.map((run) => ({
            instance: run.instance,
            version: run.version,
            date: run.date,
        })),
        ...(Object.keys(findings).length ? { findings } : {}),
        cases: [...byId.values()],
    }
}

/*
 * Group 1 is 60,000 cases, about 55 MB with every version: one file per
 * aggregation type in a folder named after the group, each a full fixture
 * with a `part`. Other groups keep one file.
 */
const SPLIT_BY_AGGREGATION = ['aggregation-by-period-type']

const splitFixture = (fixture, dir) => {
    if (!SPLIT_BY_AGGREGATION.includes(fixture.group)) {
        return [
            {
                file: path.join(dir, `${fixture.group}.json`),
                content: fixture,
            },
        ]
    }
    const parts = [...new Set(fixture.cases.map((c) => c.item.aggregationType))]
    return parts.map((part) => ({
        file: path.join(dir, fixture.group, `${part}.json`),
        content: {
            ...fixture,
            part,
            cases: fixture.cases.filter((c) => c.item.aggregationType === part),
        },
    }))
}

// The groups whose verify records metadata responses (6 and 15).
const SHAPE_GROUPS = ['detection-requests', 'org-unit-requests']

const buildMetadataShapes = (runs) => {
    const shapeRuns = runs.filter((run) => run.groups['detection-requests'])
    return {
        schemaVersion: 1,
        source: toolVersion(),
        versions: Object.fromEntries(
            shapeRuns.map((run) => [
                run.version,
                {
                    instance: run.instance,
                    date: run.date,
                    requests: SHAPE_GROUPS.flatMap(
                        (key) => run.groups[key]?.responses ?? []
                    ),
                },
            ])
        ),
    }
}

// The org unit groups (8 to 15) have their own folders.
const DIRS = {
    'period-types': { full: FIXTURES_DIR, smoke: SMOKE_DIR },
    'org-units': {
        full: path.join(__dirname, 'fixtures', 'org-units'),
        smoke: path.join(__dirname, 'fixtures', 'org-units-smoke'),
    },
}

const run = () => {
    const runs = loadAll()
    if (!runs.length) {
        throw new Error('No observations in input/: run verify.js first.')
    }
    Object.values(DIRS).forEach(({ full, smoke }) => {
        fs.mkdirSync(full, { recursive: true })
        fs.mkdirSync(smoke, { recursive: true })
    })
    const hierarchy = buildHierarchy(
        buildScenarios(runs[0].header.serverInfo).shared
    )
    GROUP_MODULES.forEach(({ KEY }) => {
        const present = runs.filter((r) => r.groups[KEY])
        // A group still being worked out stays local.
        if (
            !present.length ||
            present[0].groups[KEY].group.exported === false
        ) {
            return
        }
        const set = present[0].groups[KEY].group.fixtureSet ?? 'period-types'
        const base = buildGroupFixture(KEY, runs)
        const fixture = set === 'org-units' ? { ...base, hierarchy } : base
        splitFixture(fixture, DIRS[set].full).forEach(({ file, content }) => {
            fs.mkdirSync(path.dirname(file), { recursive: true })
            writeFixture(file, content)
        })
        writeFixture(
            path.join(DIRS[set].smoke, `${KEY}.json`),
            buildSmokeFixture(fixture, { startOf })
        )
    })
    const shapes = buildMetadataShapes(runs)
    fs.writeFileSync(
        path.join(FIXTURES_DIR, 'metadata-shapes.json'),
        JSON.stringify(shapes, null, 4) + '\n'
    )
    fs.writeFileSync(
        path.join(SMOKE_DIR, 'metadata-shapes.json'),
        JSON.stringify(buildSmokeShapes(shapes), null, 4) + '\n'
    )
    console.log(`Wrote ${FIXTURES_DIR} and ${SMOKE_DIR}`)
}

const writeFixture = (file, content) => {
    fs.writeFileSync(file, stringifyFixture(content))
    const size = (fs.statSync(file).size / 1e6).toFixed(2)
    console.log(
        `${path.relative(path.dirname(FIXTURES_DIR), file)}: ${
            content.cases.length
        } cases, ${size} MB`
    )
}

const startOf = (periodId) => periodFromId(periodId)?.startDate ?? ''

if (require.main === module) {
    try {
        run()
    } catch (err) {
        console.error(err)
        process.exitCode = 1
    }
}

module.exports = { buildGroupFixture, run, stringifyFixture }
