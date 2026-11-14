const path = require('node:path')
const { districtName, loadOrgUnits } = require('./shared/orgUnits.js')

const OUTPUT_DIR = path.join(__dirname, 'output')

const POSTS = [
    require('./posts/01-immunization.js'),
    require('./posts/03-cholera.js'),
    require('./posts/05-maternal.js'),
    require('./posts/06-ntd.js'),
    require('./posts/08-supply-chain.js'),
    require('./posts/10-data-quality.js'),
    require('./posts/11-nutrition.js'),
]

const POST_NUMBERS = POSTS.map(({ number }) => number)

// Reads what the posts need from the server (reads only) and prepares each
// selected post
const loadContext = async (client, config) => {
    const orgUnits = await loadOrgUnits(client, config.runDate)
    const me = await client.get('/api/me?fields=id')
    const ctx = {
        client,
        importerId: me.id,
        runDate: config.runDate,
        orgUnits,
        districtName: (id) => districtName(orgUnits, id),
    }
    const posts = POSTS.filter(({ number }) => config.posts.includes(number))
    const states = new Map()
    for (const post of posts) {
        states.set(post, await post.prepare(ctx))
    }
    return { ctx, posts, states }
}

module.exports = { OUTPUT_DIR, POST_NUMBERS, loadContext }
