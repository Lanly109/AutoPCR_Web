import { getAccount } from '@/api/Account'
import { AccountResponse } from '@/interfaces/Account'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import Area from "./Area"

export default function Account(alias: string) {

    const [account, setAccount] = useState<AccountResponse | null>(null)

    useEffect(() => {
        if (alias) {
            getAccount(alias).then((res) => {
                setAccount(res)
            }).catch((err) => {
                console.log(err);
            })
        }
    }, [alias]);


    return (
        <Tabs>
            <TabList>
                <Tab isDisabled>{account?.alias}</Tab>
                {
                    account?.area.map((area) => {
                        return <Tab key={area.name} >{area.name}</Tab>
                    })
                }
            </TabList>

            <TabPanels>
                <TabPanel>
                    你怎么做到的？
                </TabPanel>
                {
                    account?.area.map((area) => {
                        return <TabPanel key={area.key}> <Area alias={alias} keys={area.key} /> </TabPanel>
                    })
                }
            </TabPanels>
        </Tabs>
    )
}
