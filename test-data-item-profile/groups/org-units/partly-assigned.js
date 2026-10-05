/*
 * Group 9: a data set assigned to facilities F1 and F2, not F3. Its
 * district D2 and facility F3 get nothing; the region gets F1 + F2.
 */
const { dataElement, dataSet, itemOf } = require('../shared.js')
const {
    collectionSource,
    orgUnitCase,
    valuesAt,
    verifyOrgUnitCases,
} = require('./shared.js')

const KEY = 'partly-assigned'

const buildGroup = () => {
    const element = dataElement('ou-partly', {
        code: 'PTT_OU_PARTLY',
        name: 'PTT OU at F1 and F2',
        aggregationType: 'SUM',
    })
    const set = dataSet('ou-ds-partly', {
        code: 'PTT_OU_DS_PARTLY',
        name: 'PTT OU data set at F1 and F2',
        periodType: 'Monthly',
        elements: [{ id: element.id }],
        orgUnits: ['F1', 'F2'],
    })
    const item = {
        ...itemOf(element, ['Monthly']),
        collectionSources: [collectionSource(set)],
    }
    const full = { compatibility: 'full', reasons: [] }
    const partly = { compatibility: 'full', reasons: ['PARTLY_ASSIGNED'] }
    const notAssigned = { compatibility: 'none', reasons: ['NOT_ASSIGNED'] }
    const ask = (name, orgUnits, contributes, prediction) =>
        orgUnitCase({
            id: `ou-partly__${name}`,
            item,
            dx: element.id,
            orgUnits,
            contributes,
            prediction,
        })
    const cases = [
        ask('F3', ['F3'], [], notAssigned),
        ask('D2', ['D2'], [], notAssigned),
        ask('D1', ['D1'], ['F1', 'F2'], full),
        ask('region', ['region'], ['F1', 'F2'], partly),
        ask('level-4-region', ['LEVEL-4', 'region'], ['F1', 'F2'], partly),
    ]
    return {
        key: KEY,
        number: 9,
        title: 'Partly assigned',
        fixtureSet: 'org-units',
        dataElements: [element],
        dataSets: [set],
        dataValues: valuesAt(set.id, element.id, ['F1', 'F2']),
        cases,
        verify: verifyOrgUnitCases(cases),
    }
}

module.exports = { KEY, buildGroup }
