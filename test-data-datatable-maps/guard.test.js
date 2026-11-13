const assert = require('node:assert/strict')
const { test } = require('node:test')
const { isWritable } = require('./guard.js')

test('guard only allows test servers', () => {
    assert.ok(isWritable('https://dev.im.dhis2.org/maps-app-43-1'))
    assert.ok(isWritable('https://play.im.dhis2.org/stable-2-43-1'))
    assert.ok(isWritable('http://localhost:8080'))
    assert.ok(!isWritable('https://e2e.im.dhis2.org/analytics-43'))
    assert.ok(!isWritable('https://dev.im.dhis2.org/analytics-dev'))
})
