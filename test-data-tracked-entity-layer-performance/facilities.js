// Facilities (level 4 org units with a point) to place tracked entities near,
// sorted by id so every run distributes the data the same way.
const getFacilities = async (client, level = 4) => {
    const json = await client.get(
        `/api/organisationUnits.json?filter=level:eq:${level}&fields=id,geometry&paging=false`
    )
    return json.organisationUnits
        .filter((orgUnit) => orgUnit.geometry?.type === 'Point')
        .map(({ id, geometry }) => ({ id, coordinates: geometry.coordinates }))
        .sort((a, b) => a.id.localeCompare(b.id))
}

const getRootOrgUnit = async (client) => {
    const json = await client.get(
        '/api/organisationUnits.json?filter=level:eq:1&fields=id,name&paging=false'
    )
    const [root] = json.organisationUnits
    if (!root) {
        throw new Error('No level 1 org unit found')
    }
    return root
}

module.exports = { getFacilities, getRootOrgUnit }
