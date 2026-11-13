// Builds maps in the format maps-app saves (validLayerProperties in maps-app's
// src/util/favorites.js). mapViews go bottom layer first.
const { DISTRICTS } = require('./sierraLeone.js')
const { SYNTHETIC_LABEL, code, uid } = require('./ids.js')

const BASEMAP = 'osmLight'

const dimension = (name, items) => ({ dimension: name, items })

// Org units are the 13 districts, or what lies below them at a level, so
// districts outside Sierra Leone on some instances stay off the map
const orgUnitRows = (level) => [
    dimension('ou', [
        ...Object.values(DISTRICTS).map((id) => ({ id })),
        ...(level === 2 ? [] : [{ id: `LEVEL-${level}` }]),
    ]),
]

const labelProps = (labels) =>
    labels
        ? {
              labels: true,
              labelTemplate: labels,
              labelFontSize: '11px',
              labelFontColor: '#333333',
              labelFontStyle: 'normal',
              labelFontWeight: 'normal',
          }
        : {}

// A legend set, or equal-count classes over colorScale for counts
const classification = (legendSet, colorScale) =>
    legendSet
        ? { method: 1, legendSet: { id: legendSet } }
        : {
              method: 3,
              classes: colorScale.split(',').length,
              colorScale,
          }

// dataItem: { id, dimensionItemType }; periods: relative or fixed period ids
const thematicLayer = ({
    name,
    dataItem,
    periods,
    level,
    legendSet,
    colorScale,
    bubble = false,
    renderingStrategy = 'SINGLE',
    labels,
    hidden = false,
    opacity = 0.9,
    radiusLow = 5,
    radiusHigh = 20,
}) => ({
    layer: 'thematic',
    name,
    columns: [dimension('dx', [dataItem])],
    rows: orgUnitRows(level),
    filters: [
        dimension(
            'pe',
            periods.map((id) => ({ id }))
        ),
    ],
    ...classification(legendSet, colorScale),
    thematicMapType: bubble ? 'BUBBLE' : 'CHOROPLETH',
    ...(bubble ? { radiusLow, radiusHigh } : {}),
    renderingStrategy,
    noDataColor: '#BDBDBD',
    opacity,
    hidden,
    ...labelProps(labels),
})

const facilityLayer = ({ name, groupSet, hidden = false }) => ({
    layer: 'facility',
    name,
    rows: orgUnitRows(4),
    ...(groupSet ? { organisationUnitGroupSet: { id: groupSet } } : {}),
    opacity: 1,
    hidden,
})

const boundaryLayer = ({ name, level, color = '#333333', labels }) => ({
    layer: 'orgUnit',
    name,
    rows: orgUnitRows(level),
    organisationUnitColor: color,
    opacity: 1,
    hidden: false,
    ...labelProps(labels),
})

const map = ({ key, post, title, description, layers }) => ({
    id: uid(`map:${key}`),
    code: code(`MAP_${key.toUpperCase()}`),
    name: `Post ${post} · ${title} (${SYNTHETIC_LABEL})`,
    description: `${description} ${SYNTHETIC_LABEL}, DHIS2 demo.`,
    basemap: BASEMAP,
    basemaps: [{ id: BASEMAP, opacity: 1, hidden: false }],
    latitude: 8.5,
    longitude: -11.8,
    zoom: 7,
    mapViews: layers.map((layer, i) => ({
        id: uid(`map:${key}:layer:${i}`),
        ...layer,
    })),
})

const dashboard = ({ key, post, title, maps }) => ({
    id: uid(`dashboard:${key}`),
    code: code(`DASHBOARD_${key.toUpperCase()}`),
    name: `Showcase ${post} · ${title} (${SYNTHETIC_LABEL})`,
    dashboardItems: maps.map((m, i) => ({
        id: uid(`dashboard:${key}:item:${i}`),
        type: 'MAP',
        map: { id: m.id },
        x: (i % 2) * 30,
        y: Math.floor(i / 2) * 20,
        width: 30,
        height: 20,
    })),
})

module.exports = { boundaryLayer, dashboard, facilityLayer, map, thematicLayer }
