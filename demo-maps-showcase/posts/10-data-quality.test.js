const assert = require('node:assert/strict')
const { test } = require('node:test')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const { fakeFacilities } = require('./fixtures.js')
const post = require('./10-data-quality.js')

const facilities = fakeFacilities()
const runDate = new Date('2026-11-13')

const rates = (registrations, districtId, months) => {
    const inDistrict = facilities.filter((f) => f.districtId === districtId)
    const periods = new Set(months.map(({ id }) => id))
    const reports = registrations.filter(
        (r) =>
            periods.has(r.period) &&
            inDistrict.some((f) => f.id === r.organisationUnit)
    )
    const expected = inDistrict.length * months.length
    const onTime = reports.filter((r) => {
        const end = months.find(({ id }) => id === r.period).end
        return (new Date(r.date) - end) / 86400000 <= 15
    })
    return {
        reported: (100 * reports.length) / expected,
        onTime: (100 * onTime.length) / expected,
    }
}

test('Tonkolili reports complete but late, Koinadugu is red', () => {
    const { months, registrations } = post.generate({ runDate }, { facilities })
    // The last month is left out: most of its reports are not due yet
    const window = months.slice(-7, -1)
    const tonkolili = rates(registrations, DISTRICTS.tonkolili, window)
    const koinadugu = rates(registrations, DISTRICTS.koinadugu, window)
    const kenema = rates(registrations, DISTRICTS.kenema, window)
    assert.ok(tonkolili.reported >= 90, JSON.stringify(tonkolili))
    assert.ok(tonkolili.onTime < 75, JSON.stringify(tonkolili))
    assert.ok(koinadugu.reported < 75, JSON.stringify(koinadugu))
    assert.ok(kenema.onTime >= 80, JSON.stringify(kenema))
})

test('in Bo, the red facility stands out among facilities on time', () => {
    const { months, registrations } = post.generate({ runDate }, { facilities })
    const window = months.slice(-7, -1)
    const onTime = (facilityId) =>
        registrations.filter(
            (r) =>
                r.organisationUnit === facilityId &&
                window.some(
                    ({ id, end }) =>
                        id === r.period &&
                        (new Date(r.date) - end) / 86400000 <= 15
                )
        ).length / window.length
    const [red, ...others] = facilities.filter(
        (f) => f.districtId === DISTRICTS.bo
    )
    const blue = others.filter(({ id }) => onTime(id) >= 0.9)
    assert.ok(onTime(red.id) < 0.75)
    assert.ok(
        blue.length >= others.length * 0.8,
        `${blue.length} of ${others.length}`
    )
})

test('no report is dated after the run date', () => {
    const { registrations } = post.generate({ runDate }, { facilities })
    assert.ok(registrations.every(({ date }) => new Date(date) <= runDate))
})
