import { AccountInfo as AccountInfoInterface, UserInfoResponse } from '@interfaces/UserInfo';
import {
    Box,
    Button,
    Card,
    Flex,
    HStack,
    Input,
    SimpleGrid,
    Spacer,
    Stack,
    Table,
    Tag,
    Text,
} from '@chakra-ui/react';
import { FiActivity, FiBook, FiCheck, FiCopy, FiGrid, FiKey, FiLayers, FiList, FiStar, FiTarget, FiUpload, FiUserMinus, FiUserPlus, FiUserX, FiX } from 'react-icons/fi';
import { Radio, RadioGroup } from '../../components/ui/radio';
import React, { ChangeEvent, useMemo, useRef } from 'react';
import { Skeleton, SkeletonText } from '../../components/ui/skeleton';
import { clearAccounts, deleteAccount, getAccountDailyResultList, getUserInfo, putUserInfo } from '@api/Account';
import { delAccount, getAccount, getAccountConfig, postAccount, postAccountAreaDaily, postAccountImport, putAccountConfigs } from '@api/Account';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';

import Alert from '../alert';
import { AxiosError } from 'axios';
import { Checkbox } from '../../components/ui/checkbox';
import { Route as DashBoardRoute } from '@routes/daily/_sidebar/account/index';
import { IconButton } from '../../components/ui/icon-button';
import { Route as LoginRoute } from '@routes/daily/login';
import NiceModal from '@ebay/nice-modal-react';
import ReadmeModal from './ReadmeModal';
import ResultInfoModal from './ResultInfoModal';
import { Tooltip } from '../../components/ui/tooltip';
import resetPasswdModal from '../Users/ResetPasswdModal';
import { toaster } from '../../components/ui/toaster';
import { useCountHook } from '../count';
import { useDisclosure } from '@chakra-ui/react';
import ConfigSyncModal from './ConfigSyncModal';
import type { Candidate, ConfigType, ConfigValue, ModuleResponse } from '@interfaces/Module';

const handle: Map<string, (arg0: boolean) => void> = new Map<string, (arg0: boolean) => void>();

const DISPLAY_NAME_KEY = (alias: string) => `autopcr_displayName_${alias}`;

function getDisplayName(alias: string): string {
    return localStorage.getItem(DISPLAY_NAME_KEY(alias)) || alias;
}

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
    const freshAccountInfo = useDisclosure();
    const creatAccountSwitch = useDisclosure();
    const deleteQQConfirm = useDisclosure();
    const clearAccountConfirm = useDisclosure();
    const [alias, setAlias] = useState<string>('');
    const [count, increaseCount, decreaseCount] = useCountHook();
    const [isTableView, setIsTableView] = useState<boolean>(() => {
        const savedView = localStorage.getItem('accountViewMode');
        return savedView ? savedView === 'table' : false;
    });
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

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
        handle.clear();
        getUserInfo()
            .then((res) => {
                setUserInfo(res);
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: (err?.response?.data as string) || '网络错误' });
            });
    }, [freshAccountInfo.open]);

    const handleDefaultAccount = (value: string) => {
        putUserInfo({ default_account: value })
            .then((res) => {
                setUserInfo({ ...userInfo, default_account: value });
                toaster.create({ type: 'success', title: '设置默认账号成功', description: res });
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '设置默认账号失败', description: (err?.response?.data as string) || '网络错误' });
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
                    .catch((err: AxiosError) => {
                        toaster.create({ type: 'error', title: '修改密码失败', description: (err?.response?.data as string) || '网络错误' });
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

    const handleCleanDailyAll = () => {
        if (isTableView && selectedAccounts.length > 0) {
            for (const accountName of selectedAccounts) {
                const fn = handle.get(accountName);
                if (fn) fn(false);
            }
        } else {
            for (const fn of handle.values()) {
                fn(false);
            }
        }
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
        if (selectedAccounts.length === userInfo?.accounts?.length) {
            setSelectedAccounts([]);
        } else {
            setSelectedAccounts(userInfo?.accounts?.map((acc) => acc.name) ?? []);
        }
    };

    const handleCreateAccount = () => {
        if (creatAccountSwitch.open) {
            if (!alias || alias.trim() === '') {
                toaster.create({
                    type: 'error',
                    title: '创建账号失败',
                    description: '账号昵称不能为空',
                });
                return;
            }

            postAccount(alias)
                .then((res) => {
                    toaster.create({
                        type: 'success',
                        title: '创建账号成功',
                        description: res,
                    });
                    creatAccountSwitch.onToggle();
                    setAlias('');
                    freshAccountInfo.onToggle();
                })
                .catch((err: AxiosError) => {
                    toaster.create({
                        type: 'error',
                        title: '创建账号失败',
                        description: (err?.response?.data as string) || '网络错误',
                    });
                });
        } else {
            creatAccountSwitch.onToggle();
        }
    };

    const handleAccountImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            postAccountImport(file)
                .then((res) => {
                    toaster.create({ type: 'success', title: '导入账号成功', description: res });
                    freshAccountInfo.onToggle();
                })
                .catch((err: AxiosError) => {
                    toaster.create({ type: 'error', title: '导入账号失败', description: (err?.response?.data as string) || '网络错误' });
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
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '删除QQ失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const handleClearAccounts = () => {
        clearAccounts()
            .then((res) => {
                toaster.create({ type: 'success', title: '清除账号成功', description: res });
                clearAccountConfirm.onToggle();
                freshAccountInfo.onToggle();
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '清除账号失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const occupiedNamesFactory = useMemo(() => {
        return (selfAlias: string) => collectOccupiedNames(userInfo?.accounts, selfAlias);
    }, [userInfo?.accounts]);

    return (
        <Stack gap={4} h="full" w="full" p={4} position="relative" zIndex={1}>
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
                p={2}
                borderRadius="xl"
                shadow="sm"
                borderWidth="1px"
                borderColor="border.subtle"
                align="center"
                wrap="wrap"
                gap={2}
            >
                <HStack gap={2}>
                     <Button
                        size="sm"
                        colorPalette="orange"
                        variant="ghost"
                        onClick={handleCleanDailyAll}
                        loading={count != 0}
                    >
                        <FiTarget /> {isTableView && selectedAccounts.length > 0 ? `清选择(${selectedAccounts.length})` : '清理全部'}
                    </Button>
                    <Button
                        as={Link}
                        size="sm"
                        colorPalette="blue"
                        variant="ghost"
                        // @ts-ignore
                        to={`${DashBoardRoute.to || ''}BATCH_RUNNER`}
                        loading={count != 0}
                    >
                        <FiLayers /> 批量运行
                    </Button>
                </HStack>

                <Spacer />

                <HStack gap={2}>
                    <Box bg="bg.subtle" p={1} borderRadius="md" display="flex">
                        <Tooltip content="表格视图" openDelay={0} closeDelay={0}>
                            <IconButton
                                aria-label="List view"
                                size="xs"
                                variant={isTableView ? "solid" : "ghost"}
                                colorPalette={isTableView ? "blue" : "gray"}
                                onClick={() => {
                                    setIsTableView(true);
                                    localStorage.setItem('accountViewMode', 'table');
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
                                    localStorage.setItem('accountViewMode', 'card');
                                }}
                            >
                                <FiGrid />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {isTableView && selectedAccounts.length === 1 && (
                        <HStack gap={1} separator={<Box w="1px" h="15px" bg="border.subtle" />}>
                             <Tooltip content={`将其他账号配置同步为 ${selectedAccounts[0]} 的配置`} openDelay={0} closeDelay={0}>
                                <IconButton
                                    aria-label="Sync configuration"
                                    size="sm"
                                    variant="ghost"
                                    colorPalette="teal"
                                    onClick={() => {
                                        NiceModal.show(ConfigSyncModal, { sourceAccount: selectedAccounts[0] });
                                    }}
                                > <FiCopy /> </IconButton>
                            </Tooltip>
                            <Tooltip content={`将 ${selectedAccounts[0]} 设为默认账号`}  openDelay={0} closeDelay={0}>
                                <IconButton
                                    aria-label="Set as default"
                                    size="sm"
                                    variant="ghost"
                                    colorPalette="purple"
                                    onClick={() => handleDefaultAccount(selectedAccounts[0])}
                                > <FiStar /> </IconButton>
                            </Tooltip>
                        </HStack>
                    )}

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

                         <Tooltip content={isTableView && selectedAccounts.length > 0 ? `删除选中(${selectedAccounts.length})` : '删除全部'}  openDelay={0} closeDelay={0}>
                            <IconButton
                                aria-label="Delete selected accounts"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                onClick={() => {
                                    if (isTableView && selectedAccounts.length > 0) {
                                        if (window.confirm(`确定删除选中的 ${selectedAccounts.length} 个账号吗？`)) {
                                            Promise.all(selectedAccounts.map((name) => delAccount(name)))
                                                .then(() => {
                                                    toaster.create({ type: 'success', title: '删除成功' });
                                                    setSelectedAccounts([]);
                                                    freshAccountInfo.onToggle();
                                                })
                                                .catch((err) => toaster.create({ type: 'error', title: '删除失败', description: (err?.response?.data as string) || '网络错误' }));
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
                                        if(creatAccountSwitch.open && !alias) creatAccountSwitch.onToggle();
                                        else if (creatAccountSwitch.open && alias) handleCreateAccount();
                                        else creatAccountSwitch.onToggle();
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

            {isTableView ? (
                <Box flex={1} overflow={'auto'} borderRadius="xl">
                    <Table.Root variant="outline" colorPalette="blue" size="sm" bg="bg.panel" borderRadius="xl" boxShadow="sm" ml="0" mr="auto">
                        <Table.Header position="sticky" top={0} bg="bg.subtle" zIndex={1} boxShadow="sm">
                            <Table.Row>
                                <Table.ColumnHeader px={3} fontSize="md" py={4} fontWeight="bold" width="5%">
                                    <Checkbox
                                        checked={
                                            (selectedAccounts.length > 0 && selectedAccounts.length < (userInfo?.accounts?.length ?? 0))
                                                ? "indeterminate"
                                                : (selectedAccounts.length > 0 && selectedAccounts.length === userInfo?.accounts?.length)
                                        }
                                        onCheckedChange={toggleSelectAll}
                                        colorPalette="blue"
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
                            {!userInfo ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Table.Row key={i} bg="transparent">
                                        <Table.Cell px={3} py={2}><Skeleton height="20px" width="20px" /></Table.Cell>
                                        <Table.Cell px={0} py={2}><Skeleton height="20px" width="80%" /></Table.Cell>
                                        <Table.Cell px={3} py={2}><Skeleton height="20px" width="60%" /></Table.Cell>
                                        <Table.Cell px={3} py={2}><Skeleton height="32px" width="100%" /></Table.Cell>
                                    </Table.Row>
                                ))
                            ) : (
                                userInfo?.accounts?.map((account) => (
                                    <AccountInfo
                                        key={account.name}
                                        account={account}
                                        onToggle={freshAccountInfo.onToggle}
                                        increaseCount={increaseCount}
                                        decreaseCount={decreaseCount}
                                        updateAccountInfo={updateAccountInfo}
                                        isTableView={isTableView}
                                        isSelected={selectedAccounts.includes(account.name)}
                                        onToggleSelect={() => toggleSelectAccount(account.name)}
                                        defaultAccount={userInfo?.default_account}
                                        getOccupiedNames={occupiedNamesFactory}
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
                <RadioGroup onValueChange={(e) => handleDefaultAccount(e.value || "")} value={userInfo?.default_account} flex={1} overflow={'auto'} p={1}>
                    <Stack>
                        <SimpleGrid gap={4} templateColumns="repeat(auto-fill, minmax(280px, 1fr))">
                            {!userInfo ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <Card.Root key={i} bg="bg.panel" borderRadius="2xl" shadow="sm">
                                        <Card.Header><Skeleton height="24px" width="50%" /></Card.Header>
                                        <Card.Body><SkeletonText noOfLines={3} gap={4} /></Card.Body>
                                        <Card.Footer><Skeleton height="32px" width="100%" /></Card.Footer>
                                    </Card.Root>
                                ))
                            ) : (
                                userInfo?.accounts?.map((account) => {
                                    return (
                                        <AccountInfo
                                            key={account.name}
                                            account={account}
                                            onToggle={freshAccountInfo.onToggle}
                                            increaseCount={increaseCount}
                                            decreaseCount={decreaseCount}
                                            updateAccountInfo={updateAccountInfo}
                                            isTableView={isTableView}
                                            isSelected={selectedAccounts.includes(account.name)}
                                            onToggleSelect={() => toggleSelectAccount(account.name)}
                                            getOccupiedNames={occupiedNamesFactory}
                                            onOpenSyncConfig={(a) => {
                                                NiceModal.show(ConfigSyncModal, { sourceAccount: a });
                                            }}
                                        />
                                    );
                                })
                            )}
                        </SimpleGrid>
                    </Stack>
                </RadioGroup>
            )}
        </Stack>
    );
}

interface AccountInfoProps {
    account: AccountInfoInterface;
    onToggle: () => void;
    increaseCount: () => void;
    decreaseCount: () => void;
    updateAccountInfo: (updatedAccount: AccountInfoInterface) => void;
    isTableView?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    defaultAccount?: string;
    onOpenSyncConfig?: (alias: string) => void;
    getOccupiedNames: (selfAlias: string) => Set<string>;
}

function AccountInfo({
    account,
    onToggle,
    increaseCount,
    decreaseCount,
    updateAccountInfo,
    isTableView = false,
    isSelected = false,
    onToggleSelect,
    defaultAccount,
    onOpenSyncConfig,
    getOccupiedNames,
}: AccountInfoProps) {
    const buttomLoading = useDisclosure();
    const alias = account.name;
    const deleteConfirm = useDisclosure();
    const navigate = useNavigate();
    const importFileRef = useRef<HTMLInputElement>(null);
    const cancelRef = React.useRef<HTMLButtonElement>(null);

    const [isEditingName, setIsEditingName] = useState(false);
    const [displayName, setDisplayName] = useState(() => getDisplayName(alias));
    const [nameDraft, setNameDraft] = useState(displayName);
    const composingRef = useRef(false);

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
        const latest = getDisplayName(alias);
        setDisplayName(latest);
        if (!isEditingName) setNameDraft(latest);
    }, [alias, isEditingName]);

    const handleCleanDaily = async () => {
        buttomLoading.onOpen();
        increaseCount();
        toaster.create({ type: 'info', title: `开始为${displayName || alias}清理日常...` });
        try {
            const res = await postAccountAreaDaily(alias);
            updateAccountInfo(res);

            const st = res?.daily_clean_time?.status || '';
            if (st === '错误') {
                toaster.create({ type: 'error', title: `${displayName || alias}清日常结束`, description: st });
            } else if (st === '警告' || st === '中止') {
                toaster.create({ type: 'warning', title: `${displayName || alias}清日常完成(${st})`, description: st });
            } else if (st === '成功' || st === '跳过') {
                toaster.create({ type: 'success', title: `${displayName || alias}清日常成功` });
            } else {
                toaster.create({ type: 'success', title: `${displayName || alias}清日常完成`, description: st || undefined });
            }
        } catch (err: any) {
            toaster.create({
                type: 'error',
                title: `${displayName || alias}清日常失败`,
                description: (err?.response?.data as string) || err?.message || '网络错误',
            });
        } finally {
            buttomLoading.onClose();
            decreaseCount();
        }
    };

    handle.set(account.name, handleCleanDaily);

    const handleDeleteAccount = () => {
        delAccount(alias)
            .then((res) => {
                toaster.create({ type: 'success', title: '删除账号成功', description: res });
                onToggle();
            })
            .catch((err: AxiosError) => {
                toaster.create({
                    type: 'error',
                    title: '删除账号失败',
                    description: (err?.response?.data as string) || '网络错误',
                });
            });
    };

    const handleDailyResult = () => {
        toaster.create({ type: 'info', title: `正在获取${displayName || alias}的日常结果...` });
        getAccountDailyResultList(alias)
            .then(async (res) => {
                toaster.create({ type: 'success', title: '获取日常结果成功' });
                await NiceModal.show(ResultInfoModal, { alias: alias, title: '日常', resultInfo: res });
            })
            .catch(async (err: AxiosError) => {
                toaster.create({
                    type: 'error',
                    title: '获取日常结果失败',
                    description: (await (err?.response?.data as Blob).text()) || '网络错误',
                });
            });
    };

    const goDetail = () => {
        void navigate({ to: `${DashBoardRoute.to || ''}${alias}` as any });
    };

    const nameInputRef = useRef<HTMLInputElement>(null);

    const startEditName = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNameDraft(displayName);
        setIsEditingName(true);
    };

    useEffect(() => {
        if (!isEditingName) return;
        const el = nameInputRef.current;
        if (!el) return;
        el.focus();
        // 光标放到末尾，避免整段被选中
        const len = el.value.length;
        el.setSelectionRange(len, len);
    }, [isEditingName]);

    const commitDisplayName = () => {
        const next = nameDraft.trim();
        // 空或改回原始 alias → 清除自定义显示名
        if (!next || next === alias) {
            localStorage.removeItem(DISPLAY_NAME_KEY(alias));
            setDisplayName(alias);
            setNameDraft(alias);
            setIsEditingName(false);
            return;
        }
        // 没改
        if (next === displayName) {
            setIsEditingName(false);
            return;
        }
        const occupied = getOccupiedNames(alias);
        if (occupied.has(next)) {
            toaster.create({
                type: 'error',
                title: '显示名冲突',
                description: `「${next}」已被其他账号使用`,
            });
            setNameDraft(displayName);
            setIsEditingName(false);
            return;
        }
        localStorage.setItem(DISPLAY_NAME_KEY(alias), next);
        setDisplayName(next);
        setIsEditingName(false);
    };

    // 始终同一 Input：展示/编辑同一位置，避免 Text→Input 错位
    const nameInput = (
        <Input
            ref={nameInputRef}
            size="sm"
            value={isEditingName ? nameDraft : displayName}
            readOnly={!isEditingName}
            title={isEditingName ? undefined : '点击修改显示名称'}
            onClick={(e) => {
                e.stopPropagation();
                if (!isEditingName) startEditName(e);
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
            }}
            onBlur={() => {
                if (!isEditingName) return;
                if (composingRef.current) return;
                commitDisplayName();
            }}
            onKeyDown={(e) => {
                if (!isEditingName) return;
                if (composingRef.current) return;
                if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setNameDraft(displayName);
                    setIsEditingName(false);
                }
            }}
            fontWeight="bold"
            fontSize="inherit"
            lineHeight="1.25"
            h="2rem"
            minH="2rem"
            minW="4.5em"
            w="auto"
            maxW="14em"
            px={2}
            py={0}
            borderRadius="md"
            borderWidth="1px"
            borderColor={isEditingName ? 'blue.focusRing' : 'transparent'}
            bg={isEditingName ? 'bg.panel' : 'transparent'}
            boxShadow="none"
            cursor={isEditingName ? 'text' : 'text'}
            _hover={
                isEditingName
                    ? undefined
                    : { bg: 'bg.subtle', borderColor: 'border.subtle' }
            }
            _focusVisible={{
                borderColor: 'blue.focusRing',
                boxShadow: 'none',
            }}
            css={{
                // 取消部分浏览器只读态发灰
                '&:read-only': { opacity: 1, cursor: 'text' },
            }}
        />
    );

    const toCheckedConfigItem = (
        type: ConfigType,
        candidates: Candidate[],
        value: unknown,
    ): ConfigValue | undefined => {
        switch (type) {
            case 'bool':
            case 'single':
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    return value as ConfigValue;
                }
                break;
            case 'int':
                if (typeof value === 'number') return value;
                break;
            case 'text':
                if (typeof value === 'string') return value;
                break;
            case 'time':
                if (typeof value === 'string' && value.match(/^\d{2}:\d{2}$/) !== null) return value;
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
    };

    const realImportByModule = (
        module: ModuleResponse,
        configs: Record<string, ConfigValue>,
    ): Record<string, ConfigValue> => {
        const uploadConfig: Record<string, ConfigValue> = {};
        for (const moduleKey in module.info) {
            if (configs[moduleKey] !== undefined && typeof configs[moduleKey] === 'boolean') {
                uploadConfig[moduleKey] = configs[moduleKey];
            }
            const moduleConf = module.info[moduleKey].config;
            for (const moduleConfKey in moduleConf) {
                const moduleItem = moduleConf[moduleConfKey];
                const confItem = toCheckedConfigItem(
                    moduleItem.config_type,
                    moduleItem.candidates,
                    configs[moduleConfKey],
                );
                if (confItem !== undefined) {
                    uploadConfig[moduleConfKey] = confItem;
                }
            }
        }
        return uploadConfig;
    };

    const handleImportConfigFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        buttomLoading.onOpen();
        try {
            const rawCfg = await file.text();
            let configs: Record<string, Record<string, ConfigValue>>;
            try {
                configs = JSON.parse(decodeURIComponent(atob(rawCfg.trim()))) as Record<
                    string,
                    Record<string, ConfigValue>
                >;
            } catch {
                throw new Error('配置文件格式无效，请检查选取的配置文件。');
            }

            const accountDetail = await getAccount(alias);
            const areas = accountDetail?.area || [];
            if (!areas.length) {
                throw new Error('该账号暂无可用区服，无法导入配置');
            }

            const configItems = await Promise.all(
                areas.map((area: { key: string }) => getAccountConfig(alias, area.key)),
            );
            const uploadConfig: Record<string, ConfigValue> = {};
            const importedFav: Record<string, string[]> = {};

            configItems.forEach((value, index) => {
                const areaKey = areas[index].key;
                const areaConfig = configs[areaKey];
                if (!areaConfig) return;

                Object.assign(uploadConfig, realImportByModule(value, areaConfig));

                for (const key in areaConfig) {
                    if (key.startsWith('_fav_')) {
                        importedFav[areaKey] = importedFav[areaKey] || [];
                        if (areaConfig[key] === true) {
                            importedFav[areaKey].push(key.slice(5));
                        }
                    } else if (uploadConfig[key] === undefined && areaConfig[key] !== undefined) {
                        uploadConfig[key] = areaConfig[key];
                    }
                }
            });

            localStorage.setItem(`autopcr_fav_${alias}`, JSON.stringify(importedFav));
            await putAccountConfigs(alias, uploadConfig);
            toaster.create({ type: 'success', title: '配置导入成功' });
            onToggle();
        } catch (err) {
            if (err instanceof AxiosError) {
                toaster.create({
                    type: 'error',
                    title: '配置导入失败',
                    description: (err.response?.data as string) || '网络错误',
                });
            } else {
                toaster.create({
                    type: 'error',
                    title: '配置导入失败',
                    description: (err as Error).message,
                });
            }
        } finally {
            buttomLoading.onClose();
        }
    };

    const renderActionButtons = (size: 'xs' | 'sm' | 'md' = 'xs', flexMode = false) => (
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
                    loading={buttomLoading.open}
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
                    loading={buttomLoading.open}
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
                    loading={buttomLoading.open}
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
                    loading={buttomLoading.open}
                >
                    <FiActivity />
                </IconButton>
            </Tooltip>
        </HStack>
    );


    if (isTableView) {
        return (
            <Table.Row key={alias} bg="bg.panel" _hover={{ bg: 'bg.muted' }}>
                <Table.Cell px={3} py={3} width="50px" onClick={(e) => e.stopPropagation()}>
                    <Flex align="center" minH="2.5em">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onToggleSelect}
                            colorPalette="blue"
                        />
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
                        {/* ✅ 补回内层 Flex 容器 */}
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
                                h="2rem"
                                fontSize="sm"
                                flex="0 1 auto"
                                minW={0}
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
                                >
                                    {alias}
                                </Text>
                            )}
                            {defaultAccount === account.name && (
                                <Tag.Root size="sm" colorPalette="purple" variant="solid" flexShrink={0}>
                                    <Tag.Label>默认</Tag.Label>
                                </Tag.Root>
                            )}
                            {account.clan_forbid && (
                                <Tag.Root size="sm" colorPalette="red" variant="solid" flexShrink={0}>
                                    <Tag.Label>公会战禁用</Tag.Label>
                                </Tag.Root>
                            )}
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
                            <IconButton
                                aria-label="Delete"
                                size="xs"
                                variant="ghost"
                                colorPalette="gray"
                                title="删除账号"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConfirm.onOpen();
                                }}
                                _hover={{ bg: 'red.subtle', color: 'red.fg' }}
                            >
                                <FiX />
                            </IconButton>
                        </Box>
                    </Flex>
                </Table.Cell>

                <Table.Cell
                    px={3}
                    py={3}
                    cursor="pointer"
                    onClick={goDetail}
                    title="进入详细设置"
                >
                    <Flex align="center" gap={2} minW={0}>
                        <Tag.Root colorPalette={statusMeta.color} variant="subtle" flexShrink={0}>
                            <Tag.StartElement>{statusMeta.icon}</Tag.StartElement>
                            <Tag.Label>
                                {statusMeta.label}
                                {cleanTime ? ` ${cleanTime}` : ''}
                            </Tag.Label>
                        </Tag.Root>
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
            borderColor="border.subtle"
            transition="all 0.2s"
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)', borderColor: 'blue.focusRing' }}
        >
            <Box
                cursor="pointer"
                onClick={goDetail}
                title="进入详细设置"
            >
                <Card.Header pb={2}>
                    <Flex justify="space-between" align="start" gap={2}>
                        <Flex align="center" gap={0} minW={0} flex="1" pt={0}>
                            <Box
                                onClick={(e) => e.stopPropagation()}
                                flexShrink={0}
                                display="flex"
                                alignItems="center"
                                lineHeight="1"
                            >
                                <Radio value={alias} colorPalette="purple" />
                            </Box>
                            <Box
                                maxW="70%"
                                minW={0}
                                onClick={(e) => e.stopPropagation()}
                                display="flex"
                                alignItems="center"
                                h="2rem"
                                fontSize="lg"
                                flex="0 1 auto"
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
                                    maxW="30%"
                                    lineHeight="1"
                                    title={alias}
                                >
                                    {alias}
                                </Text>
                            )}
                            {account.clan_forbid && (
                                <Tag.Root size="sm" colorPalette="red" variant="subtle" flexShrink={0}>
                                    <Tag.Label>禁用</Tag.Label>
                                </Tag.Root>
                            )}
                        </Flex>

                        <Box onClick={(e) => e.stopPropagation()} flexShrink={0}>
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
                            <IconButton
                                size="xs"
                                variant="ghost"
                                colorPalette="gray"
                                aria-label="Delete"
                                title="删除账号"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConfirm.onOpen();
                                }}
                                _hover={{ bg: 'red.subtle', color: 'red.fg' }}
                            >
                                <FiX />
                            </IconButton>
                        </Box>
                    </Flex>
                </Card.Header>

                <Card.Body py={2}>
                    <Box bg="bg.subtle" p={2} borderRadius="lg">
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
                            <Tag.Root size="sm" colorPalette={statusMeta.color} flexShrink={0}>
                                <Tag.StartElement>{statusMeta.icon}</Tag.StartElement>
                                <Tag.Label>{cleanStatus}</Tag.Label>
                            </Tag.Root>
                        </Flex>
                    </Box>
                </Card.Body>
            </Box>

            <Card.Footer pt={2}>
                {renderActionButtons('md', true)}
            </Card.Footer>
        </Card.Root>
    );
}
