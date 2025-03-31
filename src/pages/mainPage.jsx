import React, {useEffect, useState} from 'react';
import {Button, Drawer, Dropdown, Form, Input, Space, Switch, message, Select, Radio} from "antd";
import {DeleteOutlined, DownOutlined} from '@ant-design/icons';
import './index.less'

const {TextArea} = Input;
let nextRuleId = 1;
const saveRuleKey = 'request-override-rules-data';
const MainPage = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();
    const [rules, setRules] = useState([])
    const [openDrawer, setOpenDrawer] = useState(false)
    const [forceUpdate, setForceUpdate] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [editRule, setEditRule] = useState({});
    const [currentMode, setCurrentMode] = useState(null);

    useEffect(() => {
        initData();
    }, [])

    const initData = async () => {
        let localData = await getLargeData(saveRuleKey)
        if (localData) {
            localData = JSON.parse(localData)
            nextRuleId = localData.nextRuleId + 1
            setRules(localData.rules)
            initRules(localData.rules)
        }
    }

    // 读取大数据
    async function getLargeData(key) {
        const result = await chrome.storage.local.get([key]);
        if (!result[key]) return null;

        const jsonStr = result[key].join('');
        return JSON.parse(jsonStr);
    }

    const initRules = (rules) => {
        chrome.runtime.sendMessage(
            {
                action: "initRules", rules: rules
            }
        );
    }

    const handleMenuClick = (e) => {
        let tempId = nextRuleId++
        let tempRule = {
            ruleId: tempId,
            type: e.key,
            targetUrl: '',
            newUrl: '',
            newHeader: '',
            isEnabled: true,
            data: ''
        }
        if (e.key === 'request-redirect') {
            tempRule.link = [tempId, nextRuleId++, nextRuleId++]
            tempRule.redirectMode = 'host-redirect'
            setCurrentMode('host-redirect')
        }
        rules.push(tempRule)
        setRules(rules)
        saveRuleToLocal(rules)
        setForceUpdate(!forceUpdate)
    }

    const menuProps = {
        items: [
            {label: '返回-数据代理', key: 'response-data'},
            {label: '请求-重定向', key: 'request-redirect'}
        ],
        onClick: handleMenuClick,
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            // 处理文件内容
            form.setFieldsValue({
                data: e.target.result
            })
        };
        reader.readAsText(file);
        // e.target.value = ''
    }

    const handleEditData = (rule, index) => {
        setEditRule(rule)
        setCurrentMode(rule.redirectMode)
        form.setFieldsValue(rule)
        setOpenDrawer(true)
        setCurrentIndex(index)
    }

    const saveRule = (values) => {
        rules[currentIndex].targetUrl = values.targetUrl.trim()
        rules[currentIndex].data = (values.data || '').trim()
        rules[currentIndex].newUrl = (values.newUrl || '').trim()
        rules[currentIndex].newHeader = (values.newHeader || '').trim()
        rules[currentIndex].redirectMode = values.redirectMode
        rules[currentIndex].redirectScheme = values.redirectScheme
        rules[currentIndex].redirectHost = values.redirectHost
        rules[currentIndex].redirectPort = values.redirectPort
        setRules(rules)
        saveRuleToLocal(rules)
        setOpenDrawer(false)
        updateRuleToLocal(rules[currentIndex])
    }

    const toggleRule = (checked, index) => {
        setCurrentIndex(index)
        rules[index].isEnabled = checked
        setRules(rules)
        saveRuleToLocal(rules)
        setForceUpdate(!forceUpdate)
        updateRuleToLocal(rules[index])
    }

    const updateRuleToLocal = (rule) => {
        chrome.runtime.sendMessage(
            {
                action: "updateRule", rule: rule
            },
            (response) => {
                showMessage(response)
            }
        );
    }

    const removeAllRules = () => {
        setRules([])
        saveRuleToLocal()
        chrome.runtime.sendMessage(
            {
                action: "removeAllRules"
            },
            (response) => {
                showMessage(response)
            }
        );
    }

    const removeRule = (rule, index) => {
        rules.splice(index, 1)
        setRules(rules)
        setForceUpdate(!forceUpdate)
        saveRuleToLocal(rules)
        chrome.runtime.sendMessage(
            {
                action: "removeRule", rule: rule
            },
            (response) => {
                showMessage(response)
            }
        );
    }

    const saveRuleToLocal = async (rules) => {
        if (!rules) {
            // 异步删除
            chrome.storage.local.remove(saveRuleKey, () => {
                console.log('数据已删除');
            });
            return
        }
        await storeLargeData(saveRuleKey, JSON.stringify({nextRuleId, rules}))
    }


    // 存储大数据
    async function storeLargeData(key, largeData) {
        const jsonStr = JSON.stringify(largeData);
        const chunkSize = 4000; // 小于限制的大小
        const chunks = [];

        for (let i = 0; i < jsonStr.length; i += chunkSize) {
            chunks.push(jsonStr.slice(i, i + chunkSize));
        }

        await chrome.storage.local.set({[key]: chunks});
    }


    const showMessage = (msg) => {
        messageApi.open({
            type: msg.status,
            content: msg.message
        });
    }

    return (
        <>
            {contextHolder}
            <div className={'main-page'}>
                <div className="header">
                    <Dropdown menu={menuProps}>
                        <Button type={'primary'}>
                            <Space>
                                新增规则
                                <DownOutlined/>
                            </Space>
                        </Button>
                    </Dropdown>
                    <div className={'remove-all'}>
                        <Button type={'primary'} danger onClick={removeAllRules}>
                            清除所有规则
                        </Button>
                        <span className={'description'}>
                        为了防止意外情况导致之前规则残留，可以在这手动清除所有规则
                    </span>
                    </div>
                </div>
                <div className="content">
                    <div className={'rules'}>
                        <Space
                            direction="vertical"
                            size="middle"
                            style={{
                                display: 'flex',
                            }}
                        >
                            {
                                rules.map((rule, index) => {
                                    return <div className="rule" key={rule.ruleId}>
                                        <div>
                                            规则 {rule.ruleId}
                                        </div>
                                        <div>
                                            <Switch checkedChildren="开启" unCheckedChildren="关闭"
                                                    value={rule.isEnabled}
                                                    onChange={checked => toggleRule(checked, index)}/>
                                        </div>
                                        <div className={'rule-url'}>
                                            <Input
                                                disabled={true}
                                                placeholder="代理url"
                                                value={rule.targetUrl}/>
                                        </div>
                                        <div>
                                            <Button disabled={!rule.isEnabled}
                                                    onClick={() => handleEditData(rule, index)}>修改数据</Button>
                                        </div>
                                        <Button danger onClick={() => removeRule(rule, index)}
                                                icon={<DeleteOutlined/>}/>
                                    </div>
                                })
                            }
                        </Space>
                    </div>
                </div>
                <Drawer title="修改数据" width={'80%'} onClose={() => setOpenDrawer(false)} open={openDrawer}>
                    <div className="edit-rule-drawer">
                        <Form
                            form={form}
                            className={'edit-rule-form'}
                            name="basic"
                            onFinish={saveRule}
                            autoComplete="off"
                        >
                            <Form.Item
                                label="代理URL"
                                name="targetUrl"
                                rules={[
                                    {
                                        required: true,
                                        message: '输入url!',
                                    },
                                ]}
                            >
                                <Input allowClear/>
                            </Form.Item>
                            {editRule.type === 'request-redirect' ?
                                <>
                                    {/* */}
                                    <Form.Item name="redirectMode" label="代理模式"
                                               rules={[
                                                   {
                                                       required: true,
                                                       message: '选择代理模式!',
                                                   },
                                               ]}>
                                        <Radio.Group onChange={e => setCurrentMode(e.target.value)} value={currentMode}>
                                            <Radio value="host-redirect">host代理</Radio>
                                            <Radio value="url-redirect">接口代理</Radio>
                                        </Radio.Group>
                                    </Form.Item>
                                    {currentMode === 'url-redirect' ? <Form.Item
                                        label="重定向到"
                                        name="newUrl"
                                        rules={[
                                            {
                                                required: true,
                                                message: '输入重定向到的url!',
                                            },
                                        ]}
                                    >
                                        <Input allowClear/>
                                    </Form.Item> : <>
                                        <Form.Item name="redirectScheme" label="scheme"
                                                   rules={[
                                                       {
                                                           required: true,
                                                           message: '选择scheme!',
                                                       },
                                                   ]}>
                                            <Radio.Group>
                                                <Radio value="http">http</Radio>
                                                <Radio value="https">https</Radio>
                                            </Radio.Group>
                                        </Form.Item>
                                        <Form.Item label="host" name='redirectHost'
                                                   rules={[
                                                       {
                                                           required: true,
                                                           message: '输入重定向到的域名!',
                                                       },
                                                   ]}>
                                            <Input allowClear/>
                                        </Form.Item>
                                        <Form.Item label="端口" name='redirectPort'>
                                            <Input allowClear/>
                                        </Form.Item>
                                    </>}
                                    <Form.Item
                                        className={'edit-rule-data'}
                                        label="重定向header"
                                        name="newHeader"
                                        rules={[
                                            {
                                                message: '输入header!',
                                            }
                                        ]}
                                    >
                                        <TextArea/>
                                    </Form.Item>
                                </> : null}
                            {editRule.type !== 'request-redirect' ?
                                <>
                                    <Form.Item
                                        label="请选择json文件或者手动填入代理数据"
                                        name="datafile"
                                    >
                                        <input type="file" id="fileInput"
                                               accept=".txt,.json"
                                               onChange={(e) => handleFileChange(e)}/>
                                    </Form.Item>
                                    <Form.Item
                                        className={'edit-rule-data'}
                                        label="代理数据"
                                        name="data"
                                        rules={[
                                            {
                                                required: true,
                                                message: '输入代理数据!',
                                            }
                                        ]}
                                    >
                                        <TextArea/>
                                    </Form.Item>
                                </> : null}

                            <Form.Item label={null}>
                                <Button type="primary" htmlType="submit">
                                    保存
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>
                </Drawer>
            </div>
        </>
    );
};

export default MainPage