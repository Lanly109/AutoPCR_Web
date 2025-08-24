import {
    AlertDialog, AlertDialogBody,
    AlertDialogContent, AlertDialogFooter, AlertDialogHeader,
    Button,
    Heading,
    Stack, Textarea,
    useColorModeValue,
    useDisclosure,
    useToast
} from "@chakra-ui/react";
import {AreaInfo} from "@interfaces/Account.ts";
import {getAccountConfig, putAccountConfigs} from "@api/Account.ts";
import {Candidate, ConfigType, ConfigValue, ModuleResponse} from "@interfaces/Module.ts";
import {saveAs} from "file-saver";
import {AxiosError} from "axios";
import {ChangeEvent, useRef, useState} from "react";
import {FocusableElement} from "@chakra-ui/utils";

interface ConfigIOProps {
    alias: string;
    areas: AreaInfo[];
    onImportSuccess?: () => void; // 添加回调函数属性
}

const ConfigSync = ({ alias, areas, onImportSuccess }: ConfigIOProps) => {
    const toast = useToast();

    const { isOpen, onOpen, onClose } = useDisclosure();

    const onExport = () => {
        onOpen()
        void Promise.all(
            areas.map((area) => getAccountConfig(alias, area.key))
        ).catch((err: AxiosError) => {
            toast({ status: 'error', title: '配置导出失败', description: err.response?.data as string || "网络错误" });
        }).then((configs) => {
            if (!configs) {
                return;
            }
            const allConfig: Record<string, Record<string, ConfigValue>> = {};
            configs.forEach((value, index) => {
                allConfig[areas[index].key] = value.config;
            })
            const strCfg = btoa(encodeURIComponent(JSON.stringify(allConfig)));
            const blob = new Blob([strCfg], { type: 'text/plain;charset=utf-8' });
            saveAs(blob, `autopcr_${alias}.autopcrcfg`);
            toast({ status: "success", title: "配置导出成功", description: "配置文件下载可能会有延迟，请稍后..." });
        }).catch((err: Error) => {
            toast({ status: 'error', title: '配置保存失败', description: err.message });
        }).finally(() => {
            onClose();
        });
    };

    const toCheckedConfigItem = (type: ConfigType, candidates: Candidate[], value: unknown): ConfigValue | undefined => {
        switch (type) {
            case 'bool':
            case 'single':
                if (typeof value === "boolean") return value;
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
            if (configs[moduleKey] && typeof configs[moduleKey] === "boolean") {
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
            const configItems = await Promise.all(
                areas.map((area) => getAccountConfig(alias, area.key))
            );
            const configs = JSON.parse(decodeURIComponent(atob(rawCfg))) as Record<string, Record<string, ConfigValue>>;
            const uploadConfig: Record<string, ConfigValue> = {};

            configItems.forEach((value, index) => {
                const areaKey = areas[index].key;
                if (configs[areaKey] === undefined) {
                    return;
                }
                Object.assign(uploadConfig, realImportByModule(value, configs[areaKey]));
            })

            await putAccountConfigs(alias, uploadConfig);
            toast({ status: 'success', title: '配置导入成功' });
            onImportSuccess?.();
        } catch (err) {
            if (err instanceof AxiosError) {
                toast({ status: 'error', title: '配置导入失败', description: err.response?.data as string || "网络错误" });
            } else {
                toast({ status: 'error', title: '配置导入失败', description: (err as Error).message });
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
    const textImportRef = useRef<FocusableElement>(null);
    const onTextImport = () => {
        importTextDialogDisclosure.onClose();
        void realImport(textImportVal);
    }
    const onTextImportCancel = () => {
        onClose()
        importTextDialogDisclosure.onClose()
        setTextImportVal('')
    }


    const bgColor = useColorModeValue('white', 'gray.700');

    return (
        <>
            {alias != 'BATCH_RUNNER' &&
                <Stack spacing={4} w={'full'} bg={bgColor} rounded={'xl'} boxShadow={'lg'} p={6} my={12}>
                    <Heading lineHeight={1.1} fontSize={{ base: '2xl', sm: '3xl' }}>配置导入/导出</Heading>
                    <Button bg={'blue.400'} color={'white'} w="full" isLoading={isOpen}
                            type="submit" _hover={{bg: 'blue.500'}}
                            onClick={onExport}>
                        导出
                    </Button>
                    <Button bg={'blue.400'} color={'white'} w="full" isLoading={isOpen}
                            type="submit" _hover={{bg: 'blue.500'}}
                            onClick={() => importFileRef.current?.click()}>
                        从文件导入
                        <input ref={importFileRef} type="file" accept=".autopcrcfg"
                               style={{ visibility: 'hidden', position: 'absolute' }}
                               onChange={onFileImport}/>
                    </Button>
                    <Button bg={'blue.400'} color={'white'} w="full" isLoading={isOpen}
                            type="submit" _hover={{bg: 'blue.500'}}
                            onClick={importTextDialogDisclosure.onOpen}>
                        从文本导入
                    </Button>

                    <AlertDialog leastDestructiveRef={textImportRef} isOpen={importTextDialogDisclosure.isOpen}
                                 onClose={onTextImportCancel}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                从文本导入
                            </AlertDialogHeader>
                            <AlertDialogBody>
                                <Textarea placeholder={"请输入 .autopcrcfg 文件内容。"}
                                          value={textImportVal}
                                          onChange={(e) => setTextImportVal(e.target.value)} />
                            </AlertDialogBody>
                            <AlertDialogFooter>
                                <Button onClick={onTextImportCancel}>
                                    取消
                                </Button>
                                <Button colorScheme={"blue"} onClick={onTextImport} ml={3}>
                                    确定
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </Stack>
            }
        </>
    )
}

export default ConfigSync;
