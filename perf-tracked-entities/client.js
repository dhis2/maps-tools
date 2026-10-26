// A thin wrapper around the DHIS2 Web API on Node's built-in fetch, with
// HTTP Basic Auth.
const UID_REGEX = /^[A-Za-z][A-Za-z0-9]{10}$/

const parseBody = (text) => {
    try {
        return text ? JSON.parse(text) : {}
    } catch {
        return null
    }
}

const createClient = ({ baseUrl, username, password }) => {
    const authHeader =
        'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

    // Never throws on an HTTP error: the caller decides what a refusal means.
    const send = async (method, path, body, { timeoutMs } = {}) => {
        const res = await fetch(`${baseUrl}${path}`, {
            method,
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
        })
        const text = await res.text()
        const parsed = parseBody(text)
        const json =
            parsed === null && !res.ok
                ? { message: text.slice(0, 300) }
                : parsed
        if (json === null) {
            throw new Error(
                `${method} ${path} returned non-JSON (status ${
                    res.status
                }): ${text.slice(0, 300)}`
            )
        }
        return {
            ok: res.ok,
            status: res.status,
            json,
            headers: res.headers,
            bytes: Buffer.byteLength(text),
        }
    }

    const request = async (method, path, body) => {
        const res = await send(method, path, body)
        if (!res.ok) {
            const err = new Error(
                `${method} ${path.slice(0, 300)} failed with status ${
                    res.status
                }: ${JSON.stringify(res.json).slice(0, 2000)}`
            )
            err.status = res.status
            err.body = res.json
            throw err
        }
        return res.json
    }

    return {
        send,
        get: (path) => request('GET', path),
        // A report with ignored objects comes back as 409: not thrown, so
        // the caller can list the errors.
        postMetadata: async (payload, importStrategy = 'CREATE_AND_UPDATE') =>
            (
                await send(
                    'POST',
                    `/api/metadata?importStrategy=${importStrategy}&atomicMode=NONE&importReportMode=ERRORS`,
                    payload
                )
            ).json,
        postTracker: (payload, importStrategy = 'CREATE_AND_UPDATE') =>
            send(
                'POST',
                `/api/tracker?async=false&importStrategy=${importStrategy}&atomicMode=OBJECT&reportMode=ERRORS`,
                payload
            ),
        // Tracked entity tables only, plus the resource tables they need.
        // `lastYears` is never passed: a partial run emptied analytics on
        // 2.43.1 until a full run fixed it.
        postAnalytics: async () => {
            const res = await send(
                'POST',
                '/api/resourceTables/analytics?skipAggregate=true&skipEvents=true&skipEnrollment=true&skipOrgUnitOwnership=true&skipOutliers=true&skipValidationResult=true'
            )
            if (!res.ok) {
                throw new Error(
                    `Starting analytics failed (${res.status}): ${JSON.stringify(
                        res.json
                    )}`
                )
            }
            const location = res.headers.get('location')
            const candidates = [
                res.json?.response?.id,
                location ? location.split('/').filter(Boolean).pop() : null,
            ]
            const jobId =
                candidates.find((id) => id && UID_REGEX.test(id)) ?? null
            return { json: res.json, jobId }
        },
    }
}

module.exports = { createClient }
