import { getAccountValidate, postAccountValidate } from '@api/Account';
// @ts-ignore
import Geetest from 'react-geetest';
import NiceModal from '@ebay/nice-modal-react';
import ValidateModal from './ValidateModal';
import { AxiosError } from 'axios';
import { useToast } from '@chakra-ui/react';

export interface ValidateProps {
    id: string;
    userid: string;
    gt: string;
    challenge: string;
    onClose?: () => void;
}

interface GeetestResponse {
    geetest_challenge: string;
    geetest_validate: string;
    geetest_seccode: string;
}

export function QueryValidate(toast: ReturnType<typeof useToast>, alias: string, left_cnt = 120) {
    if (left_cnt < 0) {
        toast({ status: 'error', title: '验证查询超时' });
        return;
    }
    getAccountValidate(alias).then(async (res) => {
        if (res.status === 'empty') {
            setTimeout(QueryValidate, 1000, toast, alias, left_cnt - 1);
        } else if (res.status == "ok") {
            // do nothing
        } else {
            setTimeout(QueryValidate, 1000, toast, alias);
            await NiceModal.show(ValidateModal, { alias: alias, id: res.id, userid: res.userid, gt: res.gt, challenge: res.challenge });
        }
    }).catch((err: AxiosError) => {
        toast({ status: 'error', title: '验证查询失败', description: err?.response?.data as string || "网络错误" });
    })
}

export default function Validate({ id, userid, gt, challenge, onClose }: ValidateProps) {
    const toast = useToast()
    const onSuccess = (isSuccess: GeetestResponse) => {
        const { geetest_challenge, geetest_validate } = isSuccess;
        postAccountValidate(id, geetest_challenge, geetest_validate, userid).then(() => {
            if (typeof (onClose) === 'undefined') {
                window.close();
            } else {
                onClose();
            }
        }).catch((err: AxiosError) => {
            toast({ title: '发送验证信息失败', status: 'error', description: err?.response?.data as string || '网络问题' });
        });
    }

    return (
        <Geetest
            gt={gt}
            challenge={challenge}
            onSuccess={onSuccess}
            https={true}
            width="300px"
            captch_type={1}
            gs={1}
            offline={true}
        />
    );
}
