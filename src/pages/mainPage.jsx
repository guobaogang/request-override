import React, {useState} from 'react';
import {Button, Drawer, Dropdown, Form, Input, Space, Switch, message} from "antd";
import {DeleteOutlined, DownOutlined} from '@ant-design/icons';
import './index.less'

const {TextArea} = Input;
let nextRuleId = 1;
const MainPage = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();
    const [rules, setRules] = useState([])
    const [openDrawer, setOpenDrawer] = useState(false)
    const [forceUpdate, setForceUpdate] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [editRule, setEditRule] = useState({});

    const handleMenuClick = (e) => {
        let tempId = nextRuleId++;
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
        }
        rules.push(tempRule)
        setRules(rules)
        setForceUpdate(!forceUpdate)
    }

    const menuProps = {
        items: [
            {label: '返回-数据代理', key: 'response-data'},
            {label: '返回-文件代理', key: 'response-file'},
            {label: '请求-重定向', key: 'request-redirect'}
        ],
        onClick: handleMenuClick,
    };

    const handleFileChange = (e, index) => {
        console.log('index', index)
        setCurrentIndex(index)
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            // 处理文件内容
            saveFileRule(e.target.result, index)
        };
        reader.readAsText(file);
        // e.target.value = ''
    }

    const handleEditData = (rule, index) => {
        setEditRule(rule)
        form.setFieldsValue(rule)
        setOpenDrawer(true)
        setCurrentIndex(index)
    }

    const setRuleUrl = (value, index) => {
        rules[index].targetUrl = value
        setRules(rules)
        setForceUpdate(!forceUpdate)
    }

    const saveUrlRule = (value, index) => {
        if (rules[index].data) {
            updateRuleToLocal(rules[index])
        }
    }

    const saveRule = (values) => {
        rules[currentIndex].targetUrl = values.targetUrl
        rules[currentIndex].data = values.data || ''
        rules[currentIndex].newUrl = values.newUrl || ''
        rules[currentIndex].newHeader = values.newHeader || ''
        setRules(rules)
        setOpenDrawer(false)
        updateRuleToLocal(rules[currentIndex])
    }

    const toggleRule = (checked, index) => {
        setCurrentIndex(index)
        rules[index].isEnabled = checked
        setRules(rules)
        setForceUpdate(!forceUpdate)
        updateRuleToLocal(rules[index])
    }

    const saveFileRule = (data, index) => {
        rules[index].data = data
        setRules(rules)
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
        chrome.runtime.sendMessage(
            {
                action: "removeRule", rule: rule
            },
            (response) => {
                showMessage(response)
            }
        );
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
                                                    allowClear
                                                    onBlur={(e) => {
                                                        saveUrlRule(e.target.value, index)
                                                    }}
                                                    onChange={(e) => setRuleUrl(e.target.value, index)}
                                                    disabled={rule.type === 'response-data' || rule.type === 'request-redirect' || !rule.isEnabled}
                                                    placeholder="代理url"
                                                    value={rule.targetUrl}/>
                                            </div>
                                            {
                                                rule.type === 'response-data' || rule.type === 'request-redirect' ?
                                                    <div>
                                                        <Button disabled={!rule.isEnabled}
                                                                onClick={() => handleEditData(rule, index)}>修改数据</Button>
                                                    </div> : <div>
                                                        <input disabled={!rule.isEnabled} type="file" id="fileInput"
                                                               accept=".txt,.json"
                                                               onChange={(e) => handleFileChange(e, index)}/>
                                                    </div>
                                            }
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
                                {editRule.type === 'request-redirect' ? <Form.Item
                                    label="重定向到"
                                    name="newUrl"
                                    rules={[
                                        {
                                            required: true,
                                            message: '输入重定向到url!',
                                        },
                                    ]}
                                >
                                    <Input allowClear/>
                                </Form.Item> : null}
                                {editRule.type === 'request-redirect' ? <Form.Item
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
                                </Form.Item> : null}
                                {editRule.type === 'response-data' ? <Form.Item
                                    className={'edit-rule-data'}
                                    label="代理数据"
                                    name="data"
                                    rules={[
                                        {
                                            message: '输入代理数据!',
                                        }
                                    ]}
                                >
                                    <TextArea/>
                                </Form.Item> : null}

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