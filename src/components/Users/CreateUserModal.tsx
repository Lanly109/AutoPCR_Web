import {
    Button,
    Checkbox,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Stack,
    useToast,
} from '@chakra-ui/react'
import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { SubmitHandler, useForm } from 'react-hook-form';
import { postUser, useUserRole } from '@/api/Account';

import { AxiosError } from 'axios';

interface CreateUserProps {
    qq: string
    password: string
    clan: boolean
    disabled: boolean
    admin: boolean
}

const createUserModal = NiceModal.create(() => {
    const role = useUserRole();
    const modal = useModal();
    const toast = useToast();
    const {
        handleSubmit,
        register,
        formState: { isSubmitting, errors },
    } = useForm<CreateUserProps>()
    const handleCreateUser: SubmitHandler<CreateUserProps> = (values) => {
        postUser(values.qq, values).then(async (res) => {
            toast({ status: 'success', title: '创建用户成功', description: res });
            modal.resolve();
            await modal.hide();
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '创建用户失败', description: err?.response?.data as string || '网络错误' });
        });
    }
    return (
        <Modal closeOnOverlayClick={false} isOpen={modal.visible} onClose={modal.hide}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>创建用户</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <form onSubmit={handleSubmit(handleCreateUser)}>
                        <Stack spacing={4}>
                            <FormControl isInvalid={!!errors.qq}>
                                <FormLabel>QQ</FormLabel>
                                <Input type='text'
                                    {...register("qq", {
                                        required: "QQ 不能为空",
                                        minLength: { value: 5, message: "QQ号长度至少 5 位" },
                                    })}
                                    placeholder='5位以上'
                                />
                                <FormErrorMessage>
                                    {errors.qq?.message}
                                </FormErrorMessage>
                            </FormControl>

                            <FormControl isInvalid={!!errors.password}>
                                <FormLabel>密码</FormLabel>
                                <Input type='password'
                                    {...register("password", {
                                        required: "请输入密码",
                                        minLength: { value: 5, message: "密码长度至少 5 位" },
                                    })}
                                    placeholder='请输入密码'
                                />
                                <FormErrorMessage>
                                    {errors.password?.message}
                                </FormErrorMessage>
                            </FormControl>
                            <FormControl>
                                <Checkbox {...register('clan')} >公会管理</Checkbox>
                            </FormControl>
                            <FormControl>
                                <Checkbox {...register('disabled')} >禁用</Checkbox>
                            </FormControl>
                            {role?.super_user &&
                                <FormControl>
                                    <Checkbox {...register('admin')} >管理员</Checkbox>
                                </FormControl>
                            }
                            <Button
                                bg={'blue.400'}
                                color={'white'}
                                _hover={{
                                    bg: 'blue.500',
                                }}
                                isLoading={isSubmitting} type='submit'
                            >
                                创建
                            </Button>
                        </Stack>
                    </form>
                </ModalBody>

            </ModalContent>
        </Modal >
    )
})

export default createUserModal;
