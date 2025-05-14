import { putAccount } from '@/api/Account';
import { AccountResponse } from '@/interfaces/Account';
import {
    Button,
    Checkbox,
    // CheckboxGroup,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Select,
    Stack,
    useColorModeValue,
    useDisclosure,
    useToast,
    Flex,
    Box,
    Text,
    VStack,
    Spacer,
} from '@chakra-ui/react';
import { AxiosError } from 'axios';
import { useState, useEffect } from 'react';

interface InfoProps {
    accountInfo: AccountResponse;
    onSaveSuccess?: () => void; // 添加回调函数属性
}

export default function Info({ accountInfo, onSaveSuccess }: InfoProps) {
    const toast = useToast();

    const [username, setUsername] = useState<string>(accountInfo?.username);
    const [password, setPassword] = useState<string>(accountInfo?.password);
    const [channel, setChannel] = useState<string>(accountInfo?.channel);
    const [batchAccounts, setBatchAccounts] = useState<(string | number)[]>(accountInfo?.batch_accounts || []);
    const { isOpen, onOpen, onClose } = useDisclosure();

    // 全选状态
    const [allChecked, setAllChecked] = useState<boolean>(false);
    // 未选择的账号列表
    const [unselectedAccounts, setUnselectedAccounts] = useState<(string | number)[]>([]);

    // 初始化未选择的账号列表
    useEffect(() => {
        if (accountInfo?.all_accounts && accountInfo?.batch_accounts) {
            const unselected = accountInfo.all_accounts.filter((account) => !accountInfo.batch_accounts.includes(account));
            setUnselectedAccounts(unselected);

            // 检查是否全选
            setAllChecked(accountInfo.batch_accounts.length === accountInfo.all_accounts.length);
        }
    }, [accountInfo]);

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onOpen();
        putAccount(accountInfo?.alias, username, password, channel, batchAccounts)
            .then((res) => {
                toast({ title: '保存成功', description: res, status: 'success' });
                // 调用回调函数通知父组件更新数据
                if (onSaveSuccess) {
                    onSaveSuccess();
                }
            })
            .catch((err: AxiosError) => {
                toast({ title: '保存失败', description: (err.response?.data as string) || '网络错误', status: 'error' });
            })
            .finally(() => {
                onClose();
            });
    };

    // 处理全选/取消全选
    const handleAllChecked = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setAllChecked(isChecked);

        if (isChecked) {
            // 全选
            setBatchAccounts(accountInfo?.all_accounts ? [...accountInfo.all_accounts] : []);
            setUnselectedAccounts([]);
        } else {
            // 取消全选
            setBatchAccounts([]);
            setUnselectedAccounts(accountInfo?.all_accounts ? [...accountInfo.all_accounts] : []);
        }
    };

    // 处理单个账号选择
    const handleAccountToggle = (account: string | number) => {
        if (batchAccounts.includes(account)) {
            // 取消选择
            setBatchAccounts(batchAccounts.filter((item) => item !== account));
            setUnselectedAccounts([...unselectedAccounts, account]);
        } else {
            // 选择
            setBatchAccounts([...batchAccounts, account]);
            setUnselectedAccounts(unselectedAccounts.filter((item) => item !== account));
        }
    };
    const unselectedBoxBg = useColorModeValue('gray.50', 'gray.800');
    const selectedBoxBg = useColorModeValue('blue.50', 'blue.900');

    // 当选择变化时，更新全选状态
    useEffect(() => {
        if (accountInfo?.all_accounts) {
            setAllChecked(batchAccounts.length === accountInfo.all_accounts.length);
        }
    }, [batchAccounts, accountInfo]);

    return (
        <Stack spacing={4} w={'full'} bg={useColorModeValue('white', 'gray.700')} rounded={'xl'} boxShadow={'lg'} p={6} my={12}>
            <Heading lineHeight={1.1} fontSize={{ base: '2xl', sm: '3xl' }}>
                {accountInfo?.alias}
            </Heading>
            <form onSubmit={handleSave}>
                <Stack spacing={6}>
                    {accountInfo?.alias != 'BATCH_RUNNER' && (
                        <FormControl id="username" isRequired>
                            <FormLabel>账号</FormLabel>
                            <Input placeholder="手机号或账号" _placeholder={{ color: 'gray.500' }} type="text" defaultValue={accountInfo?.username || ''} onChange={(e) => setUsername(e.target.value)} />
                        </FormControl>
                    )}
                    {accountInfo?.alias != 'BATCH_RUNNER' && (
                        <FormControl id="password" isRequired>
                            <FormLabel>Password</FormLabel>
                            <Input placeholder="密码" _placeholder={{ color: 'gray.500' }} type="password" defaultValue={accountInfo?.password || ''} onChange={(e) => setPassword(e.target.value)} />
                        </FormControl>
                    )}
                    {accountInfo?.alias != 'BATCH_RUNNER' && (
                        <FormControl id="channel" isRequired>
                            <FormLabel>平台</FormLabel>
                            <Select defaultValue={accountInfo?.channel} onChange={(e) => setChannel(e.target.value)}>
                                {accountInfo?.channel_option.map((option) => {
                                    return (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    );
                                })}
                            </Select>
                        </FormControl>
                    )}
                    {accountInfo?.alias != 'BATCH_RUNNER' &&
                        <Button
                            bg={'blue.400'}
                            color={'white'}
                            w="full"
                            isLoading={isOpen}
                            type="submit"
                            _hover={{
                                bg: 'blue.500',
                            }}
                        >
                            保存
                        </Button>
                    }
                    {accountInfo?.alias == 'BATCH_RUNNER' && (
                        <FormControl id="batch_account">
                            <Flex>
                                <FormLabel>批量账号选择</FormLabel>
                                <Spacer />
                                <Button
                                    bg={'blue.400'}
                                    color={'white'}
                                    isLoading={isOpen}
                                    type="submit"
                                    _hover={{
                                        bg: 'blue.500',
                                    }}
                                >
                                    保存
                                </Button>
                            </Flex>
                            <Checkbox isChecked={allChecked} onChange={handleAllChecked} mb={4}>
                                全选
                            </Checkbox>

                            <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                                {/* 左侧：未选择的账号 */}
                                <Box flex="1" borderWidth="1px" borderRadius="md" p={3} bg={unselectedBoxBg}>
                                    <Text fontWeight="bold" mb={2}>
                                        未选择的账号
                                    </Text>
                                    <VStack align="start" spacing={2}>
                                        {unselectedAccounts.map((account) => (
                                            <Checkbox key={`unselected-${account}`} isChecked={false} onChange={() => handleAccountToggle(account)}>
                                                {account}
                                            </Checkbox>
                                        ))}
                                    </VStack>
                                </Box>

                                {/* 右侧：已选择的账号 */}
                                <Box flex="1" borderWidth="1px" borderRadius="md" p={3} bg={selectedBoxBg}>
                                    <Text fontWeight="bold" mb={2}>
                                        已选择的账号
                                    </Text>
                                    <VStack align="start" spacing={2}>
                                        {batchAccounts.map((account) => (
                                            <Checkbox key={`selected-${account}`} isChecked={true} onChange={() => handleAccountToggle(account)}>
                                                {account}
                                            </Checkbox>
                                        ))}
                                    </VStack>
                                </Box>
                            </Flex>
                        </FormControl>
                    )}

                </Stack>
            </form>
        </Stack>
    );
}
