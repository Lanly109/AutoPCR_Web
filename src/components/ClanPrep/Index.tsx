import {
    Badge,
    Box,
    Button,
    Flex,
    Link,
    NativeSelect,
    Table,
    Text,
    VStack,
} from '@chakra-ui/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import {
    getClanPrep,
    getUserInfo,
    postAccountAreaSingle,
    putAccountConfigs,
} from '@api/Account'
import { Fetch } from '@api/APIUtils'
import { AccountInfo } from '@interfaces/UserInfo'
import { ClanPrepResponse, ClanPrepUnit, KnifeType } from '@interfaces/ClanPrep'
import { ModuleResult } from '@interfaces/ModuleResult'
import { ConfigValue } from '@interfaces/Module'
import { TableResult } from '../Account/TableResult'
import { busyAccountsRef, getErrorDescription, patchBusy, safeGetItem, safeSetItem } from '../Account/accountShared'
import {
    AUTO_TASKS_KEY,
    TARGET_BOSS_TOP3_KEY,
    TARGET_TOP_N_KEY,
    TARGET_TOP_USAGE_KEY,
    loadAutoTasks,
    noteForceFetch,
    useSeamlessScrollRelay,
} from '../Account/ScheduleNotify'
import { Switch as CuiSwitch } from '../ui/switch'
import { Checkbox } from '../ui/checkbox'
import { toaster } from '../ui/toaster'
import KnifeSections, {
    KNIFE_TYPES,
    MAX_RESULTS,
    STAGE_ORDER,
    STATUS_PALETTE,
    SortKey,
    StoredResult,
    buildTargetUnitConfigs,
    legacyResultsKey,
    loadGroupCounts,
    loadKnifeSel,
    loadStoredResults,
    readDataCache,
    resultsStorageKey,
    saveKnifeSel,
    writeDataCache,
} from './KnifePlan'


const ACCOUNT_STORAGE_KEY = 'clanprep.lastAccount';
const STAGE_SEL_STORAGE_KEY = 'clanprep.stageSel';
const GROUP_COUNTS_STORAGE_KEY = 'clanprep.groupCounts';
const BOSS_SEL_STORAGE_KEY = 'clanprep.bossSel';
const SORT_KEY_STORAGE_KEY = 'clanprep.sortKey';
const USE_SUPPORT_STORAGE_KEY = 'clanprep.useSupport';
const AUTO_PULL_KEY = 'clanprep.autoPull';
// 三个强化任务的 units 配置键：执行时按"强化目标"圈定统一覆盖
const TARGET_UNIT_KEYS: Record<string, string> = {
    clan_prep_star5: 'clan_prep_star5_units',
    clan_prep_max_promote: 'clan_prep_promote_units',
    clan_prep_cb_ex: 'clan_prep_cb_ex_units',
};

export default function ClanPrepPanel() {
    const [accounts, setAccounts] = useState<AccountInfo[]>([]);
    const [account, setAccount] = useState<string>('');
    const [data, setData] = useState<ClanPrepResponse | null>(null);
    const [loadError, setLoadError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    // 内嵌执行结果（本地留存，新在上）
    const [results, setResults] = useState<StoredResult[]>([]);
    // 推荐刀结果的阶段单选（空=全部），localStorage持久化
    const [stageSel, setStageSel] = useState<string>(() => {
        const v = safeGetItem(STAGE_SEL_STORAGE_KEY);
        return v && STAGE_ORDER.includes(v) ? v : '';
    });
    const resultsRef = useRef<StoredResult[]>([]);
    // 并发互斥的真实判定源（ref：异步回调里不取旧闭包值）
    const busyRef = useRef(false);
    const loadingRef = useRef(false);
    // 拉取序号：快速切换账号时丢弃过期响应；accountRef防止异步回调把旧账号数据写进新账号视图
    const loadSeqRef = useRef(0);
    const accountRef = useRef('');

    // 刀型多选（同时筛选名单表与推荐刀结果），localStorage持久化，至少保留一个
    const [knifeSel, setKnifeSel] = useState<Record<KnifeType, boolean>>(loadKnifeSel);
    const toggleKnife = (k: KnifeType) => {
        keepScroll();
        // 尾刀与其他三个刀型互斥：点尾刀=只保留尾刀；点其他=自动取消尾刀
        if (k === '尾刀') {
            if (knifeSel['尾刀']) {
                toaster.create({ type: 'warning', title: '至少保留一种刀型' });
                return;
            }
            const next = { '自动': false, '半自动': false, '手动': false, '尾刀': true };
            setKnifeSel(next);
            saveKnifeSel(next);
            return;
        }
        const next = { ...knifeSel, '尾刀': false, [k]: !knifeSel[k] };
        if (!KNIFE_TYPES.some(t => next[t])) {
            toaster.create({ type: 'warning', title: '至少保留一种刀型' });
            return;
        }
        setKnifeSel(next);
        saveKnifeSel(next);
    };
    const changeStageSel = (f: string) => {
        keepScroll();
        const next = stageSel === f ? '' : f;
        setStageSel(next);
        safeSetItem(STAGE_SEL_STORAGE_KEY, next);
    };
    // BOSS筛选：[] = 综合(全部BOSS)单选；12345多选、与综合互斥，和阶段/刀型一样参与即时重算
    const [bossSel, setBossSel] = useState<number[]>(() => {
        try {
            const arr: unknown = JSON.parse(safeGetItem(BOSS_SEL_STORAGE_KEY) ?? 'null');
            if (Array.isArray(arr)) return arr.filter(n => typeof n === 'number' && n >= 1 && n <= 5);
        } catch { /* 坏数据走默认 */ }
        return [];
    });
    const changeBossSel = (n: number) => {
        keepScroll();
        const next = bossSel.includes(n) ? bossSel.filter(x => x !== n) : [...bossSel, n];
        setBossSel(next);
        safeSetItem(BOSS_SEL_STORAGE_KEY, JSON.stringify(next));
    };
    const clearBossSel = () => {
        keepScroll();
        setBossSel([]);
        safeSetItem(BOSS_SEL_STORAGE_KEY, '[]');
    };
    // 排刀排序口径：分数(伤害×倍率)或伤害，持久化
    const [sortKey, setSortKey] = useState<SortKey>(() => (safeGetItem(SORT_KEY_STORAGE_KEY) === 'damage' ? 'damage' : 'score'));
    const changeSortKey = (k: SortKey) => {
        keepScroll();
        setSortKey(k);
        safeSetItem(SORT_KEY_STORAGE_KEY, k);
    };
    // 支援开关：默认开，持久化（'1'/'0'，坏数据回落开）
    const [knifeUseSupport, setKnifeUseSupport] = useState<boolean>(() => safeGetItem(USE_SUPPORT_STORAGE_KEY) !== '0');
    const changeKnifeUseSupport = (v: boolean) => {
        keepScroll();
        setKnifeUseSupport(v);
        safeSetItem(USE_SUPPORT_STORAGE_KEY, v ? '1' : '0');
    };
    // 推荐刀结果显示开关：清除后隐藏常驻结果，重新拉取数据或切换账号后自动恢复
    const [knifeViewCleared, setKnifeViewCleared] = useState(false);
    // 推荐刀组数：每阶段独立取值（三个下拉互不同步），localStorage持久化，缺项/非法值回落3
    const [groupCounts, setGroupCounts] = useState<Record<string, number>>(loadGroupCounts);
    const changeGroupCount = (stage: string, n: number) => {
        keepScroll();
        const next = { ...groupCounts, [stage]: n };
        setGroupCounts(next);
        safeSetItem(GROUP_COUNTS_STORAGE_KEY, JSON.stringify(next));
    };
    // 名单表排序：默认作业数降序
    const [sortState, setSortState] = useState<{ key: 'usage' | 'best'; dir: 'desc' | 'asc' }>({ key: 'usage', dir: 'desc' });

    const accountBusy = busy || loading;

    // 筛选变化时保持滚动高度：点筛选按钮记录当前滚动位置，重渲染后恢复，视口不跳
    const scrollRef = useRef<HTMLDivElement>(null);
    const savedTopRef = useRef(0);
    const keepScroll = () => { savedTopRef.current = scrollRef.current?.scrollTop ?? 0; };
    // 名单表滚动接力：到底/到顶后滚轮剩余量无缝转嫁给外层滚动容器（日程通知面板同款）
    const rosterScrollRef = useSeamlessScrollRelay();
    useLayoutEffect(() => {
        if (savedTopRef.current > 0 && scrollRef.current) {
            scrollRef.current.scrollTop = savedTopRef.current;
            savedTopRef.current = 0;
        }
    }, [knifeSel, stageSel, bossSel, sortKey, knifeUseSupport, groupCounts]);

    useEffect(() => {
        void (async () => {
            try {
                const info = await getUserInfo();
                const list = info.accounts ?? [];
                setAccounts(list);
                const saved = safeGetItem(ACCOUNT_STORAGE_KEY);
                const names = list.map(a => a.name);
                if (names.length > 0) {
                    setAccount(saved !== null && names.includes(saved) ? saved : names[0]);
                }
            } catch {
                toaster.create({ type: 'error', title: '获取账号列表失败' });
            }
        })();
    }, []);

    useEffect(() => {
        accountRef.current = account;
    }, [account]);

    // 会战开始日自动执行勾选：三个练度任务，持久化，到点按固定顺序自动跑
    const [autoTasks, setAutoTasks] = useState<string[]>(loadAutoTasks);
    const toggleAutoTask = (key: string) => {
        const next = autoTasks.includes(key) ? autoTasks.filter(k => k !== key) : [...autoTasks, key];
        setAutoTasks(next);
        safeSetItem(AUTO_TASKS_KEY, JSON.stringify(next));
    };
    // 强化目标圈定（三个练度任务共用）：两条件并集，都关=全体名单
    const [targetTopUsage, setTargetTopUsage] = useState<boolean>(() => safeGetItem(TARGET_TOP_USAGE_KEY) !== '0');
    const [targetTopN, setTargetTopN] = useState<number>(() => {
        const n = Number(safeGetItem(TARGET_TOP_N_KEY));
        return [5, 10, 15, 20, 25, 30].includes(n) ? n : 10;
    });
    const [targetBossTop3, setTargetBossTop3] = useState<boolean>(() => safeGetItem(TARGET_BOSS_TOP3_KEY) === '1');
    const targetOpts = { topUsage: targetTopUsage, topN: targetTopN, bossTop3: targetBossTop3 };
    const toggleTargetTopUsage = () => {
        const next = !targetTopUsage;
        setTargetTopUsage(next);
        safeSetItem(TARGET_TOP_USAGE_KEY, next ? '1' : '0');
    };
    const changeTargetTopN = (n: number) => {
        setTargetTopN(n);
        safeSetItem(TARGET_TOP_N_KEY, String(n));
    };
    const toggleTargetBossTop3 = () => {
        const next = !targetBossTop3;
        setTargetBossTop3(next);
        safeSetItem(TARGET_BOSS_TOP3_KEY, next ? '1' : '0');
    };
    // 会战开始日自动拉取（重拉box/重拉作业数据）参与勾选：默认不参与
    const [autoPull, setAutoPull] = useState<boolean>(() => safeGetItem(AUTO_PULL_KEY) === '1');
    const toggleAutoPull = () => {
        const next = !autoPull;
        setAutoPull(next);
        safeSetItem(AUTO_PULL_KEY, next ? '1' : '0');
    };
    const loadData = async (alias: string, refresh = false, force = false, silent = false) => {
        if (!alias) return;
        // 互斥：模块执行中不允许拉数据（后端同账号并发请求会互踢致命错误）
        if (busyRef.current) {
            toaster.create({ type: 'warning', title: '任务执行中', description: '请等待当前模块执行完成后再重新拉取' });
            return;
        }
        const seq = ++loadSeqRef.current;
        loadingRef.current = true;
        if (!silent) setLoading(true);
        try {
            const res = await getClanPrep(alias, refresh, force);
            // 序号不匹配说明期间已切换账号/发起更新拉取，过期响应直接丢弃
            if (seq === loadSeqRef.current) {
                setData(res);
                setLoadError('');
                setKnifeViewCleared(false);
                writeDataCache(alias, res);
            }
        } catch (e) {
            if (seq === loadSeqRef.current) setLoadError(await getErrorDescription(e));
        } finally {
            if (seq === loadSeqRef.current) {
                loadingRef.current = false;
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (!account) return;
        safeSetItem(ACCOUNT_STORAGE_KEY, account);
        // 旧版结果存的是去重前的排刀口径，彻底废弃
        try { localStorage.removeItem(legacyResultsKey(account)); } catch { /* 忽略 */ }
        const stored = loadStoredResults(account);
        resultsRef.current = stored;
        setResults(stored);
        // 有持久缓存：先秒显上次内容，后台静默刷新不转圈；
        // 无缓存则正常加载（后端1800s响应缓存命中即秒回，零游戏/站点接触）
        const cached = readDataCache(account);
        if (cached) {
            setData(cached);
            setLoadError('');
            void loadData(account, false, false, true);
        } else {
            void loadData(account);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account]);

    // 名单表：按当前刀型勾选聚合by_knife统计，只显示作业数>0的角色；后端已只发已拥有角色
    const rows = useMemo(() => {
        const agg = (u: ClanPrepUnit) => {
            let usage = 0, best = 0;
            const bosses = new Set<string>();
            for (const t of KNIFE_TYPES) {
                if (!knifeSel[t]) continue;
                const s = u.by_knife?.[t];
                if (s) {
                    usage += s.usage;
                    best = Math.max(best, s.best);
                    s.bosses.forEach(b => bosses.add(b));
                }
            }
            return { usage, best, bosses: [...bosses] };
        };
        const sign = sortState.dir === 'desc' ? -1 : 1;
        return (data?.units ?? [])
            .map(u => ({ u, a: agg(u) }))
            .filter(x => x.a.usage > 0)
            .sort((x, y) => {
                const va = sortState.key === 'usage' ? x.a.usage : x.a.best;
                const vb = sortState.key === 'usage' ? y.a.usage : y.a.best;
                return (va - vb) * sign;
            })
            .map(x => ({ ...x.u, agg: x.a }));
    }, [data, knifeSel, sortState]);

    const toggleSort = (key: 'usage' | 'best') => {
        setSortState(prev => prev.key === key
            ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
            : { key, dir: 'desc' });
    };

    // 箭头常驻占位避免表头宽度跳动；激活列显示当前方向
    const sortMark = (key: 'usage' | 'best') =>
        sortState.key === key ? (sortState.dir === 'desc' ? ' ↓' : ' ↑') : ' ↕';

    const appendResult = (alias: string, entry: StoredResult) => {
        // 执行期间可能已切换账号：结果恒写回发起账号的存储（基线取该账号已留存的列表），
        // 仅当视图仍停留在发起账号时才更新当前展示，避免窜显
        const base = accountRef.current === alias ? resultsRef.current : loadStoredResults(alias);
        const next = [entry, ...base].slice(0, MAX_RESULTS);
        safeSetItem(resultsStorageKey(alias), JSON.stringify(next));
        if (accountRef.current === alias) {
            resultsRef.current = next;
            setResults(next);
        }
    };

    const clearResults = () => {
        if (!account) return;
        // 清除=收起面板上的结果显示：练度执行结果清空、推荐刀常驻结果隐藏（重新拉取数据后恢复）
        resultsRef.current = [];
        setResults([]);
        safeSetItem(resultsStorageKey(account), '[]');
        setKnifeViewCleared(true);
    };

    // 统一执行入口：互斥检查 → 写配置（可选）→ do_single → 拉完整结果 → 追加到内嵌结果区。
    // 账号恒取 accountRef（手动点击与自动链路共用，异步回调里不取旧闭包值）
    const executeModule = async (moduleKey: string, title: string, configs?: Record<string, ConfigValue>) => {
        const acc = accountRef.current;
        if (!acc) return;
        // 互斥：数据加载中不允许执行模块（后端同账号并发请求会互踢致命错误）
        if (loadingRef.current || busyRef.current) {
            toaster.create({ type: 'warning', title: '请稍候', description: '数据加载中或已有任务在执行，请稍后再试' });
            return;
        }
        if (busyAccountsRef.has(acc)) {
            toaster.create({ type: 'warning', title: '该账号正忙', description: '请等待当前任务完成' });
            return;
        }
        patchBusy(acc, true);
        busyRef.current = true;
        setBusy(true);
        toaster.create({ type: 'info', title: '任务已提交', description: `${title} 执行中，请稍候…` });
        try {
            // 强化目标圈定：三任务统一按当前勾选覆盖 units 配置（未圈定=清空恢复全体名单）
            if (TARGET_UNIT_KEYS[moduleKey]) {
                configs = { ...(configs ?? {}), ...buildTargetUnitConfigs(data, knifeSel, targetOpts) };
            }
            if (configs && Object.keys(configs).length > 0) {
                await putAccountConfigs(acc, configs);
            }
            // do_single响应的url即最新结果详情地址(后端push_result头插)，直接取第一条省一次列表GET
            const list = await postAccountAreaSingle(acc, moduleKey);
            const url = list?.[0]?.url;
            if (!url) throw new Error('未获取到结果');
            const res = (await Fetch.get<ModuleResult>(`${url}?text=true`)).data;
            appendResult(acc, {
                title,
                moduleKey,
                status: res.status,
                log: res.log ?? '',
                table: res.table ?? null,
                time: Date.now(),
            });
            // 静默刷新box：模块可能改了星级/装备。await在忙窗口内完成，避免与用户下一步操作并发互踢
            try {
                const box = await getClanPrep(acc, true);
                if (accountRef.current === acc) setData(box);
            } catch { /* 刷新失败不打扰 */ }
        } catch (e) {
            toaster.create({ type: 'error', title: `${title}执行失败`, description: await getErrorDescription(e) });
        } finally {
            patchBusy(acc, false);
            busyRef.current = false;
            setBusy(false);
        }
    };


    // 拉取时间只显示月/日：年份与时分秒对本面板没有信息量
    const updated = data?.updated_at ? new Date(data.updated_at * 1000) : null;
    const updatedText = updated ? `${updated.getMonth() + 1}/${updated.getDate()}` : '-';

    return (
        <Flex direction="column" h="full" minH={0} p={4} pt={2} gap={3}>
            {/* 冻结顶栏：位于滚动区之外，滚动内容不会从它与标题之间穿过；不加额外背景色，浅色模式不突兀 */}
            <Flex wrap="wrap" align="center" gap={2} flexShrink={0}>
                <NativeSelect.Root size="sm" w="170px" disabled={accountBusy}>
                    <NativeSelect.Field
                        value={account}
                        onChange={e => setAccount(e.target.value)}
                    >
                        {accounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Flex
                    align="center"
                    gap={1}
                    borderWidth={1}
                    borderColor={autoPull ? 'blue.500' : 'border.subtle'}
                    borderRadius="md"
                    px={2}
                    py={1}
                >
                    <Checkbox
                        size="sm"
                        colorPalette="blue"
                        checked={autoPull}
                        onCheckedChange={toggleAutoPull}
                    >
                        自动
                    </Checkbox>
                    <Button
                        size="xs"
                        variant="surface"
                        loading={loading}
                        disabled={accountBusy}
                        onClick={() => void loadData(account, true)}
                    >
                        <FiRefreshCw /> 重拉box
                    </Button>
                    <Button
                        size="xs"
                        variant="surface"
                        loading={loading}
                        disabled={accountBusy}
                        onClick={() => { noteForceFetch(); void loadData(account, true, true); }}
                    >
                        <FiRefreshCw /> 重拉作业
                    </Button>
                </Flex>
                {data?.stale && <Badge colorPalette="orange">数据过期</Badge>}
                <Text fontSize="xs" color="fg.muted" ml="auto">作业数据：{data ? data.period : '-'}（{updatedText} 拉取）</Text>
            </Flex>
            {loadError && (
                <Text fontSize="xs" color="red.400">拉取失败：{loadError}（点上方按钮重试）</Text>
            )}
            {data && !data.box_ready && (
                <Text fontSize="xs" color="orange.400">
                    {data.login_error
                        ? `该账号登录失败（${data.login_error}），请到账号页更新密码或先跑一次成功的登录任务。作业数据仍可查看。`
                        : '该账号还没有box缓存数据，先运行过任意登录类任务（如刷新box/清日常）后再用本面板的对照功能。'}
                </Text>
            )}

            {/* 滚动区：顶栏以下的所有内容，各框体之间统一间距；子框禁收缩，否则会被内容巨大的结果框压扁 */}
            <Flex ref={scrollRef} direction="column" gap={3} flex={1} minH={0} overflowY="auto">
            <Box flexShrink={0}>
                <Flex wrap="wrap" align="center" gap={2} mb={2}>
                <Text fontSize="sm" fontWeight="medium">角色练度</Text>
                <Text fontSize="2xs" color="fg.muted" ml="auto">
                    请支持来源的作业网：<Link href="https://www.caimogu.cc/gzlj.html" target="_blank" rel="noreferrer" colorPalette="teal" variant="underline">https://www.caimogu.cc/gzlj.html</Link>
                </Text>
            </Flex>
            {/* 强化目标：三个练度任务的目标角色圈定（并集），都关=全体名单；刀型跟随上面筛选行的勾选 */}
            <Flex wrap="wrap" align="center" gap={2} mb={2}>
                <Text fontSize="2xs" color="fg.muted">强化目标</Text>
                <Checkbox size="sm" gap={0} colorPalette="blue" checked={targetTopUsage} onCheckedChange={toggleTargetTopUsage}>
                    作业数前
                </Checkbox>
                <NativeSelect.Root size="sm" w="52px">
                    <NativeSelect.Field value={targetTopN} onChange={e => changeTargetTopN(Number(e.target.value))}>
                        {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n}</option>)}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Text fontSize="2xs">名</Text>
                <Checkbox size="sm" gap={0} colorPalette="blue" checked={targetBossTop3} onCheckedChange={toggleTargetBossTop3}>
                    每boss伤害前3的作业角色（跟随刀型勾选）
                </Checkbox>
            </Flex>
                {/* 自动勾选壳：勾选后，会战开始日到设定时刻会按顺序自动执行（不用手点） */}
                <Flex wrap="wrap" gap={2}>
                    {[
                        { key: 'clan_prep_star5', label: '拉到5星', palette: 'blue', onClick: () => void executeModule('clan_prep_star5', '一键拉到5星') },
                        { key: 'clan_prep_max_promote', label: '拉到最高练度', palette: 'orange', onClick: () => void executeModule('clan_prep_max_promote', '拉到最高练度') },
                        { key: 'clan_prep_cb_ex', label: '穿会战EX装', palette: 'purple', onClick: () => void executeModule('clan_prep_cb_ex', '一键穿会战EX装') },
                    ].map(t => (
                        <Flex key={t.key} align="center" gap={1} borderWidth={1} borderColor={autoTasks.includes(t.key) ? 'blue.500' : 'border.subtle'} borderRadius="md" px={2} py={1} flex={1}>
                            <Checkbox
                                checked={autoTasks.includes(t.key)}
                                onCheckedChange={() => toggleAutoTask(t.key)}
                                colorPalette="blue"
                                size="sm"
                            >
                                自动
                            </Checkbox>
                            <Button
                                size="sm"
                                flex={1}
                                colorPalette={t.palette}
                                loading={busy}
                                disabled={accountBusy}
                                onClick={t.onClick}
                            >
                                {t.label}
                            </Button>
                        </Flex>
                    ))}
                </Flex>
                <Text fontSize="2xs" color="fg.muted">
                    该处自动强化无视账号内工具的设置，默认拉名单上的全体；勾选强化目标后，只有圈定的角色会进行强化。如希望手动请不要勾选自动。
                </Text>
            </Box>
            <Box flexShrink={0} borderWidth={1} borderColor="border.subtle" borderRadius="lg" bg="bg.panel" overflow="hidden">
                {/* 普通滚动容器（非 ScrollArea）：滚动元素即本 Box，滚到底/顶后接力外层，无缝不停顿 */}
                <Box ref={rosterScrollRef} h="38vh" w="full" overflowY="auto">
                    <Table.Root size="sm" variant="outline" stickyHeader minW="520px">
                        <Table.Header>
                            <Table.Row bg="bg.subtle">
                                <Table.ColumnHeader>角色</Table.ColumnHeader>
                                <Table.ColumnHeader
                                    cursor="pointer"
                                    title="本期会战作业中被用到的条数"
                                    onClick={() => toggleSort('usage')}
                                >
                                    作业数{sortMark('usage')}
                                </Table.ColumnHeader>
                                <Table.ColumnHeader>BOSS</Table.ColumnHeader>
                                <Table.ColumnHeader
                                    cursor="pointer"
                                    title="该角色相关作业的最高参考伤害"
                                    onClick={() => toggleSort('best')}
                                >
                                    伤害(万){sortMark('best')}
                                </Table.ColumnHeader>
                                <Table.ColumnHeader>星级</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {loading && (
                                <Table.Row>
                                    <Table.Cell colSpan={5} textAlign="center" py={8}>加载中…</Table.Cell>
                                </Table.Row>
                            )}
                            {!loading && rows.length === 0 && (
                                <Table.Row>
                                    <Table.Cell colSpan={5} textAlign="center" py={8}>
                                        {data
                                            ? (data.box_ready
                                                ? '本期会战名单中没有已拥有的角色'
                                                : '该账号没有可用的box数据（登录失败或未拉取过），无法对照名单；可切换其他账号或先修复登录')
                                            : '暂无数据，点上方"重新拉取box"拉取'}
                                    </Table.Cell>
                                </Table.Row>
                            )}
                            {!loading && rows.map(u => (
                                <Table.Row key={u.unit_id}>
                                    <Table.Cell>{u.name}</Table.Cell>
                                    <Table.Cell>{u.agg.usage}</Table.Cell>
                                    <Table.Cell color="fg.muted">{u.agg.bosses.join('、') || '-'}</Table.Cell>
                                    <Table.Cell>{u.agg.best}</Table.Cell>
                                    <Table.Cell>{u.star != null ? `${u.star}星` : '-'}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Box>
            </Box>

            <Box flexShrink={0}>
                {/* 三栏式：三组各自上下两行，六行统一24px行高保证水平对齐；space-between均衡空白 */}
                <Flex wrap="wrap" align="flex-start" justify="space-between" gap={2} mb={3}>
                    {/* 第一栏：阶段（上）/ 排序（下） */}
                    <Flex direction="column" gap={1} align="flex-start">
                        <Flex h="24px" align="center" gap={1}>
                            <Text fontSize="xs" color="purple.fg">阶段</Text>
                            {STAGE_ORDER.map(f => (
                                <Button
                                    key={f}
                                    size="2xs"
                                    colorPalette="purple"
                                    variant={stageSel === f ? 'solid' : 'outline'}
                                    onClick={() => changeStageSel(f)}
                                >
                                    {f}
                                </Button>
                            ))}
                        </Flex>
                        <Flex h="24px" align="center" gap={1}>
                            <Text fontSize="xs" color="blue.fg">排序</Text>
                            <Button
                                size="2xs"
                                colorPalette="blue"
                                variant={sortKey === 'score' ? 'solid' : 'outline'}
                                onClick={() => changeSortKey('score')}
                            >
                                按分数
                            </Button>
                            <Button
                                size="2xs"
                                colorPalette="blue"
                                variant={sortKey === 'damage' ? 'solid' : 'outline'}
                                onClick={() => changeSortKey('damage')}
                            >
                                按伤害
                            </Button>
                        </Flex>
                    </Flex>
                    {/* 第二栏：BOSS（上）/ 刀型（下） */}
                    <Flex direction="column" gap={1} align="flex-start">
                        <Flex h="24px" align="center" gap={1}>
                            <Text fontSize="xs" color="orange.fg">BOSS</Text>
                            <Button
                                size="2xs"
                                colorPalette="orange"
                                variant={bossSel.length === 0 ? 'solid' : 'outline'}
                                onClick={clearBossSel}
                            >
                                综合
                            </Button>
                            {[1, 2, 3, 4, 5].map(n => (
                                <Button
                                    key={n}
                                    size="2xs"
                                    colorPalette="orange"
                                    variant={bossSel.includes(n) ? 'solid' : 'outline'}
                                    onClick={() => changeBossSel(n)}
                                >
                                    {n}
                                </Button>
                            ))}
                        </Flex>
                        <Flex h="24px" align="center" gap={1}>
                            <Text fontSize="xs" color="green.fg">刀型</Text>
                            {KNIFE_TYPES.map(k => (
                                <Button
                                    key={k}
                                    size="2xs"
                                    colorPalette="green"
                                    variant={knifeSel[k] ? 'solid' : 'outline'}
                                    onClick={() => toggleKnife(k)}
                                >
                                    {k}
                                </Button>
                            ))}
                        </Flex>
                    </Flex>
                    {/* 第三栏：支援开关（上）/ 清除（下） */}
                    <Flex direction="column" gap={1} align="flex-end">
                        <Flex h="24px" align="center">
                            <CuiSwitch size="xs" checked={knifeUseSupport} onCheckedChange={e => changeKnifeUseSupport(e.checked)}>
                                考虑公会支援
                            </CuiSwitch>
                        </Flex>
                        <Flex h="24px" align="center">
                            <Button
                                size="2xs"
                                variant="surface"
                                colorPalette="red"
                                onClick={clearResults}
                            >
                                清除作业数据
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
                {/* 推荐刀结果：有作业数据即常驻显示；勾选/排序/分组/支援开关都是即时筛选，不触发任何请求 */}
                {knifeViewCleared ? (
                    <Text fontSize="xs" color="fg.muted">结果已清除，点上方"重新拉作业"恢复</Text>
                ) : (
                                    <KnifeSections
                                        rows={data?.knife_rows?.filter(r => knifeSel[r.knife] && (knifeUseSupport || !r.borrow)) ?? []}
                                        stageSel={stageSel}
                        groupCounts={groupCounts}
                        bossSel={bossSel}
                        sortKey={sortKey}
                        stageRates={data?.stage_rates}
                        onGroupCountChange={changeGroupCount}
                    />
                )}

                {/* 练度模块执行结果（本地留存，新在上）；无结果时不占位 */}
                {results.length > 0 && (
                    <Text fontSize="xs" color="fg.muted" mt={2}>执行结果</Text>
                )}
                <VStack align="stretch" gap={2}>
                    {results.map((r, i) => (
                        <Box key={`${r.time}-${i}`} borderWidth={1} borderColor="border.subtle" borderRadius="md" p={2}>
                            <Flex align="center" gap={2}>
                                <Text fontSize="xs" fontWeight="medium">{r.title}</Text>
                                {r.status !== '成功' && <Badge colorPalette={STATUS_PALETTE[r.status] ?? 'gray'}>{r.status}</Badge>}
                            </Flex>
                            {r.log && r.log !== 'ok' && (
                                <Box
                                    mt={1}
                                    whiteSpace="pre-wrap"
                                    fontSize="xs"
                                    maxHeight="200px"
                                    overflowY="auto"
                                    color="fg.muted"
                                >
                                    {r.log}
                                </Box>
                            )}
                            {r.table && r.table.data.length > 0 && (
                                <Box mt={2}>
                                    <TableResult header={r.table.header} data={r.table.data} />
                                </Box>
                            )}
                        </Box>
                    ))}
                </VStack>
            </Box>
            </Flex>
        </Flex>
    );
}
