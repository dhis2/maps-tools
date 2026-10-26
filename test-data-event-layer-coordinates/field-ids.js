const fs = require('node:fs')
const path = require('node:path')

// Writes the custom field ids other tools (e.g. the Cypress scenario-matrix
// spec) need to interpret scenarios.json's `points`, without requiring any
// script module themselves - scenarios.json's points are keyed by these ids
// for the custom DE/TEA fields, but built-in fields (psigeometry etc.) use
// fixed, well-known keys and don't need a mapping.
const writeFieldIds = (
    { deCoordinate, deOrgUnit, teaCoordinate, teaOrgUnit },
    { jsonPath }
) => {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
    fs.writeFileSync(
        jsonPath,
        JSON.stringify(
            { deCoordinate, deOrgUnit, teaCoordinate, teaOrgUnit },
            null,
            2
        )
    )
    return { jsonPath }
}

module.exports = { writeFieldIds }
