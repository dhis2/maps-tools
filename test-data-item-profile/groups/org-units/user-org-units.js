/*
 * Group 13: selections relative to the user. A PTT user whose data capture
 * and data view unit is the region asks for USER_ORGUNIT and its children
 * and grandchildren, on group 12's element. index.js sets the user's
 * password and keeps it in output/ (gitignored).
 */
const { uid } = require('../../uid.js')
const { everywhere } = require('./org-unit-groups.js')
const { orgUnitCase, verifyOrgUnitCases } = require('./shared.js')

const KEY = 'user-org-units'
const USERNAME = 'ptt_period_types_user'

const buildGroup = ({ orgUnits }) => {
    const { element, item } = everywhere()
    const role = {
        id: uid('user-role'),
        code: 'PTT_USER_ROLE',
        name: 'PTT user role',
        authorities: ['M_dhis-web-data-visualizer'],
    }
    const user = {
        id: uid('user'),
        code: 'PTT_USER',
        username: USERNAME,
        firstName: 'PTT',
        surname: 'User',
        userRoles: [{ id: role.id }],
        organisationUnits: [{ id: orgUnits.region.id }],
        dataViewOrganisationUnits: [{ id: orgUnits.region.id }],
    }
    const full = { compatibility: 'full', reasons: [] }
    const ask = (name, orgUnits, contributes) =>
        orgUnitCase({
            id: `ou-user__${name}`,
            item,
            dx: element.id,
            orgUnits,
            contributes,
            prediction: full,
            asUser: true,
        })
    const everyUnit = ['F1', 'F2', 'F3', 'D1', 'D2', 'D3']
    const cases = [
        ask('user-orgunit', ['USER_ORGUNIT'], everyUnit),
        ask('children', ['USER_ORGUNIT_CHILDREN'], everyUnit),
        ask(
            'grandchildren',
            ['USER_ORGUNIT_GRANDCHILDREN'],
            ['F1', 'F2', 'F3']
        ),
    ]
    return {
        key: KEY,
        number: 13,
        title: 'User org units',
        fixtureSet: 'org-units',
        extraMetadata: { userRoles: [role], users: [user] },
        cases,
        verify: verifyOrgUnitCases(cases),
    }
}

module.exports = { KEY, USERNAME, buildGroup }
