import { Box, Button, Card, Flex, HStack, Heading, Separator, Stack, Tag, useDisclosure } from '@chakra-ui/react'
import { Fragment, useRef, useState } from 'react'
import { ConfigValue, ModuleInfo } from '@interfaces/Module';
import { FiChevronDown, FiCopy, FiStar } from 'react-icons/fi';
import { getAccountAreaSingleResultList, postAccountAreaSingle, putAccountConfig, getAccountConfig, putAccountConfigs } from '@api/Account';

import Alert from '../alert';
import { AxiosError } from 'axios';
import { Checkbox } from '../../components/ui/checkbox';
import Config, { enqueueConfigSave, getErrorDescription } from './Config';
import NiceModal from '@ebay/nice-modal-react';
import ResultInfoModal from './ResultInfoModal';
import ModuleSyncModal from './ModuleSyncModal';
import { clearAreaConfigCache } from './Area';
import { toaster } from '../../components/ui/toaster';
import { loadPopupFlag, favKey, safeGetItem, safeSetItem, DANGEROUS_AREA_NAME, busyAccountsRef, patchBusy } from './accountShared';

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

    /** 一键把炼成属性1-4全部设为同一属性（2物攻 4魔攻 12物贯 13法贯），乐观回写+失败回滚（仅还原仍等于乐观值的键，避免覆盖用户手改） */
    const bulkBusyRef = useRef(false);
    const [bulkBusy, setBulkBusy] = useState(false); // 视觉反馈：执行中按钮转圈+全组禁用
    // 回滚判定要读“此刻”的配置：闭包里的 config 是 await 前的旧值，守卫会恒 false 导致回滚失效
    const configRef = useRef(config);
    configRef.current = config;
    const handleBulkSubStatus = async (value: number): Promise<void> => {
        if (bulkBusyRef.current) return; // 防连点：上一批还在队列里
        bulkBusyRef.current = true;
        setBulkBusy(true);
        try {
            const keys = [
                'ex_equip_rainbow_enchance_sub_status_1',
                'ex_equip_rainbow_enchance_sub_status_2',
                'ex_equip_rainbow_enchance_sub_status_3',
                'ex_equip_rainbow_enchance_sub_status_4',
            ];
            const optimistic: Record<string, ConfigValue> = {};
            const next: Record<string, ConfigValue> = {};
            for (const k of keys) {
                optimistic[k] = config[k];
                next[k] = value;
            }
            for (const k of keys) onConfigUpdate?.(k, next[k]);
            try {
                const res = await enqueueConfigSave(alias, () => putAccountConfigs(alias, next));
                toaster.create({ type: 'success', title: '保存成功', description: res });
            } catch (err) {
                // 只还原当前值仍等于乐观写入值的键：排队期间用户手改过的键不动（configRef=最新渲染值）
                for (const k of keys) {
                    if (configRef.current[k] === next[k]) onConfigUpdate?.(k, optimistic[k]);
                }
                toaster.create({
                    type: 'error',
                    title: '保存失败',
                    description: await getErrorDescription(err as AxiosError),
                });
            }
        } finally {
            bulkBusyRef.current = false;
            setBulkBusy(false);
        }
    };
    const { open: isExpanded, onToggle: onToggleExpand } = useDisclosure({ defaultOpen: false });
    const dangerConfirm = useDisclosure();
    const isDangerous = areaName === DANGEROUS_AREA_NAME;

    const handleToggleFav = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const favKeyValue = favKey(alias);
        const stored = safeGetItem(favKeyValue);
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
        if (!safeSetItem(favKeyValue, JSON.stringify(favMap))) {
            toaster.create({ type: 'error', title: '收藏保存失败', description: '本地存储不可用或已满' });
            return;
        }

        onConfigUpdate?.(`_fav_${info.key}`, isNowFav);
    };

    // 用 ref 记最新模块开关，快速连点失败回滚不取过期闭包
    const moduleEnabledRef = useRef(config[info.key]);
    moduleEnabledRef.current = config[info.key];

    const onCheckedChange = (details: { checked: boolean | "indeterminate" }) => {
        const isChecked = !!details.checked;
        const previousValue = moduleEnabledRef.current;

        onConfigUpdate?.(info.key, isChecked);
        moduleEnabledRef.current = isChecked;

        enqueueConfigSave(alias, () => putAccountConfig(alias, info?.key, isChecked)).then((response) => {
            toaster.create({ type: 'success', title: '保存成功', description: response });
        }).catch(async (err: AxiosError) => {
            onConfigUpdate?.(info.key, previousValue as ConfigValue);
            moduleEnabledRef.current = previousValue;
            toaster.create({ type: 'error', title: '保存失败', description: await getErrorDescription(err) });
        });
    };

    const handleExecute = () => {
        // 忙碌互斥第七条路径：单模块执行与清理/批量是同一族长任务，在途时其它写路径必须被拒
        if (busyAccountsRef.has(alias)) {
            toaster.create({ type: 'warning', title: '该账号正在执行中', description: '请等待当前操作完成' });
            return;
        }
        patchBusy(alias, true);
        toaster.create({ type: 'info', title: '开始执行' + info?.name + "..." });
        onOpen();
        postAccountAreaSingle(alias, info?.key).then(async (res) => {
            toaster.create({ type: 'success', title: '执行成功' });
            // 先解除 loading 再弹结果：无论结果窗怎么关，按钮圈都会正常结束
            onClose();
            if (loadPopupFlag(alias)) {
                await NiceModal.show(ResultInfoModal, { alias: alias, title: info?.name, resultInfo: res });
            }
        }).catch(async (err: AxiosError) => {
            toaster.create({ type: 'error', title: '执行失败', description: await getErrorDescription(err) });
        }).finally(() => {
            onClose();
            patchBusy(alias, false); // 本笔是唯一登记作者（入口已互斥），直接清
        });
    }

    const handleResult = (e: React.MouseEvent) => {
        e.stopPropagation();
        toaster.create({ type: 'info', title: `正在获取${info?.name}的结果` });
        onOpen();
        getAccountAreaSingleResultList(alias, info?.key).then(async (res) => {
            // 先解除 loading 再弹结果
            onClose();
            await NiceModal.show(ResultInfoModal, { alias: alias, title: info?.name, resultInfo: res });
        }).catch(async (err: AxiosError) => {
            toaster.create({ type: 'error', title: '获取结果失败', description: await getErrorDescription(err) });
        }).finally(() => {
            onClose();
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

        const normalizedTargets = targetAccounts
            .filter((item): item is string => typeof item === 'string')
            .filter((item) => item !== alias);
        if (normalizedTargets.length === 0) {
            toaster.create({ type: 'warning', title: '没有可同步的目标账号' });
            return;
        }

        onOpen();
        // 互斥入网：源账号登记（ModuleSyncModal 只过滤不登记），PUT 前逐目标复查（弹窗确认期间目标可能开始执行）
        patchBusy(alias, true);
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
            let skipCount = 0;
            for (const targetAccount of normalizedTargets) {
                if (busyAccountsRef.has(targetAccount)) {
                    skipCount++; // 忙碌=跳过不记失败（与配置同步弹窗同口径）
                    continue;
                }
                try {
                    await putAccountConfigs(targetAccount, filteredConfig);
                    clearAreaConfigCache(targetAccount); // 失效目标 Area 缓存，防旧值回写冲掉刚同步的配置
                    successCount++;
                } catch (e) {
                    console.error(`Error syncing to ${targetAccount}`, e);
                    failCount++;
                }
            }

            if (failCount === 0) {
                const skipNote = skipCount > 0 ? `，跳过(执行中): ${skipCount}` : '';
                toaster.create({ type: 'success', title: `成功同步 ${info?.name} 到 ${successCount} 个账号${skipNote}` });
            } else {
                toaster.create({ type: 'warning', title: `同步部分完成`, description: `成功: ${successCount}, 失败: ${failCount}${skipCount > 0 ? `, 跳过: ${skipCount}` : ''}` });
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            toaster.create({ type: 'error', title: '同步过程中发生错误', description: errorMessage });
        } finally {
            onClose();
            patchBusy(alias, false); // 本笔是源账号登记的唯一作者，直接清
        }
    }

    const handleHeaderClick = () => {
        // 折叠前先失焦，让 text/int/time 的 onBlur 先保存并回写父级
        const ae = document.activeElement as HTMLElement | null;
        if (ae && typeof ae.blur === 'function' && ae !== document.body) {
            ae.blur();
        }
        window.setTimeout(() => onToggleExpand(), 0);
    };

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
            <Card.Header py={3} cursor="pointer" onClick={handleHeaderClick}>
                <Flex align="center" wrap="wrap" gap={2}>
                    <Box onClick={(e) => e.stopPropagation()} mr={{ base: 1, md: 1 }}>
                        <Checkbox
                            checked={!!config[info.key]}
                            onCheckedChange={onCheckedChange}
                            size="lg"
                            colorPalette="blue"
                        />
                    </Box>
                    <Box flex="1" minW="0">
                        <HStack gap={2} flexWrap="wrap" align="center">
                            <Heading size={{ base: 'sm', md: 'md' }} fontWeight="bold" truncate>{info?.name}</Heading>

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

            {/* 折叠卸载设置树省内存；Config 已回写 Area，再展开不会回到旧值 */}
            {isExpanded && (
                <Card.Body pt={0} animation="fade-in 0.2s">
                    <Stack gap='1.5'>
                        {info?.description &&
                            <Box bg="bg.subtle" px={3} py={2} borderRadius="lg" fontSize="sm" color="fg.muted">
                                {info?.description}
                            </Box>
                        }
                        {info?.description && info?.config_order.length != 0 && <Separator borderColor="border.subtle" />}
                        {info?.config_order.length != 0 &&
                            <Box>
                                <Stack gap='3.5'>
                                    <Heading size='sm' color="fg.subtle">设置项</Heading>
                                    {
                                        info?.config_order.map((key) => (
                                            <Fragment key={key}>
                                                <Config
                                                    alias={alias}
                                                    value={config[key]}
                                                    info={info.config[key]}
                                                    onConfigUpdate={onConfigUpdate}
                                                />
                                                {key === 'ex_equip_rainbow_enchance_sub_status_4' && (
                                                    <Flex gap={2} wrap="wrap">
                                                        {([
                                                            { label: '全部物攻', value: 2 },
                                                            { label: '全部魔攻', value: 4 },
                                                            { label: '全部物贯', value: 12 },
                                                            { label: '全部法贯', value: 13 },
                                                        ] as const).map((opt) => (
                                                            <Button
                                                                key={opt.label}
                                                                size="xs"
                                                                variant="outline"
                                                                colorPalette="blue"
                                                                onClick={() => void handleBulkSubStatus(opt.value)}
                                                                loading={bulkBusy}
                                                                disabled={bulkBusy}
                                                            >
                                                                {opt.label}
                                                            </Button>
                                                        ))}
                                                    </Flex>
                                                )}
                                            </Fragment>
                                        ))
                                    }
                                </Stack>
                            </Box>
                        }
                    </Stack>
                </Card.Body>
            )}

            {isDangerous && (
                <Alert
                    isOpen={dangerConfirm.open}
                    onClose={dangerConfirm.onClose}
                    title="危险操作确认"
                    body={`「${info?.name}」为危险模块，确定要执行吗？`}
                    onConfirm={() => { dangerConfirm.onClose(); handleExecute(); }}
                />
            )}
        </Card.Root>
    )
}
