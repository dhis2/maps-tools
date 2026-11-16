# Maps app showcase: demo data

Builds the demo content for the [DHIS2 Maps App Showcase](showcase-posts.md)
series of Community of Practice posts: for each post, the metadata it needs, synthetic
data that shows the post's patterns, the saved maps, a dashboard, demo users
and their interpretations. `verify.js` then checks through analytics that each
pattern is on the map.

Plain Node (18 or newer), no dependencies, no install step.

## Posts

| Post | Title                                   | Maps                                                                                                                                                                                   | Data                                                                                                                                                             |
| ---- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Where are the unvaccinated?             | Penta1 coverage (fill), Penta1 to Penta3 dropout (bubbles)                                                                                                                             | 24 months of Penta1 and Penta3 doses under 1 year, for every facility                                                                                            |
| 2    | Rain today, malaria next month          | CHIRPS rainfall and ERA5-Land temperature from Earth Engine for July; confirmed malaria cases per 1,000 split July to September; rainfall imported as data with cases on one split map | 36 months of confirmed malaria cases for every facility, generated from CHIRPS rainfall one to two months earlier; monthly rainfall and temperature per district |
| 3    | Drawing the ring around cholera         | Suspected cases in the last 7 days by chiefdom, building footprints, recent cases, and 150 m rings around RDT-positive cases                                                           | About 330 cholera case reports over 6 weeks in an event program, with household points                                                                           |
| 4    | Who hasn't been seen today?             | Contacts seen at daily visits by chiefdom, contacts under follow-up and completed, cases with lines to their contacts, new cases                                                       | 20 Ebola cases and 300 contacts in two tracker programs linked by a relationship type, with daily follow-up visits                                               |
| 5    | Two hours to a C-section                | WorldPop Global2 population, share of each district within two hours of EmONC, EmONC facilities with their two-hour catchments                                                         | 12 months of basic signal functions and caesarean sections for hospitals and health centres; WorldPop population inside the catchments per district              |
| 6    | Is 100% coverage too good to be true?   | Deworming coverage split by round; WorldPop school-age children under the official denominator over WorldPop                                                                           | 3 yearly rounds by chiefdom: children treated, official school-age estimate, WorldPop estimate                                                                   |
| 7    | Every school on the map                 | Adjusted gender parity index by district with pupil-teacher ratio by school, one map each for primary and junior secondary; pupil-teacher ratio split by census year                   | Two annual school censuses (enrolment by sex, teachers, classrooms, latrines) for about 190 schools, and school-age population by sex                            |
| 8    | Seeing stockouts before patients do     | Months of stock by facility, one map each for artemether-lumefantrine and ORS                                                                                                          | 15 months of stock on hand, consumption and average monthly consumption for every facility                                                                       |
| 9    | One bite, two sectors                   | Dog vaccination coverage by district, dog bites by risk of the biting animal, animal rabies investigations by result                                                                   | A year of dog bites and animal investigations in two event programs, and last year's dog vaccination campaign                                                    |
| 10   | Map the data before you map the disease | Reporting rate split by month; reports on time by facility                                                                                                                             | 12 months of reports of the "Monthly HMIS report" data set                                                                                                       |
| 11   | Watching the lean season                | SAM admission rate as a timeline; OTP cure rate by district with exits per OTP site                                                                                                    | 24 months of SAM admissions and OTP exits for the sites in the "OTP site" group, and children 6-59 months for every facility                                     |
| 12   | Green fields, empty granaries?          | Rainfall since April as % of the 1991-2020 normal, MODIS vegetation for August of this season and a reference year, landcover, food insecure households                                | Season rainfall and its normal per district; 26 bi-weeks of household food assessments per district                                                              |

The patterns each post's data shows, and that `verify.js` checks:

| Post | Pattern                                                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Districts in all four RED/REC categories; Western Area above 100% coverage; two facilities with negative dropout                                                                            |
| 2    | Cases peak one to two months after the rain in at least 10 districts; Tonkolili, irrigated, peaks in the dry season                                                                         |
| 3    | Overlapping rings in a Western Area chiefdom; a new focus of two RDT-positive cases in Port Loko; a Kambia wave with no case in the last 7 days; about 30% of cases without coordinates     |
| 4    | One health area below 90% of contacts seen, the others above 95%; contacts under follow-up and completed; three new cases that were known contacts and two in Kono that were not            |
| 5    | Koinadugu, with no basic EmONC facility, far below 50%; most districts above the EPMM 60% target; every EmONC facility performs all 7 basic signal functions                                |
| 6    | One chiefdom above 100% every round with a low official denominator; one red chiefdom with a high one; one partial round                                                                    |
| 7    | One Bo primary school above 60 pupils per teacher among schools within the norm of 40; parity in primary; girls behind in Kailahun's and boys in Bo's junior secondary schools              |
| 8    | In Kenema, a stocked-out facility a few km from an overstocked one; a Kailahun chiefdom low after missed deliveries; a few facilities not reporting last month                              |
| 9    | Suspect bites with no animal investigated in a Bombali chiefdom; positive dogs with no bite reported in a Tonkolili chiefdom; both in Port Loko, the one district below 70% dog vaccination |
| 10   | Tonkolili complete but late; Koinadugu red across the district; one red facility in Bo, which is green                                                                                      |
| 11   | Admissions peak in June in the north and in August in the south-west; Kambia below 75% cure with a busy site; a Pujehun site with very few children                                         |
| 12   | The driest district below 75% of normal rain with food insecurity rising; a district with normal rain and many food insecure households                                                     |

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
-   `--fullAnalytics` rebuilds every analytics table instead of the last 4
    years (`index.js` only). Needed once after a data element is added to an
    existing program: a last-years run keeps the columns of existing tables.

Don't import while an analytics run is going on: event tables of programs
whose events changed during the run can come out empty. Run analytics again
once the import is done.

Every object has a fixed id and a `SHOW_` code, so re-running updates in
place.

## Earth Engine values

Some posts import values computed from Earth Engine datasets, the same ones
maps-app shows. `snapshot.js` computes them once and writes them to
`input/sierra-leone/`, which is committed; the posts read them from there, so
building the demo needs no Earth Engine access.

| File                       | What it holds                                                                                                                                                                                       | Posts       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `worldpop-school-age.json` | WorldPop Global2 children aged 5 to 14, both sexes, summed per chiefdom, 2020 to 2030                                                                                                               | 6           |
| `emonc-coverage.json`      | The EmONC facilities Post 5 picks, and WorldPop Global2 population per district, 2020 to 2030: in total and inside their two-hour catchments, each person counted once                              | 2, 5, 9, 12 |
| `climate-districts.json`   | Monthly CHIRPS rainfall (mm) and ERA5-Land air temperature (°C) per district from January 2022 to the last month Earth Engine has published, and the CHIRPS 1991-2020 normal of each calendar month | 2, 12       |

To compute them again, for example when a file needs more years (reads only;
it uses the Earth Engine access token of the instance in `DHIS2_BASE_URL`):

```bash
node snapshot.js
node snapshot.js --only=worldpop-school-age
node snapshot.js --only=emonc-coverage
node snapshot.js --only=climate-districts
```

Climate data reaches Earth Engine a month or two late. A month the climate
file doesn't have yet takes the same month of the latest year it has.

Post 12's rainfall comes from CHIRPS, except for the driest district of the
season: if it had 75% of its normal rain or more, the tool sets it to 70%, so
the map always shows a dry district. The real values stay in the climate file.

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
   Then add last month's rainfall and temperature to the climate file (reads
   only, about 3 minutes):
    ```bash
    node snapshot.js --only=climate-districts
    ```
2. Generate the data again for the new month and rebuild analytics:
    ```bash
    node index.js --steps=data,analytics
    ```
    This overwrites the data values for the whole window, adds the new
    month, and removes reports, events and tracked entities of the tool's own
    data sets and programs that the new run no longer generates. Metadata,
    maps and interpretations are left as they are.
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

Posts 3 and 4 show outbreaks of the last days ("last 7 days"), counted back
from the date the data was generated. A week after a run their maps are
empty, so they need a daily run:

```bash
node index.js --posts=3,4 --steps=data,analytics
```

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
-   Post 5 sets the attribute "Two-hour catchment (synthetic)" on its EmONC
    facilities. Their other attribute values, such as the demo's "Catchment
    area", are kept.
-   Post 8 turns on the system setting "Include zero data values in analytics
    tables" (`keyIncludeZeroValuesInAnalytics`). Without it, stored zeros stay
    out of analytics even for data elements where zero is significant, and
    stocked-out facilities show as "no data". Analytics tables grow with every
    zero value of the instance.
-   Post 7 adds about 190 schools as org units at the facility level, in Bo,
    Kenema and Kailahun, with a `SHOW_SCHOOL_` code. Maps that select level 4
    show them too; the tool's facility layers select through its "Health
    facilities" group instead, which holds every open facility but no school.
-   Posts 5 and 7 add their data items and group sets to the org unit profile
    (the facts maps-app shows when you click an org unit). The profile is one
    per instance; the items already in it are kept. Setting it needs the
    authority F_ORG_UNIT_PROFILE_ADD; without it (as for admin on play) the
    tool prints a warning and goes on.
-   Post 10 schedules a dashboard email push job, "Showcase: data quality
    review by email", on the 5th of each month at 7:00. It sends the "Data
    quality review" dashboard to the HMIS team, as each of them sees it, and
    needs the instance's email (SMTP) settings to send anything.
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
