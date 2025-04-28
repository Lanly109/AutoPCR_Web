import { ConfigInfo, ConfigValue } from '@/interfaces/Module';
import { Switch, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Input, InputGroup, InputLeftAddon, InputRightAddon, Select, useToast, CheckboxGroup, Checkbox, Stack, Box, useColorModeValue, Textarea, Text, Button } from '@chakra-ui/react'
import { putAccountConfig } from '@/api/Account';
import { ChangeEventHandler, FocusEventHandler, useState } from 'react';
import { AxiosError } from 'axios';
import NiceModal from '@ebay/nice-modal-react';
import multiSelectModal from './MultiSelectModal';

interface ConfigProps {
    alias: string,
    value: ConfigValue,
    info: ConfigInfo
}

// 在现有的Config组件中添加表格类型的处理
export default function Config({ alias, value, info }: ConfigProps) {
    switch (info?.config_type) {
        case 'bool':
            return <ConfigBool alias={alias} value={value} info={info} />
        case 'int':
            return <ConfigInt alias={alias} value={value} info={info} />
        case 'single':
            return <ConfigSingle alias={alias} value={value} info={info} />
        case 'multi':
            return <ConfigMulti alias={alias} value={value} info={info} />
        case 'time':
            return <ConfigTime alias={alias} value={value} info={info} />
        case 'text':
            return <ConfigText alias={alias} value={value} info={info} />
        case 'multi_search':
            return <ConfigMultiSearch alias={alias} value={value} info={info} />
    }
}

function ConfigBool({ alias, value, info }: ConfigProps) {
    const toast = useToast();

    const onChange: ChangeEventHandler<HTMLInputElement> = (e: React.ChangeEvent<HTMLInputElement>) => {
        putAccountConfig(alias, info.key, e.target.checked).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }

    return (
        <InputGroup>
            <InputLeftAddon>
                {info.desc}
            </InputLeftAddon>
            <InputRightAddon>
                <Switch id={info.key} defaultChecked={value as boolean} onChange={onChange} />
            </InputRightAddon>
        </InputGroup>
    )
}

function ConfigInt({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onChange = (_: string, valueAsNumber: number) => {
        putAccountConfig(alias, info.key, valueAsNumber).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }

    return (
        <InputGroup>
            <InputLeftAddon>
                {info.desc}
            </InputLeftAddon>

            <NumberInput onChange={onChange} id={info.key} defaultValue={value as number} min={Math.min(...info.candidates.map(c => c.value) as number[])} max={Math.max(...info.candidates.map(c => c.value) as number[])}>
                <NumberInputField />
                <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                </NumberInputStepper>
            </NumberInput>
        </InputGroup>
    )
}

function ConfigSingle({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        let value: ConfigValue = e.target.value;
        const intValue = Number(value);
        if (!isNaN(intValue))
            value = intValue;
        putAccountConfig(alias, info.key, value).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }

    return (
        <InputGroup>
            <InputLeftAddon>
                {info.desc}
            </InputLeftAddon>

            <Select onChange={onChange} id={info.key} defaultValue={value as string | number} >
                {
                    info.candidates.map((element) => {
                        return <option key={element.value as string | number} value={element.value as string | number} >{element.display}</option>
                    })
                }
            </Select>
        </InputGroup>
    )
}

function ConfigMulti({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onChange = (value: (string | number)[]) => {
        let postValue = value;
        const intValue = postValue.map(option => Number(option))
        if (intValue.length != 0 && !isNaN(intValue[0]))
            postValue = intValue;

        putAccountConfig(alias, info.key, postValue as ConfigValue).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }
    return (
        <InputGroup>
            <InputLeftAddon style={{ height: 'auto' }}>
                {info.desc}
            </InputLeftAddon>

            <Box paddingLeft="16px" paddingRight="32px" overflowY="scroll" borderWidth="1px" borderColor={useColorModeValue("gray.200", "gray.600")} borderRadius="md">
                <CheckboxGroup onChange={onChange} defaultValue={(value as (string | number)[]).map(option => String(option))} >
                    <Stack spacing={[1, 5]} direction={['column', 'row']}>
                        {
                            info.candidates.map((element) => {
                                return <Checkbox key={element.value as string | number} value={String(element.value) as string | number} >{element.display}</Checkbox>
                            })
                        }
                    </Stack>
                </CheckboxGroup>
            </Box>

        </InputGroup >
    )
}

function ConfigTime({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onBlur: ChangeEventHandler<HTMLInputElement> = (e: React.ChangeEvent<HTMLInputElement>) => {
        putAccountConfig(alias, info.key, e.target.value as ConfigValue).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }

    return (
        <InputGroup>
            <InputLeftAddon>
                {info.desc}
            </InputLeftAddon>

            <Input type='time' onBlur={onBlur} id={info.key} defaultValue={value as string} />
        </InputGroup>
    )
}

function ConfigText({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onBlur: FocusEventHandler<HTMLTextAreaElement> = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        putAccountConfig(alias, info.key, e.target.value as ConfigValue).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.target.style.height = 'auto'; // 重置高度
        e.target.style.height = `${e.target.scrollHeight}px`; // 根据内容设置高度
    };    
    return (
        <>
            <Text>{info.desc}</Text>
            <Textarea onBlur={onBlur} id={info.key} defaultValue={value as string} onInput={handleInput} />
        </>
    );
}

function ConfigMultiSearch({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const [localValue, setLocalValue] = useState<ConfigValue>(value);

    const displayValue = (localValue as number[]).map((id) => {
        const unit = info.candidates.find((unit) => unit.value === id);
        return unit ? (unit.nickname ? unit.nickname : unit.display) : String(id);
    });

    const handleClick = async (): Promise<void> => {
        
        try {
            const ret: ConfigValue = await NiceModal.show<ConfigValue>('multiSelectModal', {
                candidates: info.candidates,
                value: localValue,
            });
            const res: string = await putAccountConfig(alias, info.key, ret);
            setLocalValue(ret);
            toast({ status: "success", title: "保存成功", description: res });
            await NiceModal.hide(multiSelectModal);
        } catch (err) {
            const axiosErr = err as AxiosError;
            toast({ status: "error", title: "保存失败", description: axiosErr.response?.data as string || "网络错误" });
        }
    };

    return (
        <InputGroup>
            <InputLeftAddon>
                {info.desc}
            </InputLeftAddon>
            <Input value={displayValue} isReadOnly onClick={handleClick} cursor="pointer" />
            <InputRightAddon>
                <Button size="sm" onClick={handleClick}>选择</Button>
            </InputRightAddon>
        </InputGroup>
    );
}
