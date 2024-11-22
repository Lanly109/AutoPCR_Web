import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Image, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { ResultInfo as ResultInfoInterface } from '@interfaces/UserInfo'
import { FiAlertCircle, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { ResultTable } from './ResultTable'

export interface ResultInfoProps {
    resultInfo: ResultInfoInterface[]
}

function ResultDetail({ url }: { url: string }) {
    return (
        <Tabs isLazy variant='soft-rounded'>
            <TabList>
                <Tab>文本</Tab>
                <Tab>图片</Tab>
            </TabList>
            <TabPanels>
                <TabPanel>
                    <ResultTable url={url + "?text=true"} />
                </TabPanel>
                <TabPanel>
                    <Image
                        src={url}
                        width="100%"
                        height="100%"
                    />
                </TabPanel>
            </TabPanels>
        </Tabs>
    )
}

export function ResultInfo({ resultInfo }: ResultInfoProps) {
    return (
        <Accordion allowToggle>
            {
                resultInfo.map((info, index) => (
                    <AccordionItem key={index}>
                        {({ isExpanded }) => (
                            <>
                                <h2>
                                    <AccordionButton>
                                        {info.status == "成功" || info.status == '跳过' ? <FiCheckCircle /> : info.status == "警告" || info.status == '中止' ? <FiAlertCircle /> : <FiXCircle />}
                                        <Box as='span' flex='1' textAlign='left'>
                                            {info.time} {info.alias}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel pb={4}>
                                    {isExpanded && <ResultDetail url={info.url} />}
                                </AccordionPanel>
                            </>
                        )}

                    </AccordionItem>
                ))
            }
        </Accordion >
    )
}
