import {
    Box,
    Button,
    Checkbox as ChakraCheckbox,
    Flex,
    Input,
    NativeSelect,
    Stack,
    Text,
    Textarea,
} from '@chakra-ui/react';
import NiceModal from '@ebay/nice-modal-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { putAccountConfig } from '@/api/Account';
import { ConfigInfo, ConfigValue } from '@/interfaces/Module';
import { Checkbox } from '../../components/ui/checkbox';
import { InputGroup } from '../../components/ui/input-group';
import { NumberInput, NumberInputField } from '../../components/ui/number-input';
import { Switch } from '../../components/ui/switch';
import { toaster } from '../../components/ui/toaster';
import multiSelectModal from './MultiSelectModal';
import singleSelectModal from './SingleSelectModal';

interface ConfigProps {
    alias: string;
    value: ConfigValue;
    info: ConfigInfo;
    /** 回写父级 Area；折叠卸载后再展开必须靠它 */
    onConfigUpdate?: (key: string, value: ConfigValue) => void;
}

const configSaveChains = new Map<string, Promise<unknown>>();

export function enqueueConfigSave<T>(alias: string, task: () => Promise<T>): Promise<T> {
    const prev = configSaveChains.get(alias) || Promise.resolve();
    const next = prev.catch(() => undefined).then(task);
    configSaveChains.set(
        alias,
        next.then(
            () => undefined,
            () => undefined,
        ),
    );
    return next;
}

// 通用错误工具已迁至 accountShared；此处 import 供本文件用并 re-export 兼容既有引用
import { getErrorDescription } from './accountShared';
export { getErrorDescription };


const ROW_H = '2.25rem';
const SINGLE_SEARCH_THRESHOLD = 30;

/** 统一的配置保存流：乐观写父级 → 排队保存 → 成功/失败 toast → 失败回滚父级与显示。
 *  各控件（Bool/Int/SingleSearch/Multi/Time/Text）共用，消灭五份手写模板。 */
function useConfigSaveFlow(
    alias: string,
    key: string,
    propValue: ConfigValue,
    onConfigUpdate?: (key: string, value: ConfigValue) => void,
) {
    const mountedRef = useRef(true);
    const valueRef = useRef(propValue);
    valueRef.current = propValue;
    // 最后确认值（服务器已知的状态）：初始=加载值，每笔保存成功推进。失败回滚一律回到它——
    // 若回到「上一笔提交值」，链式失败时那个值可能从未持久化成功，UI 会停在服务器从未见过的值上
    const lastConfirmedRef = useRef(propValue);
    // 在途乐观提交的身份标记（token=对象身份，不用值——primitive payload 同值两笔必须可区分）。
    // 双用途：①effect 区分「本组件乐观回显」与「外部更新」（导入/同步），外部更新时 lastConfirmed 必须跟进；
    // ②commit 各段「是不是自己」的判定（成功清标记/失败回滚守卫/失败清标记）
    const inflightRef = useRef<{ payload: ConfigValue; token: object } | null>(null);
    // 外部更新纪元：effect 每认定一次外部更新（导入/同步/bulk 直写）自增。commit 在途期间纪元未变时，
    // 成功后即使父级已被后笔乐观值改走，lastConfirmed 也应推进到本笔 payload（服务器此刻确实是它）
    const externalEpochRef = useRef(0);
    useEffect(() => {
        // 回显判定用值比较而非「是否有在途」：有在途但 propValue 不等于在途 payload = 外部更新（导入/同步），也要跟进；
        // 只跳过「恰好等于在途 payload」的乐观回显。无在途时必须显式判定（inflight !== null）：
        // ?.payload 的 undefined 会让「外部把值更新为 undefined」（bulk 回滚真实形态）被误判成回显而跳过跟进
        if (inflightRef.current !== null && valueRef.current === inflightRef.current.payload) return; // 自己的乐观回显
        if (valueRef.current !== lastConfirmedRef.current) {
            lastConfirmedRef.current = valueRef.current;
            externalEpochRef.current += 1;
        }
    }, [propValue]);
    const onUpdateRef = useRef(onConfigUpdate);
    onUpdateRef.current = onConfigUpdate;

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    /** 乐观提交一个新值，返回是否保存成功。显示态由调用方乐观设置，失败时经 onRollbackDisplay 恢复。 */
    const commit = async (
        payload: ConfigValue,
        opts?: {
            /** 失败时恢复组件自己的显示（参数=改动前的已保存值） */
            onRollbackDisplay?: (previous: ConfigValue) => void;
            /** 回滚写回父级的值与 previous 不同时用它转换（如 Multi 的 string[]→number[]） */
            rollbackPayload?: (previous: ConfigValue) => ConfigValue;
        },
    ): Promise<boolean> => {
        const token = {}; // 每笔唯一身份：同值两笔（blur 型控件无 dirty 检查）也能区分
        const epochAtStart = externalEpochRef.current;
        inflightRef.current = { payload, token };
        onUpdateRef.current?.(key, payload);
        try {
            const res = await enqueueConfigSave(alias, () => putAccountConfig(alias, key, payload));
            // 推进守卫：父级当前值仍等于本笔 payload，或本笔在途期间无外部更新（纪元未变）。
            // 后者兜住「不同值连笔」：前笔成功时父级已被后笔乐观值改走，但服务器此刻=前笔 payload，
            // 不推进的话后笔失败会回滚到比服务器更旧的值（已弹过「保存成功」却显示旧值）；
            // 外部更新情形仍不推进——bulk 在途直写父级 V2 后本笔成功，无条件推进会把它覆盖回 V1，此后 effect 不再触发，V1 永久 stale
            if (valueRef.current === payload || externalEpochRef.current === epochAtStart) {
                lastConfirmedRef.current = payload;
            }
            if (inflightRef.current?.token === token) inflightRef.current = null; // 后笔在途时保留标记
            if (mountedRef.current) {
                toaster.create({ type: 'success', title: '保存成功', description: res });
            }
            return true;
        } catch (err) {
            // 回滚守卫（双重）：①父级当前值仍等于本笔 payload——在途期间可能有后笔提交覆盖，无脑回滚会把后笔乐观值踩掉；
            // ②在途标记仍是本笔 token——同值后笔在途时父级的值虽等于 payload，但那是后笔的乐观值：
            //   本笔失败应跳过回滚（后笔自己会收尾），否则会出现「服务器=7、UI=旧值、还弹过保存成功」的 desync。
            // 契约：消费方必须传 onConfigUpdate 且父级回显同一引用，否则失败时显示回滚也会被此守卫跳过
            if (valueRef.current === payload && inflightRef.current?.token === token) {
                const confirmed = lastConfirmedRef.current;
                onUpdateRef.current?.(key, opts?.rollbackPayload ? opts.rollbackPayload(confirmed) : confirmed);
                if (mountedRef.current) {
                    opts?.onRollbackDisplay?.(confirmed);
                }
            }
            // 本笔结束：仅当在途标记仍是自己时清空（连点时后笔已覆盖标记，不能误清）
            if (inflightRef.current?.token === token) inflightRef.current = null;
            if (mountedRef.current) {
                toaster.create({ type: 'error', title: '保存失败', description: await getErrorDescription(err) });
            }
            return false;
        }
    };

    return { commit };
}


function useConfigState<T>(
    alias: string,
    key: string,
    propValue: T,
    onConfigUpdate?: (key: string, value: ConfigValue) => void,
) {
    const [state, setState] = useState<T>(propValue);
    const { commit } = useConfigSaveFlow(alias, key, propValue as ConfigValue, onConfigUpdate);

    useEffect(() => {
        setState(propValue);
    }, [propValue]);

    const save = async (newValue: T): Promise<void> => {
        setState(newValue);
        // 必须用回调入参 prev（最后确认值）：闭包 propValue 是渲染时快照，链式失败时可能已是别的值——
        // 回滚显示错值正是 lastConfirmedRef 要消灭的 desync 显示态版本
        await commit(newValue as ConfigValue, { onRollbackDisplay: (prev) => setState(prev as T) });
    };

    return [state, setState, save] as const;
}


function ConfigBool({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [checked, , save] = useConfigState(alias, info.key, value as boolean, onConfigUpdate);

    return (
        <InputGroup
            w="full"
            minH={ROW_H}
            alignItems="center"
            startElement={info.desc}
            endElement={
                <Switch
                    id={info.key}
                    size="md"
                    checked={checked}
                    onCheckedChange={(d) => save(!!d.checked)}
                />
            }
        />
    );
}

function ConfigInt({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const candNums = (info.candidates || []).map((c) => c.value).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const min = candNums.length ? Math.min(...candNums) : 0;
    const max = candNums.length ? Math.max(...candNums) : Number.MAX_SAFE_INTEGER;

    const [numStr, setNumStr] = useState(value === undefined ? '' : String(value));
    const { commit } = useConfigSaveFlow(alias, info.key, value, onConfigUpdate);

    useEffect(() => {
        setNumStr(value === undefined ? '' : String(value));
    }, [value]);

    const handleBlur = () => {
        // 改动前已保存的值：清空/非法时恢复它，失败回滚也用它
        const previous = value;
        const previousNum = typeof previous === 'number' ? previous : Number(previous);
        const parsed = Number(numStr);
        if (numStr === '' || isNaN(parsed)) {
            // 清空或非法输入：恢复为改动前的值，不保存
            setNumStr(Number.isFinite(previousNum) ? String(previousNum) : '');
            return;
        }
        let finalValue = Math.round(parsed); // 小数四舍五入取整
        if (finalValue < min) finalValue = min;
        if (finalValue > max) finalValue = max;
        if (Number.isFinite(previousNum) && finalValue === previousNum) {
            // 内容没变：只规范显示，不发保存
            setNumStr(String(finalValue));
            return;
        }
        setNumStr(String(finalValue));
        void commit(finalValue as ConfigValue, {
            onRollbackDisplay: (prev) => {
                const prevNum = typeof prev === 'number' ? prev : Number(prev);
                setNumStr(Number.isFinite(prevNum) ? String(prevNum) : String(min));
            },
        });
    };

    return (
        <InputGroup w="full" minH={ROW_H} alignItems="center" startElement={info.desc}>
            <Box
                w="18%"
                h={ROW_H}
                maxH={ROW_H}
                display="flex"
                alignItems="center"
                css={{
                    '& [data-part="root"]': {
                        height: ROW_H,
                        maxHeight: ROW_H,
                        width: '100%',
                    },
                    '& [data-part="input"]': {
                        height: ROW_H,
                        minHeight: ROW_H,
                        maxHeight: ROW_H,
                        py: 0,
                    },
                    '& [data-part="control"]': {
                        height: ROW_H,
                        maxHeight: ROW_H,
                        display: 'flex',
                        flexDirection: 'column',
                    },
                    '& [data-part="increment-trigger"], & [data-part="decrement-trigger"]': {
                        height: '1.125rem',
                        minHeight: '1.125rem',
                        maxHeight: '1.125rem',
                        flex: 1,
                    },
                }}
            >
                <NumberInput
                    value={numStr}
                    onValueChange={(e) => setNumStr(e.value)}
                    id={info.key}
                    min={min}
                    max={max}
                    size="sm"
                    w="full"
                    h={ROW_H}
                    maxH={ROW_H}
                >
                    <NumberInputField h={ROW_H} minH={ROW_H} maxH={ROW_H} py={0} onBlur={handleBlur} />
                </NumberInput>
            </Box>
        </InputGroup>
    );
}


function ConfigSingleSearch({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [localValue, setLocalValue] = useState<ConfigValue>(value);
    const { commit } = useConfigSaveFlow(alias, info.key, value, onConfigUpdate);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const displayText = (() => {
        const unit = info.candidates.find((u) => u.value === localValue);
        if (!unit) {
            return localValue === undefined || localValue === null || localValue === ''
                ? ''
                : String(localValue);
        }
        return unit.nickname ? unit.nickname : unit.display;
    })();

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const previousValue = localValue;
        try {
            const ret = (await NiceModal.show(singleSelectModal, {
                candidates: info.candidates,
                value: localValue,
            })) as ConfigValue | undefined;
            if (ret === undefined) return;

            // 乐观更新显示，失败再回滚
            setLocalValue(ret);
            await commit(ret, { onRollbackDisplay: (prev) => setLocalValue(prev) });
        } catch (err) {
            // NiceModal.show 本身的异常（如组件崩溃）：恢复显示
            setLocalValue(previousValue);
            try { await NiceModal.hide(singleSelectModal); } catch { /* ignore */ }
            toaster.create({ type: 'error', title: '打开选择器失败', description: await getErrorDescription(err) });
        }
    };

    return (
        <InputGroup
            w="1/3"
            minH={ROW_H}
            alignItems="center"
            startElement={info.desc}
            endElement={
                <Button size="sm" h={ROW_H} onClick={handleClick}>
                    选择
                </Button>
            }
        >
            <Input h={ROW_H} value={displayText} readOnly onClick={handleClick} cursor="pointer" />
        </InputGroup>
    );
}

function ConfigSingleSelect({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [selectValue, , save] = useConfigState(alias, info.key, value as string | number, onConfigUpdate);

    return (
        <InputGroup w="1/4" minH={ROW_H} alignItems="center" startElement={info.desc}>
            <NativeSelect.Root size="sm" w="full" flex="1">
                <NativeSelect.Field
                    h={ROW_H}
                    id={info.key}
                    value={selectValue}
                    onChange={(e) => {
                        // 优先按候选值原本的类型保存，避免"01"这类字符串被强转成数字
                        const match = info.candidates.find((c) => String(c.value) === e.target.value);
                        const newValue: ConfigValue = match
                            ? (match.value as string | number)
                            : (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value));
                        void save(newValue);
                    }}
                >
                    {info.candidates.map((element) => (
                        <option
                            key={element.value as string | number}
                            value={element.value as string | number}
                        >
                            {element.display}
                        </option>
                    ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
            </NativeSelect.Root>
        </InputGroup>
    );
}

/** 路由组件：条件分支里不调用 Hook，避免违反 Rules of Hooks */
function ConfigSingle(props: ConfigProps) {
    if ((props.info.candidates?.length || 0) >= SINGLE_SEARCH_THRESHOLD) {
        return <ConfigSingleSearch {...props} />;
    }
    return <ConfigSingleSelect {...props} />;
}


function ConfigMulti({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const initialStrArr = useMemo(
        () => ((value as (string | number)[] | undefined) ?? []).map(String),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(value)],
    );

    const [groupValue, setGroupValue] = useState(initialStrArr);
    const { commit } = useConfigSaveFlow(alias, info.key, value, onConfigUpdate);

    useEffect(() => {
        setGroupValue(initialStrArr);
    }, [initialStrArr]);

    const handleSave = (newStrArr: string[]) => {
        let postValue: ConfigValue = newStrArr;
        const intArr = newStrArr.map(Number);
        if (intArr.length > 0 && intArr.every((n) => !isNaN(n))) postValue = intArr;

        // 乐观回写，失败经统一流回滚（显示与父级都必须用回调入参 prev=最后确认值：
        // 闭包 initialRef 是点击时快照，链式失败时可能已被前笔乐观回写污染，画出从未确认过的值）
        setGroupValue(newStrArr);
        void commit(postValue, {
            onRollbackDisplay: (prev) => setGroupValue(Array.isArray(prev) ? prev.map(String) : []),
            rollbackPayload: (prev) => {
                const rb = Array.isArray(prev) ? prev.map(String) : [];
                const ints = rb.map(Number);
                return ints.length > 0 && ints.every((n) => !isNaN(n)) ? ints : rb;
            },
        });
    };

    return (
        <InputGroup w="full" minH={ROW_H} alignItems="center" startElement={info.desc}>
            <ChakraCheckbox.Group
                value={groupValue}
                w="full"
                px={2}
                onValueChange={(param: string[] | { value: string[] }) => {
                    const newValue = Array.isArray(param) ? param : param.value;
                    handleSave(newValue);
                }}
            >
                <Flex flexWrap="wrap" gap={3} align="center" w="full" py={1}>
                    {info.candidates.map((element) => (
                        <Checkbox
                            key={element.value as string | number}
                            value={String(element.value)}
                        >
                            {element.display}
                        </Checkbox>
                    ))}
                </Flex>
            </ChakraCheckbox.Group>
        </InputGroup>
    );
}


function ConfigTime({ alias, value, info, onConfigUpdate }: ConfigProps) {
    // 与 ConfigText 同口径兜底：后端缺失该 time 配置时 value 为 undefined，直传 Input 会变非受控组件
    const [timeStr, setTimeStr] = useState((value ?? '') as string);
    const { commit } = useConfigSaveFlow(alias, info.key, value, onConfigUpdate);

    useEffect(() => {
        setTimeStr((value ?? '') as string);
    }, [value]);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const previous = (value ?? '') as string;
        const newValue = e.target.value;
        if (newValue === previous) return; // 内容没变：不保存
        const m = newValue.match(/^(\d{2}):(\d{2})$/);
        if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) {
            // 格式不对：恢复原值并提示，不保存
            setTimeStr(previous);
            toaster.create({ type: 'warning', title: '时间格式应为 HH:MM（0-23:0-59），未保存' });
            return;
        }
        setTimeStr(newValue);
        void commit(newValue as ConfigValue, {
            onRollbackDisplay: (prev) => setTimeStr((prev ?? '') as string),
        });
    };

    return (
        <InputGroup w="min" minH={ROW_H} alignItems="center" startElement={info.desc}>
            <Input
                type="time"
                h={ROW_H}
                size="sm"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                onBlur={handleBlur}
                id={info.key}
            />
        </InputGroup>
    );
}


function ConfigText({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [textStr, setTextStr] = useState((value ?? '') as string);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { commit } = useConfigSaveFlow(alias, info.key, value, onConfigUpdate);

    useEffect(() => {
        setTextStr((value ?? '') as string);
    }, [value]);

    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [textStr]);

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        const previous = (value ?? '') as string;
        const newValue = e.target.value;
        if (newValue === previous) return; // 内容没变：不保存
        setTextStr(newValue);
        void commit(newValue as ConfigValue, {
            onRollbackDisplay: (prev) => setTextStr((prev ?? '') as string),
        });
    };

    return (
        <Stack gap={1} w="full">
            <Text fontSize="sm" color="fg.muted">
                {info.desc}
            </Text>
            <Textarea
                ref={textareaRef}
                value={textStr}
                onChange={(e) => setTextStr(e.target.value)}
                onBlur={handleBlur}
                id={info.key}
                minH={ROW_H}
            />
        </Stack>
    );
}


function ConfigMultiSearch({ alias, value, info, onConfigUpdate }: ConfigProps) {
    const [localValue, setLocalValue] = useState<ConfigValue>(value);
    const { commit } = useConfigSaveFlow(alias, info.key, value, onConfigUpdate);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const displayValue = ((localValue || []) as number[]).map((id) => {
        const unit = info.candidates.find((u) => u.value === id);
        return unit ? (unit.nickname ? unit.nickname : unit.display) : String(id);
    });

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const previousValue = localValue;
        try {
            const ret = (await NiceModal.show(multiSelectModal, {
                candidates: info.candidates,
                value: (localValue ?? []) as ConfigValue[],
            })) as ConfigValue;
            if (ret === undefined) return;

            // show 关闭后已 resolve，成功路径不要再 hide，否则可能进 catch 误回滚
            setLocalValue(ret);
            await commit(ret, { onRollbackDisplay: (prev) => setLocalValue(prev) });
        } catch (err) {
            // NiceModal.show 本身的异常（如组件崩溃）：恢复显示
            setLocalValue(previousValue);
            try { await NiceModal.hide(multiSelectModal); } catch { /* ignore */ }
            toaster.create({ type: 'error', title: '打开选择器失败', description: await getErrorDescription(err) });
        }
    };

    return (
        <InputGroup
            w="1/3"
            minH={ROW_H}
            alignItems="center"
            startElement={info.desc}
            endElement={
                <Button size="sm" h={ROW_H} onClick={handleClick}>
                    选择
                </Button>
            }
        >
            <Input
                h={ROW_H}
                value={displayValue.join(', ')}
                readOnly
                onClick={handleClick}
                cursor="pointer"
            />
        </InputGroup>
    );
}

export default function Config({ alias, value, info, onConfigUpdate }: ConfigProps) {
    switch (info?.config_type) {
        case 'bool':
            return <ConfigBool alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'int':
            return <ConfigInt alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'single':
            return <ConfigSingle alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'multi':
            return <ConfigMulti alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'time':
            return <ConfigTime alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'text':
            return <ConfigText alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        case 'multi_search':
            return <ConfigMultiSearch alias={alias} value={value} info={info} onConfigUpdate={onConfigUpdate} />;
        default:
            return null;
    }
}
