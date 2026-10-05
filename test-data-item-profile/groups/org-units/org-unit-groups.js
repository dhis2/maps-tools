/*
 * Group 12: org unit group selections. Group `g` has D2 (level 3) and F1
 * (level 4); `empty` has nobody; `top` has the region (used by group 15's
 * nested filters). One element entered at every district and facility.
 * With unit ids, a group's members count only inside those boundaries.
 */
const { uid } = require('../../uid.js')
const { dataElement, dataSet, itemOf } = require('../shared.js')
const {
    collectionSource,
    orgUnitCase,
    valuesAt,
    verifyOrgUnitCases,
} = require('./shared.js')

const KEY = 'org-unit-groups'
const EVERYWHERE_UNITS = ['F1', 'F2', 'F3', 'D1', 'D2', 'D3']

const ORG_UNIT_GROUPS = [
    { key: 'g', name: 'PTT OU group g', members: ['D2', 'F1'] },
    { key: 'empty', name: 'PTT OU group empty', members: [] },
    { key: 'top', name: 'PTT OU group top', members: ['region'] },
].map((group) => ({
    ...group,
    id: uid(`ou-group-${group.key}`),
    code: `PTT_OUG_${group.key.toUpperCase()}`,
    shortName: group.name,
}))

const everywhere = () => {
    const element = dataElement('ou-everywhere', {
        code: 'PTT_OU_EVERYWHERE',
        name: 'PTT OU at every district and facility',
        aggregationType: 'SUM',
    })
    const set = dataSet('ou-ds-everywhere', {
        code: 'PTT_OU_DS_EVERYWHERE',
        name: 'PTT OU data set everywhere',
        periodType: 'Monthly',
        elements: [{ id: element.id }],
        orgUnits: EVERYWHERE_UNITS,
    })
    return {
        element,
        set,
        item: {
            ...itemOf(element, ['Monthly']),
            collectionSources: [collectionSource(set)],
        },
    }
}

const buildGroup = () => {
    const { element, set, item } = everywhere()
    const full = { compatibility: 'full', reasons: [] }
    const ask = (name, orgUnits, contributes, prediction, refused) =>
        orgUnitCase({
            id: `ou-groups__${name}`,
            item,
            dx: element.id,
            orgUnits,
            contributes,
            prediction,
            refused,
        })
    const cases = [
        ask('g', ['OU_GROUP-g'], ['D2', 'F3', 'F1'], full),
        ask('g-in-D1', ['OU_GROUP-g', 'D1'], ['F1'], full),
        ask('g-in-region', ['OU_GROUP-g', 'region'], ['D2', 'F3', 'F1'], full),
        /*
         * Refused with E7143 (finding 15). No prediction in the library's
         * spec for a group without members.
         */
        ask('empty', ['OU_GROUP-empty'], [], null, true),
    ]
    return {
        key: KEY,
        number: 12,
        title: 'Org unit groups',
        fixtureSet: 'org-units',
        dataElements: [element],
        dataSets: [set],
        orgUnitGroups: ORG_UNIT_GROUPS,
        dataValues: valuesAt(set.id, element.id, EVERYWHERE_UNITS),
        cases,
        verify: verifyOrgUnitCases(cases),
    }
}

module.exports = { KEY, ORG_UNIT_GROUPS, buildGroup, everywhere }
