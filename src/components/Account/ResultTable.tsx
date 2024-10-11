import { DailyResult } from './DailyResult';
import { SingleResult } from './SingleResult';

export function ResultTable({ url }: { url: string }) {
    const is_daily = url.includes('daily_result');
    const Model = is_daily ? DailyResult : SingleResult;

    return (
        <Model url={url} />
    )
}
