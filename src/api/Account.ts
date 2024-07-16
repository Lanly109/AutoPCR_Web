import { API } from '@api/APIUtils';
import { AccountResponse, ValidateResponse } from '@interfaces/Account';
import { DefaultResponse } from '@interfaces/DefaultResponse';
import { ConfigInfo, ConfigValue, ModuleInfo, ModuleResponse } from '@interfaces/Module';
import { AccountInfo, UserInfoResponse } from '@interfaces/UserInfo';

export async function getUserInfo() {
  const response = await API.get<UserInfoResponse>('/account');
  return response.data;
}

export async function putDefaultAccount(account: string) {
  const response = await API.put<DefaultResponse>('/account', {
    default_account: account,
  });
  return response.data;
}

export async function postAccount(alias: string) {
  const response = await API.post<DefaultResponse>(`/account`, {
    alias: alias,
  });
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

export async function putAccount(alias: string, account: string, password: string) {
  const response = await API.put<DefaultResponse>(`/account/${alias}`, {
    username: account,
    password: password
  });
  return response.data;
}

export async function getAccountConfig(alias: string, area: string) {
  const response = await API.get<ModuleResponse>(`/account/${alias}/${area}`);
  response.data.config = new Map(Object.entries(response.data.config)) as Map<string, ConfigValue>;
  response.data.info = new Map(Object.entries(response.data.info)) as Map<string, ModuleInfo>;
  response.data.info.forEach(function (item) {
    item.config = new Map(Object.entries(item.config)) as Map<string, ConfigInfo>;
  });
  return response.data;
}

export async function putAccountConfig(alias: string, key: string, value: ConfigValue) {
  const response = await API.put<DefaultResponse>(`/account/${alias}/config`, {
    [key]: value
  });
  return response.data;
}

export async function postAccountAreaDaily(alias: string) {
  const response = await API.post<AccountInfo>(`/account/${alias}/do_daily`, {}, {
    timeout: 4 * 60 * 1000,
  });
  return response.data;
}

export async function postAccountAreaSingle(alias: string, module: string, text: boolean) {
  const response = await API.post<Blob>(`/account/${alias}/do_single?text=${text}`, {
    order: module
  }, {
    timeout: 4 * 60 * 1000,
    responseType: "blob"
  });
  if (text) {
    return await response.data.text();
  } else{
    const imageUrl = window.URL.createObjectURL(response.data);
    return imageUrl
  }
}

export async function getAccountDailyResult(alias: string, time: string) {
  const response = await API.get<Blob>(`/account/${alias}/daily_result/${time}`,
    { 
		responseType: "blob",
		timeout: 1 * 60 * 1000
  });
  const imageUrl = window.URL.createObjectURL(response.data);
  return imageUrl
}

export async function getAccountAreaSingleResult(alias: string, module: string, text: boolean) {
  const response = await API.get<Blob>(`/account/${alias}/single_result/${module}?text=${text}`,
    { 
		responseType: "blob",
		timeout: 1 * 60 * 1000
  });
  if (text) {
    return await response.data.text();
  } else{
    const imageUrl = window.URL.createObjectURL(response.data);
    return imageUrl
  }
}

export async function getAccountValidate(alias: string) {
  const response = await API.get<ValidateResponse>(`/account/${alias}/query_validate`);
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
