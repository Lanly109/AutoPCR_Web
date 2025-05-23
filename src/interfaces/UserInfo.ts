export interface RoleInfo {
  /**
   * 管理员
   */
  admin?: boolean;
  /**
   * 超管
   */
  super_user?: boolean;
}

export interface UserInfo {
  /**
   * QQ
   */
  qq?: string;
  /**
   * 管理员
   */
  admin?: boolean;
  /**
   * 密码
   */
  password?: string;
  /**
   * 禁用
   */
  disabled?: boolean;
  /**
   * 账户数量
   */
  account_count?: number;
  /**
   * 公会管理
   */
  clan?: boolean;
}

export interface UserInfoResponse {
  /**
   * QQ
   */
  qq?: string;
  /**
   * 密码
   */
  password?: string;
  /**
   * 账号昵称
   */
  accounts?: AccountInfo[];
  /**
   * 默认账号
   */
  default_account?: string;
  /**
   * 登录日志
   */
  login_log?: LoginLog[];
  /**
   * 公会管理
   */
  clan?: boolean;
}

export interface AccountInfo {
  /**
   * 昵称
   */
  name: string;
  /**
   * 最近一次清日常信息
   */
  daily_clean_time: ResultInfo;
  /**
   * 会战期间禁止
   */
   clan_forbid: boolean;
}

export interface ResultInfo {
  /**
   * 结果时间
   */
  time: string;
  /**
   * 结果别名
   */
  alias: string;
  /**
   * 结果备注
   */
  msg: string;
  /**
   * 结果链接
   */
  url: string;
  /**
   * 结果状态
   */
  status: "成功" | "警告" | "错误" | '跳过' | '中止';
}

export interface LoginLog {
  /**
   * 登录时间
   */
  time: string;
  /**
   * 登录方式
   */
  method: "密码" | "邮箱Pin码" | "Q群Pin码";
  /**
   * 登录IP
   */
  ip: string;
}
