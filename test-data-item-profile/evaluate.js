// Reads each instance's observations (input/) back into cases. Verdicts and
// group summaries are recomputed from today's code, so fixing an
// expectation or a rule needs no new run. Shared by report.js and
// export-fixtures.js.
const { relation, verdictOf } = require('./expected.js')
const {
    fromRow,
    listInstances,
    readObservations,
} = require('./observations.js')
const { GROUP_MODULES, buildScenarios } = require('./scenarios.js')

// A group's observed cases: rows matched to the model's cases by id.
const evaluateGroup = (group, observations) => {
    const byId = new Map(group.cases.map((c) => [c.id, c]))
    const cases = observations.rows
        .map(fromRow)
        .filter(({ id }) => byId.has(id))
        .map(({ id, observed: stored }) => {
            const testCase = byId.get(id)
            const observed = testCase.derive?.(stored) ?? stored
            const judge = testCase.judge ?? verdictOf
            return {
                testCase,
                observed,
                verdict: judge(testCase.expected, observed),
            }
        })
    return {
        group,
        cases,
        findings: group.summarize?.(cases),
        responses: observations.responses,
    }
}

const loadInstance = (instance) => {
    const observations = Object.fromEntries(
        GROUP_MODULES.map((module) => [
            module.KEY,
            readObservations(instance, module.KEY),
        ])
    )
    const header = Object.values(observations).find(Boolean)
    if (!header) {
        return null
    }
    const model = buildScenarios(header.serverInfo)
    const groups = Object.fromEntries(
        model.groups
            .filter((group) => observations[group.key])
            .map((group) => [
                group.key,
                evaluateGroup(group, observations[group.key]),
            ])
    )
    return {
        instance,
        version: header.version,
        date: header.date,
        header,
        groups,
    }
}

const loadAll = (instances = listInstances()) =>
    instances.map(loadInstance).filter(Boolean)

// A short label shared by cases that fail, or differ, the same way.
const patternOf = ({ id, item, query }) => {
    const head = id.split('__')[0]
    const types = item.collectionPeriodTypes ?? []
    const how =
        types.length === 1 && query.periodType
            ? relation(types[0], query.periodType)
            : query.periodType
              ? `q-${query.periodType}`
              : ''
    return [head, how].filter(Boolean).join(' | ')
}

const countBy = (items, keyOf) =>
    items.reduce((counts, item) => {
        const key = keyOf(item)
        counts[key] = (counts[key] ?? 0) + 1
        return counts
    }, {})

module.exports = {
    countBy,
    evaluateGroup,
    loadAll,
    loadInstance,
    patternOf,
}
