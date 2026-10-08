/*
 * Group 10: one element in a facility data set (F1, F2, F3) and a district
 * data set (D1). At F1 the district's values can't reach: the value is too
 * low. An indicator over it (#{el}/1) shows the same as OPERAND_PARTIAL.
 */
const { uid } = require('../../uid.js')
const { dataElement, dataSet, itemOf } = require('../shared.js')
const {
    collectionSource,
    orgUnitCase,
    valuesAt,
    verifyOrgUnitCases,
} = require('./shared.js')

const KEY = 'mixed-levels'

const buildGroup = () => {
    const element = dataElement('ou-mixed', {
        code: 'PTT_OU_MIXED',
        name: 'PTT OU at facilities and D1',
        aggregationType: 'SUM',
    })
    const facilities = dataSet('ou-ds-mixed-facilities', {
        code: 'PTT_OU_DS_MIXED_FACILITIES',
        name: 'PTT OU mixed data set at facilities',
        periodType: 'Monthly',
        elements: [{ id: element.id }],
        orgUnits: ['F1', 'F2', 'F3'],
    })
    const district = dataSet('ou-ds-mixed-district', {
        code: 'PTT_OU_DS_MIXED_DISTRICT',
        name: 'PTT OU mixed data set at D1',
        periodType: 'Monthly',
        elements: [{ id: element.id }],
        orgUnits: ['D1'],
    })
    const indicator = {
        key: 'ou-mixed-indicator',
        id: uid('ou-mixed-indicator'),
        code: 'PTT_OU_IND_MIXED',
        name: 'PTT OU indicator over the mixed element',
        shortName: 'PTT OU mixed indicator',
        numerator: `#{${element.id}}`,
        denominator: '1',
        annualized: false,
    }
    const sources = [collectionSource(facilities), collectionSource(district)]
    const elementItem = {
        ...itemOf(element, ['Monthly']),
        collectionSources: sources,
    }
    const indicatorItem = {
        code: indicator.code,
        dimensionItemType: 'INDICATOR',
        numerator: indicator.numerator,
        denominator: indicator.denominator,
        operands: [
            {
                id: element.id,
                dimensionItemType: 'DATA_ELEMENT',
                aggregationType: 'SUM',
                collectionPeriodTypes: ['Monthly'],
                collectionSources: sources,
            },
        ],
    }
    // At F1, D1's values can't reach: partial. Elsewhere, full.
    const subjects = [
        {
            kind: 'element',
            dx: element.id,
            item: elementItem,
            reason: 'BELOW_COLLECTION',
        },
        {
            kind: 'indicator',
            dx: indicator.id,
            item: indicatorItem,
            reason: 'OPERAND_PARTIAL',
        },
    ]
    const places = [
        ['F1', ['F1']],
        ['D1', ['F1', 'F2', 'D1']],
        ['region', ['F1', 'F2', 'F3', 'D1']],
    ]
    const cases = subjects.flatMap(({ kind, dx, item, reason }) =>
        places.map(([place, contributes]) =>
            orgUnitCase({
                id: `ou-mixed-${kind}__${place}`,
                item,
                dx,
                orgUnits: [place],
                contributes,
                prediction:
                    place === 'F1'
                        ? { compatibility: 'partial', reasons: [reason] }
                        : { compatibility: 'full', reasons: [] },
            })
        )
    )
    return {
        key: KEY,
        number: 10,
        title: 'Mixed levels',
        fixtureSet: 'org-units',
        dataElements: [element],
        dataSets: [facilities, district],
        indicators: [indicator],
        dataValues: [
            ...valuesAt(facilities.id, element.id, ['F1', 'F2', 'F3']),
            ...valuesAt(district.id, element.id, ['D1']),
        ],
        cases,
        verify: verifyOrgUnitCases(cases),
    }
}

module.exports = { KEY, buildGroup }
