import axios, { AxiosError } from 'axios';

axios.defaults.withCredentials = true;

export const API = axios.create({
	baseURL: "/daily/api/",
	timeout: 10000,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
		'X-APP-Version': APP_VERSION,
	},
});

export const Fetch = axios.create({
	timeout: 10000,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
		'X-APP-Version': APP_VERSION,
	},
});

import { Route as LoginRoute } from "@routes/daily/login";

API.interceptors.response.use(
	(response) => (response),
	(error: AxiosError) => {
		if (error?.response?.status === 401) {
			window.location.href = LoginRoute.to;
		}
		return Promise.reject(error);
	}
)

