/*
 * Helpers for the org unit groups (8 to 15): which places a data item's
 * values reach. Every unit enters its own factor in each month of Q1 2025,
 * so a total tells which units it came from: F1 1, F2 10, F3 100, D1 1,000…
 * A case asks for one selection, as DV saves it, for 2025Q1.
 */
const { verdictOf } = require('../../expected.js')
const { toRow } = require('../../observations.js')

const FACTORS = {
    F1: 1,
    F2: 10,
    F3: 100,
    D1: 1000,
    D2: 10000,
    D3: 100000,
}
const MONTHS = ['202501', '202502', '202503']
const QUERY = { periodType: 'Quarterly', period: '2025Q1' }

const valuesAt = (dataSetId, elementId, units) =>
    units.flatMap((unit) =>
        MONTHS.map((period) => ({
            dataSet: dataSetId,
            dataElement: elementId,
            period,
            orgUnit: unit,
            value: FACTORS[unit],
        }))
    )

// The quarter's total of the units whose values count.
const totalOf = (units) =>
    units.reduce((sum, unit) => sum + FACTORS[unit] * MONTHS.length, 0)

/*
 * A selection item as DV saves it, keys resolved to ids: a unit key, or
 * LEVEL-n, OU_GROUP-<key>, USER_ORGUNIT and its _CHILDREN and
 * _GRANDCHILDREN.
 */
const resolveItem = (item, { orgUnitIds, groupIds }) => {
    if (orgUnitIds[item]) {
        return orgUnitIds[item]
    }
    const group = item.match(/^OU_GROUP-(.+)$/)
    return group ? `OU_GROUP-${groupIds[group[1]]}` : item
}

/*
 * One case: `contributes` lists the units whose values should count (the
 * hypothesis under test), or `value` gives the total directly (event
 * counts); `refused` when analytics refuses the selection (an error);
 * `prediction` is what the library predicts from metadata, or null where
 * its spec says nothing.
 */
const orgUnitCase = ({
    id,
    item,
    dx,
    orgUnits,
    contributes,
    value,
    refused,
    prediction,
    asUser,
}) => {
    const total = value ?? (contributes.length ? totalOf(contributes) : null)
    const status = refused ? 'ERROR' : total ? 'VALUE' : 'EMPTY'
    return {
        id,
        item,
        query: { ...QUERY, orgUnits },
        expected: {
            status,
            value: total || null,
            contributes,
            compatibility: prediction?.compatibility ?? null,
            reasons: prediction?.reasons ?? [],
        },
        dx,
        asUser: !!asUser,
        judge: verdictOf,
    }
}

const analyticsPath = (dx, items) =>
    `/api/analytics.json?dimension=dx:${dx}&dimension=ou:${items.join(
        ';'
    )}&filter=pe:${QUERY.period}&skipMeta=true&skipRounding=true`

// Values by unit key (or id, for units the tool doesn't own).
const readRows = (json, keyOfId) => {
    const names = (json.headers ?? []).map((h) => h.name)
    const ou = names.indexOf('ou')
    const value = names.indexOf('value')
    return Object.fromEntries(
        (json.rows ?? []).map((row) => [
            keyOfId[row[ou]] ?? row[ou],
            Number(row[value]),
        ])
    )
}

const observeResponse = ({ ok, status, json }, keyOfId) => {
    if (!ok) {
        return {
            status: 'ERROR',
            value: null,
            error: `${json?.errorCode ?? status}: ${json?.message}`,
        }
    }
    const rows = readRows(json, keyOfId)
    const values = Object.values(rows)
    return values.length
        ? {
              status: 'VALUE',
              value: values.reduce((sum, v) => sum + v, 0),
              extra: { rows },
          }
        : { status: 'EMPTY', value: null, extra: { rows } }
}

// Runs the cases one request each, as admin or as the PTT user.
const verifyOrgUnitCases =
    (cases) =>
    async (client, { orgUnitIds, groupIds, userClient }) => {
        const keyOfId = Object.fromEntries(
            Object.entries(orgUnitIds).map(([key, id]) => [id, key])
        )
        const rows = []
        for (const testCase of cases) {
            const items = testCase.query.orgUnits.map((item) =>
                resolveItem(item, { orgUnitIds, groupIds })
            )
            const caller = testCase.asUser ? userClient : client
            const observed = caller
                ? observeResponse(
                      await caller.send(
                          'GET',
                          analyticsPath(testCase.dx, items)
                      ),
                      keyOfId
                  )
                : {
                      status: 'ERROR',
                      value: null,
                      error: 'No PTT user: run index.js first.',
                  }
            rows.push(toRow(testCase, observed))
        }
        return { rows }
    }

const collectionSource = (set, extra = {}) => ({
    dataSet: set.name,
    periodType: set.periodType,
    orgUnits: set.orgUnits,
    ...extra,
})

module.exports = {
    FACTORS,
    MONTHS,
    QUERY,
    analyticsPath,
    collectionSource,
    observeResponse,
    orgUnitCase,
    readRows,
    resolveItem,
    totalOf,
    valuesAt,
    verifyOrgUnitCases,
}
