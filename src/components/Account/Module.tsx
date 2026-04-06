import * as React from 'react';

import { Box, Button, Card, Flex, HStack, Heading, Separator, Stack, Tag, useDisclosure } from '@chakra-ui/react'
import { ConfigValue, ModuleInfo } from '@interfaces/Module';
import { FiChevronDown, FiCopy } from 'react-icons/fi';
import { getAccountAreaSingleResultList, postAccountAreaSingle, putAccountConfig, getAccountConfig, putAccountConfigs } from '@api/Account';

import { AxiosError } from 'axios';
import { Checkbox } from '../../components/ui/checkbox';
import Config from './Config';
import NiceModal from '@ebay/nice-modal-react';
import ResultInfoModal from './ResultInfoModal';
import ModuleSyncModal from './ModuleSyncModal';
import { toaster } from '../../components/ui/toaster';

interface ModuleProps extends React.ComponentProps<typeof Card.Root> {
    alias: string,
    areaKey: string,
    config: Record<string, ConfigValue>,
    info: ModuleInfo
    isOpen: boolean,
    onOpen: () => void,
    onClose: () => void
}

export default function Module({ alias, areaKey, config, info, isOpen, onOpen, onClose, ...rest }: ModuleProps) {
    const { open: isExpanded, onToggle: onToggleExpand } = useDisclosure({ defaultOpen: false });

    const onCheckedChange = (details: { checked: boolean | "indeterminate" }) => {
        putAccountConfig(alias, info?.key, !!details.checked).then((response) => {
            toaster.create({ type: 'success', title: '保存成功', description: response });
        }).catch((err: AxiosError) => {
            toaster.create({ type: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        })
    };

    const handleExecute = () => {
        toaster.create({ type: 'info', title: '开始执行' + info?.name + "..." });
        onOpen();
        postAccountAreaSingle(alias, info?.key).then(async (res) => {
            toaster.create({ type: 'success', title: '执行成功' });
            onClose();
            await NiceModal.show(ResultInfoModal, { alias: alias, title: info?.name, resultInfo: res });
        }).catch(async (err: AxiosError) => {
            toaster.create({ type: 'error', title: '执行失败', description: await (err.response?.data as Blob).text() || "网络错误" });
            onClose();
        });
    }

    const handleResult = (e: React.MouseEvent) => {
        e.stopPropagation();
        toaster.create({ type: 'info', title: `正在获取${info?.name}的结果` });
        onOpen();
        getAccountAreaSingleResultList(alias, info?.key).then(async (res) => {
            onClose();
            await NiceModal.show(ResultInfoModal, { alias: alias, title: info?.name, resultInfo: res });
        }).catch(async (err: AxiosError) => {
            onClose();
            toaster.create({ type: 'error', title: '获取结果失败', description: await (err.response?.data as Blob).text() || "网络错误" });
        });
    }

    const handleExecuteWrapper = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleExecute();
    }

    const handleSyncConfig = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (areaKey !== 'daily') {
            return;
        }
        const targetAccounts = await NiceModal.show(ModuleSyncModal, { sourceAlias: alias, moduleName: info.name });
        if (!Array.isArray(targetAccounts) || targetAccounts.length === 0) return;

        const normalizedTargets = targetAccounts.filter((item): item is string => typeof item === 'string');
        if (normalizedTargets.length === 0) return;

        onOpen();
        try {
            const moduleRes = await getAccountConfig(alias, "daily");
            if (!moduleRes.config) {
                toaster.create({ type: 'error', title: '获取配置失败' });
                return;
            }

            const filteredConfig: Record<string, ConfigValue> = {};
            if (moduleRes.config[info?.key] !== undefined) {
                filteredConfig[info?.key] = moduleRes.config[info?.key];
            }
            const moduleInfo = moduleRes.info?.[info?.key];
            if (moduleInfo?.config) {
                for (const configKey of Object.keys(moduleInfo.config)) {
                    if (moduleRes.config[configKey] !== undefined) {
                        filteredConfig[configKey] = moduleRes.config[configKey];
                    }
                }
            }

            if (Object.keys(filteredConfig).length === 0) {
                toaster.create({ type: 'warning', title: '没有可同步的配置' });
                return;
            }

            let successCount = 0;
            let failCount = 0;
            for (const targetAccount of normalizedTargets) {
                try {
                    await putAccountConfigs(targetAccount, filteredConfig);
                    successCount++;
                } catch (e) {
                    console.error(`Error syncing to ${targetAccount}`, e);
                    failCount++;
                }
            }

            if (failCount === 0) {
                toaster.create({ type: 'success', title: `成功同步 ${info?.name} 到 ${successCount} 个账号` });
            } else {
                toaster.create({ type: 'warning', title: `同步部分完成`, description: `成功: ${successCount}, 失败: ${failCount}` });
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            toaster.create({ type: 'error', title: '同步过程中发生错误', description: errorMessage });
        } finally {
            onClose();
        }
    }

    return (
        <Card.Root 
            colorPalette="brand" 
            bg="bg.panel" 
            borderRadius="2xl" 
            shadow="sm" 
            borderWidth="1px"
            borderColor="border.subtle"
            transition="all 0.2s"
            _hover={{ shadow: 'md', borderColor: "blue.400" }}
            {...rest} 
        >
            <Card.Header py={3} cursor="pointer" onClick={onToggleExpand}>
                <Flex align="center">
                    <Box onClick={(e) => e.stopPropagation()} mr={3}>
                         <Checkbox 
                            defaultChecked={!!config[info.key]} 
                            onCheckedChange={onCheckedChange}
                            size="lg"
                            colorPalette="blue"
                        />
                    </Box>
                    <Box flex="1">
                        <HStack gap={2}>
                            <Heading size='md' fontWeight="bold">{info?.name}</Heading> 
                            {info?.tags.map(item => (
                                <Tag.Root key={item} colorPalette="purple" variant="subtle" size="sm">
                                    <Tag.Label>{item}</Tag.Label>
                                </Tag.Root>
                            ))}
                        </HStack>
                    </Box>
                    <HStack gap={2}>
                        {info?.runnable &&
                            <Button size='sm' variant="surface" colorPalette='blue' loading={isOpen} onClick={handleExecuteWrapper}>执行</Button>
                        }
                        {info?.runnable &&
                            <Button size='sm' variant="ghost" colorPalette='blue' loading={isOpen} onClick={handleResult}>结果</Button>
                        }
                        {areaKey === 'daily' && (
                            <Button size='sm' variant="ghost" colorPalette='teal' loading={isOpen} onClick={handleSyncConfig} aria-label="同步配置"><FiCopy /></Button>
                        )}
                         <Box color="fg.muted" transition="transform 0.2s" transform={isExpanded ? "rotate(180deg)" : "rotate(0deg)"}>
                             <FiChevronDown />
                         </Box>
                    </HStack>
                </Flex>
            </Card.Header>

            {isExpanded && (
                <Card.Body pt={0} animation="fade-in 0.2s">
                    <Stack gap='4'>
                        {info?.description &&
                            <Box bg="bg.subtle" p={3} borderRadius="lg" fontSize="sm" color="fg.muted">
                                {info?.description}
                            </Box>
                        }
                        {info?.description && info?.config_order.length != 0 && <Separator borderColor="border.subtle" />}
                        {info?.config_order.length != 0 &&
                            <Box>
                                <Stack gap='4'>
                                    <Heading size='sm' color="fg.subtle">设置项</Heading>
                                    {
                                        info?.config_order.map((key) => (
                                            <Config key={key} alias={alias} value={config[key]} info={info.config[key]} />
                                        ))
                                    }
                                </Stack>
                            </Box>
                        }
                    </Stack>
                </Card.Body>
            )}
        </Card.Root >
    )
}

