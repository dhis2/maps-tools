// Tracker import payloads. Everything is derived from the dataset key and
// the tracked entity index, so the same run always produces the same data
// and re-importing updates it in place.
const crypto = require('node:crypto')
const { STATUS_OPTIONS, attributeIds, datasetIds } = require('./metadata.js')
const { CODE_PREFIX } = require('./datasets.js')
const { uid } = require('./uid.js')

// Fixed, so enrollment dates don't move between runs.
const REFERENCE_DATE = Date.UTC(2026, 9, 1)
const DAY_MS = 24 * 60 * 60 * 1000

// Points land within about 1 km of their facility; polygons are hexagons
// of about 150 m around them.
const JITTER_DEGREES = 0.02
const POLYGON_RADIUS_DEGREES = 0.0015

// A small seeded generator (mulberry32), one per tracked entity.
const createRandom = (seed) => {
    let state = crypto
        .createHash('sha256')
        .update(seed)
        .digest()
        .readUInt32LE(0)
    return () => {
        state = (state + 0x6d2b79f5) | 0
        let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const round = (value) => Math.round(value * 1e6) / 1e6

const jitter = ([lng, lat], random) => [
    round(lng + (random() - 0.5) * JITTER_DEGREES),
    round(lat + (random() - 0.5) * JITTER_DEGREES),
]

const hexagon = ([lng, lat]) => {
    const ring = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i
        return [
            round(lng + POLYGON_RADIUS_DEGREES * Math.cos(angle)),
            round(lat + POLYGON_RADIUS_DEGREES * Math.sin(angle)),
        ]
    })
    return [[...ring, ring[0]]]
}

const pick = (random, weighted) => {
    let r = random()
    for (const [value, weight] of weighted) {
        if (r < weight) {
            return value
        }
        r -= weight
    }
    return weighted[weighted.length - 1][0]
}

const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10)

// The id of a dataset's tracked entity, also used for relationships
const trackedEntityId = (dataset, index) => uid(`${dataset.key}:te:${index}`)

const buildTrackedEntity = (dataset, index, facilities) => {
    const random = createRandom(`${dataset.key}:${index}`)
    const ids = datasetIds(dataset)
    const attributes = attributeIds()
    // Round robin, so every facility gets about the same number
    const facility = facilities[index % facilities.length]
    const point = jitter(facility.coordinates, random)
    const enrolledAt = REFERENCE_DATE - Math.floor(random() * 730) * DAY_MS

    return {
        trackedEntity: trackedEntityId(dataset, index),
        trackedEntityType: ids.trackedEntityType,
        orgUnit: facility.id,
        geometry:
            dataset.featureType === 'POLYGON'
                ? { type: 'Polygon', coordinates: hexagon(point) }
                : { type: 'Point', coordinates: point },
        attributes: [
            {
                attribute: attributes.age,
                value: String(Math.floor(random() * 91)),
            },
            {
                attribute: attributes.status,
                value: `${CODE_PREFIX}${pick(random, [
                    [STATUS_OPTIONS[0].code, 0.7],
                    [STATUS_OPTIONS[1].code, 0.2],
                    [STATUS_OPTIONS[2].code, 0.1],
                ])}`,
            },
            {
                attribute: attributes.gps,
                value: JSON.stringify(jitter(facility.coordinates, random)),
            },
        ],
        enrollments: [
            {
                enrollment: uid(`${dataset.key}:enrollment:${index}`),
                program: ids.program,
                orgUnit: facility.id,
                enrolledAt: isoDate(enrolledAt),
                occurredAt: isoDate(enrolledAt),
                status: pick(random, [
                    ['ACTIVE', 0.8],
                    ['COMPLETED', 0.15],
                    ['CANCELLED', 0.05],
                ]),
                followUp: random() < 0.1,
                // Tracker analytics only creates a type's event table when
                // it has events, and the query fails without that table.
                events: [
                    {
                        event: uid(`${dataset.key}:event:${index}`),
                        program: ids.program,
                        programStage: ids.programStage,
                        orgUnit: facility.id,
                        occurredAt: isoDate(enrolledAt),
                        status: 'COMPLETED',
                    },
                ],
            },
        ],
    }
}

// Tracked entities [start, end) of a dataset
const buildBatch = (dataset, facilities, start, end) => {
    if (!facilities.length) {
        throw new Error('No facilities with point coordinates to place data')
    }
    const last = Math.min(end, dataset.count)
    return {
        trackedEntities: Array.from(
            { length: Math.max(last - start, 0) },
            (_, i) => buildTrackedEntity(dataset, start + i, facilities)
        ),
    }
}

module.exports = {
    buildBatch,
    buildTrackedEntity,
    createRandom,
    trackedEntityId,
}
