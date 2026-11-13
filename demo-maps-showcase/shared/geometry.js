const EARTH_RADIUS_KM = 6371

const toRadians = (degrees) => (degrees * Math.PI) / 180

// Great-circle distance between two [longitude, latitude] points
const distanceKm = ([lon1, lat1], [lon2, lat2]) => {
    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

// Facility coordinates, for facilities that have a point
const loadFacilityPoints = async (client) => {
    const { organisationUnits } = await client.get(
        '/api/organisationUnits?filter=level:eq:4&filter=geometry:!null&fields=id,geometry&paging=false'
    )
    return Object.fromEntries(
        organisationUnits
            .filter(({ geometry }) => geometry.type === 'Point')
            .map(({ id, geometry }) => [id, geometry.coordinates])
    )
}

module.exports = { distanceKm, loadFacilityPoints }
