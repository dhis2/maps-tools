// Distinct integer-degree offset per point-bearing geometry channel, so
// every candidate source for a given event has a numerically distinct
// coordinate. This lets verify.js prove which source actually won a
// resolution (including cascade precedence) by comparing coordinates,
// rather than relying on the backend returning an explicit source label
// (the `geometrySource` analytics dimension isn't recognized by every
// DHIS2 version/instance - see verify.js for details).
const CHANNEL_BIAS = {
    psigeometry: [0, 0],
    ougeometry: [5, 0],
    pigeometry: [1, 0],
    teigeometry: [2, 0],
    deCoordinate: [3, 0],
    teaCoordinate: [4, 0],
}

const pointForChannel = (
    baseCoords,
    channel,
    { index = 0, step = 0.01, gridSize = 20 } = {}
) => {
    const [biasLon, biasLat] = CHANNEL_BIAS[channel]
    const dx = (index % gridSize) * step
    const dy = Math.floor(index / gridSize) * step
    return [baseCoords[0] + biasLon + dx, baseCoords[1] + biasLat + dy]
}

const coordinateValue = (point) => JSON.stringify(point)

module.exports = { pointForChannel, coordinateValue, CHANNEL_BIAS }
