// The whole test design: shared objects, and each case group's metadata,
// data and cases. Pure: the same server answers give the same model.
const aggregationByPeriodType = require('./groups/aggregation-by-period-type.js')
const carryWindows = require('./groups/carry-windows.js')
const disaggregation = require('./groups/disaggregation.js')
const detectionRequests = require('./groups/detection-requests.js')
const indicatorsAndExpressions = require('./groups/indicators-and-expressions.js')
const mixedCollection = require('./groups/mixed-collection.js')
const periodsThatDontNest = require('./groups/periods-that-dont-nest.js')
const reportingRates = require('./groups/reporting-rates.js')
const aggregationLevels = require('./groups/org-units/aggregation-levels.js')
const enteredAbove = require('./groups/org-units/entered-above.js')
const mixedLevels = require('./groups/org-units/mixed-levels.js')
const orgUnitGroups = require('./groups/org-units/org-unit-groups.js')
const orgUnitRequests = require('./groups/org-units/org-unit-requests.js')
const partlyAssigned = require('./groups/org-units/partly-assigned.js')
const programs = require('./groups/org-units/programs.js')
const userOrgUnits = require('./groups/org-units/user-org-units.js')
const { uid } = require('./uid.js')

// In group number order: 1 to 7 period types, 8 to 15 org units, 16
// disaggregation.
const GROUP_MODULES = [
    aggregationByPeriodType,
    periodsThatDontNest,
    mixedCollection,
    indicatorsAndExpressions,
    reportingRates,
    detectionRequests,
    carryWindows,
    enteredAbove,
    partlyAssigned,
    mixedLevels,
    aggregationLevels,
    orgUnitGroups,
    userOrgUnits,
    programs,
    orgUnitRequests,
    disaggregation,
]

/*
 * The units and groups the org unit fixtures refer to, by key, written at
 * the top of each org unit fixture.
 */
const buildHierarchy = (shared) => ({
    orgUnits: Object.fromEntries(
        Object.values(shared.orgUnits).map((unit) => [
            unit.key,
            { level: unit.level, parent: unit.parent },
        ])
    ),
    groups: Object.fromEntries(
        orgUnitGroups.ORG_UNIT_GROUPS.map((group) => [group.key, group.members])
    ),
})

const orgUnit = (key, name, parent, level) => ({
    key,
    id: uid(`ou-${key}`),
    code: `PTT_OU_${key.toUpperCase()}`,
    name,
    shortName: name,
    parent,
    level,
})

/*
 * Under the user's root (level 1): the region, places A and B for the
 * period groups, and districts and facilities for the org unit groups.
 * D3 has no facilities: the shallow branch. Parents come first.
 */
const buildShared = () => ({
    orgUnits: {
        region: orgUnit('region', 'PTT region', null, 2),
        A: orgUnit('A', 'PTT place A', 'region', 3),
        B: orgUnit('B', 'PTT place B', 'region', 3),
        D1: orgUnit('D1', 'PTT district D1', 'region', 3),
        D2: orgUnit('D2', 'PTT district D2', 'region', 3),
        D3: orgUnit('D3', 'PTT district D3', 'region', 3),
        F1: orgUnit('F1', 'PTT facility F1', 'D1', 4),
        F2: orgUnit('F2', 'PTT facility F2', 'D1', 4),
        F3: orgUnit('F3', 'PTT facility F3', 'D2', 4),
    },
    orgUnitGroup: {
        id: uid('oug'),
        code: 'PTT_OUG',
        name: 'PTT group',
        shortName: 'PTT group',
    },
    constant: {
        id: uid('constant'),
        code: 'PTT_CONSTANT',
        name: 'PTT constant',
        shortName: 'PTT constant',
        value: 5,
    },
    indicatorType: {
        id: uid('indicator-type'),
        code: 'PTT_IT_FACTOR_1',
        name: 'PTT factor 1',
        factor: 1,
        number: true,
    },
})

// Groups by number (1) or key (aggregation-by-period-type); all if none.
const selectGroups = (selection = []) =>
    GROUP_MODULES.filter(
        (module, index) =>
            !selection.length ||
            selection.includes(String(index + 1)) ||
            selection.includes(module.KEY)
    )

const buildScenarios = (serverInfo, { groups: selection } = {}) => {
    const shared = buildShared()
    const context = { ...serverInfo, ...shared }
    // Every group's metadata is always built, so an import of one group
    // never removes another's objects from shared data sets.
    const groups = GROUP_MODULES.map((module) => module.buildGroup(context))
    const selectedKeys = selectGroups(selection).map((module) => module.KEY)
    return {
        shared,
        groups,
        selectedGroups: groups.filter((group) =>
            selectedKeys.includes(group.key)
        ),
    }
}

module.exports = {
    GROUP_MODULES,
    buildHierarchy,
    buildScenarios,
    selectGroups,
}
