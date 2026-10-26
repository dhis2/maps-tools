// Times the two requests the maps-app tracked entity layer can make, for
// every dataset: the tracker API (2.40 and the old loader) and tracker
// analytics (the new loader, 2.41+). GET only, so it runs on any server.
// Writes results/<instance>/benchmark.json and REPORT.md.
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { selectDatasets } = require('./datasets.js')
const { getRootOrgUnit } = require('./facilities.js')
const { datasetIds } = require('./metadata.js')

// The page size of the maps-app analytics loader (TEI_CLIENT_PAGE_SIZE)
const ANALYTICS_PAGE_SIZE = 50000

// Both requests as the maps-app loaders send them, all org units below root
// The analytics id column was renamed in 2.42 (maps-app versionToggle.js)
const analyticsIdColumn = (version) =>
    Number(String(version).split('.')[1]) >= 42
        ? 'trackedentity'
        : 'trackedentityinstanceuid'

const buildCases = (dataset, root, version) => {
    const { trackedEntityType, program } = datasetIds(dataset)
    return [
        {
            name: 'tracker',
            label: 'Tracker API (old loader)',
            path: `/api/tracker/trackedEntities?fields=trackedEntity~rename(id),geometry,relationships&program=${program}&orgUnits=${root}&orgUnitMode=DESCENDANTS&paging=false`,
            countRows: (json) =>
                (json.trackedEntities ?? json.instances ?? []).length,
        },
        {
            name: 'analytics',
            label: 'Analytics (new loader)',
            path: `/api/analytics/trackedEntities/query/${trackedEntityType}.json?dimension=ou:${root}&ouMode=DESCENDANTS&headers=${analyticsIdColumn(
                version
            )},geometry&geometryOnly=true&program=${program}&pageSize=${ANALYTICS_PAGE_SIZE}`,
            countRows: (json) => (json.rows ?? []).length,
        },
    ]
}

const median = (values) => {
    if (!values.length) {
        return null
    }
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2
}

const measure = async (client, testCase, repeats, timeoutMs) => {
    const runs = []
    for (let i = 0; i < repeats; i++) {
        const started = performance.now()
        try {
            const res = await client.send('GET', testCase.path, undefined, {
                timeoutMs,
            })
            runs.push({
                ms: Math.round(performance.now() - started),
                status: res.status,
                bytes: res.bytes,
                rows: res.ok ? testCase.countRows(res.json) : null,
                error: res.ok
                    ? null
                    : (res.json?.message ?? `HTTP ${res.status}`),
            })
        } catch (err) {
            runs.push({
                ms: Math.round(performance.now() - started),
                status: null,
                bytes: null,
                rows: null,
                error: err.name === 'TimeoutError' ? 'timeout' : err.message,
            })
        }
        // A failure would repeat: no point waiting for it again
        if (runs.at(-1).error) {
            break
        }
    }
    const ok = runs.filter((run) => !run.error)
    return {
        runs,
        medianMs: median(ok.map((run) => run.ms)),
        bytes: ok[0]?.bytes ?? null,
        rows: ok[0]?.rows ?? null,
        error: runs.find((run) => run.error)?.error ?? null,
    }
}

const formatBytes = (bytes) =>
    bytes === null ? '' : `${(bytes / 1024 / 1024).toFixed(1)} MB`

const formatMs = (ms) => (ms === null ? '' : `${(ms / 1000).toFixed(2)} s`)

const buildReport = ({ baseUrl, version, date, repeats, results }) => {
    const lines = [
        '# Tracked entity layer: API benchmark',
        '',
        `Server: ${baseUrl} (${version}), ${date}. Median of ${repeats} runs, all org units below the root.`,
        '',
        '| Dataset | Request | Rows | Size | Median time | Error |',
        '| --- | --- | --- | --- | --- | --- |',
    ]
    results.forEach(({ dataset, cases }) =>
        cases.forEach(({ label, rows, bytes, medianMs, error }) =>
            lines.push(
                `| ${dataset} | ${label} | ${rows ?? ''} | ${formatBytes(
                    bytes
                )} | ${formatMs(medianMs)} | ${error ?? ''} |`
            )
        )
    )
    return lines.join('\n') + '\n'
}

const run = async (config = getConfig()) => {
    const client = createClient(config)
    const { version } = await client.get('/api/system/info.json')
    const root = await getRootOrgUnit(client)
    const datasets = selectDatasets(config.datasets)
    console.log(`Target: ${config.baseUrl} (${version}), root ${root.name}.`)

    const results = []
    for (const dataset of datasets) {
        const cases = []
        for (const testCase of buildCases(dataset, root.id, version)) {
            const result = await measure(
                client,
                testCase,
                config.repeats,
                config.timeoutSeconds * 1000
            )
            console.log(
                `  ${dataset.key} ${testCase.name}: ${result.rows ?? '-'} rows, ${formatBytes(
                    result.bytes
                )}, ${formatMs(result.medianMs)}${
                    result.error ? ` (${result.error})` : ''
                }`
            )
            cases.push({
                name: testCase.name,
                label: testCase.label,
                ...result,
            })
        }
        results.push({ dataset: dataset.key, count: dataset.count, cases })
    }

    const summary = {
        baseUrl: config.baseUrl,
        version,
        date: new Date().toISOString(),
        repeats: config.repeats,
        results,
    }
    const dir = path.join(__dirname, 'results', config.instance)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
        path.join(dir, 'benchmark.json'),
        JSON.stringify(summary, null, 2)
    )
    fs.writeFileSync(path.join(dir, 'REPORT.md'), buildReport(summary))
    console.log(`Wrote results/${config.instance}/`)
    return summary
}

if (require.main === module) {
    run().catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { buildCases, buildReport, median, run }
