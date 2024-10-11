import { putAccount } from '@/api/Account'
import { AccountResponse } from '@/interfaces/Account'
import {
    Button,
    // Checkbox,
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
} from '@chakra-ui/react'
import { AxiosError } from 'axios'
import { useState } from 'react'

interface InfoProps {
    accountInfo: AccountResponse
}

export default function Info({ accountInfo }: InfoProps) {

    const toast = useToast();

    const [username, setUsername] = useState<string>(accountInfo?.username);
    const [password, setPassword] = useState<string>(accountInfo?.password);
    const [channel, setChannel] = useState<string>(accountInfo?.channel);
    // const [batchAccounts, setBatchAccounts] = useState<(string | number)[]>(accountInfo?.batch_accounts);
    const { isOpen, onOpen, onClose } = useDisclosure()

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onOpen();
        putAccount(accountInfo?.alias, username, password, channel)
            .then((res) => {
                toast({ title: '保存成功', description: res, status: 'success', });
            })
            .catch((err: AxiosError) => {
                toast({ title: '保存失败', description: err.response?.data as string || "网络错误", status: 'error', });
            }).finally(() => {
                onClose();
            });
    }

    // const [all_checked, setAllChecked] = useState<boolean>(accountInfo?.batch_accounts?.length == accountInfo?.all_accounts?.length);

    return (
        <Stack
            spacing={4}
            w={'full'}
            bg={useColorModeValue('white', 'gray.700')}
            rounded={'xl'}
            boxShadow={'lg'}
            p={6}
            my={12}>
            <Heading lineHeight={1.1} fontSize={{ base: '2xl', sm: '3xl' }}>
                {accountInfo?.alias}
            </Heading>
            <form onSubmit={handleSave}>
                <Stack spacing={6}>
                    {accountInfo?.alias != "BATCH_RUNNER" &&
                        <FormControl id="username" isRequired>
                            <FormLabel>账号</FormLabel>
                            <Input
                                placeholder="手机号或账号"
                                _placeholder={{ color: 'gray.500' }}
                                type="text"
                                defaultValue={accountInfo?.username || ""}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </FormControl>
                    }
                    {accountInfo?.alias != "BATCH_RUNNER" &&
                        <FormControl id="password" isRequired>
                            <FormLabel>Password</FormLabel>
                            <Input
                                placeholder="密码"
                                _placeholder={{ color: 'gray.500' }}
                                type="password"
                                defaultValue={accountInfo?.password || ""}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </FormControl>
                    }
                    {accountInfo?.alias != "BATCH_RUNNER" &&
                        <FormControl id="channel" isRequired>
                            <FormLabel>平台</FormLabel>
                            <Select
                                defaultValue={accountInfo?.channel}
                                onChange={(e) => setChannel(e.target.value)}
                            >
                                {
                                    accountInfo?.channel_option.map((option) => {
                                        return <option key={option} value={option}>{option}</option>
                                    })
                                }
                            </Select>
                        </FormControl>
                    }
                    {
                        // accountInfo?.alias == "BATCH_RUNNER" &&
                        //                    <FormControl id="batch_account">
                        //                        <FormLabel>批量账号选择</FormLabel>
                        //                        <CheckboxGroup defaultValue={accountInfo?.batch_accounts} onChange={(v) => setBatchAccounts(v)} >
                        //                            <Stack spacing={[1, 5]}>
                        //                                <Checkbox key='all' value='all' checked={all_checked} >全选</Checkbox>
                        //                                {
                        //                                    accountInfo?.all_accounts.map((element) => {
                        //                                        return <Checkbox key={element} value={String(element)} >{element}</Checkbox>
                        //                                    })
                        //                                }
                        //                            </Stack>
                        //                        </CheckboxGroup>
                        //                    </FormControl>
                    }

                    <Button
                        bg={'blue.400'}
                        color={'white'}
                        w="full"
                        isLoading={isOpen}
                        type="submit"
                        _hover={{
                            bg: 'blue.500',
                        }}>
                        保存
                    </Button>
                </Stack>
            </form >
        </Stack >
    )
}
