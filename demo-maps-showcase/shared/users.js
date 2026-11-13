const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { PUBLIC_READ, code, uid } = require('./ids.js')
const { ROOT } = require('./sierraLeone.js')

// Roles of the Sierra Leone demo database
const ROLE_M_AND_E_OFFICER = 'jRWSNIHdKww'
const ROLE_GUEST = 'XS0dNzuZmfH'

const TEAMS = {
    all: 'Showcase: all demo users',
    epi: 'Showcase: EPI team',
    surveillance: 'Showcase: outbreak response team',
    maternal: 'Showcase: reproductive health team',
    ntd: 'Showcase: NTD team',
    education: 'Showcase: education team',
    supply: 'Showcase: logistics team',
    oneHealth: 'Showcase: One Health committee',
    hmis: 'Showcase: HMIS team',
    nutrition: 'Showcase: nutrition cluster',
    agriculture: 'Showcase: food security team',
}

// One user per persona in the posts. Facility in-charges are mentioned in
// the interpretations of several posts, so they get a user too.
const PERSONAS = [
    { key: 'epi_officer', title: 'District EPI officer', teams: ['epi'] },
    {
        key: 'surveillance_lead',
        title: 'Surveillance lead',
        teams: ['surveillance', 'oneHealth'],
    },
    {
        key: 'tracing_supervisor',
        title: 'Contact tracing supervisor',
        teams: ['surveillance'],
    },
    {
        key: 'rh_planner',
        title: 'Reproductive health planner',
        teams: ['maternal'],
    },
    { key: 'ntd_manager', title: 'NTD programme manager', teams: ['ntd'] },
    {
        key: 'education_director',
        title: 'Regional director of education',
        teams: ['education'],
    },
    {
        key: 'district_pharmacist',
        title: 'District pharmacist',
        teams: ['supply'],
    },
    {
        key: 'veterinary_officer',
        title: 'Veterinary officer',
        teams: ['oneHealth'],
    },
    { key: 'hmis_officer', title: 'HMIS officer', teams: ['hmis'] },
    {
        key: 'nutrition_coordinator',
        title: 'Nutrition cluster coordinator',
        teams: ['nutrition'],
    },
    {
        key: 'agriculture_planner',
        title: 'Agriculture planner',
        teams: ['agriculture'],
    },
    {
        key: 'facility_incharge',
        title: 'Facility in-charge',
        teams: ['epi', 'supply', 'hmis'],
    },
    { key: 'guest', title: 'Guest', teams: [], guest: true },
]

const username = (key) => `show_${key}`
const userId = (key) => uid(`user:${key}`)
const teamId = (team) => uid(`userGroup:${team}`)

// Meets the default password policy: 8+ characters, upper and lower case,
// a digit and a special character
const newPassword = () =>
    `Show-${crypto.randomBytes(9).toString('base64url')}7a!`

// Passwords are kept in output/users.json and reused, so re-runs don't
// change them
const loadPasswords = (outputDir) => {
    const file = path.join(outputDir, 'users.json')
    const saved = fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, 'utf8'))
        : {}
    return Object.fromEntries(
        PERSONAS.map(({ key }) => [
            username(key),
            saved[username(key)] || newPassword(),
        ])
    )
}

const savePasswords = (outputDir, baseUrl, passwords) => {
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(
        path.join(outputDir, 'users.json'),
        JSON.stringify({ ...passwords, baseUrl }, null, 4)
    )
}

const usersMetadata = (passwords) => ({
    users: PERSONAS.map((persona) => ({
        id: userId(persona.key),
        code: code(`USER_${persona.key.toUpperCase()}`),
        username: username(persona.key),
        password: passwords[username(persona.key)],
        firstName: persona.title,
        surname: '(demo)',
        userRoles: [{ id: persona.guest ? ROLE_GUEST : ROLE_M_AND_E_OFFICER }],
        organisationUnits: [{ id: ROOT }],
        dataViewOrganisationUnits: [{ id: ROOT }],
        teiSearchOrganisationUnits: [{ id: ROOT }],
    })),
    userGroups: Object.entries(TEAMS).map(([team, name]) => ({
        id: teamId(team),
        code: code(`TEAM_${team.toUpperCase()}`),
        name,
        sharing: PUBLIC_READ,
        users: PERSONAS.filter(
            (persona) => team === 'all' || persona.teams.includes(team)
        ).map((persona) => ({ id: userId(persona.key) })),
    })),
})

module.exports = {
    PERSONAS,
    TEAMS,
    loadPasswords,
    savePasswords,
    teamId,
    username,
    usersMetadata,
}
