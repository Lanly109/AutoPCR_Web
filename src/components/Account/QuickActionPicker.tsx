import { Box, Button, Flex, Input, Text } from '@chakra-ui/react';
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
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAccount, getAccountConfig } from '@api/Account';
import { ModuleInfo } from '@interfaces/Module';
import { Skeleton } from '../../components/ui/skeleton';
import { toaster } from '../../components/ui/toaster';
import { QuickActionItem } from './quickActions';
import { getCachedAreaConfig, setCachedAreaConfig } from './Area';
import { DANGEROUS_AREA_NAME } from './accountShared';

interface QuickActionPickerProps {
    /** 参考账号：功能定义全服一致，取任意一个真实账号拉取 */
    alias: string;
    current: QuickActionItem[];
}

interface PickerGroup {
    areaKey: string;
    areaName: string;
    modules: { key: string; name: string; dangerous: boolean }[];
}

const QuickActionPicker = NiceModal.create(({ alias, current }: QuickActionPickerProps) => {
    const modal = useModal();
    const [groups, setGroups] = useState<PickerGroup[]>([]);
    // 拉取失败独立于「列表为空」：合法空列表（区服空/模块全下线）允许确认（那是移除旧按钮的唯一途径），失败列表不行
    const [fetchFailed, setFetchFailed] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(() => new Set(current.map((b) => b.key)));
    const [searchText, setSearchText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // 失败重试：递增触发重新拉取
    const [reloadTick, setReloadTick] = useState(0);

    // 重开边沿重置（同 MultiSelectModal）：hide() 不卸载组件，取消/关闭后残留的勾选与搜索词
    // 会污染下次打开的初始态——「取消」语义失效，误按确定会把实验态保存为正式按钮集
    const lastVisibleRef = useRef(false);
    if (modal.visible && !lastVisibleRef.current) {
        setSelected(new Set(current.map((b) => b.key)));
        setSearchText('');
    }
    lastVisibleRef.current = modal.visible;

    useEffect(() => {
        if (!modal.visible || !alias) return;
        let isMounted = true;
        (async () => {
            setIsLoading(true);
            try {
                // 打开即校验：本地已存但后端已消失的功能在这里被自然排除
                const detail = await getAccount(alias);
                const areas = detail?.area || [];
                // 限并发拉取：最多 3 路在途（服务器部署也扛得住），比纯串行快数倍；结果按 areas 原序归位
                const FETCH_CONCURRENCY = 3;
                const results: Awaited<ReturnType<typeof getAccountConfig>>[] = new Array(areas.length);
                let cursor = 0;
                const worker = async () => {
                    while (cursor < areas.length) {
                        const i = cursor++;
                        const area = areas[i];
                        const cached = getCachedAreaConfig(alias, area.key);
                        const res = cached ?? (await getAccountConfig(alias, area.key));
                        if (!cached) setCachedAreaConfig(alias, area.key, res);
                        results[i] = res;
                    }
                };
                await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, areas.length) }, worker));
                const built: PickerGroup[] = areas.map((area, i) => {
                    const res = results[i];
                    const mods = (res?.order || [])
                        .map((k) => res.info?.[k])
                        .filter((m): m is ModuleInfo => !!m && m.implemented && m.runnable)
                        .map((m) => ({ key: m.key, name: m.name, dangerous: area.name === DANGEROUS_AREA_NAME }));
                    return { areaKey: area.key, areaName: area.name, modules: mods };
                });
                if (isMounted) setGroups(built);
                if (isMounted) setFetchFailed(false);
            } catch (err) {
                // 拉取失败必须清空列表：modal 关闭不卸载，留着旧数据会渲染陈旧功能并可确认写回（后端已下线的功能混进快捷栏）
                if (isMounted) {
                    setGroups([]);
                    setFetchFailed(true);
                    toaster.create({ type: 'error', title: '获取功能列表失败', description: '请检查网络后重试' });
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        })();
        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modal.visible, alias, reloadTick]);

    const q = searchText.trim().toLowerCase();
    const filtered = useMemo(
        () =>
            groups
                .map((g) => ({
                    ...g,
                    modules: q
                        ? g.modules.filter(
                              (m) => m.name.toLowerCase().includes(q) || m.key.toLowerCase().includes(q),
                          )
                        : g.modules,
                }))
                .filter((g) => g.modules.length > 0),
        [groups, q],
    );

    const toggle = (key: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleGroup = (group: PickerGroup) => {
        const keys = group.modules.map((m) => m.key);
        const allIn = keys.every((k) => selected.has(k));
        setSelected((prev) => {
            const next = new Set(prev);
            keys.forEach((k) => (allIn ? next.delete(k) : next.add(k)));
            return next;
        });
    };

    const handleConfirm = () => {
        if (fetchFailed) return; // 拉取失败不允许确认；合法空列表可以（确认=清空全部按钮）
        // 顺序=列表顺序（日常在前）；同 key 跨区服只保留首个，避免重复按钮
        const items: QuickActionItem[] = [];
        const seen = new Set<string>();
        groups.forEach((g) =>
            g.modules.forEach((m) => {
                if (selected.has(m.key) && !seen.has(m.key)) {
                    seen.add(m.key);
                    items.push({ key: m.key, name: m.name, areaKey: g.areaKey, areaName: g.areaName, dangerous: m.dangerous });
                }
            }),
        );
        // 后端已下线的功能：勾了也带不回来，单独提示（名字从旧按钮缓存取；用户主动取消勾选不在此列，不提示）
        const vanished = [...selected].filter((k) => !seen.has(k));
        if (vanished.length > 0) {
            const knownNames = current.filter((b) => vanished.includes(b.key)).map((b) => b.name);
            const unknown = vanished.length - knownNames.length;
            const head = knownNames.join('、');
            const tail = unknown > 0 ? ` 等 ${vanished.length} 个功能` : '';
            toaster.create({ type: 'warning', title: '部分功能已失效', description: `${head}${tail} 在后端已不存在，未能添加` });
            // 剪掉幽灵键：它们不在任何分组里、无法被取消勾选，不剪会每次确认都重复弹「无名」警告
            setSelected(new Set(seen));
        }
        modal.resolve(items);
        void modal.hide();
    };

    const handleClose = () => {
        modal.resolve(undefined);
        void modal.hide();
    };

    return (
        <Modal isOpen={modal.visible} onClose={handleClose} size="lg" closeOnOverlayClick={false}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>增加功能</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Input
                        placeholder="搜索功能名"
                        mb={3}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        autoFocus
                    />
                    <Box maxH="55vh" overflowY="auto" p={2} borderRadius="md" borderWidth="1px" borderColor="border" bg="bg.panel">
                        {isLoading && (
                            <Flex direction="column" gap={3} p={2}>
                                <Skeleton height="20px" width="60%" />
                                <Skeleton height="20px" width="80%" />
                                <Skeleton height="20px" width="70%" />
                            </Flex>
                        )}
                        {!isLoading &&
                            filtered.map((g) => {
                                const keys = g.modules.map((m) => m.key);
                                const inCount = keys.filter((k) => selected.has(k)).length;
                                return (
                                    <Box key={g.areaKey} mb={4}>
                                        <Flex align="center" justify="space-between" mb={1} px={1}>
                                            <Text fontSize="sm" fontWeight="bold" color={g.areaName === DANGEROUS_AREA_NAME ? 'red.fg' : 'fg.muted'}>
                                                {g.areaName}
                                            </Text>
                                            <Checkbox
                                                size="sm"
                                                colorPalette="blue"
                                                checked={inCount === keys.length && keys.length > 0 ? true : inCount > 0 ? 'indeterminate' : false}
                                                onCheckedChange={() => toggleGroup(g)}
                                            >
                                                全选
                                            </Checkbox>
                                        </Flex>
                                        <Flex wrap="wrap" gap={2} px={1}>
                                            {g.modules.map((m) => (
                                                <Checkbox
                                                    key={m.key}
                                                    size="sm"
                                                    colorPalette={m.dangerous ? 'red' : 'blue'}
                                                    checked={selected.has(m.key)}
                                                    onCheckedChange={() => toggle(m.key)}
                                                >
                                                    {m.name}
                                                </Checkbox>
                                            ))}
                                        </Flex>
                                    </Box>
                                );
                            })}
                        {!isLoading && fetchFailed && (
                            // 失败态专属文案 + 重试：与「合法空列表」（可确认清空）在行为层和视觉层都分流，
                            // 否则想清空按钮的用户会误以为功能已全下线（审计十 #8）
                            <Flex direction="column" alignItems="center" gap={3} py={6}>
                                <Text color="fg.muted" fontSize="sm">功能列表获取失败，请检查网络后重试</Text>
                                <Button size="sm" variant="outline" onClick={() => setReloadTick((t) => t + 1)}>重试</Button>
                            </Flex>
                        )}
                        {!isLoading && !fetchFailed && filtered.length === 0 && (
                            <Text color="fg.muted" fontSize="sm" py={4} textAlign="center">
                                无匹配功能
                            </Text>
                        )}
                    </Box>
                    <Text mt={2} fontSize="xs" color="fg.muted">
                        勾选后点确定，按钮会出现在主页工具栏中间；取消勾选即移除。
                    </Text>
                </ModalBody>
                <ModalFooter>
                    <Button colorPalette="blue" mr={3} onClick={handleConfirm} loading={isLoading} disabled={fetchFailed}>
                        确定
                    </Button>
                    <Button variant="ghost" onClick={handleClose}>
                        取消
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
});

export default QuickActionPicker;
