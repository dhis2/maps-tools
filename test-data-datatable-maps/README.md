# Data table maps: test data

Saves one map per data table scenario (layer types, styles, timeline and split
periods, event layers from about 1,000 to over 100,000 events, two layers at
once), so a reviewer can open the data table on a prepared map instead of
setting up a layer.

Made for [DHIS2-21456](https://dhis2.atlassian.net/browse/DHIS2-21456), the
data table's first release, built in parts on the maps-app integration branch
of [#3817](https://github.com/dhis2/maps-app/pull/3817). Its preview test steps
link these maps.

Plain Node (18 or newer), no dependencies, no install step.

## How it works

The maps are copies of maps saved by hand in maps-app on maps-app-43-1 while
the data table was built. `input/maps-app-43-1/source-maps.json` holds those
maps as maps-app loads them; the copies are built from that file, so they can be
saved on any server built from the Sierra Leone database.

Each copy keeps the layers maps-app would save (its `validLayerProperties`),
with three changes:

-   the hidden `combinedTableRef` layer and the `combined*` config keys, saved by
    unreleased builds of the Combined data table, are dropped;
-   the `dataTableColumnConfig` config key, saved by unreleased builds that
    stored column settings with the map, is dropped;
-   the basemap is set to OSM Light. Most source maps, saved on 2.43 by builds
    that sent the legacy basemap JSON, store that whole JSON string as the
    basemap id.

## Running

1. Set the server and an account that may create maps, for example in a
   gitignored `.env.local` that you `source`:
    ```bash
    export DHIS2_BASE_URL=https://dev.im.dhis2.org/maps-app-43-1
    export DHIS2_USERNAME=admin
    export DHIS2_PASSWORD=<your password>
    ```
2. Check the maps without writing anything (`output/payload.json`):
    ```bash
    node index.js --dryRun
    ```
3. Create or update the maps:
    ```bash
    node index.js
    ```
    It prints each map's link, reads each map back as maps-app loads it, and
    fails if its layers differ from what was sent. Every run writes
    `output/import-summary.json`.

Every map has a fixed id, so re-running updates in place.

To refresh the source maps after changing them on maps-app-43-1 (only reads):

```bash
node snapshot.js
```

## What it creates

21 maps named "Data table test: ...", readable by everyone, on OSM Light:

| Map                                                   | Id            | Copy of       | What it shows                                                                                                                  |
| ----------------------------------------------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Thematic layer - Single                               | `MDfsQXA2VR1` | `yYaagMvoVTE` | ANC 1st visit for the last 12 months by district: value, legend, range and colour columns.                                     |
| Thematic layer - Timeline                             | `lNdO49lnjka` | `aOJt39Bxi7o` | ANC 1st visit as a timeline over the last 12 months: columns follow the period shown, other periods can be added as columns.   |
| Thematic layer - Timeline (x2)                        | `zfJ6s66cOE0` | `McbOy0vTX5C` | ANC 1st and 2nd visit, both as timelines: two tables, one per layer.                                                           |
| Thematic layer - Split                                | `NZHMKTQcrtP` | `Xcb2gEhq9EX` | ANC 1st visit split by June, July and August 2025: one value column per period, no legend, range or colour columns.            |
| Thematic layer - Split (x2)                           | `iFaqwmHgXIu` | `jFLIzT79k0q` | ANC 1st and 2nd visit, both split by June, July and August 2025: two tables, one per layer.                                    |
| Facilities layer - No style                           | `g4x69Sd07vx` | `Ty4iI2O3t3c` | Facilities at level 4, not styled by a group set.                                                                              |
| Facilities layer - Facility type                      | `iB2d92gcSFv` | `tMLCPz8Lb0B` | Facilities styled by the Facility type group set: group, colour and icon columns.                                              |
| Organisation units layer - No style                   | `kkOpED9Ed4s` | `BJ6PDONq0UQ` | Chiefdom boundaries, not styled by a group set.                                                                                |
| Organisation units layer - Area                       | `NK5RxqQdNKD` | `C7PIMo0NuNV` | District boundaries styled by the Area group set: group and colour columns.                                                    |
| Earth engine layer - Population age groups            | `H41xCjRPqFG` | `FMgI8NLiFxj` | WorldPop Global2 population for two age groups by district, as sum and mean: one column per band and statistic.                |
| Tracked entities layer                                | `NhDM6wSdwqM` | `ezJk7w1rFuN` | Malaria focus investigations in Sierra Leone: for the tracked entity data table, which is not in the first release.            |
| Events layer - ~1k - Server cluster                   | `epic0lwfRSv` | `vzs97laj9ID` | Child Programme births in one district over the last 5 years, clustered, not styled.                                           |
| Events layer - ~1k - Client cluster - MCH Apgar Score | `yvM3atGSniL` | `BspYL92n5pW` | Child Programme births in one district over the last 5 years, styled by the numeric MCH Apgar Score: legend and range columns. |
| Events layer - ~10k - Server cluster                  | `D2QX6E8zzkc` | `yKWzn188DgM` | Child Programme births in Sierra Leone over the last 10 years, clustered, not styled.                                          |
| Events layer - ~10k - Client cluster - Gender         | `VHXAvJDCcvq` | `d28EZNVL7K4` | Child Programme births in 13 districts over the last 10 years, styled by the Gender option set.                                |
| Events layer - ~50k - Server cluster                  | `T5T9TDwAkEJ` | `YeFx91b5MJb` | Inpatient morbidity and mortality events in Sierra Leone over the last 10 years, clustered, not styled.                        |
| Events layer - ~50k - Client cluster - Age in years   | `j77wBGHG3nj` | `MspwLJoAM07` | Inpatient morbidity and mortality events over the last 10 years, styled by the integer Age in years.                           |
| Events layer - >100k - Server cluster                 | `nFMFT9kAlD1` | `SsyMJjoX4Hi` | Malaria case registrations in Sierra Leone over the last 10 years, clustered, not styled.                                      |
| Events layer - >100k - Client cluster - Gender        | `lfpQfKo38EA` | `JXuEP1lEhSD` | Malaria case registrations over the last 10 years, styled by the Gender option set.                                            |
| Malaria cases (aggregated) and NDVI                   | `vj3y1JThbti` | `rormF2g4e2v` | Malaria case count by district and the monthly vegetation index from Earth Engine: a thematic and an Earth Engine table.       |
| MCH Apgar Score (events) and Org Units                | `pbrUoNO7bY2` | `Ucnjhj4nka0` | Chiefdoms of one district and births styled by MCH Apgar Score: an organisation unit and an event table.                       |

Event counts depend on the server's data and change with relative periods.

## Effect on existing content

None: it only adds these maps. The source maps are read, never changed.

## Where it may write

Only the public play instances (`https://play.im.dhis2.org/<name>`),
`https://dev.im.dhis2.org/maps-app-43-1` and `localhost`. `guard.js` refuses
any other server before writing. Dry runs and `snapshot.js` only read.

## Tests

```bash
node --test
```
