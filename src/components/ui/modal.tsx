import * as React from "react"

import { CloseButton } from "./close-button"
import { Dialog, Portal } from "@chakra-ui/react"

export interface ModalProps extends Dialog.RootProps {
    isOpen: boolean
    onClose: () => void
}

export const Modal = ({ isOpen, onClose, children, ...rest }: any) => {
    return (
        <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} {...rest}>
            <Portal>
                {children}
            </Portal>
        </Dialog.Root>
    )
}

export const ModalOverlay = (props: any) => <Dialog.Backdrop {...props} />

export const ModalContent = ({ children, ...rest }: any) => (
    <Dialog.Positioner>
        <Dialog.Content {...rest}>
            {children}
        </Dialog.Content>
    </Dialog.Positioner>
)

export const ModalHeader = React.forwardRef<HTMLDivElement, React.PropsWithChildren<any>>(
  (props, ref) => {
    const { children, ...rest } = props
    return (
      <Dialog.Header ref={ref} {...rest}>
        <Dialog.Title>{children}</Dialog.Title>
      </Dialog.Header>
    )
  },
)
export const ModalBody = Dialog.Body
export const ModalFooter = Dialog.Footer
export const ModalCloseButton = (props: any) => (
    <Dialog.CloseTrigger asChild position="absolute" top="2" insetEnd="2" {...props}>
        <CloseButton size="sm" />
    </Dialog.CloseTrigger>
)
