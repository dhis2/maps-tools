# Maps app showcase: demo data

Builds the demo content for the [DHIS2 Maps App Showcase](showcase-posts.md)
series of Community of Practice posts: for each post, the metadata it needs, synthetic
data that shows the post's patterns, the saved maps, a dashboard, demo users
and their interpretations. `verify.js` then checks through analytics that each
pattern is on the map.

Plain Node (18 or newer), no dependencies, no install step.

## Posts

| Post | Title                                   | Maps                                                                                                         | Data                                                                                                                         |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1    | Where are the unvaccinated?             | Penta1 coverage (fill), Penta1 to Penta3 dropout (bubbles)                                                   | 24 months of Penta1 and Penta3 doses under 1 year, for every facility                                                        |
| 6    | Is 100% coverage too good to be true?   | Deworming coverage split by round; WorldPop school-age children under the official denominator over WorldPop | 3 yearly rounds by chiefdom: children treated, official school-age estimate, WorldPop estimate                               |
| 8    | Seeing stockouts before patients do     | Months of stock by facility, one map each for artemether-lumefantrine and ORS                                | 15 months of stock on hand, consumption and average monthly consumption for every facility                                   |
| 10   | Map the data before you map the disease | Reporting rate split by month; reports on time by facility                                                   | 12 months of reports of the "Monthly HMIS report" data set                                                                   |
| 11   | Watching the lean season                | SAM admission rate as a timeline; OTP cure rate by district with exits per OTP site                          | 24 months of SAM admissions and OTP exits for the sites in the "OTP site" group, and children 6-59 months for every facility |

The patterns each post's data shows, and that `verify.js` checks:

| Post | Pattern                                                                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Districts in all four RED/REC categories; Western Area above 100% coverage; two facilities with negative dropout                                               |
| 6    | One chiefdom above 100% every round with a low official denominator; one red chiefdom with a high one; one partial round                                       |
| 8    | In Kenema, a stocked-out facility a few km from an overstocked one; a Kailahun chiefdom low after missed deliveries; a few facilities not reporting last month |
| 10   | Tonkolili complete but late; Koinadugu red across the district; one red facility in Bo, which is green                                                         |
| 11   | Admissions peak in June in the north and in August in the south-west; Kambia below 75% cure with a busy site; a Pujehun site with very few children            |

## Running

1. Set the server and an account that may create metadata, for example in a
   gitignored `.env.local` that you `source` (it is not loaded
   automatically):
    ```bash
    export DHIS2_BASE_URL=https://play.im.dhis2.org/stable-2-43-2-1
    export DHIS2_USERNAME=admin
    export DHIS2_PASSWORD=district
    ```
2. Check what would be sent, without writing anything (`output/payload.json`):
    ```bash
    node index.js --dryRun
    ```
3. Build everything for all posts:
    ```bash
    node index.js
    ```
    It runs four steps in order: `metadata`, `data`, `analytics` (2 to 10
    minutes) and `content` (maps, dashboards, sharing, interpretations). It
    prints the link to each map and dashboard and writes
    `output/import-summary.json`.
4. Check the planted patterns:
    ```bash
    node verify.js
    ```
    Each check prints `OK` or `FAIL` with the values it read;
    `output/verify-report.json` keeps them.

Options, for both scripts:

-   `--posts=1,10` builds or checks only these posts (default: all).
-   `--steps=data,analytics` runs only these steps (`index.js` only).
-   `--runDate=2026-11-01` generates data as if run on that date.

Every object has a fixed id and a `SHOW_` code, so re-running updates in
place.

## Earth Engine values

Some posts import values computed from Earth Engine datasets, the same ones
maps-app shows. `snapshot.js` computes them once and writes them to
`input/sierra-leone/`, which is committed; the posts read them from there, so
building the demo needs no Earth Engine access.

| File                       | What it holds                                                                         | Posts |
| -------------------------- | ------------------------------------------------------------------------------------- | ----- |
| `worldpop-school-age.json` | WorldPop Global2 children aged 5 to 14, both sexes, summed per chiefdom, 2020 to 2030 | 6     |

To compute them again, for example when a file needs more years (reads only;
it uses the Earth Engine access token of the instance in `DHIS2_BASE_URL`):

```bash
node snapshot.js
node snapshot.js --only=worldpop-school-age
```

## Demo users

Each persona of the posts has a user, `show_<persona>` (for example
`show_epi_officer`, `show_hmis_officer`, `show_facility_incharge`), with the
demo database's "M and E Officer" role and Sierra Leone as org unit.
`show_guest` has the "Guest" role, for a public read-only login.

Passwords are made on the first run and kept in `output/users.json`, which
later runs reuse. Delete that file to get new passwords on the next run.

Every map and dashboard can be read by the group "Showcase: all demo users"
and edited by the post's team group, for example "Showcase: EPI team". Users
outside these groups don't see them.

## Moving the data forward every month

The maps use relative periods such as "last 12 months", so without new data
they empty out as months pass. Once a month, after the 1st:

1. `source .env.local`, so the commands below write to the showcase instance.
2. Generate the data again for the new month and rebuild analytics:
    ```bash
    node index.js --steps=data,analytics
    ```
    This overwrites the data values for the whole window, adds the new
    month, and removes reports of the tool's own data sets that the new run
    no longer generates. Metadata, maps and interpretations are left as they
    are.
3. Check that every pattern still shows:
    ```bash
    node verify.js
    ```
4. In January, and whenever a check fails or the interpretation texts should
   quote the new values, rewrite the maps and interpretations. Some maps
   show fixed years (Post 6's rounds, Earth Engine layers), which move
   forward only with this step:
    ```bash
    node index.js --steps=content
    ```
    This deletes the interpretations the demo users wrote on the maps and
    writes them again.

## Seeing new data in the browser

Browsers keep analytics answers for as long as the instance's cache strategy
(System Settings > Server > Cache strategy) allows: two weeks on play. After
new data or new names, a map can show the old values and names until then.
To check a map right away, open it in a private window, or reload it with
"Disable cache" ticked in the browser's developer tools (Network tab).

## Effect on existing content

-   Post 1 overwrites the demo database's Penta1 and Penta3 doses under 1 year
    ("Fixed, <1y" and "Outreach, <1y") for every open facility over the last
    24 months.
-   Post 1 adds Penta1 and Penta3 to the data set "Showcase: EPI doses
    (synthetic data import)". Child Health uses the Implementing Partner
    attribute combo, the demo's values use the default one, and the server
    refuses the default one for Child Health; importing through this data set
    overwrites the demo's values instead of adding to them. Since these data
    elements now belong to two data sets, an import of them that doesn't name
    its data set fails with "found multiple sets". Data entry is not
    affected.
-   Post 8 turns on the system setting "Include zero data values in analytics
    tables" (`keyIncludeZeroValuesInAnalytics`). Without it, stored zeros stay
    out of analytics even for data elements where zero is significant, and
    stocked-out facilities show as "no data". Analytics tables grow with every
    zero value of the instance.
-   Everything else is new: users, user groups, legend sets, indicators, data
    sets, maps and dashboards, all with a `SHOW_` code.

## Where it may write

Only the public play instances (`https://play.im.dhis2.org/<name>`), for
drafts, and `localhost`. `guard.js` refuses any other server before writing.
Dry runs and `verify.js` only read.

## Tests

```bash
node --test
```
