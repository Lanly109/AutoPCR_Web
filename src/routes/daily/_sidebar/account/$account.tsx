import { getAccount } from '@api/Account'
import Area from '@components/Account/Area'
import Info from '@components/Account/Info'
import { AccountResponse } from '@interfaces/Account'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import ConfigSync from "@components/Account/ConfigSync.tsx";
export const Route = createFileRoute('/daily/_sidebar/account/$account')({
    component: AccountComponent,
    loader: ({ params: { account } }) => getAccount(account),
    errorComponent: () => {
        return <div> Not Found </div>
    },
})

function AccountComponent() {
    const { account } = Route.useParams();
    const initialAccountInfo = Route.useLoaderData<AccountResponse>();
    const [accountInfo, setAccountInfo] = useState<AccountResponse>(initialAccountInfo);

    // 添加刷新数据的函数
    const refreshAccountData = async () => {
        try {
            const freshData = await getAccount(account);
            setAccountInfo(freshData);
        } catch (error) {
            console.error('刷新账号数据失败', error);
        }
    };

    // 初始化时设置数据
    useEffect(() => {
        setAccountInfo(initialAccountInfo);
    }, [initialAccountInfo]);

    return (
        <Tabs isLazy variant="enclosed" defaultIndex={accountInfo?.username != '' && accountInfo?.password != '' ? 1 : 0} display={'flex'} flexDirection={'column'} height={'100%'}>
            <TabList mb="1em">
                <Tab id="account"> {account} </Tab>
                {accountInfo?.area.map((area) => {
                    return (
                        <Tab id={area?.key} key={area?.key}>
                            {' '}
                            {area?.name}{' '}
                        </Tab>
                    );
                })}
            </TabList>
            <TabPanels flex={1} overflow={'auto'}>
                <TabPanel id="account">
                    <Info accountInfo={accountInfo} onSaveSuccess={refreshAccountData} />
                    <ConfigSync alias={accountInfo?.alias} areas={accountInfo?.area} onImportSuccess={refreshAccountData} />
                </TabPanel>
                {accountInfo?.area.map((area) => (
                    <TabPanel id={area?.key} key={area?.key}>
                        {' '}
                        <Area alias={accountInfo?.alias} keys={area?.key} />{' '}
                    </TabPanel>
                ))}
            </TabPanels>
        </Tabs>
    );
}
