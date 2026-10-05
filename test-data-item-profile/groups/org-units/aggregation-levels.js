/*
 * Group 11: data elements with aggregation levels. The rule under test,
 * from the library (after dhis2-core AggregationLevelsHelper): a value
 * entered at level d can't reach a requested level k when a listed level L
 * has k <= L < d. Levels: region 2, districts 3, facilities 4.
 */
const { dataElement, dataSet, itemOf } = require('../shared.js')
const {
    collectionSource,
    orgUnitCase,
    valuesAt,
    verifyOrgUnitCases,
} = require('./shared.js')

const KEY = 'aggregation-levels'

const LEVEL_OF = { F1: 4, D1: 3, region: 2 }

const blocked = (enteredLevel, askedLevel, levels) =>
    levels.some((level) => askedLevel <= level && level < enteredLevel)

const ELEMENTS = [
    { name: 'f-3', levels: [3], enteredAt: ['F1', 'F2', 'F3'], level: 4 },
    { name: 'f-2', levels: [2], enteredAt: ['F1', 'F2', 'F3'], level: 4 },
    { name: 'f-2-3', levels: [2, 3], enteredAt: ['F1', 'F2', 'F3'], level: 4 },
    { name: 'd1-3', levels: [3], enteredAt: ['D1'], level: 3 },
]

// The entered units under each place asked for.
const UNDER = {
    F1: ['F1'],
    D1: ['F1', 'F2', 'D1'],
    region: ['F1', 'F2', 'F3', 'D1'],
}

const buildGroup = () => {
    const built = ELEMENTS.map((spec) => {
        const code = `PTT_OU_AGG_${spec.name.toUpperCase().replace(/-/g, '_')}`
        const element = dataElement(`ou-agg-${spec.name}`, {
            code,
            name: `PTT OU aggregation levels ${spec.levels.join(' and ')}, entered at level ${spec.level}`,
            aggregationType: 'SUM',
            aggregationLevels: spec.levels,
        })
        const set = dataSet(`ou-ds-agg-${spec.name}`, {
            code: `PTT_OU_DS_AGG_${spec.name.toUpperCase().replace(/-/g, '_')}`,
            name: `PTT OU aggregation levels data set ${spec.name}`,
            periodType: 'Monthly',
            elements: [{ id: element.id }],
            orgUnits: spec.enteredAt,
        })
        return { spec, element, set }
    })

    const cases = built.flatMap(({ spec, element, set }) => {
        const item = {
            ...itemOf(element, ['Monthly']),
            collectionSources: [
                collectionSource(set, { aggregationLevels: spec.levels }),
            ],
        }
        return Object.keys(UNDER).map((place) => {
            const asked = LEVEL_OF[place]
            const entered = UNDER[place].filter((unit) =>
                spec.enteredAt.includes(unit)
            )
            const below = spec.level < asked
            const stopped = blocked(spec.level, asked, spec.levels)
            const contributes = below || stopped ? [] : entered
            const reasons = below
                ? ['BELOW_COLLECTION']
                : stopped
                  ? ['AGGREGATION_LEVEL']
                  : []
            return orgUnitCase({
                id: `ou-agg-${spec.name}__${place}`,
                item,
                dx: element.id,
                orgUnits: [place],
                contributes,
                prediction: {
                    compatibility: contributes.length ? 'full' : 'none',
                    reasons,
                },
            })
        })
    })

    return {
        key: KEY,
        number: 11,
        title: 'Aggregation levels',
        fixtureSet: 'org-units',
        dataElements: built.map(({ element }) => element),
        dataSets: built.map(({ set }) => set),
        dataValues: built.flatMap(({ spec, element, set }) =>
            valuesAt(set.id, element.id, spec.enteredAt)
        ),
        cases,
        verify: verifyOrgUnitCases(cases),
    }
}

module.exports = { KEY, blocked, buildGroup }
