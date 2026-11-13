const { createClient } = require('../client.js')
const { teamId, username } = require('../shared/users.js')

const buildContent = ({ ctx, posts, states }) =>
    posts.map((post) => ({
        post: post.number,
        ...post.content(ctx, states.get(post)),
    }))

const exists = (client, path) =>
    client.get(`${path}?fields=id`).then(
        () => true,
        (err) => {
            if (err.status === 404) {
                return false
            }
            throw err
        }
    )

const save = async (client, type, object) => {
    if (await exists(client, `/api/${type}/${object.id}`)) {
        await client.put(`/api/${type}/${object.id}`, object)
    } else {
        await client.post(`/api/${type}`, object)
    }
}

// Every demo user can read; the post's teams can also edit. Nothing is public
// to users outside the showcase.
const share = (client, type, id, teams) =>
    client.post(`/api/sharing?type=${type}&id=${id}`, {
        object: {
            publicAccess: '--------',
            externalAccess: false,
            userAccesses: [],
            userGroupAccesses: [
                { id: teamId('all'), access: 'r-------' },
                ...teams.map((team) => ({
                    id: teamId(team),
                    access: 'rw------',
                })),
            ],
        },
    })

// Interpretations have server ids, so re-runs delete the ones the demo users
// wrote on the map before writing them again
const replaceInterpretations = async (
    client,
    userClient,
    mapId,
    interpretations
) => {
    const { interpretations: existing = [] } = await client.get(
        `/api/interpretations?filter=map.id:eq:${mapId}&fields=id,createdBy[username]&paging=false`
    )
    for (const { id, createdBy } of existing) {
        if (createdBy?.username?.startsWith('show_')) {
            await client.delete(`/api/interpretations/${id}`)
        }
    }
    for (const { author, text, comments = [] } of interpretations) {
        const authorClient = userClient(author)
        await authorClient.postText(`/api/interpretations/map/${mapId}`, text)
        const { interpretations: created } = await client.get(
            `/api/interpretations?filter=map.id:eq:${mapId}&filter=createdBy.username:eq:${username(
                author
            )}&fields=id,created&order=created:desc&pageSize=1`
        )
        for (const comment of comments) {
            await userClient(comment.author).postText(
                `/api/interpretations/${created[0].id}/comments`,
                comment.text
            )
        }
    }
}

const saveContent = async (client, config, passwords, content) => {
    const userClient = (key) =>
        createClient({
            baseUrl: config.baseUrl,
            username: username(key),
            password: passwords[username(key)],
        })
    const links = []
    for (const { post, maps, dashboards, interpretations } of content) {
        for (const { map, teams } of maps) {
            await save(client, 'maps', map)
            await share(client, 'map', map.id, teams)
            links.push({
                post,
                name: map.name,
                url: `${config.baseUrl}/dhis-web-maps/index.html#/${map.id}`,
            })
        }
        const teams = [...new Set(maps.flatMap((m) => m.teams))]
        for (const dashboard of dashboards) {
            await save(client, 'dashboards', dashboard)
            await share(client, 'dashboard', dashboard.id, teams)
            links.push({
                post,
                name: dashboard.name,
                url: `${config.baseUrl}/dhis-web-dashboard/#/${dashboard.id}`,
            })
        }
        const mapIds = [...new Set(interpretations.map(({ map }) => map))]
        for (const mapId of mapIds) {
            await replaceInterpretations(
                client,
                userClient,
                mapId,
                interpretations.filter(({ map }) => map === mapId)
            )
        }
    }
    return links
}

module.exports = { buildContent, saveContent }
