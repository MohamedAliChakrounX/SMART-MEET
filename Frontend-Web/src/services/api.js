import axios from 'axios';

// Axios instance for Symfony backend (/api/v1)
const api = axios.create({
    baseURL: '/api/v1',
    timeout: 30_000,
});

// Add JWT token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle authentication errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && error.response?.data?.error === 'account_disabled') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            window.location.href = '/login?error=account_disabled';
        }
        return Promise.reject(error);
    }
);

export default api;
