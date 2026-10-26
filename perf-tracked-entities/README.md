# Tracked entities: performance test data

Generates tracked entities at several sizes on a DHIS2 server, so the maps-app
tracked entity layer can be tested with realistic volumes, and benchmarks the
two requests the layer can make: the tracker API (2.40, and the loader before
[DHIS2-16362](https://dhis2.atlassian.net/browse/DHIS2-16362)) and tracker
analytics (2.41+).

Plain Node (18 or newer), no dependencies, no install step.

## What it creates

One tracked entity type and program per dataset, so each size can be added to
the map as its own layer:

| Dataset    | Tracked entity type | Geometry | Count   |
| ---------- | ------------------- | -------- | ------- |
| `1k`       | PTE 1k              | Point    | 1,000   |
| `10k`      | PTE 10k             | Point    | 10,000  |
| `50k`      | PTE 50k             | Point    | 50,000  |
| `100k`     | PTE 100k            | Point    | 100,000 |
| `poly-10k` | PTE poly-10k        | Polygon  | 10,000  |

`100k` is above the maps-app page size of 50,000, so it triggers the truncation
warning.

- Tracked entities are spread evenly over the facilities (level 4 org units
  with a point), within about 1 km of them. Polygons are hexagons of about
  150 m.
- Every tracked entity has three attributes: `PTE Age` (number), `PTE Status`
  (option set: functional, non functional, needs repair) and `PTE GPS`
  (coordinate), and one enrollment in its dataset's program, with a mix of
  statuses, enrollment dates over two years, and about 10% marked for
  follow-up. Every enrollment has one completed event: tracker analytics only
  creates a type's event table when it has events, and its tracked entity
  query fails with "referenced table does not exist" without it (2.43.1).
- Everything is derived from the dataset and the tracked entity number, so
  a re-run updates the data in place instead of duplicating it.
- Every metadata object has a code starting `PTE_`, which is what
  `cleanup.js` removes.

### Relationships

`node generate.js --relationships` adds relationship data for the 1k and
100k datasets (imported before) and the demo database, for cases the demo
data doesn't cover:

| Object                                                                                        | Code                   | Triggers in the maps-app                                                                                                                            |
| --------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relationship type "PTE 1k to PTE 100k", between two types without programs                    | `PTE_REL_1K_TO_100K`   | the related tracked entities are requested by type; PTE 100k is above the tracker limit (50,000), so the layer warns about related tracked entities |
| 1,000 relationships, from each PTE 1k tracked entity to the PTE 100k one with the same number | (deterministic ids)    | none drawn: the related tracked entities are beyond the 50,000 returned                                                                             |
| Relationship type "PTE 1k to event"                                                           | `PTE_REL_1K_TO_EVENT`  | not offered by the layer dialog (relationships to events aren't supported)                                                                          |
| Relationship type "PTE 100k to PTE 100k", same type without programs                          | `PTE_REL_100K_TO_100K` | the related tracked entities are among the loaded ones, cut at the limit, so the layer warns for both                                               |
| 10 relationships between the 20 newest PTE 100k tracked entities, which the API returns first | (deterministic ids)    | relationship lines                                                                                                                                  |
| 13 "Focus to Case (NP - NP)" relationships, copying the demo focus area to case pairs         | (deterministic ids)    | relationship lines between two types without programs (the demo data has none of this type)                                                         |

`cleanup.js` removes them too.

### Test maps

`node generate.js --maps` saves one map per case to check in the maps-app
tracked entity layer, plus a few that should just work (`maps.js`). It needs
the datasets and the relationship data. Every map has a code starting
`PTE_MAP_`, so `cleanup.js` removes them.

| Map                                        | Layer                                                      | Shows                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| PTE test: tracker limit                    | PTE 100k, all levels below                                 | "Displaying first 50 000 tracked entities" on the tracker API, "… out of 100 000" on tracker analytics |
| PTE test: follow-up                        | PTE 1k program, follow-up                                  | the 98 tracked entities marked for follow-up, from the tracker API                                     |
| PTE test: related limit                    | PTE 1k, relationship type "PTE 1k to PTE 100k"             | the related limit warning (no lines: the related ones are beyond the limit)                            |
| PTE test: related limit, same type         | PTE 100k, relationship type "PTE 100k to PTE 100k"         | both limit warnings and 10 lines; the request takes about a minute                                     |
| PTE test: relationship to events           | PTE 1k, relationship type "PTE 1k to event"                | "Only relationships between tracked entities are supported"                                            |
| PTE test: different types without programs | Focus area, "Focus to Case (NP - NP)" (demo)               | the related tracked entities requested by type                                                         |
| PTE test: default mode                     | PTE 10k program, no selection mode saved                   | the default for the server version                                                                     |
| PTE test: immediate children               | PTE 100k program on Kakua, "Immediate children", follow-up | the children lookup, then the tracker API in `SELECTED` mode                                           |
| PTE test: polygons                         | PTE poly-10k program                                       | polygons and their popup                                                                               |
| PTE test: active enrollments               | PTE 10k program, active, enrollment period                 | just works                                                                                             |
| PTE test: malaria cases                    | Malaria case program (demo)                                | just works                                                                                             |
| PTE test: focus areas with cases           | Malaria focus investigation, "Focus to Case" (demo)        | just works, with relationships                                                                         |

### Test users

`test-users.json` holds three users for checking the access rules, imported with `POST /api/metadata`. All view data for all of Sierra Leone; the password is in the file.

| User                               | Role                                           | Shows in the maps-app                                                                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pte_capture_bombali_analytics`    | Maps and event analytics, capture in Bombali   | analytics layers load for Sierra Leone; follow-up and relationship layers (tracker API) fail with "Organisation unit is not part of the search scope"; popups of tracked entities outside Bombali fail |
| `pte_capture_bombali_no_analytics` | Maps only                                      | analytics layers fail with E7217 ("User is not allowed to view event analytics data")                                                                                                                  |
| `pte_no_capture_analytics`         | Maps and event analytics, no capture org units | analytics layers load; every tracker API layer fails ("Organisation unit is not part of the search scope"), and every popup ("User needs to be assigned either search or data capture org units")      |

`cleanup.js` doesn't remove them.

## Where it may write

Only the public play instances (`https://play.im.dhis2.org/<name>`),
`https://dev.im.dhis2.org/maps-app-43-1` and `localhost`. `guard.js` refuses
any other server for the scripts that write (`generate.js`, `run-analytics.js`,
`cleanup.js`). `benchmark.js` only reads, so it runs anywhere.

Play instances reset every night, so prefer `maps-app-43-1`, which keeps the
data.

## Quickstart

```bash
cd perf-tracked-entities
node --test                          # the pure parts
node generate.js --dryRun            # writes the payloads to output/, sends nothing
node generate.js                     # metadata and all datasets (~7 min on maps-app-43-1)
node generate.js --relationships     # relationship types and relationships
node generate.js --maps              # the test maps
node run-analytics.js                # tracked entity analytics tables only
node benchmark.js                    # writes results/<instance>/
node cleanup.js                      # lists what it owns; --yes deletes it
```

The default server is `https://dev.im.dhis2.org/maps-app-43-1`. Credentials
come from flags (`--baseUrl`, `--username`, `--password`) or `DHIS2_BASE_URL`,
`DHIS2_USERNAME`, `DHIS2_PASSWORD`. Defaults are `admin`/`district`.

## Scripts

| Script             | What it does                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `generate.js`      | Imports the metadata, then every dataset through `/api/tracker` in batches. `--datasets=1k,10k` limits it, `--batchSize` (1000). |
| `run-analytics.js` | Starts the analytics tables job for tracked entities only (aggregate, events and enrollments skipped) and waits for it.          |
| `benchmark.js`     | Times both requests for every dataset, all org units below the root, `--repeats` (3) times. GET only. `--timeoutSeconds` (300).  |
| `cleanup.js`       | Lists the tracked entities and metadata the tool owns; `--yes` deletes them, tracked entities first.                             |

## Benchmark

For every dataset, `benchmark.js` sends the two requests as the maps-app
loaders do, for all org units below the root:

- **Tracker API (old loader)**: `tracker/trackedEntities` with `paging=false`.
- **Analytics (new loader)**: `analytics/trackedEntities/query/<type>` with
  `geometryOnly=true` and `pageSize=50000`.

It records the rows, response size and median time, and writes
`results/<instance>/benchmark.json` and `results/<instance>/REPORT.md`.

This measures the API only. Rendering in the map is tested by hand: add the
`PTE` layers in the maps app and watch load time, panning and the truncation
warning.
