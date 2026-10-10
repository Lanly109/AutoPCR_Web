import {
    Box,
    Button,
    Flex,
    NativeSelect,
    Table,
    Text,
    VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { ClanPrepResponse, KnifeRowData, KnifeType } from '@interfaces/ClanPrep'
import { DataRow, HeaderItem, ModuleResultStatus } from '@interfaces/ModuleResult'
import { Checkbox } from '../ui/checkbox'
import { toaster } from '../ui/toaster'
import { safeGetItem, safeSetItem } from '../Account/accountShared'

/** 刀型四分类（尾刀单列），口径与后端 caimogu.classify_knife 一致 */
export const KNIFE_TYPES: KnifeType[] = ['自动', '半自动', '手动', '尾刀'];

/** 阶段口径：本会战仅B/C/DE三阶段(DE=4~5周目合并)，后端一次定死，此处只做白名单校验 */
export const STAGE_ORDER = ['B', 'C', 'DE'];

/** 排刀排序口径：score=分数(伤害×倍率) / damage=伤害，分组前按口径重排 */
export type SortKey = 'score' | 'damage';

/** 列间分隔竖线（第2列起）：borderStyle 必须显式给，否则 border-style:none 不渲染 */
const COL_SEP = { borderLeftWidth: 1, borderLeftColor: 'border', borderLeftStyle: 'solid' };

/** 复制到剪贴板：clipboard API 不可用时（http非本机访问）退回 execCommand */
const copyText = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch { return false; }
    }
};

const KNIFE_SEL_STORAGE_KEY = 'clanprep.knifeSel';
export const MAX_RESULTS = 6;
// v2：排刀口径改为阶段内去重后的新格式，旧键一次性废弃（切换账号时清除）
export const resultsStorageKey = (alias: string) => `clanprep.resultsV2.${alias}`;
export const legacyResultsKey = (alias: string) => `clanprep.results.${alias}`;

/** 面板数据持久缓存（localStorage）：拉取成功即写入，重开面板/刷新页面先秒显缓存内容再后台刷新 */
export const DATA_CACHE_KEY = 'clanprep.dataCache';
export const readDataCache = (alias: string): ClanPrepResponse | null => {
    try {
        const c: unknown = JSON.parse(safeGetItem(DATA_CACHE_KEY) ?? 'null');
        if (c && typeof c === 'object' && (c as { alias?: string }).alias === alias) {
            return (c as { data: ClanPrepResponse }).data;
        }
    } catch { /* 坏数据走正常加载 */ }
    return null;
};
export const writeDataCache = (alias: string, data: ClanPrepResponse) => {
    safeSetItem(DATA_CACHE_KEY, JSON.stringify({ alias, data }));
};

/** 内嵌执行结果条目（table 可能为 null，渲染时容错） */
export interface StoredResult {
    title: string;
    moduleKey: string;
    status: ModuleResultStatus;
    log: string;
    table: { header: HeaderItem[]; data: DataRow[] } | null;
    time: number;
}

/** 状态徽章配色：后端 eResultStatus 六值的统一映射 */
export const STATUS_PALETTE: Record<string, 'green' | 'red' | 'orange' | 'gray'> = {
    '成功': 'green',
    '错误': 'red',
    '警告': 'orange',
    '致命': 'red',
    '中止': 'orange',
    '跳过': 'gray',
};

/** 编号解析：ET101 → 阶段E+中缀T+boss1加粗，序号01常规；E301 → 阶段E+boss3加粗 */
const snParts = (sn: string) => {
    const m = sn.match(/^([A-E])([TW]?)(\d)(\d+)$/);
    return m ? { face: m[1], infix: m[2], boss: m[3], seq: m[4] } : null;
};

/** 刀型勾选偏好：localStorage坏数据或全空时回落全选 */
export const loadKnifeSel = (): Record<KnifeType, boolean> => {
    try {
        const raw = safeGetItem(KNIFE_SEL_STORAGE_KEY);
        const arr: unknown = raw ? JSON.parse(raw) : null;
        if (Array.isArray(arr)) {
            const sel: Record<KnifeType, boolean> = { '自动': false, '半自动': false, '手动': false, '尾刀': false };
            let any = false;
            for (const v of arr) {
                if (typeof v === 'string' && (KNIFE_TYPES as string[]).includes(v)) {
                    sel[v as KnifeType] = true;
                    any = true;
                }
            }
            if (any) return sel;
        }
    } catch { /* 坏数据走默认 */ }
    return { '自动': true, '半自动': true, '手动': true, '尾刀': true };
};

/** 刀型勾选持久化（与loadKnifeSel同址读写）：存勾选中的刀型名数组 */
export const saveKnifeSel = (sel: Record<KnifeType, boolean>) => {
    safeSetItem(KNIFE_SEL_STORAGE_KEY, JSON.stringify(KNIFE_TYPES.filter(t => sel[t])));
};

/** 每阶段独立的排刀组数偏好：坏数据/缺项回落3，非法值(非1~10整数)丢弃 */
export const loadGroupCounts = (): Record<string, number> => {
    try {
        const o: unknown = JSON.parse(safeGetItem('clanprep.groupCounts') ?? 'null');
        if (o && typeof o === 'object' && !Array.isArray(o)) {
            const out: Record<string, number> = {};
            for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
                if (STAGE_ORDER.includes(k) && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 10) {
                    out[k] = v as number;
                }
            }
            return out;
        }
    } catch { /* 坏数据走默认 */ }
    return {};
};

/** 行分数=伤害×倍率（该阶段无倍率时为null）；组总分展示与排刀排序的统一口径 */
const scoreOf = (r: KnifeRowData) =>
    r.rate != null && r.rate > 0 ? Math.round(r.damage * r.rate) : null;

/**
 * 分组：每组3刀、一刀一个BOSS、组内角色不重复——对筛选后的池子实时重算，凑不满一组的尾部舍弃。
 * 先按排序口径(score/damage)降序重排；bossSel非空时选中的BOSS优先出刀（每boss一刀），不足3刀的槽位从剩余最高分/最高伤害补齐。
 */
const groupRows = (pool: KnifeRowData[], groupCount: number, bossSel: number[], sortKey: SortKey): KnifeRowData[][] => {
    // score口径下无倍率的行按×1(=伤害)参与排序
    const sortValue = (r: KnifeRowData) => sortKey === 'score' ? (scoreOf(r) ?? r.damage) : r.damage;
    const byKey = (a: KnifeRowData, b: KnifeRowData) => sortValue(b) - sortValue(a);
    const groups: KnifeRowData[][] = [];
    let pending = [...pool].sort(byKey);
    while (pending.length >= 3 && groups.length < groupCount) {
        // 选中BOSS的行排前（各自保持当前口径的降序），其余排后作补位
        const inSel = (r: KnifeRowData) => r.boss !== null && bossSel.includes(r.boss);
        const ordered = bossSel.length > 0
            ? [...pending.filter(inSel), ...pending.filter(r => !inSel(r))]
            : pending;
        const group: KnifeRowData[] = [];
        const usedMembers = new Set<number>();
        const usedBosses = new Set<number>();
        const rest: KnifeRowData[] = [];
        for (const item of ordered) {
            if (group.length >= 3) { rest.push(item); continue; }
            if ((item.boss !== null && usedBosses.has(item.boss)) || item.members.some(m => usedMembers.has(m))) {
                rest.push(item);
                continue;
            }
            group.push(item);
            if (item.boss !== null) usedBosses.add(item.boss);
            item.members.forEach(m => usedMembers.add(m));
        }
        if (group.length < 3) break;
        groups.push(group);
        pending = rest;
    }
    return groups;
};

/** 强化目标圈定参数（面板与自动链路共用同一套，localStorage 持久化由调用方负责） */
export interface TargetOptions {
    /** 圈定条件一：作业数前 topN 名（按当前勾选刀型的作业数排序） */
    topUsage: boolean;
    topN: number;
    /** 圈定条件二：每阶段×每boss伤害前3的作业用到的角色（刀型跟随当前勾选，BCDE全算） */
    bossTop3: boolean;
}

/**
 * 目标角色圈定：两个条件的并集（都关 = null，即全体名单，不做圈定）。
 * 纯前端计算——名单聚合与全量作业行都已在面板数据里，零新增请求。
 */
export function computeTargetUnits(data: ClanPrepResponse, knifeSel: Record<KnifeType, boolean>, opts: TargetOptions): number[] | null {
    if (!opts.topUsage && !opts.bossTop3) return null;
    const picked = new Set<number>();
    const owned = new Set(data.units.map(u => u.unit_id));
    if (opts.topUsage) {
        const usage = (u: ClanPrepResponse['units'][number]) => {
            let n = 0;
            for (const t of KNIFE_TYPES) {
                if (!knifeSel[t]) continue;
                n += u.by_knife?.[t]?.usage ?? 0;
            }
            return n;
        };
        [...data.units]
            .sort((a, b) => usage(b) - usage(a))
            .slice(0, opts.topN)
            .forEach(u => picked.add(u.unit_id * 100 + 1));
    }
    if (opts.bossTop3) {
        const rows = data.knife_rows.filter(r => knifeSel[r.knife] && STAGE_ORDER.includes(r.stage) && r.boss != null);
        const groups = new Map<string, KnifeRowData[]>();
        for (const r of rows) {
            const k = `${r.stage}|${r.boss}|${r.knife}`;
            const arr = groups.get(k);
            if (arr) arr.push(r); else groups.set(k, [r]);
        }
        groups.forEach(list => {
            list.sort((a, b) => b.damage - a.damage);
            for (const r of list.slice(0, 3)) {
                for (const m of r.members) {
                    if (owned.has(m)) picked.add(m * 100 + 1);
                }
            }
        });
    }
    return [...picked];
}

/** 三个强化任务的 units 配置：圈定时下发目标列表，未圈定时下发 []（恢复"留空=全体名单"） */
export function buildTargetUnitConfigs(data: ClanPrepResponse | null, knifeSel: Record<KnifeType, boolean>, opts: TargetOptions): Record<string, number[]> {
    const ids = data ? computeTargetUnits(data, knifeSel, opts) : [];
    return {
        clan_prep_star5_units: ids ?? [],
        clan_prep_promote_units: ids ?? [],
        clan_prep_cb_ex_units: ids ?? [],
    };
}

/** 读本地留存结果：新在上，最多 MAX_RESULTS 条，坏数据逐条容错 */
export function loadStoredResults(alias: string): StoredResult[] {
    const raw = safeGetItem(resultsStorageKey(alias));
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const list: StoredResult[] = [];
        for (const item of parsed.slice(0, MAX_RESULTS)) {
            if (typeof item !== 'object' || item === null) continue;
            const o = item as Record<string, unknown>;
            if (typeof o.title !== 'string' || typeof o.status !== 'string' || typeof o.time !== 'number') continue;
            const moduleKey = typeof o.moduleKey === 'string' ? o.moduleKey : '';
            // 推荐刀已是端点常驻数据，历史执行快照不再展示
            if (moduleKey === 'clan_prep_knife_plan') continue;
            const rawTable = typeof o.table === 'object' && o.table !== null
                ? o.table as Record<string, unknown>
                : null;
            const table = rawTable !== null && Array.isArray(rawTable.header) && Array.isArray(rawTable.data)
                ? { header: rawTable.header as HeaderItem[], data: rawTable.data as DataRow[] }
                : null;
            list.push({
                title: o.title,
                moduleKey,
                status: o.status as ModuleResultStatus,
                log: typeof o.log === 'string' ? o.log : '',
                table,
                time: o.time,
            });
        }
        return list;
    } catch {
        return [];
    }
}

/** 推荐刀结果：有作业数据即常驻显示；B/C/DE阶段分节，每组3刀、组内不重复（随筛选实时重算），组间加醒目分界线 */
export default function KnifeSections({ rows, stageSel, groupCounts, bossSel, sortKey, stageRates, onGroupCountChange }: {
    rows: KnifeRowData[];
    stageSel: string;
    groupCounts: Record<string, number>;
    bossSel: number[];
    sortKey: SortKey;
    stageRates: Record<string, Record<string, number>> | undefined;
    onGroupCountChange: (stage: string, n: number) => void;
}) {
    // 列勾选（表头五列各一个勾选框）：复制时输出整组所有行、只含勾选的列
    const [selCols, setSelCols] = useState({ sn: true, names: true, knife: true, damage: true, note: true });
    const toggleCol = (c: keyof typeof selCols) => setSelCols(prev => ({ ...prev, [c]: !prev[c] }));
    const copyGroup = async (g: KnifeRowData[]) => {
        const lines: string[] = [];
        for (const r of g) {
            const parts: string[] = [];
            if (selCols.sn) {
                // 编号只取加粗段（阶段字母+boss位，不含中缀T/W与序号）：ET101→E1
                const sp = snParts(r.sn);
                parts.push(sp ? `${sp.face}${sp.boss}` : r.sn);
            }
            if (selCols.names) parts.push(r.names.join('/'));
            if (selCols.knife) parts.push(r.knife);
            if (selCols.damage) parts.push(`${r.damage}${r.rate != null && r.rate > 0 ? ` ×${r.rate}` : ''}`);
            lines.push(parts.join(' '));
            if (selCols.note) {
                // 每条链接都带各自的文字说明，不只第一条
                for (const l of r.links) lines.push(l.text ? `${l.text} ${l.url}` : l.url);
            }
        }
        if (lines.length === 0) {
            toaster.create({ type: 'warning', title: '至少勾选一列' });
            return;
        }
        const ok = await copyText(lines.join('\n'));
        toaster.create({
            type: ok ? 'success' : 'error',
            title: ok ? '已复制该分刀信息到剪贴板' : '复制失败（浏览器不支持剪贴板访问）',
        });
    };
    // 行按阶段归组（后端一次定死），口径外的丢弃
    const byStage = new Map<string, KnifeRowData[]>();
    for (const row of rows) {
        if (!STAGE_ORDER.includes(row.stage)) continue;
        const arr = byStage.get(row.stage) ?? [];
        arr.push(row);
        byStage.set(row.stage, arr);
    }
    // 「全部」视图B/C/DE常驻；指定阶段即使无数据也显示空态说明
    const stages = stageSel === '' ? STAGE_ORDER : [stageSel];
    if (stageSel === '' && stages.every(f => (byStage.get(f)?.length ?? 0) === 0)) {
        return <Text fontSize="sm" color="fg.muted">暂无数据</Text>;
    }
    return (
        <VStack align="stretch" gap={3}>
            {stages.map(stage => {
                const gc = groupCounts[stage] ?? 3;
                const pool = byStage.get(stage) ?? [];
                const groups = groupRows(pool, gc, bossSel, sortKey);
                return (
                    <Box key={stage}>
                        {/* 阶段标题行：阶段=紫 / boss位=橙 / 倍率数字=蓝 / 组与组数=默认黑，与三栏筛选行颜色呼应 */}
                        <Flex wrap="wrap" align="center" gap={3} mb={1}>
                            <Text fontSize="sm" color="purple.fg">{`${stage}阶`}</Text>
                            <Text fontSize="sm">{groups.length > 0 ? `总${groups.length}组` : '本期无作业'}</Text>
                            {(() => {
                                const sr = stageRates?.[stage] ?? {};
                                const entries = Object.entries(sr).sort((a, b) => Number(a[0]) - Number(b[0]));
                                if (entries.length === 0) return <Text fontSize="sm" color="fg.muted">倍率 -</Text>;
                                return (
                                    <Text fontSize="sm">
                                        <Text as="span" color="fg.muted">倍率 </Text>
                                        {entries.map(([b, r], i) => (
                                            <Text key={b} as="span">
                                                {i > 0 && ' '}
                                                <Text as="span" color="orange.fg">{`${stage}${b}`}</Text>
                                                ：<Text as="span" color="blue.fg">{Number(r).toFixed(1)}</Text>
                                            </Text>
                                        ))}
                                    </Text>
                                );
                            })()}
                            <Text fontSize="sm" color="fg.muted">组数</Text>
                            <NativeSelect.Root size="sm" w="60px">
                                {/* 每阶段独立的组数：值互不同步 */}
                                <NativeSelect.Field
                                    value={gc}
                                    onChange={e => onGroupCountChange(stage, Number(e.target.value))}
                                >
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Flex>
                        {groups.length === 0 ? (
                            <Text fontSize="sm" color="fg.muted">
                                {pool.length > 0
                                    ? '有作业但凑不满完整的一组(组内角色不可重复)，已舍弃'
                                    : '踩蘑菇本期没有该阶段的作业'}
                            </Text>
                        ) : (
                        <Box borderWidth={1} borderColor="border.subtle" borderRadius="lg" bg="bg.panel" overflow="hidden" w="full">
                            {/* 与名单表同款包装：圆角+边线；自适应布局前四列按最长内容取宽（nowrap），说明列吃剩余折行 */}
                            <Table.Root size="sm" variant="outline">
                                <Table.Header>
                                    <Table.Row bg="bg.subtle">
                                        <Table.ColumnHeader whiteSpace="nowrap">
                                            <Checkbox size="sm" gap={0} colorPalette="blue" checked={selCols.sn} onCheckedChange={() => toggleCol('sn')}>编号</Checkbox>
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader {...COL_SEP} whiteSpace="nowrap">
                                            <Checkbox size="sm" gap={0} colorPalette="blue" checked={selCols.names} onCheckedChange={() => toggleCol('names')}>阵容</Checkbox>
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader {...COL_SEP} whiteSpace="nowrap">
                                            <Checkbox size="sm" gap={0} colorPalette="blue" checked={selCols.knife} onCheckedChange={() => toggleCol('knife')}>刀型</Checkbox>
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader {...COL_SEP} whiteSpace="nowrap">
                                            <Checkbox size="sm" gap={0} colorPalette="blue" checked={selCols.damage} onCheckedChange={() => toggleCol('damage')}>伤害(万)</Checkbox>
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader {...COL_SEP}>
                                            <Checkbox size="sm" gap={0} colorPalette="blue" checked={selCols.note} onCheckedChange={() => toggleCol('note')}>说明</Checkbox>
                                        </Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {groups.map((g, gi) => {
                                        // 每组标签行：组号 + 总分(Σ伤害×倍率) + 总伤害(Σ伤害)
                                        const scores = g.map(scoreOf);
                                        const total = scores.reduce<number>((s, x) => s + (x ?? 0), 0);
                                        const hasScore = scores.some(x => x != null);
                                        const totalDamage = g.reduce<number>((s, k) => s + k.damage, 0);
                                        return [
                                            {
                                                kind: 'label' as const,
                                                key: `${stage}-g${gi}`,
                                                no: gi + 1,
                                                total,
                                                hasScore,
                                                totalDamage,
                                                rows: g,
                                            },
                                            ...g.map(k => ({ kind: 'row' as const, key: `${stage}-${k.sn}-${gi}`, k })),
                                        ];
                                    }).flat().map(item =>
                                        item.kind === 'label' ? (
                                            <Table.Row
                                                key={item.key}
                                                style={{ borderTop: '2px solid var(--chakra-colors-teal-emphasized, #319795)' }}
                                            >
                                                <Table.Cell colSpan={5}>
                                                    <Flex gap={3} align="center">
                                                        <Text>第{item.no}组</Text>
                                                        {item.hasScore && <Text>总分 {item.total}</Text>}
                                                        <Text>总伤害 {item.totalDamage}</Text>
                                                        <Button
                                                            size="2xs"
                                                            variant="outline"
                                                            colorPalette="blue"
                                                            ml="auto"
                                                            onClick={() => void copyGroup(item.rows)}
                                                        >
                                                            一键复制勾选项
                                                        </Button>
                                                    </Flex>
                                                </Table.Cell>
                                            </Table.Row>
                                        ) : (
                                            <Table.Row key={item.key}>
                                                <Table.Cell {...COL_SEP} whiteSpace="nowrap">
                                                    {(() => {
                                                        const sp = snParts(item.k.sn);
                                                        return sp ? (
                                                            <Text as="span">
                                                                <Text as="b" color="teal.solid">{sp.face}{sp.infix}{sp.boss}</Text>
                                                                {sp.seq}
                                                            </Text>
                                                        ) : item.k.sn;
                                                    })()}
                                                </Table.Cell>
                                                {/* 阵容整行不断行（nowrap锁死）：宽度按最长阵容取，被挤压的是说明列 */}
                                                <Table.Cell {...COL_SEP} whiteSpace="nowrap">
                                                    {item.k.names.map((name, mi) => (
                                                        <Text key={mi} as="span">{name}{mi < item.k.names.length - 1 ? '/' : ''}</Text>
                                                    ))}
                                                </Table.Cell>
                                                <Table.Cell {...COL_SEP} whiteSpace="nowrap">{item.k.knife}</Table.Cell>
                                                <Table.Cell {...COL_SEP} whiteSpace="nowrap">
                                                    {item.k.rate != null && item.k.rate > 0
                                                        ? `${item.k.damage} ×${item.k.rate.toFixed(1)}`
                                                        : item.k.damage}
                                                </Table.Cell>
                                                {/* 说明列吃剩余宽度：文字与按钮都在边界内折行，不撑破表格 */}
                                                <Table.Cell {...COL_SEP}>
                                                    {item.k.links.length > 0 ? (
                                                        <Flex wrap="wrap" gap={1}>
                                                            {item.k.links.map((v, vi) => (
                                                                <a key={vi} href={v.url} target="_blank" rel="noreferrer" style={{ maxWidth: '100%' }}>
                                                                    <Button
                                                                        size="2xs"
                                                                        variant="surface"
                                                                        colorPalette="blue"
                                                                        maxW="full"
                                                                        h="auto"
                                                                        minH={0}
                                                                        py={1}
                                                                        whiteSpace="normal"
                                                                        wordBreak="keep-all"
                                                                    >
                                                                        {v.text || '视频'}
                                                                    </Button>
                                                                </a>
                                                            ))}
                                                        </Flex>
                                                    ) : (item.k.text || '-')}
                                                </Table.Cell>
                                            </Table.Row>
                                        )
                                    )}
                                </Table.Body>
                            </Table.Root>
                        </Box>
                        )}
                    </Box>
                );
            })}
        </VStack>
    );
}
