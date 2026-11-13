# Maps app showcase: demo data

Builds the demo content for the "DHIS2 Maps App Showcase" series of
Community of Practice posts: for each post, the metadata it needs, synthetic
data that shows the post's patterns, the saved maps, a dashboard, demo users
and their interpretations. `verify.js` then checks through analytics that each
pattern is on the map.

Plain Node (18 or newer), no dependencies, no install step.

## Posts

| Post | Title                                   | Maps                                                       | Data                                                                  |
| ---- | --------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| 1    | Where are the unvaccinated?             | Penta1 coverage (fill), Penta1 to Penta3 dropout (bubbles) | 24 months of Penta1 and Penta3 doses under 1 year, for every facility |
| 10   | Map the data before you map the disease | Reporting rate split by month; reports on time by facility | 12 months of reports of the "Showcase: monthly HMIS report" data set  |

The patterns each post's data shows, and that `verify.js` checks:

| Post | Pattern                                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | Districts in all four RED/REC categories; Western Area above 100% coverage; two facilities with negative dropout |
| 10   | Tonkolili complete but late; Koinadugu red across the district; one red facility in Bo, which is green           |

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
4. Only if a check fails, or the interpretation texts should quote the new
   values, rewrite the maps and interpretations:
    ```bash
    node index.js --steps=content
    ```
    This deletes the interpretations the demo users wrote on the maps and
    writes them again.

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
