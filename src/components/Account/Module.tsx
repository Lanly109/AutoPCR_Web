import { Box, Button, Card, Collapsible, Flex, HStack, Heading, Separator, Stack, Tag, useDisclosure } from '@chakra-ui/react'
import { ConfigValue, ModuleInfo } from '@interfaces/Module';
import { FiChevronDown, FiCopy, FiStar } from 'react-icons/fi';
import { getAccountAreaSingleResultList, postAccountAreaSingle, putAccountConfig, getAccountConfig, putAccountConfigs } from '@api/Account';
import * as React from 'react';
import Alert from '../alert';
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
    areaName: string,
    config: Record<string, ConfigValue>,
    info: ModuleInfo
    isOpen: boolean,
    onOpen: () => void,
    onClose: () => void,
    onConfigUpdate?: (key: string, value: ConfigValue) => void
}

export default function Module({ alias, areaKey, areaName, config, info, isOpen, onOpen, onClose, onConfigUpdate, ...rest }: ModuleProps) {
    const { open: isExpanded, onToggle: onToggleExpand } = useDisclosure({ defaultOpen: false });
    const dangerConfirm = useDisclosure();
    const isDangerous = areaName === '危险';

    const handleToggleFav = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const favKey = `autopcr_fav_${alias}`;
        const stored = localStorage.getItem(favKey);
         let favMap: Record<string, string[]> = {};
         if (stored) {
             try {
                 favMap = JSON.parse(stored) as Record<string, string[]>;
             } catch {
                 favMap = {};
             }
         }
        const areaFavs = new Set(favMap[areaKey] || []);
        
        const isNowFav = !areaFavs.has(info.key);
        if (isNowFav) {
            areaFavs.add(info.key);
        } else {
            areaFavs.delete(info.key);
        }
        
        favMap[areaKey] = Array.from(areaFavs);
        localStorage.setItem(favKey, JSON.stringify(favMap));
        
        // 同步通知父组件更新本地状态，使星星立即变色
        onConfigUpdate?.(`_fav_${info.key}`, isNowFav);
    };

    const onCheckedChange = (details: { checked: boolean | "indeterminate" }) => {
        const isChecked = !!details.checked;
        const previousValue = config[info.key];

        // 1. 乐观更新：0ms 立即在界面打勾/取消打勾
        onConfigUpdate?.(info.key, isChecked);

        // 2. 异步请求后端，失败时回滚
        putAccountConfig(alias, info?.key, isChecked).then((response) => {
            toaster.create({ type: 'success', title: '保存成功', description: response });
        }).catch((err: AxiosError) => {
            // 请求失败：回滚勾选状态
            onConfigUpdate?.(info.key, previousValue);
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
        if (isDangerous) {
            dangerConfirm.onOpen();
        } else {
            handleExecute();
        }
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
                onClose();
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
                <Flex align="center" wrap="wrap" gap={2}>
                    <Box onClick={(e) => e.stopPropagation()} mr={{ base: 1, md: 1 }}>
                         {/* 受控组件绑定，保证导入/更新后界面同步勾选 */}
                         <Checkbox 
                            checked={!!config[info.key]} 
                            onCheckedChange={onCheckedChange}
                            size="lg"
                            colorPalette="blue"
                        />
                    </Box>
                    <Box flex="1" minW="0">
                        <HStack gap={2} flexWrap="wrap" align="center">
                            {/* 模块名称 */}
                            <Heading size={{ base: 'sm', md: 'md' }} fontWeight="bold" truncate>{info?.name}</Heading>
                            
                            {/* 收藏黄星 */}
                            <Box
                                onClick={handleToggleFav}
                                cursor="pointer"
                                color={config?.[`_fav_${info.key}`] ? "yellow.400" : "gray.400"}
                                fontSize="1.25rem"
                                lineHeight={1}
                                display="flex"
                                alignItems="center"
                                p={0}
                            >
                                <FiStar fill={config?.[`_fav_${info.key}`] ? "currentColor" : "none"} />
                            </Box>
                            
                            {/* 标签 */}
                            {info?.tags.map(item => (
                                <Tag.Root key={item} colorPalette="purple" variant="subtle" size="sm">
                                    <Tag.Label>{item}</Tag.Label>
                                </Tag.Root>
                            ))}
                        </HStack>
                    </Box>
                    <HStack gap={{ base: 1, md: 2 }} flexShrink={0}>
                        {info?.runnable &&
                            <Button size={{ base: 'xs', md: 'sm' }} variant="surface" colorPalette='blue' loading={isOpen} onClick={handleExecuteWrapper}>执行</Button>
                        }
                        {info?.runnable &&
                            <Button size={{ base: 'xs', md: 'sm' }} variant="ghost" colorPalette='blue' loading={isOpen} onClick={handleResult}>结果</Button>
                        }
                        {areaKey === 'daily' && (
                            <Button size={{ base: 'xs', md: 'sm' }} variant="ghost" colorPalette='teal' loading={isOpen} onClick={handleSyncConfig} aria-label="同步配置"><FiCopy /></Button>
                        )}
                         <Box color="fg.muted" transition="transform 0.2s" transform={isExpanded ? "rotate(180deg)" : "rotate(0deg)"}>
                             <FiChevronDown />
                         </Box>
                    </HStack>
                </Flex>
            </Card.Header>

            <Collapsible.Root open={isExpanded}>
                <Collapsible.Content>
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
                </Collapsible.Content>
            </Collapsible.Root>
            {isDangerous && (
                <Alert
                    isOpen={dangerConfirm.open}
                    onClose={dangerConfirm.onClose}
                    title="危险操作确认"
                    body={`「${info?.name}」为危险模块，确定要执行吗？`}
                    onConfirm={() => { dangerConfirm.onClose(); handleExecute(); }}
                />
            )}
        </Card.Root >
    )
}
