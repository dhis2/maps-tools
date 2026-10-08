# Data item profile: test tool

Tests how DHIS2 analytics answers when the periods asked for don't match the
periods the data was collected in, and when the places asked for don't
match the places it was collected at. It creates its own data on a server,
asks analytics for it, checks the answers against a hypothesis, and writes
the results as fixtures for the `@dhis2/analytics` checks of data items
against periods and org units (groups 1 to 7 for periods, 8 to 15 for org
units).

Findings, version by version: [VERSION-FINDINGS.md](VERSION-FINDINGS.md).
Generated tables: [results/REPORT.md](results/REPORT.md).

Plain Node (22 or newer works, 18 has `fetch` too), no dependencies, no
install step.

## Where it may write

Only the public play instances (`https://play.im.dhis2.org/<name>`),
`https://dev.im.dhis2.org/maps-app-43-1` and `localhost`. `guard.js` refuses
any other server for the scripts that write (`index.js`, `run-analytics.js`,
`cleanup.js`, `run-all.js`). `verify.js`, `list-instances.js` and the report
only read.

Play instances reset every night around midnight UTC and rebuild analytics
around 2 a.m. A full run takes about 5 minutes per instance, so run it in
one go.

## Quickstart

```bash
cd test-data-item-profile
node --test                                   # the pure parts
node index.js --dryRun                        # builds every payload, sends nothing
node list-instances.js                        # play instances and their versions
node run-all.js --baseUrl=https://play.im.dhis2.org/stable-2-43-1
node export-fixtures.js                       # after one or more instances
```

Credentials come from flags (`--baseUrl`, `--username`, `--password`) or
`DHIS2_BASE_URL`, `DHIS2_USERNAME`, `DHIS2_PASSWORD`. Defaults are
`admin`/`district`. For a fixed instance, keep a gitignored `.env.local` with
`export` lines and `source` it by hand: nothing loads it for you.

## Scripts

| Script               | What it does                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `index.js`           | Imports metadata, data values and completeness registrations. `--dryRun` writes the payloads to `output/` only.                        |
| `run-analytics.js`   | Starts the aggregate analytics tables job (never with `lastYears`) and waits for it.                                                   |
| `verify.js`          | Queries analytics for every case, GET only, and writes what came back to `input/<instance>/<group>.json`. `--groups=1,3` limits it.    |
| `report.js`          | Reads `input/` and writes `results/summary.json` and `results/REPORT.md`.                                                              |
| `export-fixtures.js` | Writes `fixtures/period-types/` (one file per group, and `metadata-shapes.json`) and the smoke subset, `fixtures/period-types-smoke/`. |
| `repeat-check.js`    | Optional: verifies an instance again and lists the cases whose answer changed since its last run. GET only.                            |
| `run-all.js`         | `index.js`, `run-analytics.js`, `verify.js` and `report.js` for one instance.                                                          |
| `list-instances.js`  | Lists the public instances and their versions, into `results/instances.json`.                                                          |
| `cleanup.js`         | Lists what the tool owns on a server (codes starting `PTT_`); `--yes` deletes it.                                                      |

Before verifying, `verify.js` checks that a known value comes back (G1's SUM
Monthly element holds 13 at A in January 2025), and compares our start and
end dates of every queried period with the server's. A period type the
server refuses (QuarterlyNov on 2.40) is recorded once, and its cases become
`ERROR` without a request.

Verdicts, and the summaries of groups that have one (2 and 7), are
recomputed from `input/` when the report and the fixtures are written, so
fixing an expectation or a rule doesn't need a new run (see "Input and
output").

`report.js` labels each difference between versions with the finding that
explains it (`known-differences.js`), and shows a new one as
**unexplained**. When a run brings one, explain it in VERSION-FINDINGS.md
and add it there.

`repeat-check.js` is optional: it verifies an instance again, replacing its
`input/` files, and shows that a second run gives the same answers. The only changes it finds are FIRST_FIRST_ORG_UNIT and
LAST_LAST_ORG_UNIT at the region, which pick a place at random.

## What it creates

Every id comes from `uid.js`: a SHA-256 of `period-types-test:v1:<key>`.
Names start with "PTT" and codes with `PTT_`. Re-running updates objects in
place, and `index.js` checks there are no duplicates. The seed, the PTT
prefix and the fixture folders (`period-types/`, `org-units/`) keep the
names they had when the tool covered periods only: they name the data, and
changing them would change every id.

- Org units "PTT region" (level 2), under the user's root, with "PTT place
  A" and "PTT place B" for the period groups, and for the org unit groups
  districts D1, D2 and D3 (level 3) and facilities F1 and F2 (under D1) and
  F3 (under D2) at level 4. D3 has no facilities. The group "PTT group" (A
  and B), and for the org unit groups `g` (D2 and F1), `empty` and `top`
  (the region). A constant (5). An indicator type (factor 1).
- For the org unit groups: a user `ptt_period_types_user` with its role,
  whose data capture and view unit is the region (its password is made
  per instance and kept in `output/users/`); an event program and a
  tracker program with their stages, a tracked entity type and program
  indicators; events and one tracked entity, whose ownership is moved.
- Data elements, data sets, indicators and an expression item per group,
  below. Data is 2024 and 2025; financial and November types also get the
  periods that overlap those years.
- Values at A are 1, 2, 3… by period; at B, 10 times that.

Only the period types the server lists are used: 2.40 to 2.42 have no
WeeklyFriday, FinancialFeb or FinancialAug, and 2.40 and 2.41 no
FinancialSep. TwoYearly has no ISO format: it can't be entered or asked for
by id, anywhere.

Import notes:

- Values go one data set per request, with `dataSet` in the payload.
- History (monthly then weekly) and an element in no data set are made by
  importing with a temporary data set membership, then removing it.
- Data sets need public data write (`rwrw----`) for completeness
  registrations, and `openFuturePeriods: 2`, or 2.40 to 2.42 refuse periods
  that haven't ended.
- Registrations go in chunks of 500 (2.40 refuses 1,097 at once).
- Values are imported with `skipAudit=true`: audits block deleting data
  elements and org units, and the API can't remove them.
- Users and the expression item go only in the final metadata phase: with
  their org units in the same payload, 2.43.1 answers HTTP 500 for a user,
  and an expression item over data elements created in the same payload is
  refused ("Expression is not parsable").
- The tracker program stage is repeatable (two events per enrollment).
- Ownership transfer sends both parameter spellings (2.40 `ou` and
  `trackedEntityInstance`, 2.43 `orgUnit` and `trackedEntity`); a re-run
  finds the owner already moved, which is fine.
- The analytics job builds event, enrollment and ownership tables too.

## Case groups

| #   | Group                        | Cases (2.43) | What                                                                                                                                                                                            |
| --- | ---------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `aggregation-by-period-type` | 60,306       | 19 aggregation types × 23 collection types × 23 query types × 2 periods × A, B and the region.                                                                                                  |
| 2   | `periods-that-dont-nest`     | 266          | Weeks of every start day, bi-weeks, November and April types, financial years, value 1 per period, by month, quarter and year: which assignment rule holds.                                     |
| 3   | `mixed-collection`           | 105          | Monday and Wednesday weeks, monthly at A and weekly at B, monthly history then weekly, an element in no data set. Checked with the coarser probe.                                               |
| 4   | `indicators-and-expressions` | 2,484        | One indicator per operand kind, averaged and summed denominators, annualized or not, sums with a missing item, and expression items with each missing value strategy.                           |
| 5   | `reporting-rates`            | 2,070        | Rate, actual and expected reports of daily to yearly data sets; A registers every period, B every other one.                                                                                    |
| 6   | `detection-requests`         | 46           | The metadata requests a library would make, and `analytics/rawData` over date ranges.                                                                                                           |
| 7   | `carry-windows`              | 18,956       | FIRST and LAST (and their `_AVERAGE_ORG_UNIT` variants), dense and sparse data, asked at every period of 2023 to 2025 that ends by the end of 2025: where each value comes from.                |
| 8   | `entered-above`              | 5            | A data set at D1 only, asked at F1, D1, the region, and levels 4 and 3 under the region.                                                                                                        |
| 9   | `partly-assigned`            | 5            | A data set at F1 and F2, not F3, asked at F3, D2, D1, the region and level 4.                                                                                                                   |
| 10  | `mixed-levels`               | 6            | One element at the facilities and at D1, and an indicator over it, asked at F1, D1 and the region.                                                                                              |
| 11  | `aggregation-levels`         | 12           | Elements with aggregation levels [3], [2] and [2, 3] entered at facilities, and [3] at D1, asked at F1, D1 and the region.                                                                      |
| 12  | `org-unit-groups`            | 4            | `OU_GROUP-g` alone, inside D1, inside the region, and an empty group.                                                                                                                           |
| 13  | `user-org-units`             | 3            | `USER_ORGUNIT` and its children and grandchildren, asked as the PTT user.                                                                                                                       |
| 14  | `programs`                   | 28           | Program indicators (event counts) of an event and a tracker program, with each `orgUnitField`, asked at F1, F2, F3 and the region.                                                              |
| 15  | `org-unit-requests`          | 16           | The org unit metadata requests the library sends, with known counts for the nested filters.                                                                                                     |
| 16  | `disaggregation`             | 36           | One element in a monthly data set with one category combo and a quarterly one with another, at the same places or different ones, asked as a whole and by option combo, with the coarser probe. |

**The org unit groups (8 to 15).** Each unit enters its own factor in
each month of Q1 2025 (F1 1, F2 10, F3 100, D1 1,000, D2 10,000, D3
100,000), so a total tells which units it came from. A case asks for one
selection, as DV saves it, for 2025Q1, and records the rows by unit. Its
`expected` holds the hypothesis (`status`, `value`, and the units that
should count) and the library's prediction from metadata (`compatibility`
and `reasons`, from its spec; `null` where the spec says nothing).

The two periods per query type are the one that holds 1 January 2025 and
the one that holds mid-July 2025 (mid-2024 when one period holds both).

**One period per request.** FIRST and LAST read every year the request
touches, so another period in the same request can change their answer
(VERSION-FINDINGS.md, finding 3). Groups 1, 2, 4, 5 and 7 ask for one
period per request; group 3 asks for several on purpose, with SUM only.

Group 7 has no expected values: every value is unique per element and
period, so the value that comes back names its source period, and
`summarize` scores candidate rules against all of them. Its pair cases ask
for the same period alone, then with one more period in the request. Its
fixture gives each case's source period as `observed[version].source`.
A group can be kept out of the export with `exported: false`.

### The expected answers

`expected.js` holds the rules VERSION-FINDINGS.md establishes, and
expects, for each case:

- `VALUE` when the query type is the collection type or a longer one (by
  the server's frequency order). An equal length but another type (a
  Wednesday week asked by Monday week, a financial year asked by year)
  doesn't count (finding 1).
- `REPEATED` for a shorter query type when the aggregation is `AVERAGE` or
  `AVERAGE_SUM_ORG_UNIT` (finding 2).
- For FIRST and LAST and their org unit variants, the value carried from
  the period the carry rule names, or `EMPTY` when it names none
  (finding 3, `carriedSource`).
- For reporting rates, actual and expected reports, a row in any period:
  0 where the type doesn't fit (finding 9).
- For a disaggregation (`de.coc`), only the data sets whose category
  combo holds that option combo count; the element as a whole, all of them
  (group 16).
- For sums in indicators and expression items, `SKIP_IF_ALL_VALUES_MISSING`:
  a missing item counts as 0, and a side has no value when all its items
  are missing. An indicator needs both sides. A sum with a value but an
  operand left out is `PARTIAL`: its operands are asked in the same request
  (SUM elements, so it doesn't change their answers). Expression items
  behave the same whatever their `missingValueStrategy` (finding 8).
- `ERROR` for `NONE`, and for an org unit group without members
  (finding 15). `EMPTY` otherwise.

Values are computed where periods nest, for SUM, AVERAGE,
AVERAGE_SUM_ORG_UNIT (weighted by days, divided by the query period's
days), MIN, MAX and COUNT, and wherever the carry rule applies, at one
place; at the region only for summed types. Elsewhere the value is
`recorded` and compared across versions.

So a `fail` is a server that answers differently from the established
rules: something new to explain. Since 2026-10-05 the only fails are on
2.40.12, whose QuarterlyNov queries fail (finding 5): the expected answers
are the same for every version.

## Fixtures

`fixtures/period-types/<group>.json`, schema version 1, as agreed with the
library: `runs`, and `cases` with `id`, `item`, `query`, `expected`, and
`observed` and `verdict` by version. One case per line. `source` names the
tool's commit when the file was written (verdicts are recomputed then), so
commit before exporting.

- Group 1 is split by aggregation type, in
  `fixtures/period-types/aggregation-by-period-type/<AGG>.json`, each a full
  fixture with a `part` field.
- `metadata-shapes.json`: per version, `requests[]` with `name`, `path`,
  `httpStatus` and the sanitized `response`.

The full export is about 80 MB (group 7 alone is 25 MB) and is read
locally by the library. The library keeps the **smoke subset** in its repo:
`fixtures/period-types-smoke/`, under 1 MB, built by `smoke.js`.

- One file per group, group 1 merged into one; same header and cases, no
  `part`, and a `smoke` sentence on how it was sampled.
- One case per pattern, the first by id: the item (its type and
  aggregation or metric when it has one collection type and no sources or
  operands, else its code, else the case id), how each collection type
  relates to the query type, whether the query is QuarterlyNov, and the
  status on every version.
- Plus the cases the library's tests name: the mixed group's place, history
  and orphan cases, and the `.periodOffset` cases whose period starts on or
  before 1 January 2024.
- `metadata-shapes.json`: only `dataElements`, `indicators`, `dataSets`,
  `expressionDimensionItems` (with `missingValueStrategy`), `periodTypes`,
  `categoryOptionCombos` and the org unit requests, with the first 4
  objects of each list, and `PTT_G3_MW`, `PTT_G3_ORPHAN`, `PTT_DIS_BOTH`
  and `PTT_DIS_PLACE` always. Count responses keep their
  `pager`: the library reads `pager.total`.

Optional fields beyond the base format:

| Where      | Field                                                                                                                                           | Groups |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `item`     | `code`, `notes`                                                                                                                                 | all    |
| `item`     | `collectionSources`: one `{ dataSet, periodType, orgUnits }` per data set                                                                       | 3      |
| `item`     | `numerator`, `denominator`, `annualized`, `expression`, `operands` (each with `id`, `ref`; an `N{}` operand is the nested indicator)            | 4      |
| `item`     | `metric`                                                                                                                                        | 5      |
| `query`    | `coarser`: `period` is then the range, and the case reads every `periodType` period in it                                                       | 3      |
| `query`    | `request`, `startDate`, `endDate`                                                                                                               | 6      |
| `expected` | `periodTypes`                                                                                                                                   | 6      |
| `observed` | `error` (for `ERROR`); `coarse`, `rows` (3); `periodTypes`, `periods` (6); `source` (7)                                                         |        |
| `query`    | `withPeriod`: the other period in the same request (pair cases)                                                                                 | 7      |
| `item`     | `id`, `categoryCombo` (`{ key, id }`), `categoryOptionCombo` (`{ key, id, categoryCombo }`), and `categoryCombo` in each of `collectionSources` | 16     |
| top level  | `findings`: the assignment rules (2) or the rule scores (7), per version                                                                        | 2, 7   |

**Org unit fixtures** (groups 8 to 15): `fixtures/org-units/<group>.json`
and `fixtures/org-units-smoke/`, same base format, with:

- top level `hierarchy`: each unit by key with its `level` and `parent`,
  and each group with its member keys;
- `item.collectionSources`: `{ dataSet | program, orgUnits: [keys] }`, with
  `aggregationLevels` and `orgUnitField` where set (`DATA_ELEMENT` for an
  org unit data element);
- `query.orgUnits`: the DV items, unit keys in place of ids (`['LEVEL-4',
'region']`, `['OU_GROUP-g', 'D1']`, `['USER_ORGUNIT_CHILDREN']`);
- `expected`: `status`, `value`, `contributes` (the unit keys that should
  count), and the library's `compatibility` and `reasons`;
- `observed[version].rows`: the value of each row, by unit key.

The org unit requests (group 15) are also in `metadata-shapes.json`, and
in its smoke version. In the smoke subset, an org unit case's pattern
includes its selection, so every org unit case is kept.

## Input and output

The only input is `input/<instance>/<group>.json` (committed): what each
server answered, written by `verify.js`. Everything else is computed from
it and the code, offline, in seconds: the verdicts, `results/` and
`fixtures/`. So `node report.js` and `node export-fixtures.js` rebuild them
without a server, and `input.test.js` checks that `input/` is necessary and
sufficient: one observation for each case the model builds, and no other.

An input file holds only what can't be recomputed (see `observations.js`):

- the run: `instance`, `version`, `revision`, `date`;
- `serverInfo`, the server facts the cases depend on (its aggregation
  types and period types, the default category option combo), and
  `periodCheck`;
- `rows`, one per case: `[id, status, value]`, then the error and extras
  when there are any (rows by org unit, the coarse total);
- `responses`: the metadata responses of groups 6 and 15.

Verdicts, counts, group summaries, and group 7's source periods (worked
out from the value) are not stored.

Rebuilding the input itself needs the servers: `run-all.js` on every
instance, after a nightly reset, about an hour in all. The dev instances
are rebuilt from their branches every night, so a new run can differ: the
committed input records what each version answered on its `date`.

| Folder      | Committed | What                                                                        |
| ----------- | --------- | --------------------------------------------------------------------------- |
| `input/`    | yes       | The observations: the tool's only input.                                    |
| `results/`  | yes       | `summary.json`, `REPORT.md` (from `input/`), `instances.json`.              |
| `fixtures/` | yes       | What the library tests read (from `input/`).                                |
| `output/`   | no        | Payloads, import reports, logs, the PTT user's passwords (`output/users/`). |
