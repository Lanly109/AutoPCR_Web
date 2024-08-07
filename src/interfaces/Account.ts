export interface AccountResponse {
  /**
   * 昵称
   */
  alias: string;
  /**
   * 账号
   */
  username: string;
  /**
   * 密码
   */
  password: string;
  /**
   * 渠道类型 
   */
  channel: string;
  /**
   * 渠道选项
   */
  channel_option: string[];
  /**
   * 功能类型 
   */
  area: AreaInfo[];
}

export interface AreaInfo {
  /**
  * 功能url
  */
  key: string;
  /**
  * 功能名字
  */
  name: string;
}

export interface ValidateResponse {
  id: string;
  challenge: string;
  gt: string;
  userid: string;
  status: string;
}
