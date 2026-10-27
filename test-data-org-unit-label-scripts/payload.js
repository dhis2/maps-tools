const { SCRIPTS } = require('./scripts.js')
const { deterministicUid } = require('./uid.js')

const CODE_PREFIX = 'OLS_'
const OPENING_DATE = '2020-01-01'
const DISTRICT_NAME = 'Label scripts (maps test)'

// In the sea west of Freetown: next to Sierra Leone without covering its chiefdoms
const GRID = {
    lons: [-16.3, -15.6, -14.9, -14.2],
    lats: [8.9, 8.2, 7.5],
    halfSize: 0.15,
}

const BASEMAPS = [{ id: 'osmLight', opacity: 1, hidden: false }]

const uid = (seed) => deterministicUid(`org-unit-label-scripts:${seed}`)

const boxAround = ([lon, lat], half) => ({
    type: 'Polygon',
    coordinates: [
        [
            [lon - half, lat - half],
            [lon + half, lat - half],
            [lon + half, lat + half],
            [lon - half, lat + half],
            [lon - half, lat - half],
        ],
    ],
})

const gridCenter = (index) => [
    GRID.lons[index % GRID.lons.length],
    GRID.lats[Math.floor(index / GRID.lons.length)],
]

// The district has no geometry, so district-level maps don't show it
const buildOrganisationUnits = (parentId) => {
    const district = {
        id: uid('district'),
        name: DISTRICT_NAME,
        shortName: DISTRICT_NAME,
        code: `${CODE_PREFIX}DISTRICT`,
        openingDate: OPENING_DATE,
        parent: { id: parentId },
    }

    const chiefdoms = SCRIPTS.map(({ key, name }, index) => ({
        id: uid(`chiefdom:${key}`),
        name,
        shortName: name,
        code: `${CODE_PREFIX}${key.toUpperCase()}`,
        openingDate: OPENING_DATE,
        parent: { id: district.id },
        geometry: boxAround(gridCenter(index), GRID.halfSize),
    }))

    return { district, chiefdoms }
}

// Same shape as maps-app saves: the org unit layer selects the district and
// the chiefdom level, with labels on
const buildMaps = ({ districtId, chiefdomLevelId }) => [
    {
        id: uid('map:labels'),
        name: 'Label scripts (test)',
        basemaps: BASEMAPS,
        // No map view id: updating a map replaces its views, and reusing an
        // id makes the server insert the new view before dropping the old one
        mapViews: [
            {
                layer: 'orgUnit',
                name: 'Organisation units',
                labels: true,
                opacity: 1,
                rows: [
                    {
                        dimension: 'ou',
                        items: [
                            { id: districtId },
                            { id: `LEVEL-${chiefdomLevelId}` },
                        ],
                    },
                ],
            },
        ],
    },
]

const buildMetadata = ({ parentId, chiefdomLevelId }) => {
    const { district, chiefdoms } = buildOrganisationUnits(parentId)
    return {
        district,
        chiefdoms,
        maps: buildMaps({ districtId: district.id, chiefdomLevelId }),
    }
}

module.exports = { buildMetadata, GRID }
