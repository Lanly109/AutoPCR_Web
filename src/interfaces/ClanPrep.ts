export interface ClanPrepKnifeStat {
	usage: number;
	best: number;
	bosses: string[];
}

export interface ClanPrepUnit {
	unit_id: number;
	name: string;
	/** 按刀型(尾刀单列)拆分的统计，供前端按刀型筛选名单 */
	by_knife: Record<string, ClanPrepKnifeStat>;
	star: number | null;
}

/** 推荐刀一行：后端全量下发（不截断），勾选/排序/分组全部是前端显示行为 */
export interface KnifeRowData {
	sn: string;
	/** 阶段口径 B/C/DE（后端一次定死） */
	stage: string;
	/** BOSS位数字（1~5），解析不出为 null */
	boss: number | null;
	knife: KnifeType;
	damage: number;
	/** 分数倍率（伤害×倍率=分数），该阶段无倍率为 null */
	rate: number | null;
	/** 阵容名（可借出的行缺的人带"(借)"后缀） */
	names: string[];
	/** 成员 base id（组内去重判据） */
	members: number[];
	/** 是否借公会支援（恰好缺1人且支援里有） */
	borrow: boolean;
	/** 说明（首个视频标题） */
	text: string;
	/** 视频链接（后端只放行http(s)） */
	links: { text: string; url: string }[];
}

export interface ClanPrepResponse {
	updated_at: number;
	stale: boolean;
	period: string;
	box_ready: boolean;
	login_error: string;
	units: ClanPrepUnit[];
	/** 每阶段各boss位的分数倍率（伤害×倍率=分数） */
	stage_rates: Record<string, Record<string, number>>;
	/** 推荐刀全量数据：结果栏常驻渲染，筛选是纯前端行为 */
	knife_rows: KnifeRowData[];
}

export type KnifeType = '自动' | '半自动' | '手动' | '尾刀';
