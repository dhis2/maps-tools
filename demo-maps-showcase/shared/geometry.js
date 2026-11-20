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

// Ray casting: a point on the edge counts as either side
const inRing = ([x, y], ring) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]
        const [xj, yj] = ring[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside
        }
    }
    return inside
}

const inPolygon = (point, [outer, ...holes]) =>
    inRing(point, outer) && !holes.some((hole) => inRing(point, hole))

// For a GeoJSON Polygon or MultiPolygon
const inGeometry = (point, { type, coordinates }) => {
    if (type === 'Polygon') {
        return inPolygon(point, coordinates)
    }
    if (type === 'MultiPolygon') {
        return coordinates.some((polygon) => inPolygon(point, polygon))
    }
    return false
}

// Coordinates of the facilities whose point lies in their own district.
// Some demo facilities have a point in another district (Modia MCHP, Kambia,
// sits at Lungi, Port Loko); chiefdom boundaries are too coarse for the test.
const loadFacilityPoints = async (client) => {
    const [
        { organisationUnits: facilities },
        { organisationUnits: districts },
    ] = await Promise.all([
        client.get(
            '/api/organisationUnits?filter=level:eq:4&filter=geometry:!null&fields=id,geometry,parent[parent[id]]&paging=false'
        ),
        client.get(
            '/api/organisationUnits?filter=level:eq:2&filter=geometry:!null&fields=id,geometry&paging=false'
        ),
    ])
    const districtGeometry = Object.fromEntries(
        districts.map(({ id, geometry }) => [id, geometry])
    )
    return Object.fromEntries(
        facilities
            .filter(({ geometry, parent }) => {
                const district = districtGeometry[parent?.parent?.id]
                return (
                    geometry.type === 'Point' &&
                    district &&
                    inGeometry(geometry.coordinates, district)
                )
            })
            .map(({ id, geometry }) => [id, geometry.coordinates])
    )
}

module.exports = { distanceKm, inGeometry, loadFacilityPoints }
