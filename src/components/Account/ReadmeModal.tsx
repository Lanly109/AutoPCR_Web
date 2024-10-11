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
                    <Text> 本项目会<Text as='mark' fontSize='2xl'>明文</Text>储存您的所有数据，如有介意请勿使用。 </Text>
                    <Text> 本项目以<Text as='ins' fontSize='2xl'>AGPL-3.0协议</Text>开源，任何人都可以免费获取和使用，但所有修改需<Text as='b' color='red' fontSize='2xl'>公开源代码</Text>。</Text>
                    <Text> 如果您被收取了费用，可能是服务提供者的行为，<Text fontSize='2xl' as='b'>与本项目无关</Text>。 </Text>
                    <Text> 您可以于页脚处获取源代码。 </Text>
                    <Text> 您可以点击QQ号再次查看此须知。 </Text>
                </ModalBody>
            </ModalContent>
        </Modal>
    )
})

export default ReadmeModal;
