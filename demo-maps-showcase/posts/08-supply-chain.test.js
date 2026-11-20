const assert = require('node:assert/strict')
const { test } = require('node:test')
const { fakeFacilities, fakePoints } = require('./fixtures.js')
const post = require('./08-supply-chain.js')

const facilities = fakeFacilities()
const points = fakePoints(facilities)
const runDate = new Date('2026-11-13')

// Months of stock last month, as the indicator computes it
const monthsOfStock = (rows, orgUnit, months) => {
    const card = rows.filter((r) => r.orgUnit === orgUnit && r.product === 'AL')
    const last = months.at(-1).id
    const lastRow = card.find((r) => r.period === last)
    return lastRow && lastRow.soh / lastRow.amc
}

test('average monthly consumption covers the month and the 2 before it', () => {
    const { months, rows } = post.generate({ runDate }, { facilities, points })
    const card = rows.filter(
        (r) => r.orgUnit === facilities[0].id && r.product === 'ORS'
    )
    const lastThree = card.slice(-3).map((r) => r.consumption)
    const expected = lastThree.reduce((a, b) => a + b, 0) / 3
    assert.equal(card.length, months.length)
    assert.ok(Math.abs(card.at(-1).amc - expected) <= 0.05)
})

test('the stocked-out facility sits next to an overstocked one', () => {
    const { months, rows, pair } = post.generate(
        { runDate },
        { facilities, points }
    )
    assert.equal(monthsOfStock(rows, pair.stockout.id, months), 0)
    assert.ok(monthsOfStock(rows, pair.overstock.id, months) > 4)
})

test('facilities under the cut-off district store are low together', () => {
    const { months, rows, cluster } = post.generate(
        { runDate },
        { facilities, points }
    )
    const values = facilities
        .filter((f) => f.chiefdomId === cluster)
        .map((f) => monthsOfStock(rows, f.id, months))
        .filter((v) => v !== undefined)
    assert.ok(values.filter((v) => v < 2).length >= 0.7 * values.length)
})

test('most other facilities hold 2 to 4 months', () => {
    const { months, rows, pair, cluster } = post.generate(
        { runDate },
        { facilities, points }
    )
    const values = facilities
        .filter(
            (f) =>
                f.chiefdomId !== cluster &&
                f.id !== pair.stockout.id &&
                f.id !== pair.overstock.id
        )
        .map((f) => monthsOfStock(rows, f.id, months))
        .filter((v) => v !== undefined)
    const onTarget = values.filter((v) => v >= 2 && v <= 4)
    assert.ok(
        onTarget.length >= 0.6 * values.length,
        `${onTarget.length} of ${values.length}`
    )
})
