/** DashBoard 与账号卡片共享：状态登记表/存取/通知/批次/工具栏控件（碎文件合并版） */

import { getAccountConfig, putAccountConfigs } from '@api/Account';
import type { Candidate, ConfigType, ConfigValue, ModuleResponse } from '@interfaces/Module';



/** 批量清理登记表：账号名 → 清理回调（注册方保证包 ref，调用方无参调用） */
/** 批量清理日常的注册表：alias → 该账号卡片的清理入口（DashBoard 全体清理按名调用） */
export const dailyCleanRegistry: Map<string, () => void | Promise<void>> = new Map();

/** 全局忙碌表（模块级真源）：互斥判定读它；UI 转圈由各页面本地状态自理（页面卸载即动作作废，无跨页同步） */
export const busyAccountsRef = new Set<string>();

/** busy 变更唯一入口：改表。UI 不订阅（还原旧貌：跨页不联动） */
export function patchBusy(alias: string, busy: boolean): void {
    if (busy) busyAccountsRef.add(alias);
    else busyAccountsRef.delete(alias);
}

export const DISPLAY_NAME_KEY = (alias: string) => 'autopcr_displayName_' + alias;

export function getDisplayName(alias: string): string {
    return safeGetItem(DISPLAY_NAME_KEY(alias)) || alias;
}

/** 每账号"弹结果"标记：该账号执行完自动弹出结果窗 */
export const POPUP_FLAG_KEY = (alias: string) => 'autopcr_popupResult_' + alias;

export function loadPopupFlag(alias: string): boolean {
    // 默认勾选：只有明确存过 'false'（用户关掉过）才静默
    return safeGetItem(POPUP_FLAG_KEY(alias)) !== 'false';
}

/** 「弹结果」总开关（工具栏勾选框），默认开 */
export const POPUP_MASTER_KEY = 'autopcr_popupResult';

/** 主页账号视图模式（表格/卡片） */
export const VIEW_MODE_KEY = 'accountViewMode';

/** 账号收藏（区服→功能名列表）存储键 */
export const favKey = (alias: string) => `autopcr_fav_${alias}`;

export function loadPopupMaster(): boolean {
    return safeGetItem(POPUP_MASTER_KEY) !== 'false';
}

/** 账号日常执行完成事件（无条件派发，监听端按通知开关过滤），载荷=账号名 */
export function emitDailyFinished(alias: string): void {
    try {
        window.dispatchEvent(new CustomEvent('autopcr_daily_finished', { detail: alias }));
    } catch {
        // 环境不支持 CustomEvent 时忽略
    }
}

/** 订阅账号日常执行完成事件；返回取消订阅函数 */
export function onDailyFinished(cb: (alias: string) => void): () => void {
    const listener = (e: Event): void => {
        const detail = (e as CustomEvent).detail as string | undefined;
        if (detail) cb(detail);
    };
    window.addEventListener('autopcr_daily_finished', listener);
    return () => {
        window.removeEventListener('autopcr_daily_finished', listener);
    };
}

/** 文字越多两侧越窄；3 个字以内保持默认内边距（图标/短按钮保持好点） */
export function textFitPadding(label: string): string | undefined {
    const len = Array.from(label).length;
    if (len <= 3) return undefined;
    if (len <= 5) return '0.5rem';
    return '0.25rem';
}

/** 默认账号名单，带版本号存本地 */
const BATCH_KEY = 'autopcr_batch_v1';

export function loadBatch(): string[] {
    try {
        const raw = safeGetItem(BATCH_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        const list = (parsed as { accounts?: unknown } | null)?.accounts;
        if (Array.isArray(list)) {
            return list.filter((x): x is string => typeof x === 'string');
        }
    } catch {
        return [];
    }
    return [];
}

export function saveBatch(accounts: string[]): void {
    try {
        localStorage.setItem(BATCH_KEY, JSON.stringify({ version: 1, accounts }));
    } catch {
        // 本地存储不可用则仅本次会话有效
    }
}

/** localStorage 读兜底：隐私模式/禁 cookie 场景访问 localStorage 即抛 SecurityError，读函数必须吞掉 */
export function safeGetItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/** localStorage 删除兜底：与 safeSetItem 同语义 */
export function safeRemoveItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // 本地存储不可用则忽略
    }
}
export function safeSetItem(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        // 本地存储不可用：返回 false 由调用方决定是否提示
        return false;
    }
}

/** 危险分区的显示名（后端约定）：快捷按钮 dangerous 标记、危险确认弹窗、Picker 染色共用此常量 */
export const DANGEROUS_AREA_NAME = '危险';

/** 批量运行虚拟账号名（后端约定）：全选/全体兜底/同步目标列表等处统一排除，单勾直打后端会 404 */
export const BATCH_RUNNER = 'BATCH_RUNNER';

/** 安全解析后端错误文案，避免 Blob/.text 抛错或 [object Object]（自 Config.tsx 迁入，通用工具） */
export async function getErrorDescription(err: unknown, fallback = '网络错误'): Promise<string> {
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    try {
        if (data == null) {
            if (err instanceof Error && err.message) return err.message;
            return fallback;
        }
        if (typeof Blob !== 'undefined' && data instanceof Blob) {
            const txt = await data.text();
            return txt || fallback;
        }
        if (typeof data === 'string') return data || fallback;
        if (typeof data === 'object') {
            try {
                return JSON.stringify(data);
            } catch {
                return fallback;
            }
        }
        return String(data);
    } catch {
        return fallback;
    }
}


/** 校验配置项：按 schema 类型严格校验值合法性（bool 只收 boolean；time 必须 hh:mm；multi 候选过滤），不合法返回 undefined（自 AccountCard/ConfigImportExport 双胞胎收簸，取严格语义） */
export function toCheckedConfigItem(
    type: ConfigType,
    candidates: Candidate[],
    value: unknown,
): ConfigValue | undefined {
    switch (type) {
        case 'bool':
            if (typeof value === 'boolean') return value;
            break;
        case 'single':
            if (typeof value === 'string' || typeof value === 'number') return value;
            break;
        case 'int':
            // 只收整数：小数对 int 型配置无意义（后端解析行为不明，宁拒不猜）
            if (typeof value === 'number' && Number.isInteger(value)) return value;
            break;
        case 'text':
            if (typeof value === 'string') return value;
            break;
        case 'time':
            // hh:mm 且范围合法（00-23:00-59）："99:99" 这种格式对但值错的拒绝
            if (
                typeof value === 'string' &&
                /^\d{2}:\d{2}$/.test(value) &&
                Number(value.slice(0, 2)) <= 23 &&
                Number(value.slice(3)) <= 59
            )
                return value;
            break;
        case 'multi':
        case 'multi_search': {
            if (!Array.isArray(value)) break;
            const checkedArray: (string | number)[] = [];
            for (const item of value) {
                if (typeof item !== 'number' && typeof item !== 'string') continue;
                if (candidates.find((v) => item === v.value)) checkedArray.push(item);
            }
            return checkedArray;
        }
    }
    return undefined;
}

/** 按模块 schema 过滤导入配置：只收 schema 内的键，逐项过 toCheckedConfigItem 校验 */
export function realImportByModule(
    module: ModuleResponse,
    configs: Record<string, ConfigValue>,
): { accepted: Record<string, ConfigValue>; schemaKeys: Set<string> } {
    const accepted: Record<string, ConfigValue> = {};
    const schemaKeys = new Set<string>(); // schema 实际接管的键：含被校验拒绝的（拒绝值不得经补充键复活）
    for (const moduleKey in module.info) {
        schemaKeys.add(moduleKey); // 开关键也属 schema：布尔特判拒掉的字符串 "true" 不再从补充键溜回来
        if (configs[moduleKey] !== undefined && typeof configs[moduleKey] === 'boolean') {
            accepted[moduleKey] = configs[moduleKey];
        }
        const moduleConf = module.info[moduleKey].config;
        for (const moduleConfKey in moduleConf) {
            schemaKeys.add(moduleConfKey);
            const moduleItem = moduleConf[moduleConfKey];
            const confItem = toCheckedConfigItem(moduleItem.config_type, moduleItem.candidates, configs[moduleConfKey]);
            if (confItem !== undefined) {
                accepted[moduleConfKey] = confItem;
            }
        }
    }
    return { accepted, schemaKeys };
}

/** 配置文件导入共享流程：解析 base64 → 逐区服 schema 校验 → PUT → 成功后写收藏标记。
 *  返回值区分三种结果：成功对象 / 抛出可展示错误。收藏写失败不抛（降级，由 favWriteFailed 通知调用方） */
export async function importConfigFile(opts: {
    alias: string;
    rawCfg: string;
    /** 区服名单来源：调用方各自获取（卡片现查 / 弹窗用已有 props） */
    areas: { key: string }[];
    /** 收藏写失败时回调（用于降级提示）；不传则静默 */
    onFavWriteFailed?: () => void;
}): Promise<void> {
    const { alias, rawCfg, areas, onFavWriteFailed } = opts;
    let configs: Record<string, Record<string, ConfigValue>>;
    try {
        const parsed: unknown = JSON.parse(decodeURIComponent(atob(rawCfg.trim())));
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            throw new Error('bad');
        }
        configs = parsed as Record<string, Record<string, ConfigValue>>;
    } catch {
        throw new Error('配置文件格式无效，请检查选取的配置文件。');
    }

    const configItems = await Promise.all(areas.map((area) => getAccountConfig(alias, area.key)));
    const uploadConfig: Record<string, ConfigValue> = {};
    const importedFav: Record<string, string[]> = {};

    // 阶段一：全区 schema 校验 + 收集 schema 接管键的「全区并集」。
    // 并集是必须的：uploadConfig 跨区扁平累积，若两区 schema 不一致，A 区被拒的 schema 键
    // 可能在阶段二被当成「补充键」经 B 区的局部 schemaKeys 放行（审计十 #11）
    const allSchemaKeys = new Set<string>();
    const areaAccepted: { areaKey: string; accepted: Record<string, ConfigValue> }[] = [];
    configItems.forEach((value, index) => {
        const areaKey = areas[index].key;
        const areaConfig = configs[areaKey];
        // 区服层形状守卫：字符串/数组是真值，直接迭代会把 "abc" 拆成 "0"/"1"/"2" 垃圾键直通 PUT
        if (typeof areaConfig !== 'object' || areaConfig === null || Array.isArray(areaConfig)) return;

        const { accepted, schemaKeys } = realImportByModule(value, areaConfig);
        areaAccepted.push({ areaKey, accepted });
        Object.assign(uploadConfig, accepted);
        schemaKeys.forEach((k) => allSchemaKeys.add(k));
    });

    // 阶段二：收藏标记 + schema 外补充键（用全区并集判定）。被校验拒绝的非法值
    // （"99:99"、1.5、字符串 "true"）在任何区都不得经补充键复活直通 PUT
    areas.forEach((area) => {
        const areaKey = area.key;
        const areaConfig = configs[areaKey];
        if (typeof areaConfig !== 'object' || areaConfig === null || Array.isArray(areaConfig)) return;

        for (const key in areaConfig) {
            if (key.startsWith('_fav_')) {
                importedFav[areaKey] = importedFav[areaKey] || [];
                if (areaConfig[key] === true) {
                    importedFav[areaKey].push(key.slice(5));
                }
            } else if (!allSchemaKeys.has(key) && uploadConfig[key] === undefined && areaConfig[key] !== undefined) {
                const v = areaConfig[key];
                if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                    uploadConfig[key] = v;
                }
            }
        }
    });

    if (Object.keys(uploadConfig).length === 0) {
        throw new Error('文件中没有可用配置，未做任何修改。');
    }
    // 全部成功后才写收藏（PUT 失败不覆盖现有收藏）；文件不含 _fav_（旧版导出）时不动收藏。
    // 收藏按「文件里出现的区服」合并写回：文件没覆盖的区服（如文件是别的号导出的）保留既有收藏，不整表替换
    await putAccountConfigs(alias, uploadConfig);
    if (Object.keys(importedFav).length > 0) {
        try {
            const raw = localStorage.getItem(favKey(alias));
            const existing = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
            localStorage.setItem(favKey(alias), JSON.stringify({ ...existing, ...importedFav }));
        } catch {
            onFavWriteFailed?.();
        }
    }
}

