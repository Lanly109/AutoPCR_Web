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

const ROW_H = '2.25rem';
const SINGLE_SEARCH_THRESHOLD = 30;

function useConfigState<T>(
    alias: string,
    key: string,
    propValue: T,
    transform?: (val: T) => ConfigValue,
) {
    const [state, setState] = useState<T>(propValue);
    const mountedRef = useRef(true);

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
        try {
            const res = await enqueueConfigSave(alias, () => putAccountConfig(alias, key, payload));
            if (mountedRef.current) {
                toaster.create({ type: 'success', title: '保存成功', description: res });
            }
        } catch (err) {
            const axiosErr = err as AxiosError;
            if (mountedRef.current) {
                setState(propValue);
                toaster.create({
                    type: 'error',
                    title: '保存失败',
                    description: (axiosErr.response?.data as string) || '网络错误',
                });
            }
        }
    };

    return [state, setState, save] as const;
}

function ConfigBool({ alias, value, info }: ConfigProps) {
    const [checked, , save] = useConfigState(alias, info.key, value as boolean);

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

function ConfigInt({ alias, value, info }: ConfigProps) {
    const min = Math.min(...(info.candidates.map((c) => c.value) as number[]));
    const max = Math.max(...(info.candidates.map((c) => c.value) as number[]));

    const [numStr, setNumStr] = useState(String(value));
    const mountedRef = useRef(true);

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

        enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, finalValue as ConfigValue))
            .then((res) => {
                if (mountedRef.current) {
                    toaster.create({ type: 'success', title: '保存成功', description: res });
                }
            })
            .catch((err: AxiosError) => {
                if (mountedRef.current) {
                    setNumStr(String(value));
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: (err.response?.data as string) || '网络错误',
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

function ConfigSingleSearch({ alias, value, info }: ConfigProps) {
    const [localValue, setLocalValue] = useState<ConfigValue>(value);
    const mountedRef = useRef(true);

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

            const res = await enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, ret));
            if (mountedRef.current) {
                setLocalValue(ret);
                toaster.create({ type: 'success', title: '保存成功', description: res });
            }
        } catch (err) {
            const axiosErr = err as AxiosError;
            if (mountedRef.current) {
                setLocalValue(previousValue);
                toaster.create({
                    type: 'error',
                    title: '保存失败',
                    description: (axiosErr.response?.data as string) || '网络错误',
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

function ConfigSingle({ alias, value, info }: ConfigProps) {
    if ((info.candidates?.length || 0) >= SINGLE_SEARCH_THRESHOLD) {
        return <ConfigSingleSearch alias={alias} value={value} info={info} />;
    }

    const [selectValue, , save] = useConfigState(alias, info.key, value as string | number);

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

function ConfigMulti({ alias, value, info }: ConfigProps) {
    const initialStrArr = useMemo(
        () => (value as (string | number)[]).map(String),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(value)],
    );

    const [groupValue, setGroupValue] = useState(initialStrArr);
    const mountedRef = useRef(true);

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
        if (intArr.length > 0 && !isNaN(intArr[0])) postValue = intArr;

        setGroupValue(newStrArr);
        enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, postValue))
            .then((res) => {
                if (mountedRef.current) {
                    toaster.create({ type: 'success', title: '保存成功', description: res });
                }
            })
            .catch((err: AxiosError) => {
                if (mountedRef.current) {
                    setGroupValue(initialStrArr);
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: (err.response?.data as string) || '网络错误',
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

function ConfigTime({ alias, value, info }: ConfigProps) {
    const [timeStr, setTimeStr] = useState(value as string);
    const mountedRef = useRef(true);

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
        enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, newValue as ConfigValue))
            .then((res) => {
                if (mountedRef.current) {
                    toaster.create({ type: 'success', title: '保存成功', description: res });
                }
            })
            .catch((err: AxiosError) => {
                if (mountedRef.current) {
                    setTimeStr(value as string);
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: (err.response?.data as string) || '网络错误',
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

function ConfigText({ alias, value, info }: ConfigProps) {
    const [textStr, setTextStr] = useState(value as string);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mountedRef = useRef(true);

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
        enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, newValue as ConfigValue))
            .then((res) => {
                if (mountedRef.current) {
                    toaster.create({ type: 'success', title: '保存成功', description: res });
                }
            })
            .catch((err: AxiosError) => {
                if (mountedRef.current) {
                    setTextStr(value as string);
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: (err.response?.data as string) || '网络错误',
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

function ConfigMultiSearch({ alias, value, info }: ConfigProps) {
    const [localValue, setLocalValue] = useState<ConfigValue>(value);
    const mountedRef = useRef(true);

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

            const res = await enqueueConfigSave(alias, () => putAccountConfig(alias, info.key, ret));
            if (mountedRef.current) {
                setLocalValue(ret);
                toaster.create({ type: 'success', title: '保存成功', description: res });
            }
            await NiceModal.hide(multiSelectModal);
        } catch (err) {
            const axiosErr = err as AxiosError;
            if (mountedRef.current) {
                setLocalValue(previousValue);
                toaster.create({
                    type: 'error',
                    title: '保存失败',
                    description: (axiosErr.response?.data as string) || '网络错误',
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

export default function Config({ alias, value, info }: ConfigProps) {
    switch (info?.config_type) {
        case 'bool':
            return <ConfigBool alias={alias} value={value} info={info} />;
        case 'int':
            return <ConfigInt alias={alias} value={value} info={info} />;
        case 'single':
            return <ConfigSingle alias={alias} value={value} info={info} />;
        case 'multi':
            return <ConfigMulti alias={alias} value={value} info={info} />;
        case 'time':
            return <ConfigTime alias={alias} value={value} info={info} />;
        case 'text':
            return <ConfigText alias={alias} value={value} info={info} />;
        case 'multi_search':
            return <ConfigMultiSearch alias={alias} value={value} info={info} />;
        default:
            return null;
    }
}
