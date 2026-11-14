// Thin wrapper around DHIS2's HTTP API using Node's built-in fetch and Basic auth
const createClient = ({ baseUrl, username, password }) => {
    const authHeader =
        'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

    const request = async (method, path, body, contentType) => {
        const isText = contentType === 'text/plain'
        const res = await fetch(`${baseUrl}${path}`, {
            method,
            headers: {
                Authorization: authHeader,
                'Content-Type': contentType || 'application/json',
            },
            body: body === undefined || isText ? body : JSON.stringify(body),
        })

        const text = await res.text()
        let json
        try {
            json = text ? JSON.parse(text) : {}
        } catch {
            throw new Error(
                `${method} ${path} returned non-JSON (status ${
                    res.status
                }): ${text.slice(0, 300)}`
            )
        }

        if (!res.ok) {
            const err = new Error(
                `${method} ${path} failed with status ${
                    res.status
                }: ${JSON.stringify(json).slice(0, 1500)}`
            )
            err.status = res.status
            err.body = json
            throw err
        }

        return json
    }

    return {
        get: (path) => request('GET', path),
        post: (path, body) => request('POST', path, body),
        postText: (path, text) => request('POST', path, text, 'text/plain'),
        put: (path, body) => request('PUT', path, body),
        patch: (path, operations) =>
            request('PATCH', path, operations, 'application/json-patch+json'),
        delete: (path) => request('DELETE', path),
    }
}

module.exports = { createClient }
