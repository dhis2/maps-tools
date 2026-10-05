/*
 * Group 15: the metadata requests the library sends for org units. Each
 * response is recorded for metadata-shapes.json. Counts over the tool's
 * own units are known, so they are checked: above all the nested filters
 * (parent.parent…, children…), which were only tried on 2.44.
 */
const { toRow } = require('../../observations.js')
const { uid } = require('../../uid.js')
const { sanitize } = require('../detection-requests.js')
const { ORG_UNIT_GROUPS } = require('./org-unit-groups.js')

const KEY = 'org-unit-requests'

const groupId = (key) => ORG_UNIT_GROUPS.find((g) => g.key === key).id

/*
 * Requests with `expected` counts are checked; `pager` reads pager.total,
 * `list` counts the objects in the list. `asUser` sends it as the PTT user.
 */
const requests = (orgUnitIds) => {
    const count = (filter) =>
        `/api/organisationUnits.json?filter=${filter}&fields=id&pageSize=1`
    return [
        {
            name: 'dataElements-aggregationLevels',
            path: '/api/dataElements.json?filter=code:$like:PTT_OU_AGG&fields=id,code,aggregationType,aggregationLevels,dataSetElements[dataSet[id,periodType]]&paging=false&order=code:asc',
            list: 'dataElements',
            expected: 4,
        },
        {
            name: 'programIndicators',
            path: '/api/programIndicators.json?filter=code:$like:PTT_PROG&fields=id,code,program[id],orgUnitField,analyticsType&paging=false&order=code:asc',
            list: 'programIndicators',
            expected: 7,
        },
        {
            name: 'programs',
            path: '/api/programs.json?filter=code:$like:PTT_PROG&fields=id,code,programType&paging=false&order=code:asc',
            list: 'programs',
            expected: 2,
        },
        {
            name: 'organisationUnitLevels',
            path: '/api/organisationUnitLevels.json?fields=id,level,displayName&paging=false&order=level:asc',
            list: 'organisationUnitLevels',
        },
        { name: 'count-level', path: count('level:eq:4'), pager: true },
        {
            name: 'count-path',
            path: count(`path:like:${orgUnitIds.region}`),
            pager: true,
            expected: 9,
        },
        {
            name: 'count-dataSet',
            path: count(`dataSets.id:eq:${uid('ou-ds-partly')}`),
            pager: true,
            expected: 2,
        },
        {
            name: 'count-program',
            path: count(`programs.id:eq:${uid('prog-event')}`),
            pager: true,
            expected: 2,
        },
        {
            name: 'count-ids',
            path: count(
                `id:in:[${orgUnitIds.F1},${orgUnitIds.F2},${orgUnitIds.D3}]`
            ),
            pager: true,
            expected: 3,
        },
        {
            name: 'count-group',
            path: count(`organisationUnitGroups.id:eq:${groupId('g')}`),
            pager: true,
            expected: 2,
        },
        // Grandchildren of the region: F1, F2, F3.
        {
            name: 'count-grandparent-in-group',
            path: count(
                `parent.parent.organisationUnitGroups.id:eq:${groupId('top')}`
            ),
            pager: true,
            expected: 3,
        },
        // Grandchildren of D2 or F1: none.
        {
            name: 'count-grandparent-in-group-none',
            path: count(
                `parent.parent.organisationUnitGroups.id:eq:${groupId('g')}`
            ),
            pager: true,
            expected: 0,
        },
        // Parents of D2 and F1: the region and D1.
        {
            name: 'count-child-in-group',
            path: count(
                `children.organisationUnitGroups.id:eq:${groupId('g')}`
            ),
            pager: true,
            expected: 2,
        },
        // D1 is the only one of F1, D1 and the region that is assigned.
        {
            name: 'list-assigned-ancestors',
            path: `/api/organisationUnits.json?filter=id:in:[${orgUnitIds.F1},${orgUnitIds.D1},${orgUnitIds.region}]&filter=dataSets.id:eq:${uid('ou-ds-above')}&fields=id&paging=false`,
            list: 'organisationUnits',
            expected: 1,
        },
        {
            name: 'me',
            path: '/api/me.json?fields=organisationUnits[id,level,path],dataViewOrganisationUnits[id,level,path]',
        },
        {
            name: 'me-ptt-user',
            path: '/api/me.json?fields=organisationUnits[id,level,path],dataViewOrganisationUnits[id,level,path]',
            asUser: true,
        },
    ]
}

const judge = (expected, observed) => {
    if (observed.status === 'ERROR') {
        return 'fail'
    }
    return expected.value === null
        ? 'recorded'
        : expected.value === observed.value
          ? 'pass'
          : 'fail'
}

const buildGroup = ({ orgUnits }) => {
    const orgUnitIds = Object.fromEntries(
        Object.entries(orgUnits).map(([key, unit]) => [key, unit.id])
    )
    const cases = requests(orgUnitIds).map((request) => ({
        id: `ou-request-${request.name}`,
        item: {
            notes: 'Metadata request; the response is in metadata-shapes.json.',
        },
        query: {
            request: request.path,
            ...(request.asUser ? { asUser: true } : {}),
        },
        expected: {
            status: request.expected === 0 ? 'EMPTY' : 'VALUE',
            value: request.expected ?? null,
        },
        request,
        judge,
    }))

    const verify = async (client, { userClient }) => {
        const rows = []
        const shapes = []
        for (const testCase of cases) {
            const { request } = testCase
            const caller = request.asUser ? userClient : client
            if (!caller) {
                const observed = {
                    status: 'ERROR',
                    value: null,
                    error: 'No PTT user: run index.js first.',
                }
                rows.push(toRow(testCase, observed))
                continue
            }
            const { ok, status, json } = await caller.send('GET', request.path)
            shapes.push({
                name: request.name,
                path: request.path,
                httpStatus: status,
                response: sanitize(json),
            })
            let observed
            if (!ok) {
                observed = {
                    status: 'ERROR',
                    value: null,
                    error: `${status}: ${json?.message}`,
                }
            } else {
                const value = request.pager
                    ? (json.pager?.total ?? null)
                    : request.list
                      ? (json[request.list] ?? []).length
                      : null
                observed = {
                    status: value === 0 ? 'EMPTY' : 'VALUE',
                    value,
                }
            }
            rows.push(toRow(testCase, observed))
        }
        return { rows, responses: shapes }
    }

    return {
        key: KEY,
        number: 15,
        title: 'Org unit requests',
        fixtureSet: 'org-units',
        cases,
        verify,
    }
}

module.exports = { KEY, buildGroup }
