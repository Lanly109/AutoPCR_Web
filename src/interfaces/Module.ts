export interface ModuleResponse {
	/**
	 * 模块配置
	 */
	config: Map<string, ConfigValue>;
	/**
	 * 模块顺序
	 */
	order: string[];
	/**
	 * 模块信息
	 */
	info: Map<string, ModuleInfo>;
}

export interface ModuleInfo {
	/**
	* 模块key
	*/
	key: string;
	/**
	* 模块名称
	*/
	name: string;
	/**
	* 模块描述
	*/
	description: string;
	/**
	* 模块配置顺序
	*/
	config_order: string[];
	/**
	* 模块配置
	*/
	config: Map<string, ConfigInfo>;
	/**
	* 模块标签
	*/
	tags: string[];
	/**
	* 模块是否实现
	*/
	implemented: boolean;
	/**
	* 模块是否可运行
	*/
	runnable: boolean;
	/**
	* 文字结果
	*/
	text_result: boolean;
}

export interface ConfigInfo {
	/**
	* 配置key
	*/
	key: string;
	/**
	* 配置名称
	*/
	desc: string;
	/**
	* 配置默认值
	*/
	default: ConfigValue;
	/**
	* 配置类型
	*/
	config_type: ConfigType;
	/**
	* 配置候选值
	*/
	candidates: ConfigValue[];
}

export type ConfigValue = number | string | boolean | (string | number)[];
export type ConfigType = "bool" | "int" | "single" | "multi" | "time";
