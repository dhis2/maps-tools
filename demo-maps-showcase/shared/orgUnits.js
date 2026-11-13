const { DISTRICT_IDS, ROOT } = require('./sierraLeone.js')

// The server refuses data for closed facilities
const isOpen = ({ openingDate, closedDate }, date) =>
    (!openingDate || new Date(openingDate) <= date) &&
    (!closedDate || new Date(closedDate) > date)

// Districts, chiefdoms and open facilities of Sierra Leone, sorted by id so
// the data generated from them doesn't depend on the order the server returns
const loadOrgUnits = async (client, runDate) => {
    const fields =
        'fields=id,name,path,level,openingDate,closedDate&paging=false'
    const { organisationUnits } = await client.get(
        `/api/organisationUnits?filter=path:like:${ROOT}&filter=level:in:[2,3,4]&${fields}`
    )
    const byId = (a, b) => a.id.localeCompare(b.id)
    const inSierraLeone = ({ districtId }) => DISTRICT_IDS.has(districtId)

    const districts = organisationUnits
        .filter(({ level, id }) => level === 2 && DISTRICT_IDS.has(id))
        .map(({ id, name }) => ({ id, name }))
        .sort(byId)

    const chiefdoms = organisationUnits
        .filter(({ level }) => level === 3)
        .map(({ id, name, path }) => ({
            id,
            name,
            districtId: path.split('/')[2],
        }))
        .filter(inSierraLeone)
        .sort(byId)

    const facilities = organisationUnits
        .filter((ou) => ou.level === 4 && isOpen(ou, runDate))
        .map(({ id, name, path }) => ({
            id,
            name,
            districtId: path.split('/')[2],
            chiefdomId: path.split('/')[3],
        }))
        .filter(inSierraLeone)
        .sort(byId)

    return { districts, chiefdoms, facilities }
}

const facilitiesIn = (orgUnits, districtId) =>
    orgUnits.facilities.filter((f) => f.districtId === districtId)

const districtName = (orgUnits, districtId) =>
    orgUnits.districts.find(({ id }) => id === districtId)?.name

module.exports = { districtName, facilitiesIn, loadOrgUnits }
