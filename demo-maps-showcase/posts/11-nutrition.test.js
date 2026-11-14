const assert = require('node:assert/strict')
const { test } = require('node:test')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const { fakeFacilities, fakePopulation } = require('./fixtures.js')
const post = require('./11-nutrition.js')

const facilities = fakeFacilities()
const population = fakePopulation(facilities, [2024, 2025, 2026])
const runDate = new Date('2026-11-13')

const generated = post.generate({ runDate }, { facilities, population })

const admissionsByMonth = (districtId) => {
    const sites = new Set(
        generated.sites
            .filter((s) => s.districtId === districtId)
            .map(({ id }) => id)
    )
    const totals = {}
    generated.otpRows
        .filter((r) => sites.has(r.orgUnit))
        .forEach(({ period, admissions }) => {
            totals[period] = (totals[period] || 0) + admissions
        })
    return totals
}

const peak = (totals) =>
    Object.entries(totals)
        .filter(([period]) => period >= '202511')
        .sort((a, b) => b[1] - a[1])[0][0]

test('the lean season wave peaks in the north before the south-west', () => {
    assert.ok(
        peak(admissionsByMonth(DISTRICTS.koinadugu)) <
            peak(admissionsByMonth(DISTRICTS.bo))
    )
})

test('the busy Kambia site cures fewer than 75% of the children who leave', () => {
    const last3 = generated.months.slice(-3).map(({ id }) => id)
    const rows = generated.otpRows.filter(
        (r) =>
            r.orgUnit === generated.planted.busy.id && last3.includes(r.period)
    )
    const cured = rows.reduce((s, r) => s + r.cured, 0)
    const exits = rows.reduce((s, r) => s + r.cured + r.died + r.defaulted, 0)
    assert.ok(cured / exits < 0.75)
    assert.ok(exits >= 30, `${exits} exits`)
})
