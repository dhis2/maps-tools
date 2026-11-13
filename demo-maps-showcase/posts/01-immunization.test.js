const assert = require('node:assert/strict')
const { test } = require('node:test')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const { fakeFacilities, fakePopulation } = require('./fixtures.js')
const post = require('./01-immunization.js')

const facilities = fakeFacilities()
const population = fakePopulation(facilities, [2024, 2025, 2026, 2027])
const ctx = { runDate: new Date('2026-11-13') }

test('each district lands in its planned RED/REC category over the last 12 months', () => {
    const generated = post.generate(ctx, { facilities, population })
    const summary = post.summarize(generated, population, facilities)
    Object.entries(post.PROFILES).forEach(([key, profile]) => {
        assert.equal(
            post.category(summary[key]),
            post.category(profile),
            `${key}: ${JSON.stringify(summary[key])}`
        )
    })
    assert.ok(summary.westernArea.coverage > 100)
})

test('two facilities record more Penta3 than Penta1 doses', () => {
    const generated = post.generate(ctx, { facilities, population })
    assert.equal(generated.negativeFacilities.length, 2)
    generated.negativeFacilities.forEach((id) => {
        const rows = generated.doses.filter(({ orgUnit }) => orgUnit === id)
        const penta1 = rows.reduce((sum, d) => sum + d.penta1, 0)
        const penta3 = rows.reduce((sum, d) => sum + d.penta3, 0)
        assert.ok(penta3 > penta1)
    })
})

test('a re-run on the same date generates the same doses', () => {
    const first = post.generate(ctx, { facilities, population })
    const second = post.generate(ctx, { facilities, population })
    assert.deepEqual(first.doses, second.doses)
})

test('the window ends with the month before the run date', () => {
    const generated = post.generate(ctx, { facilities, population })
    assert.equal(generated.months.at(-1).id, '202610')
    assert.equal(generated.months.length, 24)
    assert.ok(
        generated.doses.every(({ districtId }) =>
            Object.values(DISTRICTS).includes(districtId)
        )
    )
})
