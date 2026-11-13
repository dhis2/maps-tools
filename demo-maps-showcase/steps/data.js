const CHUNK = 20000

const chunks = (items, size) =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
        items.slice(i * size, (i + 1) * size)
    )

const buildData = ({ ctx, posts, states }) =>
    posts.map((post) => ({
        post: post.number,
        ...post.data(ctx, states.get(post)),
    }))

const sumCounts = (total, { imported = 0, updated = 0, ignored = 0 }) => ({
    imported: total.imported + imported,
    updated: total.updated + updated,
    ignored: total.ignored + ignored,
})

const importChunks = async (client, path, key, items, header = {}) => {
    let total = { imported: 0, updated: 0, ignored: 0 }
    for (const chunk of chunks(items, CHUNK)) {
        const result = await client.post(path, { ...header, [key]: chunk })
        const summary = result.response || result
        if (summary.status === 'ERROR') {
            throw new Error(
                `${path} failed: ${JSON.stringify(summary.conflicts).slice(0, 1000)}`
            )
        }
        total = sumCounts(total, summary.importCount || {})
    }
    return total
}

const registrationKey = ({ period, organisationUnit, attributeOptionCombo }) =>
    `${period}:${organisationUnit}:${attributeOptionCombo}`

// Registrations of the tool's own data set that this run no longer
// generates. The multi-org-unit DELETE endpoint answers 500 on 2.43.2, so
// they go back through the import with importStrategy=DELETE.
const deleteStaleRegistrations = async (
    client,
    { dataSet, orgUnit, startDate, endDate },
    registrations
) => {
    const { completeDataSetRegistrations: existing = [] } = await client.get(
        `/api/completeDataSetRegistrations?dataSet=${dataSet}&orgUnit=${orgUnit}&children=true&startDate=${startDate}&endDate=${endDate}`
    )
    const keep = new Set(registrations.map(registrationKey))
    const stale = existing.filter((r) => !keep.has(registrationKey(r)))
    if (!stale.length) {
        return 0
    }
    let deleted = 0
    for (const chunk of chunks(stale, CHUNK)) {
        const result = await client.post(
            '/api/completeDataSetRegistrations?importStrategy=DELETE',
            { completeDataSetRegistrations: chunk }
        )
        deleted += (result.response || result).importCount?.deleted ?? 0
    }
    return deleted
}

const importData = async (client, data) => {
    const results = []
    for (const {
        post,
        dataSet,
        dataValues = [],
        completeDataSetRegistrations = [],
        registrationWindow,
    } of data) {
        const result = { post }
        if (registrationWindow) {
            result.staleRegistrationsDeleted = await deleteStaleRegistrations(
                client,
                registrationWindow,
                completeDataSetRegistrations
            )
        }
        if (dataValues.length) {
            result.dataValues = await importChunks(
                client,
                '/api/dataValueSets?importStrategy=CREATE_AND_UPDATE',
                'dataValues',
                dataValues,
                dataSet ? { dataSet } : {}
            )
        }
        if (completeDataSetRegistrations.length) {
            result.completeDataSetRegistrations = await importChunks(
                client,
                '/api/completeDataSetRegistrations?importStrategy=CREATE_AND_UPDATE',
                'completeDataSetRegistrations',
                completeDataSetRegistrations
            )
        }
        console.log(`Post ${post}: ${JSON.stringify(result)}`)
        results.push(result)
    }
    return results
}

module.exports = { buildData, importData }
