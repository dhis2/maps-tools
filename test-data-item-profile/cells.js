// Fetches the analytics cells of a set of cases, one request per batch. A
// refused batch is retried item by item, so one refused item (a NONE
// aggregation, an operand a version rejects) doesn't hide the others.
const {
    analyticsPath,
    cellKey,
    dimensionsOf,
    errorMessage,
    parseRows,
} = require('./analytics.js')
const { periodTypeOfId } = require('./period-types.js')

const runPool = async (tasks, concurrency) => {
    const results = []
    let next = 0
    const worker = async () => {
        while (next < tasks.length) {
            const index = next++
            results[index] = await tasks[index]()
        }
    }
    await Promise.all(Array.from({ length: concurrency }, worker))
    return results
}

const fetchCells = async (client, cells, orgUnitIds) => {
    const { dx, pe, ou } = dimensionsOf(cells)
    const keyOfId = Object.fromEntries(
        Object.entries(orgUnitIds).map(([key, id]) => [id, key])
    )
    const path = analyticsPath({ dx, pe, ou: ou.map((key) => orgUnitIds[key]) })
    const { ok, status, json } = await client.send('GET', path)
    if (!ok) {
        return { error: errorMessage(json, status) }
    }
    const byId = parseRows(json)
    const values = new Map()
    byId.forEach((value, key) => {
        const [d, p, o] = key.split('|')
        values.set(cellKey({ dx: d, pe: p, ou: keyOfId[o] }), value)
    })
    return { values }
}

const fetchBatch = async (client, cells, orgUnitIds) => {
    const results = new Map()
    const record = (batchCells, { values, error }) =>
        batchCells.forEach((cell) => {
            const key = cellKey(cell)
            results.set(
                key,
                error
                    ? { value: null, error }
                    : { value: values.get(key) ?? null, error: null }
            )
        })

    const whole = await fetchCells(client, cells, orgUnitIds)
    const items = dimensionsOf(cells).dx
    if (!whole.error || items.length === 1) {
        record(cells, whole)
        return results
    }
    for (const item of items) {
        const itemCells = cells.filter((cell) => cell.dx === item)
        record(itemCells, await fetchCells(client, itemCells, orgUnitIds))
    }
    return results
}

/*
 * A lookup (batchKey, cell) → { value, error } for every cell of the cases.
 * Results are kept per request: FIRST and LAST answer a cell differently
 * depending on the other periods asked for with it.
 */
const fetchCaseCells = async (
    client,
    cases,
    { orgUnitIds, concurrency, onBatch, refusedTypes = {} }
) => {
    // Cells of period types the server refused: ERROR, never requested.
    const refused = new Map()
    const batches = new Map()
    cases.forEach((testCase) => {
        if (!batches.has(testCase.batchKey)) {
            batches.set(testCase.batchKey, new Map())
        }
        const batch = batches.get(testCase.batchKey)
        testCase.cells.forEach((cell) => {
            const message = refusedTypes[periodTypeOfId(cell.pe)]
            if (message) {
                refused.set(cellKey(cell), { value: null, error: message })
            } else {
                batch.set(cellKey(cell), cell)
            }
        })
    })
    const batchList = [...batches]
        .map(([batchKey, batch]) => [batchKey, [...batch.values()]])
        .filter(([, cells]) => cells.length)
    let done = 0
    const results = await runPool(
        batchList.map(([batchKey, cells]) => async () => {
            const result = await fetchBatch(client, cells, orgUnitIds)
            onBatch?.(++done, batchList.length)
            return [batchKey, result]
        }),
        concurrency
    )
    const byBatch = new Map(results)
    return (batchKey, cell) =>
        refused.get(cellKey(cell)) ?? byBatch.get(batchKey)?.get(cellKey(cell))
}

module.exports = { fetchCaseCells, runPool }
