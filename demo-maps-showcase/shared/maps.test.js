const assert = require('node:assert/strict')
const { test } = require('node:test')
const { thematicLayer } = require('./maps.js')
const { CLASS_SCALES } = require('./palette.js')

const layer = (colorScale) =>
    thematicLayer({
        name: 'Count',
        dataItem: { id: 'abcdefghijk', dimensionItemType: 'INDICATOR' },
        periods: ['LAST_12_MONTHS'],
        level: 2,
        colorScale,
    })

test('choropleth points keep one size, bubbles grow with the value', () => {
    const choropleth = layer(CLASS_SCALES.reds3)
    assert.equal(choropleth.radiusLow, choropleth.radiusHigh)
    const bubble = thematicLayer({
        name: 'Rate',
        dataItem: { id: 'abcdefghijk', dimensionItemType: 'INDICATOR' },
        periods: ['LAST_12_MONTHS'],
        level: 2,
        legendSet: 'abcdefghijk',
        bubble: true,
    })
    assert.ok(bubble.radiusHigh > bubble.radiusLow)
})

test('classes without a legend set only take palettes the Style tab knows', () => {
    assert.equal(layer(CLASS_SCALES.reds3).classes, 3)
    assert.throws(() => layer('#fee090,#fc8d59,#d73027'), /CLASS_SCALES/)
})
