// Builds maps in the format maps-app saves (validLayerProperties in maps-app's
// src/util/favorites.js). mapViews go bottom layer first.
const { DISTRICTS } = require('./sierraLeone.js')
const { DEMO_LABEL, DEMO_NOTICE, code, uid } = require('./ids.js')
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

const labelProps = (labels, color = '#333333') =>
    labels
        ? {
              labels: true,
              labelTemplate: labels,
              labelFontSize: '11px',
              labelFontColor: color,
              labelFontStyle: 'normal',
              labelFontWeight: 'normal',
          }
        : {}

const orgUnitDimension = (orgUnits, level) =>
    orgUnits
        ? [
              dimension(
                  'ou',
                  orgUnits.map((id) => ({ id }))
              ),
          ]
        : orgUnitRows(level)

// A legend set, or equal-count classes over colorScale for counts
const classification = (legendSet, colorScale, color) => {
    if (legendSet) {
        return { method: 1, legendSet: { id: legendSet } }
    }
    // Counts as bubbles in one colour: the legend shows sizes and values. A
    // legend set on bubbles drops values outside its classes, and its legend
    // shows sizes without the class colours.
    if (color) {
        return { method: 10, colorScale: color }
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
    color,
    bubble = false,
    renderingStrategy = 'SINGLE',
    labels,
    hidden = false,
    opacity = 0.9,
    // Points are sized by value on choropleths too, so these keep one size
    radiusLow = 5,
    radiusHigh = bubble ? 20 : radiusLow,
    // Instead of a level: org unit ids, LEVEL- or OU_GROUP- items
    orgUnits,
    // Without it, org units without data are left out of the map and legend
    noDataColor,
    labelColor,
}) => ({
    layer: 'thematic',
    name,
    columns: [dimension('dx', [dataItem])],
    rows: orgUnitDimension(orgUnits, level),
    filters: [
        dimension(
            'pe',
            periods.map((id) => ({ id }))
        ),
    ],
    ...classification(legendSet, colorScale, color),
    thematicMapType: bubble ? 'BUBBLE' : 'CHOROPLETH',
    radiusLow,
    radiusHigh,
    renderingStrategy,
    ...(noDataColor ? { noDataColor } : {}),
    opacity,
    hidden,
    ...labelProps(labels, labelColor),
})

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]

// The period of a monthly Earth Engine layer, as maps-app saves it
const eeMonth = (year, month) => {
    const end = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const mm = String(month).padStart(2, '0')
    return {
        id: `${year}${mm}`,
        startDate: `${year}-${mm}-01T00:00:00.000Z`,
        endDate: `${year}-${mm}-${end}T23:59:59.000Z`,
        year,
        name: `${MONTH_NAMES[month - 1]} ${year}`,
    }
}

// An Earth Engine layer, aggregated to the org units of a level. The dataset,
// bands and style follow maps-app's src/constants/earthEngineLayers; without
// a style, maps-app uses the dataset's own.
const earthEngineLayer = ({
    name,
    datasetId,
    bands,
    year,
    period,
    style,
    aggregations = ['sum'],
    level,
    orgUnits,
    opacity = 0.9,
    hidden = false,
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
        ...(period ? { period } : {}),
    }),
    opacity,
    hidden,
})

// Every open facility, without Post 7's schools at the same level. The
// demo's Facility Type groups miss a few facilities with coordinates.
const HEALTH_FACILITIES_GROUP = uid('orgUnitGroup:HEALTH_FACILITIES')

const healthFacilitiesGroup = (facilities) => ({
    id: HEALTH_FACILITIES_GROUP,
    code: code('OU_GROUP_HEALTH_FACILITIES'),
    name: 'Health facilities',
    shortName: 'Health facilities',
    organisationUnits: facilities.map(({ id }) => ({ id })),
    sharing: { public: 'r-------', external: false },
})

// districts: ids of the districts to show, all by default
const facilityLayer = ({
    name,
    groupSet,
    districts = Object.values(DISTRICTS),
    hidden = false,
}) => ({
    layer: 'facility',
    name,
    rows: [
        dimension('ou', [
            ...districts.map((id) => ({ id })),
            { id: `OU_GROUP-${HEALTH_FACILITIES_GROUP}` },
        ]),
    ],
    ...(groupSet ? { organisationUnitGroupSet: { id: groupSet } } : {}),
    opacity: 1,
    hidden,
})

// groupSet: colours each org unit by its group in the set
const boundaryLayer = ({
    name,
    level,
    orgUnits,
    color = '#333333',
    labels,
    labelColor = color,
    groupSet,
}) => ({
    layer: 'orgUnit',
    name,
    rows: orgUnitDimension(orgUnits, level),
    ...(groupSet ? { organisationUnitGroupSet: { id: groupSet } } : {}),
    organisationUnitColor: color,
    opacity: 1,
    hidden: false,
    ...labelProps(labels, labelColor),
})

// filters: [{ dataElement, filter }], for example 'IN:POSITIVE'. With
// clustering and a styleDataItem, groups show as donuts of the style colours.
// legendSet: for a styleDataItem of a number data element.
const eventLayer = ({
    name,
    programId,
    stageId,
    periods,
    orgUnits = Object.values(DISTRICTS),
    filters = [],
    styleDataItem,
    legendSet,
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
    ...(legendSet ? { method: 1, legendSet: { id: legendSet } } : {}),
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
    orgUnits = Object.values(DISTRICTS),
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
            orgUnits.map((id) => ({ id }))
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

// Post numbers with a leading zero, so names sort in post order
const postNumber = (post) => String(post).padStart(2, '0')

// maps-app opens a map fitted to its layers; the saved centre and zoom only
// apply to a map without layers. basemap: an id of maps-app's
// src/constants/basemaps.js
const map = ({ key, post, title, description, layers, basemap = BASEMAP }) => ({
    id: uid(`map:${key}`),
    code: code(`MAP_${key.toUpperCase()}`),
    name: `Post ${postNumber(post)} · ${title} · ${DEMO_LABEL}`,
    description: `${DEMO_NOTICE} ${description}`,
    basemap,
    basemaps: [{ id: basemap, opacity: 1, hidden: false }],
    ...DEFAULT_VIEW,
    // No ids: a PUT that keeps them fails, as the server inserts the new
    // views before deleting the old ones
    mapViews: layers,
})

const NOTICE_HEIGHT = 3

// The notice comes first, over the full width; maps follow two per row
const dashboard = ({ key, post, title, maps }) => ({
    id: uid(`dashboard:${key}`),
    code: code(`DASHBOARD_${key.toUpperCase()}`),
    name: `Showcase ${postNumber(post)} · ${title} · ${DEMO_LABEL}`,
    dashboardItems: [
        {
            id: uid(`dashboard:${key}:notice`),
            type: 'TEXT',
            text: `**${DEMO_NOTICE}**`,
            x: 0,
            y: 0,
            width: 60,
            height: NOTICE_HEIGHT,
        },
        ...maps.map((m, i) => ({
            id: uid(`dashboard:${key}:item:${i}`),
            type: 'MAP',
            map: { id: m.id },
            x: (i % 2) * 30,
            y: NOTICE_HEIGHT + Math.floor(i / 2) * 20,
            width: 30,
            height: 20,
        })),
    ],
})

module.exports = {
    boundaryLayer,
    dashboard,
    earthEngineLayer,
    eeMonth,
    eventLayer,
    facilityLayer,
    healthFacilitiesGroup,
    map,
    thematicLayer,
    trackedEntityLayer,
}
