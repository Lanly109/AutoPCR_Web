import { putAccount } from '@/api/Account'
import { AccountResponse } from '@/interfaces/Account'
import {
    Button,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Select,
    Stack,
    useColorModeValue,
    useToast,
} from '@chakra-ui/react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { AxiosError } from 'axios'

interface Inputs {
    username: string
    password: string
    channel: string
}

interface InfoProps {
    accountInfo: AccountResponse
}

export default function Info({ accountInfo }: InfoProps) {

    const {
        handleSubmit,
        register,
        formState: { isSubmitting },
    } = useForm<Inputs>()
    const toast = useToast();

    const handleSave: SubmitHandler<Inputs> = (values) => {
        putAccount(accountInfo?.alias, values.username, values.password, values.channel)
            .then((res) => {
                toast({ title: '保存成功', description: res, status: 'success', });
            })
            .catch((err: AxiosError) => {
                toast({ title: '保存失败', description: err.response?.data as string || "网络错误", status: 'error', });
            });
    }

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
            <form onSubmit={handleSubmit(handleSave)}>
                <Stack spacing={6}>
                    <FormControl id="username" isRequired>
                        <FormLabel>账号</FormLabel>
                        <Input
                            placeholder="手机号或账号"
                            _placeholder={{ color: 'gray.500' }}
                            type="text"
                            {...register('username')}
                            defaultValue={accountInfo?.username || ""}
                        />
                    </FormControl>
                    <FormControl id="password" isRequired>
                        <FormLabel>Password</FormLabel>
                        <Input
                            placeholder="密码"
                            _placeholder={{ color: 'gray.500' }}
                            type="password"
                            {...register('password')}
                            defaultValue={accountInfo?.password || ""}
                        />
                    </FormControl>
                    <FormControl id="channel" isRequired>
                        <FormLabel>平台</FormLabel>
                        <Select
                            defaultValue={accountInfo?.channel}
                            {...register('channel')}
                        >
                            {
                                accountInfo?.channel_option.map((option) => {
                                    return <option key={option} value={option}>{option}</option>
                                })
                            }
                        </Select>
                    </FormControl>
                    <Button
                        bg={'blue.400'}
                        color={'white'}
                        w="full"
                        isLoading={isSubmitting}
                        type="submit"
                        _hover={{
                            bg: 'blue.500',
                        }}>
                        保存
                    </Button>
                </Stack>
            </form>
        </Stack>
    )
}
