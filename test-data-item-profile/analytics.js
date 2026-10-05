// Analytics query URLs and response parsing. Pure.
const cellKey = ({ dx, pe, ou }) => `${dx}|${pe}|${ou}`

// skipRounding: expected values are exact (6.53 is 6.526…).
const analyticsPath = ({ dx, pe, ou }) =>
    `/api/analytics.json?dimension=dx:${dx.join(';')}&dimension=pe:${pe.join(
        ';'
    )}&dimension=ou:${ou.join(';')}&skipMeta=true&skipRounding=true`

// Values by cell key, from a response with dx, pe, ou and value columns.
const parseRows = (json) => {
    const names = (json.headers ?? []).map((header) => header.name)
    const index = (name) => names.indexOf(name)
    const [dx, pe, ou, value] = ['dx', 'pe', 'ou', 'value'].map(index)
    const values = new Map()
    ;(json.rows ?? []).forEach((row) => {
        values.set(
            cellKey({ dx: row[dx], pe: row[pe], ou: row[ou] }),
            Number(row[value])
        )
    })
    return values
}

// The unique dimension items of a batch of cells.
const dimensionsOf = (cells) => ({
    dx: [...new Set(cells.map((cell) => cell.dx))],
    pe: [...new Set(cells.map((cell) => cell.pe))],
    ou: [...new Set(cells.map((cell) => cell.ou))],
})

const errorMessage = (json, status) =>
    `${json?.errorCode ?? status}: ${json?.message ?? 'no message'}`

module.exports = {
    analyticsPath,
    cellKey,
    dimensionsOf,
    errorMessage,
    parseRows,
}
