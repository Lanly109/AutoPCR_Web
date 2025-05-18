import React, { ChangeEvent } from 'react';
import { clearAccounts, deleteAccount, getAccountDailyResultList, getUserInfo, postAccountSyncConfig, putUserInfo } from '@api/Account';
import { AccountInfo as AccountInfoInterface, UserInfoResponse } from '@interfaces/UserInfo';
import {
    RadioGroup,
    Radio,
    Button,
    Input,
    Stack,
    Card,
    CardHeader,
    CardBody,
    CardFooter,
    CloseButton,
    Flex,
    Spacer,
    Box,
    Tag,
    TagLeftIcon,
    TagLabel,
    SimpleGrid,
    useToast,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Checkbox,
    HStack,
    IconButton,
    Tooltip,
    useColorModeValue,
} from '@chakra-ui/react';

import { Route as DashBoardRoute } from '@routes/daily/_sidebar/account/index';
import { Route as LoginRoute } from '@routes/daily/login';
import { FiActivity, FiCopy, FiSettings, FiTarget, FiUser, FiGrid, FiList, FiUserMinus, FiUserPlus, FiUpload, FiKey, FiUserX, FiLayers, FiStar, FiCheck } from 'react-icons/fi';
import { postAccountImport, delAccount, postAccount, postAccountAreaDaily } from '@api/Account';
import { useDisclosure } from '@chakra-ui/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import NiceModal from '@ebay/nice-modal-react';
import ResultInfoModal from './ResultInfoModal';
import ReadmeModal from './ReadmeModal';
import Alert from '../alert';

const handle: Map<string, (arg0: boolean) => void> = new Map<string, (arg0: boolean) => void>();
import { FocusableElement } from '@chakra-ui/utils';
import { useCountHook } from '../count';
import { AxiosError } from 'axios';
import resetPasswdModal from '../Users/ResetPasswdModal';

export function DashBoard() {
    const toast = useToast();
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
    // 添加颜色模式相关的值
    const tableBgColor = useColorModeValue('white', 'gray.800');
    const tableHeaderBgColor = useColorModeValue('#F5F7FA', 'gray.800');
    const tableContainerBgColor = useColorModeValue('gray.100', 'gray.900');
    const tableRowBgColor = useColorModeValue('white', 'gray.700');
    const statusSuccessColor = useColorModeValue('#5cb85c', 'green.400');

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
                toast({ status: 'error', title: (err?.response?.data as string) || '网络错误' });
            });
    }, [freshAccountInfo.isOpen, toast]);

    const handleDefaultAccount = (value: string) => {
        putUserInfo({ default_account: value })
            .then((res) => {
                setUserInfo({ ...userInfo, default_account: value });
                toast({ status: 'success', title: '设置默认账号成功', description: res });
            })
            .catch((err: AxiosError) => {
                toast({ status: 'error', title: '设置默认账号失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const handleResetPassword = () => {
        NiceModal.show(resetPasswdModal, {})
            .then((value) => {
                putUserInfo({ password: value as string })
                    .then((res) => {
                        toast({ status: 'success', title: '修改密码成功', description: res });
                        NiceModal.hide(resetPasswdModal)
                            .then(() => {
                                return;
                            })
                            .catch(() => {
                                return;
                            });
                    })
                    .catch((err: AxiosError) => {
                        toast({ status: 'error', title: '修改密码失败', description: (err?.response?.data as string) || '网络错误' });
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
            // 清理选中的账号
            for (const accountName of selectedAccounts) {
                const fn = handle.get(accountName);
                if (fn) fn(false);
            }
        } else {
            // 清理所有账号
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
        if (creatAccountSwitch.isOpen) {
            // 检查alias是否为空
            if (!alias || alias.trim() === '') {
                toast({
                    status: 'error',
                    title: '创建账号失败',
                    description: '账号昵称不能为空',
                });
                return;
            }

            postAccount(alias)
                .then((res) => {
                    toast({
                        status: 'success',
                        title: '创建账号成功',
                        description: res,
                    });
                    creatAccountSwitch.onToggle();
                    setAlias(''); // 重置输入框
                    freshAccountInfo.onToggle();
                })
                .catch((err: AxiosError) => {
                    toast({
                        status: 'error',
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
                    toast({ status: 'success', title: '导入账号成功', description: res });
                    freshAccountInfo.onToggle();
                })
                .catch((err: AxiosError) => {
                    toast({ status: 'error', title: '导入账号失败', description: (err?.response?.data as string) || '网络错误' });
                });
        }
    };

    const cancelRef = React.useRef<FocusableElement>(null);

    const navigate = useNavigate();

    const handleDeleteAccount = () => {
        deleteAccount()
            .then(async (res) => {
                toast({ status: 'success', title: '删除QQ成功', description: res });
                deleteQQConfirm.onToggle();
                await navigate({ to: LoginRoute.to });
            })
            .catch((err: AxiosError) => {
                toast({ status: 'error', title: '删除QQ失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const handleClearAccounts = () => {
        clearAccounts()
            .then((res) => {
                toast({ status: 'success', title: '清除账号成功', description: res });
                clearAccountConfirm.onToggle();
                freshAccountInfo.onToggle();
            })
            .catch((err: AxiosError) => {
                toast({ status: 'error', title: '清除账号失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <Stack height={'100%'}>
            <Box>
                <HStack spacing={2} flexWrap="wrap" alignItems="center">
                    <Tag size="lg" variant="subtle" colorScheme="cyan" onClick={() => showReadme()}>
                        <TagLeftIcon boxSize="12px" as={FiUser} />
                        <TagLabel>{userInfo?.qq}</TagLabel>
                    </Tag>
                    <Button size="sm" colorScheme="blue" fontWeight="normal" leftIcon={<FiKey />} onClick={handleResetPassword}>
                        修改密码
                    </Button>
                    <Button size="sm" colorScheme="red" fontWeight="normal" leftIcon={<FiUserX />} onClick={deleteQQConfirm.onOpen}>
                        注销QQ
                    </Button>
                    <Alert leastDestructiveRef={cancelRef} isOpen={deleteQQConfirm.isOpen} onClose={deleteQQConfirm.onClose} title="删除QQ" body={`确定删除QQ${userInfo?.qq}吗？`} onConfirm={handleDeleteAccount}>
                        {' '}
                    </Alert>
                </HStack>
            </Box>
            <Stack>
                <SimpleGrid spacing={2} templateColumns="repeat(auto-fill, minmax(100px, 1fr))">
                    <Button colorScheme="orange" fontWeight="normal" leftIcon={<FiTarget />} onClick={handleCleanDailyAll} isLoading={count != 0}>
                        {isTableView && selectedAccounts.length > 0 ? `清选择(${selectedAccounts.length})` : '清理全部'}
                    </Button>
                    <Button
                        as={Link}
                        colorScheme="blue"
                        fontWeight="normal"
                        leftIcon={<FiLayers />}
                        to={`${DashBoardRoute.to || ''}BATCH_RUNNER`} // 确保 DashBoardRoute.to 有值
                        isLoading={count != 0}
                    >
                        批量运行
                    </Button>
                    <Tooltip label={isTableView ? '切换到卡片视图' : '切换到表格视图'}>
                        <Button
                            colorScheme="teal"
                            fontWeight="normal"
                            onClick={() => {
                                const newViewMode = !isTableView;
                                setIsTableView(newViewMode);
                                // 保存视图设置到 localStorage
                                localStorage.setItem('accountViewMode', newViewMode ? 'table' : 'card');
                            }}
                            leftIcon={isTableView ? <FiGrid /> : <FiList />}
                        >
                            {isTableView ? '卡片视图' : '表格视图'}
                        </Button>
                    </Tooltip>

                    {isTableView && (
                        <>
                            {/* 将设为默认和同步配置组合成一个按钮组 */}
                            <HStack spacing={0} borderRadius="md" border="1px solid" borderColor="gray.200" bg="white" _dark={{ borderColor: 'gray.600', bg: 'gray.800' }} overflow="hidden">
                                <Tooltip label={selectedAccounts.length !== 1 ? '请选择一个账号作为配置源' : `将其他账号配置同步为 ${selectedAccounts[0]} 的配置`}>
                                    <IconButton
                                        aria-label="同步配置"
                                        icon={<FiCopy size="22px" />}
                                        variant="ghost"
                                        colorScheme="gray"
                                        _hover={{ bg: 'teal.400', clor: 'white' }}
                                        borderRadius="0"
                                        flex="1" // 使用flex:1使按钮平分宽度
                                        onClick={() => {
                                            if (selectedAccounts.length === 1) {
                                                const accountName = selectedAccounts[0];
                                                if (window.confirm(`确定将其他账号配置同步为${accountName}的配置吗？`)) {
                                                    postAccountSyncConfig(accountName)
                                                        .then((res) => {
                                                            toast({
                                                                status: 'success',
                                                                title: `同步${accountName}配置成功`,
                                                                description: res,
                                                            });
                                                        })
                                                        .catch((err: AxiosError) => {
                                                            toast({
                                                                status: 'error',
                                                                title: '同步配置失败',
                                                                description: (err?.response?.data as string) || '网络错误',
                                                            });
                                                        });
                                                }
                                            }
                                        }}
                                        isDisabled={selectedAccounts.length !== 1}
                                    />
                                </Tooltip>

                                <Tooltip label={selectedAccounts.length !== 1 ? '请选择一个账号设为默认' : `将 ${selectedAccounts[0]} 设为默认账号`}>
                                    <IconButton
                                        aria-label="设为默认账号"
                                        icon={<FiStar size="22px" />}
                                        variant="ghost"
                                        colorScheme="gray"
                                        _hover={{ bg: 'purple.400', clor: 'white' }}
                                        borderRadius="0"
                                        borderLeft="1px solid"
                                        borderColor="gray.300"
                                        flex="1"
                                        onClick={() => {
                                            if (selectedAccounts.length === 1) {
                                                handleDefaultAccount(selectedAccounts[0]);
                                            }
                                        }}
                                        isDisabled={selectedAccounts.length !== 1}
                                    />
                                </Tooltip>
                            </HStack>
                        </>
                    )}
                    {/* 账号管理按钮组 */}
                    <HStack
                        spacing={0}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200"
                        bg="white"
                        _dark={{ borderColor: 'gray.600', bg: 'gray.800' }}
                        overflow="hidden"
                        flex="1"
                        justifyContent="space-between" // 均匀分布按钮
                    >
                        {userInfo?.clan && (
                            <Box flex="1" display="flex" justifyContent="center">
                                <Tooltip label="账号导入">
                                    <IconButton
                                        aria-label="账号导入"
                                        icon={<FiUpload size="22px" />}
                                        variant="ghost"
                                        colorScheme="gary"
                                        _hover={{ bg: 'blue.400', clor: 'white' }}
                                        borderRadius="0"
                                        size="sm"
                                        w="100%"
                                        h="40px"
                                        onClick={() => {
                                            if (fileInputRef.current) fileInputRef.current.click();
                                        }}
                                    />
                                </Tooltip>
                            </Box>
                        )}
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept=".tsv"
                            onChange={handleAccountImport}
                            onClick={(e) => {
                                (e.target as HTMLInputElement).value = '';
                            }}
                            display="none"
                        />

                        <Box flex="1" display="flex" justifyContent="center" borderLeft={userInfo?.clan ? '1px solid' : 'none'} borderColor="gray.300">
                            <Tooltip label={isTableView && selectedAccounts.length > 0 ? `删除选中(${selectedAccounts.length})` : '删除全部'}>
                                <IconButton
                                    aria-label="删除账号"
                                    icon={<FiUserMinus size="22px" />}
                                    variant="ghost"
                                    colorScheme="gary"
                                    _hover={{ bg: 'red.400', clor: 'white' }}
                                    borderRadius="0"
                                    size="sm"
                                    w="100%"
                                    h="40px"
                                    onClick={() => {
                                        if (isTableView && selectedAccounts.length > 0) {
                                            // 删除选中的账号
                                            if (window.confirm(`确定删除选中的 ${selectedAccounts.length} 个账号吗？`)) {
                                                const deletePromises = selectedAccounts.map((accountName) => delAccount(accountName));

                                                Promise.all(deletePromises)
                                                    .then(() => {
                                                        toast({
                                                            status: 'success',
                                                            title: '删除账号成功',
                                                            description: `已删除 ${selectedAccounts.length} 个账号`,
                                                        });
                                                        setSelectedAccounts([]);
                                                        freshAccountInfo.onToggle();
                                                    })
                                                    .catch((err: AxiosError) => {
                                                        toast({
                                                            status: 'error',
                                                            title: '删除账号失败',
                                                            description: (err?.response?.data as string) || '网络错误',
                                                        });
                                                    });
                                            }
                                        } else {
                                            // 清除所有账号
                                            clearAccountConfirm.onOpen();
                                        }
                                    }}
                                />
                            </Tooltip>
                        </Box>

                        <Box flex="1" display="flex" justifyContent="center" borderLeft="1px solid" borderColor="gray.300">
                            <Tooltip label={creatAccountSwitch.isOpen ? '提交' : '创建账号'}>
                                <IconButton
                                    aria-label="创建账号"
                                    icon={creatAccountSwitch.isOpen ? <FiCheck size="22px" /> : <FiUserPlus size="22px" />}
                                    variant="ghost"
                                    colorScheme={creatAccountSwitch.isOpen ? 'green.300' : 'gray'}
                                    bg={creatAccountSwitch.isOpen ? 'green.400' : 'transparent'}
                                    color={creatAccountSwitch.isOpen ? 'white' : 'inherit'}
                                    _hover={{
                                        bg: 'green.400',
                                    }}
                                    borderRadius="0"
                                    size="sm"
                                    w="100%"
                                    h="40px"
                                    onClick={handleCreateAccount}
                                />
                            </Tooltip>
                        </Box>
                    </HStack>

                    {creatAccountSwitch.isOpen && (
                        <Input
                            isRequired
                            placeholder="请输入昵称"
                            onChange={(e) => {
                                setAlias(e.target.value);
                            }}
                        />
                    )}
                    <Alert leastDestructiveRef={cancelRef} isOpen={clearAccountConfirm.isOpen} onClose={clearAccountConfirm.onClose} title="删除所有账号" body={`确定删除所有账号吗？`} onConfirm={handleClearAccounts}>
                        {' '}
                    </Alert>
                </SimpleGrid>
            </Stack>

            {isTableView ? (
                <Box flex={1} overflow={'auto'} bg={tableContainerBgColor} borderRadius="md">
                    <Table variant="simple" colorScheme="blue" size="sm" bg={tableBgColor} borderRadius="md" boxShadow="md" ml="0" mr="auto">
                        <Thead position="sticky" top={0} bg={tableHeaderBgColor} zIndex={1} boxShadow="sm">
                            <Tr>
                                <Th px={3} fontSize="md" py={4} fontWeight="bold" width="5%">
                                    <Checkbox
                                        isChecked={selectedAccounts.length > 0 && selectedAccounts.length === userInfo?.accounts?.length}
                                        isIndeterminate={selectedAccounts.length > 0 && selectedAccounts.length < (userInfo?.accounts?.length ?? 0)}
                                        onChange={toggleSelectAll}
                                        colorScheme="blue"
                                    />
                                </Th>
                                <Th px={0} fontSize="md" py={4} fontWeight="bold" width="25%" minWidth="80px">
                                    账号
                                </Th>
                                <Th px={3} fontSize="md" py={4} fontWeight="bold" width="30%">
                                    最近记录
                                </Th>
                                <Th px={3} fontSize="md" py={4} fontWeight="bold" width="30%">
                                    操作
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {userInfo?.accounts?.map((account) => (
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
                                    statusSuccessColor={statusSuccessColor}
                                    tableBgColor={tableRowBgColor}
                                    defaultAccount={userInfo?.default_account}
                                />
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            ) : (
                <RadioGroup onChange={handleDefaultAccount} value={userInfo?.default_account} flex={1} overflow={'auto'}>
                    <Stack>
                        <SimpleGrid spacing={4} templateColumns="repeat(auto-fill, minmax(250px, 1fr))">
                            {userInfo?.accounts?.map((account) => {
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
                                        statusSuccessColor={statusSuccessColor}
                                        defaultAccount={userInfo?.default_account}
                                    />
                                );
                            })}
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
    statusSuccessColor?: string;
    tableBgColor?: string;
    defaultAccount?: string;
}

function AccountInfo({ account, onToggle, increaseCount, decreaseCount, updateAccountInfo, isTableView = false, isSelected = false, onToggleSelect, statusSuccessColor, tableBgColor, defaultAccount }: AccountInfoProps) {
    const toast = useToast();
    const buttomLoading = useDisclosure();
    const alias = account.name;
    const deleteConfirm = useDisclosure();
    const syncConfirm = useDisclosure();
    const hoverBgColor = useColorModeValue('gray.100', 'gray.700');
    const handleCleanDaily = () => {
        buttomLoading.onOpen();
        increaseCount();
        toast({ status: 'info', title: `开始为${alias}清理日常...` });
        postAccountAreaDaily(alias)
            .then((res) => {
                toast({ status: 'success', title: `${alias}清日常成功` });
                buttomLoading.onClose();
                decreaseCount();
                updateAccountInfo(res);
            })
            .catch((err: AxiosError) => {
                buttomLoading.onClose();
                decreaseCount();
                toast({ status: 'error', title: `${alias}清日常失败`, description: (err?.response?.data as string) || '网络错误' });
            });
    };

    handle.set(account.name, handleCleanDaily);

    const handleDeleteAccount = () => {
        delAccount(alias)
            .then((res) => {
                toast({ status: 'success', title: '删除账号成功', description: res });
                onToggle();
            })
            .catch((err: AxiosError) => {
                toast({ status: 'error', title: '删除账号失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const handleDailyResult = () => {
        toast({ status: 'info', title: `正在获取${alias}的日常结果...` });
        getAccountDailyResultList(alias)
            .then(async (res) => {
                toast({ status: 'success', title: '获取日常结果成功' });
                await NiceModal.show(ResultInfoModal, { alias: alias, title: '日常', resultInfo: res });
            })
            .catch(async (err: AxiosError) => {
                toast({ status: 'error', title: '获取日常结果失败', description: (await (err?.response?.data as Blob).text()) || '网络错误' });
            });
    };

    const handleSyncConfig = () => {
        postAccountSyncConfig(alias)
            .then((res) => {
                toast({ status: 'success', title: `同步${alias}配置成功`, description: res });
                syncConfirm.onClose();
            })
            .catch((err: AxiosError) => {
                toast({ status: 'error', title: '同步配置失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const cancelRef = React.useRef<FocusableElement>(null);

    // 表格视图渲染
    if (isTableView) {
        return (
            <Tr
                key={alias}
                bg={tableBgColor}
                _hover={{
                    bg: hoverBgColor,
                    transition: 'background-color 0.2s',
                }}
            >
                <Td px={3} py={2}>
                    <Checkbox isChecked={isSelected} onChange={onToggleSelect} colorScheme="blue" />
                </Td>
                <Td px={0} py={2}>
                    <Flex
                        alignItems="center"
                        flexWrap="wrap"
                        sx={{
                            '@media screen and (max-width: 768px)': {
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                            },
                        }}
                    >
                        <Text wordBreak="break-word" fontSize="md" fontWeight="medium">
                            {account.name}
                        </Text>
                        {defaultAccount === account.name && (
                            <Tag size="sm" colorScheme="purple" mt={2} mb={2}>
                                默认
                            </Tag>
                        )}
                        {account.clan_forbid && (
                            <Tag size="sm" colorScheme="red" mt={2} mb={2}>
                                公会期间禁用
                            </Tag>
                        )}
                    </Flex>
                </Td>
                <Td px={3} py={2}>
                    <HStack>
                        <Text fontWeight="medium" color={account.daily_clean_time.status === '成功' ? statusSuccessColor : account.daily_clean_time.status === '警告' ? 'yellow.500' : 'red.500'} fontSize="md">
                            {account.daily_clean_time.status === '成功' ? '✓' : account.daily_clean_time.status === '警告' ? '!' : '×'}
                            {' ' + account.daily_clean_time.time}
                        </Text>
                    </HStack>
                </Td>
                <Td px={3} py={2}>
                    <HStack spacing={{ base: 2, md: 4 }}>
                        <Tooltip label="配置">
                            <IconButton as={Link} to={`${DashBoardRoute.to || ''}${account.name}`} aria-label="AccountConfig" icon={<FiSettings />} size="sm" colorScheme="pink" display={{ base: 'flex', md: 'none' }} />
                        </Tooltip>
                        <Button as={Link} to={`${DashBoardRoute.to || ''}${account.name}`} size="sm" fontWeight="normal" colorScheme="pink" leftIcon={<FiSettings />} display={{ base: 'none', md: 'flex' }}>
                            配置
                        </Button>

                        <Tooltip label="清理日常">
                            <IconButton aria-label="DailyClean" icon={<FiTarget />} size="sm" colorScheme="orange" onClick={handleCleanDaily} isLoading={buttomLoading.isOpen} display={{ base: 'flex', md: 'none' }} />
                        </Tooltip>
                        <Button size="sm" fontWeight="normal" colorScheme="orange" leftIcon={<FiTarget />} onClick={handleCleanDaily} isLoading={buttomLoading.isOpen} display={{ base: 'none', md: 'flex' }}>
                            清理
                        </Button>

                        <Tooltip label="结果">
                            <IconButton aria-label="DailyResult" icon={<FiActivity />} size="sm" colorScheme="green" onClick={handleDailyResult} display={{ base: 'flex', md: 'none' }} />
                        </Tooltip>
                        <Button size="sm" fontWeight="normal" colorScheme="green" leftIcon={<FiActivity />} onClick={handleDailyResult} display={{ base: 'none', md: 'flex' }}>
                            结果
                        </Button>
                    </HStack>
                </Td>
            </Tr>
        );
    }

    // 卡片视图渲染
    return (
        <Card key={alias}>
            <CardHeader>
                <Flex>
                    <Radio value={alias}> {alias} </Radio>
                    <Spacer />
                    <CloseButton aria-label="DeleteAccount" onClick={deleteConfirm.onOpen} />
                    <Alert leastDestructiveRef={cancelRef} isOpen={deleteConfirm.isOpen} onClose={deleteConfirm.onClose} title="删除账号" body={`确定删除账号${alias}吗？`} onConfirm={handleDeleteAccount}>
                        {' '}
                    </Alert>
                </Flex>
            </CardHeader>
            <CardBody>
                最近清日常： {account.daily_clean_time.status == '成功' ? '✓' : account.daily_clean_time.status == '警告' ? '!' : '×'}
                {account.daily_clean_time.time}
                {account.clan_forbid ? <Text>公会期间禁用</Text> : ''}
            </CardBody>
            <CardFooter>
                <SimpleGrid columns={2} spacing={4}>
                    <Button colorScheme="pink" fontWeight="normal" as={Link} to={DashBoardRoute.to + alias} aria-label="AccountConfig" leftIcon={<FiSettings />} isLoading={buttomLoading.isOpen} name={alias}>
                        配置
                    </Button>
                    <Button colorScheme="orange" fontWeight="normal" aria-label="DailyClean" leftIcon={<FiTarget />} isLoading={buttomLoading.isOpen} name={alias} onClick={handleCleanDaily}>
                        清理日常
                    </Button>
                    <Button colorScheme="teal" fontWeight="normal" aria-label="DailySync" leftIcon={<FiCopy />} isLoading={buttomLoading.isOpen} name={alias} onClick={syncConfirm.onOpen}>
                        同步配置
                    </Button>
                    <Alert leastDestructiveRef={cancelRef} isOpen={syncConfirm.isOpen} onClose={syncConfirm.onClose} title="同步配置" body={`确定将其他账号配置同步为${alias}的配置吗？`} onConfirm={handleSyncConfig}>
                        {' '}
                    </Alert>
                    <Button colorScheme="green" fontWeight="normal" aria-label="DailyResult" leftIcon={<FiActivity />} isLoading={buttomLoading.isOpen} onClick={handleDailyResult} name={alias}>
                        {' '}
                        结果{' '}
                    </Button>
                </SimpleGrid>
            </CardFooter>
        </Card>
    );
}
