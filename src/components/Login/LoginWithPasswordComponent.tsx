import {
    Box,
    Button,
    Input,
    Stack,
    Text,
} from '@chakra-ui/react'
import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '../../components/ui/modal'
import { SubmitHandler, useForm } from 'react-hook-form'

import { Checkbox } from '../../components/ui/checkbox'
import { Field } from '../../components/ui/field'
import { Route as InfoRoute } from '@routes/daily/_sidebar/account/index'
import { postLoginWithPassword } from '@api/Login'
import { postRegister } from '@api/Register'
import { toaster } from '../../components/ui/toaster'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

interface Inputs {
    qq: string
    password: string
}

export default function LoginWithPasswordComponent() {
    const navigate = useNavigate();
    const {
        handleSubmit,
        register,
        formState: { isSubmitting, errors },
    } = useForm<Inputs>()
    const [remember, setRemember] = useState<boolean>(localStorage.getItem('remember') === 'true' ? true : false);
    const [isForgotOpen, setIsForgotOpen] = useState(false);

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

    const handleLogin: SubmitHandler<Inputs> = async (values) => {
        const res = await postLoginWithPassword(values.qq, values.password);
        handleRember(values);
        toaster.create({ title: "登录成功", type: "success", description: res });
        await navigate({ to: InfoRoute.to });
    }

    const handleRegister: SubmitHandler<Inputs> = async (values) => {
        const res = await postRegister(values.qq, values.password);
        handleRember(values);
        toaster.create({ title: "注册成功", type: "success", description: res });
        await navigate({ to: InfoRoute.to });
    }

    return (
        <Box w="full">
            <form onSubmit={handleSubmit(handleLogin)}>
                <Stack gap={4}>
                    <Field invalid={!!errors.qq} label="QQ" errorText={errors.qq?.message}>
                        <Input type="text"
                            {...register('qq')}
                            placeholder='5位以上'
                            defaultValue={localStorage.getItem('qq') as (string | undefined)}
                        />
                    </Field>
                    <Field invalid={!!errors.password} label="密码" errorText={errors.password?.message}>
                        <Input type="password"
                            {...register('password')}
                            placeholder='8位以上,非QQ密码'
                            defaultValue={localStorage.getItem('password') as (string | undefined)}
                        />
                    </Field>
                    <Stack gap={10}>
                        <Stack
                            direction={{ base: 'column', sm: 'row' }}
                            align={'start'}
                            justify={'space-between'}>
                            <Checkbox checked={remember} onCheckedChange={(e) => setRemember(!!e.checked)}>记住我</Checkbox>
                            <Text 
                                color="fg.muted" 
                                fontSize="sm" 
                                cursor="pointer" 
                                _hover={{ color: "fg.emphasized", textDecoration: "underline" }}
                                onClick={() => setIsForgotOpen(true)}
                            >
                                忘记密码？
                            </Text>
                        </Stack>
                        <Button
                            colorPalette="brand"
                            loading={isSubmitting} type='submit'
                        >
                            登录
                        </Button>
                        <Button
                            colorPalette="brand"
                            loading={isSubmitting}
                            onClick={handleSubmit(handleRegister)}
                        >
                            注册
                        </Button>
                    </Stack>
                </Stack>
            </form>

            <Modal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>忘记密码</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text>如需重置密码，请联系系统维护人员。</Text>
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={() => setIsForgotOpen(false)}>我知道了</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    )
}
