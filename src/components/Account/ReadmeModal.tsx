import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Text,
} from '@chakra-ui/react'
import NiceModal, { useModal } from "@ebay/nice-modal-react";

const ReadmeModal = NiceModal.create(() => {
    const modal = useModal();
    return (
        <Modal blockScrollOnMount={false} size='xl' closeOnOverlayClick={false} isOpen={modal.visible} onClose={modal.hide}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>使用须知</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Text fontSize="lg">
                        本项目会
                        <Text as="mark" fontSize="2xl" color="red" fontWeight="bold" bg="yellow">
                            明文
                        </Text>
                        储存您的所有数据，如有介意请勿使用。
                    </Text>

                    <Text fontSize="lg" mt={4}>
                        本项目以
                        <Text as="mark" fontSize="2xl" fontWeight="bold">
                            CC BY-NC-SA 4.0协议
                        </Text>
                        开源，任何人都可以免费获取和使用，但<Text as="b" color='red' fontSize='2xl'>禁止商用</Text>，所有修改和衍生作品必须以
                        <Text as="b" color="red" fontSize="2xl">
                            相同许可证开源
                        </Text>。
                    </Text>

                    <Text fontSize="lg" mt={4}>
                        如果您被收取了费用，可能是服务提供者的行为，
                        <Text as="b" fontSize="2xl" color="red">
                            与本项目无关
                        </Text>
                        。
                    </Text>

                    <Text fontSize="lg" mt={4}>
                        您可以于页脚处获取源代码。
                    </Text>

                    <Text fontSize="lg" mt={4}>
                        您可以点击QQ号再次查看此须知。
                    </Text>
                </ModalBody>
            </ModalContent>
        </Modal>
    )
})

export default ReadmeModal;
