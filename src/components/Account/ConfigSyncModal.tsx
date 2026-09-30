import NiceModal, { useModal } from '@ebay/nice-modal-react';
import {
    Box,
    Button,
    Grid,
    HStack,
    Stack,
    Text,
//    VStack,
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
import { getAccount, getAccountConfig, getUserInfo, putAccountConfigs } from '@/api/Account';
import { useEffect, useState } from 'react';

import { AreaInfo } from '@/interfaces/Account';
import { Checkbox } from '../../components/ui/checkbox';
import { toaster } from '../../components/ui/toaster';
import { getErrorDescription } from './Config';
import { busyAccountsRef, BATCH_RUNNER } from './accountShared';
import { clearAreaConfigCache } from './Area';

interface ConfigSyncModalProps {
    sourceAccount: string;
    presetDailyModules?: string[];
}

export default NiceModal.create(({ sourceAccount, presetDailyModules }: ConfigSyncModalProps) => {
    const modal = useModal();
    const [allAccounts, setAllAccounts] = useState<string[]>([]);
    const [areas, setAreas] = useState<AreaInfo[]>([]);
    
    // Selection state
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
    const [selectedAreas, setSelectedAreas] = useState<string[]>(presetDailyModules?.length ? ['daily'] : []);
    
    // Daily modules
    const [selectedDailyModules, setSelectedDailyModules] = useState<string[]>(presetDailyModules || []);
    
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Load data when opened
    useEffect(() => {
        if (modal.visible && sourceAccount) {
            const fetchData = async () => {
                setIsLoadingData(true);
                try {
                    // 1. Get All Accounts
                    const userInfo = await getUserInfo();
                    const accounts = userInfo?.accounts?.map(acc => acc.name).filter(name => name !== sourceAccount && name !== BATCH_RUNNER) || [];
                    setAllAccounts(accounts);
                    
                    // 2. Get Config Areas from Source Account
                    const accountInfo = await getAccount(sourceAccount);
                    setAreas(accountInfo?.area || []);
                    
                    // Default reset selection
                    setSelectedTargets([]);
                    setSelectedAreas(presetDailyModules?.length ? ['daily'] : []);
                    setSelectedDailyModules(presetDailyModules || []);

                } catch (err) {
                    toaster.create({ type: 'error', title: '获取数据失败', description: await getErrorDescription(err) });
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchData();
        }
    }, [modal.visible, sourceAccount, presetDailyModules]);

    // Handle Checkbox Changes
    const toggleTarget = (account: string) => {
        if (selectedTargets.includes(account)) {
            setSelectedTargets(prev => prev.filter(a => a !== account));
        } else {
            setSelectedTargets(prev => [...prev, account]);
        }
    };

    const toggleArea = async (key: string) => {
        if (key === "daily") {
            if (!selectedAreas.includes(key)) {
                // 获取日常模块并自动选择所有
                try {
                    const moduleRes = await getAccountConfig(sourceAccount, "daily");
                    const allModuleKeys = Object.keys(moduleRes.info || {});
                    setSelectedDailyModules(allModuleKeys);
                    setSelectedAreas(prev => [...prev, key]);
                } catch (err) {
                    toaster.create({ type: 'error', title: '获取日常模块失败', description: await getErrorDescription(err) });
                }
            } else {
                setSelectedAreas(prev => prev.filter(k => k !== key));
                setSelectedDailyModules([]);
            }
        } else {
            if (selectedAreas.includes(key)) {
                setSelectedAreas(prev => prev.filter(k => k !== key));
            } else {
                setSelectedAreas(prev => [...prev, key]);
            }
        }
    };

    const toggleAllTargets = () => {
        if (selectedTargets.length === allAccounts.length) {
            setSelectedTargets([]);
        } else {
            setSelectedTargets([...allAccounts]);
        }
    };

    const toggleAllAreas = async () => {
        if (selectedAreas.length === areas.length) {
            setSelectedAreas([]);
            setSelectedDailyModules([]);
        } else {
            const allKeys = areas.map(a => a.key);
            if (allKeys.includes("daily")) {
                // 获取日常模块并自动选择所有
                try {
                    const moduleRes = await getAccountConfig(sourceAccount, "daily");
                    const allModuleKeys = Object.keys(moduleRes.info || {});
                    setSelectedDailyModules(allModuleKeys);
                } catch (err) {
                    toaster.create({ type: 'error', title: '获取日常模块失败', description: await getErrorDescription(err) });
                    return;
                }
            }
            setSelectedAreas(allKeys);
        }
    };

    const handleSync = async () => {
        if (selectedTargets.length === 0 || selectedAreas.length === 0) {
            toaster.create({ type: 'warning', title: '请选择要同步的账号和配置项' });
            return;
        }

        if (selectedAreas.includes("daily") && selectedDailyModules.length === 0) {
            toaster.create({ type: 'warning', title: '请至少选择一个日常模块' });
            return;
        }

        // 忙碌互斥：执行中的目标跳过（与清理/导入/删除同一互斥源），防同步 PUT 与在跑动作并发打后端
        const freeTargets = selectedTargets.filter((t) => !busyAccountsRef.has(t));
        if (freeTargets.length === 0) {
            toaster.create({ type: 'warning', title: '请等待执行完毕', description: '所选目标账号都正在执行中' });
            return;
        }
        if (freeTargets.length < selectedTargets.length) {
            toaster.create({ type: 'info', title: `配置同步：已跳过 ${selectedTargets.length - freeTargets.length} 个正在执行中的账号` });
        }

        setIsSyncing(true);
        let successCount = 0;
        let failCount = 0;

        try {
            // Fetch source configs first
            let mergedConfig: Record<string, any> = {}; 
            
            for (const areaKey of selectedAreas) {
                const moduleRes = await getAccountConfig(sourceAccount, areaKey);
                if (moduleRes.config) {
                    if (areaKey === "daily" && selectedDailyModules.length > 0) {
                        // 过滤日常配置，只同步选中的模块
                        const filteredConfig: Record<string, any> = {};
                        for (const moduleKey of selectedDailyModules) {
                            // 同步模块开关项
                            if (moduleRes.config[moduleKey] !== undefined) {
                                filteredConfig[moduleKey] = moduleRes.config[moduleKey];
                            }
                            // 同步模块内的配置项
                            const moduleInfo = moduleRes.info?.[moduleKey];
                            if (moduleInfo?.config) {
                                for (const configKey of Object.keys(moduleInfo.config)) {
                                    if (moduleRes.config[configKey] !== undefined) {
                                        filteredConfig[configKey] = moduleRes.config[configKey];
                                    }
                                }
                            }
                        }
                        mergedConfig = { ...mergedConfig, ...filteredConfig };
                    } else {
                        mergedConfig = { ...mergedConfig, ...moduleRes.config };
                    }
                }
            }

            // Push to targets
            // Sequentially to avoid overwhelming if many（PUT 前逐个复查忙碌：源配置拉取期间目标可能开始执行）
            let skipCount = 0;
            for (const targetAccount of freeTargets) {
                 try {
                     if (busyAccountsRef.has(targetAccount)) {
                         skipCount++; // 忙碌=跳过不是失败：与入口预过滤同一口径，不谎报失败让用户白排查
                         continue;
                     }
                     if (Object.keys(mergedConfig).length > 0) {
                         await putAccountConfigs(targetAccount, mergedConfig);
                         // 失效目标账号的 Area 配置缓存：详情页/Picker 不再显示同步前旧值、不再以旧值回写冲掉刚同步的配置
                         clearAreaConfigCache(targetAccount);
                     }
                     successCount++;
                 } catch (e) {
                     console.error(`Error syncing to ${targetAccount}`, e);
                     failCount++;
                 }
            }
            
            if (failCount === 0) {
                const skipNote = skipCount > 0 ? `，跳过(执行中): ${skipCount}` : '';
                toaster.create({ type: 'success', title: `成功同步到 ${successCount} 个账号${skipNote}` });
                modal.hide();
            } else {
                toaster.create({ type: 'warning', title: `同步部分完成`, description: `成功: ${successCount}, 失败: ${failCount}${skipCount > 0 ? `, 跳过: ${skipCount}` : ''}` });
            }

        } catch (err: any) {
            toaster.create({ type: 'error', title: '同步过程中发生错误', description: await getErrorDescription(err) });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Modal isOpen={modal.visible} onClose={modal.hide} scrollBehavior="inside" size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>配置同步 - 来源: {sourceAccount}</ModalHeader>
                <ModalBody>
                    <Stack gap={6}>
                        {/* 1. Select Targets */}
                        <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.panel" borderColor="border.subtle">
                            <HStack justify="space-between" mb={3} borderBottomWidth="1px" pb={2}>
                                <Text fontWeight="bold">1. 选择目标账号</Text>
                                <Checkbox 
                                    checked={allAccounts.length > 0 && selectedTargets.length === allAccounts.length} 
                                    onCheckedChange={toggleAllTargets}
                                    colorPalette="blue"
                                >
                                    全选
                                </Checkbox>
                            </HStack>
                            <Box maxH="200px" overflowY="auto">
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
                                    {allAccounts.length === 0 && <Text color="gray.500" fontSize="sm">无其他账号可选</Text>}
                                </Grid>
                            </Box>
                        </Box>

                        {/* 2. Select Areas */}
                        <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.panel" borderColor="border.subtle">
                             <HStack justify="space-between" mb={3} borderBottomWidth="1px" pb={2}>
                                <Text fontWeight="bold">2. 选择配置区域</Text>
                                <Checkbox 
                                    checked={areas.length > 0 && selectedAreas.length === areas.length} 
                                    onCheckedChange={toggleAllAreas}
                                    colorPalette="green"
                                >
                                    全选
                                </Checkbox>
                            </HStack>
                            <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={3}>
                                {areas.map(area => (
                                    <Checkbox 
                                        key={area.key} 
                                        checked={selectedAreas.includes(area.key)}
                                        onCheckedChange={() => toggleArea(area.key)}
                                        size="sm"
                                        colorPalette="green"
                                    >
                                        {area.name}
                                    </Checkbox>
                                ))}
                                {areas.length === 0 && <Text color="gray.500" fontSize="sm">无配置区域</Text>}
                            </Grid>
                            {selectedAreas.includes('daily') && selectedDailyModules.length > 0 && (
                                <Text color="fg.muted" fontSize="sm" mt={2}>
                                    已选日常模块：{selectedDailyModules.length} 个
                                </Text>
                            )}
                        </Box>
                    </Stack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={modal.hide} mr={3}>取消</Button>
                    <Button 
                        colorPalette="blue" 
                        onClick={handleSync} 
                        loading={isSyncing || isLoadingData}
                        disabled={selectedTargets.length === 0 || selectedAreas.length === 0}
                    >
                        开始同步
                    </Button>
                </ModalFooter>
                <ModalCloseButton />
            </ModalContent>
        </Modal>
    );
});
