import { getAccount } from '@api/Account'
import Area from '@components/Account/Area'
import Info from '@components/Account/Info'
import { AccountResponse } from '@interfaces/Account'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/daily/_sidebar/account/$account')({
    component: AccountComponent,
    loader: ({ params: { account } }) => getAccount(account),
    errorComponent: () => {
        return <div> Not Found </div>
    },
})

function AccountComponent() {
    const { account } = Route.useParams()
    // const [accountInfo, setAccountInfo] = useState<AccountResponse>()
    // const [_, newToast] = useToastHook();
    const accountInfo = Route.useLoaderData<AccountResponse>()

    // useEffect(() => {
    //     getAccount(account).then((res) => {
    //         setAccountInfo(res)
    //     }).catch((err) => {
    //         newToast({
    //             message: "获取账号错误", description: err.response.data || "网络错误", status: "error",
    //         });
    //         console.log(err);
    //     })
    // }, [account, newToast]);

    return (
        <Tabs isLazy variant='enclosed' defaultIndex={accountInfo?.username != "" && accountInfo?.password != "" ? 1 : 0}>
            <TabList mb='1em'>
                <Tab id="account"> {account} </Tab>
                {
                    accountInfo?.area.map((area) => {
                        return (
                            <Tab id={area?.key} key={area?.key} > {area?.name} </Tab>
                        )
                    })
                }
            </TabList>
            <TabPanels>
                <TabPanel id="account" >
                    <Info accountInfo={accountInfo} />
                </TabPanel>
                {
                    accountInfo?.area.map((area) => (
                        <TabPanel id={area?.key} key={area?.key} > <Area alias={accountInfo?.alias} keys={area?.key} /> </TabPanel>
                    ))
                }
            </TabPanels>
        </Tabs>

    )
}

