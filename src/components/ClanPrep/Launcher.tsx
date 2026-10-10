import { Box, Drawer, IconButton, Portal, Text } from '@chakra-ui/react'
import { useState } from 'react'
import ClanPrepPanel from './Index'
import { CloseButton } from '../ui/close-button'
import { Tooltip } from '../ui/tooltip'

export default function ClanPrepLauncher() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Tooltip content="会战准备" openDelay={0} closeDelay={0}>
                <IconButton
                    aria-label="会战准备"
                    position="fixed"
                    right={0}
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={20}
                    w="30px"
                    minW="30px"
                    h="110px"
                    minH="110px"
                    borderRadius="10px 0 0 10px"
                    colorPalette="teal"
                    shadow="md"
                    onClick={() => setOpen(true)}
                >
                    <Box
                        as="span"
                        style={{ writingMode: 'vertical-rl', letterSpacing: 3 }}
                        fontSize="sm"
                        fontWeight="bold"
                    >
                        会战准备
                    </Box>
                </IconButton>
            </Tooltip>
            <Drawer.Root open={open} onOpenChange={e => setOpen(e.open)} placement="end" size="lg">
                <Portal>
                    <Drawer.Backdrop />
                    <Drawer.Positioner>
                        <Drawer.Content>
                            <Drawer.Header>
                                <Drawer.Title>
                                    会战准备
                                    <Text as="span" fontSize="2xs" color="fg.muted" fontWeight="normal" ml={2}>
                                        默认会在日程通知里检测到会战开放日时，设定时间里自动拉取数据/自动以下按钮执行。作业数据2小时最多拉取一次。
                                    </Text>
                                </Drawer.Title>
                                <Drawer.CloseTrigger asChild>
                                    <CloseButton />
                                </Drawer.CloseTrigger>
                            </Drawer.Header>
                            <Drawer.Body overflow="hidden" p={0} display="flex" flexDirection="column" minH={0}>
                                <ClanPrepPanel />
                            </Drawer.Body>
                        </Drawer.Content>
                    </Drawer.Positioner>
                </Portal>
            </Drawer.Root>
        </>
    );
}
