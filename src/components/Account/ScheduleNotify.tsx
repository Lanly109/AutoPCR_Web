/**
 * 半月刊通知（原「周期通知」整体重构，审计十一后用户裁决）：
 * - 数据源：后端 /daily/api/schedule（半月刊结构化日程，{key, category, start_time, end_time, description}）
 * - 通知触发：勾选类别的条目在开始日当天，按设置的 HH:mm 弹浏览器通知（每日至多一次，key 去重）
 * - 「正在进行」常驻：下拉菜单里显示勾选类别中当前开放的所有条目（MM:DD-MM:DD，不显时分）
 * - 刷新时机：本地缓存无过期条目时每天至多拉一次；有活动结束（end < today）立即重拉
 * - 旧警报轮询已整体移除（emitDailyFinished 事件链保留给其他消费者）
 */
import { Box, Button, Flex, HStack, Popover, Stack, Text } from '@chakra-ui/react';
import React, { useEffect, useMemo, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { API, Fetch } from '@api/APIUtils';
import { getClanPrep, postAccountAreaSingle, putAccountConfigs } from '@api/Account';
import { ModuleResult } from '@interfaces/ModuleResult';
import { busyAccountsRef, patchBusy, safeGetItem, safeSetItem } from './accountShared';
import { MAX_RESULTS, StoredResult, buildTargetUnitConfigs, loadKnifeSel, loadStoredResults, readDataCache, resultsStorageKey } from '../ClanPrep/KnifePlan';
import { ConfigValue } from '@interfaces/Module';
import { toaster } from '../ui/toaster';
import { Checkbox } from '../../components/ui/checkbox';

// 会战准备强化目标圈定参数（与面板共用同一套持久化键）
export const TARGET_TOP_USAGE_KEY = 'clanprep.targetTopUsage';
export const TARGET_TOP_N_KEY = 'clanprep.targetTopN';
export const TARGET_BOSS_TOP3_KEY = 'clanprep.targetBossTop3';

/** 后端 schedule_entries 单条（与半月刊渲染同源） */
export interface ScheduleEntry {
    key: string;
    /** 半月刊类别名：公会战/扭蛋/庆典/活动/新斗技场/... */
    category: string;
    start_time: string; // YYYY/MM/DD
    end_time: string;   // YYYY/MM/DD
    description: string;
}

const PREFS_KEY = 'autopcr_schedule_notify_v1';
const NOTIFIED_KEY = 'autopcr_schedule_notified_v1';

/* ==================== 会战准备自动链路（常驻，不依赖面板打开） ====================
 * 会战开始日到达提醒时刻 → 自动拉取作业数据 + 按顺序执行勾选的练度任务。
 * 触发：通知成功弹出后（勾选了「公会战」）与挂载补检；限流=每天至多1次+距手动拉取2小时让路。
 * 执行结果写入本地留存（resultsV2.<账号>），面板打开时自然显示。 */
const AUTO_FORCED_DAY_KEY = 'clanprep.autoForcedDay';
const LAST_FORCE_AT_KEY = 'clanprep.lastForceAt';
export const AUTO_TASKS_KEY = 'clanprep.autoTasks';
const AUTO_PULL_KEY = 'clanprep.autoPull';
/** 自动执行顺序固定：先星级、再练度、最后装备 */
export const AUTO_TASK_ORDER = ['clan_prep_star5', 'clan_prep_max_promote', 'clan_prep_cb_ex'] as const;

/** 手动/自动 force 拉作业数据统一记时间戳（自动更新据此执行2小时让路） */
export const noteForceFetch = () => safeSetItem(LAST_FORCE_AT_KEY, String(Date.now()));

/** 读取自动执行任务勾选（localStorage） */
export const loadAutoTasks = (): string[] => {
    try {
        const a: unknown = JSON.parse(safeGetItem(AUTO_TASKS_KEY) ?? '[]');
        return Array.isArray(a) ? a.filter((t): t is string => typeof t === 'string') : [];
    } catch { return []; }
};

/** 执行结果追加到本地留存（无 React 版，自动链路结果面板打开后可见） */
const appendStored = (alias: string, entry: StoredResult) => {
    const next = [entry, ...loadStoredResults(alias)].slice(0, MAX_RESULTS);
    safeSetItem(resultsStorageKey(alias), JSON.stringify(next));
};

/** 无UI版模块执行：失败toast/console后由调用方继续后续任务 */
const runModule = async (alias: string, moduleKey: string, title: string, configs?: Record<string, ConfigValue>): Promise<void> => {
    patchBusy(alias, true);
    try {
        if (configs && Object.keys(configs).length > 0) {
            await putAccountConfigs(alias, configs);
        }
        // do_single响应的url即最新结果详情地址(后端push_result头插)
        const list = await postAccountAreaSingle(alias, moduleKey);
        const url = list?.[0]?.url;
        if (!url) throw new Error('未获取到结果');
        const res = (await Fetch.get<ModuleResult>(`${url}?text=true`)).data;
        appendStored(alias, {
            title,
            moduleKey,
            status: res.status,
            log: res.log ?? '',
            table: res.table ?? null,
            time: Date.now(),
        });
    } catch (e) {
        const desc = e instanceof Error ? e.message : String(e);
        toaster.create({ type: 'error', title: `自动${title}失败`, description: desc });
        console.warn(`[clanprep] 自动${title}失败:`, e);
    } finally {
        patchBusy(alias, false);
    }
};

let clanPrepAutoRunning = false;

/** 会战准备自动链路入口：自动拉取作业数据（需勾选"自动"，2小时让路）+ 按顺序执行勾选任务。幂等（每天至多1次），可安全重复调用 */
export async function runClanPrepAutoTasks(): Promise<void> {
    if (clanPrepAutoRunning) return;
    const alias = safeGetItem('clanprep.lastAccount') ?? '';
    if (!alias) return;
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const day = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
    if (safeGetItem(AUTO_FORCED_DAY_KEY) === day) return;
    const last = Number(safeGetItem(LAST_FORCE_AT_KEY) ?? 0);
    const forceAllowed = !(Number.isFinite(last) && Date.now() - last < 2 * 60 * 60 * 1000);
    const tasks = AUTO_TASK_ORDER.filter(k => loadAutoTasks().includes(k));
    const pull = safeGetItem(AUTO_PULL_KEY) === '1';
    if ((!pull || !forceAllowed) && tasks.length === 0) return;
    // 账号忙（手动任务/其他页面占用）：1分钟后重试，不烧当日key
    if (busyAccountsRef.has(alias)) {
        setTimeout(() => { void runClanPrepAutoTasks(); }, 60 * 1000);
        return;
    }
    clanPrepAutoRunning = true;
    safeSetItem(AUTO_FORCED_DAY_KEY, day);
    try {
        let latestData = readDataCache(alias);
        // 自动拉取需勾选"自动"且距手动拉取≥2小时；拉取失败不阻断任务
        if (pull && forceAllowed) {
            noteForceFetch();
            try {
                latestData = await getClanPrep(alias, true, true);
            } catch (e) {
                // 拉取失败不阻断任务（模块侧 _resolve_targets 走磁盘缓存，不依赖本次刷新）
                console.warn('[clanprep] 自动拉取作业数据失败:', e);
            }
        }
        // 强化目标圈定与面板共用一套参数（localStorage）：勾选任一条件则下发圈定的目标列表
        const targetConfigs = buildTargetUnitConfigs(latestData, loadKnifeSel(), {
            topUsage: safeGetItem(TARGET_TOP_USAGE_KEY) !== '0',
            topN: Number(safeGetItem(TARGET_TOP_N_KEY)) || 10,
            bossTop3: safeGetItem(TARGET_BOSS_TOP3_KEY) === '1',
        });
        for (const key of tasks) {
            const title = key === 'clan_prep_star5' ? '一键拉到5星' : key === 'clan_prep_max_promote' ? '拉到最高练度' : '一键穿会战EX装';
            await runModule(alias, key, title, targetConfigs);
        }
    } finally {
        clanPrepAutoRunning = false;
    }
}

export interface ScheduleNotifyPrefs {
    enabled: boolean;
    /** 勾选的通知类别（半月刊 category 名） */
    categories: string[];
    /** 开始日当天的提醒时刻（本地时区 HH:mm，24h 制） */
    notifyTime: string;
}

const DEFAULT_PREFS: ScheduleNotifyPrefs = { enabled: false, categories: [], notifyTime: '08:00' };

/** 旧类别名 → 新类别名（口径调整后旧存档不静默失效）：女神祭并入季卡；季卡驾车游拆回季卡+驾车游 */
const LEGACY_CATEGORY_MAP: Record<string, string[]> = {
    '女神祭': ['季卡'],
    '季卡驾车游': ['季卡', '驾车游'],
};

export function loadSchedulePrefs(): ScheduleNotifyPrefs {
    try {
        const raw = safeGetItem(PREFS_KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<ScheduleNotifyPrefs>) : null;
        const stored = Array.isArray(parsed?.categories) ? parsed.categories.filter((x): x is string => typeof x === 'string') : [];
        const categories: string[] = [];
        for (const c of stored) {
            for (const mapped of LEGACY_CATEGORY_MAP[c] ?? [c]) {
                if (!categories.includes(mapped)) categories.push(mapped);
            }
        }
        return {
            enabled: !!parsed?.enabled,
            categories,
            notifyTime: typeof parsed?.notifyTime === 'string' && /^\d{2}:\d{2}$/.test(parsed.notifyTime) ? parsed.notifyTime : DEFAULT_PREFS.notifyTime,
        };
    } catch {
        return { ...DEFAULT_PREFS };
    }
}

export function saveSchedulePrefs(prefs: ScheduleNotifyPrefs): boolean {
    return safeSetItem(PREFS_KEY, JSON.stringify(prefs));
}

/** 会战准备自动更新条件：通知开启+勾选「公会战」+当天开始+已到提醒时刻（供面板挂载时补检；watcher 路径走事件） */
export function clanPrepAutoRefreshDue(): boolean {
    const prefs = loadSchedulePrefs();
    if (!prefs.enabled || !prefs.categories.includes('公会战')) return false;
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (hm < prefs.notifyTime) return false;
    return (scheduleCache ?? []).some((e) => e.category === '公会战' && e.start_time === todayStr());
}

function loadNotified(): Record<string, string> {
    try {
        const raw = safeGetItem(NOTIFIED_KEY);
        return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
        return {};
    }
}

function saveNotified(map: Record<string, string>): void {
    safeSetItem(NOTIFIED_KEY, JSON.stringify(map));
}

/** 本地今天 YYYY/MM/DD（与后端 start_time 字符串直接比较，不做时区换算——后端即本地时区时间戳） */
function todayStr(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}

/** 全部类别的固定清单与展示顺序（面板勾选区固定全量显示，与数据有无无关；排序为用户裁决） */
const CATEGORY_ORDER = [
    '深渊讨伐战', '新斗技场',
    '公会战', '活动', '扭蛋', '庆典',
    '免费十连', '赛马', '季卡', '驾车游',
    '特别地下城', '次元断层',
];

function categorySortIndex(c: string): number {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
}

/** 纯噪声条目（用户裁决不列）：玩家经验值加成、公会战排名公示 */
function isNoiseEntry(e: ScheduleEntry): boolean {
    if (e.category === '公会战排名公示') return true;
    return /玩家经验值/.test(e.description);
}

/** YYYY/MM/DD → MM/DD（面板展示只到月日） */
function shortDate(d: string): string {
    const m = /^\d{4}\/(\d{2}\/\d{2})$/.exec(d);
    return m ? m[1] : d;
}

/** 拉取日程（后端未部署 /schedule 时 fetch 404 → 抛错由调用方静默） */
/** 后端条目归一化：女神祭并入季卡；丢弃纯噪声（玩家经验值加成/公会战排名公示——类别也不出现在面板）；fes 扭蛋折叠 */
function normalizeEntry(e: ScheduleEntry): ScheduleEntry | null {
    if (isNoiseEntry(e)) return null;
    // 类别删除（用户裁决）：斗技场/登录奖励不再出现
    if (e.category === '斗技场' || e.category === '登录奖励') return null;
    // 女神祭并入季卡（用户裁决）：无需后端配合——「从活动拆出」本就是前端口径，现在改归季卡
    if (e.category === '活动' && /女神祭/.test(e.description)) {
        return { ...e, category: '季卡' };
    }
    // 扭蛋名单折叠（用户裁决）：fes| 前缀（gacha_name 含 フェス/FES 的池）→ up 首人 fes扭蛋；
    // 普通池 up 名单 → 只显前两名，其余计「……等N人」
    if (e.category === '扭蛋' && e.description.startsWith('up ')) {
        const names = e.description.slice(3).split(',').map((s) => s.trim()).filter(Boolean);
        if (names.length > 2) {
            return { ...e, description: `up ${names[0]},${names[1]}……等${names.length}人` };
        }
        return e;
    }
    if (e.category === '扭蛋' && e.description.startsWith('fes|')) {
        const body = e.description.slice(4);
        if (body.startsWith('up ')) {
            const names = body.slice(3).split(',').map((s) => s.trim()).filter(Boolean);
            if (names.length > 0) {
                return { ...e, description: `up ${names[0]} fes扭蛋` };
            }
        }
        // exchange_id=0 的池（description=官方池名）：剥掉标记只显池名
        return { ...e, description: body };
    }
    return e;
}

async function fetchSchedule(): Promise<ScheduleEntry[]> {
    const res = await API.get<ScheduleEntry[]>('/schedule');
    const raw = Array.isArray(res?.data) ? res.data : [];
    return raw.map(normalizeEntry).filter((e): e is ScheduleEntry => e !== null);
}

/**
 * 面板滚动无缝接力（用户手感要求）：内层滚到顶/底后，滚轮剩余滚动量立即转嫁给外层滚动容器，
 * 不经过浏览器默认的链式滚动（默认实现会先顿一拍再链出）。
 * 内层还能滚时完全交给浏览器，不做任何干预。
 * React 的 onWheel 是被动监听，preventDefault 无效，故用 ref + 原生非被动监听。
 * 转嫁目标：从面板 Body 沿祖先向上找第一个「可滚动」（scrollHeight > clientHeight）的容器；
 * daily 布局的页面滚动发生在 <Flex overflow='auto'> 内容区，不是 window。
 */
export function useSeamlessScrollRelay() {
    // 必须用回调 ref 而非 [] 依赖 effect：Popover lazyMount 下 Body 首次打开才挂载，
    // effect 首跑时 ref 是 null 且 ref 赋值不触发重跑，监听器会永远注册不上
    const cleanupRef = React.useRef<(() => void) | null>(null);
    const scrollBodyRef = React.useCallback((el: HTMLDivElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current = null;
        if (!el) return;
        const findOuterScroller = (): HTMLElement | null => {
            let p = el.parentElement;
            while (p) {
                if (p.scrollHeight > p.clientHeight) {
                    const oy = getComputedStyle(p).overflowY;
                    if (oy === 'auto' || oy === 'scroll') return p;
                }
                p = p.parentElement;
            }
            return document.scrollingElement as HTMLElement | null;
        };
        const onWheel = (e: WheelEvent): void => {
            const delta = e.deltaY;
            if (delta === 0) return;
            const atTop = el.scrollTop <= 0;
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
            if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
                e.preventDefault();
                const outer = findOuterScroller();
                if (outer) outer.scrollBy({ top: delta, behavior: 'auto' });
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        cleanupRef.current = () => el.removeEventListener('wheel', onWheel);
    }, []);
    React.useEffect(() => () => cleanupRef.current?.(), []);
    return scrollBodyRef;
}

/* ==================== 全局 watcher（挂 _sidebar 布局层） ==================== */

let scheduleCache: ScheduleEntry[] | null = null;
let scheduleCacheDay = '';

/** 勾选类别 × 今天的开启条目 → 浏览器通知。返回 'notified'=已提醒 | 'idle'=今天无事/已提醒过 | 'failed'=该弹没弹成（权限未授权等，触发重试且不写已通知记录，授权后可补弹） */
function notifyTodaysStarts(entries: ScheduleEntry[], prefs: ScheduleNotifyPrefs): 'notified' | 'idle' | 'failed' {
    // 提醒时刻闸：未到用户设置的 HH:mm 不检查（否则打开页面即弹，时刻设置形同虚设）
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (hm < prefs.notifyTime) return 'idle';
    const today = todayStr();
    const targets = entries.filter((e) => prefs.categories.includes(e.category) && e.start_time === today);
    if (targets.length === 0) return 'idle';
    const notified = loadNotified();
    // 旧记录清理：只保留 90 天内的记录（值=标记日），防无限膨胀
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    for (const k of Object.keys(notified)) {
        const ts = Number((notified[k] as string).split('|')[1] ?? 0);
        if (ts < cutoff) delete notified[k];
    }
    // 记录值形如 "notified|<ts>"（老数据可能裸 "notified"），必须按前缀判，严格等值会把已通知的当新条目重复弹
    const fresh = targets.filter((e) => !(notified[e.key] ?? '').startsWith('notified'));
    if (fresh.length === 0) return 'idle';
    const mark = () => {
        fresh.forEach((e) => { notified[e.key] = `notified|${Date.now()}`; });
        saveNotified(notified);
        // 会战准备联动：勾选了「公会战」且当天开始、已到提醒时刻 → 调常驻自动链路
        // （拉取作业数据+按顺序执行勾选任务，不依赖面板打开；内部有每天至多1次+2小时让路限流）
        if (targets.some((e) => e.category === '公会战')) {
            void runClanPrepAutoTasks();
        }
    };
    const body = fresh.map((e) => `${e.category}：${e.description}`).join('\n');
    try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('AutoPCR 今日开启', { body });
            mark();
            return 'notified';
        }
        if (typeof Notification === 'undefined') {
            // 环境不支持通知 API：console 降级即算完成（重试也不会有权限）
            console.info('[AutoPCR 今日开启]', body);
            mark();
            return 'notified';
        }
        // 权限未授权：不算完成，等待重试（用户中途授权后可补弹）
        console.info('[AutoPCR 今日开启]（通知权限未授权，稍后重试）', body);
        return 'failed';
    } catch {
        return 'failed';
    }
}

/** 距下一次提醒时刻（prefs.notifyTime）的毫秒数；今天的已过则算明天同一时刻 */
function msUntilNextNotifyTime(): number {
    const prefs = loadSchedulePrefs();
    const now = new Date();
    const [h, m] = prefs.notifyTime.split(':').map(Number);
    const next = new Date(now);
    next.setHours(h || 0, m || 0, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
}

export function ScheduleNotifyWatcher(): null {
    useEffect(() => {
        let cancelled = false;
        let timer: number | null = null;
        // 调度纪律（用户裁决）：每天只在提醒时刻巡检一次；只有那次「该弹通知没弹成」（权限未授权/拉日程失败）才退回10分钟重试
        const schedule = (delayMs: number) => {
            if (cancelled) return;
            if (timer !== null) window.clearTimeout(timer);
            timer = window.setTimeout(() => void tick(), delayMs);
        };
        const tick = async () => {
            const prefs = loadSchedulePrefs();
            if (!prefs.enabled) { schedule(msUntilNextNotifyTime()); return; }
            const today = todayStr();
            // 刷新策略：缓存是今天的且没有「已结束但仍在缓存里」的勾选条目 → 不拉（活动结束时才更新一次）
            if (scheduleCache && scheduleCacheDay === today) {
                const stale = scheduleCache.some((e) => prefs.categories.includes(e.category) && !isNoiseEntry(e) && e.end_time < today);
                if (!stale) {
                    const r = notifyTodaysStarts(scheduleCache, prefs);
                    schedule(r === 'failed' ? 10 * 60 * 1000 : msUntilNextNotifyTime());
                    return;
                }
            }
            try {
                const entries = await fetchSchedule();
                if (cancelled) return;
                scheduleCache = entries;
                scheduleCacheDay = today;
                const r = notifyTodaysStarts(entries, prefs);
                schedule(r === 'failed' ? 10 * 60 * 1000 : msUntilNextNotifyTime());
            } catch {
                // 后端未部署 /schedule 或网络失败：10分钟后重试
                schedule(10 * 60 * 1000);
            }
        };
        void tick();
        // 挂载补检：页面在提醒时刻之后才打开、当天的会战自动链路还没跑过 → 补跑（runClanPrepAutoTasks 幂等）
        if (clanPrepAutoRefreshDue()) void runClanPrepAutoTasks();
        return () => {
            cancelled = true;
            if (timer !== null) window.clearTimeout(timer);
        };
    }, []);
    return null;
}

/* ==================== 下拉菜单（设置 + 正在进行常驻） ==================== */

export function ScheduleNotifySettings() {
    const [prefs, setPrefs] = useState<ScheduleNotifyPrefs>(() => loadSchedulePrefs());
    const [entries, setEntries] = useState<ScheduleEntry[]>(() => scheduleCache ?? []);
    const [loadFailed, setLoadFailed] = useState(false);
    const scrollBodyRef = useSeamlessScrollRelay();

    useEffect(() => {
        saveSchedulePrefs(prefs);
    }, [prefs]);

    // 打开面板时刷新「正在进行」列表：缓存优先，没有再拉
    const refresh = React.useCallback(async () => {
        if (scheduleCache) {
            setEntries(scheduleCache);
            return;
        }
        try {
            const list = await fetchSchedule();
            scheduleCache = list;
            scheduleCacheDay = todayStr();
            setEntries(list);
            setLoadFailed(false);
        } catch {
            setLoadFailed(true);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const today = todayStr();
    /** 勾选类别中当前开放的条目（start<=today<=end），按类别分组 */
    const ongoing = useMemo(() => {
        // 展示口径（用户裁决）：结束日期晚于今天即列出；纯噪声（玩家经验值加成/公会战排名公示）不列
        const chosen = entries.filter((e) =>
            prefs.categories.includes(e.category)
            && e.end_time > today
            && !isNoiseEntry(e),
        );
        const byCat = new Map<string, ScheduleEntry[]>();
        for (const e of chosen) {
            const list = byCat.get(e.category) ?? [];
            list.push(e);
            byCat.set(e.category, list);
        }
        return Array.from(byCat.entries()).sort((a, b) => categorySortIndex(a[0]) - categorySortIndex(b[0]));
    }, [entries, prefs.categories, today]);

    const allCategories = useMemo(() => [...CATEGORY_ORDER], []);

    return (
        <Popover.Root lazyMount positioning={{ placement: 'bottom-end', gutter: 4 }}>
            <Popover.Trigger asChild>
                <Box
                    borderWidth="1px"
                    borderColor="currentColor"
                    borderRadius="md"
                    px={2}
                    h="2rem"
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexShrink={0}
                    cursor="pointer"
                    color="orange.500"
                    _hover={{ bg: 'orange.subtle' }}
                    title="半月刊日程通知：勾选关注的类别，开启日当天按设定时刻提醒；面板内常驻显示进行中的日程"
                >
                    <FiBell />
                    <Text color="orange.500" css={{ cursor: 'pointer', userSelect: 'none' }}>
                        日程通知
                    </Text>
                </Box>
            </Popover.Trigger>
            <Popover.Positioner>
                    <Popover.Content
                        width="340px"
                        maxH="min(70vh, var(--available-height, 70vh))"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                        zIndex={1400}
                    >
                    <Popover.Body ref={scrollBodyRef} p={3} overflowY="auto" flex="1 1 auto" minH="0">
                        <Stack gap={3}>
                            {/* 进行中（勾选类别）常驻区——唯一滚动区 */}
                            <Box>
                                <Text fontSize="sm" fontWeight="bold" mb={1}>正在进行</Text>
                                {ongoing.length === 0 ? (
                                    <Text fontSize="xs" color="fg.muted">
                                        {loadFailed ? '日程获取失败（后端未部署 /schedule？）' : prefs.categories.length === 0 ? '下方勾选类别后，这里显示进行中的日程' : '勾选类别暂无进行中日程'}
                                    </Text>
                                ) : (
                                    <Stack gap={1}>
                                        {ongoing.map(([cat, list]) => (
                                            <Box key={cat}>
                                                <Text fontSize="xs" fontWeight="bold" color="orange.500">{cat}</Text>
                                                {list.map((e) => (
                                                    <Text key={e.key} fontSize="xs" color="fg.muted" title={e.description}>
                                                        {e.description}　{shortDate(e.start_time)} - {shortDate(e.end_time)}
                                                    </Text>
                                                ))}
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    </Popover.Body>
                    {/* 固定底栏：通知开关/提醒时刻/类别勾选（不随上进行中列表滚动） */}
                    <Box px={3} py={2} borderTopWidth="1px" borderTopColor="border.subtle" flexShrink={0}>
                        <Stack gap={2}>
                            {/* 通知开关 + 提醒时刻 */}
                            <HStack gap={3}>
                                <Checkbox
                                    checked={prefs.enabled}
                                    onCheckedChange={(details) => {
                                        const next = !!details.checked;
                                        if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                                            // 不 await 权限请求：浏览器权限气泡期间 await 挂着、勾选框不动，
                                            // 用户没注意到气泡时「开启」就像卡死（关闭不弹权限所以秒回）。
                                            // 勾选立即回显；权限结果由通知触发时再查（未授权走 console 降级）
                                            try {
                                                const p = Notification.requestPermission() as unknown as Promise<unknown> | undefined;
                                                p?.catch?.(() => {});
                                            } catch {
                                                // 老浏览器回调式 API：忽略，通知触发时再降级
                                            }
                                        }
                                        setPrefs((prev) => ({ ...prev, enabled: next }));
                                    }}
                                    colorPalette="orange"
                                    size="md"
                                >
                                    开启通知
                                </Checkbox>
                                <HStack gap={1} title="开始日当天的提醒时刻（本地时间）">
                                    <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">提醒时刻</Text>
                                    <input
                                        type="time"
                                        value={prefs.notifyTime}
                                        onChange={(ev) => {
                                            const v = ev.target.value;
                                            if (/^\d{2}:\d{2}$/.test(v)) setPrefs((prev) => ({ ...prev, notifyTime: v }));
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid currentColor',
                                            borderRadius: 4,
                                            color: 'inherit',
                                            fontSize: '12px',
                                            padding: '1px 4px',
                                        }}
                                    />
                                </HStack>
                            </HStack>
                            {/* 类别勾选 */}
                            <Box>
                                <Text fontSize="sm" fontWeight="bold" mb={1}>通知类别</Text>
                                {allCategories.length === 0 ? (
                                    <Text fontSize="xs" color="fg.muted">{loadFailed ? '日程获取失败' : '暂无日程数据'}</Text>
                                ) : (
                                    <Flex flexWrap="wrap" gap={2}>
                                        {allCategories.map((cat) => (
                                            <Checkbox
                                                key={cat}
                                                checked={prefs.categories.includes(cat)}
                                                onCheckedChange={(details) => {
                                                    const on = !!details.checked;
                                                    setPrefs((prev) => ({
                                                        ...prev,
                                                        categories: on ? [...prev.categories, cat] : prev.categories.filter((c) => c !== cat),
                                                    }));
                                                }}
                                                colorPalette="orange"
                                                size="md"
                                            >
                                                {cat}
                                            </Checkbox>
                                        ))}
                                    </Flex>
                                )}
                            </Box>
                            {loadFailed && (
                                <Button size="xs" variant="outline" onClick={() => { scheduleCache = null; void refresh(); }}>
                                    重新获取日程
                                </Button>
                            )}
                        </Stack>
                    </Box>
                </Popover.Content>
            </Popover.Positioner>
        </Popover.Root>
    );
}
