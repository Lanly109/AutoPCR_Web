import { AccountInfo as AccountInfoInterface, UserInfoResponse } from '@interfaces/UserInfo';
import {
    Box,
    Button,
    Card,
    Flex,
    HStack,
    Input,
    SimpleGrid,
    Stack,
    Table,
    Text,
} from '@chakra-ui/react';
import { FiBook, FiCheck, FiGrid, FiKey, FiLayers, FiList, FiPlus, FiStar, FiTarget, FiUpload, FiUserMinus, FiUserPlus, FiUserX } from 'react-icons/fi';
import React, { ChangeEvent, useMemo, useRef } from 'react';
import { Skeleton, SkeletonText } from '../../components/ui/skeleton';
import { clearAccounts, delAccount, deleteAccount, getAccount, getAccountConfig, getUserInfo, postAccount, postAccountAreaSingle, postAccountImport, putUserInfo } from '@api/Account';
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { ResultInfo } from '@interfaces/UserInfo';

import Alert from '../alert';
import { AxiosError } from 'axios';
import { Checkbox } from '../../components/ui/checkbox';
import { IconButton } from '../../components/ui/icon-button';
import { Route as LoginRoute } from '@routes/daily/login';
import { Route as DashBoardRoute } from '@routes/daily/_sidebar/account/index';
import NiceModal from '@ebay/nice-modal-react';
import ReadmeModal from './ReadmeModal';
import { Tooltip } from '../../components/ui/tooltip';
import resetPasswdModal from '../Users/ResetPasswdModal';
import { toaster } from '../../components/ui/toaster';
import { useDisclosure } from '@chakra-ui/react';
import QuickActionPicker from './QuickActionPicker';
import ConfigSyncModal from './ConfigSyncModal';
import ResultSummaryModal, { ResultSummaryRow } from './ResultSummaryModal';
import ResultInfoModal from './ResultInfoModal';
import { loadQuickActions, saveQuickActions, QuickActionItem } from './quickActions';
import { AccountInfo } from './AccountCard';
import { ScheduleNotifySettings } from './ScheduleNotify';

import { getErrorDescription } from './Config';

import { dailyCleanRegistry as handle, getDisplayName, loadBatch, saveBatch, loadPopupFlag, loadPopupMaster, textFitPadding, safeGetItem, safeSetItem, POPUP_MASTER_KEY, VIEW_MODE_KEY, busyAccountsRef, patchBusy, BATCH_RUNNER, DANGEROUS_AREA_NAME } from './accountShared';

/** 收集其他账号已占用的显示名（含未自定义时的原始 alias） */
function collectOccupiedNames(accounts: AccountInfoInterface[] | undefined, selfAlias: string): Set<string> {
    const set = new Set<string>();
    for (const acc of accounts || []) {
        if (acc.name === selfAlias) continue;
        set.add(getDisplayName(acc.name));
        set.add(acc.name);
    }
    return set;
}


export function DashBoard() {
    const [userInfo, setUserInfo] = useState<UserInfoResponse>();
    // 账号列表加载失败态：与「真没账号」区分（后者引导建号，前者给重试）。Area 的 error 态 + retryTick 同款
    const [loadError, setLoadError] = useState(false);
    const [retryTick, setRetryTick] = useState(0);
    const freshAccountInfo = useDisclosure();
    const creatAccountSwitch = useDisclosure();
    const deleteQQConfirm = useDisclosure();
    const clearAccountConfirm = useDisclosure();
    // 危险功能执行确认：弹站内 AlertDialog（代替原生 confirm），确认后接着执行
    const dangerConfirm = useDisclosure();
    const [pendingDanger, setPendingDanger] = useState<{ btn: QuickActionItem; free: string[]; targetDesc: string } | null>(null);
    const [alias, setAlias] = useState<string>('');
    const [isTableView, setIsTableView] = useState<boolean>(() => {
        // 与写侧同键同通道（safeGetItem）：隐私模式初始化不炸，key 不双源
        const savedView = safeGetItem(VIEW_MODE_KEY);
        return savedView ? savedView === 'table' : false;
    });
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [quickActions, setQuickActions] = useState<QuickActionItem[]>(() => loadQuickActions());
    // 默认账号名单：加入/移出，未勾选时作为执行目标
    const [batchAccounts, setBatchAccounts] = useState<string[]>(() => loadBatch());
    // 「弹结果」：功能按钮执行完自动弹出结果汇总窗
    const [popupResult, setPopupResult] = useState<boolean>(() => loadPopupMaster());
    // 账号忙碌登记：转圈=忙，其他动作不可对该账号生效（设计行为）。互斥判定读模块真源 busyAccountsRef，此处 state 只做 UI 派生
    const [busyAccounts, setBusyAccounts] = useState<Set<string>>(new Set());
    // 跨页不同步（用户裁决）：本集合仅随本页动作登记/解除，主页重挂载后从空集开始；
    // 在途动作的互斥由 busyAccountsRef 真源保证，转圈由发起页自己的 loading 呈现
    const setAccountBusy = (name: string, busy: boolean) => {
        setBusyAccounts((prev) => {
            const next = new Set(prev);
            if (busy) next.add(name);
            else next.delete(name);
            return next;
        });
        // 模块级真源同步：ConfigSyncModal 等非父子组件靠它做忙碌互斥；patchBusy 广播给订阅方（账号页转圈恢复）
        patchBusy(name, busy);
    };
    const quickActionsLoadedOnce = useRef(false);
    // 危险标记 reconcile（审计十 #6）：本地缓存的 dangerous/ 来自 Picker 确认时的快照，后端把功能重分类进/出危险分区后
    // 旧缓存会失真（危险按钮无确认直执行 / 普通按钮白弹确认）。挂载后用 Picker 同源数据（getAccount + 各区 config）修正一次
    const quickActionsReconciled = useRef(false);
    useEffect(() => {
        if (quickActionsReconciled.current || quickActions.length === 0) return;
        const refAlias = userInfo?.accounts?.find((acc) => acc.name !== BATCH_RUNNER)?.name;
        if (!refAlias) return;
        quickActionsReconciled.current = true;
        (async () => {
            try {
                const detail = await getAccount(refAlias);
                const areas = detail?.area || [];
                const dangerKeys = new Set<string>();
                const nameByKey = new Map<string, string>();
                const aliveKeys = new Set<string>();
                for (const area of areas) {
                    const res = await getAccountConfig(refAlias, area.key);
                    for (const k of res?.order || []) {
                        const m = res?.info?.[k];
                        if (!m || !m.implemented || !m.runnable) continue;
                        aliveKeys.add(k);
                        nameByKey.set(k, m.name);
                        if (area.name === DANGEROUS_AREA_NAME) dangerKeys.add(k);
                    }
                }
                setQuickActions((prev) => {
                    let changed = false;
                    const next = prev
                        .filter((b) => aliveKeys.has(b.key)) // 后端已下线：从快捷栏剔除（与 Picker 打开时同口径）
                        .map((b) => {
                            const name = nameByKey.get(b.key) ?? b.name;
                            const dangerous = dangerKeys.has(b.key);
                            if (b.name === name && b.dangerous === dangerous) return b;
                            changed = true;
                            return { ...b, name, dangerous };
                        });
                    return changed ? next : prev;
                });
            } catch {
                // 拉取失败静默：缓存值继续用（下次挂载再试——reconciled 只在成功路径置位？不，上面已置位。
                // 失败时复位，让下次挂载重试）
                quickActionsReconciled.current = false;
            }
        })();
    }, [userInfo?.accounts]);
    useEffect(() => {
        // 首次挂载不回写：原值刚 load 出来，写了也是白写（隐私模式还会白弹"保存失败"）
        if (quickActionsLoadedOnce.current) {
            if (!saveQuickActions(quickActions)) {
                toaster.create({ type: 'warning', title: '自定义按钮保存失败', description: '本地存储不可用，本次会话内仍可使用' });
            }
        } else {
            quickActionsLoadedOnce.current = true;
        }
    }, [quickActions]);

    const batchLoadedOnce = useRef(false);
    useEffect(() => {
        if (batchLoadedOnce.current) saveBatch(batchAccounts);
        else batchLoadedOnce.current = true;
    }, [batchAccounts]);

    const popupLoadedOnce = useRef(false);
    useEffect(() => {
        if (popupLoadedOnce.current) safeSetItem(POPUP_MASTER_KEY, popupResult ? 'true' : 'false');
        else popupLoadedOnce.current = true;
    }, [popupResult]);

    // 批次名单随账号列表自动剔除失效项（依赖名单序列化：删一加一 length 不变也能触发）
    useEffect(() => {
        if (!userInfo) return;
        // accounts 缺失/为 null（瞬时后端异常）不当成空名单：否则会把用户攒的批次整体滤空并持久化
        if (!userInfo.accounts) return;
        const names = new Set(userInfo.accounts.map((acc) => acc.name));
        setBatchAccounts((prev) => {
            const next = prev.filter((name) => names.has(name));
            return next.length === prev.length ? prev : next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfo?.accounts?.map((a) => a.name).join('\u0001')]);

    useEffect(() => {
        if (sessionStorage.getItem('autopcr_need_refresh_dashboard') === '1') {
            sessionStorage.removeItem('autopcr_need_refresh_dashboard');
            freshAccountInfo.onToggle();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showReadme = () => {
        NiceModal.show(ReadmeModal, {})
            .then(() => {
                localStorage.setItem('readme2', 'true');
            })
            .catch(() => {
                localStorage.setItem('readme2', 'true');
            });
    };

    useEffect(() => {
        const readme = localStorage.getItem('readme2');
        if (!readme) {
            showReadme();
        }
    }, []);

    useEffect(() => {
        getUserInfo()
            .then((res) => {
                // accounts 缺失（200 但载荷不完整）不当成空名单：勾选/批次整体清空会让批量写作用域静默升级为「全体账号」
                if (!res.accounts) return;
                setLoadError(false);
                setUserInfo(res);
                // 列表刷新后剔除选中里已不存在的账号（删除/清除后不再残留）
                setSelectedAccounts((prev) => prev.filter((name) => res.accounts?.some((acc) => acc.name === name)));
            })
            .catch(async (err: AxiosError) => {
                setLoadError(true); // 区分「加载失败」（可重试）与「真没账号」（引导建号）
                toaster.create({ type: 'error', title: '获取账号失败', description: await getErrorDescription(err) });
            });
    }, [freshAccountInfo.open, retryTick]);

    // 默认账号状态：勾选的账号全部已是默认才算"亮"
    const selectedInBatch = selectedAccounts.length > 0 && selectedAccounts.every((name) => batchAccounts.includes(name));

    // 默认账号 2 态切换：选中=把勾选账号全部设为默认；已全为默认=取消默认
    const handleToggleBatchForSelected = () => {
        if (selectedAccounts.length === 0) {
            toaster.create({ type: 'info', title: '请先勾选账号', description: '用于把勾选的账号设为或取消默认账号' });
            return;
        }
        const allIn = selectedAccounts.every((name) => batchAccounts.includes(name));
        const next = allIn
            ? batchAccounts.filter((name) => !selectedAccounts.includes(name))
            : [...batchAccounts, ...selectedAccounts.filter((name) => !batchAccounts.includes(name))];
        setBatchAccounts(next);
        const delta = Math.abs(next.length - batchAccounts.length);
        toaster.create({
            type: 'success',
            title: allIn ? `已取消 ${delta} 个默认账号` : `已将 ${delta} 个账号设为默认账号`,
        });
    };

    const handleResetPassword = () => {
        NiceModal.show(resetPasswdModal, {})
            .then((value) => {
                putUserInfo({ password: value as string })
                    .then((res) => {
                        toaster.create({ type: 'success', title: '修改密码成功', description: res });
                        NiceModal.hide(resetPasswdModal)
                            .then(() => {
                                return;
                            })
                            .catch(() => {
                                return;
                            });
                    })
                    .catch(async (err: AxiosError) => {
                        toaster.create({ type: 'error', title: '修改密码失败', description: await getErrorDescription(err) });
                    });
            })
            .catch(() => {
                return;
            });
    };

    const updateAccountInfo = (updatedAccount: AccountInfoInterface) => {
        setUserInfo((prevUserInfo) => {
            if (!prevUserInfo?.accounts) {
                return prevUserInfo;
            }

            const updatedAccounts = prevUserInfo.accounts.map((account) => (account.name === updatedAccount.name ? updatedAccount : account));

            return {
                ...prevUserInfo,
                accounts: updatedAccounts,
            };
        });
    };

    /** 可渲染/可勾选的账号对象（排除 BATCH_RUNNER 虚拟账号）：渲染循环直接 map 它，避免每卡 find 造成 O(n²) */
    const selectableAccounts = useMemo(
        () => userInfo?.accounts?.filter((acc) => acc.name !== BATCH_RUNNER) ?? [],
        [userInfo?.accounts],
    );
    /** 可勾选名单（names）：全选判定与全选操作共用同一分母，自 selectableAccounts 派生（单一来源） */
    const selectableNames = useMemo(() => selectableAccounts.map((acc) => acc.name), [selectableAccounts]);
    const allSelected = selectedAccounts.length > 0 && selectedAccounts.length === selectableNames.length;

    /** 批量目标解析（唯一实现）：勾选 > 默认账号 > 全体（排除 BATCH_RUNNER），忙碌切分+提示；无可执行目标时返回 null */
    const resolveTargets = (actionName: string): { free: string[]; targetDesc: string } | null => {
        const allNames = selectableNames;
        const targetDesc = selectedAccounts.length > 0 ? '勾选账号' : batchAccounts.length > 0 ? '默认账号' : '全体账号';
        const targets = selectedAccounts.length > 0 ? selectedAccounts : batchAccounts.length > 0 ? batchAccounts : allNames;
        const free = targets.filter((name) => !busyAccountsRef.has(name));
        const busy = targets.filter((name) => busyAccountsRef.has(name));
        if (targets.length === 0) {
            // 三种成因分开说：加载失败给重试出口（工具栏不再谎报「执行全部账号」引导用户去建号），真没账号才引导建号
            if (loadError) {
                toaster.create({ type: 'warning', title: '账号列表加载失败', description: '请用列表区的重试按钮' });
            } else {
                toaster.create({ type: 'info', title: '请先创建一个账号' });
            }
            return null;
        }
        if (free.length === 0) {
            toaster.create({ type: 'warning', title: '请等待执行完毕', description: '所选账号都正在执行中' });
            return null;
        }
        if (busy.length > 0) {
            toaster.create({ type: 'info', title: `${actionName}：已跳过 ${busy.length} 个正在执行中的账号` });
        }
        return { free, targetDesc };
    };

    const handleCleanDailyAll = () => {
        const resolved = resolveTargets('清理日常');
        if (!resolved) return;
        for (const name of resolved.free) {
            const fn = handle.get(name);
            void fn?.();
        }
    };

    // 自定义功能按钮：目标=勾选的账号 > 默认账号（没勾选时） > 全体（默认账号也为空时）；忙碌账号跳过；危险功能先确认
    const handleQuickAction = async (btn: QuickActionItem) => {
        const resolved = resolveTargets(btn.name);
        if (!resolved) return;
        const free = resolved.free;
        if (btn.dangerous) {
            // 站内确认弹窗（异步）：确认后在 onConfirmDanger 里继续执行
            setPendingDanger({ btn, free, targetDesc: resolved.targetDesc });
            dangerConfirm.onOpen();
            return;
        }
        void executeQuickAction(btn, free, resolved.targetDesc);
    };

    const onConfirmDanger = () => {
        dangerConfirm.onClose();
        const pending = pendingDanger;
        setPendingDanger(null);
        if (pending) void executeQuickAction(pending.btn, pending.free, pending.targetDesc);
    };

    const executeQuickAction = async (btn: QuickActionItem, free: string[], targetDesc: string) => {
        // 弹窗停留期间的过期快照防护：确认前新变忙的账号在这里二次剔除（读模块真源：含详情页登记的忙碌）
        const stillFree = free.filter((name) => !busyAccountsRef.has(name));
        if (stillFree.length === 0) {
            toaster.create({ type: 'warning', title: '请等待执行完毕', description: '所选账号都正在执行中' });
            return;
        }
        if (stillFree.length < free.length) {
            toaster.create({ type: 'info', title: `${btn.name}：已跳过 ${free.length - stillFree.length} 个确认期间开始执行的账号` });
        }
        stillFree.forEach((name) => {
            setAccountBusy(name, true);
        });
        let ok = 0;
        let fail = 0;
        const outcomes = new Map<string, { ok: boolean; detail: string; res?: ResultInfo[] }>();
        // 多账号同时执行同一动作：全并发（每账号一个独立请求，语义即"一起跑"；用户裁决不改）
        await Promise.all(
            stillFree.map(async (name) => {
                try {
                    const res = await postAccountAreaSingle(name, btn.key);
                    outcomes.set(name, { ok: true, detail: '', res });
                    ok += 1;
                } catch (err: any) {
                    outcomes.set(name, { ok: false, detail: await getErrorDescription(err), res: undefined });
                    fail += 1;
                } finally {
                    setAccountBusy(name, false);
                }
            }),
        );
        // 单账号 + 弹结果总开关开 + 该账号开了弹结果标记：只弹详情窗，不叠汇总窗。
        // res 是数组：空数组按「无结果行」处理走汇总窗（[] 是真值，直接当条件会吞汇总窗、弹空白详情窗）
        const detailRes = outcomes.get(stillFree[0])?.res;
        const singleDetail = popupResult && stillFree.length === 1 && loadPopupFlag(stillFree[0]) && outcomes.get(stillFree[0])?.ok && Array.isArray(detailRes) && detailRes.length > 0;
        if (popupResult && !singleDetail) {
            const rows: ResultSummaryRow[] = stillFree.map((name) => {
                const o = outcomes.get(name);
                return { alias: name, name: getDisplayName(name), status: o?.ok ? '成功' : '失败', detail: o?.ok ? undefined : o?.detail };
            });
            NiceModal.show(ResultSummaryModal, { title: `${btn.name} · ${targetDesc}`, rows }).catch(() => {});
        }
        // 没开弹结果时才用 toast 反馈（弹窗本身就是反馈，不叠 toast）
        if (!popupResult) {
            toaster.create({
                type: fail > 0 ? 'warning' : 'success',
                title: `${btn.name} 执行完毕`,
                description: fail > 0 ? `成功 ${ok} / 失败 ${fail}，请在各账号详情的功能区里查看结果` : '请在各账号详情的功能区里查看结果',
            });
        }
        // 仅对单账号执行且该账号开了"弹结果"标记的，直接弹该账号的功能结果窗
        if (singleDetail) {
            const o = outcomes.get(stillFree[0]);
            if (o?.res) {
                NiceModal.show(ResultInfoModal, { alias: stillFree[0], title: btn.name, resultInfo: o.res }).catch(() => {});
            }
        }
    };

    const handleOpenQuickPicker = () => {
        const refAlias = userInfo?.accounts?.find((acc) => acc.name !== BATCH_RUNNER)?.name;
        if (!refAlias) {
            toaster.create({ type: 'warning', title: '请先创建一个账号' });
            return;
        }
        NiceModal.show(QuickActionPicker, { alias: refAlias, current: quickActions }).then((items) => {
            if (!Array.isArray(items)) return;
            // 不弹提示：勾/取消勾是用户主动操作，结果按钮直接可见
            setQuickActions(items as QuickActionItem[]);
        });
    };

    const toggleSelectAccount = (accountName: string) => {
        setSelectedAccounts((prev) => {
            if (prev.includes(accountName)) {
                return prev.filter((name) => name !== accountName);
            } else {
                return [...prev, accountName];
            }
        });
    };

    const toggleSelectAll = () => {
        // 全选集合排除 BATCH_RUNNER 虚拟账号：勾进去会在批量执行时直打后端
        if (selectedAccounts.length === selectableNames.length) {
            setSelectedAccounts([]);
        } else {
            setSelectedAccounts(selectableNames);
        }
    };

    const handleCreateAccount = () => {
        if (!creatAccountSwitch.open) {
            creatAccountSwitch.onOpen();
            return;
        }
        const trimmed = alias.trim();
        if (!trimmed) {
            toaster.create({
                type: 'warning',
                title: '需输入名字，此次未创建',
            });
            creatAccountSwitch.onClose();
            setAlias('');
            return;
        }

        postAccount(trimmed)
            .then((res) => {
                toaster.create({
                    type: 'success',
                    title: '创建账号成功',
                    description: res,
                });
                creatAccountSwitch.onClose();
                setAlias('');
                freshAccountInfo.onToggle();
            })
            .catch(async (err: AxiosError) => {
                toaster.create({
                    type: 'error',
                    title: '创建账号失败',
                    description: await getErrorDescription(err),
                });
            });
    };

    const handleAccountImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) {
            postAccountImport(file)
                .then((res) => {
                    toaster.create({ type: 'success', title: '导入账号成功', description: res });
                    freshAccountInfo.onToggle();
                })
                .catch(async (err: AxiosError) => {
                    toaster.create({ type: 'error', title: '导入账号失败', description: await getErrorDescription(err) });
                });
        }
    };

    const cancelRef = React.useRef<HTMLButtonElement>(null);

    const navigate = useNavigate();

    const handleDeleteAccount = () => {
        deleteAccount()
            .then(async (res) => {
                toaster.create({ type: 'success', title: '删除QQ成功', description: res });
                deleteQQConfirm.onToggle();
                await navigate({ to: LoginRoute.to });
            })
            .catch(async (err: AxiosError) => {
                toaster.create({ type: 'error', title: '删除QQ失败', description: await getErrorDescription(err) });
            });
    };

    const handleClearAccounts = () => {
        clearAccounts()
            .then((res) => {
                toaster.create({ type: 'success', title: '清除账号成功', description: res });
                clearAccountConfirm.onToggle();
                setSelectedAccounts([]);
                freshAccountInfo.onToggle();
            })
            .catch(async (err: AxiosError) => {
                toaster.create({ type: 'error', title: '清除账号失败', description: await getErrorDescription(err) });
            });
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const occupiedNamesFactory = useMemo(() => {
        return (selfAlias: string) => collectOccupiedNames(userInfo?.accounts, selfAlias);
    }, [userInfo?.accounts]);


    return (
        <Stack gap={4} minH="full" w="full" p={4} position="relative" zIndex={1}>
            <Card.Root variant="elevated" bg="bg.glass" backdropFilter="blur(12px)" shadow="sm" borderRadius="2xl" borderWidth="1px" borderColor="border.subtle">
                <Card.Body py={2} px={4}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                        <Box>
                            {!userInfo ? (
                                <Skeleton height="20px" width="100px" />
                            ) : (
                                <Text fontSize="md" fontWeight="bold">
                                    {`欢迎回来, ${userInfo.qq}`}
                                </Text>
                            )}
                        </Box>

                        <HStack gap={2}>
                            <Button size="xs" variant="surface" colorPalette="teal" onClick={showReadme}>
                                <FiBook /> 使用须知
                            </Button>
                            <Button size="xs" variant="surface" colorPalette="blue" onClick={handleResetPassword}>
                                <FiKey /> 修改密码
                            </Button>
                            <Button size="xs" variant="surface" colorPalette="red" onClick={deleteQQConfirm.onOpen}>
                                <FiUserX /> 注销QQ
                            </Button>
                        </HStack>
                    </Flex>
                </Card.Body>
            </Card.Root>

            <Alert leastDestructiveRef={cancelRef} isOpen={deleteQQConfirm.open} onClose={deleteQQConfirm.onClose} title="删除QQ" body={`确定删除QQ${userInfo?.qq}吗？`} onConfirm={handleDeleteAccount}>
                {' '}
            </Alert>

            <Flex
                bg="bg.panel"
                py={2}
                px={3}
                borderRadius="xl"
                shadow="sm"
                borderWidth="1px"
                borderColor="border.subtle"
                align="flex-start"
                wrap="wrap"
                gap={2}
            >
                <HStack gap={2} alignItems="center">
                    <Box w="80px" flexShrink={0} fontSize="xs" color="fg.muted" lineHeight="1.5" display="flex" alignItems="center">
                        <Text whiteSpace="nowrap">
                            {selectedAccounts.length > 0
                                ? '只执行勾选账号'
                                : batchAccounts.length > 0
                                    ? '只执行默认账号'
                                    : '执行全部账号'}
                        </Text>
                    </Box>
                    <Button
                        size="sm"
                        px={textFitPadding('默认账号')}
                        colorPalette="purple"
                        variant={selectedInBatch ? 'solid' : 'ghost'}
                        borderWidth="1px"
                        borderColor="currentColor"
                        onClick={handleToggleBatchForSelected}
                    >
                        <FiStar fill={selectedInBatch ? 'currentColor' : 'none'} /> {selectedInBatch ? '取消默认' : '默认账号'}
                    </Button>
                    <Button
                        size="sm"
                        px={textFitPadding('清理全部日常')}
                        colorPalette="orange"
                        variant="ghost"
                        borderWidth="1px"
                        borderColor="currentColor"
                        onClick={handleCleanDailyAll}
                        loading={busyAccounts.size > 0}
                    >
                        <FiTarget /> 清理全部日常
                    </Button>
                    <Button
                        size="sm"
                        px={textFitPadding('批量运行')}
                        colorPalette="blue"
                        variant="ghost"
                        borderWidth="1px"
                        borderColor="currentColor"
                        title="配置后端定时批量任务（BATCH_RUNNER）运行哪些账号"
                        onClick={() => {
                            void navigate({ to: `${DashBoardRoute.to || ''}${encodeURIComponent(BATCH_RUNNER)}` as any });
                        }}
                    >
                        <FiLayers /> 批量运行
                    </Button>
                </HStack>

                <Flex flex={1} minW={0} wrap="wrap" alignContent="flex-start" justify="flex-start" alignItems="center" gap={2}>
                    <Button
                        size="sm"
                        flexShrink={0}
                        px={textFitPadding('修改功能')}
                        colorPalette="blue"
                        onClick={handleOpenQuickPicker}
                        title="添加或移除自定义功能按钮"
                    >
                        修改功能 <FiPlus />
                    </Button>
                    {quickActions.map((btn) => (
                        <Button
                            key={btn.key}
                            size="sm"
                            px={textFitPadding(btn.name)}
                            colorPalette={btn.dangerous ? 'red' : 'blue'}
                            variant={btn.dangerous ? 'solid' : 'ghost'}
                            borderWidth="1px"
                            borderColor="currentColor"
                            onClick={() => handleQuickAction(btn)}
                            title={btn.dangerous ? '危险功能，执行前会确认' : `执行 ${btn.name}`}
                        >
                            {btn.name}
                        </Button>
                    ))}
                    <Box borderWidth="1px" borderColor="currentColor" borderRadius="md" px={2} h="2rem" display="flex" alignItems="center" flexShrink={0} ml="auto">
                        <Checkbox
                            checked={popupResult}
                            onCheckedChange={(details) => setPopupResult(!!details.checked)}
                            colorPalette="blue"
                            size="md"
                            title="开启后，功能按钮执行完自动弹出结果汇总窗"
                        >
                            弹结果
                        </Checkbox>
                    </Box>
                    <Box w="1px" h="1.25rem" bg="border.subtle" flexShrink={0} alignSelf="center" />
                        <ScheduleNotifySettings />
                </Flex>

                <HStack gap={2}>
                    <Box bg="bg.subtle" borderRadius="md" display="flex">
                        <Tooltip content="表格视图" openDelay={0} closeDelay={0}>
                            <IconButton
                                aria-label="List view"
                                size="xs"
                                variant={isTableView ? "solid" : "ghost"}
                                colorPalette={isTableView ? "blue" : "gray"}
                                onClick={() => {
                                    setIsTableView(true);
                                    safeSetItem(VIEW_MODE_KEY, 'table');
                                }}
                            >
                                <FiList />
                            </IconButton>
                        </Tooltip>
                        <Tooltip content="卡片视图" openDelay={0} closeDelay={0}>
                            <IconButton
                                aria-label="Grid view"
                                size="xs"
                                variant={!isTableView ? "solid" : "ghost"}
                                colorPalette={!isTableView ? "blue" : "gray"}
                                onClick={() => {
                                    setIsTableView(false);
                                    safeSetItem(VIEW_MODE_KEY, 'card');
                                }}
                            >
                                <FiGrid />
                            </IconButton>
                        </Tooltip>
                    </Box>

                     <HStack gap={1}>
                        {userInfo?.clan && (
                            <Tooltip content="导入账号 (TSV)"  openDelay={0} closeDelay={0}>
                                <IconButton
                                    aria-label="Import accounts"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                > <FiUpload /> </IconButton>
                            </Tooltip>
                        )}
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept=".tsv"
                            onChange={handleAccountImport}
                            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                            display="none"
                        />

                         <Tooltip content={selectedAccounts.length > 0 ? `删除选中(${selectedAccounts.length})` : '删除全部'}  openDelay={0} closeDelay={0}>
                            <IconButton
                                aria-label="Delete selected accounts"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                onClick={() => {
                                    if (selectedAccounts.length > 0) {
                                        // 忙碌账号提示：正执行的账号被删，在途响应会落空（写路径互斥网不拦删除本身——删除是终止性操作，但至少告知）
                                        const busyDel = selectedAccounts.filter((name) => busyAccountsRef.has(name));
                                        const busyNote = busyDel.length > 0 ? `\n其中正在执行中的账号：${busyDel.join('、')}\n（删除后这些操作的结果将丢失）` : '';
                                        if (window.confirm(`确定删除选中的 ${selectedAccounts.length} 个账号吗？${busyNote}`)) {
                                            Promise.all(selectedAccounts.map((name) => delAccount(name)))
                                                .then(() => {
                                                    toaster.create({ type: 'success', title: '删除成功' });
                                                    setSelectedAccounts([]);
                                                    freshAccountInfo.onToggle();
                                                })
                                                .catch(async (err) => toaster.create({ type: 'error', title: '删除失败', description: await getErrorDescription(err) }));
                                        }
                                    } else {
                                        clearAccountConfirm.onOpen();
                                    }
                                }}
                            > <FiUserMinus /> </IconButton>
                        </Tooltip>
                        <Box position="relative">
                            <Tooltip content={creatAccountSwitch.open ? '取消创建' : '创建新账号'}  openDelay={0} closeDelay={0}>
                                <IconButton
                                    aria-label={creatAccountSwitch.open ? "Confirm creation" : "Create account"}
                                    size="sm"
                                    variant={creatAccountSwitch.open ? "solid" : "solid"}
                                    colorPalette={creatAccountSwitch.open ? "red" : "green"}
                                    onClick={() => {
                                        handleCreateAccount();
                                    }}
                                >
                                    {creatAccountSwitch.open ? <FiCheck /> : <FiUserPlus />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                     </HStack>
                </HStack>
            </Flex>

            {creatAccountSwitch.open && (
                <Flex
                    bg="bg.panel"
                    p={4}
                    borderRadius="xl"
                    shadow="sm"
                    borderWidth="1px"
                    borderColor="green.subtle"
                    align="center"
                    gap={4}
                    animation="fade-in 0.2s"
                >
                    <Text fontWeight="bold" whiteSpace="nowrap">新账号名称:</Text>
                    <Input
                        autoFocus
                        placeholder="请输入游戏账号昵称..."
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleCreateAccount() }}
                    />
                    <Button size="sm" colorPalette="green" onClick={handleCreateAccount}>创建</Button>
                </Flex>
            )}

            <Alert leastDestructiveRef={cancelRef} isOpen={clearAccountConfirm.open} onClose={clearAccountConfirm.onClose} title="删除所有账号" body={`确定删除所有账号吗？`} onConfirm={handleClearAccounts}>
                {' '}
            </Alert>

            <Alert
                leastDestructiveRef={cancelRef}
                isOpen={dangerConfirm.open}
                onClose={() => {
                    dangerConfirm.onClose();
                    setPendingDanger(null);
                }}
                title="执行危险功能"
                body={`「${pendingDanger?.btn.name ?? ''}」为危险功能，确定要对 ${pendingDanger?.free.length ?? 0} 个账号执行吗？`}
                onConfirm={onConfirmDanger}
            >
                {' '}
            </Alert>

            {isTableView ? (
                <Box borderRadius="xl">
                    <Table.Root variant="outline" colorPalette="blue" size="sm" bg="bg.panel" borderRadius="xl" boxShadow="sm" ml="0" mr="auto">
                        <Table.Header position="sticky" top={0} bg="bg.subtle" zIndex={1} boxShadow="sm">
                            <Table.Row>
                                <Table.ColumnHeader px={0} fontSize="md" py={4} fontWeight="bold" width="5%" textAlign="center">
                                    <Checkbox
                                        checked={
                                            (selectedAccounts.length > 0 && selectedAccounts.length < selectableNames.length)
                                                ? "indeterminate"
                                                : allSelected
                                        }
                                        onCheckedChange={toggleSelectAll}
                                        colorPalette="blue"
                                        size="md"
                                        css={{
                                            '& [data-part=control], & .chakra-checkbox__control': {
                                                borderRadius: '9999px',
                                                width: '1.25rem',
                                                height: '1.25rem',
                                            },
                                        }}
                                    />
                                </Table.ColumnHeader>
                                <Table.ColumnHeader px={0} fontSize="md" py={4} fontWeight="bold" width="25%" minWidth="80px">
                                    账号
                                </Table.ColumnHeader>
                                <Table.ColumnHeader px={3} fontSize="md" py={4} fontWeight="bold" width="30%">
                                    最近记录
                                </Table.ColumnHeader>
                                <Table.ColumnHeader px={3} fontSize="md" py={4} fontWeight="bold" width="30%">
                                    操作
                                </Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {loadError && !userInfo ? (
                                // 加载失败态：与「真没账号」区分，给重试出口（Area 的 error + retryTick 同款）
                                <Table.Row bg="transparent">
                                    <Table.Cell colSpan={5} px={3} py={8} textAlign="center">
                                        <Text color="fg.muted" mb={3}>账号列表加载失败，请检查网络后重试</Text>
                                        <Button size="sm" variant="outline" onClick={() => setRetryTick((t) => t + 1)}>重试</Button>
                                    </Table.Cell>
                                </Table.Row>
                            ) : !userInfo ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Table.Row key={i} bg="transparent">
                                        <Table.Cell px={3} py={2}><Skeleton height="20px" width="20px" /></Table.Cell>
                                        <Table.Cell px={0} py={2}><Skeleton height="20px" width="80%" /></Table.Cell>
                                        <Table.Cell px={3} py={2}><Skeleton height="20px" width="60%" /></Table.Cell>
                                        <Table.Cell px={3} py={2}><Skeleton height="32px" width="100%" /></Table.Cell>
                                    </Table.Row>
                                ))
                            ) : (
                                selectableAccounts.map((account) => (
                                    <AccountInfo
                                        key={account.name}
                                        account={account}
                                        onToggle={freshAccountInfo.onToggle}
                                        updateAccountInfo={updateAccountInfo}
                                        isTableView={isTableView}
                                        isSelected={selectedAccounts.includes(account.name)}
                                        onToggleSelect={() => toggleSelectAccount(account.name)}
                                        batchAccounts={batchAccounts}
                                        getOccupiedNames={occupiedNamesFactory}
                                        isBusy={busyAccounts.has(account.name)}
                                        onBusyChange={setAccountBusy}
                                        onOpenSyncConfig={(a) => {
                                            NiceModal.show(ConfigSyncModal, { sourceAccount: a });
                                        }}
                                    />
                                ))
                            )}
                        </Table.Body>
                    </Table.Root>
                </Box>
            ) : (
                <Box p={1}>
                    <Box mb={2}>
                        <Checkbox
                            checked={allSelected ? true : selectedAccounts.length > 0 ? 'indeterminate' : false}
                            onCheckedChange={toggleSelectAll}
                            colorPalette="blue"
                            size="md"
                        >
                            全选账号
                        </Checkbox>
                    </Box>
                    <SimpleGrid gap={4} templateColumns="repeat(auto-fill, minmax(280px, 1fr))">
                        {loadError && !userInfo ? (
                            <Card.Root bg="bg.panel" borderRadius="2xl" shadow="sm">
                                <Card.Body py={8} textAlign="center">
                                    <Text color="fg.muted" mb={3}>账号列表加载失败，请检查网络后重试</Text>
                                    <Button size="sm" variant="outline" onClick={() => setRetryTick((t) => t + 1)}>重试</Button>
                                </Card.Body>
                            </Card.Root>
                        ) : !userInfo ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Card.Root key={i} bg="bg.panel" borderRadius="2xl" shadow="sm">
                                    <Card.Header><Skeleton height="24px" width="50%" /></Card.Header>
                                    <Card.Body><SkeletonText noOfLines={3} gap={4} /></Card.Body>
                                    <Card.Footer><Skeleton height="32px" width="100%" /></Card.Footer>
                                </Card.Root>
                            ))
                        ) : (
                            selectableAccounts.map((account) => (
                                <AccountInfo
                                    key={account.name}
                                    account={account}
                                    onToggle={freshAccountInfo.onToggle}
                                    updateAccountInfo={updateAccountInfo}
                                    isTableView={isTableView}
                                    isSelected={selectedAccounts.includes(account.name)}
                                    onToggleSelect={() => toggleSelectAccount(account.name)}
                                    batchAccounts={batchAccounts}
                                    getOccupiedNames={occupiedNamesFactory}
                                    isBusy={busyAccounts.has(account.name)}
                                    onBusyChange={setAccountBusy}
                                    onOpenSyncConfig={(a) => {
                                        NiceModal.show(ConfigSyncModal, { sourceAccount: a });
                                    }}
                                />
                            ))
                        )}
                    </SimpleGrid>
                </Box>
            )}
        </Stack>
    );
}
