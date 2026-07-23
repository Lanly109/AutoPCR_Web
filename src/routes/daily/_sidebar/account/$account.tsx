import { Box, Button, Tabs } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FiStar } from 'react-icons/fi';

import { AccountResponse } from '@interfaces/Account';
import Area from '@components/Account/Area';
import ConfigImportExport from "@components/Account/ConfigImportExport.tsx";
import Info from '@components/Account/Info';
import { createFileRoute } from '@tanstack/react-router';
import { getAccount } from '@api/Account';

export const Route = createFileRoute('/daily/_sidebar/account/$account')({
    component: AccountComponent,
    loader: ({ params: { account } }) => getAccount(account),
    errorComponent: () => <div> Not Found </div>,
})

function AccountComponent() {
    const { account } = Route.useParams();
    const initialAccountInfo = Route.useLoaderData<AccountResponse>();
    const [accountInfo, setAccountInfo] = useState<AccountResponse>(initialAccountInfo);

    const initialTab = initialAccountInfo?.username !== '' && initialAccountInfo?.password !== '' ? "1" : "0";
    
    // activeTab 仅用于驱动 UI 按钮的高亮，点击瞬间 0ms 响应
    const [activeTab, setActiveTab] = useState<string>(initialTab);

    // 按 Tab 独立存储“只显示收藏”
    const [favOnlyMap, setFavOnlyMap] = useState<Record<string, boolean>>({});

    const refreshAccountData = async () => {
        try {
            const freshData = await getAccount(account);
            setAccountInfo(freshData);
        } catch (error) {
            console.error('刷新账号数据失败', error);
        }
    };

    useEffect(() => {
         setActiveTab(initialTab);
     }, [initialAccountInfo, initialTab]);

    const activeAreaIndex = Number(activeTab) - 1;
    const currentArea = activeTab !== "0" && accountInfo?.area ? accountInfo.area[activeAreaIndex] : null;
    const isCurrentTabFavOnly = currentArea ? !!favOnlyMap[currentArea.key] : false;

    const handleToggleCurrentFavOnly = () => {
        if (!currentArea?.key) return;
        setFavOnlyMap(prev => ({
            ...prev,
            [currentArea.key]: !prev[currentArea.key]
        }));
    };

    const activeAreaIndex = Number(activeTab) - 1;
    const currentArea = activeTab !== "0" && accountInfo?.area ? accountInfo.area[activeAreaIndex] : null;
    const isCurrentTabFavOnly = currentArea ? !!favOnlyMap[currentArea.key] : false;

    const handleToggleCurrentFavOnly = () => {
        if (!currentArea?.key) return;
        setFavOnlyMap(prev => ({
            ...prev,
            [currentArea.key]: !prev[currentArea.key]
        }));
    };

    return (
        <Tabs.Root 
            lazyMount 
            variant="plain" 
            value={activeTab}
            onValueChange={(details) => setActiveTab(details.value)} // 0ms 同步高亮
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
                alignItems="center"
            >
                <Tabs.Trigger 
                    value="0"
                    px={4}
                    py={1.5}
                    rounded="lg"
                    fontWeight="semibold"
                    transition="background-color 0.1s ease, color 0.1s ease"
                    _selected={{ 
                        bg: "blue.solid", 
                        color: "white", 
                        shadow: "md"
                    }}
                    _hover={{ 
                        bg: "bg.subtle",
                        _selected: { bg: "blue.solid", color: "white" }
                             }}
                > 
                    {account} 
                </Tabs.Trigger>
                
                <Box width="1px" height="16px" alignSelf="center" bg="border.muted" mx={1} />

                {accountInfo?.area.map((area, index) => (
                    <Tabs.Trigger 
                        value={String(index + 1)} 
                        key={area?.key}
                        px={3}
                        py={1.5}
                        rounded="lg"
                        fontWeight="medium"
                        color="fg.muted"
                        transition="background-color 0.1s ease, color 0.1s ease"
                        _selected={{ bg: "bg.subtle", color: "blue.600", fontWeight: "bold", shadow: "sm" }}
                        _hover={{ bg: "bg.subtle", color: "fg" }}
                    >
                        {area?.name}
                    </Tabs.Trigger>
                ))}

                {activeTab !== "0" && (
                    <Box display="flex" alignItems="center" pr={2}>
                        <Button
                            size="sm"
                            variant={isCurrentTabFavOnly ? "solid" : "ghost"}
                            colorPalette={isCurrentTabFavOnly ? "yellow" : "gray"}
                            onClick={handleToggleCurrentFavOnly}
                            minW="120px"
                            type="button"
                        >
                            {isCurrentTabFavOnly ? (
                                <><FiStar fill="currentColor" /> 显示全部</>
                            ) : (
                                <><FiStar /> 只显示收藏</>
                            )}
                        </Button>
                    </Box>
                )}
            </Tabs.List>

            <Box flex={1} overflow={'auto'}>
                <Tabs.Content value="0">
                    <Info accountInfo={accountInfo} onSaveSuccess={refreshAccountData} />
                    <ConfigImportExport alias={accountInfo?.alias} areas={accountInfo?.area} onImportSuccess={refreshAccountData} />
                </Tabs.Content>

                {/* 保持静态DOM挂载逻辑，由 Tabs.Root 统一做 lazyMount 缓存 */}
                {accountInfo?.area.map((area, index) => (
                    <Tabs.Content value={String(index + 1)} key={area?.key}>
                        <Area 
                            alias={accountInfo?.alias} 
                            keys={area?.key} 
                            areaName={area?.name} 
                            showOnlyFav={!!favOnlyMap[area?.key]} 
                        />
                    </Tabs.Content>
                ))}
            </Box>
        </Tabs.Root>
    );
}
