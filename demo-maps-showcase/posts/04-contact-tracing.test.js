const assert = require('node:assert/strict')
const { test } = require('node:test')
const { DISTRICTS } = require('../shared/sierraLeone.js')
const { fakeFacilities, fakePoints } = require('./fixtures.js')
const post = require('./04-contact-tracing.js')

const facilities = fakeFacilities()
const points = fakePoints(facilities)
const runDate = new Date('2026-11-13')
const generated = post.generate({ runDate }, { facilities, points })

test('20 cases with 15 contacts each, all linked to their case', () => {
    assert.equal(generated.relationships.length, 300)
    const contacts = new Set(
        generated.relationships.map((r) => r.to.trackedEntity.trackedEntity)
    )
    assert.equal(contacts.size, 300)
})

test('contacts exposed more than 21 days ago have completed follow-up', () => {
    const completed = generated.enrollments.filter(
        (e) => e.status === 'COMPLETED'
    )
    const active = generated.enrollments.filter((e) => e.status === 'ACTIVE')
    assert.ok(completed.length > 0 && active.length > 0)
    completed.forEach((e) => {
        assert.ok((runDate - new Date(e.enrolledAt)) / 86400000 > 21)
    })
})

test('no follow-up visit falls on or after the run date', () => {
    assert.ok(generated.events.every((e) => new Date(e.occurredAt) < runDate))
})

test('two recent cases come from outside the outbreak districts', () => {
    const unknown = generated.recent.filter(({ known }) => !known)
    assert.equal(unknown.length, 2)
    unknown.forEach(({ facility }) =>
        assert.equal(facility.districtId, DISTRICTS.kono)
    )
})
