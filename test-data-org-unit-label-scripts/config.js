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

const getConfig = (argv = process.argv.slice(2)) => {
    const args = parseArgs(argv)

    return {
        baseUrl: (
            args.baseUrl ||
            process.env.DHIS2_BASE_URL ||
            'http://localhost:8080'
        ).replace(/\/$/, ''),
        username: args.username || process.env.DHIS2_USERNAME || 'admin',
        password: args.password || process.env.DHIS2_PASSWORD || 'district',
        // Sierra Leone, the root of the demo database
        parentId: args.parentId || 'ImspTQPwCqd',
        dryRun: !!args.dryRun,
    }
}

module.exports = { getConfig }
