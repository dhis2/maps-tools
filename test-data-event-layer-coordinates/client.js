// Thin wrapper around DHIS2's HTTP API using Node's built-in fetch.
// Uses plain HTTP Basic Auth, which DHIS2 supports natively on /api/* -
// simpler than the session-cookie login flow the Cypress suite uses.
const UID_REGEX = /^[A-Za-z][A-Za-z0-9]{10}$/

const createClient = ({ baseUrl, username, password }) => {
    const authHeader =
        'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

    // Returns { json, headers } - the raw fetch Headers object is needed by
    // postAnalytics to read the Location header DHIS2 returns for the
    // scheduled analytics job.
    const requestRaw = async (method, path, body) => {
        const res = await fetch(`${baseUrl}${path}`, {
            method,
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        })

        const text = await res.text()
        let json
        try {
            json = text ? JSON.parse(text) : {}
        } catch {
            throw new Error(
                `${method} ${path} returned non-JSON response (status ${
                    res.status
                }): ${text.slice(0, 500)}`
            )
        }

        if (!res.ok) {
            const err = new Error(
                `${method} ${path} failed with status ${
                    res.status
                }: ${JSON.stringify(json)}`
            )
            err.status = res.status
            err.body = json
            throw err
        }

        return { json, headers: res.headers }
    }

    const request = async (method, path, body) =>
        (await requestRaw(method, path, body)).json

    return {
        get: (path) => request('GET', path),
        postMetadata: (payload) =>
            request(
                'POST',
                '/api/metadata?importStrategy=CREATE_AND_UPDATE&atomicMode=OBJECT',
                payload
            ),
        postTracker: (payload) =>
            request(
                'POST',
                '/api/tracker?async=false&importStrategy=CREATE_AND_UPDATE&atomicMode=OBJECT&reportMode=FULL',
                payload
            ),
        // Kicks off the (async) analytics table generation job. Note this
        // is a different endpoint than the analytics *query* API
        // (/api/analytics/events/query etc.) - table generation lives
        // under the maintenance/resourceTables resource.
        // skipAggregate=true skips the aggregate data tables, which event/
        // tracker analytics doesn't need - much faster than a full run.
        // Tries to find the job's own UID first from the response body
        // (JobConfiguration-style responses put it at response.id), then
        // from the Location header - but the Location header on at least
        // one real instance turned out to just be
        // `/api/system/tasks/ANALYTICS_TABLE` (the job *type*, no id
        // suffix), so any candidate is validated against the DHIS2 UID
        // shape before being trusted. Returns jobId: null if neither
        // source yields a valid one, so the caller falls back to polling
        // the most recently updated job instead.
        postAnalytics: async () => {
            const { json, headers } = await requestRaw(
                'POST',
                '/api/resourceTables/analytics?skipAggregate=true'
            )
            const location = headers.get('location')
            const candidates = [
                json?.response?.id,
                location ? location.split('/').filter(Boolean).pop() : null,
            ]
            const jobId =
                candidates.find(
                    (candidate) => candidate && UID_REGEX.test(candidate)
                ) ?? null
            return { json, jobId }
        },
    }
}

module.exports = { createClient }
