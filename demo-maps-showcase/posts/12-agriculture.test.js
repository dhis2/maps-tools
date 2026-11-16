const assert = require('node:assert/strict')
const { test } = require('node:test')
const { readClimate } = require('../shared/climate.js')
const post = require('./12-agriculture.js')

// Uses the committed climate snapshot
const climate = readClimate()
const runDate = new Date('2026-11-13')

test('bi-weeks are complete, consecutive and end before the run date', () => {
    const ids = post.lastBiWeeks(runDate, 26)
    assert.equal(ids.length, 26)
    // 13 November 2026 is in ISO week 46, bi-week 23
    assert.equal(ids.at(-1), '2026BiW22')
    assert.equal(ids[0], '2025BiW23')
})

test('the driest district is below 75% of normal, the green one near 100%', () => {
    const { driest, green } = post.seasonRain(climate)
    assert.ok(driest.ratio < 0.75)
    assert.ok(green.ratio >= 0.9 && green.ratio <= 1.1, `${green.ratio}`)
})

test('food insecurity rises in the driest district', () => {
    const { rain, biweeks, assessments } = post.generate(
        { runDate },
        { climate }
    )
    const share = (period) => {
        const a = assessments.find(
            (x) => x.orgUnit === rain.driest.districtId && x.period === period
        )
        return a.insecure / a.assessed
    }
    assert.ok(share(biweeks.at(-1)) - share(biweeks[0]) >= 0.15)
})
