const assert = require('node:assert/strict')
const { test } = require('node:test')
const { readClimate } = require('../shared/climate.js')
const { districtPopulation } = require('../shared/population.js')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const { fakeFacilities } = require('./fixtures.js')
const post = require('./02-malaria-climate.js')

// Uses the committed climate snapshot, so the lag is checked on real rain
const climate = readClimate()
const year = post.seasonYear(climate)

const peakMonth = (values) =>
    Number(
        Object.entries(values)
            .sort((a, b) => b[1] - a[1])[0][0]
            .slice(4)
    )

const seasonOf = (key, districtId) => {
    const cases = {}
    const rain = {}
    for (let m = 1; m <= 12; m++) {
        const id = `${year}${String(m).padStart(2, '0')}`
        if (id > climate.lastMonth) {
            break
        }
        cases[id] = post.incidence(climate, key, districtId, id)
        rain[id] = climate.rain(districtId, id)
    }
    return { cases, rain }
}

test('cases peak one to two months after the rain', () => {
    const following = Object.entries(DISTRICTS)
        .filter(([key]) => key !== 'tonkolili')
        .filter(([key, districtId]) => {
            const { cases, rain } = seasonOf(key, districtId)
            const lag = peakMonth(cases) - peakMonth(rain)
            return lag >= 1 && lag <= 2
        })
    assert.ok(following.length >= 10, `${following.length} of 12`)
})

test('prepare gives the chiefdom population of each year', async () => {
    const state = await post.prepare({
        orgUnits: { facilities: fakeFacilities(), districts: [] },
    })
    const people = Object.values(state.chiefdomPopulation['2025'])
    assert.ok(people.length > 100 && people.every((n) => n > 0))
})

test('cases go to chiefdoms by population, none where nobody is counted', () => {
    const facilities = fakeFacilities()
    // The first chiefdom of each district has people, the second none
    const people = Object.fromEntries(
        facilities.map((f) => [
            f.chiefdomId,
            f.chiefdomId.endsWith('c0') ? 5000 : 0,
        ])
    )
    const years = Object.keys(districtPopulation())
    const { rows } = post.generate(
        { runDate: new Date('2026-11-13') },
        {
            facilities,
            climate,
            population: districtPopulation(),
            chiefdomPopulation: Object.fromEntries(
                years.map((y) => [y, people])
            ),
        }
    )
    const chiefdomOf = Object.fromEntries(
        facilities.map((f) => [f.id, f.chiefdomId])
    )
    const chiefdoms = new Set(rows.map((r) => chiefdomOf[r.orgUnit]))
    assert.equal(chiefdoms.size, Object.keys(DISTRICTS).length)
    assert.ok([...chiefdoms].every((c) => c.endsWith('c0')))
})

test('the irrigated district peaks in the dry season', () => {
    const { cases } = seasonOf('tonkolili', DISTRICTS.tonkolili)
    assert.ok([1, 2, 3, 4, 5, 12].includes(peakMonth(cases)))
})
