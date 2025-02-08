import {
    Button,
    FormControl,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Stack,
    Textarea,
    useToast,
} from '@chakra-ui/react'
import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { SubmitHandler, useForm } from 'react-hook-form';
import { putClanForbid } from '@/api/Account';

import { AxiosError } from 'axios';

interface ClanForbid {
    accs: string;
}

const clanForbid = NiceModal.create(({ accs }: { accs: string }) => {
    const modal = useModal();
    const toast = useToast();
    const {
        handleSubmit,
        register,
        formState: { isSubmitting },
    } = useForm<ClanForbid>()
    const handleCreateUser: SubmitHandler<ClanForbid> = (values) => {
        putClanForbid(values.accs).then(async (res) => {
            toast({ status: 'success', title: '创建会战禁用成功', description: res });
            modal.resolve();
            await modal.hide();
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '创建会战禁用失败', description: err?.response?.data as string || '网络错误' });
        });
    }
    return (
        <Modal closeOnOverlayClick={false} isOpen={modal.visible} onClose={modal.hide}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>设置会战禁用</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <form onSubmit={handleSubmit(handleCreateUser)}>
                        <Stack spacing={4}>
                            <FormControl id="accs" isRequired>
                                <Textarea {...register('accs')}
                                    placeholder="禁用账号（是游戏账号噢）"
                                    h="50vh"
                                    defaultValue={accs}
                                    size="md"
                                />
                            </FormControl>
                            <Button
                                bg={'blue.400'}
                                color={'white'}
                                _hover={{
                                    bg: 'blue.500',
                                }}
                                isLoading={isSubmitting} type='submit'
                            >
                                提交
                            </Button>
                        </Stack>
                    </form>
                </ModalBody>

            </ModalContent>
        </Modal >
    )
})

export default clanForbid;
