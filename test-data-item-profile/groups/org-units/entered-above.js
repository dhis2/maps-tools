/*
 * Group 8: values entered above the place asked for. A data set assigned
 * to district D1 only; nothing is split down to its facilities.
 */
const { dataElement, dataSet, itemOf } = require('../shared.js')
const {
    collectionSource,
    orgUnitCase,
    valuesAt,
    verifyOrgUnitCases,
} = require('./shared.js')

const KEY = 'entered-above'

const buildGroup = () => {
    const element = dataElement('ou-above', {
        code: 'PTT_OU_ABOVE',
        name: 'PTT OU entered at D1',
        aggregationType: 'SUM',
    })
    const set = dataSet('ou-ds-above', {
        code: 'PTT_OU_DS_ABOVE',
        name: 'PTT OU data set at D1',
        periodType: 'Monthly',
        elements: [{ id: element.id }],
        orgUnits: ['D1'],
    })
    const item = {
        ...itemOf(element, ['Monthly']),
        collectionSources: [collectionSource(set)],
    }
    const full = { compatibility: 'full', reasons: [] }
    const below = { compatibility: 'none', reasons: ['BELOW_COLLECTION'] }
    const ask = (name, orgUnits, contributes, prediction) =>
        orgUnitCase({
            id: `ou-above__${name}`,
            item,
            dx: element.id,
            orgUnits,
            contributes,
            prediction,
        })
    const cases = [
        ask('F1', ['F1'], [], below),
        ask('D1', ['D1'], ['D1'], full),
        ask('region', ['region'], ['D1'], full),
        ask('level-4-region', ['LEVEL-4', 'region'], [], below),
        ask('level-3-region', ['LEVEL-3', 'region'], ['D1'], full),
    ]
    return {
        key: KEY,
        number: 8,
        title: 'Entered above',
        fixtureSet: 'org-units',
        dataElements: [element],
        dataSets: [set],
        dataValues: valuesAt(set.id, element.id, ['D1']),
        cases,
        verify: verifyOrgUnitCases(cases),
    }
}

module.exports = { KEY, buildGroup }
