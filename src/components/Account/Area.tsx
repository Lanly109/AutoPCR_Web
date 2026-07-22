import { Box, Flex, IconButton, Popover, Stack, useDisclosure } from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';

import { FiCompass } from 'react-icons/fi';
import Module from "./Module";
import { ConfigValue, ModuleResponse } from '@interfaces/Module';
import { Skeleton } from '../../components/ui/skeleton';
import Toc from "./Toc";
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

export default function Area({ alias, keys: key, areaName, showOnlyFav = false }: AreaProps) {
    const [state, setState] = useState<{
        config: ModuleResponse | null;
        isLoading: boolean;
    }>({
        config: null,
        isLoading: true,
    });

    const { open, onOpen, onClose } = useDisclosure();

    useEffect(() => {
        let isMounted = true;

        if (alias && key) {
            getAccountConfig(alias, key)
                .then((res) => {
                    if (!isMounted) return;

                    const favKey = `autopcr_fav_${alias}`;
                    const stored = localStorage.getItem(favKey);
                    let finalRes = res;

                    if (stored) {
                        try {
                            const favMap = JSON.parse(stored) as Record<string, string[]>;
                            const areaFavs = favMap[key] || [];
                            const mergedConfig = { ...res.config };
                            areaFavs.forEach((moduleKey) => {
                                mergedConfig[`_fav_${moduleKey}`] = true;
                            });
                            finalRes = { ...res, config: mergedConfig };
                        } catch {
                            finalRes = res;
                        }
                    }

                    setState({ config: finalRes, isLoading: false });
                })
                .catch((err) => {
                    if (isMounted) {
                        console.error(err);
                        setState((prev) => ({ ...prev, isLoading: false }));
                    }
                });
        }

        return () => {
            isMounted = false;
        };
    }, [alias, key]);

    const handleConfigUpdate = (configKey: string, value: ConfigValue) => {
        setState((prev) => {
            if (!prev.config) return prev;
            return {
                ...prev,
                config: {
                    ...prev.config,
                    config: { ...prev.config.config, [configKey]: value },
                },
            };
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
                    {/* 首次加载未获取到数据时：只显示灰色骨架块，避免任何白屏 */}
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
                right={{ base: "3", md: "6" }}
                top="50%"
                transform="translateY(-50%)"
                justifyContent="center"
                alignItems="center"
                zIndex={100}
            >
                <Popover.Root lazyMount positioning={{ placement: 'left', gutter: 4 }}>
                    <Popover.Trigger>
                        <IconButton
                            aria-label="TOC"
                            colorPalette="blue"
                            size={{ base: "lg", md: "xl" }}
                            rounded="full"
                            shadow="xl"
                            transition="transform 0.2s ease"
                            _hover={{ transform: "scale(1.1)", shadow: "2xl" }}
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
