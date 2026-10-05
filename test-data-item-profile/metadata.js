// DHIS2 metadata payloads from the scenario model. Pure.
//
// Two phases: `initial` keeps every temporary data set membership, so the
// values of history and orphan elements can be imported; `final` removes
// them, leaving those elements with data their data sets no longer explain.
const toOrgUnit = (unit, parentId) => ({
    id: unit.id,
    code: unit.code,
    name: unit.name,
    shortName: unit.shortName,
    openingDate: '2000-01-01',
    parent: { id: parentId },
})

const withoutKey = ({ key, ...rest }) => rest

const toOrgUnitGroup = (group, orgUnits) => ({
    id: group.id,
    code: group.code,
    name: group.name,
    shortName: group.shortName,
    organisationUnits: group.members.map((key) => ({ id: orgUnits[key].id })),
})

// Payloads a group builds whole (programs, users…), by metadata type.
const extraMetadata = (groups) =>
    groups.reduce((all, group) => {
        Object.entries(group.extraMetadata ?? {}).forEach(([type, objects]) => {
            all[type] = [...(all[type] ?? []), ...objects]
        })
        return all
    }, {})

const buildMetadata = (model, { rootOrgUnitId, phase }) => {
    const { shared, groups } = model
    const { orgUnits } = shared
    const orgUnitId = (key) => orgUnits[key].id
    const all = (field) => groups.flatMap((group) => group[field] ?? [])

    const dataSets = all('dataSets').map((set) => ({
        id: set.id,
        code: set.code,
        name: set.name,
        shortName: set.shortName,
        periodType: set.periodType,
        // Periods that haven't ended yet (2025Oct runs to September 2026)
        // count as future on 2.40 to 2.42, which refuse them at 0.
        openFuturePeriods: 2,
        expiryDays: 0,
        // Data write for everyone: completeness registrations need it,
        // even for a superuser ("User does not have write access").
        sharing: { public: 'rwrw----', users: {}, userGroups: {} },
        dataSetElements: set.elements
            .filter((element) => phase === 'initial' || !element.temporary)
            .map((element) => ({
                dataSet: { id: set.id },
                dataElement: { id: element.id },
            })),
        organisationUnits: set.orgUnits.map((key) => ({ id: orgUnitId(key) })),
    }))

    const metadata = {
        organisationUnits: Object.values(orgUnits).map((unit) =>
            toOrgUnit(
                unit,
                unit.parent ? orgUnits[unit.parent].id : rootOrgUnitId
            )
        ),
        organisationUnitGroups: [
            toOrgUnitGroup(
                { ...shared.orgUnitGroup, members: ['A', 'B'] },
                orgUnits
            ),
            ...all('orgUnitGroups').map((group) =>
                toOrgUnitGroup(group, orgUnits)
            ),
        ],
        constants: [shared.constant],
        indicatorTypes: [shared.indicatorType],
        dataElements: all('dataElements').map((element) => ({
            domainType: 'AGGREGATE',
            ...withoutKey(element),
            zeroIsSignificant: false,
        })),
        dataSets,
        indicators: all('indicators').map((indicator) => ({
            id: indicator.id,
            code: indicator.code,
            name: indicator.name,
            shortName: indicator.shortName,
            indicatorType: { id: shared.indicatorType.id },
            numerator: indicator.numerator,
            numeratorDescription: 'Numerator',
            denominator: indicator.denominator,
            denominatorDescription: 'Denominator',
            annualized: indicator.annualized,
        })),
        expressionDimensionItems: all('expressionItems').map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            shortName: item.shortName,
            expression: item.expression,
        })),
        ...extraMetadata(groups),
    }

    /*
     * Objects that need others to exist first go in the final import only:
     * - a user's org units: in the same payload, 2.43.1 answers HTTP 500
     *   ("fetchedOrgUnit is null");
     * - an expression item's data elements: in the same payload, it is
     *   refused ("Expression is not parsable").
     */
    if (phase === 'initial') {
        delete metadata.users
        delete metadata.expressionDimensionItems
    }

    return Object.fromEntries(
        Object.entries(metadata).filter(([, objects]) => objects?.length)
    )
}

// Every id the model owns, with a label, to catch collisions.
const listIds = (model) => {
    const { shared, groups } = model
    const labelled = [
        ...Object.values(shared.orgUnits).map((unit) => [unit.id, unit.code]),
        [shared.orgUnitGroup.id, shared.orgUnitGroup.code],
        [shared.constant.id, shared.constant.code],
        [shared.indicatorType.id, shared.indicatorType.code],
    ]
    groups.forEach((group) => {
        ;[
            'dataElements',
            'dataSets',
            'indicators',
            'expressionItems',
            'orgUnitGroups',
        ].forEach((field) =>
            (group[field] ?? []).forEach((object) =>
                labelled.push([object.id, object.code])
            )
        )
        Object.values(group.extraMetadata ?? {}).forEach((objects) =>
            objects.forEach((object) =>
                labelled.push([object.id, object.code ?? object.name])
            )
        )
    })
    return labelled
}

const findCollisions = (model) => {
    const seen = new Map()
    const collisions = []
    listIds(model).forEach(([id, label]) => {
        if (seen.has(id) && seen.get(id) !== label) {
            collisions.push(`${id}: ${seen.get(id)} and ${label}`)
        }
        seen.set(id, label)
    })
    return collisions
}

module.exports = { buildMetadata, findCollisions, listIds }
