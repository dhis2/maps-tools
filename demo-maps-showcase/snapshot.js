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

const CLIMATE_FROM_YEAR = 2022
const NORMAL_YEARS = [1991, 2020]

const roundAll = (values, digits) =>
    Object.fromEntries(
        Object.entries(values).map(([id, v]) => [id, Number(v.toFixed(digits))])
    )

// Monthly CHIRPS rainfall and ERA5-Land temperature per district from
// January 2022 to last month, and the CHIRPS 1991-2020 normal of each
// calendar month: district means of the pixel values
const climateDistricts = async (client) => {
    const districts = await loadDistrictGeometries(client)
    const now = new Date()
    const months = []
    for (
        let d = new Date(Date.UTC(CLIMATE_FROM_YEAR, 0, 1));
        d < new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        d.setUTCMonth(d.getUTCMonth() + 1)
    ) {
        months.push([d.getUTCFullYear(), d.getUTCMonth() + 1])
    }
    const rain = {}
    const temperature = {}
    for (const [year, month] of months) {
        const token = await ee.getToken(client)
        const id = `${year}${String(month).padStart(2, '0')}`
        const result = await Promise.all([
            ee.meanInFeatures({
                token,
                image: ee.chirpsMonth(year, month),
                features: districts,
                scale: 5000,
            }),
            ee.meanInFeatures({
                token,
                image: ee.era5Temperature(year, month),
                features: districts,
                scale: 10000,
            }),
        ]).catch((err) => {
            // The latest months are published with a delay
            if (/no bands/.test(err.message)) {
                return null
            }
            throw err
        })
        if (!result) {
            console.log(`Climate ${id}: not published yet, stopping`)
            break
        }
        const [r, t] = result
        rain[id] = roundAll(r, 1)
        temperature[id] = roundAll(t, 1)
        console.log(`Climate ${id}: ${districts.length} districts`)
    }
    const normal = {}
    for (let month = 1; month <= 12; month++) {
        const token = await ee.getToken(client)
        normal[month] = roundAll(
            await ee.meanInFeatures({
                token,
                image: ee.chirpsNormal(month, ...NORMAL_YEARS),
                features: districts,
                scale: 5000,
            }),
            1
        )
        console.log(`Rainfall normal, month ${month}`)
    }
    return {
        sources: {
            rain: 'UCSB-CHG/CHIRPS/DAILY, monthly sum, district mean, mm',
            temperature:
                'ECMWF/ERA5_LAND/MONTHLY_AGGR temperature_2m_mean, district mean, °C',
            normal: `UCSB-CHG/CHIRPS/PENTAD, mean monthly sum ${NORMAL_YEARS.join(
                '-'
            )}, district mean, mm`,
        },
        rain,
        temperature,
        normal,
    }
}

// WorldPop Global2 total population per chiefdom and year, so rates can be
// mapped by chiefdom
const worldPopTotals = async (client) => {
    const features = await loadChiefdomGeometries(client)
    const values = {}
    for (const year of WORLDPOP_YEARS) {
        const token = await ee.getToken(client)
        const image = ee.yearImage(WORLDPOP_TOTAL, String(year), ['population'])
        const sums = await ee.sumInFeatures({
            token,
            image,
            features,
            scale: 100,
        })
        values[year] = Object.fromEntries(
            Object.entries(sums).map(([id, sum]) => [id, Math.round(sum)])
        )
        console.log(`WorldPop totals ${year}: ${features.length} chiefdoms`)
    }
    return { source: WORLDPOP_TOTAL, reducer: 'sum at 100 m', values }
}

const SNAPSHOTS = {
    'worldpop-school-age': worldPopSchoolAge,
    'worldpop-totals': worldPopTotals,
    'emonc-coverage': emoncCoverage,
    'climate-districts': climateDistricts,
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
