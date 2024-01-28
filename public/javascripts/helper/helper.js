async function fetchServer(endpoint, method = 'GET', body = null) {
    const options = {
        headers: { 'Content-Type': 'application/json' },
        method: method,
        body: body ? body : undefined,
    }

    let response
    const url = endpoint.startsWith('http://') ? endpoint : `${SERVER_IP}${endpoint}`
    try {
        response = await fetch(url, options)
        if (response.redirected) {
            window.location = response.url
            return
        }

        if (response.status !== 204) {
            response = await response.json()
        }

        if (typeof response === 'string') {
            throw new Error(response)
        }
    } catch (err) {
        console.error(err)
        response = {error: err}
    }
    return response
}
