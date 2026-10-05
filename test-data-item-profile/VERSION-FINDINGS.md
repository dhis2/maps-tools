# Period types and org units: cross-version findings

Runs of `run-all.js` on every live play instance, on 2026-09-30, again on
2026-10-01 (after the nightly reset) with group 7 and one period per
request (finding 3), and on 2026-10-02 with the org unit groups 8 to 15
(findings 11 to 17). Same generated data (see `README.md`). The tables
behind each point are in [results/REPORT.md](results/REPORT.md); the
per-case data is in `fixtures/period-types/` and `fixtures/org-units/`.

## Results

pass / fail / recorded per group, against the rules below (`expected.js`
holds them since 2026-10-05; before, a first hypothesis, which these
findings corrected). Observations from 2026-10-01 and 2026-10-02. Counts
differ between versions because older versions have fewer period types, so
fewer cases. Group 7 expects nothing: it scores candidate rules (finding 3).

| Version          | Instance         | G1 aggregation       | G2 nesting   | G3 mixed    | G4 indicators  | G5 rates        | G6 requests | G7 carry      |
| ---------------- | ---------------- | -------------------- | ------------ | ----------- | -------------- | --------------- | ----------- | ------------- |
| 2.40.12          | `stable-2-40-12` | 25836 / 2052 / 13266 | 16 / 0 / 210 | 105 / 0 / 0 | 984 / 72 / 312 | 1386 / 90 / 234 | 45 / 0 / 1  | 0 / 0 / 22246 |
| 2.41.10          | `stable-2-41-10` | 27048 / 0 / 14106    | 16 / 0 / 210 | 105 / 0 / 0 | 1035 / 0 / 333 | 1458 / 0 / 252  | 45 / 0 / 1  | 0 / 0 / 22246 |
| 2.41.11-SNAPSHOT | `dev-2-41`       | 27048 / 0 / 14106    | 16 / 0 / 210 | 105 / 0 / 0 | 1035 / 0 / 333 | 1458 / 0 / 252  | 45 / 0 / 1  | 0 / 0 / 22246 |
| 2.42.6           | `stable-2-42-6`  | 30147 / 0 / 15453    | 18 / 0 / 210 | 105 / 0 / 0 | 1083 / 0 / 357 | 1512 / 0 / 288  | 45 / 0 / 1  | 0 / 0 / 22246 |
| 2.42.7-SNAPSHOT  | `dev-2-42`       | 30147 / 0 / 15453    | 18 / 0 / 210 | 105 / 0 / 0 | 1083 / 0 / 357 | 1512 / 0 / 288  | 45 / 0 / 1  | 0 / 0 / 22246 |
| 2.43.1           | `stable-2-43-1`  | 40181 / 0 / 20125    | 22 / 0 / 244 | 105 / 0 / 0 | 1239 / 0 / 417 | 1710 / 0 / 360  | 45 / 0 / 1  | 0 / 0 / 22246 |
| 2.43.3-SNAPSHOT  | `dev-2-43`       | 40181 / 0 / 20125    | 22 / 0 / 244 | 105 / 0 / 0 | 1239 / 0 / 417 | 1710 / 0 / 360  | 45 / 0 / 1  | 0 / 0 / 22246 |
| 2.44-SNAPSHOT    | `dev`            | 40181 / 0 / 20125    | 22 / 0 / 244 | 105 / 0 / 0 | 1239 / 0 / 417 | 1710 / 0 / 360  | 45 / 0 / 1  | 0 / 0 / 22246 |

`play.im.dhis2.org/dev-2-40` didn't answer: 2.40 is covered by stable only.

The only fails are on 2.40.12: every query with a QuarterlyNov period
fails there (finding 5), while the expected answers are the same for every
version. One item is open: a 2.42 dev snapshot that misses week 1 of 2026
in completeness (finding 9); those cases have no exact expected value, so
it shows as a difference between versions, not a fail.

Differences between versions are labelled in REPORT.md with the finding
that explains them (`known-differences.js`); a new one shows as
**unexplained**. There are none.

## Key findings

### 1. Nothing finer than collected: confirmed, with one refinement

On every version, SUM, COUNT, MIN, MAX, STDDEV, VARIANCE, the `*_SUM_ORG_UNIT`
types and `LAST_IN_PERIOD*` return no rows for a query type shorter than
the collection type (G1, `shorter · EMPTY` passes everywhere).

**Equal length is not enough.** A Wednesday week asked by Monday week, a
November quarter asked by quarter, a financial year asked by year: all
empty, for every aggregation type that doesn't look back (G1
`equal-length`, G2 financial types by year). "Longer" means a strictly
greater frequency order, or the same type.

### 2. Averaged types repeat into shorter periods

Asked one period at a time, `AVERAGE` and `AVERAGE_SUM_ORG_UNIT` repeat the
value exactly, on every version: a yearly 2 is 2 for week 29 of 2025, a
July–August bi-month's 10 is 10 for 15 July. A period that starts in the
year before takes that year's value: week 1 of 2025 (from 30 December 2024) gets 2024's.

On a longer query type, `AVERAGE_SUM_ORG_UNIT` divides by the **query
period's** days: days without data count as zero. Daily data through
December 2025, asked for April 2025 to March 2026, gives the sum over 365
days (447.53, not 594). `expected.js` uses that rule.

**The one version difference: averaged data over a period that spans two
years.** Asked for a financial year, yearly `AVERAGE_SUM_ORG_UNIT` data
(1 in 2024, 2 in 2025) is weighted the same on every version, but divided
by 366 days (2024's length) on 2.40 to 2.42, and by the query period's
days on 2.43 and later:

| Asked for                          | Weighted sum | 2.40 to 2.42     | 2.43 and 2.44    |
| ---------------------------------- | ------------ | ---------------- | ---------------- |
| `2024April` (Apr 2024 to Mar 2025) | 457          | 457/366 = 1.2486 | 457/365 = 1.2521 |
| `2024July`                         | 548          | 1.4973           | 1.5014           |
| `2024Oct`                          | 639          | 1.7459           | 1.7507           |
| `2024Sep`                          | 608.67       | 1.6630           | 1.6676           |
| `2023Oct` (only 2024 data)         | 366 or 367   | 1.0000           | 1.0027           |

The weighted sum is close to, but not exactly, value × days in each year:
most rows match whole months (`2024April`: 9/12 of 366 days × 1, plus 3/12
of 365 days × 2 = 457), `2024Feb` is about a day off. Those cases have no
expected value in `expected.js` (an averaged repeat over two data periods),
so they are `recorded`: 60 in G1, and 48 coverage cases over the averaged
population in G4 (financial years, 0.9275 before 2.43 and 0.925 from 2.43
for `2024April` at A). Statuses don't differ.

The same happens when another item in the request reaches into the year
before, like `.periodOffset(-1)`: group 4 asks for that indicator in a
request of its own, so its neighbours stand alone.

(The first run, on 2026-09-30, asked for two periods per request and showed
scaled repeats such as 62/59 and 1.9945. Those came from the other period
in the request: finding 3.)

### 3. FIRST and LAST read the years the request touches

`LAST`, `FIRST` and their `*_AVERAGE_ORG_UNIT`, `LAST_LAST_ORG_UNIT` and
`FIRST_FIRST_ORG_UNIT` variants don't stay in the period asked for. On
every version, in all 22,246 cases of group 7:

> A data period counts when it **ended by the end of the query period**,
> and its **year** is one of the years the **request** touches. `FIRST`
> takes the earliest that counts, `LAST` the latest. Nothing counts:
> empty.

- A data period's year is its start date's year, except for weeks of every
  start day: the year in the id. Monday week 1 of 2025 (from 30 December 2024) is a 2025 period, but `2025BiW1` (from 30 December 2024),
  `2025NovQ1`, `2025NovS1` and `2025Nov` (from November 2024) are 2024
  periods. Group 7 showed the week case; group 1 (bi-weeks and the November
  types, 2026-10-05) the start dates.
- The years a request touches are the years its periods' dates fall in,
  for every period and item of the request (`.periodOffset` adds the
  period it reaches). A set, not a range: 2023 and 2025 together don't
  bring in 2024.
- This is how analytics reads its tables, one per year.

So for a period asked alone:

- `LAST`, monthly data, 15 July 2025 by day: June 2025 (18). 1 January 2025
  by day: **empty**, as December 2024 is in a year the request doesn't
  touch. Yearly data asked by month: empty (2025 hasn't ended by then).
- `FIRST`, daily data, 15 July 2025 by day: 1 January 2025 (367), not the
  day itself. Monthly data, 2025 by year: January 2025 (13).
- Wednesday week 1 of 2025 (1 to 7 January) touches only 2025: nothing
  before it is carried in.

**The other periods of a request change the answer.** 15 July 2025 asked
with any 2024 period, of any type, in the same request: `FIRST` gives
1 January 2024. With a 2023 period it doesn't change, as there's no data
in 2023 (group 7, pair cases). The same holds for an item like
`.periodOffset(-1)` that reaches into the year before. A dashboard or a
visualization that asks for several periods at once can get other values
than one period at a time.

For the library:

- a value of these types in a shorter or equal-length period is carried
  from another period, not repeated: treat it as finer;
- the result of a single period depends only on that period and the data
  dates, with the rule above;
- the fixtures now ask one period per request (groups 1, 2, 4 and 5), so
  each case stands alone. Group 3 asks for several periods at once on
  purpose (the probe), with SUM only, which doesn't depend on the request.

`LAST_IN_PERIOD` stays within the period and behaves like SUM.

### 4. FIRST_FIRST_ORG_UNIT and LAST_LAST_ORG_UNIT pick an arbitrary place

At the region, where A and B both have a value for the same period, these
two return A's value or B's (562 or 5620), and the pick changes from one
run to the next on the same server. Two runs in a row on 2.43.1 differ in
567 such cells, and nowhere else (18 more VARIANCE cells differ only
past the 10th digit). In REPORT.md their version splits "vary".

### 5. Period types differ by version

| Type                                     | 2.40                    | 2.41    | 2.42    | 2.43, 2.44            |
| ---------------------------------------- | ----------------------- | ------- | ------- | --------------------- |
| WeeklyFriday, FinancialFeb, FinancialAug | missing                 | missing | missing | yes                   |
| FinancialSep                             | missing                 | missing | yes     | yes                   |
| QuarterlyNov                             | queries fail (HTTP 500) | yes     | yes     | yes                   |
| TwoYearly                                | missing                 | missing | missing | listed, no ISO format |

- A missing type is absent from `/api/periodTypes`; a data set of that type
  is refused ("Missing required property `periodType`"); its ids are
  "Period not valid" (E7611).
- On 2.40.12, any analytics query with a QuarterlyNov period fails:
  "Can't find resource for bundle … key format.QuarterlyNov.startDate".
  Data sets of that type can be created and filled. All of 2.40's extra
  G1, G4 and G5 fails are these queries.
- TwoYearly can't be entered or asked for by id on any version.
- Where a period exists, its start and end dates are the same on every
  version (checked for every queried period).

Period ids: week 1 of every weekly type holds 4 January. Bi-weeks follow
Monday weeks (a 53-week year gets a 27th bi-week that overlaps the next
year's first). Financial years are named by their start year, except
`FinancialNov`, named by its end year (`2024Nov` is November 2023 to
October 2024); November quarters and six-months follow it.

### 6. Where non-nesting periods land (G2)

The same on every version:

- Weeks of every start day: in the month, quarter and year holding most of
  their days (for Monday weeks, where the Thursday falls). Monday week 1 of
  2025, from 30 December 2024, counts in January.
- Bi-weeks: by start date, even when most days fall in the next month.
- November quarters and six-months, April six-months: in the year holding
  most of their days (all three rules agree on 2024 and 2025).
- November quarters asked by quarter, and financial years asked by year:
  empty (finding 1).

### 7. Mixed collection: the Part 0 findings hold on every version (G3)

All 105 cases pass on every version:

- An element in a Monday and a Wednesday weekly data set: asked by Monday
  week, only the Monday half; by Wednesday week, only the Wednesday half;
  by bi-week, month or longer, both.
- Monthly at A, weekly at B: asked by week at the region, only B.
- Monthly in 2024, weekly in 2025, only the weekly data set left: 2024 by
  week is empty, though its metadata now says weekly.
- An element in no data set still has its monthly values.

The coarser probe (the query type's periods against the quarter holding
them) tells `PARTIAL` from `EMPTY` in every case.

### 8. Indicators and expressions (G4)

Every operand kind works on every version: `#{de}`, `#{de.coc}`, `N{}`,
`R{ds.REPORTING_RATE}`, `C{}`, `OUG{}`, `[days]`, `.periodOffset(-1)`, and
an expression item.

- An indicator has a value only where all its data operands do: a monthly
  count over a yearly summed population is empty below the year.
- `C{}`, `OUG{}` and `[days]` alone have a value at every period type,
  even where no data exists. `OUG{}` counts the group's members inside the
  org unit asked for (1 at A, 2 at the region).
- Annualized: the value times days in the year over days in the period
  (365/31 for January 2025, 365/90 for Q1 2025).
- On a first import, an expression item that refers to an element created
  in the same payload is refused ("Expression is not parsable"); it works
  once the element exists.
- The fails are `R{}` in shorter periods (finding 9); before 2.43, the
  averaged coverage values too (finding 2); on 2.40, QuarterlyNov queries
  (finding 5).

### 9. Reporting rates answer 0, not empty, when asked finer (G5)

Asked for a period shorter than the data set's, reporting rates and actual
reports are 0, and expected reports 0 (or one per place, for an
equal-length type of another kind), on every version: a row, not an
empty result (G5, `EMPTY → REPEATED`, with value 0). Where periods nest,
rate, actual and expected reports match the registrations exactly.

A 0 there is misleading: the library should treat it as finer.

**Open, 2.42.7-SNAPSHOT only:** week 1 of 2026 (29 December 2025 to
4 January 2026) has its registrations, but analytics counts 0 actual
reports for it, where 2.42.6, 2.43 and 2.44 count 1. Week 1 of 2025 is
fine. So the two financial years that run into 2026 have one report less
per place there (12 cases). It's on the 2.42 dev branch only (revision
1552bd1, built on 2026-10-01).

### 10. Detection requests (G6)

- `dataSetElements[dataSet[id,periodType]]` on data elements works on every
  version. The `dataSets` field is silently dropped everywhere.
- `/api/dataItems` returns `id`, `name`, `dimensionItemType` and
  `valueType`, but not `aggregationType` or `expression`: it can't replace
  the per-type metadata requests.
- The response shapes are the same on every version, except the period
  types list (finding 5).
- `analytics/rawData` with `startDate` and `endDate` returns only periods
  fully inside the range (15 April to 15 May 2025: weeks 17 to 19, no
  months), and includes the org units below the one asked for. No row
  limit showed: 51,408 rows came back whole on 2.43 and later (47,700 on
  older versions, which lack WeeklyFriday).

## Org units (groups 8 to 15)

pass / fail / recorded on 2026-10-02. **The same on every version, 2.40.12
to 2.44-SNAPSHOT, with no difference between versions.**

| Group                   | Cases | Every version |
| ----------------------- | ----- | ------------- |
| 8 `entered-above`       | 5     | 5 / 0 / 0     |
| 9 `partly-assigned`     | 5     | 5 / 0 / 0     |
| 10 `mixed-levels`       | 6     | 6 / 0 / 0     |
| 11 `aggregation-levels` | 12    | 12 / 0 / 0    |
| 12 `org-unit-groups`    | 4     | 3 / 1 / 0     |
| 13 `user-org-units`     | 3     | 3 / 0 / 0     |
| 14 `programs`           | 28    | 28 / 0 / 0    |
| 15 `org-unit-requests`  | 16    | 12 / 0 / 4    |

Each unit enters its own factor (F1 1, F2 10, F3 100, D1 1,000, D2 10,000)
in each month of Q1 2025, so every total below names the units it came
from. The library's predictions (`expected.compatibility`, `reasons`) are
in the fixtures; every observed status matches them, but for the empty
group (finding 15).

### 11. Values go up, never down (groups 8 to 10)

- Entered at D1 only: D1 and the region get it, F1 and `LEVEL-4` under the
  region get nothing, `LEVEL-3` gets D1's row. Nothing is split down to the
  facilities (`BELOW_COLLECTION`).
- Assigned to F1 and F2, not F3: F3 and D2 get nothing (`NOT_ASSIGNED`),
  D1 and the region get F1 + F2 (33), and `LEVEL-4` gets the F1 and F2
  rows (`PARTLY_ASSIGNED`).
- One element in a facility data set and a district one (D1): F1 gets only
  its own 3 (D1's 3,000 can't reach it: `partial`), D1 gets 3,033, the
  region 3,333. An indicator over it (`#{el}/1`) gives the same values
  (`OPERAND_PARTIAL` at F1).

### 12. Aggregation levels: the library's rule holds (group 11)

> A value entered at level d can't reach a requested level k when one of
> the element's aggregation levels L has k ≤ L < d.

All 12 cases, on every version:

| Aggregation levels, entered at | F1 (4)        | D1 (3) | Region (2) |
| ------------------------------ | ------------- | ------ | ---------- |
| [3], facilities                | 3             | empty  | empty      |
| [2], facilities                | 3             | 33     | empty      |
| [2, 3], facilities             | 3             | empty  | empty      |
| [3], D1                        | empty (below) | 3,000  | 3,000      |

### 13. Org unit groups (group 12)

`OU_GROUP-g` (members D2 and F1) gives one row per member, with what's
under it: D2 with F3's (30,300), F1 (3). With D1 as a boundary, only F1;
with the region, both.

### 14. User org units (group 13)

As a user whose data view unit is the region, `USER_ORGUNIT` gives the
region's total, `USER_ORGUNIT_CHILDREN` one row per district (A and B have
no data for this element), `USER_ORGUNIT_GRANDCHILDREN` the three
facilities. A user with only the `M_dhis-web-data-visualizer` authority can
query analytics.

### 15. An empty org unit group is an error, not an empty result

`OU_GROUP-<group without members>` is refused on every version: HTTP 409,
`E7143` "Organisation unit or organisation unit level is not valid". The
hypothesis expected an empty result, so this is the group's one fail. The
library should treat a selection that resolves to no unit as `none`, and
not send it.

### 16. Programs (group 14)

Program indicators counting events (`V{event_count}`), on every version:

| orgUnitField                     | Where the counts land                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| unset (event program)            | the event's unit: F1 3, F2 2; F3 (not assigned) empty                                                           |
| an org unit data element         | the unit in the element: F3 1 (the one event with F3 set); events without it count nowhere                      |
| unset (tracker program)          | the event's unit, F1                                                                                            |
| `REGISTRATION`                   | the tracked entity's unit, F2                                                                                   |
| `ENROLLMENT`                     | the enrollment's unit, F1                                                                                       |
| `OWNER_AT_START`, `OWNER_AT_END` | the owner at that date: F1. Ownership moved to F3 today, after the period, so history counts, not today's owner |

- Before 2.43, a program indicator without `analyticsPeriodBoundaries`
  can't be queried: SQL "syntax error at or near and" (E7145). The tool's
  indicators have the two boundaries the maintenance app sets; a library
  can't fix that, but it explains errors on old servers.

### 17. Org unit requests (group 15)

All the library's org unit counts are right on every version, including
the nested filters checked only on 2.44 before:

- `parent.parent.organisationUnitGroups.id:eq:<top>` (the region's
  grandchildren): 3; with group `g`: 0;
- `children.organisationUnitGroups.id:eq:<g>` (units with a child in `g`):
  2, D1 and the region;
- `path:like:<region>`: 9; `dataSets.id`, `programs.id`, `id:in`,
  `organisationUnitGroups.id`: as expected; the assigned ancestors list
  (`id:in` with `dataSets.id`): D1 only.

`level:eq:4`, the levels and `me` are recorded (they depend on the
server's own data); their responses are in `metadata-shapes.json`.

## Import differences

- 2.40 to 2.42 refuse values for a period that hasn't ended when
  `openFuturePeriods` is 0 (`2025Oct` runs to September 2026). 2.43
  accepts them.
- 2.40.12 answers HTTP 409, with no message, to 1,097 completeness
  registrations in one request; 500 at a time work.
- Completeness registrations need data write sharing on the data set, even
  for a superuser. Values don't.
- On a second import, 2.40 to 2.42 count unchanged values as "ignored";
  2.43 counts every value as "updated", even on a first import.
- `cleanup.js` can't delete data elements or org units that have data value
  audits (DataValueAudit); values are now imported with `skipAudit=true`.
- A user can't be imported in the same payload as its org units: 2.43.1
  answers HTTP 500 ("fetchedOrgUnit is null"). Users go in a second
  import.
- A tracker program stage takes a second event in an enrollment only when
  it is `repeatable`.
- Ownership transfer: 2.40 takes `trackedEntityInstance` and `ou`, 2.43 and
  later `trackedEntity` and `orgUnit`; 2.41 and 2.42 refuse both pairs at
  once ("Only one parameter … must be specified"), and 2.41 answers the
  new names with an HTML error page.
