import { ConfigValue } from "./Module";

export interface ModuleResultResponse {
	/**
	 * 模块顺序
	 */
	order: string[];
	/**
	 * 模块结果
	 */
	result: Record<string, ModuleResult>;
}

export type HeaderItem =
  | string
  | { [key: string]: HeaderItem[] };

export type DataItem = string | number | {
  [key: string]: DataItem;
};

export type DataRow = Record<string, DataItem>;

export interface iTableResult {
	header: HeaderItem[];
	data: DataRow[];
}

export interface ModuleResult {
	/**
	* 模块名称
	*/
	name: string;
	/**
	* 模块配置
	*/
	config: ConfigValue;
	/**
	* 模块运行状态
	*/
	status: ModuleResultStatus;
	/**
	* 模块日志
	*/
	log: string;
	/**
	* 模块结果表格
	*/
	table: iTableResult;
}

export type ModuleResultStatus = "成功" | "错误" | "中止" | "跳过";
