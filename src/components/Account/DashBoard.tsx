import React, { ChangeEvent } from 'react';
import { clearAccounts, deleteAccount, getAccountDailyResultList, getUserInfo, postAccountSyncConfig, putDefaultAccount } from '@api/Account';
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
} from '@chakra-ui/react'

import { Route as DashBoardRoute } from "@routes/daily/_sidebar/account/index";
import { Route as LoginRoute } from "@routes/daily/login";
import { FiActivity, FiCopy, FiSettings, FiTarget, FiUser } from 'react-icons/fi';
import { postAccountImport, delAccount, postAccount, postAccountAreaDaily } from '@api/Account';
import { useDisclosure } from '@chakra-ui/react'
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import NiceModal from '@ebay/nice-modal-react';
import ResultInfoModal from './ResultInfoModal';
import ReadmeModal from './ReadmeModal';
import Alert from '../alert';

const handle: Map<string, (arg0: boolean) => void> = new Map<string, (arg0: boolean) => void>()
import { FocusableElement } from "@chakra-ui/utils"
import { useCountHook } from '../count';
import { AxiosError } from 'axios';

export function DashBoard() {
    const toast = useToast()
    const [userInfo, setUserInfo] = useState<UserInfoResponse>();
    const freshAccountInfo = useDisclosure();
    const creatAccountSwitch = useDisclosure();
    const deleteConfirm = useDisclosure()
    const [alias, setAlias] = useState<string>("");
    const [count, increaseCount, decreaseCount] = useCountHook();

    const showReadme = () => {
        NiceModal.show(ReadmeModal, {}).then(() => {
            localStorage.setItem('readme', 'true');
        }).catch(() => {
            localStorage.setItem('readme', 'true');
        });
    }

    useEffect(() => {
        const readme = localStorage.getItem('readme');
        if (!readme) {
            localStorage.setItem('readme', 'true');
            showReadme();
        }
    }, []);

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
            fn(false);
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

    const handleAccountImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            postAccountImport(file).then((res) => {
                toast({ status: 'success', title: '导入账号成功', description: res });
                freshAccountInfo.onToggle();
            }).catch((err: AxiosError) => {
                toast({ status: 'error', title: '导入账号失败', description: err?.response?.data as string || '网络错误' });
            });
        }
    }


    const cancelRef = React.useRef<FocusableElement>(null)

    const navigate = useNavigate();

    const handleDeleteAccount = () => {
        deleteAccount().then(async (res) => {
            toast({ status: 'success', title: '删除QQ成功', description: res });
            deleteConfirm.onToggle();
            await navigate({ to: LoginRoute.to });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '删除QQ失败', description: err?.response?.data as string || '网络错误' });
        });
    };

    const handleClearAccounts = () => {
        clearAccounts().then((res) => {
            toast({ status: 'success', title: '清除账号成功', description: res });
            deleteConfirm.onToggle();
            freshAccountInfo.onToggle();
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '清除账号失败', description: err?.response?.data as string || '网络错误' });
        });
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <Stack>
            <Box>
                <Tag size='lg' variant='subtle' colorScheme='cyan' onClick={() => showReadme()}>
                    <TagLeftIcon boxSize='12px' as={FiUser} />
                    <TagLabel>{userInfo?.qq}</TagLabel>
                </Tag>
            </Box>
            <Stack>
                <SimpleGrid spacing={2} templateColumns='repeat(auto-fill, minmax(100px, 1fr))'>
                    <Button colorScheme="orange" onClick={handleCleanDailyAll} isLoading={count != 0} >清日常所有</Button>
                    {userInfo?.clan &&
                        <Button colorScheme="blue" onClick={() => { if (fileInputRef.current) fileInputRef.current.click(); }}> 账号导入 </Button>
                    }
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".tsv"
                        onChange={handleAccountImport}
                        onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';  // 每次点击时重置 input 的值
                        }}
                        display="none"
                    />
                    <Button as={Link} colorScheme="blue" to={DashBoardRoute.to + "BATCH_RUNNER"} isLoading={count != 0} >批量运行</Button>
                    <Button colorScheme="red" onClick={deleteConfirm.onOpen}>删除QQ</Button>
                    <Alert leastDestructiveRef={cancelRef} isOpen={deleteConfirm.isOpen} onClose={deleteConfirm.onClose} title="删除QQ" body={`确定删除QQ${userInfo?.qq}吗？`} onConfirm={handleDeleteAccount}> </Alert>
                    {userInfo?.clan &&
                        <Button colorScheme="red" onClick={deleteConfirm.onOpen}>清除账号</Button>
                    }
                    <Alert leastDestructiveRef={cancelRef} isOpen={deleteConfirm.isOpen} onClose={deleteConfirm.onClose} title="清除所有账号" body={`确定清除所有账号吗？`} onConfirm={handleClearAccounts}> </Alert>
                    <Button colorScheme="blue" onClick={handleCreateAccount}>{creatAccountSwitch.isOpen ? "提交" : "创建账号"}</Button>
                    {creatAccountSwitch.isOpen && <Input isRequired placeholder="请输入昵称" onChange={(e) => { setAlias(e.target.value) }} />}
                </SimpleGrid>
            </Stack>

            <RadioGroup onChange={handleDefaultAccount} value={userInfo?.default_account}>
                <Stack>
                    <SimpleGrid spacing={4} templateColumns='repeat(auto-fill, minmax(250px, 1fr))'>
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

    const handleDailyResult = () => {
        toast({ status: 'info', title: `正在获取${alias}的日常结果...` });
        getAccountDailyResultList(alias).then(async (res) => {
            toast({ status: 'success', title: '获取日常结果成功' });
            await NiceModal.show(ResultInfoModal, { alias: alias, title: "日常", resultInfo: res });
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

                    <Button colorScheme='pink' as={Link} to={DashBoardRoute.to + alias} aria-label="AccountConfig" leftIcon={<FiSettings />} isLoading={buttomLoading.isOpen} name={alias}>配置</Button>
                    <Button colorScheme='orange' aria-label="DailyClean" leftIcon={<FiTarget />} isLoading={buttomLoading.isOpen} name={alias} onClick={() => handleCleanDaily()}>清理日常</Button>
                    <Button colorScheme='teal' aria-label="DailySync" leftIcon={<FiCopy />} isLoading={buttomLoading.isOpen} name={alias} onClick={syncConfirm.onOpen}>同步配置</Button>
                    <Alert leastDestructiveRef={cancelRef} isOpen={syncConfirm.isOpen} onClose={syncConfirm.onClose} title="同步配置" body={`确定将其他账号配置同步为${alias}的配置吗？`} onConfirm={handleSyncConfig}> </Alert>
                    <Button colorScheme='green' aria-label="DailyResult" leftIcon={<FiActivity />} isLoading={buttomLoading.isOpen} onClick={handleDailyResult} name={alias}> 结果 </Button>
                </SimpleGrid>
            </CardFooter >
        </Card >
    )
}
