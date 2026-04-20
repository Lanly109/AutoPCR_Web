import { useEffect, useState } from 'react'

import { AccountResponse } from '@/interfaces/Account'
import Area from "./Area"
import { Tabs } from '@chakra-ui/react'
import { getAccount } from '@/api/Account'

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
        <Tabs.Root lazyMount variant="enclosed" defaultValue="0">
            <Tabs.List>
                <Tabs.Trigger value="0" disabled>{account?.alias}</Tabs.Trigger>
                {
                    account?.area.map((area, index) => {
                        return <Tabs.Trigger key={area.name} value={String(index + 1)}>{area.name}</Tabs.Trigger>
                    })
                }
            </Tabs.List>

            <Tabs.Content value="0">
                你怎么做到的？
            </Tabs.Content>
            {
                account?.area.map((area, index) => {
                    return <Tabs.Content key={area.key} value={String(index + 1)}> <Area alias={alias} keys={area.key} areaName={area.name} /> </Tabs.Content>
                })
            }
        </Tabs.Root>
    )
}
