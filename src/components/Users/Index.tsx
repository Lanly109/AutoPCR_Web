import {
    AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay,
    Button,
    Card, CardBody, CardFooter, CardHeader,
    Checkbox,
    CloseButton,
    Flex, FormLabel, HStack, Input,
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
import { createUser, deleteUser, getAllUsers, putUser, useUserRole } from "@api/Account.ts";
import { AxiosError } from "axios";
import { UserInfo } from "@interfaces/UserInfo.ts";

export default function Users() {
    const cancelRef = React.useRef<FocusableElement>(null)
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

    const creatUserConfirm = useDisclosure()
    const [newUserQid, setNewUserQid] = useState<string>("")
    const [newUserQidErr, setNewUserQidErr] = useState<string>("")
    const [newUserPwd, setNewUserPwd] = useState<string>("")
    const [newUserPwdErr, setNewUserPwdErr] = useState<string>("")
    const [newUserClan, setNewUserClan] = useState<boolean>(false)
    const [newUserAdmin, setNewUserAdmin] = useState<boolean>(false)
    const [newUserDisabled, setNewUserDisabled] = useState<boolean>(false)
    const startCreateUser = () => {
        setNewUserQid("")
        setNewUserPwd("")
        setNewUserClan(false)
        setNewUserAdmin(false)
        setNewUserDisabled(false)
        creatUserConfirm.onToggle()
    }
    const handleCreateUser = () => {
        if (newUserQid == "" || newUserPwd == "") {
            if (newUserQid == "") {
                setNewUserQidErr("请输入 QQ 号")
            }
            if (newUserPwd == "") {
                setNewUserPwdErr("请输密码")
            }
            return
        }
        const newUser: UserInfo = {
            password: newUserPwd,
            clan: newUserClan,
            admin: newUserAdmin,
            disabled: newUserDisabled
        }
        createUser(newUserQid, newUser).then(res => {
            toast({ status: 'success', title: '创建用户成功', description: res });
            creatUserConfirm.onToggle();
            freshUserInfo.onToggle()
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '创建用户失败', description: err?.response?.data as string || '网络错误' });
        });
    }

    return (
        <Stack height={'100%'}>
            <Stack>
                <SimpleGrid spacing={2} templateColumns='repeat(auto-fill, minmax(100px, 1fr))'>
                    <Button colorScheme="blue" onClick={startCreateUser}>创建用户</Button>
                    <AlertDialog leastDestructiveRef={cancelRef} isOpen={creatUserConfirm.isOpen} onClose={creatUserConfirm.onClose}>
                        <AlertDialogOverlay>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    创建用户
                                </AlertDialogHeader>
                                <AlertDialogBody>
                                    <Stack>
                                        <FormLabel>QQ</FormLabel>
                                        <Input type='text' placeholder='请输入 QQ' value={newUserQid}
                                            onChange={(event) => setNewUserQid(event.target.value)}
                                            isInvalid={newUserQidErr !== ""} />
                                        {newUserQidErr != "" && <Text color={'red'}>{newUserQidErr}</Text>}
                                        <FormLabel>密码</FormLabel>
                                        <Input type='password' placeholder='请输入密码' value={newUserPwd}
                                            onChange={(event) => setNewUserPwd(event.target.value)}
                                            isInvalid={newUserPwdErr !== ""} />
                                        {newUserPwdErr != "" && <Text color={'red'}>{newUserPwdErr}</Text>}
                                        <Checkbox isChecked={newUserClan} onChange={event => setNewUserClan(event.target.checked)}>公会管理</Checkbox>
                                        <Checkbox isChecked={newUserDisabled} onChange={event => setNewUserDisabled(event.target.checked)}>禁用</Checkbox>
                                        {role?.super_user && <Checkbox isChecked={newUserAdmin} onChange={event => setNewUserAdmin(event.target.checked)}>管理员</Checkbox>}
                                    </Stack>
                                </AlertDialogBody>
                                <AlertDialogFooter>
                                    <HStack>
                                        <Button onClick={creatUserConfirm.onClose}>取消</Button>
                                        <Button colorScheme='red' onClick={handleCreateUser}>确定</Button>
                                    </HStack>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialogOverlay>
                    </AlertDialog>
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

    const [newPwd, setNewPwd] = useState<string>("")
    const [newPwdErr, setNewPwdErr] = useState<string>("")
    const [newPwdRepeat, setNewPwdRepeat] = useState<string>("")
    const [newPwdRepeatErr, setNewPwdRepeatErr] = useState<string>("")
    const pwdConfirm = useDisclosure()
    const startRstPwd = () => {
        setNewPwd("")
        setNewPwdErr("")
        setNewPwdRepeat("")
        setNewPwdRepeatErr("")
        pwdConfirm.onOpen()
    }
    const handleNewPassword = () => {
        setNewPwdErr("")
        setNewPwdRepeatErr("")
        if (newPwd == "" || newPwdRepeat == "") {
            if (newPwd == "") {
                setNewPwdErr("请输入新密码！")
            }
            if (newPwdRepeat == "") {
                setNewPwdRepeatErr("再次输入新密码！")
            }
            return
        }
        if (newPwd != newPwdRepeat) {
            setNewPwdErr("两次输入密码不一致！")
            setNewPwdRepeatErr("两次输入密码不一致！")
            return
        }
        pwdConfirm.onClose()

        handleUpdateUser({
            password: newPwd
        }, pwdConfirm.onClose)
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
                    <AlertDialog leastDestructiveRef={cancelRef} isOpen={pwdConfirm.isOpen} onClose={pwdConfirm.onClose}>
                        <AlertDialogOverlay>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    重设密码
                                </AlertDialogHeader>
                                <AlertDialogBody>
                                    <FormLabel>新密码</FormLabel>
                                    <Stack>
                                        <Input type='password' placeholder='请输入新密码' value={newPwd}
                                            onChange={(event) => setNewPwd(event.target.value)}
                                            isInvalid={newPwdErr !== ""} />
                                        {newPwdErr != "" && <Text color={'red'}>{newPwdErr}</Text>}
                                        <FormLabel>再次输入新密码</FormLabel>
                                        <Input type='password' placeholder='请再次输入新密码' value={newPwdRepeat}
                                            onChange={(event) => setNewPwdRepeat(event.target.value)}
                                            isInvalid={newPwdRepeatErr !== ""} />
                                        {newPwdRepeatErr != "" && <Text color={'red'}>{newPwdRepeatErr}</Text>}
                                    </Stack>
                                </AlertDialogBody>
                                <AlertDialogFooter>
                                    <HStack>
                                        <Button onClick={pwdConfirm.onClose}>取消</Button>
                                        <Button colorScheme='red' onClick={handleNewPassword}>确定</Button>
                                    </HStack>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialogOverlay>
                    </AlertDialog>
                </SimpleGrid>
            </CardFooter>
        </Card>
    )
}
