const assert = require('node:assert/strict')
const { test } = require('node:test')
const { fakeFacilities, fakePoints } = require('./fixtures.js')
const post = require('./07-education.js')

const facilities = fakeFacilities()
const points = fakePoints(facilities)
const schools = post.planSchools(facilities, points)

test('schools have unique names and codes the facility loader leaves out', () => {
    assert.equal(new Set(schools.map((s) => s.name)).size, schools.length)
    assert.ok(schools.every((s) => s.code.startsWith('SHOW_SCHOOL_')))
})

test('a junior secondary school for every third primary school', () => {
    // 12 facilities in each of the 3 education districts
    const primary = schools.filter((s) => s.level === 'primary').length
    const secondary = schools.filter((s) => s.level === 'secondary').length
    assert.equal(primary, 36)
    assert.equal(secondary, 12)
})

test('school names come from the facility town', () => {
    assert.equal(
        schools
            .find((s) => s.level === 'primary')
            .name.endsWith('Primary School'),
        true
    )
})
