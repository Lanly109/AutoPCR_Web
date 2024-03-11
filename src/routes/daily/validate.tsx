import Validate from '@components/Account/Validate'
import {
    Flex,
    useColorModeValue,
} from '@chakra-ui/react'

import {
    createFileRoute,
} from '@tanstack/react-router'

interface ValidateSearch {
    id: string
    user_id: string
    gt: string
    challenge: string
}

export const Route = createFileRoute('/daily/validate')({
    validateSearch: (search: Record<string, unknown>): ValidateSearch => {
        // validate and parse the search params into a typed state
        return {
            id: (search.id as string) || '',
            user_id: (search.user_id as string) || '',
            gt: (search.gt as string) || '',
            challenge: (search.challenge as string) || '',
        }
    },
    component: ValidateComponent,
})

export default function ValidateComponent() {
    const { id, user_id, gt, challenge } = Route.useSearch()
    return (
        <Flex
            height="100vh"
            align={'center'}
            justify={'center'}
            bg={useColorModeValue('gray.50', 'gray.800')}>
            <Validate id={id} userid={user_id} gt={gt} challenge={challenge} />
        </Flex>
    )
}

