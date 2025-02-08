import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Image,
} from '@chakra-ui/react'
import NiceModal, { useModal } from "@ebay/nice-modal-react";
import announcement from "@/assets/announcement.png"

const ReadmeModal = NiceModal.create(() => {
    const modal = useModal();
    return (
        <Modal blockScrollOnMount={false} size='5xl' closeOnOverlayClick={false} isOpen={modal.visible} onClose={async () => { modal.resolve(); await modal.hide(); }}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>使用须知</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Image src={announcement} alt="announcement" />
                </ModalBody>
            </ModalContent>
        </Modal>
    )
})

export default ReadmeModal;
