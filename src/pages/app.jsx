import React, {use, useState} from 'react';

const App = () => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [targetUrl, setTargetUrl] = useState('');
    const [expectedResponseData, setExpectedResponseData] = useState('');
    const [changed, setChanged] = useState(false)
    const [fileContent, setFileContent] = useState('')
    const [selectedValue, setSelectedValue] = useState('data')

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            // 处理文件内容
            setFileContent(e.target.result)
        };
        reader.readAsText(file);
        // e.target.value = ''
    }

    const handleSettingsUpdate = async () => {
        await storeLargeData('guo-request-override-responseData', fileContent)
        chrome.storage.local.set({
            isEnabled: isEnabled,
            targetUrl: targetUrl,
            responseData: !changed
        });
        setChanged(!changed)
    };

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

    return (
        <div style={{padding: '0 200px 0 20px'}}>
            <h1>AJAX Data Modifier Settings</h1>
            <div style={{display: "flex"}}>
                <label>
                    <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)}/>
                    启用代理
                </label>
                <input style={{flex: '1', marginLeft: '20px'}} type="text" placeholder="Enter target URL"
                       value={targetUrl}
                       onChange={(e) => setTargetUrl(e.target.value)}/>
            </div>
            <div className="radio-group">
                <label key={'file'} className="radio-option">
                    <input
                        type="radio"
                        name={'读取文件'}
                        value={'file'}
                        checked={selectedValue === 'file'}
                        onClick={()=>setSelectedValue('file')}
                    />
                    <span className="radio-label">{'读取文件'}</span>
                </label>
                <label key={'data'} className="radio-option">
                    <input
                        type="radio"
                        name={'读取数据'}
                        value={'file'}
                        checked={selectedValue === 'data'}
                        onClick={()=>setSelectedValue('data')}
                    />
                    <span className="radio-label">{'读取数据'}</span>
                </label>
            </div>
            <div style={{display: selectedValue === 'data' ? 'none' : ''}} >
                <input type="file" id="fileInput"
                       accept=".txt,.json" onChange={handleFileChange}/>
            </div>
            <div style={{width: '100%', display: selectedValue === 'file' ? 'none' : ''}}>
                <textarea style={{width: '100%', marginTop: '20px', height: '500px'}}
                          placeholder="Enter expected response data" value={expectedResponseData}
                          onChange={(e) => setExpectedResponseData(e.target.value)}></textarea>
            </div>
            <button onClick={handleSettingsUpdate}>Save Settings</button>
        </div>
    );
};

export default App