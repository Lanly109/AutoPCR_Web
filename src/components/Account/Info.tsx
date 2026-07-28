import {
    Button,
    Card,
    Flex,
    Heading,
    Input,
    NativeSelect,
    SimpleGrid,
    Stack,
    Text,
    VStack,
    useDisclosure,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useEffect, useState } from 'react';

import { AccountResponse } from '@/interfaces/Account';
import { AxiosError } from 'axios';
import { Checkbox } from '../../components/ui/checkbox';
import { Field } from '../../components/ui/field';
import { putAccount } from '@/api/Account';
import { toaster } from '../../components/ui/toaster';

interface InfoProps {
    accountInfo: AccountResponse;
    onSaveSuccess?: () => void; // 添加回调函数属性
}

const fadeEntry = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export default function Info({ accountInfo, onSaveSuccess }: InfoProps) {
    const alias = accountInfo?.alias || '';
    const displayName =
        alias && alias !== 'BATCH_RUNNER'
            ? (localStorage.getItem(`autopcr_displayName_${alias}`) || alias)
            : alias;

    const [username, setUsername] = useState<string>(accountInfo?.username);
    const [password, setPassword] = useState<string>(accountInfo?.password);
    const [channel, setChannel] = useState<string>(accountInfo?.channel);
    const [batchAccounts, setBatchAccounts] = useState<(string | number)[]>(accountInfo?.batch_accounts || []);
    const { open: isOpen, onOpen, onClose } = useDisclosure();

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
                toaster.create({ title: '保存成功', description: res, type: 'success' });
                // 调用回调函数通知父组件更新数据
                if (onSaveSuccess) {
                    onSaveSuccess();
                }
            })
            .catch((err: AxiosError) => {
                toaster.create({ title: '保存失败', description: (err.response?.data as string) || '网络错误', type: 'error' });
            })
            .finally(() => {
                onClose();
            });
    };

    const onAllCheckedChange = (details: { checked: boolean | "indeterminate" }) => {
        const isChecked = !!details.checked;
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
    }

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

    // 当选择变化时，更新全选状态
    useEffect(() => {
        if (accountInfo?.all_accounts) {
            setAllChecked(batchAccounts.length === accountInfo.all_accounts.length);
        }
    }, [batchAccounts, accountInfo]);

    return (
        <Stack
            gap={6}
            w={'full'}
            bg="bg.panel"
            rounded={'2xl'}
            borderWidth="1px"
            borderColor="border.muted"
            p={{ base: 6, md: 8 }}
            my={4}
            animation={`${fadeEntry} 0.4s ease-out`}
            boxShadow="sm"
        >
             <Flex justify="space-between" align="center" mb={2}>
                <Heading size="lg" fontWeight="bold" letterSpacing="tight">
                    {alias === 'BATCH_RUNNER' ? '批量运行配置' : displayName}
                </Heading>
                {accountInfo?.alias !== 'BATCH_RUNNER' && (
                    <Text fontSize="sm" color="fg.muted">
                        基础信息配置
                    </Text>
                )}
            </Flex>

            <form onSubmit={handleSave}>
                <Stack gap={6}>
                    {accountInfo?.alias !== 'BATCH_RUNNER' && (
                        <>
                            <Field label="账号" required>
                                <Input
                                    size="lg"
                                    placeholder="请输入手机号或账号"
                                    type="text"
                                    variant="subtle"
                                    defaultValue={accountInfo?.username || ''}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </Field>
                            <Field label="密码" required>
                                <Input
                                    size="lg"
                                    placeholder="请输入密码"
                                    type="password"
                                    variant="subtle"
                                    defaultValue={accountInfo?.password || ''}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Field>
                            <Field label="平台" required>
                                <NativeSelect.Root size="lg" variant="subtle">
                                    <NativeSelect.Field
                                        defaultValue={accountInfo?.channel}
                                        onChange={(e) => setChannel(e.target.value)}
                                    >
                                        {accountInfo?.channel_option.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </NativeSelect.Field>
                                </NativeSelect.Root>
                            </Field>
                            
                            <Button
                                size="lg"
                                colorPalette="blue"
                                loading={isOpen}
                                type="submit"
                                rounded="xl"
                                fontWeight="semibold"
                                mt={2}
                            >
                                保存配置
                            </Button>
                        </>
                    )}

                    {accountInfo?.alias === 'BATCH_RUNNER' && (
                        <Stack gap={5}>
                             <Flex justify="space-between" align="center" bg="bg.subtle" p={3} rounded="xl">
                                <Checkbox 
                                    checked={allChecked} 
                                    onCheckedChange={onAllCheckedChange} 
                                    fontWeight="medium"
                                >
                                    全选所有账号
                                </Checkbox>
                                <Button
                                    size="sm"
                                    colorPalette="blue"
                                    loading={isOpen}
                                    type="submit"
                                    rounded="lg"
                                    px={6}
                                >
                                    保存
                                </Button>
                            </Flex>

                            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                {/* 左侧：未选择的账号 */}
                                <Card.Root variant="subtle" size="sm">
                                    <Card.Header pb={2}>
                                        <Text fontWeight="semibold" color="fg.muted">未选择的账号 ({unselectedAccounts.length})</Text>
                                    </Card.Header>
                                    <Card.Body pt={0} maxH="400px" overflowY="auto">
                                        <VStack align="start" gap={1}>
                                            {unselectedAccounts.map((account) => (
                                                <Checkbox
                                                    key={`unselected-${account}`}
                                                    checked={false}
                                                    onCheckedChange={() => handleAccountToggle(account)}
                                                    w="full"
                                                    p={2}
                                                    rounded="md"
                                                    _hover={{ bg: 'bg.muted' }}
                                                >
                                                    {account}
                                                </Checkbox>
                                            ))}
                                            {unselectedAccounts.length === 0 && (
                                                <Text color="fg.muted" fontSize="sm" py={2}>无</Text>
                                            )}
                                        </VStack>
                                    </Card.Body>
                                </Card.Root>

                                {/* 右侧：已选择的账号 */}
                                <Card.Root variant="outline" borderColor="blue.solid/20" size="sm">
                                    <Card.Header pb={2} bg="blue.subtle/20" borderTopRadius="md">
                                        <Text fontWeight="semibold" color="blue.fg">已选择的账号 ({batchAccounts.length})</Text>
                                    </Card.Header>
                                    <Card.Body pt={2} maxH="400px" overflowY="auto">
                                        <VStack align="start" gap={1}>
                                            {batchAccounts.map((account) => (
                                                <Checkbox
                                                    key={`selected-${account}`}
                                                    checked={true}
                                                    onCheckedChange={() => handleAccountToggle(account)}
                                                    colorPalette="blue"
                                                    w="full"
                                                    p={2}
                                                    rounded="md"
                                                    _hover={{ bg: 'blue.subtle/10' }}
                                                >
                                                    {account}
                                                </Checkbox>
                                            ))}
                                             {batchAccounts.length === 0 && (
                                                <Text color="fg.muted" fontSize="sm" py={2}>请选择账号</Text>
                                            )}
                                        </VStack>
                                    </Card.Body>
                                </Card.Root>
                            </SimpleGrid>
                        </Stack>
                    )}
                </Stack>
            </form>
        </Stack>
    );
}
