import { DefaultResponse } from '@interfaces/DefaultResponse';
import { API } from '@api/APIUtils';

export async function postLoginWithPassword(qq: string, password: string) {
  const response = await API.post<DefaultResponse>('/login/qq', {
    qq: qq,
    password: password
  });
  return response.data;
}

export async function postLoginWithEmail(qq: string, pin: string) {
  const response = await API.post<DefaultResponse>('/login/email', {
    qq: qq,
    pin: pin
  });
  return response.data;
}

export async function getLoginPin() {
  const response = await API.get<DefaultResponse>('/login/pin');
  return response.data;
}

export async function getLoginPinResult(pin: string) {
  const response = await API.get<DefaultResponse>(`/login/pin/${pin}`);
  return response.data;
}

export async function postLogout() {
  const response = await API.post<DefaultResponse>('/logout');
  return response.data;
}
