import {
    Dialog as AlertDialog,
    Button,
    Heading,
    Stack,
    Textarea,
    useDisclosure,
} from "@chakra-ui/react";
import {Candidate, ConfigType, ConfigValue, ModuleResponse} from "@interfaces/Module.ts";
import {ChangeEvent, useRef, useState} from "react";
import {getAccountConfig, putAccountConfigs} from "@api/Account.ts";

import {AreaInfo} from "@interfaces/Account.ts";
import {AxiosError} from "axios";
import {saveAs} from "file-saver";
import { toaster } from "../../components/ui/toaster";

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
        ).catch((err: AxiosError) => {
            toaster.create({ type: 'error', title: '配置导出失败', description: err.response?.data as string || "网络错误" });
        }).then((configs) => {
            if (!configs) {
                return;
            }
            
            // 从 localStorage 读取收藏状态，合并到导出文件
            const favKey = `autopcr_fav_${alias}`;
            const storedFav = localStorage.getItem(favKey);
            const favMap = storedFav ? JSON.parse(storedFav) as Record<string, string[]> : {};
            
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
            saveAs(blob, `autopcr_${alias}.autopcrcfg`);
            toaster.create({ type: "success", title: "配置导出成功", description: "配置文件下载可能会有延迟，请稍后..." });
        }).catch((err: Error) => {
            toaster.create({ type: 'error', title: '配置保存失败', description: err.message });
        }).finally(() => {
            onClose();
        });
    };

    const toCheckedConfigItem = (type: ConfigType, candidates: Candidate[], value: unknown): ConfigValue | undefined => {
        switch (type) {
            case 'bool':
            case 'single':
                if (typeof value === "string" || typeof value === "number" || typeof value === "bool") return value;
                break
            case 'int':
                if (typeof value === "number") return value;
                break
            case 'text':
                if (typeof value === "string") return value;
                break
            case 'time':
                if (typeof value === "string" && value.match(/^\d{2}:\d{2}$/) !== null) return value;
                break
            case 'multi':
            case 'multi_search': {
                if (!Array.isArray(value)) {
                    break
                }
                const checkedArray: (string | number)[] = []
                for (const item of value) {
                    if (typeof item !== "number" && typeof item !== "string") {
                        continue
                    }
                    if (candidates.find((value) => item === value.value)) {
                        checkedArray.push(item)
                    }
                }
                return checkedArray
            }
        }
        return undefined
    }
    
    const realImportByModule = (module: ModuleResponse, configs: Record<string, ConfigValue>): Record<string, ConfigValue> => {
        const uploadConfig: Record<string, ConfigValue> = {};
        for (const moduleKey in module.info) {
            if (configs[moduleKey] !== undefined && typeof configs[moduleKey] === "boolean") {
                uploadConfig[moduleKey] = configs[moduleKey]
            }
            const moduleConf = module.info[moduleKey].config
            for (const moduleConfKey in moduleConf) {
                const moduleItem = moduleConf[moduleConfKey]
                const confItem = toCheckedConfigItem(moduleItem.config_type, moduleItem.candidates, configs[moduleConfKey])
                if (confItem !== undefined) {
                    uploadConfig[moduleConfKey] = confItem
                }
            }
        }
        return uploadConfig;
    }
    
    const realImport = async (rawCfg: string) => {
        try {
            // 优化 1：解析输入，增加对损坏文件或非法格式的捕获
            let configs: Record<string, Record<string, ConfigValue>>;
            try {
                const cleanStr = rawCfg.trim();
                configs = JSON.parse(decodeURIComponent(atob(cleanStr))) as Record<string, Record<string, ConfigValue>>;
            } catch {
                throw new Error("配置文件格式无效，请检查选取的配置文件或输入的文本内容。");
            }

            const configItems = await Promise.all(
                areas.map((area) => getAccountConfig(alias, area.key))
            );
            const uploadConfig: Record<string, ConfigValue> = {};
            const importedFav: Record<string, string[]> = {};

            configItems.forEach((value, index) => {
                const areaKey = areas[index].key;
                const areaConfig = configs[areaKey];
                if (!areaConfig) {
                    return;
                }
                
                // 1. Schema 校验的基础配置
                const validatedAreaConfig = realImportByModule(value, areaConfig);
                Object.assign(uploadConfig, validatedAreaConfig);
                
                // 2. 补全收藏标记与补充细节配置
                for (const key in areaConfig) {
                    if (key.startsWith('_fav_')) {
                        importedFav[areaKey] = importedFav[areaKey] || [];
                        if (areaConfig[key] === true) {
                            importedFav[areaKey].push(key.slice(5));
                        }
                    } else if (uploadConfig[key] === undefined && areaConfig[key] !== undefined) {
                        uploadConfig[key] = areaConfig[key];
                    }
                }
            });

            // 保存收藏状态到 localStorage
            localStorage.setItem(`autopcr_fav_${alias}`, JSON.stringify(importedFav));
            
            await putAccountConfigs(alias, uploadConfig);
            toaster.create({ type: 'success', title: '配置导入成功' });
            
            // 优化 2：无缝通知父级重新拉取数据刷新页面
            onImportSuccess?.();
        } catch (err) {
            if (err instanceof AxiosError) {
                toaster.create({ type: 'error', title: '配置导入失败', description: err.response?.data as string || "网络错误" });
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
        onOpen()
        void file.text()
            .then(realImport);
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
            {alias != 'BATCH_RUNNER' &&
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
