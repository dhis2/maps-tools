// Counts OSM features per essential tag in a country or bbox, with Overpass.
//
//   node fetch-counts.mjs --country SL
//   node fetch-counts.mjs --bbox 7.90,-11.80,7.99,-11.70 --name bo-town
//
// Writes results/<name>.json after each use, and resumes from it when re-run,
// as public Overpass servers are often busy. Prints a markdown table.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Tried in turn when a server is busy
const OVERPASS_URLS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
]
const MAX_ATTEMPTS = 6
const USER_AGENT = 'dhis2-maps-osm-essential-tags/1'
const DELAY_MS = 3000

const dir = path.dirname(fileURLToPath(import.meta.url))

const getArg = (name) => {
    const index = process.argv.indexOf(`--${name}`)
    return index > -1 ? process.argv[index + 1] : undefined
}

// "type:any" -> nwr, "type:node,way" -> nw, "type:way" -> way.
// Overpass has no one-letter statements, only node, way, rel and the
// combined nw, nr, wr, nwr.
const toElements = (type) => {
    const types = type.replace('type:', '').split(',')
    if (types.includes('any') || types.length === 3) {
        return 'nwr'
    }
    if (types.length === 1) {
        return { node: 'node', way: 'way', relation: 'rel' }[types[0]]
    }
    return types.map((t) => ({ node: 'n', way: 'w', relation: 'r' })[t]).join('')
}

// Flattens a use into [{ elements, key, cat, value }]
const getTags = (use) =>
    Object.entries(use).flatMap(([type, keys]) =>
        Object.entries(keys).flatMap(([key, cats]) =>
            Object.entries(cats).flatMap(([cat, values]) =>
                values.map((value) => ({
                    elements: toElements(type),
                    key: key.replace('key:', ''),
                    cat: cat.replace('cat:', ''),
                    value,
                }))
            )
        )
    )

const buildQuery = (tags, { country, bbox }) => {
    const header = country
        ? `area["ISO3166-1"="${country}"][admin_level=2]->.a;`
        : ''
    const scope = country ? '(area.a)' : `(${bbox})`
    const counts = tags
        .map(
            ({ elements, key, value }) =>
                `${elements}["${key}"="${value}"]${scope};out count;`
        )
        .join('\n')

    return `[out:json][timeout:300];\n${header}\n${counts}`
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const runQuery = async (query, attempt = 1) => {
    const url = OVERPASS_URLS[(attempt - 1) % OVERPASS_URLS.length]
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT },
        body: new URLSearchParams({ data: query }),
    })

    // Busy or rate limited, wait and retry on the next server
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) {
        console.error(`  ${response.status} from ${url}, retrying`)
        await sleep(DELAY_MS * attempt * 5)
        return runQuery(query, attempt + 1)
    }
    if (!response.ok) {
        throw new Error(`Overpass ${response.status} from ${url}`)
    }

    const { elements } = await response.json()
    return elements.filter(({ type }) => type === 'count')
}

const readResults = async (file) => {
    try {
        return JSON.parse(await fs.readFile(file, 'utf8')).results
    } catch {
        return []
    }
}

const main = async () => {
    const country = getArg('country')
    const bbox = getArg('bbox')
    const name = getArg('name') ?? country ?? 'bbox'

    if (!country && !bbox) {
        throw new Error('Use --country <ISO code> or --bbox s,w,n,e')
    }

    const essentialTags = JSON.parse(
        await fs.readFile(path.join(dir, 'essential-tags-v1.json'), 'utf8')
    )
    const file = path.join(dir, 'results', `${name}.json`)
    const results = await readResults(file)
    const done = new Set(results.map(({ use }) => use))

    await fs.mkdir(path.dirname(file), { recursive: true })

    for (const [useKey, use] of Object.entries(essentialTags)) {
        const useName = useKey.replace('use:', '')
        if (done.has(useName)) {
            console.error(`${useKey}: already counted`)
            continue
        }

        const tags = getTags(use)
        const counts = await runQuery(buildQuery(tags, { country, bbox }))

        tags.forEach((tag, i) => {
            const { nodes = 0, ways = 0, relations = 0, total = 0 } =
                counts[i]?.tags ?? {}
            results.push({
                use: useName,
                ...tag,
                nodes: Number(nodes),
                ways: Number(ways),
                relations: Number(relations),
                total: Number(total),
            })
        })
        await fs.writeFile(
            file,
            JSON.stringify(
                { name, country, bbox, date: new Date(), results },
                null,
                2
            )
        )
        console.error(`${useKey}: ${tags.length} tags`)
        await sleep(DELAY_MS)
    }

    console.log('| Use | Tag | Category | Total | Nodes | Ways | Relations |')
    console.log('|---|---|---|---:|---:|---:|---:|')
    results.forEach((r) =>
        console.log(
            `| ${r.use} | ${r.key}=${r.value} | ${r.cat} | ${r.total} | ${r.nodes} | ${r.ways} | ${r.relations} |`
        )
    )
}

main().catch((error) => {
    console.error(error.message)
    process.exit(1)
})
