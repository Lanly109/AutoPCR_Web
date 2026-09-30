import {
    Dialog as AlertDialog,
    Button,
    Heading,
    Stack,
    Textarea,
    useDisclosure,
} from "@chakra-ui/react";
import {ConfigValue} from "@interfaces/Module.ts";
import {ChangeEvent, useRef, useState} from "react";
import {getAccountConfig} from "@api/Account.ts";

import {AreaInfo} from "@interfaces/Account.ts";
import {AxiosError} from "axios";
import { favKey, importConfigFile, safeGetItem, BATCH_RUNNER } from "./accountShared";
import {saveAs} from "file-saver";
import { toaster } from "@components/ui/toaster";
import { getErrorDescription } from "./Config";

interface ConfigIOProps {
    alias: string;
    areas: AreaInfo[];
    onImportSuccess?: () => void;
}

const ConfigImportExport = ({ alias, areas, onImportSuccess }: ConfigIOProps) => {

    const { open, onOpen, onClose } = useDisclosure();

    const onExport = () => {
        onOpen()
        void Promise.all(
            areas.map((area) => getAccountConfig(alias, area.key))
        ).catch(async (err: AxiosError) => {
            toaster.create({ type: 'error', title: '配置导出失败', description: await getErrorDescription(err) });
        }).then((configs) => {
            if (!configs) {
                return;
            }
            
            // 从 localStorage 读取收藏状态，合并到导出文件（safe 读取：隐私模式/损坏 JSON 都兜成空表，导出流程不炸）
            const storedFav = safeGetItem(favKey(alias));
            let favMap: Record<string, string[]> = {};
            try {
                favMap = storedFav ? (JSON.parse(storedFav) as Record<string, string[]>) : {};
            } catch {
                favMap = {};
            }
            
            const allConfig: Record<string, Record<string, ConfigValue>> = {};
            configs.forEach((value, index) => {
                const areaKey = areas[index].key;
                allConfig[areaKey] = { ...value.config };
                // 补收藏标记
                const areaFavs = favMap[areaKey] || [];
                areaFavs.forEach(moduleKey => {
                    allConfig[areaKey][`_fav_${moduleKey}`] = true;
                });
            });
            
            const strCfg = btoa(encodeURIComponent(JSON.stringify(allConfig)));
            const blob = new Blob([strCfg], { type: 'text/plain;charset=utf-8' });
            const storedName = localStorage.getItem(`autopcr_displayName_${alias}`);
            const rawName = (storedName && storedName.trim()) ? storedName.trim() : alias;
            const safeName = rawName.replace(/[\\/:*?"<>|]/g, '_');
            saveAs(blob, `autopcr_${safeName}.autopcrcfg`);
            toaster.create({ type: "success", title: "配置导出成功", description: "配置文件下载可能会有延迟，请稍后..." });
        }).catch((err: Error) => {
            toaster.create({ type: 'error', title: '配置保存失败', description: err.message });
        }).finally(() => {
            onClose();
        });
    };

    const realImport = async (rawCfg: string) => {
        try {
            // 流程本体在 accountShared.importConfigFile（与卡片版导入共享；收藏失败降级提示）
            await importConfigFile({
                alias,
                rawCfg,
                areas,
                onFavWriteFailed: () => toaster.create({ type: 'warning', title: '配置已导入，但收藏标记保存失败（本地存储不可用）' }),
            });
            toaster.create({ type: 'success', title: '配置导入成功' });
            onImportSuccess?.();
        } catch (err) {
            if (err instanceof AxiosError) {
                toaster.create({ type: 'error', title: '配置导入失败', description: await getErrorDescription(err) });
            } else {
                toaster.create({ type: 'error', title: '配置导入失败', description: (err as Error).message });
            }
        } finally {
            onClose();
        }
    }

    const importFileRef = useRef<HTMLInputElement>(null);
    const onFileImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = (event.target.files && event.target.files.length > 0) ? event.target.files[0] : undefined;
        if (file === undefined) {
            return;
        }
        onOpen();
        file.text()
            .then(realImport)
            .catch(() => {
                // 读取失败必须复位 loading，否则导入相关按钮永久转圈
                toaster.create({ type: 'error', title: '读取文件失败', description: '文件可能被占用或已无权限' });
                onClose();
            });
    }

    const importTextDialogDisclosure = useDisclosure();
    const [textImportVal, setTextImportVal] = useState('');
    const onTextImport = () => {
        importTextDialogDisclosure.onClose();
        void realImport(textImportVal);
    }
    const onTextImportCancel = () => {
        onClose()
        importTextDialogDisclosure.onClose()
        setTextImportVal('')
    }

    const bgColor = "bg.panel";

    return (
        <>
            {alias != BATCH_RUNNER &&
                <Stack gap={4} w={'full'} bg={bgColor} rounded={'xl'} boxShadow={'lg'} p={6} my={12}>
                    <Heading lineHeight={1.1} fontSize={{ base: '2xl', sm: '3xl' }}>配置导入/导出</Heading>
                    <Button colorPalette="brand" w="full" loading={open}
                            type="submit"
                            onClick={onExport}>
                        导出
                    </Button>
                    <Button colorPalette="brand" w="full" loading={open}
                            type="submit"
                            onClick={() => importFileRef.current?.click()}>
                        从文件导入
                        <input ref={importFileRef} type="file" accept=".autopcrcfg"
                               style={{ visibility: 'hidden', position: 'absolute' }}
                               onChange={onFileImport}/>
                    </Button>
                    <Button colorPalette="brand" w="full" loading={open}
                            type="submit"
                            onClick={importTextDialogDisclosure.onOpen}>
                        从文本导入
                    </Button>

                    <AlertDialog.Root open={importTextDialogDisclosure.open}
                                 onOpenChange={(e) => !e.open && onTextImportCancel()}>
                        <AlertDialog.Backdrop />
                        <AlertDialog.Positioner>
                        <AlertDialog.Content>
                            <AlertDialog.Header>
                                从文本导入
                            </AlertDialog.Header>
                            <AlertDialog.Body>
                                <Textarea placeholder={"请输入 .autopcrcfg 文件内容。"}
                                          value={textImportVal}
                                          onChange={(e) => setTextImportVal(e.target.value)} />
                            </AlertDialog.Body>
                            <AlertDialog.Footer>
                                <Button onClick={onTextImportCancel}>
                                    取消
                                </Button>
                                <Button colorPalette={"blue"} onClick={onTextImport} ml={3}>
                                    确定
                                </Button>
                            </AlertDialog.Footer>
                        </AlertDialog.Content>
                        </AlertDialog.Positioner>
                    </AlertDialog.Root>
                </Stack>
            }
        </>
    )
}

export default ConfigImportExport;