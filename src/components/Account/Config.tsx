import {
    Box,
    Button,
    Checkbox as ChakraCheckbox,
    Flex,
    Input,
    NativeSelect,
    Stack,
    Text,
    Textarea,
} from '@chakra-ui/react';
import { AxiosError } from 'axios';
import NiceModal from '@ebay/nice-modal-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { putAccountConfig } from '@/api/Account';
import { ConfigInfo, ConfigValue } from '@/interfaces/Module';
import { Checkbox } from '../../components/ui/checkbox';
import { InputGroup } from '../../components/ui/input-group';
import { NumberInput, NumberInputField } from '../../components/ui/number-input';
import { Switch } from '../../components/ui/switch';
import { toaster } from '../../components/ui/toaster';
import multiSelectModal from './MultiSelectModal';
import singleSelectModal from './SingleSelectModal';

interface ConfigProps {
    alias: string;
    value: ConfigValue;
    info: ConfigInfo;
    /** 回写父级 Area；折叠卸载后再展开必须靠它 */
    onConfigUpdate?: (key: string, value: ConfigValue) => void;
}

const configSaveChains = new Map<string, Promise<unknown>>();

export function enqueueConfigSave<T>(alias: string, task: () => Promise<T>): Promise<T> {
    const prev = configSaveChains.get(alias) || Promise.resolve();
    const next = prev.catch(() => undefined).then(task);
    configSaveChains.set(
        alias,
        next.then(
            () => undefined,
            () => undefined,
        ),
    );
    return next;
}

/** 安全解析后端错误文案，避免 Blob/.text 抛错或 [object Object] */
export async function getErrorDescription(err: unknown, fallback = '网络错误'): Promise<string> {
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    try {
        if (data == null) {
            if (err instanceof Error && err.message) return err.message;
            return fallback;
        }
        if (typeof Blob !== 'undefined' && data instanceof Blob) {
            const t = await data.text();
            return t || fallback;
        }
        if (typeof data === 'string') return data || fallback;
        if (typeof data === 'object') {
            try {
                return JSON.stringify(data);
            } catch {
                return fallback;
            }
        }
        return String(data);
    } catch {
        return fallback;
    }
}

const ROW_H = '2.25rem';
const SINGLE_SEARCH_THRESHOLD = 30;

function useConfigState<T>(
    alias: string,
    key: string,
    propValue: T,
    onConfigUpdate?: (key: string, value: ConfigValue) => void,
    transform?: (val: T) => ConfigValue,
) {
    const [state, setState] = useState<T>(propValue);
    const mountedRef = useRef(true);
    const propRef = useRef(propValue);
    propRef.current = propValue;
    const onUpdateRef = useRef(onConfigUpdate);
    onUpdateRef.current = onConfigUpdate;

    useEffect(() => {
        setState(propValue);
    }, [propValue]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const save = async (newValue: T): Promise<void> => {
        setState(newValue);
        const payload = transform ? transform(newValue) : (newValue as ConfigValue);
        // 先写父级缓存，折叠/切 Tab 再展开仍是新值
        onUpdateRef.current?.(key, payload);
        try {
            const res = await enqueueConfigSave(alias, () => putAccountConfig(alias, key, payload));
            if (mountedRef.current) {
                toaster.create({ type: 'success', title: '保存成功', description: res });
            }
        } catch (err) {
            const rollback = propRef.current;
            onUpdateRef.current?.(key, rollback as ConfigValue);
            if (mountedRef.current) {
                setState(rollback);
                toaster.create({
                    type: 'error',
                    title: '保存失败',
                    description: await getErrorDescription(err),
                });
            }
        }
    };

    return [state, setState, save] as const;
}


function ConfigBool({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [checked, , save] = useConfigState(alias, info.key, value as boolean, onConfigUpdate);

    return (
        <InputGroup
            w="full"
            minH={ROW_H}
            alignItems="center"
            startElement={info.desc}
            endElement={
                <Switch
                    id={info.key}
                    size="md"
                    checked={checked}
                    onCheckedChange={(d) => save(!!d.checked)}
                />
            }
        />
    );
}

function ConfigInt({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const candNums = (info.candidates || []).map((c) => c.value).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const min = candNums.length ? Math.min(...candNums) : 0;
    const max = candNums.length ? Math.max(...candNums) : Number.MAX_SAFE_INTEGER;

    const [numStr, setNumStr] = useState(String(value));
    const mountedRef = useRef(true);
    const valueRef = useRef(value);
    valueRef.current = value;
    const onUpdateRef = useRef(onConfigUpdate);
    onUpdateRef.current = onConfigUpdate;

    useEffect(() => {
        setNumStr(String(value));
    }, [value]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleBlur = () => {
        let finalValue: number;
        if (numStr === '' || isNaN(Number(numStr))) {
            finalValue = min;
        } else {
            finalValue = Number(numStr);
        }
        if (finalValue < min) finalValue = min;
        if (finalValue > max) finalValue = max;
        setNumStr(String(finalValue));
        onUpdateRef.current?.(info.key, finalValue as ConfigValue);

        enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, finalValue as ConfigValue))
            .then((res) => {
                if (mountedRef.current) {
                    toaster.create({ type: 'success', title: '保存成功', description: res });
                }
            })
            .catch(async (err: AxiosError) => {
                const rollback = valueRef.current;
                onUpdateRef.current?.(info.key, rollback as ConfigValue);
                if (mountedRef.current) {
                    setNumStr(String(rollback));
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: await getErrorDescription(err),
                    });
                }
            });
    };

    return (
        <InputGroup w="full" minH={ROW_H} alignItems="center" startElement={info.desc}>
            <Box
                w="18%"
                h={ROW_H}
                maxH={ROW_H}
                display="flex"
                alignItems="center"
                css={{
                    '& [data-part="root"]': {
                        height: ROW_H,
                        maxHeight: ROW_H,
                        width: '100%',
                    },
                    '& [data-part="input"]': {
                        height: ROW_H,
                        minHeight: ROW_H,
                        maxHeight: ROW_H,
                        py: 0,
                    },
                    '& [data-part="control"]': {
                        height: ROW_H,
                        maxHeight: ROW_H,
                        display: 'flex',
                        flexDirection: 'column',
                    },
                    '& [data-part="increment-trigger"], & [data-part="decrement-trigger"]': {
                        height: '1.125rem',
                        minHeight: '1.125rem',
                        maxHeight: '1.125rem',
                        flex: 1,
                    },
                }}
            >
                <NumberInput
                    value={numStr}
                    onValueChange={(e) => setNumStr(e.value)}
                    id={info.key}
                    min={min}
                    max={max}
                    size="sm"
                    w="full"
                    h={ROW_H}
                    maxH={ROW_H}
                >
                    <NumberInputField h={ROW_H} minH={ROW_H} maxH={ROW_H} py={0} onBlur={handleBlur} />
                </NumberInput>
            </Box>
        </InputGroup>
    );
}


function ConfigSingleSearch({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [localValue, setLocalValue] = useState<ConfigValue>(value);
    const mountedRef = useRef(true);
    const onUpdateRef = useRef(onConfigUpdate);
    onUpdateRef.current = onConfigUpdate;

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const displayText = (() => {
        const unit = info.candidates.find((u) => u.value === localValue);
        if (!unit) {
            return localValue === undefined || localValue === null || localValue === ''
                ? ''
                : String(localValue);
        }
        return unit.nickname ? unit.nickname : unit.display;
    })();

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const previousValue = localValue;
        try {
            const ret = (await NiceModal.show(singleSelectModal, {
                candidates: info.candidates,
                value: localValue,
            })) as ConfigValue | undefined;
            if (ret === undefined) return;

            // 乐观更新显示，失败再回滚
            setLocalValue(ret);
            onUpdateRef.current?.(info.key, ret);
            const res = await enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, ret));
            if (mountedRef.current) {
                toaster.create({ type: 'success', title: '保存成功', description: res });
            }
        } catch (err) {
            onUpdateRef.current?.(info.key, previousValue);
            try { await NiceModal.hide(singleSelectModal); } catch { /* ignore */ }
            if (mountedRef.current) {
                setLocalValue(previousValue);
                toaster.create({
                    type: 'error',
                    title: '保存失败',
                    description: await getErrorDescription(err),
                });
            }
        }
    };

    return (
        <InputGroup
            w="1/3"
            minH={ROW_H}
            alignItems="center"
            startElement={info.desc}
            endElement={
                <Button size="sm" h={ROW_H} onClick={handleClick}>
                    选择
                </Button>
            }
        >
            <Input h={ROW_H} value={displayText} readOnly onClick={handleClick} cursor="pointer" />
        </InputGroup>
    );
}

function ConfigSingleSelect({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [selectValue, , save] = useConfigState(alias, info.key, value as string | number, onConfigUpdate);

    return (
        <InputGroup w="1/4" minH={ROW_H} alignItems="center" startElement={info.desc}>
            <NativeSelect.Root size="sm" w="full" flex="1">
                <NativeSelect.Field
                    h={ROW_H}
                    id={info.key}
                    value={selectValue}
                    onChange={(e) => {
                        let newValue: ConfigValue = e.target.value;
                        const intVal = Number(newValue);
                        if (!isNaN(intVal)) newValue = intVal;
                        void save(newValue);
                    }}
                >
                    {info.candidates.map((element) => (
                        <option
                            key={element.value as string | number}
                            value={element.value as string | number}
                        >
                            {element.display}
                        </option>
                    ))}
                </NativeSelect.Field>
            </NativeSelect.Root>
        </InputGroup>
    );
}

/** 路由组件：条件分支里不调用 Hook，避免违反 Rules of Hooks */
function ConfigSingle(props: ConfigProps) {
    if ((props.info.candidates?.length || 0) >= SINGLE_SEARCH_THRESHOLD) {
        return <ConfigSingleSearch {...props} />;
    }
    return <ConfigSingleSelect {...props} />;
}


function ConfigMulti({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const initialStrArr = useMemo(
        () => (value as (string | number)[]).map(String),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(value)],
    );

    const [groupValue, setGroupValue] = useState(initialStrArr);
    const mountedRef = useRef(true);
    const onUpdateRef = useRef(onConfigUpdate);
    onUpdateRef.current = onConfigUpdate;
    const initialRef = useRef(initialStrArr);
    initialRef.current = initialStrArr;

    useEffect(() => {
        setGroupValue(initialStrArr);
    }, [initialStrArr]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleSave = (newStrArr: string[]) => {
        let postValue: ConfigValue = newStrArr;
        const intArr = newStrArr.map(Number);
        if (intArr.length > 0 && intArr.every((n) => !isNaN(n))) postValue = intArr;

        setGroupValue(newStrArr);
        onUpdateRef.current?.(info.key, postValue);
        enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, postValue))
            .then((res) => {
                if (mountedRef.current) {
                    toaster.create({ type: 'success', title: '保存成功', description: res });
                }
            })
            .catch(async (err: AxiosError) => {
                const rollback = initialRef.current;
                let rollbackPayload: ConfigValue = rollback;
                const ints = rollback.map(Number);
                if (ints.length > 0 && ints.every((n) => !isNaN(n))) rollbackPayload = ints;
                onUpdateRef.current?.(info.key, rollbackPayload);
                if (mountedRef.current) {
                    setGroupValue(rollback);
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: await getErrorDescription(err),
                    });
                }
            });
    };

    return (
        <InputGroup w="full" minH={ROW_H} alignItems="center" startElement={info.desc}>
            <ChakraCheckbox.Group
                value={groupValue}
                w="full"
                px={2}
                onValueChange={(param: string[] | { value: string[] }) => {
                    const newValue = Array.isArray(param) ? param : param.value;
                    handleSave(newValue);
                }}
            >
                <Flex flexWrap="wrap" gap={3} align="center" w="full" py={1}>
                    {info.candidates.map((element) => (
                        <Checkbox
                            key={element.value as string | number}
                            value={String(element.value)}
                        >
                            {element.display}
                        </Checkbox>
                    ))}
                </Flex>
            </ChakraCheckbox.Group>
        </InputGroup>
    );
}


function ConfigTime({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [timeStr, setTimeStr] = useState(value as string);
    const mountedRef = useRef(true);
    const valueRef = useRef(value);
    valueRef.current = value;
    const onUpdateRef = useRef(onConfigUpdate);
    onUpdateRef.current = onConfigUpdate;

    useEffect(() => {
        setTimeStr(value as string);
    }, [value]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onUpdateRef.current?.(info.key, newValue as ConfigValue);
        enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, newValue as ConfigValue))
            .then((res) => {
                if (mountedRef.current) {
                    toaster.create({ type: 'success', title: '保存成功', description: res });
                }
            })
            .catch(async (err: AxiosError) => {
                const rollback = valueRef.current as string;
                onUpdateRef.current?.(info.key, rollback as ConfigValue);
                if (mountedRef.current) {
                    setTimeStr(rollback);
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: await getErrorDescription(err),
                    });
                }
            });
    };

    return (
        <InputGroup w="min" minH={ROW_H} alignItems="center" startElement={info.desc}>
            <Input
                type="time"
                h={ROW_H}
                size="sm"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                onBlur={handleBlur}
                id={info.key}
            />
        </InputGroup>
    );
}


function ConfigText({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [textStr, setTextStr] = useState(value as string);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mountedRef = useRef(true);
    const valueRef = useRef(value);
    valueRef.current = value;
    const onUpdateRef = useRef(onConfigUpdate);
    onUpdateRef.current = onConfigUpdate;

    useEffect(() => {
        setTextStr(value as string);
    }, [value]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [textStr]);

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onUpdateRef.current?.(info.key, newValue as ConfigValue);
        enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, newValue as ConfigValue))
            .then((res) => {
                if (mountedRef.current) {
                    toaster.create({ type: 'success', title: '保存成功', description: res });
                }
            })
            .catch(async (err: AxiosError) => {
                const rollback = valueRef.current as string;
                onUpdateRef.current?.(info.key, rollback as ConfigValue);
                if (mountedRef.current) {
                    setTextStr(rollback);
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: await getErrorDescription(err),
                    });
                }
            });
    };

    return (
        <Stack gap={1} w="full">
            <Text fontSize="sm" color="fg.muted">
                {info.desc}
            </Text>
            <Textarea
                ref={textareaRef}
                value={textStr}
                onChange={(e) => setTextStr(e.target.value)}
                onBlur={handleBlur}
                id={info.key}
                minH={ROW_H}
            />
        </Stack>
    );
}


function ConfigMultiSearch({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [localValue, setLocalValue] = useState<ConfigValue>(value);
    const mountedRef = useRef(true);
    const onUpdateRef = useRef(onConfigUpdate);
    onUpdateRef.current = onConfigUpdate;

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const displayValue = ((localValue || []) as number[]).map((id) => {
        const unit = info.candidates.find((u) => u.value === id);
        return unit ? (unit.nickname ? unit.nickname : unit.display) : String(id);
    });

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const previousValue = localValue;
        try {
            const ret = (await NiceModal.show(multiSelectModal, {
                candidates: info.candidates,
                value: localValue as ConfigValue[],
            })) as ConfigValue;
            if (ret === undefined) return;

            // show 关闭后已 resolve，成功路径不要再 hide，否则可能进 catch 误回滚
            setLocalValue(ret);
            onUpdateRef.current?.(info.key, ret);
            const res = await enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, ret));
            if (mountedRef.current) {
                toaster.create({ type: 'success', title: '保存成功', description: res });
            }
        } catch (err) {
            onUpdateRef.current?.(info.key, previousValue);
            try { await NiceModal.hide(multiSelectModal); } catch { /* ignore */ }
            if (mountedRef.current) {
                setLocalValue(previousValue);
                toaster.create({
                    type: 'error',
                    title: '保存失败',
                    description: await getErrorDescription(err),
                });
            }
        }
    };

    return (
        <InputGroup
            w="1/3"
            minH={ROW_H}
            alignItems="center"
            startElement={info.desc}
            endElement={
                <Button size="sm" h={ROW_H} onClick={handleClick}>
                    选择
                </Button>
            }
        >
            <Input
                h={ROW_H}
                value={displayValue.join(', ')}
                readOnly
                onClick={handleClick}
                cursor="pointer"
            />
        </InputGroup>
    );
}

export default function Config({ alias, value, info, onConfigUpdate }: ConfigProps) {
    switch (info?.config_type) {
        case 'bool':
            return <ConfigBool alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'int':
            return <ConfigInt alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'single':
            return <ConfigSingle alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'multi':
            return <ConfigMulti alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'time':
            return <ConfigTime alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'text':
            return <ConfigText alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'multi_search':
            return <ConfigMultiSearch alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        default:
            return null;
    }
}
