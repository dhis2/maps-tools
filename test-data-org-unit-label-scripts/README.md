# Org unit label scripts: test data

Creates a district of 11 chiefdoms named in scripts whose labels need extra
glyphs or right-to-left shaping, and a saved map showing those labels, so the
maps-app label fonts can be checked by eye.

Made for [DHIS2-21946](https://dhis2.atlassian.net/browse/DHIS2-21946), labels
in more scripts, and its maps-app PR
[#3766](https://github.com/dhis2/maps-app/pull/3766).

Plain Node (18 or newer), no dependencies, no install step.

## Running

1. Set the server and an account that may create org units and maps, for
   example in a gitignored `.env.local` that you `source`:
    ```bash
    export DHIS2_BASE_URL=https://dev.im.dhis2.org/maps-app-43-1
    export DHIS2_USERNAME=admin
    export DHIS2_PASSWORD=<your password>
    ```
2. Check the payload without writing anything (`output/payload.json`):
    ```bash
    node index.js --dryRun
    ```
3. Create or update the data:
    ```bash
    node index.js
    ```
    It prints the map link and checks that the org unit features API returns
    all 11 chiefdoms. Every run writes `output/import-summary.json`.

Every object has a fixed id, so re-running updates in place.

## What it creates

-   District "Label scripts (maps test)" under Sierra Leone (`--parentId` to
    change), without a boundary.
-   11 chiefdoms, each a small box in a grid in the sea west of Freetown, named
    with a city name in one script:

| Script     | Name      |
| ---------- | --------- |
| Arabic     | القاهرة   |
| Hebrew     | ירושלים   |
| Ethiopic   | አዲስ አበባ   |
| Devanagari | काठमाडौं  |
| Bengali    | ঢাকা      |
| Oriya      | ଭୁବନେଶ୍ୱର |
| Sinhala    | කොළඹ      |
| Myanmar    | ရန်ကုန်   |
| Thai       | กรุงเทพฯ  |
| Lao        | ວຽງຈັນ    |
| Khmer      | ភ្នំពេញ   |

-   Map "Label scripts (test)": an org unit layer on the district's chiefdoms
    with labels, over OSM Light, readable by everyone.

maps-app loads label fonts from the maps app installed on the server
(`<server>/dhis-web-maps/fonts`), so a script only shows once a maps app with
glyphs for it is installed there.

## Effect on existing content

| Existing content                    | Effect                                       |
| ----------------------------------- | -------------------------------------------- |
| District-level maps of Sierra Leone | None: the district has no boundary           |
| Boundary maps of all chiefdoms      | 11 extra boxes in the sea west of Freetown   |
| Chiefdom-level thematic maps        | None where org units without data are hidden |
| Org unit trees in every app         | The district is listed under Sierra Leone    |

## Where it may write

Only the public play instances (`https://play.im.dhis2.org/<name>`),
`https://dev.im.dhis2.org/maps-app-43-1` and `localhost`. `guard.js` refuses
any other server before writing. Dry runs only read.

## Tests

```bash
node --test
```
