const STEPS = ['metadata', 'data', 'analytics', 'content']

const parseArgs = (argv) => {
    const args = {}
    argv.forEach((arg) => {
        if (!arg.startsWith('--')) {
            return
        }
        const body = arg.slice(2)
        const eqIndex = body.indexOf('=')
        const key = eqIndex === -1 ? body : body.slice(0, eqIndex)
        args[key] = eqIndex === -1 ? true : body.slice(eqIndex + 1)
    })
    return args
}

const parseList = (value, all) =>
    !value || value === 'all' ? all : String(value).split(',')

const getConfig = (argv = process.argv.slice(2), availablePosts = []) => {
    const args = parseArgs(argv)

    const steps = parseList(args.steps, STEPS)
    const unknownSteps = steps.filter((step) => !STEPS.includes(step))
    if (unknownSteps.length) {
        throw new Error(
            `Unknown steps: ${unknownSteps.join(', ')}. Use ${STEPS.join(', ')}.`
        )
    }

    const posts = parseList(args.posts, availablePosts).map(Number)
    const unknownPosts = posts.filter((n) => !availablePosts.includes(n))
    if (unknownPosts.length) {
        throw new Error(
            `Unknown posts: ${unknownPosts.join(
                ', '
            )}. Available: ${availablePosts.join(', ')}.`
        )
    }

    return {
        baseUrl: (
            args.baseUrl ||
            process.env.DHIS2_BASE_URL ||
            'http://localhost:8080'
        ).replace(/\/$/, ''),
        username: args.username || process.env.DHIS2_USERNAME || 'admin',
        password: args.password || process.env.DHIS2_PASSWORD || 'district',
        posts,
        steps,
        // Periods are relative to this date; set it to reproduce an earlier run
        runDate: args.runDate ? new Date(args.runDate) : new Date(),
        dryRun: !!args.dryRun,
    }
}

module.exports = { getConfig, STEPS }
