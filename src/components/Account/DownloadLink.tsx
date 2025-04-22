import { Link } from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useEffect, useState } from 'react';

interface DownloadLinkProps {
    logContent: string | undefined;
}

export function DownloadLink({ logContent }: DownloadLinkProps) {
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!logContent) return;

        // 匹配下载链接
        const downloadLinkMatch = logContent.match(/下载链接: (\/[^\s]+)/);
        if (downloadLinkMatch?.[1]) {
            // 添加 /daily 前缀
            const path = downloadLinkMatch[1];
            setDownloadUrl(`/daily${path}`);
        }
    }, [logContent]);

    if (!downloadUrl) return null;

    return (
        <Link href={downloadUrl} isExternal color="teal.500" fontWeight="medium">
            点击下载文件 <ExternalLinkIcon mx="2px" />
            <br />
        </Link>
    );
}
