import { Box, Flex, IconButton, Popover, Stack, useDisclosure } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';

import { FiCompass } from 'react-icons/fi';
import Module from './Module';
import { ConfigValue, ModuleResponse } from '@interfaces/Module';
import { Skeleton } from '../../components/ui/skeleton';
import Toc from './Toc';
import { getAccountConfig } from '@api/Account';

interface AreaProps {
    alias: string;
    keys: string;
    areaName: string;
    showOnlyFav?: boolean;
}

export interface TocItem {
    name: string;
    id: string;
}

/** 区服配置数据缓存：只存 JSON，不占 React/DOM。UI 卸载后数据仍在。 */
const areaConfigCache = new Map<string, ModuleResponse>();

function cacheKey(alias: string, key: string) {
    return `${alias}::${key}`;
}

export function getCachedAreaConfig(alias: string, key: string) {
    return areaConfigCache.get(cacheKey(alias, key));
}

export function setCachedAreaConfig(alias: string, key: string, data: ModuleResponse) {
    areaConfigCache.set(cacheKey(alias, key), data);
}

/** 离开账号详情 / 导入配置成功后调用，释放该账号缓存 */
export function clearAreaConfigCache(alias?: string) {
    if (!alias) {
        areaConfigCache.clear();
        return;
    }
    for (const k of [...areaConfigCache.keys()]) {
        if (k.startsWith(`${alias}::`)) areaConfigCache.delete(k);
    }
}

function mergeFavIntoConfig(alias: string, key: string, res: ModuleResponse): ModuleResponse {
    const favKey = `autopcr_fav_${alias}`;
    const stored = localStorage.getItem(favKey);
    if (!stored) return res;
    try {
        const favMap = JSON.parse(stored) as Record<string, string[]>;
        const areaFavs = favMap[key] || [];
        if (areaFavs.length === 0) return res;
        const mergedConfig = { ...res.config };
        areaFavs.forEach((moduleKey) => {
            mergedConfig[`_fav_${moduleKey}`] = true;
        });
        return { ...res, config: mergedConfig };
    } catch {
        return res;
    }
}

export default function Area({ alias, keys: key, areaName, showOnlyFav = false }: AreaProps) {
    const cached = alias && key ? getCachedAreaConfig(alias, key) : undefined;

    const [state, setState] = useState<{
        config: ModuleResponse | null;
        isLoading: boolean;
    }>(() => ({
        // 有缓存：立刻有内容，不走骨架
        config: cached ?? null,
        isLoading: !cached,
    }));

    const { open, onOpen, onClose } = useDisclosure();

    useEffect(() => {
        let isMounted = true;
        if (!alias || !key) return;

        // 已有缓存：只恢复 UI，不再请求（改过的设置已在 handleConfigUpdate 写回缓存）
        const hit = getCachedAreaConfig(alias, key);
        if (hit) {
            // 收藏可能在别处改过，再合并一次 localStorage（极轻）
            const withFav = mergeFavIntoConfig(alias, key, hit);
            if (withFav !== hit) {
                setCachedAreaConfig(alias, key, withFav);
            }
            setState({ config: withFav, isLoading: false });
            return () => {
                isMounted = false;
            };
        }

        setState({ config: null, isLoading: true });

        getAccountConfig(alias, key)
            .then((res) => {
                if (!isMounted) return;
                const finalRes = mergeFavIntoConfig(alias, key, res);
                setCachedAreaConfig(alias, key, finalRes);
                setState({ config: finalRes, isLoading: false });
            })
            .catch((err) => {
                if (isMounted) {
                    console.error(err);
                    setState((prev) => ({ ...prev, isLoading: false }));
                }
            });

        return () => {
            isMounted = false;
        };
    }, [alias, key]);

    const handleConfigUpdate = (configKey: string, value: ConfigValue) => {
        setState((prev) => {
            if (!prev.config) return prev;
            const nextConfig: ModuleResponse = {
                ...prev.config,
                config: { ...prev.config.config, [configKey]: value },
            };
            // 同步写缓存：切走再回来设置还在，无需重新拉
            if (alias && key) {
                setCachedAreaConfig(alias, key, nextConfig);
            }
            return { ...prev, config: nextConfig };
        });
    };

    const config = state.config;

    const visibleModules = useMemo(() => {
        if (!config) return [];
        return showOnlyFav
            ? config.order.filter((moduleKey) => config.config[`_fav_${moduleKey}`] === true)
            : config.order;
    }, [config, showOnlyFav]);

    const tocList: TocItem[] = useMemo(() => {
        if (!config) return [];
        return visibleModules
            .filter((moduleKey) => config.info?.[moduleKey])
            .map((moduleKey) => ({
                name: config.info[moduleKey]?.name || moduleKey,
                id: moduleKey,
            }));
    }, [config, visibleModules]);

    return (
        <>
            <Box pb={20} position="relative">
                <Stack gap={4}>
                    {state.isLoading && !config ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Box key={i} p={6} borderWidth="1px" borderRadius="2xl" bg="bg.panel" shadow="sm">
                                <Skeleton height="30px" width="40%" mb={4} />
                                <Skeleton height="20px" width="100%" mb={2} />
                                <Skeleton height="20px" width="80%" mb={2} />
                                <Skeleton height="20px" width="90%" mb={6} />
                                <Skeleton height="40px" width="100%" />
                            </Box>
                        ))
                    ) : (
                        visibleModules.map((module) => {
                            const moduleInfo = config?.info?.[module];
                            if (!moduleInfo) return null;

                            return (
                                <Module
                                    key={module}
                                    id={module}
                                    alias={alias}
                                    areaKey={key}
                                    areaName={areaName}
                                    config={config?.config ?? {}}
                                    info={moduleInfo}
                                    isOpen={open}
                                    onOpen={onOpen}
                                    onClose={onClose}
                                    onConfigUpdate={handleConfigUpdate}
                                />
                            );
                        })
                    )}
                </Stack>
            </Box>

            <Flex
                position="fixed"
                right={{ base: '3', md: '6' }}
                top="50%"
                transform="translateY(-50%)"
                justifyContent="center"
                alignItems="center"
                zIndex={100}
            >
                <Popover.Root lazyMount positioning={{ placement: 'left', gutter: 4 }}>
                    <Popover.Trigger asChild>
                        <IconButton
                            aria-label="TOC"
                            colorPalette="blue"
                            size={{ base: 'lg', md: 'xl' }}
                            rounded="full"
                            shadow="xl"
                            transition="transform 0.2s ease"
                            _hover={{ transform: 'scale(1.1)', shadow: '2xl' }}
                        >
                            <FiCompass />
                        </IconButton>
                    </Popover.Trigger>
                    <Popover.Content width="auto" minW="200px">
                        <Toc maxH="60vh" tocList={tocList} />
                    </Popover.Content>
                </Popover.Root>
            </Flex>
        </>
    );
}
