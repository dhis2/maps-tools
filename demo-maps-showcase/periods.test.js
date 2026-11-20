const assert = require('node:assert/strict')
const { test } = require('node:test')
const { lastMonths } = require('./periods.js')

test('last months end with the month before the run date, across a year', () => {
    const months = lastMonths(new Date('2026-02-10'), 3)
    assert.deepEqual(
        months.map(({ id }) => id),
        ['202511', '202512', '202601']
    )
    assert.equal(months[2].end.toISOString().slice(0, 10), '2026-01-31')
})
