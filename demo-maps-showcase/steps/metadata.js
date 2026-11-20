const { healthFacilitiesGroup } = require('../shared/maps.js')
const { usersMetadata } = require('../shared/users.js')

// Joins the metadata of the shared setup and every post into one payload,
// type by type. Objects shared by several posts are sent once.
const mergeMetadata = (parts) => {
    const merged = {}
    parts.forEach((part) =>
        Object.entries(part).forEach(([type, objects]) => {
            const known = new Set((merged[type] || []).map(({ id }) => id))
            merged[type] = [
                ...(merged[type] || []),
                ...objects.filter(({ id }) => !known.has(id)),
            ]
        })
    )
    return merged
}

const buildMetadata = ({ ctx, posts, states }, passwords) =>
    mergeMetadata([
        usersMetadata(passwords),
        {
            organisationUnitGroups: [
                healthFacilitiesGroup(ctx.orgUnits.facilities),
            ],
        },
        ...posts.map((post) => post.metadata(ctx, states.get(post))),
    ])

// The org unit profile maps-app opens on a click is one per instance: the
// posts' items are added to the ones already set
const PROFILE_KEYS = ['attributes', 'groupSets', 'dataItems']

const buildOrgUnitProfile = ({ posts }) => {
    const profile = Object.fromEntries(PROFILE_KEYS.map((key) => [key, []]))
    posts.forEach(({ orgUnitProfile = {} }) =>
        PROFILE_KEYS.forEach((key) =>
            profile[key].push(...(orgUnitProfile[key] ?? []))
        )
    )
    return profile
}

const applyOrgUnitProfile = async (client, items) => {
    const current = await client.get('/api/organisationUnitProfile')
    const merged = Object.fromEntries(
        PROFILE_KEYS.map((key) => [
            key,
            [...new Set([...(current[key] ?? []), ...items[key]])],
        ])
    )
    await client.post('/api/organisationUnitProfile', merged)
    return merged
}

const errorMessages = (report) =>
    (report.typeReports || []).flatMap(({ objectReports = [] }) =>
        objectReports.flatMap(({ errorReports = [] }) =>
            errorReports.map(({ message }) => message)
        )
    )

// The tool owns every object it sends, so CREATE_AND_UPDATE replacing their
// collections is what we want
const importMetadata = async (client, metadata) => {
    const report = await client
        .post(
            '/api/metadata?importStrategy=CREATE_AND_UPDATE&atomicMode=ALL',
            metadata
        )
        .catch((err) => {
            if (err.body?.response) {
                return err.body.response
            }
            throw err
        })
    const body = report.response || report
    if (body.status === 'ERROR') {
        throw new Error(
            `Metadata import failed: ${errorMessages(body).join('; ')}`
        )
    }
    return body.stats
}

// Instance settings some posts depend on, as { key: value }
const buildSystemSettings = ({ posts }) =>
    Object.assign({}, ...posts.map((post) => post.systemSettings || {}))

const applySystemSettings = async (client, settings) => {
    for (const [key, value] of Object.entries(settings)) {
        await client.post(
            `/api/systemSettings/${key}?value=${encodeURIComponent(value)}`
        )
    }
}

// Attribute values the posts set on existing org units, as
// [{ orgUnit, attribute, value }]
const buildOrgUnitAttributeValues = ({ ctx, posts, states }) =>
    posts.flatMap((post) =>
        post.orgUnitAttributeValues
            ? post.orgUnitAttributeValues(ctx, states.get(post))
            : []
    )

// Org units belong to the database, so only the tool's attribute values are
// changed and the others kept; a metadata import would replace them all
const applyOrgUnitAttributeValues = async (client, values) => {
    for (const { orgUnit, attribute, value } of values) {
        const { attributeValues = [] } = await client.get(
            `/api/organisationUnits/${orgUnit}?fields=attributeValues[value,attribute[id]]`
        )
        const others = attributeValues.filter(
            (av) => av.attribute.id !== attribute
        )
        await client.patch(`/api/organisationUnits/${orgUnit}`, [
            {
                op: 'add',
                path: '/attributeValues',
                value: [...others, { attribute: { id: attribute }, value }],
            },
        ])
    }
    return values.length
}

module.exports = {
    applyOrgUnitAttributeValues,
    applyOrgUnitProfile,
    applySystemSettings,
    buildMetadata,
    buildOrgUnitAttributeValues,
    buildOrgUnitProfile,
    buildSystemSettings,
    importMetadata,
}
