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
    onSaveSuccess?: () => void;
}

const TW_CHANNEL = '台服';

const fadeEntry = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export default function Info({ accountInfo, onSaveSuccess }: InfoProps) {
    const [username, setUsername] = useState<string>(accountInfo?.username);
    const [password, setPassword] = useState<string>(accountInfo?.password);
    const [channel, setChannel] = useState<string>(accountInfo?.channel);
    const [viewerId, setViewerId] = useState<string>(
        accountInfo?.viewer_id ? String(accountInfo.viewer_id) : '',
    );
    const [batchAccounts, setBatchAccounts] = useState<(string | number)[]>(accountInfo?.batch_accounts || []);
    const { open: isOpen, onOpen, onClose } = useDisclosure();

    const [allChecked, setAllChecked] = useState<boolean>(false);
    const [unselectedAccounts, setUnselectedAccounts] = useState<(string | number)[]>([]);
    const isTw = channel === TW_CHANNEL;

    useEffect(() => {
        setUsername(accountInfo?.username);
        setPassword(accountInfo?.password);
        setChannel(accountInfo?.channel);
        setViewerId(accountInfo?.viewer_id ? String(accountInfo.viewer_id) : '');
    }, [accountInfo]);

    useEffect(() => {
        if (accountInfo?.all_accounts && accountInfo?.batch_accounts) {
            const unselected = accountInfo.all_accounts.filter((account) => !accountInfo.batch_accounts.includes(account));
            setUnselectedAccounts(unselected);
            setAllChecked(accountInfo.batch_accounts.length === accountInfo.all_accounts.length);
        }
    }, [accountInfo]);

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isTw && !viewerId.trim()) {
            toaster.create({ title: '保存失败', description: '台服账号需要填写 Viewer ID', type: 'error' });
            return;
        }
        onOpen();
        const parsedViewerId = isTw ? Number(viewerId.trim()) : undefined;
        putAccount(accountInfo?.alias, username, password, channel, batchAccounts, parsedViewerId)
            .then((res) => {
                toaster.create({ title: '保存成功', description: res, type: 'success' });
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
            setBatchAccounts(accountInfo?.all_accounts ? [...accountInfo.all_accounts] : []);
            setUnselectedAccounts([]);
        } else {
            setBatchAccounts([]);
            setUnselectedAccounts(accountInfo?.all_accounts ? [...accountInfo.all_accounts] : []);
        }
    }

    const handleAccountToggle = (account: string | number) => {
        if (batchAccounts.includes(account)) {
            setBatchAccounts(batchAccounts.filter((item) => item !== account));
            setUnselectedAccounts([...unselectedAccounts, account]);
        } else {
            setBatchAccounts([...batchAccounts, account]);
            setUnselectedAccounts(unselectedAccounts.filter((item) => item !== account));
        }
    };

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
                    {accountInfo?.alias === 'BATCH_RUNNER' ? '批量运行配置' : accountInfo?.alias}
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
                            <Field label="平台" required>
                                <NativeSelect.Root size="lg" variant="subtle">
                                    <NativeSelect.Field
                                        value={channel}
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
                            {isTw && (
                                <Field label="Viewer ID" required helperText="游戏内 UID，与提取器中的 viewer_id 一致">
                                    <Input
                                        size="lg"
                                        placeholder="例如 1444587588"
                                        type="number"
                                        variant="subtle"
                                        value={viewerId}
                                        onChange={(e) => setViewerId(e.target.value)}
                                    />
                                </Field>
                            )}
                            <Field
                                label={isTw ? 'SHORT_UDID' : '账号'}
                                required
                                helperText={isTw ? '提取器给出的 SHORT_UDID 编码串' : undefined}
                            >
                                <Input
                                    size="lg"
                                    placeholder={isTw ? '请输入 SHORT_UDID' : '请输入手机号或账号'}
                                    type="text"
                                    variant="subtle"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </Field>
                            <Field
                                label={isTw ? 'UDID' : '密码'}
                                required
                                helperText={isTw ? '32 位十六进制 UDID' : undefined}
                            >
                                <Input
                                    size="lg"
                                    placeholder={isTw ? '请输入 UDID' : '请输入密码'}
                                    type="password"
                                    variant="subtle"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
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
