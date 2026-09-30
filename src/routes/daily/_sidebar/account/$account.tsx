import { Box, Button, HStack, Tabs, Tag } from '@chakra-ui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiActivity, FiCheck, FiStar, FiTarget, FiUserX } from 'react-icons/fi';
import NiceModal from '@ebay/nice-modal-react';

import { AccountResponse } from '@interfaces/Account';
import Area, { clearAreaConfigCache } from '@components/Account/Area';
import ConfigImportExport from '@components/Account/ConfigImportExport.tsx';
import Info from '@components/Account/Info';
import { createFileRoute } from '@tanstack/react-router';
import { getAccount, getAccountDailyResultList, postAccountAreaDaily } from '@api/Account';
import { POPUP_FLAG_KEY, loadPopupFlag, emitDailyFinished, textFitPadding, safeSetItem, getDisplayName, busyAccountsRef, patchBusy } from '@components/Account/accountShared';
import { getErrorDescription } from '@components/Account/Config';
import { toaster } from '../../../../components/ui/toaster';
import { Checkbox } from '../../../../components/ui/checkbox';
import ResultInfoModal from '@components/Account/ResultInfoModal';

export const Route = createFileRoute('/daily/_sidebar/account/$account')({
    component: AccountComponent,
    loader: ({ params: { account } }) => getAccount(account),
    errorComponent: () => <div> Not Found </div>,
});

function AccountComponent() {
    const { account } = Route.useParams();
    const initialAccountInfo = Route.useLoaderData<AccountResponse>();
    const [accountInfo, setAccountInfo] = useState<AccountResponse>(initialAccountInfo);

    const hasCredentials =
        (initialAccountInfo?.username ?? '') !== '' && (initialAccountInfo?.password ?? '') !== '';
    const hasAreas = (initialAccountInfo?.area?.length ?? 0) > 0;
    const initialTab = hasCredentials && hasAreas ? '1' : '0';

    const [activeTab, setActiveTab] = useState<string>(initialTab);
    const [favOnlyMap, setFavOnlyMap] = useState<Record<string, boolean>>({});
    const [cleanLoading, setCleanLoading] = useState(false);

    const [cleanStatus, setCleanStatus] = useState<string>(
        () => initialAccountInfo?.daily_clean_time?.status || '',
    );

    const [displayName, setDisplayName] = useState(
        () => getDisplayName(account),
    );

    // 「弹结果」：本账号执行完自动弹出结果窗（本地存储，按账号记忆）
    const [popupOn, setPopupOn] = useState<boolean>(() => loadPopupFlag(account));

    // 跨账号晚到写守卫：async 链 await 后校验请求发起时的账号是否还是当前账号（换号不重挂载，晚到的 A 响应不得写进 B 页）
    const accountRef = useRef(account);
    accountRef.current = account;

    const statusMeta = useMemo(() => {
        if (cleanStatus === '成功' || cleanStatus === '跳过') {
            return {
                color: 'green' as const,
                icon: <FiCheck />,
                label: cleanStatus === '跳过' ? '跳过' : '完成',
            };
        }
        if (cleanStatus === '警告' || cleanStatus === '中止') {
            return { color: 'orange' as const, icon: <FiActivity />, label: cleanStatus };
        }
        if (cleanStatus === '错误') {
            return { color: 'red' as const, icon: <FiUserX />, label: '错误' };
        }
        if (cleanStatus) {
            return { color: 'gray' as const, icon: <FiActivity />, label: cleanStatus };
        }
        return null;
    }, [cleanStatus]);

    const refreshAccountData = async () => {
        const a = accountRef.current;
        try {
            const freshData = await getAccount(a);
            if (accountRef.current !== a) return; // 换号了：晚到数据丢弃
            setAccountInfo(freshData);
            setDisplayName(getDisplayName(a));
            // 直接写状态：initialAccountInfo 是 loader 快照（不随本页刷新变化），effect 收不到
            const st = freshData?.daily_clean_time?.status;
            if (st) setCleanStatus(st);
        } catch (e) {
            console.error(e);
        }
    };

    const handleImportSuccess = async () => {
        clearAreaConfigCache(accountInfo?.alias || account);
        await refreshAccountData();
    };

    // 切换账号（含浏览器后退/前进）时整体重置；刷新 accountInfo 不要把用户正在看的 Tab 打回初始
    useEffect(() => {
        setAccountInfo(initialAccountInfo);
        setActiveTab(initialTab);
        setDisplayName(getDisplayName(account));
        setCleanStatus(initialAccountInfo?.daily_clean_time?.status || '');
        setFavOnlyMap({});
        setCleanLoading(false); // 上一账号清理在途时切过来：B 页按钮不得转圈
        setPopupOn(loadPopupFlag(account)); // 换号跟勾：弹结果是每账号标记，重置 effect 不补这条会显示上个号的开关态
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account]);

    // 数据跟进 effect：initialAccountInfo 变化（父级重拉、路由重载）时跟进状态与显示名。
    // 换号时本 effect 与上面的重置 effect 都会跑，声明序保证重置先行、本 effect 收尾——语义正确非打架：
    // 换号=重置 effect 清场 → 本 effect 写入新号数据；本页刷新=只有本 effect 跑（不打回用户正看的 tab）
    useEffect(() => {
        setDisplayName(getDisplayName(account));
        const st = initialAccountInfo?.daily_clean_time?.status;
        if (st) setCleanStatus(st);
    }, [initialAccountInfo, account]);

    // 离开本账号详情时清缓存
    useEffect(() => {
        const alias = account;
        return () => {
            clearAreaConfigCache(alias);
        };
    }, [account]);

    const currentArea =
        activeTab !== '0' && accountInfo?.area
            ? accountInfo.area[Number(activeTab) - 1]
            : null;
    const isCurrentTabFavOnly = currentArea ? !!favOnlyMap[currentArea.key] : false;

    const handleToggleCurrentFavOnly = () => {
        if (!currentArea?.key) return;
        setFavOnlyMap((prev) => ({ ...prev, [currentArea.key]: !prev[currentArea.key] }));
    };

    const handleCleanDaily = async () => {
        const a = accountInfo?.alias || account;
        const nameForUi = getDisplayName(a);

        // 忙碌互斥第六条路径：详情页清理与卡片清理是同一个长任务接口，双向都要设防——
        // 主页批量/同步把该账号当目标、或该账号已在主页执行中，这里在途时另一侧必须被拒（点击时点互斥）。
        // 守卫放在置 loading 前：拒绝路径不碰页面状态
        if (busyAccountsRef.has(a)) {
            toaster.create({ type: 'warning', title: `${nameForUi}正在执行中`, description: '请等待当前操作完成' });
            return;
        }
        setCleanLoading(true);
        setCleanStatus('');
        patchBusy(a, true);
        toaster.create({ type: 'info', title: `开始为${nameForUi}清理日常...` });

        try {
            const res = await postAccountAreaDaily(a);
            void emitDailyFinished(a);
            // 以下三个都是「操作结果告知/全局标记」：与用户切到哪无关，不因切号丢失（与失败 toast 口径对称）
            sessionStorage.setItem('autopcr_need_refresh_dashboard', '1');
            const resAny = res as { daily_clean_time?: { status?: string } | null; status?: string } | undefined;
            const st = resAny?.daily_clean_time?.status || resAny?.status || '';
            if (st === '错误') {
                toaster.create({ type: 'error', title: `${nameForUi}清日常结束` });
            } else if (st === '警告' || st === '中止') {
                toaster.create({ type: 'warning', title: `${nameForUi}清日常完成(${st})` });
            } else {
                toaster.create({ type: 'success', title: `${nameForUi}清日常成功` });
            }
            if (accountRef.current !== a) return; // 换号了：晚到结果不写新页面（loading 由重置 effect 兜底）

            setCleanStatus(st);
            await refreshAccountData();

            // 完成时刻现读存储（与 Module/DashBoard 姊妹路径同语义）：勾选在长任务在途期间可交互，点击时快照会违背用户刚表达的意愿
            if (loadPopupFlag(a) && accountRef.current === a) { // 换号后不弹：A 的结果窗不盖在 B 页上（审计六 P2-1）
                getAccountDailyResultList(a)
                    .then((resList) => {
                        if (accountRef.current !== a) return; // 结果列表在途时切号：同样丢弃
                        // modal 关闭路径的 reject 不是拉取失败，单独吞掉
                        void NiceModal.show(ResultInfoModal, { alias: a, title: '日常', resultInfo: resList }).catch(() => {});
                    })
                    .catch(() => {
                        if (accountRef.current !== a) return;
                        toaster.create({ type: 'warning', title: '结果获取失败', description: '无法拉取本次日常结果' });
                    });
            }
        } catch (err: any) {
            if (accountRef.current === a) setCleanStatus('错误');
            toaster.create({
                type: 'error',
                title: `${nameForUi}清日常失败`,
                description: await getErrorDescription(err),
            });
        } finally {
            // 换号后 loading 交给重置 effect，这里不再碰（晚到 finally 会把 B 页的按钮状态搅乱）
            if (accountRef.current === a) setCleanLoading(false);
            // 本笔是该账号忙碌登记的唯一作者（互斥网保证执行期间无并发路径），直接清
            patchBusy(a, false);
        }
    };

    return (
        <Tabs.Root
            lazyMount
            unmountOnExit
            variant="plain"
            value={activeTab}
            onValueChange={(d) => setActiveTab(d.value)}
            display="flex"
            flexDirection="column"
            height="100%"
        >
            <Tabs.List
                bg="bg.panel"
                p={1}
                borderRadius="xl"
                shadow="sm"
                borderWidth="1px"
                borderColor="border.subtle"
                mb={4}
                overflowX="auto"
                gap={1}
                alignItems="center"
            >
                <Tabs.Trigger
                    value="0"
                    px={4}
                    py={1.5}
                    rounded="lg"
                    fontWeight="semibold"
                    _selected={{ bg: 'blue.solid', color: 'white', shadow: 'md' }}
                    _hover={{ bg: 'bg.subtle', _selected: { bg: 'blue.solid', color: 'white' } }}
                >
                    {displayName}
                </Tabs.Trigger>

                <Box width="1px" height="1em" alignSelf="center" bg="border.muted" mx={1} />

                {accountInfo?.area?.map((area, index) => (
                    <Tabs.Trigger
                        key={area?.key}
                        value={String(index + 1)}
                        px={3}
                        py={1.5}
                        rounded="lg"
                        fontWeight="medium"
                        color="fg.muted"
                        _selected={{
                            bg: 'bg.subtle',
                            color: 'blue.600',
                            fontWeight: 'bold',
                            shadow: 'sm',
                        }}
                        _hover={{ bg: 'bg.subtle', color: 'fg' }}
                    >
                        {area?.name}
                    </Tabs.Trigger>
                ))}

                {activeTab !== '0' && (
                    <HStack alignItems="center" pr={2} gap={2}>
                        <Box w="1px" h="1.25rem" bg="border.subtle" mx={1} alignSelf="center" />
                        <Button
                            size="sm"
                            variant={isCurrentTabFavOnly ? 'solid' : 'ghost'}
                            colorPalette={isCurrentTabFavOnly ? 'yellow' : 'gray'}
                            onClick={handleToggleCurrentFavOnly}
                            px={textFitPadding(isCurrentTabFavOnly ? '显示全部' : '只显示收藏')}
                            type="button"
                        >
                            {isCurrentTabFavOnly ? (
                                <><FiStar fill="currentColor" /> 显示全部</>
                            ) : (
                                <><FiStar /> 只显示收藏</>
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            colorPalette="orange"
                            onClick={() => void handleCleanDaily()}
                            loading={cleanLoading}
                            px={textFitPadding('清理全部日常')}
                            type="button"
                        >
                            <FiTarget /> 清理全部日常
                        </Button>
                        <Checkbox
                            checked={popupOn}
                            onCheckedChange={(details) => {
                                const next = !!details.checked;
                                setPopupOn(next);
                                if (!safeSetItem(POPUP_FLAG_KEY(account), next ? 'true' : 'false')) {
                                    // 静默吞掉的话勾选不保留且无任何提示（与改名保存失败同等待遇）
                                    toaster.create({ type: 'warning', title: '弹结果设置保存失败', description: '本地存储不可用，本次修改不会保留' });
                                }
                            }}
                            colorPalette="blue"
                            size="md"
                            title="开启后，本账号清理完日常自动弹出结果窗"
                        >
                            弹结果
                        </Checkbox>
                        {statusMeta && (
                            <Tag.Root size="sm" colorPalette={statusMeta.color} variant="subtle">
                                <Tag.StartElement>{statusMeta.icon}</Tag.StartElement>
                                <Tag.Label>{statusMeta.label}</Tag.Label>
                            </Tag.Root>
                        )}
                    </HStack>
                )}
            </Tabs.List>

            <Box flex={1} overflow="auto">
                <Tabs.Content value="0">
                    <Info accountInfo={accountInfo} onSaveSuccess={refreshAccountData} />
                    <ConfigImportExport
                        alias={accountInfo?.alias}
                        areas={accountInfo?.area}
                        onImportSuccess={handleImportSuccess}
                    />
                </Tabs.Content>

                {accountInfo?.area?.map((area, index) => (
                    <Tabs.Content key={area?.key} value={String(index + 1)}>
                        <Area
                            alias={accountInfo?.alias}
                            keys={area?.key}
                            areaName={area?.name}
                            showOnlyFav={!!favOnlyMap[area?.key]}
                        />
                    </Tabs.Content>
                ))}
            </Box>
        </Tabs.Root>
    );
}
