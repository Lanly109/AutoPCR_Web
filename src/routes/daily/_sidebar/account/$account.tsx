import { Box, Tabs } from '@chakra-ui/react'
import { useEffect, useState } from 'react';

import { AccountResponse } from '@interfaces/Account'
import Area from '@components/Account/Area'
import ConfigImportExport from "@components/Account/ConfigImportExport.tsx";
import Info from '@components/Account/Info'
import { createFileRoute } from '@tanstack/react-router'
import { getAccount } from '@api/Account'
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
        <Tabs.Root 
            lazyMount 
            variant="plain" 
            defaultValue={accountInfo?.username != '' && accountInfo?.password != '' ? "1" : "0"} 
            display={'flex'} 
            flexDirection={'column'} 
            height={'100%'}
        >
            <Tabs.List 
                bg="bg.panel" 
                p={1} 
                borderRadius="xl" 
                shadow="sm" 
                borderWidth="1px" 
                borderColor="border.subtle"
                mb={4}
                overflowX="auto"
                gap={1}
            >
                <Tabs.Trigger 
                    value="0"
                    px={4}
                    py={1.5}
                    rounded="lg"
                    fontWeight="semibold"
                    transition="all 0.2s"
                     _selected={{ 
                         bg: "blue.solid", 
                         color: "white", 
                         shadow: "md",
                         _hover: { bg: "blue.600" } 
                     }}
                    _hover={{ bg: "bg.subtle" }}
                > 
                    {account} 
                </Tabs.Trigger>
                
                <Box width="1px" height="16px" alignSelf="center" bg="border.muted" mx={1} />

                {accountInfo?.area.map((area, index) => {
                    return (
                        <Tabs.Trigger 
                            value={String(index + 1)} 
                            key={area?.key}
                            px={3}
                            py={1.5}
                            rounded="lg"
                            fontWeight="medium"
                            color="fg.muted"
                            transition="all 0.2s"
                            _selected={{ bg: "bg.subtle", color: "blue.600", fontWeight: "bold", shadow: "sm" }}
                            _hover={{ bg: "bg.subtle", color: "fg" }}
                        >
                            {area?.name}
                        </Tabs.Trigger>
                    );
                })}
            </Tabs.List>
            <Box flex={1} overflow={'auto'}>
                <Tabs.Content value="0">
                    <Info accountInfo={accountInfo} onSaveSuccess={refreshAccountData} />
                    <ConfigImportExport alias={accountInfo?.alias} areas={accountInfo?.area} onImportSuccess={refreshAccountData} />
                </Tabs.Content>
                {accountInfo?.area.map((area, index) => (
                    <Tabs.Content value={String(index + 1)} key={area?.key}>
                        {' '}
                        <Area alias={accountInfo?.alias} keys={area?.key} areaName={area?.name} />{' '}
                    </Tabs.Content>
                ))}
            </Box>
        </Tabs.Root>
    );
}
