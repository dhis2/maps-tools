const assert = require('node:assert/strict')
const { test } = require('node:test')
const { buildMetadata, GRID } = require('./payload.js')
const { SCRIPTS } = require('./scripts.js')

const UID_REGEX = /^[A-Za-z][A-Za-z0-9]{10}$/
const build = () =>
    buildMetadata({ parentId: 'ImspTQPwCqd', chiefdomLevelId: 'tTUf91fCytl' })

test('one chiefdom per script, named in that script', () => {
    const { chiefdoms } = build()
    assert.deepEqual(
        chiefdoms.map(({ name }) => name),
        SCRIPTS.map(({ name }) => name)
    )
    assert.equal(new Set(chiefdoms.map(({ code }) => code)).size, 11)
})

test('ids are valid and stay the same across runs', () => {
    const first = build()
    const second = build()
    const ids = (m) => [
        m.district.id,
        ...m.chiefdoms.map(({ id }) => id),
        ...m.maps.map(({ id }) => id),
    ]
    assert.deepEqual(ids(first), ids(second))
    ids(first).forEach((id) => assert.match(id, UID_REGEX))
    assert.equal(new Set(ids(first)).size, ids(first).length)
})

test('the district has no geometry, so district-level maps skip it', () => {
    const { district, chiefdoms } = build()
    assert.equal(district.geometry, undefined)
    assert.deepEqual(district.parent, { id: 'ImspTQPwCqd' })
    chiefdoms.forEach(({ parent }) =>
        assert.deepEqual(parent, { id: district.id })
    )
})

test('each chiefdom is a closed box in the sea west of Freetown', () => {
    const { chiefdoms } = build()
    const centers = new Set()
    chiefdoms.forEach(({ geometry }) => {
        assert.equal(geometry.type, 'Polygon')
        const ring = geometry.coordinates[0]
        assert.deepEqual(ring[0], ring[ring.length - 1])
        ring.forEach(([lon, lat]) => {
            assert.ok(lon >= -16.5 && lon <= -14.0, `lon ${lon}`)
            assert.ok(lat >= 7.3 && lat <= 9.1, `lat ${lat}`)
        })
        centers.add(`${ring[0][0]},${ring[0][1]}`)
    })
    assert.equal(centers.size, chiefdoms.length)
    assert.ok(GRID.halfSize * 2 < GRID.lons[1] - GRID.lons[0])
})

test('the labels map shows the district at chiefdom level with labels', () => {
    const { district, maps } = build()
    const [view] = maps[0].mapViews
    assert.equal(view.layer, 'orgUnit')
    assert.equal(view.labels, true)
    assert.deepEqual(view.rows, [
        {
            dimension: 'ou',
            items: [{ id: district.id }, { id: 'LEVEL-tTUf91fCytl' }],
        },
    ])
})

test('the map uses the OSM Light basemap', () => {
    assert.deepEqual(build().maps[0].basemaps, [
        { id: 'osmLight', opacity: 1, hidden: false },
    ])
})
