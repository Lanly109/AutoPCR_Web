import React from 'react';
import { getAccountDailyResult, getUserInfo, postAccountSyncConfig, putDefaultAccount } from '@api/Account';
import { AccountInfo as AccountInfoInterface, UserInfoResponse } from '@interfaces/UserInfo';
import {
    RadioGroup,
    Radio,
    Button,
    HStack,
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
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    useToast,
} from '@chakra-ui/react'

import { Route as DashBoardRoute } from "@routes/daily/_sidebar/account/index";
import { FiActivity, FiAlertCircle, FiCheckCircle, FiXCircle, FiCopy, FiSettings, FiTarget, FiUser } from 'react-icons/fi';
import { delAccount, postAccount, postAccountAreaDaily } from '@api/Account';
import { useDisclosure } from '@chakra-ui/react'
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import NiceModal from '@ebay/nice-modal-react';
import DailyResultModal from './DailyResultModal';
import Alert from '../alert';

const handle: Map<string, () => void> = new Map<string, () => void>()
import { FocusableElement } from "@chakra-ui/utils"
import { QueryValidate } from './Validate';
import { useCountHook } from '../count';
import { AxiosError } from 'axios';

export function DashBoard() {
    const toast = useToast()
    const [userInfo, setUserInfo] = useState<UserInfoResponse>();
    const freshAccountInfo = useDisclosure();
    const creatAccountSwitch = useDisclosure();
    const [alias, setAlias] = useState<string>("");
    const [count, increaseCount, decreaseCount] = useCountHook();

    useEffect(() => {
        handle.clear();
        getUserInfo().then((res) => {
            setUserInfo(res);
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: err?.response?.data as string || '网络错误' });
        });
    }, [freshAccountInfo.isOpen, toast]);

    const handleDefaultAccount = (value: string) => {
        putDefaultAccount(value).then((res) => {
            setUserInfo({ ...userInfo, default_account: value })
            toast({ status: 'success', title: '设置默认账号成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '设置默认账号失败', description: err?.response?.data as string || '网络错误' });
        });

    };

    const updateAccountInfo = (updatedAccount: AccountInfoInterface) => {
        setUserInfo((prevUserInfo) => {
            if (!prevUserInfo?.accounts) {
                return prevUserInfo;
            }

            const updatedAccounts = prevUserInfo.accounts.map(account =>
                account.name === updatedAccount.name ? updatedAccount : account
            );

            return {
                ...prevUserInfo,
                accounts: updatedAccounts,
            };
        });
    };

    const handleCleanDailyAll = () => {
        for (const fn of handle.values()) {
            fn();
        }
    }

    const handleCreateAccount = () => {
        if (creatAccountSwitch.isOpen) {
            postAccount(alias).then((res) => {
                toast({ status: 'success', title: '创建账号成功', description: res });
                creatAccountSwitch.onToggle();
                freshAccountInfo.onToggle();
            }).catch((err: AxiosError) => {
                toast({ status: 'error', title: '创建账号失败', description: err?.response?.data as string || '网络错误' });
            })
        } else {
            creatAccountSwitch.onToggle();
        }
    }

    return (
        <Stack>
            <Box>
                <Tag size='lg' variant='subtle' colorScheme='cyan'>
                    <TagLeftIcon boxSize='12px' as={FiUser} />
                    <TagLabel>{userInfo?.qq}</TagLabel>
                </Tag>
            </Box>
            <HStack>
                <Button colorScheme="blue" onClick={handleCleanDailyAll} isLoading={count != 0} >清日常所有</Button>
                <Button colorScheme="blue" onClick={handleCreateAccount}>{creatAccountSwitch.isOpen ? "提交" : "创建账号"}</Button>
                {creatAccountSwitch.isOpen && <Input isRequired placeholder="请输入昵称" onChange={(e) => { setAlias(e.target.value) }} />}
            </HStack>

            <RadioGroup onChange={handleDefaultAccount} value={userInfo?.default_account}>
                <Stack>
                    <SimpleGrid spacing={4} templateColumns='repeat(auto-fill, minmax(300px, 1fr))'>
                        {
                            userInfo?.accounts?.map((account) => {
                                return <AccountInfo key={account.name} account={account} onToggle={freshAccountInfo.onToggle} increaseCount={increaseCount} decreaseCount={decreaseCount} updateAccountInfo={updateAccountInfo} />
                            })
                        }
                    </SimpleGrid>
                </Stack>
            </RadioGroup>
        </Stack >
    )
}

interface AccountInfoProps {
    account: AccountInfoInterface
    onToggle: () => void
    increaseCount: () => void
    decreaseCount: () => void
    updateAccountInfo: (updatedAccount: AccountInfoInterface) => void
}

function AccountInfo({ account, onToggle, increaseCount, decreaseCount, updateAccountInfo }: AccountInfoProps) {
    const toast = useToast();
    const buttomLoading = useDisclosure();
    const alias = account.name;
    const deleteConfirm = useDisclosure()
    const syncConfirm = useDisclosure()

    const handleCleanDaily = () => {
        buttomLoading.onOpen();
        increaseCount();
        toast({ status: 'info', title: `开始为${alias}清理日常...` });
        postAccountAreaDaily(alias).then((res) => {
            toast({ status: 'success', title: `${alias}清日常成功` });
            buttomLoading.onClose();
            decreaseCount();
            updateAccountInfo(res);
        }).catch((err: AxiosError) => {
            buttomLoading.onClose();
            decreaseCount();
            toast({ status: 'error', title: `${alias}清日常失败`, description: err?.response?.data as string || '网络错误' });
        });

        QueryValidate(toast, alias);
    };

    handle.set(account.name, handleCleanDaily);
    const handleDeleteAccount = () => {
        delAccount(alias).then((res) => {
            toast({ status: 'success', title: '删除账号成功', description: res });
            onToggle();
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '删除账号失败', description: err?.response?.data as string || '网络错误' });
        });
    };

    const handleDailyResult = (time: string) => {
        toast({ status: 'info', title: `正在获取${time}的日常结果...` });
        getAccountDailyResult(alias, time).then(async (res) => {
            toast({ status: 'success', title: '获取日常结果成功' });
            await NiceModal.show(DailyResultModal, { alias: alias, resultUrl: res });
        }).catch(async (err: AxiosError) => {
            toast({ status: 'error', title: '获取日常结果失败', description: await (err?.response?.data as Blob).text() || '网络错误' });
        })
    };

    const handleSyncConfig = () => {
        postAccountSyncConfig(alias).then((res) => {
            toast({ status: 'success', title: `同步${alias}配置成功`, description: res });
            syncConfirm.onClose();
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '同步配置失败', description: err?.response?.data as string || '网络错误' });
        });
    };

    const cancelRef = React.useRef<FocusableElement>(null)
    return (
        <Card key={alias}>
            <CardHeader>
                <Flex>
                    <Radio value={alias}> {alias} </Radio>
                    <Spacer />
                    <CloseButton aria-label="DeleteAccount" onClick={deleteConfirm.onOpen} />
                    <Alert leastDestructiveRef={cancelRef} isOpen={deleteConfirm.isOpen} onClose={deleteConfirm.onClose} title="删除账号" body={`确定删除账号${alias}吗？`} onConfirm={handleDeleteAccount}> </Alert>
                </Flex>
            </CardHeader>
            <CardBody>
                最近清日常： {account.daily_clean_time.status == "成功" ? "✓" : account.daily_clean_time.status == "警告" ? "!" : "×"}{account.daily_clean_time.time}
            </CardBody>
            <CardFooter>
                <SimpleGrid columns={2} spacing={4}>

                    <Button as={Link} to={DashBoardRoute.to + alias} aria-label="AccountConfig" leftIcon={<FiSettings />} isLoading={buttomLoading.isOpen} name={alias}>配置</Button>
                    <Button aria-label="DailyClean" leftIcon={<FiTarget />} isLoading={buttomLoading.isOpen} name={alias} onClick={handleCleanDaily}>清理日常</Button>
                    <Button aria-label="DailySync" leftIcon={<FiCopy />} isLoading={buttomLoading.isOpen} name={alias} onClick={syncConfirm.onOpen}>同步配置</Button>
                    <Alert leastDestructiveRef={cancelRef} isOpen={syncConfirm.isOpen} onClose={syncConfirm.onClose} title="同步配置" body={`确定将其他账号配置同步为${alias}的配置吗？`} onConfirm={handleSyncConfig}> </Alert>
                    <Menu>
                        <MenuButton as={Button} aria-label="DailyResult" leftIcon={<FiActivity />} isLoading={buttomLoading.isOpen} name={alias}>
                            结果
                        </MenuButton>
                        <MenuList>
                            {
                                account.daily_clean_time_list.map((dailyResult, index) => (
                                    <MenuItem key={index} onClick={() => handleDailyResult(dailyResult.time_safe)}>{dailyResult.status == "成功" ? <FiCheckCircle /> : dailyResult.status == "警告" ? <FiAlertCircle /> : <FiXCircle />}{dailyResult.time}</MenuItem>
                                ))
                            }
                        </MenuList>
                    </Menu>
                </SimpleGrid>
            </CardFooter >
        </Card >
    )
}
