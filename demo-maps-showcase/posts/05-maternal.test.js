const assert = require('node:assert/strict')
const { test } = require('node:test')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const { fakeFacilities, fakePoints } = require('./fixtures.js')
const post = require('./05-maternal.js')

const facilities = fakeFacilities()
const points = fakePoints(facilities)
// In each district, facility 0 is a hospital and 1 to 7 are health centres;
// Koinadugu has no hospital
const hospitals = new Set(
    facilities
        .filter(
            (f) => f.id.endsWith('000') && f.districtId !== DISTRICTS.koinadugu
        )
        .map(({ id }) => id)
)
const chcs = new Set(
    facilities.filter((f) => /00[1-7]$/.test(f.id)).map(({ id }) => id)
)
const emonc = post.selectEmonc({ facilities, points, hospitals, chcs })

test('every district has one comprehensive EmONC facility, Koinadugu no basic one', () => {
    Object.entries(DISTRICTS).forEach(([key, districtId]) => {
        const inDistrict = emonc.filter(({ id }) =>
            facilities.some((f) => f.id === id && f.districtId === districtId)
        )
        const levels = inDistrict.map(({ level }) => level)
        assert.equal(levels.filter((l) => l === 'comprehensive').length, 1)
        assert.equal(
            levels.filter((l) => l === 'basic').length,
            key === 'koinadugu' ? 0 : 4
        )
    })
})

test('EmONC facilities perform all 7 basic signal functions in the last 3 months', () => {
    const { months, rows } = post.generate(
        { runDate: new Date('2026-11-13') },
        { inputs: { facilities, hospitals, chcs }, emonc }
    )
    const recent = new Set(months.slice(-3).map(({ id }) => id))
    const ids = new Set(emonc.map(({ id }) => id))
    rows.filter((r) => recent.has(r.period)).forEach((r) => {
        assert.equal(r.signalFunctions === 7, ids.has(r.orgUnit))
    })
})

test('a catchment is a closed ring around its facility', () => {
    const facility = emonc[0]
    const { coordinates } = post.catchmentOf(facility, points)
    const ring = coordinates[0]
    assert.deepEqual(ring[0], ring.at(-1))
    const [lon, lat] = points[facility.id]
    const lons = ring.map(([x]) => x)
    const lats = ring.map(([, y]) => y)
    assert.ok(Math.min(...lons) < lon && lon < Math.max(...lons))
    assert.ok(Math.min(...lats) < lat && lat < Math.max(...lats))
})
