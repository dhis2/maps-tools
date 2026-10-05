const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const {
    analyticsPath,
    cellKey,
    dimensionsOf,
    parseRows,
} = require('./analytics.js')

describe('analytics', () => {
    it('builds a query path', () => {
        assert.equal(
            analyticsPath({ dx: ['a', 'b'], pe: ['2025'], ou: ['x'] }),
            '/api/analytics.json?dimension=dx:a;b&dimension=pe:2025&dimension=ou:x&skipMeta=true&skipRounding=true'
        )
    })

    it('reads values by cell, whatever the column order', () => {
        const values = parseRows({
            headers: [
                { name: 'pe' },
                { name: 'dx' },
                { name: 'value' },
                { name: 'ou' },
            ],
            rows: [['2025', 'a', '6.5', 'x']],
        })
        assert.equal(values.get(cellKey({ dx: 'a', pe: '2025', ou: 'x' })), 6.5)
        assert.equal(values.size, 1)
    })

    it('reads a response without rows', () => {
        assert.equal(parseRows({ headers: [] }).size, 0)
    })

    it('lists the unique items of a batch', () => {
        assert.deepEqual(
            dimensionsOf([
                { dx: 'a', pe: '1', ou: 'x' },
                { dx: 'a', pe: '2', ou: 'x' },
                { dx: 'b', pe: '1', ou: 'y' },
            ]),
            { dx: ['a', 'b'], pe: ['1', '2'], ou: ['x', 'y'] }
        )
    })
})
