const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const { blocked } = require('./groups/org-units/aggregation-levels.js')
const {
    observeResponse,
    orgUnitCase,
    resolveItem,
    totalOf,
} = require('./groups/org-units/shared.js')
const { buildHierarchy, buildScenarios } = require('./scenarios.js')
const { OFFLINE } = require('./server.js')

describe('org units', () => {
    it('stops a value at a listed level between asked and entered', () => {
        // Entered at facilities (4), aggregation level 3.
        assert.equal(blocked(4, 4, [3]), false)
        assert.equal(blocked(4, 3, [3]), true)
        assert.equal(blocked(4, 2, [3]), true)
        // Aggregation level 2: districts still get it.
        assert.equal(blocked(4, 3, [2]), false)
        assert.equal(blocked(4, 2, [2]), true)
        // Entered at a district (3) with level 3: reaches the region.
        assert.equal(blocked(3, 2, [3]), false)
    })

    it('resolves DV items, keys to ids', () => {
        const context = { orgUnitIds: { F1: 'idF1' }, groupIds: { g: 'idG' } }
        assert.equal(resolveItem('F1', context), 'idF1')
        assert.equal(resolveItem('OU_GROUP-g', context), 'OU_GROUP-idG')
        assert.equal(resolveItem('LEVEL-4', context), 'LEVEL-4')
        assert.equal(resolveItem('USER_ORGUNIT', context), 'USER_ORGUNIT')
    })

    it('expects the total of the units that count', () => {
        assert.equal(totalOf(['F1', 'F2']), 33)
        const testCase = orgUnitCase({
            id: 'x',
            item: {},
            dx: 'd',
            orgUnits: ['region'],
            contributes: ['F1', 'D1'],
            prediction: { compatibility: 'full', reasons: [] },
        })
        assert.deepEqual(
            [testCase.expected.status, testCase.expected.value],
            ['VALUE', 3003]
        )
        const empty = orgUnitCase({
            id: 'y',
            item: {},
            dx: 'd',
            orgUnits: ['F3'],
            contributes: [],
            prediction: null,
        })
        assert.deepEqual(
            [
                empty.expected.status,
                empty.expected.value,
                empty.expected.compatibility,
            ],
            ['EMPTY', null, null]
        )
    })

    it('reads rows by unit key', () => {
        const observed = observeResponse(
            {
                ok: true,
                json: {
                    headers: [
                        { name: 'dx' },
                        { name: 'ou' },
                        { name: 'value' },
                    ],
                    rows: [
                        ['d', 'idF1', '3'],
                        ['d', 'other', '30'],
                    ],
                },
            },
            { idF1: 'F1' }
        )
        assert.deepEqual(observed, {
            status: 'VALUE',
            value: 33,
            extra: { rows: { F1: 3, other: 30 } },
        })
        assert.equal(
            observeResponse(
                {
                    ok: false,
                    status: 409,
                    json: { errorCode: 'E7143', message: 'm' },
                },
                {}
            ).status,
            'ERROR'
        )
    })

    it('describes the hierarchy by key', () => {
        const { shared } = buildScenarios({
            ...OFFLINE,
            serverPeriodTypes: null,
        })
        const hierarchy = buildHierarchy(shared)
        assert.deepEqual(hierarchy.orgUnits.F3, { level: 4, parent: 'D2' })
        assert.deepEqual(hierarchy.groups.g, ['D2', 'F1'])
    })
})
