import { DefaultResponse } from '@interfaces/DefaultResponse';
import { API } from '@api/APIUtils';

export async function postRegister(qq: string, password: string) {
  const response = await API.post<DefaultResponse>('/register', {
    qq: qq,
    password: password
  });
  return response.data;
}
