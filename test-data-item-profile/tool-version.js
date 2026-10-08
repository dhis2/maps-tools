// A label for the tool's code as it runs: folder, commit, and whether the
// folder has local changes. Written into the report and the fixtures.
const { execSync } = require('node:child_process')

const NAME = 'maps-tools/test-data-item-profile'

const git = (command) =>
    execSync(command, {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'ignore'],
    })
        .toString()
        .trim()

const toolVersion = () => {
    try {
        const sha = git('git rev-parse --short HEAD')
        const changed = git('git status --porcelain -- .')
        return `${NAME} (${sha}${changed ? ', with local changes' : ''})`
    } catch {
        return `${NAME} (no git)`
    }
}

module.exports = { toolVersion }
