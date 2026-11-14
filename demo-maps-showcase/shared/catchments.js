const { randomFor } = require('../random.js')

const VERTICES = 32
const KM_PER_DEGREE_LAT = 110.57

// A synthetic travel-time catchment: a ring around the facility whose reach
// varies smoothly with direction, as roads and rivers would make it
const catchment = (seed, [lon, lat], radiusKm) => {
    const random = randomFor('catchment', seed)
    // A few smooth waves around the ring
    const waves = [1, 2, 3].map((k) => ({
        k,
        amplitude: random.between(0.05, 0.25) / k,
        phase: random.between(0, 2 * Math.PI),
    }))
    const kmPerDegreeLon = KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180)
    const ring = Array.from({ length: VERTICES }, (_, i) => {
        const angle = (2 * Math.PI * i) / VERTICES
        const reach =
            radiusKm *
            (1 +
                waves.reduce(
                    (sum, { k, amplitude, phase }) =>
                        sum + amplitude * Math.sin(k * angle + phase),
                    0
                ))
        return [
            Number(
                (lon + (reach * Math.cos(angle)) / kmPerDegreeLon).toFixed(5)
            ),
            Number(
                (lat + (reach * Math.sin(angle)) / KM_PER_DEGREE_LAT).toFixed(5)
            ),
        ]
    })
    return { type: 'Polygon', coordinates: [[...ring, ring[0]]] }
}

module.exports = { catchment }
