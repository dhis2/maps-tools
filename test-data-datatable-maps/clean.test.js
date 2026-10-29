const assert = require('node:assert/strict')
const { test } = require('node:test')
const {
    buildMaps,
    DROPPED_CONFIG_KEYS,
    DROPPED_LAYERS,
    LAYER_PROPERTIES,
    NAME_PREFIX,
} = require('./clean.js')
const snapshot = require('./input/maps-app-43-1/source-maps.json')
const { SCENARIOS } = require('./scenarios.js')

const UID_REGEX = /^[A-Za-z][A-Za-z0-9]{10}$/
const build = (serverMinor = 43) =>
    buildMaps(snapshot, SCENARIOS, { serverMinor })
const allViews = (maps) => maps.flatMap(({ mapViews }) => mapViews)

test('the snapshot holds every source map', () => {
    const ids = new Set(snapshot.maps.map(({ id }) => id))
    SCENARIOS.forEach(({ sourceId }) => assert.ok(ids.has(sourceId), sourceId))
})

test('ids are valid, unique, not a source id, and stay the same across runs', () => {
    const ids = build().map(({ id }) => id)
    assert.deepEqual(
        ids,
        build().map(({ id }) => id)
    )
    ids.forEach((id) => assert.match(id, UID_REGEX))
    assert.equal(new Set(ids).size, SCENARIOS.length)
    const sourceIds = new Set(SCENARIOS.map(({ sourceId }) => sourceId))
    ids.forEach((id) => assert.ok(!sourceIds.has(id)))
})

test('names carry the test prefix and the scenario name', () => {
    build().forEach((map, index) =>
        assert.equal(map.name, `${NAME_PREFIX}${SCENARIOS[index].name}`)
    )
})

test('the Combined table reference layer is dropped, every other layer kept', () => {
    build().forEach((map, index) => {
        const source = snapshot.maps.find(
            ({ id }) => id === SCENARIOS[index].sourceId
        )
        const kept = source.mapViews
            .filter(({ layer }) => !DROPPED_LAYERS.has(layer))
            .map(({ layer, name }) => `${layer}:${name}`)
        assert.deepEqual(
            map.mapViews.map(({ layer, name }) => `${layer}:${name}`),
            kept
        )
    })
})

test('config keeps released settings and loses unreleased data table keys', () => {
    const configs = allViews(build())
        .filter(({ config }) => config)
        .map(({ config }) => JSON.parse(config))
    configs.forEach((config) =>
        DROPPED_CONFIG_KEYS.forEach((key) => assert.ok(!(key in config), key))
    )
    const keys = new Set(configs.flatMap(Object.keys))
    ;[
        'countFeaturesWithoutCoordinates',
        'unclassifiedLegend',
        'band',
        'relationships',
    ].forEach((key) => assert.ok(keys.has(key), key))
})

test('layers only carry properties maps-app saves, without ids', () => {
    const allowed = new Set(LAYER_PROPERTIES)
    allViews(build()).forEach((view) =>
        Object.keys(view).forEach((key) => assert.ok(allowed.has(key), key))
    )
})

test('dimension items and models keep only id-like properties', () => {
    allViews(build()).forEach((view) => {
        ;(view.rows ?? []).forEach(({ items }) =>
            items.forEach((item) =>
                Object.keys(item).forEach((key) =>
                    assert.ok(
                        ['id', 'name', 'path', 'dimensionItemType'].includes(
                            key
                        ),
                        key
                    )
                )
            )
        )
        if (view.program) {
            assert.deepEqual(Object.keys(view.program).sort(), ['id', 'name'])
        }
    })
})

test('basemaps get a real id on 2.43, and the legacy JSON before', () => {
    build(43).forEach(({ basemaps, basemap }) => {
        assert.equal(basemap, undefined)
        assert.equal(basemaps.length, 1)
        assert.equal(basemaps[0].id, 'osmLight')
        assert.equal(basemaps[0].hidden, false)
    })
    build(42).forEach(({ basemaps, basemap }) => {
        assert.equal(basemaps, undefined)
        assert.equal(JSON.parse(basemap).id, 'osmLight')
    })
})
