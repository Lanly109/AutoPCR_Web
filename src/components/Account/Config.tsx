import { ConfigInfo, ConfigValue } from '@/interfaces/Module';
import { Switch, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Input, InputGroup, InputLeftAddon, InputRightAddon, Select, useToast, CheckboxGroup, Checkbox, Stack, Box, useColorModeValue, Textarea, Text } from '@chakra-ui/react'
import { putAccountConfig } from '@/api/Account';
import { ChangeEventHandler, FocusEventHandler } from 'react';
import { AxiosError } from 'axios';

interface ConfigProps {
    alias: string,
    value: ConfigValue,
    info: ConfigInfo
}

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

            <NumberInput onChange={onChange} id={info.key} defaultValue={value as number} min={Math.min(...info.candidates as number[])} max={Math.max(...info.candidates as number[])}>
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
                        return <option key={element as string | number} value={element as string | number} >{element}</option>
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
                                return <Checkbox key={element as string | number} value={String(element) as string | number} >{element}</Checkbox>
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

    return (
        <>
            <Text>
                {info.desc}
            </Text>

            <Textarea onBlur={onBlur} id={info.key} defaultValue={value as string} />
        </>
    )
}
