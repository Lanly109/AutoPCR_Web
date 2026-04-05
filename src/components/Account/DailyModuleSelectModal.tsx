import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { useState } from 'react';
import {
    Box,
    Button,
    Grid,
    HStack,
    Stack,
    Text,
} from '@chakra-ui/react';
import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '../../components/ui/modal';
import { Checkbox } from '../../components/ui/checkbox';

interface DailyModuleSelectModalProps {
    modules: Record<string, string>;
    initialSelected: string[];
}

export default NiceModal.create(({ modules, initialSelected }: DailyModuleSelectModalProps) => {
    const modal = useModal();
    const [selectedModules, setSelectedModules] = useState<string[]>(initialSelected);

    const toggleModule = (key: string) => {
        if (selectedModules.includes(key)) {
            setSelectedModules(prev => prev.filter(k => k !== key));
        } else {
            setSelectedModules(prev => [...prev, key]);
        }
    };

    const toggleAllModules = () => {
        if (selectedModules.length === Object.keys(modules).length) {
            setSelectedModules([]);
        } else {
            setSelectedModules(Object.keys(modules));
        }
    };

    const handleConfirm = () => {
        modal.resolve(selectedModules);
        modal.hide();
    };

    const handleClose = () => {
        modal.resolve(undefined);
        modal.hide();
    };

    return (
        <Modal isOpen={modal.visible} onClose={handleClose} scrollBehavior="inside" size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>选择日常模块</ModalHeader>
                <ModalBody>
                    <Stack gap={4}>
                        <HStack justify="space-between" mb={3} borderBottomWidth="1px" pb={2}>
                            <Text fontWeight="bold">选择要同步的日常模块</Text>
                            <Checkbox 
                                checked={Object.keys(modules).length > 0 && selectedModules.length === Object.keys(modules).length} 
                                onCheckedChange={toggleAllModules}
                                colorPalette="green"
                            >
                                全选
                            </Checkbox>
                        </HStack>
                        <Box maxH="300px" overflowY="auto">
                            <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={3}>
                                {Object.entries(modules).map(([key, name]) => (
                                    <Checkbox 
                                        key={key} 
                                        checked={selectedModules.includes(key)}
                                        onCheckedChange={() => toggleModule(key)}
                                        size="sm"
                                        colorPalette="green"
                                    >
                                        {name}
                                    </Checkbox>
                                ))}
                                {Object.keys(modules).length === 0 && <Text color="gray.500" fontSize="sm">无模块</Text>}
                            </Grid>
                        </Box>
                    </Stack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={handleClose} mr={3}>取消</Button>
                    <Button 
                        colorPalette="blue" 
                        onClick={handleConfirm}
                    >
                        确认
                    </Button>
                </ModalFooter>
                <ModalCloseButton />
            </ModalContent>
        </Modal>
    );
});