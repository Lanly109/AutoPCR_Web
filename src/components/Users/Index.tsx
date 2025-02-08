import {
    Button,
    Card, CardBody, CardFooter, CardHeader,
    Checkbox,
    CloseButton,
    Flex,
    SimpleGrid,
    Spacer,
    Stack,
    Switch, Text,
    useDisclosure, useToast
} from "@chakra-ui/react";
import Alert from "@components/alert.tsx";
import React, { useEffect, useState } from "react";
import { FocusableElement } from "@chakra-ui/utils";
import { FiUnlock } from "react-icons/fi";
import { deleteUser, getAllUsers, getClanForbid, putUser, useUserRole } from "@api/Account.ts";
import { AxiosError } from "axios";
import { UserInfo } from "@interfaces/UserInfo.ts";
import createUserModal from "./CreateUserModal";
import NiceModal from "@ebay/nice-modal-react";
import clanForbid from "./ChangeClanForbidUserModal";
import resetPasswdModal from "./ResetPasswdModal";

export default function Users() {
    const toast = useToast()

    const freshUserInfo = useDisclosure();
    const [users, setUsers] = useState<UserInfo[]>();

    useEffect(() => {
        getAllUsers().then((res) => {
            setUsers(res);
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: err?.response?.data as string || '网络错误' });
        });
    }, [freshUserInfo.isOpen, toast]);

    const role = useUserRole();

    const createUser = () => {
        NiceModal.show(createUserModal, {}).then(() => {
            freshUserInfo.onToggle()
        }).catch(() => { return });
    }

    const setClanForbid = () => {
        getClanForbid().then(async (res) => {
            await NiceModal.show(clanForbid, { accs: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: err?.response?.data as string || '网络错误' });
        })
    }


    return (
        <Stack height={'100%'}>
            <Stack>
                <SimpleGrid spacing={2} templateColumns='repeat(auto-fill, minmax(100px, 1fr))'>
                    <Button colorScheme="blue" onClick={createUser}>创建用户</Button>
                    <Button colorScheme="blue" onClick={setClanForbid}>设置会战禁用</Button>
                </SimpleGrid>
            </Stack>
            <SimpleGrid spacing={4} templateColumns='repeat(auto-fill, minmax(250px, 1fr))'>
                {
                    users?.map((user) => {
                        // 仅超管可更改管理员用户
                        const allowManage = role?.super_user == true
                        const allowEdit = (user.admin == true && role?.super_user == true) || (user.admin == false)
                        return <UserInfoItem key={user.qq} qq={user.qq} onToggle={freshUserInfo.onToggle} clan={user.clan} admin={user.admin}
                            userDisabled={user.disabled} accountCount={user.account_count}
                            allowEdit={allowEdit} allowManage={allowManage} />
                    })
                }
            </SimpleGrid>
        </Stack>
    )
}

interface UserInfoProps {
    qq?: string
    userDisabled?: boolean
    clan?: boolean
    admin?: boolean
    accountCount?: number
    allowManage?: boolean
    allowEdit?: boolean
    onToggle: () => void
}

function UserInfoItem({ qq, userDisabled, clan, admin, accountCount, allowManage, allowEdit, onToggle }: UserInfoProps) {
    const cancelRef = React.useRef<FocusableElement>(null)
    const toast = useToast()

    const deleteConfirm = useDisclosure()
    const handleDeleteUser = () => {
        if (qq == undefined) {
            return
        }
        deleteUser(qq).then((res) => {
            toast({ status: 'success', title: `删除用户${qq}成功`, description: res });
            deleteConfirm.onClose()
            onToggle()
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: err?.response?.data as string || '网络错误' });
        });
    }

    const handleUpdateUser = (userInfo: UserInfo, onSuccess: () => void) => {
        if (qq == undefined) {
            return
        }
        putUser(qq, userInfo).then((res) => {
            toast({ status: 'success', title: `更新用户${qq}成功`, description: res });
            onSuccess()
            onToggle()
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: err?.response?.data as string || '网络错误' });
        });
    }
    const disableConfirm = useDisclosure()
    const handleDisableUser = () => {
        handleUpdateUser({
            disabled: !userDisabled
        }, disableConfirm.onClose)
    }
    const adminConfirm = useDisclosure()
    const handleAdminUser = () => {
        handleUpdateUser({
            admin: !admin
        }, adminConfirm.onClose)
    }
    const handleClanUser = () => {
        handleUpdateUser({
            clan: !clan
        }, adminConfirm.onClose)
    }

    const startRstPwd = () => {
        NiceModal.show(resetPasswdModal, {}).then((res) => {
            handleUpdateUser({
                password: res as string
            }, () => { NiceModal.hide(resetPasswdModal).then(() => { return }).catch(() => { return }) })
        }).catch(() => { return });
    }

    return (
        <Card>
            <CardHeader>
                <Flex>
                    <Switch isChecked={!userDisabled} onChange={disableConfirm.onOpen} isDisabled={!allowEdit}>{qq}</Switch>
                    <Spacer />
                    <CloseButton aria-label="DeleteAccount" onClick={deleteConfirm.onOpen} isDisabled={!allowEdit} />
                    <Alert leastDestructiveRef={cancelRef} isOpen={deleteConfirm.isOpen} onClose={deleteConfirm.onClose}
                        title="删除用户" body={`确定删除用户${qq}吗？`} onConfirm={handleDeleteUser}> </Alert>
                    <Alert leastDestructiveRef={cancelRef} isOpen={disableConfirm.isOpen} onClose={disableConfirm.onClose}
                        title={`${userDisabled ? "启用" : "禁用"}用户`} body={`确定${userDisabled ? "启用" : "禁用"}用户${qq}吗？`}
                        onConfirm={handleDisableUser}> </Alert>
                </Flex>
            </CardHeader>
            <CardBody>
                <Stack>
                    <Text>{`${accountCount} 个账户`}</Text>
                    <Checkbox isChecked={clan} onChange={handleClanUser} isDisabled={!allowManage}>公会管理</Checkbox>
                    <Checkbox isChecked={admin} onChange={handleAdminUser} isDisabled={!allowManage}>管理员</Checkbox>
                </Stack>
            </CardBody>
            <CardFooter>
                <SimpleGrid columns={2} spacing={4}>
                    <Button colorScheme='pink' aria-label="UserResetPassword" leftIcon={<FiUnlock />}
                        onClick={startRstPwd} isDisabled={!allowEdit}>重设密码</Button>
                </SimpleGrid>
            </CardFooter>
        </Card>
    )
}
