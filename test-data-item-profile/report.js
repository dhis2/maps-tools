// Summarizes every run in input/: verdicts per group and version,
// the patterns of failing cases, and what differs between versions.
// Writes results/summary.json and results/REPORT.md, both committed.
const fs = require('node:fs')
const path = require('node:path')
const { countBy, loadAll, patternOf } = require('./evaluate.js')
const { explain } = require('./known-differences.js')
const { GROUP_MODULES } = require('./scenarios.js')
const { toolVersion } = require('./tool-version.js')

// The committed summaries.
const SUMMARY_DIR = path.join(__dirname, 'results')

const TOLERANCE = 1e-6

const sameObserved = (a, b) =>
    a.status === b.status &&
    (a.value === b.value ||
        (typeof a.value === 'number' &&
            typeof b.value === 'number' &&
            Math.abs(a.value - b.value) <=
                TOLERANCE * Math.max(1, Math.abs(b.value))))

const failPatterns = (cases) =>
    countBy(
        cases.filter((c) => c.verdict === 'fail'),
        ({ testCase, observed }) => {
            const valueOnly = testCase.expected.status === observed.status
            return `${patternOf(testCase)} | ${testCase.expected.status} → ${
                observed.status
            }${valueOnly ? ' (value)' : ''}`
        }
    )

// Cases whose observed status or value isn't the same on every version.
const differences = (runs, key) => {
    const byId = new Map()
    runs.forEach((run) =>
        (run.groups[key]?.cases ?? []).forEach((c) => {
            if (!byId.has(c.testCase.id)) {
                byId.set(c.testCase.id, { testCase: c.testCase, byVersion: {} })
            }
            byId.get(c.testCase.id).byVersion[run.version] = c.observed
        })
    )
    const differing = [...byId.values()].filter(({ byVersion }) => {
        const observed = Object.values(byVersion)
        return observed.some((o) => !sameObserved(o, observed[0]))
    })
    const byPattern = {}
    differing.forEach(({ testCase, byVersion }) => {
        const entries = Object.entries(byVersion)
        const statusDiffers = entries.some(
            ([, o]) => o.status !== entries[0][1].status
        )
        const explainedBy = explain(testCase, byVersion) ?? 'unexplained'
        const key = `${patternOf(testCase)} | ${
            statusDiffers ? 'status' : 'value'
        } | ${explainedBy}`
        byPattern[key] = byPattern[key] ?? {
            cases: 0,
            explainedBy,
            splits: {},
        }
        const split = splitOf(entries, statusDiffers)
        byPattern[key].cases++
        byPattern[key].splits[split] = (byPattern[key].splits[split] ?? 0) + 1
    })
    return byPattern
}

// The split most cases of a pattern share, or "varies" when none does.
const mainSplit = ({ cases, splits }) => {
    const [split, count] = Object.entries(splits).sort((a, b) => b[1] - a[1])[0]
    if (count === cases) {
        return split
    }
    return count / cases >= 0.9
        ? `${split} (${count} of ${cases})`
        : `varies: ${Object.keys(splits).length} splits`
}

/*
 * Versions that agree, as groups: "2.40.12 ERROR / others VALUE". The
 * same split over many cases is a change between versions; splits that
 * vary from case to case are an unstable result.
 */
const splitOf = (entries, byStatus) => {
    const groups = []
    entries
        .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
        .forEach(([version, observed]) => {
            const group = groups.find((g) =>
                byStatus
                    ? g.observed.status === observed.status
                    : sameObserved(g.observed, observed)
            )
            if (group) {
                group.versions.push(version)
            } else {
                groups.push({ observed, versions: [version] })
            }
        })
    return groups
        .map(
            ({ observed, versions }) =>
                `${versions.join(' ')}${byStatus ? ` ${observed.status}` : ''}`
        )
        .join(' / ')
}

const table = (header, rows) =>
    [
        `| ${header.join(' | ')} |`,
        `| ${header.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.join(' | ')} |`),
    ].join('\n')

const patternTable = (runs, patternsByVersion) => {
    const patterns = [
        ...new Set(Object.values(patternsByVersion).flatMap(Object.keys)),
    ].sort()
    if (!patterns.length) {
        return 'None.'
    }
    return table(
        ['Pattern', ...runs.map((run) => run.version)],
        patterns.map((pattern) => [
            pattern.replace(/\|/g, '·'),
            ...runs.map((run) => patternsByVersion[run.version][pattern] ?? ''),
        ])
    )
}

/*
 * Findings short enough to read in REPORT.md: a group's summary (2 and 7),
 * or the status of each metadata response (6 and 15).
 */
const briefFindings = (key, { findings, responses }) => {
    if (responses) {
        return responses.map(
            (response) => `${response.name}: HTTP ${response.httpStatus}`
        )
    }
    if (key === 'carry-windows') {
        return {
            rules: Object.fromEntries(
                Object.entries(findings.rules).map(([pair, score]) => [
                    pair,
                    `${score.matched}/${score.cases}: ${score.bestRules[0]}`,
                ])
            ),
            pairs: findings.pairs,
        }
    }
    return findings
}

const buildSummary = (runs) => ({
    generatedAt: new Date().toISOString(),
    // The tool that recomputed the verdicts below.
    source: toolVersion(),
    runs: runs.map((run) => ({
        instance: run.instance,
        version: run.version,
        date: run.date,
        periodDateMismatches:
            run.header.periodCheck?.mismatches?.length ?? null,
        periodTypeDifferences: run.header.serverInfo.periodTypeDifferences,
    })),
    groups: Object.fromEntries(
        GROUP_MODULES.map(({ KEY }) => [
            KEY,
            {
                verdicts: Object.fromEntries(
                    runs
                        .filter((run) => run.groups[KEY])
                        .map((run) => [
                            run.version,
                            countBy(run.groups[KEY].cases, (c) => c.verdict),
                        ])
                ),
                failPatterns: Object.fromEntries(
                    runs
                        .filter((run) => run.groups[KEY])
                        .map((run) => [
                            run.version,
                            failPatterns(run.groups[KEY].cases),
                        ])
                ),
                differences: differences(runs, KEY),
                findings: Object.fromEntries(
                    runs
                        .filter(
                            (run) =>
                                run.groups[KEY]?.findings ||
                                run.groups[KEY]?.responses
                        )
                        .map((run) => [
                            run.version,
                            briefFindings(KEY, run.groups[KEY]),
                        ])
                ),
            },
        ])
    ),
})

const buildMarkdown = (runs, summary) => {
    const sections = [
        '# Period types: results',
        `Generated by \`report.js\` from the observations in \`input/\`, with ${summary.source}. Do not edit: the hand-written conclusions are in \`VERSION-FINDINGS.md\`.`,
        '## Runs',
        table(
            ['Instance', 'Version', 'Date', 'Period dates that differ'],
            summary.runs.map((run) => [
                run.instance,
                run.version,
                run.date,
                run.periodDateMismatches,
            ])
        ),
    ]
    GROUP_MODULES.forEach(({ KEY }, index) => {
        const group = summary.groups[KEY]
        const groupRuns = runs.filter((run) => run.groups[KEY])
        if (!groupRuns.length) {
            return
        }
        sections.push(
            `## Group ${index + 1}: ${KEY}`,
            table(
                ['Version', 'pass', 'fail', 'recorded'],
                groupRuns.map((run) => {
                    const counts = group.verdicts[run.version]
                    return [
                        run.version,
                        counts.pass ?? 0,
                        counts.fail ?? 0,
                        counts.recorded ?? 0,
                    ]
                })
            ),
            '### Failing cases, by pattern',
            patternTable(groupRuns, group.failPatterns),
            '### Differences between versions',
            Object.keys(group.differences).length
                ? table(
                      [
                          'Pattern',
                          'Cases',
                          'Versions that agree',
                          'Explained by',
                      ],
                      Object.entries(group.differences)
                          .sort()
                          .map(([pattern, entry]) => [
                              pattern.split(' | ').slice(0, -1).join(' · '),
                              entry.cases,
                              mainSplit(entry),
                              entry.explainedBy === 'unexplained'
                                  ? '**unexplained**'
                                  : entry.explainedBy,
                          ])
                  )
                : 'None.'
        )
        if (Object.keys(group.findings).length) {
            sections.push(
                '### Findings',
                '```json\n' + JSON.stringify(group.findings, null, 2) + '\n```'
            )
        }
    })
    return sections.join('\n\n') + '\n'
}

const run = () => {
    const runs = loadAll()
    if (!runs.length) {
        throw new Error('No observations in input/: run verify.js first.')
    }
    const summary = buildSummary(runs)
    fs.mkdirSync(SUMMARY_DIR, { recursive: true })
    fs.writeFileSync(
        path.join(SUMMARY_DIR, 'summary.json'),
        JSON.stringify(summary, null, 2) + '\n'
    )
    fs.writeFileSync(
        path.join(SUMMARY_DIR, 'REPORT.md'),
        buildMarkdown(runs, summary)
    )
    runs.forEach((r) =>
        console.log(
            `${r.instance} (${r.version}): ${Object.entries(summary.groups)
                .filter(([, g]) => g.verdicts[r.version])
                .map(
                    ([key, g]) =>
                        `${key} ${JSON.stringify(g.verdicts[r.version])}`
                )
                .join(', ')}`
        )
    )
    console.log(`Wrote ${SUMMARY_DIR}/summary.json and REPORT.md`)
    return summary
}

if (require.main === module) {
    try {
        run()
    } catch (err) {
        console.error(err)
        process.exitCode = 1
    }
}

module.exports = { SUMMARY_DIR, differences, failPatterns, run }
