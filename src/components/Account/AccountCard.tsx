import { AccountInfo as AccountInfoInterface } from '@interfaces/UserInfo';
import { Box, Card, Flex, HStack, Input, Table, Text, useDisclosure } from '@chakra-ui/react';
import { FiActivity, FiCheck, FiCopy, FiTarget, FiUpload, FiUserX, FiX } from 'react-icons/fi';
import React, { ChangeEvent, useRef } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Route as DashBoardRoute } from '@routes/daily/_sidebar/account/index';
import Alert from '../alert';
import { AxiosError } from 'axios';
import { IconButton } from '../../components/ui/icon-button';
import { Tooltip } from '../../components/ui/tooltip';
import NiceModal from '@ebay/nice-modal-react';
import ResultInfoModal from './ResultInfoModal';
import { toaster } from '../../components/ui/toaster';
import { delAccount, getAccount, getAccountDailyResultList, postAccountAreaDaily } from '@api/Account';
import { getErrorDescription } from './Config';
import { dailyCleanRegistry as handle, DISPLAY_NAME_KEY, getDisplayName, emitDailyFinished, safeSetItem, safeRemoveItem, importConfigFile, busyAccountsRef } from './accountShared';
import { clearAreaConfigCache } from './Area';
import { RoundCheckbox, AccountTags, StatusTag } from './AccountCardParts';
interface AccountInfoProps {
    account: AccountInfoInterface;
    onToggle: () => void;
    updateAccountInfo: (updatedAccount: AccountInfoInterface) => void;
    isTableView?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    /** 自动批次（多"默认账号"）名单：成员卡片显示"默认"标 */
    batchAccounts?: string[];
    onOpenSyncConfig?: (alias: string) => void;
    /** 该账号是否有动作正在执行（转圈=忙，其他动作不可对其生效） */
    isBusy?: boolean;
    onBusyChange?: (alias: string, busy: boolean) => void;
    getOccupiedNames: (selfAlias: string) => Set<string>;
}

export function AccountInfo({
    account,
    onToggle,
    updateAccountInfo,
    isTableView = false,
    isSelected = false,
    onToggleSelect,
    batchAccounts = [],
    onOpenSyncConfig,
    isBusy,
    onBusyChange,
    getOccupiedNames,
}: AccountInfoProps) {
    const buttonLoading = useDisclosure();
    const alias = account.name;
    const deleteConfirm = useDisclosure();
    const navigate = useNavigate();
    const importFileRef = useRef<HTMLInputElement>(null);
    const cancelRef = React.useRef<HTMLButtonElement>(null);

    const [isEditingName, setIsEditingName] = useState(false);
    const [displayName, setDisplayName] = useState(() => getDisplayName(alias));
    const [nameDraft, setNameDraft] = useState(displayName);
    const composingRef = useRef(false);
    const commitNameRef = useRef<() => void>(() => {}); // setTimeout 兜底用：直接捕获 commitDisplayName 会拿到事件时刻旧闭包（nameDraft 旧值）
    const nameInputRef = useRef<HTMLInputElement>(null);
    // 批量清理的提示文案要在按下那一刻取最新显示名；登记只看账号原名
    const displayNameRef = useRef(displayName);
    displayNameRef.current = displayName;
    // 显示名重同步跳过位：存储写失败后保住本地新名（见 commitDisplayName）
    const skipDisplayResyncRef = useRef(false);
    // 忙碌真源 = busyAccountsRef（模块级，跨页存活）；互斥判定一律 has(alias)，父级登记经 onBusyRef。
    // 旧的 busyRef/localBusyRef 镜像已删：真源换读法后无读者，且与 busyAccountsRef 一词之差极易误读（审计十 #10）
    const onBusyRef = useRef(onBusyChange);
    onBusyRef.current = onBusyChange;

    const clean = account.daily_clean_time;
    const cleanStatus = clean?.status || '未知';
    const cleanTime = clean?.time || '';

    const statusMeta =
        cleanStatus === '成功' || cleanStatus === '跳过'
            ? { color: 'green' as const, icon: <FiCheck />, label: cleanStatus === '跳过' ? '跳过' : '完成' }
            : cleanStatus === '警告' || cleanStatus === '中止'
              ? { color: 'orange' as const, icon: <FiActivity />, label: cleanStatus }
              : cleanStatus === '错误'
                ? { color: 'red' as const, icon: <FiUserX />, label: '错误' }
                : { color: 'gray' as const, icon: <FiActivity />, label: cleanStatus };

    useEffect(() => {
        // 重同步跳过位：存储写失败时本地已显示新名，不从存储读回旧值（否则闪一下又弹回，与注释意图相反）
        if (skipDisplayResyncRef.current) {
            skipDisplayResyncRef.current = false;
            return;
        }
        const latest = getDisplayName(alias);
        setDisplayName(latest);
        if (!isEditingName) setNameDraft(latest);
    }, [alias, isEditingName]);

    const handleCleanDaily = async () => {
        // 守卫读真源（含详情页登记的忙碌）：镜像 busyRef 只反映父级 state+本卡 local，跨页直写看不见
        if (busyAccountsRef.has(alias)) {
            toaster.create({ type: 'warning', title: '该账号正在执行中，请等待执行完毕' });
            return;
        }
        buttonLoading.onOpen();
        onBusyRef.current?.(alias, true); // 本地动作登记真源：批量/同步/详情页全经 busyAccountsRef 互斥
        const nameForUi = displayNameRef.current || alias;
        toaster.create({ type: 'info', title: `开始为${nameForUi}清理日常...` });
        try {
            const res = await postAccountAreaDaily(alias);
            updateAccountInfo(res);
            void emitDailyFinished(alias);

            const st = res?.daily_clean_time?.status || '';
            if (st === '错误') {
                toaster.create({ type: 'error', title: `${nameForUi}清日常结束`, description: st });
            } else if (st === '警告' || st === '中止') {
                toaster.create({ type: 'warning', title: `${nameForUi}清日常完成(${st})`, description: st });
            } else if (st === '成功' || st === '跳过') {
                toaster.create({ type: 'success', title: `${nameForUi}清日常成功` });
            } else {
                toaster.create({ type: 'success', title: `${nameForUi}清日常完成`, description: st || undefined });
            }
        } catch (err: any) {
            toaster.create({
                type: 'error',
                title: `${nameForUi}清日常失败`,
                description: await getErrorDescription(err),
            });
        } finally {
            buttonLoading.onClose();
            onBusyRef.current?.(alias, false);
        }
    };

    // 批量清理用：只按账号原名注册（显示名仅用于提示文案，经 ref 取最新值）。
    // 注册稳定包装（内部经 ref 取最新回调）：列表重排时新卡先挂旧卡后卸，身份校验删除避免误删新注册
    const cleanDailyRef = useRef(handleCleanDaily);
    cleanDailyRef.current = handleCleanDaily;
    useEffect(() => {
        const registered = () => cleanDailyRef.current();
        handle.set(alias, registered);
        return () => {
            if (handle.get(alias) === registered) handle.delete(alias);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alias]);

    const handleDeleteAccount = () => {
        // 忙碌互斥：执行中账号不可删（结果未回，删了也会留下悬挂状态）。守卫读真源（含详情页登记）
        if (busyAccountsRef.has(alias)) {
            toaster.create({ type: 'warning', title: '该账号正在执行中，请等待执行完毕' });
            return;
        }
        // 删除在途同样登记忙碌：否则这几百 ms 里清理/导入/二次删除可并发发起，晚到的清理响应还会把已删账号写回成幽灵行
        onBusyRef.current?.(alias, true);
        delAccount(alias)
            .then((res) => {
                toaster.create({ type: 'success', title: '删除账号成功', description: res });
                onToggle();
            })
            .catch(async (err: AxiosError) => {
                toaster.create({
                    type: 'error',
                    title: '删除账号失败',
                    description: await getErrorDescription(err),
                });
            })
            .finally(() => {
                onBusyRef.current?.(alias, false);
            });
    };

    const handleDailyResult = () => {
        toaster.create({ type: 'info', title: `正在获取${displayNameRef.current || alias}的日常结果...` });
        getAccountDailyResultList(alias)
            .then(async (res) => {
                toaster.create({ type: 'success', title: '获取日常结果成功' });
                await NiceModal.show(ResultInfoModal, { alias: alias, title: '日常', resultInfo: res });
            })
            .catch(async (err: AxiosError) => {
                toaster.create({
                    type: 'error',
                    title: '获取日常结果失败',
                    description: await getErrorDescription(err),
                });
            });
    };

    const goDetail = () => {
        void navigate({ to: `${DashBoardRoute.to || ''}${encodeURIComponent(alias)}` as any });
    };


    useEffect(() => {
        if (isEditingName) {
            // autoFocus 只在挂载时生效；编辑态切换时手动 focus
            const t = window.setTimeout(() => nameInputRef.current?.focus(), 0);
            return () => window.clearTimeout(t);
        }
    }, [isEditingName]);

    const commitDisplayName = () => {
        const next = nameDraft.trim();
        // 空名 / 等于真实 alias：恢复为 alias
        if (!next || next === alias) {
            safeRemoveItem(DISPLAY_NAME_KEY(alias));
            setDisplayName(alias);
            setNameDraft(alias);
            setIsEditingName(false);
            return;
        }
        const occupied = getOccupiedNames(alias);
        if (occupied.has(next) && next !== displayName) {
            toaster.create({
                type: 'error',
                title: '显示名冲突',
                description: `「${next}」已被其他账号使用`,
            });
            setNameDraft(displayName);
            setIsEditingName(false);
            return;
        }
        if (!safeSetItem(DISPLAY_NAME_KEY(alias), next)) {
            // 存储不可用：明说。本地保留新名（会话内有效），并跳过下一次重同步（否则 effect 会读回旧值，闪一下又弹回）
            toaster.create({ type: 'warning', title: '显示名保存失败', description: '本地存储不可用，本次修改仅本次会话内有效' });
            skipDisplayResyncRef.current = true;
        }
        setDisplayName(next);
        setIsEditingName(false);
    };
    commitNameRef.current = commitDisplayName; // 每渲染同步：setTimeout 兜底永远调用最新闭包

    // 始终同一 Input：可编辑区域与名字位置重合
    const nameInput = (
        <Input
            ref={nameInputRef}
            size="sm"
            value={isEditingName ? nameDraft : displayName}
            readOnly={!isEditingName}
            variant={isEditingName ? 'outline' : 'flushed'}
            onClick={(e) => {
                e.stopPropagation();
                if (!isEditingName) {
                    setNameDraft(displayName);
                    setIsEditingName(true);
                }
            }}
            onChange={(e) => {
                if (!isEditingName) return;
                setNameDraft(e.target.value);
            }}
            onCompositionStart={() => {
                composingRef.current = true;
            }}
            onCompositionEnd={(e) => {
                composingRef.current = false;
                setNameDraft((e.target as HTMLInputElement).value);
                // 组词中途点到别处：compositionend 时可能已失焦，补一次提交，避免卡在编辑态
                const el = e.target as HTMLInputElement;
                window.setTimeout(() => {
                    if (document.activeElement !== el) {
                        commitNameRef.current();
                    }
                }, 0);
            }}
            onBlur={() => {
                if (!isEditingName) return;
                if (composingRef.current) {
                    // 组词中 blur：等 composition 结束后由上面的 timeout 处理；再兜底一次
                    window.setTimeout(() => {
                        if (!composingRef.current) {
                            commitNameRef.current();
                        }
                    }, 0);
                    return;
                }
                commitDisplayName();
            }}
            onKeyDown={(e) => {
                if (!isEditingName || composingRef.current) return;
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                    setNameDraft(displayName);
                    setIsEditingName(false);
                }
            }}
            fontWeight="bold"
            maxW="12em"
            minW="4em"
            h="2em"
            px={isEditingName ? 2 : 0}
            lineHeight="1"
            cursor="text"
            title={isEditingName ? undefined : '点击修改显示名称'}
            _hover={!isEditingName ? { color: 'blue.fg' } : undefined}
            borderColor={isEditingName ? undefined : 'transparent'}
            boxShadow={isEditingName ? undefined : 'none'}
        />
    );


    const handleImportConfigFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        // 忙碌互斥：该账号正有动作（清理/快捷执行/详情页清理）时拒绝导入，防两个写操作并发打后端。守卫读真源
        if (busyAccountsRef.has(alias)) {
            toaster.create({ type: 'warning', title: '该账号正在执行中，请等待执行完毕' });
            return;
        }
        buttonLoading.onOpen();
        onBusyRef.current?.(alias, true); // 导入期间登记忙：批量动作跳过本账号（互斥对称）
        try {
            const rawCfg = await file.text();
            // 区服名单现查（弹窗版用 props 传入的 areas，流程本体在 accountShared.importConfigFile）
            const accountDetail = await getAccount(alias);
            const areas = accountDetail?.area || [];
            if (areas.length === 0) {
                throw new Error('该账号暂无可用区服，无法导入配置');
            }
            await importConfigFile({
                alias,
                rawCfg,
                areas,
                onFavWriteFailed: () => toaster.create({ type: 'warning', title: '配置已导入，但收藏标记保存失败（本地存储不可用）' }),
            });
            toaster.create({ type: 'success', title: '配置导入成功' });
            // 失效区服配置缓存：详情页 Picker 会预热它，不清会导致详情页显示导入前的旧值、且后续拨控件以旧值为基准写回
            clearAreaConfigCache(alias);
            onToggle();
        } catch (err) {
            if (err instanceof AxiosError) {
                toaster.create({
                    type: 'error',
                    title: '配置导入失败',
                    description: await getErrorDescription(err),
                });
            } else {
                toaster.create({
                    type: 'error',
                    title: '配置导入失败',
                    description: (err as Error).message,
                });
            }
        } finally {
            buttonLoading.onClose();
            onBusyRef.current?.(alias, false);
        }
    };

    // 函数渲染，不要内嵌组件（否则每帧新类型，按钮整卸整挂）
    const renderActionButtons = (
        size: 'xs' | 'sm' | 'md' = 'xs',
        flexMode = false,
    ) => (
        <HStack
            gap={flexMode ? 0 : 1}
            w={flexMode ? 'full' : undefined}
            justify={flexMode ? 'space-between' : undefined}
            align="center"
            onClick={(e) => e.stopPropagation()}
        >
            <input
                ref={importFileRef}
                type="file"
                accept=".autopcrcfg"
                style={{ display: 'none' }}
                onChange={handleImportConfigFile}
            />

            <Tooltip content="立刻清理" openDelay={0} closeDelay={0}>
                <IconButton
                    aria-label="Clean Daily"
                    size={size}
                    flex={flexMode ? '1' : undefined}
                    variant="ghost"
                    colorPalette="orange"
                    onClick={handleCleanDaily}
                    loading={buttonLoading.open}
                    disabled={isBusy}
                >
                    <FiTarget />
                </IconButton>
            </Tooltip>

            <Tooltip content="导入配置" openDelay={0} closeDelay={0}>
                <IconButton
                    aria-label="Import Config"
                    size={size}
                    flex={flexMode ? '1' : undefined}
                    variant="ghost"
                    colorPalette="blue"
                    onClick={() => importFileRef.current?.click()}
                    loading={buttonLoading.open}
                    disabled={isBusy}
                >
                    <FiUpload />
                </IconButton>
            </Tooltip>

            <Tooltip content="同步配置" openDelay={0} closeDelay={0}>
                <IconButton
                    aria-label="Sync Config"
                    size={size}
                    flex={flexMode ? '1' : undefined}
                    variant="ghost"
                    colorPalette="teal"
                    onClick={() => onOpenSyncConfig && onOpenSyncConfig(alias)}
                    loading={buttonLoading.open}
                    disabled={isBusy}
                >
                    <FiCopy />
                </IconButton>
            </Tooltip>

            <Tooltip content="运行结果" openDelay={0} closeDelay={0}>
                <IconButton
                    aria-label="View Results"
                    size={size}
                    flex={flexMode ? '1' : undefined}
                    variant="ghost"
                    colorPalette="green"
                    onClick={handleDailyResult}
                    loading={buttonLoading.open}
                    disabled={isBusy}
                >
                    <FiActivity />
                </IconButton>
            </Tooltip>
        </HStack>
    );

    if (isTableView) {
        return (
            <Table.Row key={alias} bg="bg.panel" _hover={{ bg: 'bg.muted' }}>
                <Table.Cell px={2} py={3} width="56px" onClick={(e) => e.stopPropagation()}>
                    <Flex align="center" justify="center" minH="2.75em" px={1} py={1}>
                        <RoundCheckbox checked={isSelected} onToggle={onToggleSelect} />
                    </Flex>
                </Table.Cell>

                <Table.Cell px={2} py={3}>
                    <Flex
                        align="center"
                        gap={2}
                        minW={0}
                        w="full"
                        cursor="pointer"
                        onClick={goDetail}
                        title="进入详细设置"
                    >
                        {/* ✅ 补回内层 Flex 容器；曾用名 minW 保底，标签不挤占省略空间 */}
                        <Flex align="center" gap={1} minW={0} flex="1" lineHeight="1">
                            <Flex
                                boxSize="2em"
                                flexShrink={0}
                                bg="blue.subtle"
                                color="blue.fg"
                                borderRadius="full"
                                align="center"
                                justify="center"
                                fontSize="sm"
                                lineHeight="1"
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </Flex>

                            <Box
                                onClick={(e) => e.stopPropagation()}
                                display="flex"
                                alignItems="center"
                                lineHeight="1"
                                fontSize="sm"
                                flexShrink={1}
                                minW={0}
                                maxW={displayName !== alias ? '42%' : '70%'}
                            >
                                {nameInput}
                            </Box>

                            {displayName !== alias && (
                                <Text
                                    as="span"
                                    fontSize="xs"
                                    color="fg.muted"
                                    whiteSpace="nowrap"
                                    lineHeight="1"
                                    flex="1 1 4.5em"
                                    minW="4.5em"
                                    overflow="hidden"
                                    textOverflow="ellipsis"
                                    title={alias}
                                >
                                    {alias}
                                </Text>
                            )}

                            {/* 标签单独一组 flexShrink=0，避免反噬曾用名 */}
                            <Flex align="center" gap={1} flexShrink={0}>
                                <AccountTags isDefault={batchAccounts.includes(account.name)} clanForbid={account.clan_forbid} compact />
                            </Flex>
                        </Flex>

                        <Box flexShrink={0} onClick={(e) => e.stopPropagation()}>
                            <Alert
                                leastDestructiveRef={cancelRef}
                                isOpen={deleteConfirm.open}
                                onClose={deleteConfirm.onClose}
                                title="删除账号"
                                body={`确定删除账号${alias}吗？`}
                                onConfirm={handleDeleteAccount}
                            >
                                {' '}
                            </Alert>
                            {/* 热区略小、叉图形略大 */}
                            <IconButton
                                aria-label="Delete"
                                size="xs"
                                variant="ghost"
                                colorPalette="gray"
                                title="删除账号"
                                minW="1.5rem"
                                h="1.5rem"
                                p={0}
                                fontSize="1.25rem"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConfirm.onOpen();
                                }}
                                _hover={{ bg: 'red.subtle', color: 'red.fg' }}
                            >
                                <FiX size={18} strokeWidth={2.5} />
                            </IconButton>
                        </Box>
                    </Flex>
                </Table.Cell>

                {/* 表格状态列：保持可进详情（仅卡片状态区做安全点击区） */}
                <Table.Cell
                    px={3}
                    py={3}
                    cursor="pointer"
                    onClick={goDetail}
                    title="进入详细设置"
                >
                    <Flex align="center" gap={2} minW={0}>
                        <StatusTag
                            isBusy={isBusy}
                            color={statusMeta.color}
                            icon={statusMeta.icon}
                            label={`${statusMeta.label}${cleanTime ? ` ${cleanTime}` : ''}`}
                        />
                    </Flex>
                </Table.Cell>

                <Table.Cell
                    px={3}
                    py={3}
                    cursor="pointer"
                    onClick={goDetail}
                    title="进入详细设置"
                >
                    {renderActionButtons('xs')}
                </Table.Cell>
            </Table.Row>
        );
    }

    return (
        <Card.Root
            key={alias}
            bg="bg.panel"
            shadow="sm"
            borderRadius="2xl"
            borderWidth="1px"
            borderColor={isSelected ? 'blue.focusRing' : 'border.subtle'}
            transition="all 0.2s"
            overflow="hidden"
            cursor="pointer"
            onClick={goDetail}
            /* 不要在 Root 上挂 title：会继承到选框/删除/状态，悬停误提示「进入详细设置」 */
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)', borderColor: 'blue.focusRing' }}
        >
            {/* 整卡 onClick 进详情；Header/状态/按钮区内控件自行 stopPropagation */}
            <Card.Header px={4} pt={3} pb={3} minH="2.75em" title="进入详细设置">
                {/* 整 Header 随卡片进详情；仅选框/改名/删除 stopPropagation */}
                <Flex align="center" gap={2} minH="2.25em">
                    <Box
                        onClick={(e) => e.stopPropagation()}
                        flexShrink={0}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        title="选择账号"
                        cursor="default"
                    >
                        <RoundCheckbox checked={isSelected} onToggle={onToggleSelect} />
                    </Box>

                    <Flex align="center" gap={2} minW={0} flex="1" overflow="hidden">
                        <Box
                            onClick={(e) => e.stopPropagation()}
                            display="flex"
                            alignItems="center"
                            lineHeight="1"
                            fontSize="lg"
                            flex="1 1 6em"
                            minW="4em"
                            maxW={displayName !== alias ? '52%' : '75%'}
                            overflow="hidden"
                            title="点击修改显示名称"
                            cursor="default"
                        >
                            {nameInput}
                        </Box>

                        {displayName !== alias && (
                            <Text
                                as="span"
                                fontSize="xs"
                                color="fg.muted"
                                whiteSpace="nowrap"
                                overflow="hidden"
                                textOverflow="ellipsis"
                                flex="1 1 4em"
                                minW="3em"
                                maxW="32%"
                                lineHeight="1"
                                title={alias}
                            >
                                {alias}
                            </Text>
                        )}

                        <Flex align="center" gap={1} flexShrink={0} minW={0}>
                            <AccountTags isDefault={batchAccounts.includes(account.name)} clanForbid={account.clan_forbid} />
                        </Flex>
                    </Flex>

                    <Box
                        onClick={(e) => e.stopPropagation()}
                        flexShrink={0}
                        title="删除账号"
                        cursor="default"
                    >
                        <Alert
                            leastDestructiveRef={cancelRef}
                            isOpen={deleteConfirm.open}
                            onClose={deleteConfirm.onClose}
                            title="删除账号"
                            body={`确定删除账号${displayName || alias}吗？`}
                            onConfirm={handleDeleteAccount}
                        >
                            {' '}
                        </Alert>
                        <IconButton
                            size="xs"
                            variant="ghost"
                            colorPalette="gray"
                            aria-label="Delete"
                            title="删除账号"
                            minW="1.5rem"
                            w="1.5rem"
                            h="1.5rem"
                            p={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteConfirm.onOpen();
                            }}
                            _hover={{ bg: 'red.subtle', color: 'red.fg' }}
                            css={{
                                '& svg': {
                                    width: '1.4em',
                                    height: '1.4em',
                                    strokeWidth: 2.5,
                                },
                            }}
                        >
                            <FiX />
                        </IconButton>
                    </Box>
                </Flex>
            </Card.Header>

            {/* 整卡任意位置点击都进详情（含运行状态区） */}
            <Card.Body px={4} py={2} title="进入详细设置" cursor="pointer">
                <Box
                    bg="bg.subtle"
                    p={2}
                    borderRadius="lg"
                >
                    <Flex justify="space-between" align="center" mb={1} gap={2}>
                        <Text fontSize="xs" color="fg.muted">
                            上次运行
                        </Text>
                        <Text fontSize="xs" fontWeight="bold">
                            {cleanTime || '—'}
                        </Text>
                    </Flex>
                    <Flex justify="space-between" align="center" gap={2}>
                        <Text fontSize="xs" color="fg.muted" flexShrink={0}>
                            状态
                        </Text>
                        <StatusTag isBusy={isBusy} color={statusMeta.color} icon={statusMeta.icon} label={cleanStatus} />
                    </Flex>
                </Box>
            </Card.Body>

            <Card.Footer px={4} pt={2} pb={3} title="进入详细设置">
                {renderActionButtons('md', true)}
            </Card.Footer>
        </Card.Root>
    );
}