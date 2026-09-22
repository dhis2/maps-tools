# DHIS2 coordinate/fallback test-data generator

Generates DHIS2 metadata and tracker data covering every combination of
`coordinateField` / `fallbackCoordinateField` resolution used by the
maps-app event layer (`src/util/event.js`, `src/components/dataItem/CoordinateField.jsx`
in [dhis2/maps-app](https://github.com/dhis2/maps-app)), so the behaviour
can be manually verified in the app instead of guessed at.

## Quickstart: running maps-app's Cypress spec end-to-end

`eventCoordinateFallbackScenarios.cy.js` in
[dhis2/maps-app](https://github.com/dhis2/maps-app)
(`cypress/integration/layers/`) drives the actual UI through every
combination, reading the fixtures this tool writes rather than recomputing
anything itself. Full sequence, from nothing running to green tests:

1. Have a DHIS2 instance reachable — a local instance works, but any
   shared dev/play instance does too (e.g. `https://dev.im.dhis2.org/<some-instance>`).
   This tool and maps-app's Cypress config both need to point at the
   *same* instance directly (step 3) — no local proxy needed.
2. Set up `.env.local` here so you don't retype flags in every command
   below (gitignored, never committed):
   ```bash
   # test-data-event-layer-coordinates/.env.local
   export DHIS2_BASE_URL=https://dev.im.dhis2.org/my-dev-instance
   export DHIS2_USERNAME=admin
   export DHIS2_PASSWORD=<your password>
   ```
   Then `source` it in your shell — **it is not auto-loaded**, this tool
   has no `dotenv` dependency by design, so the values only take effect
   once they're in your shell's environment:
   ```bash
   source .env.local
   ```
3. Point maps-app's Cypress config at the same instance (also gitignored,
   also local-only):
   ```json
   // maps-app/cypress.env.json
   {
       "dhis2BaseUrl": "https://dev.im.dhis2.org/my-dev-instance",
       "dhis2InstanceVersion": "2.44-SNAPSHOT",
       "dhis2Username": "admin",
       "dhis2Password": "<your password>"
   }
   ```
   (`dhis2InstanceVersion` is required — match it to the instance's actual
   version.)
4. Generate the metadata/data and write the fixtures straight into the
   maps-app checkout:
   ```bash
   node index.js --fixturesRepo=/path/to/maps-app
   ```
5. Build analytics tables for the new programs (first time only against a
   given instance — see "Analytics tables don't exist yet" below). No
   `--baseUrl` needed — `config.js` already falls back to the
   `DHIS2_BASE_URL` you sourced in step 2:
   ```bash
   node runAnalytics.js
   ```
6. Optional but recommended — confirm the instance resolves coordinates
   correctly before trusting the UI test:
   ```bash
   node verify.js
   ```
7. From maps-app, run just this spec — `start-server-and-test` starts the
   dev server and waits for it before running Cypress:
   ```bash
   npx start-server-and-test 'yarn start' http://localhost:3000 \
     'yarn cypress run --e2e --spec "cypress/integration/layers/eventCoordinateFallbackScenarios.cy.js"'
   ```
   For a headed run, swap the last part for
   `yarn cy:open` and pick the spec from the list once it
   opens.

## What it creates

**Metadata** (re-running is safe — every object gets a deterministic id, so
imports update in place instead of duplicating):

-   2 org units: "Maps Test OU (with geometry)" and "Maps Test OU (no geometry)"
-   3 data elements: "Maps Test Coordinate DE" (`COORDINATE`), "Maps Test OrgUnit DE"
    (`ORGANISATION_UNIT`), "Maps Test Scenario Code DE" (`TEXT`)
-   3 tracked entity attributes: the TEI/enrollment-level equivalents of the above
-   1 tracked entity type: "Maps Test Person"
-   2 programs, each with one program stage:
    -   "Maps Test Coordinates (Tracker)" — `WITH_REGISTRATION`
    -   "Maps Test Coordinates (Event)" — `WITHOUT_REGISTRATION`

**Data** — full cartesian product of geometry-presence flags:

-   16 standalone events under the event program
-   16 enrollments/tracked entities under the tracker program, each with 16
    events underneath → 256 events
-   **272 events total**, every one tagged with a "Scenario Code" data
    element/attribute value describing exactly which geometry sources it has
    data for (e.g. `PI1_TEI0_TEAC1_TEAO0__EVT1_OU1_DEC0_DEO1`)

Every populated geometry source (event, org unit, enrollment, TEI, the
custom coordinate DE/TEA) gets its own distinct, known coordinate rather
than sharing one (`geometry.js`'s `CHANNEL_BIAS`) — so which source actually
won a resolution (including cascade precedence) can be proven by comparing
returned coordinates, not by trusting a source label. See `verify.js` for
why that matters.

Every run (including `--dryRun`) writes `output/import-summary.{json,csv}`
(the metadata/tracker object counts, which instance, and when). All of
`output/` is gitignored.

## Usage

Run directly with `node` — no `yarn`/`npm` install step or project
dependencies required beyond Node itself (v18+, for global `fetch`). Paths
below assume running from the repo root; adjust if running from inside
this folder.

```bash
# Preview: builds every payload and checks for id collisions, makes no
# network calls except a best-effort read of the root org unit.
node test-data-event-layer-coordinates/index.js --dryRun

# Import into a local DHIS2 instance (defaults: http://localhost:8080,
# admin/district)
node test-data-event-layer-coordinates/index.js

# Target a different instance
node test-data-event-layer-coordinates/index.js \
  --baseUrl=http://localhost:8090 --username=admin --password=district
```

Flags can also be set via env vars: `DHIS2_BASE_URL`, `DHIS2_USERNAME`,
`DHIS2_PASSWORD`. Keeping a local, gitignored `.env.local` with `export`
lines and `source`-ing it before running is a convenient way to avoid
retyping flags for a given instance.

Only point this at a local/disposable instance — it creates ~300 metadata
and data objects and is not intended for a shared instance.

`--chunkSize=N` splits the tracker import into batches of N events (mainly
useful for isolating which object fails if an import errors).

### Writing fixtures into a consumer repo

This tool lives in its own repo, separate from any app that consumes its
output. A real (non-dry-run) import can write the scenario cross-reference
and field-id fixtures directly into another repo's `cypress/fixtures/` —
e.g. a local [dhis2/maps-app](https://github.com/dhis2/maps-app) checkout,
whose `eventCoordinateFallbackScenarios.cy.js` spec reads them from there:

```bash
node test-data-event-layer-coordinates/index.js --fixturesRepo=/path/to/maps-app
```

This writes, into `<fixturesRepo>/cypress/fixtures/`:

-   `eventCoordinateFallbackScenarios.{json,csv}` — every generated
    event/enrollment/TEI id alongside its scenario code and boolean flags,
    so you can look up which event exercises which case. The CSV is flat
    (one row per event/enrollment, boolean flag columns), handy for opening
    in a spreadsheet to filter/sort.
-   `eventCoordinateFallbackFieldIds.json` — the custom DE/TEA ids
    (`deCoordinate`, `deOrgUnit`, `teaCoordinate`, `teaOrgUnit`), so the
    consuming Cypress spec can interpret the scenarios file's `points`
    without depending on this tool's code.

`--fixturesRepo` can also be set via `DHIS2_FIXTURES_REPO`. If omitted, the
import still runs (metadata/tracker data still gets created), but fixture
files are skipped, with a warning explaining how to enable them.

## Verifying the behaviour

### Automated: `verify.js`

Once the data is imported, run:

```bash
node test-data-event-layer-coordinates/verify.js --baseUrl=http://localhost:8080
```

This queries `/api/analytics/events/query` directly (the same endpoint
maps-app hits), and for every event returned, compares the actual returned
`geometry` **coordinates** against the coordinate an independent reference
implementation (`resolve.js`) says the correct winning source should carry,
computed from that event's known per-source coordinates (`points`, built in
`trackerPayload.js`). It prints `[PASS]`/`[FAIL]` per
`coordinateField`/`fallbackCoordinateField` combination tested, with the
first few mismatches shown (including the expected field/coordinate vs what
actually came back), a final pass/fail tally, and exits non-zero if
anything mismatched. It recomputes the same deterministic scenario data
`index.js` generated (no file needed), so it can be run anytime after
import — no need to keep a fixtures file around.

**Why coordinates, not a source label**: the official DHIS2 analytics docs
(`docs.dhis2.org`, "master") don't document a `geometrySource` dimension,
`fallbackCoordinateField`, or `defaultCoordinateFallback` at all — only
`coordinateField` (enum `EVENT|ENROLLMENT|TRACKER|ougeometry|<attribute-id>|<dataelement-id>`)
and `coordinateOuFallback` are documented. Requesting `geometrySource` as a
dimension (mirroring how maps-app's "Style by data item: Geometry source"
feature requests it) was rejected outright by a real instance
(`errorCode: E7224`, "not part of the program"). This tracks with the
fallback-coordinate-field feature's history in maps-app — shipped and
reverted in 2023, then re-added — so the backend surface it depends on may
still be in-progress or version-gated. Comparing coordinates sidesteps all
of that: it only requires the (documented) `geometry` column, and proves
resolution correctness — including cascade precedence — regardless of
whether a given target instance's backend exposes a source label at all.

It also writes the full results to `output/`, at two granularities:

-   `verify-summary.{json,csv}` — one row per combination tested, with
    pass/fail counts.
-   `verify-details.{json,csv}` — one row per event checked within each
    combination (the full audit trail behind the summary: expected
    field/coordinate vs actual coordinate, and any request error),
    filterable/sortable in a spreadsheet.

`--debug` prints the raw analytics response headers and first 3 rows for
the first request of a run — useful for inspecting exactly what a target
instance's analytics response looks like when something doesn't add up.

Two modes, via `--mode`:

-   `--mode=smoke` (default) — a curated set of 12 combinations covering
    the interesting cases (default field, org unit, enrollment, tracked
    entity, custom `COORDINATE`/`ORGANISATION_UNIT` fields, plain fallback,
    `cascading` fallback) for both programs. Fast, good as a sanity check
    after every import.
-   `--mode=full` — every main field the app actually offers, crossed
    with every fallback option the app offers for that main field (none,
    cascading, and every other field) — the same option set
    `CoordinateField.jsx` presents in the UI. That's 92
    `coordinateField`/`fallbackCoordinateField` combinations (20 for the
    event program, 72 for the tracker program), each checked against all
    of that program's events — full coverage of the matrix, but slower
    (92 analytics requests).

```bash
node test-data-event-layer-coordinates/verify.js --mode=full
```

**"Analytics tables don't exist yet" error**: event/tracker analytics reads
from precomputed analytics tables, not raw data — a program you just
imported won't have any until the analytics job runs. `verify.js` detects
this (DHIS2 error code `E7144`) and fails fast with instructions instead of
repeating the same error for every test case. Run:

```bash
node test-data-event-layer-coordinates/runAnalytics.js --baseUrl=http://localhost:8080
```

This kicks off table generation (`skipAggregate=true` — event/tracker
analytics doesn't need the slower aggregate data tables) and polls
`/api/system/tasks/ANALYTICS_TABLE` until the job reports completion,
printing each progress message once, then exits non-zero if the job itself
reported an error. `--pollSeconds=N` (default 5) and `--maxWaitMinutes=N`
(default 30) control polling. Then re-run `verify.js`.

### Manual: in maps-app

1. Add an event layer using "Maps Test Coordinates (Event)" or
   "Maps Test Coordinates (Tracker)".
2. Set the layer's Label field (or Style by data item) to "Maps Test
   Scenario Code" to see each event/enrollment's scenario code on the map.
3. In the layer's Style tab, cycle through `Coordinate field` /
   `Fallback coordinate field` combinations and confirm each event's
   rendered position matches what its scenario code says is populated —
   cross-check against `cypress/fixtures/eventCoordinateFallbackScenarios.json`
   in the maps-app checkout, if `--fixturesRepo` was used.

## Re-running

The tool is idempotent: every id is derived deterministically from a
fixed seed, and imports use `importStrategy=CREATE_AND_UPDATE`. Re-running
after a code change (e.g. adjusting `scenarios.js`) updates the existing
objects rather than creating duplicates.

## Cross-version findings

See `VERSION-FINDINGS.md` for empirical results of running this tool
against DHIS2 2.40 through 2.44-SNAPSHOT.
