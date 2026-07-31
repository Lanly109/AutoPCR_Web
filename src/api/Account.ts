import { ModuleResult } from '@interfaces/ModuleResult';
import { API } from '@api/APIUtils';
import { AccountResponse, ValidateResponse, RunningStatusResponse } from '@interfaces/Account';
import { DefaultResponse } from '@interfaces/DefaultResponse';
import { ConfigValue, ModuleResponse } from '@interfaces/Module';
import {AccountInfo, ResultInfo, RoleInfo, UserInfo, UserInfoResponse} from '@interfaces/UserInfo';
import {useEffect, useState} from "react";

const ACCOUNT_CONFIG_CACHE_LIMIT = 24;
const accountConfigCache = new Map<string, ModuleResponse>();
const accountConfigRequests = new Map<string, Promise<ModuleResponse>>();
let accountConfigCacheVersion = 0;

const accountConfigCacheKey = (alias: string, area: string) => `${alias}\u0000${area}`;

function cacheAccountConfig(key: string, config: ModuleResponse) {
  // Reinsert hits at the end so the map also acts as a small LRU cache.
  accountConfigCache.delete(key);
  accountConfigCache.set(key, config);

  while (accountConfigCache.size > ACCOUNT_CONFIG_CACHE_LIMIT) {
    const oldestKey = accountConfigCache.keys().next().value;
    if (oldestKey === undefined) break;
    accountConfigCache.delete(oldestKey);
  }
}

function updateCachedAccountConfigs(alias: string, configs: Record<string, ConfigValue>) {
  const keyPrefix = `${alias}\u0000`;
  const updates: [string, ModuleResponse][] = [];

  for (const [key, cached] of accountConfigCache) {
    if (!key.startsWith(keyPrefix)) continue;

    const relevantEntries = Object.entries(configs).filter(([configKey]) =>
      Object.prototype.hasOwnProperty.call(cached.config, configKey),
    );
    if (relevantEntries.length === 0) continue;

    updates.push([key, {
      ...cached,
      config: { ...cached.config, ...Object.fromEntries(relevantEntries) },
    }]);
  }

  for (const [key, updated] of updates) {
    cacheAccountConfig(key, updated);
  }
}

function clearCachedAccountConfigs(alias?: string) {
  // Prevent requests started before an import/sync/delete from repopulating stale data.
  accountConfigCacheVersion += 1;

  if (alias === undefined) {
    accountConfigCache.clear();
    accountConfigRequests.clear();
    return;
  }

  const keyPrefix = `${alias}\u0000`;
  for (const key of accountConfigCache.keys()) {
    if (key.startsWith(keyPrefix)) accountConfigCache.delete(key);
  }
  for (const key of accountConfigRequests.keys()) {
    if (key.startsWith(keyPrefix)) accountConfigRequests.delete(key);
  }
}

export function useUserRole() {
  const [role, setRole] = useState<RoleInfo>()

  useEffect(() => {
    API.get<RoleInfo>('/role').then(response => {
      setRole(response.data)
    }).catch(() => {return})
  }, []);

  return role;
}

export async function getClanForbid() {
	const response = await API.get<DefaultResponse>('/clan_forbid');
	return response.data;
}

export async function putClanForbid(accs: string) {
	const response = await API.put<DefaultResponse>('/clan_forbid', {
		accs: accs,
	});
	return response.data;
}

export async function getUserInfo() {
  const response = await API.get<UserInfoResponse>('/account');
  return response.data;
}

export async function putUserInfo(userInfo: UserInfoResponse) {
  const response = await API.put<DefaultResponse>('/account', userInfo);
  return response.data;
}

export async function postAccountImport(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await API.post<DefaultResponse>('/account/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  clearCachedAccountConfigs();
  return response.data;
}

export async function postAccount(alias: string) {
  const response = await API.post<DefaultResponse>(`/account`, {
    alias: alias,
  });
  return response.data;
}

export async function deleteAccount() {
  const response = await API.delete<DefaultResponse>(`/`);
  clearCachedAccountConfigs();
  return response.data;
}

export async function clearAccounts() {
  const response = await API.delete<DefaultResponse>(`/account`);
  clearCachedAccountConfigs();
  return response.data;
}

export async function postAccountSyncConfig(alias: string) {
  const response = await API.post<DefaultResponse>(`/account/sync`, {
    alias: alias,
  });
  clearCachedAccountConfigs(alias);
  return response.data;
}

export async function getAccount(alias: string) {
  const response = await API.get<AccountResponse>(`/account/${alias}`);
  return response.data;
}

export async function delAccount(alias: string) {
  const response = await API.delete<DefaultResponse>(`/account/${alias}`);
  clearCachedAccountConfigs(alias);
  return response.data;
}

export async function putAccount(alias: string, account: string, password: string, channel: string, batch_accounts: (string | number)[]) {
  const response = await API.put<DefaultResponse>(`/account/${alias}`, {
    username: account,
    password: password,
    channel: channel,
	batch_accounts: batch_accounts
  });
  return response.data;
}

export async function getAccountConfig(alias: string, area: string) {
  const key = accountConfigCacheKey(alias, area);
  const cached = accountConfigCache.get(key);
  if (cached) {
    cacheAccountConfig(key, cached);
    return cached;
  }

  const pendingRequest = accountConfigRequests.get(key);
  if (pendingRequest) return pendingRequest;

  const requestVersion = accountConfigCacheVersion;
  const request = API.get<ModuleResponse>(`/account/${alias}/${area}`)
    .then((response) => {
      if (requestVersion === accountConfigCacheVersion) {
        cacheAccountConfig(key, response.data);
      }
      return response.data;
    })
    .finally(() => {
      if (accountConfigRequests.get(key) === request) {
        accountConfigRequests.delete(key);
      }
    });

  accountConfigRequests.set(key, request);
  return request;
}

export async function putAccountConfig(alias: string, key: string, value: ConfigValue) {
  return putAccountConfigs(alias, {[key]: value})
}

export async function putAccountConfigs(alias: string, configs: Record<string, ConfigValue>) {
  const response = await API.put<DefaultResponse>(`/account/${alias}/config`, configs);
  updateCachedAccountConfigs(alias, configs);
  return response.data;
}

export async function postAccountAreaDaily(alias: string) {
  const response = await API.post<AccountInfo>(`/account/${alias}/do_daily`, {}, {
    timeout: 10 * 60 * 1000,
  });
  return response.data;
}

export async function postAccountAreaSingle(alias: string, module: string) {
  const response = await API.post<ResultInfo[]>(`/account/${alias}/do_single`, {
    order: module
  }, {
    timeout: 10 * 60 * 1000,
  });
  return response.data;
}

export async function getAccountDailyResultList(alias: string) {
  const response = await API.get<ResultInfo[]>(`/account/${alias}/daily_result`);
  return response.data
}

export async function getAccountDailyResult(alias: string, id: number) {
  const response = await API.get<Blob>(`/account/${alias}/daily_result/${id}`,
    {
		responseType: "blob",
		timeout: 1 * 60 * 1000
  });
  const imageUrl = window.URL.createObjectURL(response.data);
  return imageUrl
}

export async function getAccountAreaSingleResultList(alias: string, module: string) {
  const response = await API.get<ResultInfo[]>(`/account/${alias}/single_result/${module}`);
  return response.data
}

export async function getAccountAreaSingleResult(alias: string, module: string, text: boolean) {
  const response = await API.get<Blob | ModuleResult>(`/account/${alias}/single_result/${module}?text=${text}`,
    {
		responseType: "blob",
		timeout: 1 * 60 * 1000
  });
  if (text) {
    return response.data as ModuleResult;
  } else{
    const imageUrl = window.URL.createObjectURL(response.data as Blob);
    return imageUrl
  }
}

export async function getAllUsers() {
  const response = await API.get<UserInfo[]>('/user');
  return response.data;
}

export async function postUser(account: string, userInfo: UserInfo) {
  const response = await API.post<DefaultResponse>(`/user/${account}`, userInfo);
  return response.data;
}

export async function putUser(account: string, userInfo: UserInfo) {
  const response = await API.put<DefaultResponse>(`/user/${account}`, userInfo);
  return response.data;
}

export async function deleteUser(account: string) {
  const response = await API.delete<DefaultResponse>(`/user/${account}`);
  return response.data;
}

export async function getAccountValidate() {
  const response = await API.get<ValidateResponse>(`/query_validate`);
  return response.data;
}

export async function postAccountValidate(id: string, challenge: string, validate: string, userid: string) {
  const response = await API.post<DefaultResponse>(`/validate`, {
    id: id,
    challenge: challenge,
    validate: validate,
    userid: userid
  });
  return response.data;
}

export async function getRunningStatus() {
  const response = await API.get<RunningStatusResponse>(`/running_status`);
  return response.data;
}
