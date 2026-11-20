const assert = require('node:assert/strict')
const { test } = require('node:test')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const { randomFor } = require('../random.js')
const post = require('./06-ntd.js')

const chiefdoms = Object.values(DISTRICTS).flatMap((districtId) =>
    Array.from({ length: 5 }, (_, i) => ({
        id: `${districtId.slice(0, 9)}c${i}`,
        name: `Chiefdom ${districtId} ${i}`,
        districtId,
    }))
)
const worldPop = Object.fromEntries(
    [2023, 2024, 2025].map((year) => [
        year,
        Object.fromEntries(
            chiefdoms.map(({ id }) => [
                id,
                Math.round(randomFor('wp', id).between(2000, 12000)),
            ])
        ),
    ])
)
const runDate = new Date('2026-11-13')

const coverage = (rows, id) =>
    rows
        .filter((r) => r.orgUnit === id)
        .map((r) => (100 * r.treated) / r.official)

test('the three planted chiefdoms show their stories over the last 3 rounds', () => {
    const { years, rows, planted } = post.generate(
        { runDate },
        { chiefdoms, worldPop }
    )
    assert.deepEqual(years, [2023, 2024, 2025])
    assert.ok(coverage(rows, planted.lowDenominator.id).every((c) => c > 100))
    const partial = coverage(rows, planted.partialRound.id)
    assert.ok(partial[1] < 75 && partial[0] >= 75 && partial[2] >= 75)
    const high = rows.find((r) => r.orgUnit === planted.highDenominator.id)
    assert.ok(high.official / high.worldPop > 1.2)
})
