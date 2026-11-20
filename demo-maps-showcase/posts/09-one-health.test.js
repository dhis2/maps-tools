const assert = require('node:assert/strict')
const { test } = require('node:test')
const { fakeFacilities, fakePoints } = require('./fixtures.js')
const post = require('./09-one-health.js')

const facilities = fakeFacilities()
const points = fakePoints(facilities)
const runDate = new Date('2026-11-13')
const { stories, bites, animals } = post.generate(
    { runDate },
    { facilities, points }
)

const inChiefdom = (events, story) => {
    const ids = new Set(stories[story].facilities.map(({ id }) => id))
    return events.filter((e) => ids.has(e.orgUnit))
}
const valueOf = (e) => e.dataValues[0].value

test('suspect bites in one chiefdom with no animal investigated there', () => {
    assert.ok(
        inChiefdom(bites, 'uninvestigated').every(
            (e) => valueOf(e) === 'SUSPECT'
        )
    )
    assert.equal(inChiefdom(animals, 'uninvestigated').length, 0)
})

test('positive dogs in one chiefdom where no bite was reported', () => {
    assert.ok(inChiefdom(animals, 'unreported').length >= 3)
    assert.equal(inChiefdom(bites, 'unreported').length, 0)
})

test('every event has its own uid', () => {
    const ids = [...bites, ...animals].map((e) => e.event)
    assert.equal(new Set(ids).size, ids.length)
})

test('the hotspot has both suspect bites and positive dogs', () => {
    assert.ok(inChiefdom(bites, 'hotspot').length >= 5)
    assert.ok(
        inChiefdom(animals, 'hotspot').every((e) => valueOf(e) === 'POSITIVE')
    )
})
