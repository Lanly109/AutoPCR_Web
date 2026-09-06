import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { Route as LoginRoute } from "@routes/daily/login";
import { toaster } from '@components/ui/toaster';

// 扩展 AxiosRequestConfig 类型以支持自定义配置
declare module 'axios' {
    export interface AxiosRequestConfig {
        /** 是否跳过全局错误提示 */
        skipErrorHandler?: boolean;
        /** 是否跳过 401 自动跳转 */
        skipAuthRedirect?: boolean;
    }
}

axios.defaults.withCredentials = true;

const BASE_CONFIG: AxiosRequestConfig = {
    timeout: 30000, 
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'X-APP-Version': APP_VERSION,
    },
};

export const API = axios.create({
    ...BASE_CONFIG,
    baseURL: "/daily/api/",
});

export const Fetch = axios.create({
    ...BASE_CONFIG,
});

/**
 * 解析错误信息
 */
const getErrorMessage = (error: AxiosError): string => {
    if (error.response) {
        if (error.response.status === 429) {
            const retryAfter = Number(error.response.headers['retry-after']);
            if (Number.isFinite(retryAfter)) return `请在 ${Math.ceil(retryAfter)} 秒后重试`;
        }

        const data = error.response.data as any;
        // 如果后端返回的是字符串，直接使用；如果是对象，尝试获取 message 或 error 字段
        if (typeof data === 'string') return data;
        return data?.message || data?.error || `请求失败 (${error.response.status})`;
    } else if (error.request) {
        return '服务器无响应，请检测您的网络连接';
    } else {
        return error.message || '未知错误';
    }
};

/**
 * 全局响应拦截器
 */
const errorHandler = (error: AxiosError) => {
    // 如果配置了 skipErrorHandler，则不进行全局 toast 提示
    if (!error.config?.skipErrorHandler) {
        const message = getErrorMessage(error);
        toaster.create({
            title: "操作失败",
            description: message,
            type: "error",
            duration: 4000,
        });
    }

    // 处理 401 未授权情况
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
        // 使用 window.location.href 确保完全重定向，防止状态残留
        // 也可以使用 history.push 如果在 Router 上下文中，但在这里有点困难
        if (window.location.pathname !== LoginRoute.to) {
             window.location.href = LoginRoute.to;
        }
    }

    return Promise.reject(error);
};

API.interceptors.response.use((response) => response, errorHandler);
Fetch.interceptors.response.use((response) => response, errorHandler);


