import { getAccountConfig } from '@api/Account'
import { ModuleResponse } from '@interfaces/Module';
import { Box, Flex, IconButton, Popover, PopoverContent, PopoverTrigger, Stack, useDisclosure } from '@chakra-ui/react';
import { useEffect, useState } from 'react'
import Module from "./Module"
import Toc from "./Toc"
import { FiCompass } from 'react-icons/fi';

interface AreaProps {
    alias: string,
    keys: string
}

export interface TocItem {
    name: string,
    id: string
}

export default function Area({ alias, keys: key }: AreaProps) {

    const [config, setConfig] = useState<ModuleResponse | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure()

    useEffect(() => {
        if (alias && key) {
            getAccountConfig(alias, key).then((res) => {
                setConfig(res)
            }).catch((err) => {
                console.log(err);
            })
        }
    }, [alias, key]);

    const tocList: TocItem[] = [];
    config?.order.map((module) => {
        tocList.push({ name: config.info[module].name, id: module })
    })


    return (
        <Box>
            <Stack mr={"15px"}>
                {
                    config?.order.map((module) => (
                        <Module key={module} id={module} alias={alias} config={config?.config} info={(config.info[module])} isOpen={isOpen} onOpen={onOpen} onClose={onClose} />
                    ))
                }

            </ Stack>
            <Flex position="fixed"
                right="0"
                bottom="50vh"
                justifyContent="flex-end"
                alignItems="center">
                <Popover isLazy placement='left'>
                    <PopoverTrigger>
                        <IconButton icon={<FiCompass />} aria-label='TOC' />
                    </PopoverTrigger>
                    <PopoverContent>
                        <Toc maxH="75vh" tocList={tocList} />
                    </PopoverContent>
                </Popover>
            </Flex>
        </Box>
    )
}
