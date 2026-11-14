// Computes the Earth Engine values the posts import as data, once, into
// input/sierra-leone/. Later runs read them from there, so the showcase
// instance doesn't need Earth Engine for its data. Reads only from DHIS2.
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { POST_NUMBERS } = require('./context.js')
const { ROOT, DISTRICT_IDS } = require('./shared/sierraLeone.js')
const ee = require('./shared/earthEngine.js')
const { loadOrgUnits } = require('./shared/orgUnits.js')
const maternal = require('./posts/05-maternal.js')

const INPUT_DIR = path.join(__dirname, 'input', 'sierra-leone')

const WORLDPOP_AGE_SEX = 'projects/wpgp-global2/assets/agesex_100m'
const SCHOOL_AGE_BANDS = ['f_05', 'f_10', 'm_05', 'm_10']
const WORLDPOP_TOTAL = 'projects/sat-io/open-datasets/WORLDPOP/pop'
const WORLDPOP_YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i)

const loadChiefdomGeometries = async (client) => {
    const { organisationUnits } = await client.get(
        `/api/organisationUnits?filter=path:like:${ROOT}&filter=level:eq:3&fields=id,path,geometry&paging=false`
    )
    return organisationUnits
        .filter(
            ({ path: p, geometry }) =>
                geometry && DISTRICT_IDS.has(p.split('/')[2])
        )
        .map(({ id, geometry }) => ({ id, geometry }))
        .sort((a, b) => a.id.localeCompare(b.id))
}

// WorldPop Global2 children aged 5 to 14, both sexes, per chiefdom and year
const worldPopSchoolAge = async (client) => {
    const features = await loadChiefdomGeometries(client)
    const values = {}
    for (const year of WORLDPOP_YEARS) {
        const token = await ee.getToken(client)
        const image = ee.sumBands(
            ee.yearImage(WORLDPOP_AGE_SEX, year, SCHOOL_AGE_BANDS)
        )
        const sums = await ee.sumInFeatures({
            token,
            image,
            features,
            scale: 100,
        })
        values[year] = Object.fromEntries(
            Object.entries(sums).map(([id, sum]) => [id, Math.round(sum)])
        )
        console.log(`WorldPop school-age ${year}: ${features.length} chiefdoms`)
    }
    return {
        source: WORLDPOP_AGE_SEX,
        bands: SCHOOL_AGE_BANDS,
        reducer: 'sum at 100 m',
        values,
    }
}

const loadDistrictGeometries = async (client) => {
    const { organisationUnits } = await client.get(
        `/api/organisationUnits?filter=id:in:[${[...DISTRICT_IDS].join(
            ','
        )}]&fields=id,geometry&paging=false`
    )
    return organisationUnits.map(({ id, geometry }) => ({ id, geometry }))
}

// WorldPop Global2 population per district and year, in total and inside the
// two-hour catchments of the EmONC facilities Post 5 picks. Overlapping
// catchments count each person once.
const emoncCoverage = async (client) => {
    const orgUnits = await loadOrgUnits(client, new Date())
    const inputs = await maternal.loadEmoncInputs(client, orgUnits)
    const facilities = maternal.selectEmonc(inputs)
    const catchments = facilities.map((facility) => ({
        id: facility.id,
        geometry: maternal.catchmentOf(facility, inputs.points),
    }))
    const districts = await loadDistrictGeometries(client)
    const values = {}
    for (const year of WORLDPOP_YEARS) {
        const token = await ee.getToken(client)
        const image = ee.yearImage(WORLDPOP_TOTAL, String(year), ['population'])
        const [total, within2h] = await Promise.all([
            ee.sumInFeatures({ token, image, features: districts, scale: 100 }),
            ee.sumInFeatures({
                token,
                image: ee.clipToFeatures(image, catchments),
                features: districts,
                scale: 100,
            }),
        ])
        values[year] = Object.fromEntries(
            districts.map(({ id }) => [
                id,
                {
                    total: Math.round(total[id]),
                    within2h: Math.round(within2h[id] ?? 0),
                },
            ])
        )
        console.log(`EmONC coverage ${year}: ${districts.length} districts`)
    }
    return {
        source: WORLDPOP_TOTAL,
        reach: maternal.REACH_KM,
        reducer: 'sum at 100 m',
        facilities,
        values,
    }
}

const SNAPSHOTS = {
    'worldpop-school-age': worldPopSchoolAge,
    'emonc-coverage': emoncCoverage,
}

const main = async () => {
    const config = getConfig(process.argv.slice(2), POST_NUMBERS)
    const only = process.argv
        .find((arg) => arg.startsWith('--only='))
        ?.slice('--only='.length)
    const client = createClient(config)
    fs.mkdirSync(INPUT_DIR, { recursive: true })
    for (const [name, compute] of Object.entries(SNAPSHOTS)) {
        if (only && only !== name) {
            continue
        }
        const result = await compute(client)
        fs.writeFileSync(
            path.join(INPUT_DIR, `${name}.json`),
            JSON.stringify(
                {
                    computedAt: new Date().toISOString().slice(0, 10),
                    orgUnitGeometriesFrom: config.baseUrl,
                    ...result,
                },
                null,
                4
            )
        )
        console.log(`Wrote input/sierra-leone/${name}.json`)
    }
}

main().catch((err) => {
    console.error(err.message)
    process.exitCode = 1
})
