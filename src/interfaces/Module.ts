export interface ModuleResponse {
	/**
	 * 模块配置
	 */
	config: Record<string, ConfigValue>;
	/**
	 * 模块顺序
	 */
	order: string[];
	/**
	 * 模块信息
	 */
	info: Record<string, ModuleInfo>;
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
	config: Record<string, ConfigInfo>;
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
	candidates: Candidate[];
}

export interface Candidate {
	/**
	* 候选值
	*/
	value: ConfigValue;
	/**
	* 候选值描述
	*/
	display: string;
	/**
	* 信息
	*/
    tags: string[]
    /**
	* 昵称
	*/
    nickname?: string;
}

export type ConfigValue = number | string | boolean | (string | number)[];
export type ConfigType = "bool" | "int" | "single" | "multi" | "time" | "text" | "multi_search";
