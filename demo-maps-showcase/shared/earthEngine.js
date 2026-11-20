// Computes zonal statistics with the Earth Engine REST API, using the access
// token the DHIS2 instance hands to maps-app (/api/tokens/google)
const EE_URL =
    'https://earthengine.googleapis.com/v1/projects/earthengine-legacy/value:compute'

const fn = (functionName, args) => ({
    functionInvocationValue: { functionName, arguments: args },
})
const constant = (value) => ({ constantValue: value })

const geometry = ({ type, coordinates }) =>
    fn(`GeometryConstructors.${type}`, { coordinates: constant(coordinates) })

// The image of one year of a yearly collection (WorldPop), with some bands
const yearImage = (collectionId, year, bands) =>
    fn('Image.select', {
        input: fn('ImageCollection.mosaic', {
            collection: fn('Collection.filter', {
                collection: fn('ImageCollection.load', {
                    id: constant(collectionId),
                }),
                filter: fn('Filter.equals', {
                    leftField: constant('year'),
                    rightValue: constant(year),
                }),
            }),
        }),
        bandSelectors: constant(bands),
    })

// The image with pixels outside the features masked
const clipToFeatures = (image, features) =>
    fn('Image.clipToCollection', {
        input: image,
        collection: fn('Collection', {
            features: {
                arrayValue: {
                    values: features.map(({ id, geometry: geom }) =>
                        fn('Feature', {
                            geometry: geometry(geom),
                            metadata: constant({ id }),
                        })
                    ),
                },
            },
        }),
    })

// Adds up the bands into one band named "sum"
const sumBands = (image) =>
    fn('Image.rename', {
        input: fn('Image.reduce', {
            image,
            reducer: fn('Reducer.sum', {}),
        }),
        names: constant(['sum']),
    })

const getToken = async (client) => {
    const { access_token: token } = await client.get('/api/tokens/google')
    return token
}

const dateRange = (start, end) =>
    fn('DateRange', { start: constant(start), end: constant(end) })

const filterDates = (collection, start, end) =>
    fn('Collection.filter', {
        collection,
        filter: fn('Filter.dateRangeContains', {
            leftValue: dateRange(start, end),
            rightField: constant('system:time_start'),
        }),
    })

const reduceCollection = (collection, reducer) =>
    fn('ImageCollection.reduce', {
        collection,
        reducer: fn(`Reducer.${reducer}`, {}),
    })

const pad = (n) => String(n).padStart(2, '0')
const monthStart = (year, month) => `${year}-${pad(month)}-01`
const nextMonthStart = (year, month) =>
    month === 12 ? monthStart(year + 1, 1) : monthStart(year, month + 1)

// CHIRPS rainfall summed over one month, in mm
const chirpsMonth = (year, month) =>
    reduceCollection(
        filterDates(
            fn('ImageCollection.load', {
                id: constant('UCSB-CHG/CHIRPS/DAILY'),
            }),
            monthStart(year, month),
            nextMonthStart(year, month)
        ),
        'sum'
    )

// CHIRPS rainfall of one calendar month, averaged over the years, in mm
// From 5-day sums (pentads): 30 years of daily images exceed Earth Engine's
// memory for one request
const chirpsNormal = (month, fromYear, toYear) =>
    fn('Image.divide', {
        image1: reduceCollection(
            fn('Collection.filter', {
                collection: filterDates(
                    fn('ImageCollection.load', {
                        id: constant('UCSB-CHG/CHIRPS/PENTAD'),
                    }),
                    `${fromYear}-01-01`,
                    `${toYear + 1}-01-01`
                ),
                filter: fn('Filter.calendarRange', {
                    start: constant(month),
                    end: constant(month),
                    field: constant('month'),
                }),
            }),
            'sum'
        ),
        image2: fn('Image.constant', {
            value: constant(toYear - fromYear + 1),
        }),
    })

// ERA5-Land mean 2 m air temperature of one month, in °C
const era5Temperature = (year, month) =>
    fn('Image.subtract', {
        image1: fn('Image.select', {
            input: reduceCollection(
                filterDates(
                    fn('ImageCollection.load', {
                        id: constant('ECMWF/ERA5_LAND/MONTHLY_AGGR'),
                    }),
                    monthStart(year, month),
                    nextMonthStart(year, month)
                ),
                'mean'
            ),
            bandSelectors: constant(['temperature_2m_mean']),
        }),
        image2: fn('Image.constant', { value: constant(273.15) }),
    })

// features: [{ id, geometry }]. Returns { [id]: value of the "sum" band }.
const sumInFeatures = (options) =>
    reduceInFeatures({ ...options, reducer: 'sum' })

// The mean of a one-band image over each feature
const meanInFeatures = (options) =>
    reduceInFeatures({ ...options, reducer: 'mean' })

const reduceInFeatures = async ({ token, image, features, scale, reducer }) => {
    const collection = fn('Collection', {
        features: {
            arrayValue: {
                values: features.map(({ id, geometry: geom }) =>
                    fn('Feature', {
                        geometry: geometry(geom),
                        metadata: constant({ id }),
                    })
                ),
            },
        },
    })
    const expression = {
        result: '0',
        values: {
            0: fn('Image.reduceRegions', {
                image,
                collection,
                reducer: fn(`Reducer.${reducer}`, {}),
                scale: constant(scale),
            }),
        },
    }
    const res = await fetch(EE_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression }),
    })
    const body = await res.json()
    if (!res.ok) {
        throw new Error(
            `Earth Engine failed with status ${res.status}: ${JSON.stringify(
                body
            ).slice(0, 500)}`
        )
    }
    return Object.fromEntries(
        body.result.features.map(({ properties }) => [
            properties.id,
            properties[reducer],
        ])
    )
}

module.exports = {
    chirpsMonth,
    chirpsNormal,
    clipToFeatures,
    era5Temperature,
    getToken,
    meanInFeatures,
    sumBands,
    sumInFeatures,
    yearImage,
}
