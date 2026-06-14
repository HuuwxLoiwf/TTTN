const BASE_URL = '/api';

export const apiFetch = async (token, path, options = {}) => {
    const { body, method = 'GET', ...rest } = options;
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        ...rest,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `Lỗi ${res.status}`);
    }
    return res.json();
};
