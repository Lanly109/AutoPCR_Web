import { Box, Button, Checkbox as ChakraCheckbox, Input, NativeSelect, Stack, Text, Textarea } from '@chakra-ui/react';
import { AxiosError } from 'axios';
import NiceModal from '@ebay/nice-modal-react';
import type * as React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { putAccountConfig } from '@/api/Account';
import { ConfigInfo, ConfigValue } from '@/interfaces/Module';
import { Checkbox } from '../../components/ui/checkbox';
import { InputGroup } from '../../components/ui/input-group';
import { NumberInput, NumberInputField } from '../../components/ui/number-input';
import { Switch } from '../../components/ui/switch';
import { toaster } from '../../components/ui/toaster';
import multiSelectModal from './MultiSelectModal';

interface ConfigProps {
    alias: string;
    value: ConfigValue;
    info: ConfigInfo;
}

/**
 * 通用受控配置 Hook
 * - 管理本地 state，外部 value 变化时自动同步
 * - 提供 save 方法，带乐观更新 + 失败回滚 + 卸载保护
 */
function useConfigState<T>(
    alias: string,
    key: string,
    propValue: T,
    transform?: (val: T) => ConfigValue
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
            const res = await putAccountConfig(alias, key, payload);
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
                    description: axiosErr.response?.data as string || '网络错误',
                });
            }
        }
    };

    return [state, setState, save] as const;
}

// ---------- ConfigBool ----------
function ConfigBool({ alias, value, info }: ConfigProps) {
    const [checked, , save] = useConfigState(alias, info.key, value as boolean);

    return (
        <InputGroup
            startElement={info.desc}
            endElement={
                <Switch
                    id={info.key}
                    checked={checked}
                    onCheckedChange={(d) => save(d.checked)}
                />
            }
        />
    );
}

// ---------- ConfigInt（改为 onBlur 保存）----------
function ConfigInt({ alias, value, info }: ConfigProps) {
    const min = Math.min(...(info.candidates.map((c) => c.value) as number[]));
    const max = Math.max(...(info.candidates.map((c) => c.value) as number[]));

    // 受控的字符串显示值
    const [numStr, setNumStr] = useState(String(value));
    //const [saving, setSaving] = useState(false); // 可选 loading 态
    const mountedRef = useRef(true);

    // 外部 value 同步
    useEffect(() => {
        setNumStr(String(value));
    }, [value]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // 处理失焦保存
    const handleBlur = () => {
        let finalValue: string | number;

        // 空值或无效值处理为最小值
        if (numStr === '' || isNaN(Number(numStr))) {
            finalValue = min;
            setNumStr(String(min)); // UI 也回显最小值
        } else {
            finalValue = Number(numStr);
        }

        // 边界检查（可选，但保留原有行为）
        if (finalValue < min) finalValue = min;
        if (finalValue > max) finalValue = max;

        // 发送保存
        const payload: ConfigValue = finalValue as ConfigValue;
        putAccountConfig(alias, info.key, payload)
            .then((res) => {
                if (mountedRef.current) {
                    toaster.create({ type: 'success', title: '保存成功', description: res });
                }
            })
            .catch((err: AxiosError) => {
                if (mountedRef.current) {
                    // 失败回滚到外部 value
                    setNumStr(String(value));
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: err.response?.data as string || '网络错误',
                    });
                }
            });
    };

    // 输入过程中仅更新本地状态
    const handleChange = (e: { value: string }) => {
        setNumStr(e.value);
    };

    return (
        <InputGroup startElement={info.desc}>
            <NumberInput
                value={numStr}
                onValueChange={handleChange}
                id={info.key}
                min={min}
                max={max}
            >
                <NumberInputField onBlur={handleBlur} />
            </NumberInput>
        </InputGroup>
    );
}

// ---------- ConfigSingle ----------
function ConfigSingle({ alias, value, info }: ConfigProps) {
    const [selectValue, , save] = useConfigState(alias, info.key, value as string | number);

    return (
        <InputGroup startElement={info.desc}>
            <NativeSelect.Root>
                <NativeSelect.Field
                    onChange={(e) => {
                        let newValue: ConfigValue = e.target.value;
                        const intVal = Number(newValue);
                        if (!isNaN(intVal)) newValue = intVal;
                        save(newValue);
                    }}
                    id={info.key}
                    value={selectValue}
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

// ---------- ConfigMulti ----------
function ConfigMulti({ alias, value, info }: ConfigProps) {
    const initialStrArr = useMemo(
        () => (value as (string | number)[]).map(String),
        [JSON.stringify(value)]
    );

    const [groupValue, setGroupValue] = useState(initialStrArr);
    const mountedRef = useRef(true);

    useEffect(() => {
        setGroupValue(initialStrArr);
    }, [initialStrArr]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const handleSave = (newStrArr: string[]) => {
        let postValue: ConfigValue = newStrArr;
        const intArr = newStrArr.map(Number);
        if (intArr.length > 0 && !isNaN(intArr[0])) postValue = intArr;

        setGroupValue(newStrArr);
        putAccountConfig(alias, info.key, postValue)
            .then((res) => {
                if (mountedRef.current)
                    toaster.create({ type: 'success', title: '保存成功', description: res });
            })
            .catch((err: AxiosError) => {
                if (mountedRef.current) {
                    setGroupValue(initialStrArr);
                    toaster.create({
                        type: 'error',
                        title: '保存失败',
                        description: err.response?.data as string || '网络错误',
                    });
                }
            });
    };

    const onCheckboxChange = (param: string[] | { value: string[] }) => {
        const newValue = Array.isArray(param) ? param : param.value;
        handleSave(newValue);
    };

    return (
        <InputGroup startElement={info.desc}>
            <Box
                paddingLeft="16px"
                paddingRight="32px"
                overflowY="scroll"
                borderWidth="1px"
                borderColor="border.subtle"
                borderRadius="md"
                w="full"
            >
                <ChakraCheckbox.Group onValueChange={onCheckboxChange} value={groupValue}>
                    <Stack gap={[1, 5]} direction={['column', 'row']}>
                        {info.candidates.map((element) => (
                            <Checkbox
                                key={element.value as string | number}
                                value={String(element.value)}
                            >
                                {element.display}
                            </Checkbox>
                        ))}
                    </Stack>
                </ChakraCheckbox.Group>
            </Box>
        </InputGroup>
    );
}

// ---------- ConfigTime ----------
function ConfigTime({ alias, value, info }: ConfigProps) {
    const [timeStr, setTimeStr] = useState(value as string);

    useEffect(() => {
        setTimeStr(value as string);
    }, [value]);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        putAccountConfig(alias, info.key, newValue as ConfigValue)
            .then((res) => {
                toaster.create({ type: 'success', title: '保存成功', description: res });
            })
            .catch((err: AxiosError) => {
                setTimeStr(value as string);
                toaster.create({
                    type: 'error',
                    title: '保存失败',
                    description: err.response?.data as string || '网络错误',
                });
            });
    };

    return (
        <InputGroup startElement={info.desc}>
            <Input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                onBlur={handleBlur}
                id={info.key}
            />
        </InputGroup>
    );
}

// ---------- ConfigText ----------
function ConfigText({ alias, value, info }: ConfigProps) {
    const [textStr, setTextStr] = useState(value as string);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setTextStr(value as string);
    }, [value]);

    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [textStr]);

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        putAccountConfig(alias, info.key, newValue as ConfigValue)
            .then((res) => {
                toaster.create({ type: 'success', title: '保存成功', description: res });
            })
            .catch((err: AxiosError) => {
                setTextStr(value as string);
                toaster.create({
                    type: 'error',
                    title: '保存失败',
                    description: err.response?.data as string || '网络错误',
                });
            });
    };

    return (
        <>
            <Text>{info.desc}</Text>
            <Textarea
                ref={textareaRef}
                value={textStr}
                onChange={(e) => setTextStr(e.target.value)}
                onBlur={handleBlur}
                id={info.key}
            />
        </>
    );
}

// ---------- ConfigMultiSearch ----------
function ConfigMultiSearch({ alias, value, info }: ConfigProps) {
    const [localValue, setLocalValue] = useState<ConfigValue>(value);
    const mountedRef = useRef(true);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const displayValue = ((localValue || []) as number[]).map((id) => {
        const unit = info.candidates.find((unit) => unit.value === id);
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

            const res = await putAccountConfig(alias, info.key, ret);
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
                    description: axiosErr.response?.data as string || '网络错误',
                });
            }
        }
    };

    return (
        <InputGroup
            startElement={info.desc}
            endElement={
                <Button size="sm" onClick={handleClick}>
                    选择
                </Button>
            }
        >
            <Input value={displayValue.join(', ')} readOnly onClick={handleClick} cursor="pointer" />
        </InputGroup>
    );
}

// ---------- 主组件 ----------
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
