import {
    AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay,
    Button,
    Card, CardBody, CardFooter, CardHeader,
    CloseButton,
    Flex, Input,
    SimpleGrid,
    Spacer,
    Stack,
    Switch, Text,
    useDisclosure, useToast
} from "@chakra-ui/react";
import Alert from "@components/alert.tsx";
import React, {useEffect, useState} from "react";
import {FocusableElement} from "@chakra-ui/utils";
import {FiUnlock} from "react-icons/fi";
import {deleteUser, getAllUsers, putUser} from "@api/Account.ts";
import {AxiosError} from "axios";
import {UserInfo} from "@interfaces/UserInfo.ts";

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

    return (
        <Stack height={'100%'}>
            <SimpleGrid spacing={4} templateColumns='repeat(auto-fill, minmax(250px, 1fr))'>
                {
                    users?.map((user) => {
                        return <UserInfoItem key={user.qq} qq={user.qq} onToggle={freshUserInfo.onToggle} admin={user.admin}
                                             userDisabled={user.disabled} accountCount={user.account_count} />
                    })
                }
            </SimpleGrid>
        </Stack>
    )
}

interface UserInfoProps {
    qq?: string
    userDisabled?: boolean
    admin?: boolean
    accountCount?: number
    onToggle: () => void
}

function UserInfoItem({ qq, userDisabled, admin, accountCount, onToggle }: UserInfoProps) {
    const cancelRef = React.useRef<FocusableElement>(null)
    const toast = useToast()

    const deleteConfirm = useDisclosure()
    const handleDeleteUser = () => {
        if (qq == undefined) {
            return
        }
        deleteUser(qq).then((res) => {
            toast({ status: 'success', title: `删除用户${qq}成功`, description: res });
            onToggle()
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: err?.response?.data as string || '网络错误' });
        });
    }

    const disableConfirm = useDisclosure()
    const adminConfirm = useDisclosure()
    const handleUpdateUser = (userInfo: UserInfo) => {
        if (qq == undefined) {
            return
        }
        putUser(qq, userInfo).then((res) => {
            toast({ status: 'success', title: `更新用户${qq}成功`, description: res });
            onToggle()
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: err?.response?.data as string || '网络错误' });
        });
    }

    const [newPwd, setNewPwd] = useState<string>("")
    const [newPwdErr, setNewPwdErr] = useState<string>("")
    const [newPwdRepeat, setNewPwdRepeat] = useState<string>("")
    const [newPwdRepeatErr, setNewPwdRepeatErr] = useState<string>("")
    const pwdConfirm = useDisclosure()
    const handleStartRstPwd = () => {
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
        })
    }

    return (
        <Card>
            <CardHeader>
                <Flex>
                    <Switch isChecked={!userDisabled} onChange={disableConfirm.onOpen}>{qq}</Switch>
                    <Spacer />
                    <CloseButton aria-label="DeleteAccount" onClick={deleteConfirm.onOpen} />
                    <Alert leastDestructiveRef={cancelRef} isOpen={deleteConfirm.isOpen} onClose={deleteConfirm.onClose}
                           title="删除用户" body={`确定删除用户${qq}吗？`} onConfirm={handleDeleteUser}> </Alert>
                    <Alert leastDestructiveRef={cancelRef} isOpen={disableConfirm.isOpen} onClose={disableConfirm.onClose}
                           title={`${userDisabled ? "启用" : "禁用"}用户`} body={`确定${userDisabled ? "启用" : "禁用"}用户${qq}吗？`}
                           onConfirm={() => handleUpdateUser({disabled: !userDisabled})}> </Alert>
                </Flex>
            </CardHeader>
            <CardBody>
                {`${accountCount} 个账户`}
            </CardBody>
            <CardFooter>
                <Stack>
                    <Switch isChecked={admin} onChange={adminConfirm.onOpen}>管理员</Switch>
                    <Alert leastDestructiveRef={cancelRef} isOpen={adminConfirm.isOpen} onClose={adminConfirm.onClose}
                           title="设置管理员" body={`确定${admin ? `取消用户${qq}` : `将用户${qq}设置为`}管理员吗？`}
                           onConfirm={() => handleUpdateUser({admin: !admin})}> </Alert>
                    <SimpleGrid columns={2} spacing={4}>
                        <Button colorScheme='pink' aria-label="UserResetPassword" leftIcon={<FiUnlock />} onClick={handleStartRstPwd}>重设密码</Button>
                        <AlertDialog leastDestructiveRef={cancelRef} isOpen={pwdConfirm.isOpen} onClose={pwdConfirm.onClose}>
                            <AlertDialogOverlay>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        重设密码
                                    </AlertDialogHeader>
                                    <AlertDialogBody>
                                        <Input type={'password'} placeholder='请输入新密码' value={newPwd}
                                               onChange={(event) => setNewPwd(event.target.value)}
                                               isInvalid={newPwdErr !== ""}/>
                                        {newPwdErr !== "" && <Text color={'red'}>{newPwdErr}</Text> }
                                        <Input type={'password'} placeholder='请再次输入新密码' value={newPwdRepeat}
                                               onChange={(event) => setNewPwdRepeat(event.target.value)}
                                               isInvalid={newPwdRepeatErr !== ""}/>
                                        {newPwdRepeatErr !== "" && <Text color={'red'}>{newPwdRepeatErr}</Text> }
                                    </AlertDialogBody>
                                    <AlertDialogFooter>
                                        <Button onClick={pwdConfirm.onClose}>取消</Button>
                                        <Button colorScheme='red' onClick={handleNewPassword}>确定</Button>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialogOverlay>
                        </AlertDialog>
                    </SimpleGrid>
                </Stack>
            </CardFooter>
        </Card>
    )
}
