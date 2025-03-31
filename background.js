// 更新拦截规则
function updateRules(rule, sendResponse) {
    if (!rule.ruleId) {
        sendResponse && sendResponse({status: 'error', message: 'ruleId异常，设置规则失败！'})
        return
    }
    if (rule.isEnabled) {
        chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [{
                id: rule.ruleId, // 使用整数 ID
                priority: 1,
                action: {
                    type: "redirect",
                    redirect: {
                        url: "data:application/json," + encodeURIComponent(rule.data)
                    }
                },
                condition: {
                    urlFilter: rule.targetUrl,
                    resourceTypes: ["xmlhttprequest"]
                }
            }],
            removeRuleIds: [rule.ruleId] // 使用整数数组
        }, () => {
            sendResponse && sendResponse({status: 'success', message: `已添加规则 ${rule.ruleId}`})
        });
    } else {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [rule.ruleId] // 使用整数数组
        }, () => {
            sendResponse && sendResponse({status: 'success', message: `已删除规则 ${rule.ruleId}`})
        });
    }
}

chrome.action.onClicked.addListener(async () => {
    // 获取扩展内页面的完整URL
    const extensionUrl = chrome.runtime.getURL("dist/index.html");

    try {
        // 查询所有窗口中是否已存在该页面的标签页
        const tabs = await chrome.tabs.query({url: extensionUrl});

        if (tabs.length > 0) {
            // 如果找到，激活最先找到的那个标签页
            const existingTab = tabs[0];
            await chrome.tabs.update(existingTab.id, {active: true});
            await chrome.windows.update(existingTab.windowId, {focused: true});
        } else {
            // 如果不存在，创建新标签页
            await chrome.tabs.create({url: extensionUrl});
        }
    } catch (error) {
        console.error("Error handling tab:", error);
        // 出错时也创建新标签页作为回退
        await chrome.tabs.create({url: extensionUrl});
    }
});

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log(`Tab ${tabId} closed, removing rules...`);
    // 移除动态规则
    // 首先获取当前所有规则的ID
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
        const ruleIds = []

        rules.forEach(rule => {
            if (!rule.link) {
                ruleIds.push(rule.id)
            } else {
                ruleIds.push(...rule.link)
            }
        });
        // 然后删除所有规则
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIds
        }, () => {
            console.log(`已删除 ${ruleIds.length} 条规则`);
        });
    });
});

// 监听规则匹配事件（仅在开发模式下生效）
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    console.log("Rule matched:", info);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "initRules") {
        request.rules.forEach(rule => {
            if (rule.type === 'request-redirect') {
                updateRequestRules(rule)
            } else {
                updateRules(rule)
            }
        })
    } else if (request.action === "updateRule") {
        if (request.rule) {
            if (request.rule.type === 'request-redirect') {
                updateRequestRules(request.rule, sendResponse)
            } else {
                updateRules(request.rule, sendResponse)
            }
        }
        return true; // 保持通道开放
    } else if (request.action === "removeRule") {
        if (request.rule.ruleId) {
            if (!request.rule.link) {
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [request.rule.ruleId]
                }, () => {
                    sendResponse({status: 'success', message: `已删除规则 ${request.rule.ruleId}`})
                });
            } else {
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: request.rule.link
                }, () => {
                    sendResponse({status: 'success', message: `已删除规则 ${request.rule.ruleId}`})
                });
            }
        }
        return true; // 保持通道开放
    } else if (request.action === "removeAllRules") {
        // 首先获取当前所有规则的ID
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
            const ruleIds = rules.map(rule => rule.id);
            // 然后删除所有规则
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIds
            }, () => {
                sendResponse({status: 'success', message: `已删除 ${ruleIds.length} 条规则`})
            });
        });
        return true; // 保持通道开放
    }
});

function updateRequestRules(rule, sendResponse) {
    if (!rule.ruleId) {
        sendResponse && sendResponse({status: 'error', message: 'ruleId异常，设置规则失败！'})
        return
    }
    if (rule.isEnabled) {

        let newUrl = rule.newUrl
        let Referer = rule.newUrl
        let redirect = {
            url: rule.newUrl
        }

        if (rule.redirectMode === 'host-redirect') {
            redirect = {
                transform: {
                    scheme: rule.redirectScheme,
                    host: rule.redirectHost,
                    port: rule.redirectPort || ''
                }
            }
            newUrl = '||' + rule.redirectHost
            Referer = `${rule.redirectScheme}://${rule.redirectHost}${rule.redirectPort ? (":" + rule.redirectPort) : ''}`
        }

        let requestHeaders = [
            {
                header: "Referer",
                operation: "set",
                value: Referer
            },
            {
                header: "test-data",
                operation: "set",
                value: Referer
            }
        ]

        if (rule.newHeader) {
            try {
                let fixedStr = rule.newHeader.replace(/(\w+):/g, '"$1":')
                let newHeader = JSON.parse(fixedStr)
                Object.keys(newHeader).forEach(key => {
                    if (key !== 'Referer') {
                        requestHeaders.push({
                            header: key,
                            operation: "set",
                            value: newHeader[key].toString()
                        })
                    }
                })
            } catch (e) {
                requestHeaders = [
                    {
                        header: "Referer",
                        operation: "set",
                        value: Referer
                    }
                ]
            }
        }


        chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [
                {
                    id: rule.ruleId, // 使用整数 ID
                    priority: 1,
                    action: {
                        type: "redirect",
                        redirect: redirect
                    },
                    condition: {
                        urlFilter: rule.targetUrl,
                        resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest"]
                    }
                },
                {
                    id: rule.link[1],
                    priority: 1,
                    action: {
                        type: "modifyHeaders",
                        requestHeaders: requestHeaders
                    },
                    condition: {
                        urlFilter: newUrl,
                        resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest"]
                    }
                },
                {
                    id: rule.link[2],
                    priority: 1,
                    action: {
                        type: "modifyHeaders",
                        responseHeaders: [
                            {
                                header: "Access-Control-Allow-Origin",
                                operation: "set",
                                value: "*"
                            },
                            {
                                header: "Access-Control-Allow-Credentials",
                                operation: "set",
                                value: "true"
                            },
                            {
                                header: "Referrer-Policy",
                                operation: "set",
                                value: "no-referrer-when-downgrade"
                            }
                        ]
                    },
                    condition: {
                        urlFilter: newUrl,
                        resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest"]
                    }
                }],
            removeRuleIds: rule.link // 使用整数数组
        }, () => {
            sendResponse && sendResponse({status: 'success', message: `已添加规则 ${rule.ruleId}`})
        });
    } else {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: rule.link // 使用整数数组
        }, () => {
            sendResponse && sendResponse({status: 'success', message: `已删除规则 ${rule.ruleId}`})
        });
    }
}