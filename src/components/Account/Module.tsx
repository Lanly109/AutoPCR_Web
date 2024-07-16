import { ConfigValue, ModuleInfo } from '@/interfaces/Module';
import DailyResultModal from './DailyResultModal';
import { Card, CardHeader, CardBody, Checkbox, Heading, Stack, StackDivider, Box, Text, Flex, Button, Spacer, CardProps, HStack, Tag, useToast } from '@chakra-ui/react'
import Config from './Config';
import { getAccountAreaSingleResult, postAccountAreaSingle, putAccountConfig } from '@/api/Account';
import { ChangeEventHandler } from 'react';
import NiceModal from '@ebay/nice-modal-react';
import { QueryValidate } from './Validate';
import { AxiosError } from 'axios';

interface ModuleProps extends CardProps {
    alias: string,
    config: Map<string, ConfigValue>,
    info: ModuleInfo
    isOpen: boolean,
    onOpen: () => void,
    onClose: () => void
}

export default function Module({ alias, config, info, isOpen, onOpen, onClose, ...rest }: ModuleProps) {
    const toast = useToast();

    const onChange: ChangeEventHandler<HTMLInputElement> = (e: React.ChangeEvent<HTMLInputElement>) => {
        putAccountConfig(alias, info?.key, e.target.checked).then((response) => {
            toast({ status: 'success', title: '保存成功', description: response });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        })
    };

    const handleExecute = () => {
        toast({ status: 'info', title: '开始执行' + info?.name + "..." });
        onOpen();
        postAccountAreaSingle(alias, info?.key, info?.text_result).then(async (res) => {
            toast({ status: 'success', title: '执行成功' });
            onClose();
            if (info?.text_result) {
                await NiceModal.show(DailyResultModal, { alias: alias, result: res });
            } else {
                await NiceModal.show(DailyResultModal, { alias: alias, resultUrl: res });
            }
        }).catch(async (err: AxiosError) => {
            toast({ status: 'error', title: '执行失败', description: await (err.response?.data as Blob).text() || "网络错误" });
            onClose();
        });
        QueryValidate(toast, alias);
    }

    const handleResult = () => {
        toast({ status: 'info', title: `正在获取${info?.name}的结果` });
        onOpen();
        getAccountAreaSingleResult(alias, info?.key, info?.text_result).then(async (res) => {
            onClose();
            if (info?.text_result) {
                await NiceModal.show(DailyResultModal, { alias: alias, result: res });
            } else {
                await NiceModal.show(DailyResultModal, { alias: alias, resultUrl: res });
            }
        }).catch(async (err: AxiosError) => {
            onClose();
            toast({ status: 'error', title: '获取结果失败', description: await (err.response?.data as Blob).text() || "网络错误" });
        });
    }

    return (
        <Card colorScheme="red" {...rest} >
            <CardHeader>
                <Flex>
                    <Checkbox defaultChecked={config.get(info?.key) as boolean} onChange={onChange}>
                        <Heading size='md'>{info?.name} {
                            info?.tags.map(item => <Tag key={item}>{item}</Tag>)
                        }</Heading>
                    </Checkbox>
                    <Spacer />
                    <HStack>
                        {info?.runnable &&
                            <Button size='sm' colorScheme='blue' isLoading={isOpen} onClick={handleExecute}>执行</Button>
                        }
                        {info?.runnable &&
                            <Button size='sm' colorScheme='blue' isLoading={isOpen} onClick={handleResult}>结果</Button>
                        }
                    </HStack>
                </Flex>
            </CardHeader>

            <CardBody>
                <Stack divider={<StackDivider />} spacing='4'>
                    {info?.description &&
                        <Box>
                            <Heading size='md'>描述</Heading>
                            <Text pt='2' fontSize='sm'>
                                {info?.description}
                            </Text>
                        </Box>
                    }
                    {info?.config_order.length != 0 &&
                        <Box>
                            <Stack spacing='4'>
                                {<Heading size='md'>设置项</Heading>}
                                {
                                    info?.config_order.map((key) => (
                                        <Config key={key} alias={alias} value={config.get(key)!} info={info.config.get(key)!} />
                                    ))
                                }
                            </Stack>
                        </Box>
                    }
                </Stack>
            </CardBody>
        </Card >
    )
}
