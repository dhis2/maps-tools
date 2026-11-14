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
                `${path} failed: ${JSON.stringify(summary.conflicts).slice(
                    0,
                    1000
                )}`
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

const TRACKER_IMPORT =
    '/api/tracker?async=false&importStrategy=CREATE_AND_UPDATE&atomicMode=OBJECT'
const TRACKER_DELETE = '/api/tracker?async=false&importStrategy=DELETE'
const TRACKER_CHUNK = 2000

const postTracker = async (client, path, payload) => {
    const result = await client.post(path, payload).catch((err) => {
        if (err.body?.validationReport) {
            return err.body
        }
        throw err
    })
    const errors = result.validationReport?.errorReports ?? []
    if (result.status === 'ERROR' || errors.length) {
        throw new Error(
            `${path} failed: ${errors
                .slice(0, 5)
                .map(({ message }) => message)
                .join('; ')}`
        )
    }
    return result.stats
}

const listIds = async (client, path, key) => {
    const body = await client.get(path)
    return (body[key] ?? body.instances ?? []).map(
        (item) => item[key.slice(0, -1)]
    )
}

// Tracked entities and events in the tool's programs that this run no
// longer generates, for example after dates moved forward
const deleteStaleTracker = async (client, tracker) => {
    const keepEntities = new Set(
        (tracker.trackedEntities ?? []).map((t) => t.trackedEntity)
    )
    const keepEvents = new Set((tracker.events ?? []).map((e) => e.event))
    let deleted = 0
    // Deleting a tracked entity deletes its events, so they go first
    for (const programId of tracker.registration ?? []) {
        const entities = await listIds(
            client,
            `/api/tracker/trackedEntities?program=${programId}&ouMode=ACCESSIBLE&fields=trackedEntity&paging=false`,
            'trackedEntities'
        )
        const stale = entities.filter((t) => !keepEntities.has(t))
        for (const chunk of chunks(stale, TRACKER_CHUNK)) {
            await postTracker(client, TRACKER_DELETE, {
                trackedEntities: chunk.map((t) => ({ trackedEntity: t })),
            })
        }
        deleted += stale.length
    }
    for (const programId of tracker.programs) {
        const events = await listIds(
            client,
            `/api/tracker/events?program=${programId}&ouMode=ACCESSIBLE&fields=event&paging=false`,
            'events'
        )
        const stale = events.filter((e) => !keepEvents.has(e))
        for (const chunk of chunks(stale, TRACKER_CHUNK)) {
            await postTracker(client, TRACKER_DELETE, {
                events: chunk.map((e) => ({ event: e })),
            })
        }
        deleted += stale.length
    }
    return deleted
}

// Tracked entities with their enrollments first, then events, then the
// relationships between them
const importTracker = async (client, tracker) => {
    const stats = { created: 0, updated: 0, deleted: 0, ignored: 0 }
    const add = (s = {}) =>
        Object.keys(stats).forEach((k) => {
            stats[k] += s[k] ?? 0
        })
    const steps = [
        ['trackedEntities', tracker.trackedEntities],
        ['enrollments', tracker.enrollments],
        ['events', tracker.events],
        ['relationships', tracker.relationships],
    ]
    for (const [key, items = []] of steps) {
        for (const chunk of chunks(items, TRACKER_CHUNK)) {
            add(await postTracker(client, TRACKER_IMPORT, { [key]: chunk }))
        }
    }
    return stats
}

const importData = async (client, data) => {
    const results = []
    for (const {
        post,
        dataSet,
        dataValues = [],
        dataValueSets = [{ dataSet, dataValues }],
        completeDataSetRegistrations = [],
        registrationWindow,
        tracker,
    } of data) {
        const result = { post }
        if (registrationWindow) {
            result.staleRegistrationsDeleted = await deleteStaleRegistrations(
                client,
                registrationWindow,
                completeDataSetRegistrations
            )
        }
        // One import per data set: the importer looks for a single data set
        // for the whole payload
        for (const set of dataValueSets.filter((s) => s.dataValues.length)) {
            const counts = await importChunks(
                client,
                '/api/dataValueSets?importStrategy=CREATE_AND_UPDATE',
                'dataValues',
                set.dataValues,
                set.dataSet ? { dataSet: set.dataSet } : {}
            )
            result.dataValues = sumCounts(
                result.dataValues || { imported: 0, updated: 0, ignored: 0 },
                counts
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
        if (tracker) {
            result.staleTrackerDeleted = await deleteStaleTracker(
                client,
                tracker
            )
            result.tracker = await importTracker(client, tracker)
        }
        console.log(`Post ${post}: ${JSON.stringify(result)}`)
        results.push(result)
    }
    return results
}

module.exports = { buildData, importData }
