/*
 * input/ must be necessary and sufficient: for every instance, each case
 * the model builds from that instance's server facts has exactly one
 * observation, and every observation belongs to a case. Then report.js and
 * export-fixtures.js need nothing else.
 */
const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const { listInstances, readObservations } = require('./observations.js')
const { GROUP_MODULES, buildScenarios } = require('./scenarios.js')

const instances = listInstances()

describe('input', () => {
    it('has observations for at least one instance', () => {
        assert.ok(instances.length > 0, 'input/ is empty: run verify.js')
    })

    instances.forEach((instance) => {
        it(`has one observation per case, and no other, for ${instance}`, () => {
            const files = Object.fromEntries(
                GROUP_MODULES.map(({ KEY }) => [
                    KEY,
                    readObservations(instance, KEY),
                ])
            )
            const header = Object.values(files).find(Boolean)
            const model = buildScenarios(header.serverInfo)
            model.groups.forEach((group) => {
                const file = files[group.key]
                assert.ok(file, `${instance}: no ${group.key}.json`)
                const observed = file.rows.map(([id]) => id)
                const expected = group.cases.map((c) => c.id)
                const observedIds = new Set(observed)
                const expectedIds = new Set(expected)
                const missing = expected.filter((id) => !observedIds.has(id))
                const extra = observed.filter((id) => !expectedIds.has(id))
                assert.equal(
                    new Set(observed).size,
                    observed.length,
                    `${instance} ${group.key}: duplicate rows`
                )
                assert.deepEqual(
                    missing.slice(0, 5),
                    [],
                    `${instance} ${group.key}: missing`
                )
                assert.deepEqual(
                    extra.slice(0, 5),
                    [],
                    `${instance} ${group.key}: not in the model`
                )
            })
            ;['detection-requests', 'org-unit-requests'].forEach((key) =>
                assert.ok(
                    files[key].responses?.length,
                    `${instance} ${key}: no responses`
                )
            )
        })
    })
})
