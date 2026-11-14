// Builds maps in the format maps-app saves (validLayerProperties in maps-app's
// src/util/favorites.js). mapViews go bottom layer first.
const { DISTRICTS } = require('./sierraLeone.js')
const { SYNTHETIC_LABEL, code, uid } = require('./ids.js')
const { CLASS_SCALES } = require('./palette.js')

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
const classification = (legendSet, colorScale) => {
    if (legendSet) {
        return { method: 1, legendSet: { id: legendSet } }
    }
    if (!Object.values(CLASS_SCALES).includes(colorScale)) {
        throw new Error(
            `Color scale ${colorScale} is not in CLASS_SCALES (shared/palette.js)`
        )
    }
    return {
        method: 3,
        classes: colorScale.split(',').length,
        colorScale,
    }
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
    // Points are sized by value on choropleths too, so these keep one size
    radiusLow = 5,
    radiusHigh = bubble ? 20 : radiusLow,
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
    radiusLow,
    radiusHigh,
    renderingStrategy,
    noDataColor: '#BDBDBD',
    opacity,
    hidden,
    ...labelProps(labels),
})

// A yearly Earth Engine layer, aggregated to the org units of a level. The
// dataset, bands and style follow maps-app's src/constants/earthEngineLayers.
const earthEngineLayer = ({
    name,
    datasetId,
    bands,
    year,
    style,
    aggregations = ['sum'],
    level,
    orgUnits,
    opacity = 0.9,
}) => ({
    layer: 'earthEngine',
    name,
    rows: orgUnits
        ? [
              dimension(
                  'ou',
                  orgUnits.map((id) => ({ id }))
              ),
          ]
        : orgUnitRows(level),
    config: JSON.stringify({
        id: datasetId,
        style,
        band: bands,
        aggregationType: aggregations,
        ...(year
            ? {
                  period: {
                      id: String(year),
                      startDate: `${year}-01-01T00:00:00.000Z`,
                      endDate: `${year}-12-31T23:59:59.000Z`,
                      year,
                      name: String(year),
                  },
              }
            : {}),
    }),
    opacity,
    hidden: false,
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

// filters: [{ dataElement, filter }], for example 'IN:POSITIVE'
const eventLayer = ({
    name,
    programId,
    stageId,
    periods,
    orgUnits = Object.values(DISTRICTS),
    filters = [],
    styleDataItem,
    color = '#333333',
    radius = 6,
    areaRadius,
    clustering = false,
    hidden = false,
}) => ({
    layer: 'event',
    name,
    program: { id: programId },
    programStage: { id: stageId },
    columns: filters.map(({ dataElement, filter }) => ({
        dimension: dataElement,
        filter,
    })),
    rows: [
        dimension(
            'ou',
            orgUnits.map((id) => ({ id }))
        ),
    ],
    filters: [
        dimension(
            'pe',
            periods.map((id) => ({ id }))
        ),
    ],
    eventClustering: clustering,
    eventPointColor: color,
    eventPointRadius: radius,
    ...(areaRadius ? { areaRadius } : {}),
    ...(styleDataItem ? { styleDataItem } : {}),
    opacity: 0.9,
    hidden,
})

// Tracked entities enrolled from 2020 to 2030: the layer only takes fixed
// dates, and the tool removes records a re-run no longer generates
const trackedEntityLayer = ({
    name,
    programId,
    programStatus,
    color,
    radius = 5,
    relationship,
    hidden = false,
}) => ({
    layer: 'trackedEntity',
    name,
    program: { id: programId },
    trackedEntityType: { id: 'nEenWmSyUEp' },
    programStatus,
    rows: [
        dimension(
            'ou',
            Object.values(DISTRICTS).map((id) => ({ id }))
        ),
    ],
    organisationUnitSelectionMode: 'DESCENDANTS',
    startDate: '2020-01-01',
    endDate: '2030-12-31',
    eventPointColor: color,
    eventPointRadius: radius,
    config: JSON.stringify({
        periodType: 'program',
        relationships: relationship
            ? {
                  type: relationship.typeId,
                  pointColor: relationship.pointColor,
                  pointRadius: relationship.pointRadius ?? radius,
                  lineColor: relationship.lineColor,
              }
            : null,
    }),
    opacity: 1,
    hidden,
})

const DEFAULT_VIEW = { latitude: 8.5, longitude: -11.8, zoom: 7 }

const map = ({
    key,
    post,
    title,
    description,
    layers,
    view = DEFAULT_VIEW,
}) => ({
    id: uid(`map:${key}`),
    code: code(`MAP_${key.toUpperCase()}`),
    name: `Post ${post} · ${title} (${SYNTHETIC_LABEL})`,
    description: `${description} ${SYNTHETIC_LABEL}, DHIS2 demo.`,
    basemap: BASEMAP,
    basemaps: [{ id: BASEMAP, opacity: 1, hidden: false }],
    ...view,
    // No ids: a PUT that keeps them fails, as the server inserts the new
    // views before deleting the old ones
    mapViews: layers,
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

module.exports = {
    boundaryLayer,
    dashboard,
    earthEngineLayer,
    eventLayer,
    facilityLayer,
    map,
    thematicLayer,
    trackedEntityLayer,
}
