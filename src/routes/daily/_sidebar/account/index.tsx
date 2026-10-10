import { Box } from '@chakra-ui/react'
import { DashBoard } from '@components/Account/DashBoard'
import ClanPrepLauncher from '@components/ClanPrep/Launcher'
import { createFileRoute } from '@tanstack/react-router'

function AccountOverview() {
    return (
        <Box>
            <DashBoard />
            <ClanPrepLauncher />
        </Box>
    )
}

export const Route = createFileRoute('/daily/_sidebar/account/')({
    component: AccountOverview,
})
