const assert = require('node:assert/strict')
const { test } = require('node:test')
const { inGeometry } = require('./geometry.js')

const square = [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 4],
    [0, 0],
]
const hole = [
    [1, 1],
    [2, 1],
    [2, 2],
    [1, 2],
    [1, 1],
]

test('a point inside a polygon is in, outside is out', () => {
    const polygon = { type: 'Polygon', coordinates: [square] }
    assert.equal(inGeometry([3, 3], polygon), true)
    assert.equal(inGeometry([5, 3], polygon), false)
})

test('a point in a hole of the polygon is out', () => {
    const polygon = { type: 'Polygon', coordinates: [square, hole] }
    assert.equal(inGeometry([1.5, 1.5], polygon), false)
    assert.equal(inGeometry([3, 3], polygon), true)
})

test('a multipolygon contains the points of each of its parts', () => {
    const island = square.map(([x, y]) => [x + 10, y])
    const multi = { type: 'MultiPolygon', coordinates: [[square], [island]] }
    assert.equal(inGeometry([12, 2], multi), true)
    assert.equal(inGeometry([7, 2], multi), false)
})

test('a point geometry contains nothing', () => {
    assert.equal(
        inGeometry([0, 0], { type: 'Point', coordinates: [0, 0] }),
        false
    )
})
