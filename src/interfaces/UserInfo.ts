export interface UserInfoResponse {
  /**
   * QQ
   */
  qq?: string;
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
}

export interface AccountInfo {
  /**
   * 昵称
   */
  name: string;
  /**
   * 最近一次清日常信息
   */
  daily_clean_time: DailyResult;
  /**
   * 最近清日常信息列表
   */
  daily_clean_time_list: DailyResult[];
}

export interface DailyResult {
  /**
   * 清日常时间
   */
  time: string;
  /**
   * 清日常时间，去除特殊符号
   */
  time_safe: string;
  /**
   * 清日常状态
   */
  status: "success" | "skip" | "error";
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
