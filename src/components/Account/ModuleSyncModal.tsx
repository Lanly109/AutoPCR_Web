import NiceModal, { useModal } from '@ebay/nice-modal-react';
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
import { getUserInfo } from '@api/Account';
import { useEffect, useState } from 'react';
import { Checkbox } from '../../components/ui/checkbox';
import { toaster } from '../../components/ui/toaster';

interface ModuleSyncModalProps {
    sourceAlias: string;
    moduleName: string;
}

export default NiceModal.create(({ sourceAlias, moduleName }: ModuleSyncModalProps) => {
    const modal = useModal();
    const [allAccounts, setAllAccounts] = useState<string[]>([]);
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (modal.visible) {
            const fetchAccounts = async () => {
                setIsLoading(true);
                try {
                    const userInfo = await getUserInfo();
                    const accounts = userInfo?.accounts?.map(acc => acc.name).filter(name => name !== sourceAlias) || [];
                    setAllAccounts(accounts);
                    setSelectedTargets(accounts);
                } catch (err) {
                    toaster.create({ type: 'error', title: '获取账号列表失败', description: String(err) });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAccounts();
        }
    }, [modal.visible, sourceAlias]);

    const toggleTarget = (account: string) => {
        if (selectedTargets.includes(account)) {
            setSelectedTargets(prev => prev.filter(a => a !== account));
        } else {
            setSelectedTargets(prev => [...prev, account]);
        }
    };

    const toggleAllTargets = () => {
        if (selectedTargets.length === allAccounts.length) {
            setSelectedTargets([]);
        } else {
            setSelectedTargets([...allAccounts]);
        }
    };

    const handleConfirm = () => {
        if (selectedTargets.length === 0) {
            toaster.create({ type: 'warning', title: '请选择至少一个目标账号' });
            return;
        }
        modal.resolve(selectedTargets);
        modal.hide();
    };

    const handleCancel = () => {
        modal.resolve(undefined);
        modal.hide();
    };

    return (
        <Modal isOpen={modal.visible} onClose={handleCancel} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>同步目标账号</ModalHeader>
                <ModalBody>
                    <Stack gap={6}>
                        <Box>
                            <Text mb={2} fontWeight="bold">将 <strong>{moduleName}</strong> 的配置同步到以下账号：</Text>
                            <Text fontSize="sm" color="fg.muted">默认已选择所有可用账号，可根据需要调整。</Text>
                        </Box>
                        <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.panel" borderColor="border.subtle">
                            <HStack justify="space-between" mb={3} borderBottomWidth="1px" pb={2}>
                                <Text fontWeight="bold">目标账号</Text>
                                <Checkbox 
                                    checked={allAccounts.length > 0 && selectedTargets.length === allAccounts.length} 
                                    onCheckedChange={toggleAllTargets}
                                    colorPalette="blue"
                                >
                                    全选
                                </Checkbox>
                            </HStack>
                            <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={3}>
                                {allAccounts.map(acc => (
                                    <Checkbox 
                                        key={acc}
                                        checked={selectedTargets.includes(acc)}
                                        onCheckedChange={() => toggleTarget(acc)}
                                        size="sm"
                                        colorPalette="blue"
                                    >
                                        {acc}
                                    </Checkbox>
                                ))}
                                {allAccounts.length === 0 && (
                                    <Text color="gray.500" fontSize="sm">无其他账号可选</Text>
                                )}
                            </Grid>
                        </Box>
                    </Stack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={handleCancel} mr={3}>取消</Button>
                    <Button colorPalette="blue" onClick={handleConfirm} loading={isLoading}>
                        确认同步
                    </Button>
                </ModalFooter>
                <ModalCloseButton />
            </ModalContent>
        </Modal>
    );
});
