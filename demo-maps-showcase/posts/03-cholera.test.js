const assert = require('node:assert/strict')
const { test } = require('node:test')
const { fakeFacilities, fakePoints } = require('./fixtures.js')
const post = require('./03-cholera.js')

const facilities = fakeFacilities()
const points = fakePoints(facilities)
const runDate = new Date('2026-11-13')
const { places, events } = post.generate({ runDate }, { facilities, points })

const inPlace = (place) => {
    const ids = new Set(places[place].facilities.map(({ id }) => id))
    return events.filter((e) => ids.has(e.orgUnit))
}
const daysAgo = (e) => Math.round((runDate - new Date(e.occurredAt)) / 86400000)

test('about 300 cases, a third of them without household coordinates', () => {
    assert.ok(events.length >= 250 && events.length <= 350, `${events.length}`)
    const without = events.filter((e) => !e.geometry).length / events.length
    assert.ok(without >= 0.2 && without <= 0.4, `${without}`)
})

test('the earlier wave has stopped and the new focus has only recent cases', () => {
    assert.ok(inPlace('earlier').every((e) => daysAgo(e) >= 8))
    const focus = inPlace('focus')
    assert.equal(focus.length, 2)
    assert.ok(focus.every((e) => daysAgo(e) <= 2 && e.geometry))
})

test('the urban cluster has overlapping rings in the last 7 days', () => {
    const positive = inPlace('cluster').filter(
        (e) =>
            daysAgo(e) <= 7 &&
            e.geometry &&
            e.dataValues.some((dv) => dv.value === 'POSITIVE')
    )
    assert.ok(positive.length >= 10, `${positive.length}`)
})
