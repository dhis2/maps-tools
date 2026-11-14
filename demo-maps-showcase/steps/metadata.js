const { usersMetadata } = require('../shared/users.js')

// Joins the metadata of the shared setup and every post into one payload,
// type by type
const mergeMetadata = (parts) => {
    const merged = {}
    parts.forEach((part) =>
        Object.entries(part).forEach(([type, objects]) => {
            merged[type] = [...(merged[type] || []), ...objects]
        })
    )
    return merged
}

const buildMetadata = ({ ctx, posts, states }, passwords) =>
    mergeMetadata([
        usersMetadata(passwords),
        ...posts.map((post) => post.metadata(ctx, states.get(post))),
    ])

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
    applySystemSettings,
    buildMetadata,
    buildOrgUnitAttributeValues,
    buildSystemSettings,
    importMetadata,
}
