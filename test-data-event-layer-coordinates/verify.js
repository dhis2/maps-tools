// Verifies, against a live instance, that /api/analytics/events/query
// actually resolves the `geometry` column the way maps-app expects, for a
// curated set of coordinateField/fallbackCoordinateField combinations. Run
// this AFTER importing the metadata/data with index.js.
//
// This compares COORDINATES, not a `geometrySource` label: the official
// DHIS2 analytics docs (docs.dhis2.org, "master") don't document a
// `geometrySource` dimension, `fallbackCoordinateField`, or
// `defaultCoordinateFallback` at all - only `coordinateField` (enum
// EVENT|ENROLLMENT|TRACKER|ougeometry|<attribute-id>|<dataelement-id>) and
// `coordinateOuFallback` are documented. Requesting `geometrySource` as a
// dimension was rejected outright by a real instance (E7224 - "not part of
// the program"). Since every candidate geometry source is generated with
// its own distinct, known coordinate (see geometry.js/trackerPayload.js),
// comparing the returned `geometry` coordinates against the coordinate the
// correct winning source is known to carry proves resolution/cascade
// precedence empirically, without depending on any of that undocumented
// surface.
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { createDebugLog, DEBUG_LOG_PATH } = require('./debugLog.js')
const { buildMetadata } = require('./metadata.js')
const { resolveExpected, PSI, OU, PI, TEI, CASCADING } = require('./resolve.js')
const { buildTrackerPayload } = require('./trackerPayload.js')
const { deterministicUid } = require('./uid.js')
const { writeVerifyReport } = require('./verifyReport.js')

const BASE_COORDS = [-13.2317, 8.4657]
const START_DATE = '2020-01-01'
const END_DATE = '2030-12-31'

// Smoke mode: a curated set of the most interesting main/fallback
// combinations - fast, good for a quick sanity check after import.
const buildSmokeTestCases = (ids) => [
    {
        label: 'Default main, no fallback',
        program: 'event',
        mainField: PSI,
        fallbackField: null,
    },
    {
        label: 'Default main, fallback org unit',
        program: 'event',
        mainField: PSI,
        fallbackField: OU,
    },
    {
        label: 'Default main, fallback cascading',
        program: 'event',
        mainField: PSI,
        fallbackField: CASCADING,
    },
    {
        label: 'Org unit main, no fallback',
        program: 'event',
        mainField: OU,
        fallbackField: null,
    },
    {
        label: 'Custom coordinate DE main, no fallback',
        program: 'event',
        mainField: ids.deCoordinate,
        fallbackField: null,
    },
    {
        label: 'Custom org-unit DE main, fallback cascading',
        program: 'event',
        mainField: ids.deOrgUnit,
        fallbackField: CASCADING,
    },
    {
        label: 'Default main, fallback custom coordinate DE',
        program: 'event',
        mainField: PSI,
        fallbackField: ids.deCoordinate,
    },
    {
        label: 'Enrollment main, fallback cascading',
        program: 'tracker',
        mainField: PI,
        fallbackField: CASCADING,
    },
    {
        label: 'Tracked entity main, fallback cascading',
        program: 'tracker',
        mainField: TEI,
        fallbackField: CASCADING,
    },
    {
        label: 'Custom coordinate TEA main, fallback cascading',
        program: 'tracker',
        mainField: ids.teaCoordinate,
        fallbackField: CASCADING,
    },
    {
        label: 'Default main, fallback cascading (tracker, hasTei)',
        program: 'tracker',
        mainField: PSI,
        fallbackField: CASCADING,
    },
    {
        label: 'Org unit main, no fallback (tracker)',
        program: 'tracker',
        mainField: OU,
        fallbackField: null,
    },
]

const EVENT_PROGRAM_FIELDS = (ids) => [PSI, OU, ids.deCoordinate, ids.deOrgUnit]
const TRACKER_PROGRAM_FIELDS = (ids) => [
    PSI,
    OU,
    PI,
    TEI,
    ids.deCoordinate,
    ids.deOrgUnit,
    ids.teaCoordinate,
    ids.teaOrgUnit,
]

// Full mode: every main field the app actually offers, crossed with every
// fallback the app offers for that main field (none, cascading, and every
// other field), for both programs. This is the same option set
// CoordinateField.jsx presents in the UI - see its isFallback branch.
const buildFullTestCases = (ids) => {
    const cases = []
    ;[
        { program: 'event', fields: EVENT_PROGRAM_FIELDS(ids) },
        { program: 'tracker', fields: TRACKER_PROGRAM_FIELDS(ids) },
    ].forEach(({ program, fields }) => {
        fields.forEach((mainField) => {
            const fallbackOptions = [
                null,
                CASCADING,
                ...fields.filter((field) => field !== mainField),
            ]
            fallbackOptions.forEach((fallbackField) => {
                cases.push({
                    label: `[${program}] main=${mainField} fallback=${
                        fallbackField ?? 'none'
                    }`,
                    program,
                    mainField,
                    fallbackField,
                })
            })
        })
    })
    return cases
}

const buildAnalyticsQuery = ({
    programId,
    stageId,
    ids,
    mainField,
    fallbackField,
}) => {
    const params = new URLSearchParams({
        stage: stageId,
        startDate: START_DATE,
        endDate: END_DATE,
        coordinatesOnly: 'false',
        pageSize: '1000',
        coordinateField: mainField,
    })
    params.append('dimension', `ou:${ids.ouWithGeometry};${ids.ouNoGeometry}`)
    if (fallbackField === CASCADING) {
        params.set('defaultCoordinateFallback', 'true')
    } else if (fallbackField) {
        params.set('fallbackCoordinateField', fallbackField)
    }
    return `/api/analytics/events/query/${programId}.json?${params.toString()}`
}

// Parses the DHIS2 analytics tabular response into eventId -> geometry
// (GeoJSON Point, or null if no geometry resolved for this event).
const parseEventsResponse = (response) => {
    const idCol = response.headers.findIndex((h) => h.name === 'psi')
    const geometryCol = response.headers.findIndex((h) => h.name === 'geometry')

    const byId = new Map()
    response.rows.forEach((row) => {
        byId.set(
            row[idCol],
            geometryCol >= 0 && row[geometryCol]
                ? JSON.parse(row[geometryCol])
                : null
        )
    })
    return byId
}

// Small tolerance for float round-tripping through the analytics response.
const POINT_EPSILON = 1e-6
const pointsMatch = (a, b) =>
    !!a &&
    !!b &&
    Math.abs(a[0] - b[0]) < POINT_EPSILON &&
    Math.abs(a[1] - b[1]) < POINT_EPSILON

const run = async () => {
    const config = getConfig()
    const client = createClient(config)

    console.log(
        `Target: ${config.baseUrl} (user: ${config.username}) [${config.mode} mode]`
    )
    const debugLog = createDebugLog(config.debug)
    if (config.debug) {
        console.log(`[debug] writing details to ${DEBUG_LOG_PATH}`)
    }

    // Rebuilds the exact same deterministic ids/scenario data the generator
    // produced - no file to read, no network call needed for this part.
    const { ids } = buildMetadata({
        rootOrgUnitId: deterministicUid('maps-test:placeholder:rootOrgUnit'),
        withGeometryCoords: BASE_COORDS,
    })
    const { scenarioIndex } = buildTrackerPayload({
        ids,
        baseCoords: BASE_COORDS,
    })

    const eventsByProgram = {
        event: scenarioIndex.filter(
            (s) =>
                s.type === 'event' &&
                s.program === 'Maps Test Coordinates (Event)'
        ),
        tracker: scenarioIndex.filter(
            (s) =>
                s.type === 'event' &&
                s.program === 'Maps Test Coordinates (Tracker)'
        ),
    }

    const testCases =
        config.mode === 'full'
            ? buildFullTestCases(ids)
            : buildSmokeTestCases(ids)
    console.log(`Running ${testCases.length} test cases...\n`)

    let totalPass = 0
    let totalFail = 0
    const caseSummaries = []
    const details = []

    for (const [caseIndex, testCase] of testCases.entries()) {
        const progress = `(${caseIndex + 1}/${testCases.length})`
        const isTracker = testCase.program === 'tracker'
        const programId = isTracker ? ids.trackerProgram : ids.eventProgram
        const stageId = isTracker
            ? ids.trackerProgramStage
            : ids.eventProgramStage
        const caseEvents = eventsByProgram[testCase.program]
        const caseMeta = {
            label: testCase.label,
            program: testCase.program,
            mainField: testCase.mainField,
            fallbackField: testCase.fallbackField ?? '',
        }

        const path = buildAnalyticsQuery({
            programId,
            stageId,
            ids,
            mainField: testCase.mainField,
            fallbackField: testCase.fallbackField,
        })

        let actualById
        try {
            const response = await client.get(path)
            if (config.debug) {
                debugLog(`\n=== (${testCase.program}) ${testCase.label} ===`)
                debugLog(`request: ${path}`)
                debugLog(
                    'response headers:',
                    response.headers.map((h) => `${h.name} (${h.column})`)
                )
                debugLog('all rows:', response.rows)
            }
            actualById = parseEventsResponse(response)
        } catch (err) {
            // The analytics tables for a program are only built when the
            // analytics job runs - a brand-new program (just imported) has
            // none yet, and every single request will fail identically
            // until that job runs. Fail fast with an actionable message
            // instead of burning through the rest of the test cases.
            if (err.body?.errorCode === 'E7144') {
                console.error(
                    `\n*** Analytics tables don't exist yet for this program (${programId}). ***\n` +
                        `Run the analytics job on ${config.baseUrl} first, then re-run verify.js:\n` +
                        `  node test-data-event-layer-coordinates/runAnalytics.js --baseUrl=${config.baseUrl}\n` +
                        `(or in the app: Data Administration > Analytics > Run analytics tables)\n` +
                        `This can take a while depending on the instance.\n`
                )
                process.exitCode = 1
                return
            }
            console.error(
                `[FAIL] ${progress} ${testCase.label}: request failed - ${err.message}`
            )
            totalFail += caseEvents.length
            caseSummaries.push({
                ...caseMeta,
                total: caseEvents.length,
                passed: 0,
                failed: caseEvents.length,
            })
            caseEvents.forEach((scenario) => {
                details.push({
                    ...caseMeta,
                    eventId: scenario.eventId,
                    scenarioCode: scenario.scenarioCode,
                    expectedField: '',
                    expectedPoint: '',
                    actualPoint: '',
                    ok: false,
                    error: err.message,
                })
            })
            continue
        }

        const mismatches = []
        caseEvents.forEach((scenario) => {
            const expected = resolveExpected({
                points: scenario.points,
                hasTei: isTracker,
                mainField: testCase.mainField,
                fallbackField: testCase.fallbackField,
            })
            const actualPoint =
                actualById.get(scenario.eventId)?.coordinates ?? null

            const ok = expected.point
                ? pointsMatch(expected.point, actualPoint)
                : !actualPoint

            const detail = {
                ...caseMeta,
                eventId: scenario.eventId,
                scenarioCode: scenario.scenarioCode,
                expectedField: expected.field ?? '',
                expectedPoint: expected.point
                    ? JSON.stringify(expected.point)
                    : '',
                actualPoint: actualPoint ? JSON.stringify(actualPoint) : '',
                ok,
                error: '',
            }
            details.push(detail)

            if (ok) {
                totalPass++
            } else {
                totalFail++
                mismatches.push(detail)
            }
        })

        caseSummaries.push({
            ...caseMeta,
            total: caseEvents.length,
            passed: caseEvents.length - mismatches.length,
            failed: mismatches.length,
        })

        if (mismatches.length) {
            console.log(
                `[FAIL] ${progress} ${testCase.label}: ${mismatches.length}/${caseEvents.length} events mismatched`
            )
            mismatches.slice(0, 5).forEach((m) => console.log('   ', m))
            if (mismatches.length > 5) {
                console.log(`    ...and ${mismatches.length - 5} more`)
            }
        } else {
            console.log(
                `[PASS] ${progress} ${testCase.label}: all ${caseEvents.length} events resolved as expected`
            )
        }
    }

    console.log(`\n${totalPass} passed, ${totalFail} failed`)

    const reportPaths = writeVerifyReport({
        mode: config.mode,
        target: config.baseUrl,
        caseSummaries,
        details,
    })
    console.log(
        `Report written to ${reportPaths.summaryJsonPath}, ${reportPaths.summaryCsvPath}, ${reportPaths.detailsJsonPath} and ${reportPaths.detailsCsvPath}`
    )

    if (totalFail > 0) {
        process.exitCode = 1
    }
}

run().catch((err) => {
    console.error(err)
    process.exitCode = 1
})
