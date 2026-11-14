// Checks through analytics that each post's planted patterns are on the
// map (reads only)
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('./client.js')
const { getConfig } = require('./config.js')
const { OUTPUT_DIR, POST_NUMBERS, loadContext } = require('./context.js')

const main = async () => {
    const config = getConfig(process.argv.slice(2), POST_NUMBERS)
    const client = createClient(config)
    const { ctx, posts, states } = await loadContext(client, config)

    const results = []
    for (const post of posts) {
        for (const check of post.checks(ctx, states.get(post))) {
            const body = await client.get(check.path)
            const { ok, detail } = check.evaluate(body.rows ?? [], body)
            results.push({ post: post.number, check: check.name, ok, detail })
            console.log(
                `${ok ? 'OK  ' : 'FAIL'} Post ${post.number}: ${
                    check.name
                }. ${detail}`
            )
        }
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'verify-report.json'),
        JSON.stringify(
            {
                baseUrl: config.baseUrl,
                ranAt: new Date().toISOString(),
                results,
            },
            null,
            4
        )
    )
    if (results.some(({ ok }) => !ok)) {
        process.exitCode = 1
    }
}

main().catch((err) => {
    console.error(err.message)
    process.exitCode = 1
})
