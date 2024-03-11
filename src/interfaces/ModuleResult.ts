import { ConfigValue } from "./Module";

export interface ModuleResultResponse {
	/**
	 * 模块顺序
	 */
	order: string[];
	/**
	 * 模块结果
	 */
	result: Map<string, ModuleResult>;
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
}

export type ModuleResultStatus = "success" | "error" | "abort" | "skip";
