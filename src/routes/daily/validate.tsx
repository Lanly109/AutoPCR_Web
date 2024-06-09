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
    userid: string
    gt: string
    challenge: string
}

export const Route = createFileRoute('/daily/validate')({
    validateSearch: (search: Record<string, unknown>): ValidateSearch => {
        // validate and parse the search params into a typed state
        return {
            id: (search.id as string) || '',
            userid: (search.userid as string) || '',
            gt: (search.gt as string) || '',
            challenge: (search.challenge as string) || '',
        }
    },
    component: ValidateComponent,
})

export default function ValidateComponent() {
    const { id, userid, gt, challenge } = Route.useSearch()
    return (
        <Flex
            height="100vh"
            align={'center'}
            justify={'center'}
            bg={useColorModeValue('gray.50', 'gray.800')}>
            <Validate id={id} userid={userid} gt={gt} challenge={challenge} />
        </Flex>
    )
}

