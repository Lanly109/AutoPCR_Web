import {
    Box,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    Checkbox,
    Stack,
    Button,
    Tooltip,
    Text,
    createStandaloneToast,
    useTheme,
} from '@chakra-ui/react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { postLoginWithPassword } from '@api/Login'
import { postRegister } from '@api/Register'
import { useNavigate } from '@tanstack/react-router'
import { Route as InfoRoute } from '@routes/daily/_sidebar/account/index'
import { useState } from 'react'
import { AxiosError } from 'axios'

interface Inputs {
    qq: string
    password: string
}

export default function LoginWithPasswordComponent() {
    const navigate = useNavigate();
    const theme = useTheme();
    const { toast } = createStandaloneToast({ theme });
    const {
        handleSubmit,
        register,
        formState: { isSubmitting, errors },
    } = useForm<Inputs>()
    const [remember, setRemember] = useState<boolean>(localStorage.getItem('remember') === 'true' ? true : false);

    const handleRember = (values: Inputs) => {
        localStorage.setItem('remember', remember ? 'true' : 'false');
        if (remember) {
            localStorage.setItem('qq', values.qq);
            localStorage.setItem('password', values.password);
        } else {
            localStorage.removeItem('qq')
            localStorage.removeItem('password');
        }
    }

    const handleLogin: SubmitHandler<Inputs> = (values) => {
        postLoginWithPassword(values.qq, values.password)
            .then(async (res) => {
                handleRember(values);
                toast({ title: "登录成功", status: "success", description: res })
                await navigate({ to: InfoRoute.to })
            }).catch((err: AxiosError) => {
                toast({ title: "登录失败", status: "error", description: err.response?.data as string || "网络错误" })
            });
    }

    const handleRegister: SubmitHandler<Inputs> = (values) => {
        postRegister(values.qq, values.password)
            .then(async (res) => {
                handleRember(values);
                toast({ title: "注册成功", status: "success", description: res })
                await navigate({ to: InfoRoute.to })
            }).catch((err: AxiosError) => {
                toast({ title: "注册失败", status: "error", description: err.response?.data as string || "网络错误" })
            });
    }

    return (
        <Box
            rounded={'lg'}
            p={8}>
            <form onSubmit={handleSubmit(handleLogin)}>
                <Stack spacing={4}>
                    <FormControl id="qq">
                        <FormLabel>QQ</FormLabel>
                        <Input type="text"
                            {...register('qq')}
                            placeholder='5位以上'
                            defaultValue={localStorage.getItem('qq') as (string | undefined)}
                        />
                        <FormErrorMessage>
                            {errors.qq?.message}
                        </FormErrorMessage>
                    </FormControl>
                    <FormControl id="password">
                        <FormLabel>密码</FormLabel>
                        <Input type="password"
                            {...register('password')}
                            placeholder='8位以上,非QQ密码'
                            defaultValue={localStorage.getItem('password') as (string | undefined)}
                        />
                        <FormErrorMessage>
                            {errors.password?.message}
                        </FormErrorMessage>
                    </FormControl>
                    <Stack spacing={10}>
                        <Stack
                            direction={{ base: 'column', sm: 'row' }}
                            align={'start'}
                            justify={'space-between'}>
                            <Checkbox defaultChecked={remember} checked={remember} onChange={(e) => setRemember(e.target.checked)}>记住我</Checkbox>
                            <Tooltip label="联系维护人员"><Text color={'blue.400'}> 忘记密码？</Text></Tooltip>
                        </Stack>
                        <Button
                            bg={'blue.400'}
                            color={'white'}
                            _hover={{
                                bg: 'blue.500',
                            }}
                            isLoading={isSubmitting} type='submit'
                        >
                            登录
                        </Button>
                        <Button
                            bg={'blue.400'}
                            color={'white'}
                            _hover={{
                                bg: 'blue.500',
                            }}
                            onClick={handleSubmit(handleRegister)}
                        >
                            注册
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </Box>
    )
}
