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

module.exports = { buildMetadata, importMetadata }
