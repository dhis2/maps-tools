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

// features: [{ id, geometry }]. Returns { [id]: value of the "sum" band }.
const sumInFeatures = async ({ token, image, features, scale }) => {
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
                reducer: fn('Reducer.sum', {}),
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
            properties.sum,
        ])
    )
}

module.exports = {
    clipToFeatures,
    getToken,
    sumBands,
    sumInFeatures,
    yearImage,
}
