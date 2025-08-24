import { ModuleResult } from '@interfaces/ModuleResult';
import { API } from '@api/APIUtils';
import { AccountResponse, ValidateResponse } from '@interfaces/Account';
import { DefaultResponse } from '@interfaces/DefaultResponse';
import { ConfigValue, ModuleResponse } from '@interfaces/Module';
import {AccountInfo, ResultInfo, RoleInfo, UserInfo, UserInfoResponse} from '@interfaces/UserInfo';
import {useEffect, useState} from "react";

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
  return response.data;
}

export async function clearAccounts() {
  const response = await API.delete<DefaultResponse>(`/account`);
  return response.data;
}

export async function postAccountSyncConfig(alias: string) {
  const response = await API.post<DefaultResponse>(`/account/sync`, {
    alias: alias,
  });
  return response.data;
}

export async function getAccount(alias: string) {
  const response = await API.get<AccountResponse>(`/account/${alias}`);
  return response.data;
}

export async function delAccount(alias: string) {
  const response = await API.delete<DefaultResponse>(`/account/${alias}`);
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
  const response = await API.get<ModuleResponse>(`/account/${alias}/${area}`);
  return response.data;
}

export async function putAccountConfig(alias: string, key: string, value: ConfigValue) {
  return putAccountConfigs(alias, {[key]: value})
}

export async function putAccountConfigs(alias: string, configs: Record<string, ConfigValue>) {
  const response = await API.put<DefaultResponse>(`/account/${alias}/config`, configs);
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
