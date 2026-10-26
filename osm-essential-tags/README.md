# OSM essential tags

The OpenStreetMap tags worth importing into DHIS2, grouped in categories and
subcategories, and a script counting how many features each tag has in a
country or a bounding box.

Made for the maps-app OSM import mockup,
[#3809](https://github.com/dhis2/maps-app/pull/3809), which imports
OpenStreetMap features into DHIS2 as events, one program per category. The
mockup uses the same file as its list of categories
(`src/components/osmImport/essentialTags.json`, a copy to keep in sync), and
the counts show what an import would fetch: roads, for example, are mostly
paths and tracks.

Plain Node (18 or newer), no dependencies, no install step.

## The tags

`essential-tags-v1.json` has one entry per category, in the format
`use:<category>` → `type:<elements>` → `key:<key>` → `cat:<subcategory>` →
values:

```json
"use:roads": {
    "type:way": {
        "key:highway": {
            "cat:primary": [ "primary", "primary_link" ],
            ...
```

- `type:any` is nodes, ways and relations, `type:way` only ways (lines in the
  import), `type:node` only nodes.
- A subcategory can span keys, e.g. `pharmacies` is both `amenity=pharmacy`
  and `healthcare=pharmacy`.

| Category | Subcategories |
| --- | --- |
| Health facilities | hospitals, clinics, doctors and dentists, pharmacies, maternal care, other care, ambulance stations |
| Education | kindergartens, schools, higher education |
| Water and sanitation | drinking water, water infrastructure, sanitation |
| Humanitarian | refugee sites, detention centres, shelters, border crossings, military, offices |
| Public services | security and justice, administration, markets, financial |
| Cemeteries | cemeteries |
| Settlements | cities and towns, villages, hamlets, neighbourhoods |
| Transport hubs | stations, fuel, airports |
| Roads | motorways, trunk, primary, secondary, tertiary, minor roads, tracks and service, paths |
| Waterways | rivers, streams, canals and drains |

## Counting

```sh
node fetch-counts.mjs --country SL
node fetch-counts.mjs --bbox 7.90,-11.80,7.99,-11.70 --name bo-town
```

- `--country` takes an ISO 3166-1 code and counts within the country's
  boundary in OSM. `--bbox` is south, west, north, east.
- One Overpass query per category, with an `out count` per tag.
- Writes `results/<name>.json` after each category and resumes from it when
  re-run: the public Overpass servers are often busy (502, 504), so it retries
  and alternates between two servers.
- Prints a markdown table (category, tag, subcategory, total, nodes, ways,
  relations).

`results/` has the counts for Sierra Leone and Bo town from October 2026.
In Sierra Leone, roads are 109,250 ways, 93% of them paths, residential roads,
tracks and unclassified roads; primary, secondary and tertiary roads are about
2,100.
