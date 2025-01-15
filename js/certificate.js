// 添加创建证书相关函数
function showCreateCertModal() {
    const content = `
        <div style="padding: 20px;">
            <div class="modal-form-item" style="margin-bottom: 24px;">
                <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">类型</label>
                <div class="modal-radio-group" style="display: flex; gap: 24px;">
                    <label class="modal-radio" style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="certType" value="upload" checked style="margin-right: 6px;">
                        <span style="color: #606266;">上传证书</span>
                    </label>
                    <label class="modal-radio" style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="certType" value="code" style="margin-right: 6px;">
                        <span style="color: #606266;">证书代码</span>
                    </label>
                </div>
            </div>

            <div id="certFields">
                <!-- 根据类型显示不同的字段 -->
            </div>
        </div>
    `;
    
    showModal('创建证书', content, submitCreateCert);

    // 添加类型切换事件
    const typeRadios = document.querySelectorAll('input[name="certType"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', updateCertFields);
    });

    // 初始化字段
    updateCertFields();
}

// 添加更新证书字段的函数
function updateCertFields() {
    const selectedType = document.querySelector('input[name="certType"]:checked').value;
    const certFields = document.getElementById('certFields');
    
    if (selectedType === 'upload') {
        certFields.innerHTML = `
            <div class="modal-form-item" style="margin-bottom: 24px;">
                <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">证书文件</label>
                <div class="upload-box" onclick="document.getElementById('certFile').click()" 
                    style="width: 100%; height: 120px; border: 2px dashed #dcdfe6; border-radius: 4px; 
                           display: flex; flex-direction: column; justify-content: center; align-items: center; 
                           cursor: pointer; transition: all 0.3s;"
                    onmouseover="this.style.borderColor='#409eff'; this.querySelector('.upload-text').style.color='#409eff';"
                    onmouseout="this.style.borderColor='#dcdfe6'; this.querySelector('.upload-text').style.color='#606266';">
                    <i class="el-icon" style="margin-bottom: 8px; color: #909399;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke-width="2" stroke-linecap="round"/>
                            <path d="M17 8l-5-5-5 5" stroke-width="2" stroke-linecap="round"/>
                            <path d="M12 3v12" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </i>
                    <span class="upload-text" style="color: #606266; transition: color 0.3s;">点击上传证书文件</span>
                    <div style="margin-top: 4px; font-size: 12px; color: #909399;">支持 .pem 格式</div>
                </div>
                <input type="file" id="certFile" accept=".crt,.pem" style="display: none;" 
                       onchange="updateFileName(this, 'cert')">
                <div id="certFileName" style="margin-top: 8px; font-size: 14px; color: #606266;"></div>
            </div>

            <div class="modal-form-item" style="margin-bottom: 24px;">
                <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">密钥文件</label>
                <div class="upload-box" onclick="document.getElementById('keyFile').click()" 
                    style="width: 100%; height: 120px; border: 2px dashed #dcdfe6; border-radius: 4px; 
                           display: flex; flex-direction: column; justify-content: center; align-items: center; 
                           cursor: pointer; transition: all 0.3s;"
                    onmouseover="this.style.borderColor='#409eff'; this.querySelector('.upload-text').style.color='#409eff';"
                    onmouseout="this.style.borderColor='#dcdfe6'; this.querySelector('.upload-text').style.color='#606266';">
                    <i class="el-icon" style="margin-bottom: 8px; color: #909399;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke-width="2" stroke-linecap="round"/>
                            <path d="M17 8l-5-5-5 5" stroke-width="2" stroke-linecap="round"/>
                            <path d="M12 3v12" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </i>
                    <span class="upload-text" style="color: #606266; transition: color 0.3s;">点击上传密钥文件</span>
                    <div style="margin-top: 4px; font-size: 12px; color: #909399;">支持 .key 格式</div>
                </div>
                <input type="file" id="keyFile" accept=".key" style="display: none;" 
                       onchange="updateFileName(this, 'key')">
                <div id="keyFileName" style="margin-top: 8px; font-size: 14px; color: #606266;"></div>
            </div>
        `;
    } else {
        certFields.innerHTML = `
            <div class="modal-form-item" style="margin-bottom: 24px;">
                <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">证书内容</label>
                <textarea class="modal-form-input" id="certContent" placeholder="请输入证书内容" 
                    style="width: 100%; min-height: 120px; padding: 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266; transition: border-color 0.2s; resize: vertical;"></textarea>
            </div>
            <div class="modal-form-item" style="margin-bottom: 24px;">
                <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">密钥内容（key）</label>
                <textarea class="modal-form-input" id="keyContent" placeholder="请输入密钥内容" 
                    style="width: 100%; min-height: 120px; padding: 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266; transition: border-color 0.2s; resize: vertical;"></textarea>
            </div>
        `;
    }
}

// 添加更新文件名显示的函数
function updateFileName(input, type) {
    const fileName = input.files[0]?.name;
    if (fileName) {
        document.getElementById(`${type}FileName`).textContent = `已选择: ${fileName}`;
        // 更新上传框的样式
        const uploadBox = input.previousElementSibling;
        uploadBox.style.borderColor = '#67c23a';
        uploadBox.style.backgroundColor = '#f0f9eb';
        const uploadText = uploadBox.querySelector('.upload-text');
        uploadText.textContent = '更换文件';
        uploadText.style.color = '#67c23a';
    }
}

// 添加刷新证书列表的函数
async function refreshCertificateList() {
    try {
        const response = await fetch('/certificate/list');
        const certificates = await response.json();
        
        const tbody = document.querySelector('.certificate-table tbody');
        if (!certificates || certificates.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 60px 0; text-align: center; color: #909399;">
                        <div style="font-size: 14px;">暂无数据</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = certificates.map((cert, index) => `
            <tr>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${index + 1}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${cert.domain || '-'}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${cert.type === 'upload' ? '文件上传' : '代码输入'}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">
                    ${new Date(cert.expireTime).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    })}
                </td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">
                    <span style="display: inline-block; padding: 2px 10px; font-size: 12px; border-radius: 10px; ${
                        cert.status === 'valid' 
                        ? 'background-color: #e1f3d8; color: #67c23a;' 
                        : 'background-color: #fde2e2; color: #f56c6c;'
                    }">
                        ${cert.status === 'valid' ? '正常' : '已过期'}
                    </span>
                </td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">
                    <div class="button-group" style="display: flex; gap: 8px;">
                        <a href="javascript:void(0)" onclick="downloadCert('${cert.id}')" class="text-button" style="color: #409eff; font-size: 14px; text-decoration: none;">下载</a>
                        <span style="color: #dcdfe6;">|</span>
                        <a href="javascript:void(0)" onclick="renewCert('${cert.id}')" class="text-button" style="color: #409eff; font-size: 14px; text-decoration: none;">更新</a>
                        <span style="color: #dcdfe6;">|</span>
                        <a href="javascript:void(0)" onclick="deleteCertificate('${cert.id}')" class="text-button" style="color: #f56c6c; font-size: 14px; text-decoration: none;">删除</a>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('获取证书列表失败:', error);
    }
}

// 修改提交证书的函数，成功后刷新列表
async function submitCreateCert() {
    const type = document.querySelector('input[name="certType"]:checked').value;
    
    try {
        let formData = new FormData();
        formData.append('type', type);

        if (type === 'upload') {
            const certFile = document.getElementById('certFile').files[0];
            const keyFile = document.getElementById('keyFile').files[0];
            
            if (!certFile || !keyFile) {
                alert('请选择证书文件和密钥文件');
                return;
            }

            formData.append('cert', certFile);
            formData.append('key', keyFile);
        } else {
            const certContent = document.getElementById('certContent').value;
            const keyContent = document.getElementById('keyContent').value;

            if (!certContent || !keyContent) {
                alert('请输入证书内容和密钥内容');
                return;
            }

            formData.append('certContent', certContent);
            formData.append('keyContent', keyContent);
        }

        const response = await fetch('/certificate/create', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            alert('证书创建成功');
            closeModal();
            await refreshCertificateList();  // 刷新证书列表
        } else {
            alert('创建失败：' + (await response.text()));
        }
    } catch (error) {
        alert('创建失败：' + error.message);
    }
}

// 添加显示确认模态窗口的函数
function showConfirmModal(title, message, onConfirm, onCancel = true) {
    const modalHtml = `
        <div class="modal-container">
            <div class="confirm-modal" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                height: 200px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                display: flex;
                flex-direction: column;
            ">
                <div class="modal-header" style="
                    padding: 15px;
                    border-bottom: 1px solid #ebeef5;
                    font-size: 16px;
                    font-weight: 500;
                    color: #303133;
                ">
                    ${title}
                </div>
                <div class="modal-body" style="
                    flex: 1;
                    padding: 15px;
                    color: #606266;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    ${message}
                </div>
                <div class="modal-footer" style="
                    padding: 15px;
                    border-top: 1px solid #ebeef5;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                ">
                    ${onCancel ? `
                        <button onclick="closeConfirmModal(false)" style="
                            padding: 8px 15px;
                            border: 1px solid #dcdfe6;
                            background: white;
                            color: #606266;
                            border-radius: 4px;
                            cursor: pointer;
                        ">取消</button>
                    ` : ''}
                    <button onclick="closeConfirmModal(true)" style="
                        padding: 8px 15px;
                        border: none;
                        background: #409eff;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">确定</button>
                </div>
            </div>
            <div class="modal-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                z-index: 999;
            "></div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    window.confirmModalCallback = onConfirm;
}

// 添加关闭确认模态窗口的函数
function closeConfirmModal(confirmed) {
    const modalContainer = document.querySelector('.modal-container');
    if (modalContainer) {
        modalContainer.remove();
        if (confirmed && window.confirmModalCallback) {
            window.confirmModalCallback();
        }
    }
}

// 添加检查证书使用状态的函数
async function checkCertificateUsage(certId) {
    try {
        // 获取所有网站列表
        const websitesResponse = await fetch('/certificate/web-page/list');
        const websites = await websitesResponse.json();
        
        // 查找使用该证书的网站
        const usedBy = websites.filter(site => site.certificateId === certId)
                              .map(site => site.name);
        
        return {
            inUse: usedBy.length > 0,
            usedBy: usedBy
        };
    } catch (error) {
        console.error('检查证书使用状态失败:', error);
        throw error;
    }
}

// 修改删除证书的函数
async function deleteCertificate(certId) {
    try {
        // 检查证书是否在使用中
        const usageStatus = await checkCertificateUsage(certId);
        
        if (usageStatus.inUse) {
            showConfirmModal(
                '无法删除',
                `该证书正在被以下网站使用：${usageStatus.usedBy.join(', ')}`,
                null,
                false
            );
            return;
        }

        // 如果证书未被使用，显示删除确认对话框
        showConfirmModal(
            '删除确认',
            '确定要删除这个证书吗？',
            async () => {
                try {
                    const deleteResponse = await fetch(`/certificate/delete/${certId}`, {
                        method: 'DELETE'
                    });

                    if (deleteResponse.ok) {
                        showConfirmModal('成功', '证书删除成功', () => {
                            refreshCertificateList();
                        }, false);
                    } else {
                        const errorText = await deleteResponse.text();
                        showConfirmModal('错误', `删除失败：${errorText}`, null, false);
                    }
                } catch (error) {
                    showConfirmModal('错误', `删除失败：${error.message}`, null, false);
                }
            }
        );
    } catch (error) {
        showConfirmModal('错误', `检查证书使用状态失败：${error.message}`, null, false);
    }
}

// 添加下载证书的函数
async function downloadCert(certId) {
    try {
        const response = await fetch(`/certificate/download/${certId}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${certId}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            alert('下载失败：' + (await response.text()));
        }
    } catch (error) {
        alert('下载失败：' + error.message);
    }
}

// 修改更新证书的函数
async function renewCert(certId) {
    try {
        // 获取证书信息
        const response = await fetch(`/certificate/list`);
        const certificates = await response.json();
        const cert = certificates.find(c => c.id === certId);
        
        if (!cert) {
            showConfirmModal('错误', '证书不存在', null, false);
            return;
        }

        // 显示创建证书的模态窗口
        const modalContent = `
            <div style="padding: 20px;">
                <div class="modal-form-item" style="margin-bottom: 24px;">
                    <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">类型</label>
                    <div class="modal-radio-group" style="display: flex; gap: 24px;">
                        <label class="modal-radio" style="display: flex; align-items: center; cursor: pointer;">
                            <input type="radio" name="certType" value="upload" checked style="margin-right: 6px;">
                            <span style="color: #606266;">上传证书</span>
                        </label>
                        <label class="modal-radio" style="display: flex; align-items: center; cursor: pointer;">
                            <input type="radio" name="certType" value="code" style="margin-right: 6px;">
                            <span style="color: #606266;">证书代码</span>
                        </label>
                    </div>
                </div>

                <div id="certFields">
                    <!-- 根据类型显示不同的字段 -->
                </div>
            </div>
        `;

        showModal('更新证书', modalContent, async () => {
            const type = document.querySelector('input[name="certType"]:checked').value;
            
            try {
                let formData = new FormData();
                formData.append('type', type);

                if (type === 'upload') {
                    const certFile = document.getElementById('certFile').files[0];
                    const keyFile = document.getElementById('keyFile').files[0];
                    
                    if (!certFile || !keyFile) {
                        showConfirmModal('错误', '请选择证书文件和密钥文件', null, false);
                        return false;
                    }

                    formData.append('cert', certFile);
                    formData.append('key', keyFile);
                } else {
                    const certContent = document.getElementById('certContent').value;
                    const keyContent = document.getElementById('keyContent').value;

                    if (!certContent || !keyContent) {
                        showConfirmModal('错误', '请输入证书内容和密钥内容', null, false);
                        return false;
                    }

                    formData.append('certContent', certContent);
                    formData.append('keyContent', keyContent);
                }

                // 直接更新证书
                const updateResponse = await fetch(`/certificate/update/${certId}`, {
                    method: 'POST',
                    body: formData
                });

                if (updateResponse.ok) {
                    showConfirmModal('成功', '证书更新成功', () => {
                        refreshCertificateList();
                    }, false);
                    return true;
                } else {
                    showConfirmModal('错误', `更新失败：${await updateResponse.text()}`, null, false);
                    return false;
                }
            } catch (error) {
                showConfirmModal('错误', `更新失败：${error.message}`, null, false);
                return false;
            }
        });

        // 初始化表单
        const typeRadios = document.querySelectorAll('input[name="certType"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', updateCertFields);
        });
        updateCertFields();

    } catch (error) {
        showConfirmModal('错误', `更新失败：${error.message}`, null, false);
    }
}

// 页面加载时初始化证书列表
document.addEventListener('DOMContentLoaded', () => {
    const certificateSection = document.querySelector('.certificate-section');
    if (certificateSection) {
        refreshCertificateList();
    }
});

// 初始化面板 SSL 设置
async function initializeSSLSettings() {
    try {
        const sslSwitch = document.getElementById('ssl-switch');
        
        if (!sslSwitch) {
            console.warn('SSL 设置元素未找到');
            return;
        }

        // 根据当前协议判断 SSL 状态
        const isHttps = window.location.protocol === 'https:';
        sslSwitch.checked = isHttps;
    } catch (error) {
        console.error('获取 SSL 设置失败:', error);
    }
}

// 处理 SSL 开关切换
async function handleSSLSwitch(checkbox) {
    if (checkbox.checked) {
        // 创建证书选择模态窗口
        const modalContent = `
            <div style="padding: 20px;">
                <div class="modal-form-item" style="margin-bottom: 24px;">
                    <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">选择证书</label>
                    <select id="modal-ssl-cert-select" class="modal-form-input" style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
                        <option value="">请选择证书</option>
                    </select>
                </div>
            </div>
        `;
        
        showModal('配置 SSL', modalContent, async () => {
            const selectedCertId = document.getElementById('modal-ssl-cert-select').value;
            if (!selectedCertId) {
                showModal('提示', `
                    <div style="padding: 20px;">
                        <p style="margin: 0; font-size: 14px; color: #606266;">请选择一个证书</p>
                    </div>
                `);
                checkbox.checked = false;
                return;
            }

            // 添加二次确认
            showModal('确认启用SSL', `
                <div style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #606266;">确定要启用SSL吗？启用后面板将通过HTTPS访问</p>
                </div>
            `, async () => {
                // 获取当前URL并准备新URL
                const currentUrl = new URL(window.location.href);
                const newUrl = new URL(currentUrl);
                newUrl.protocol = 'https:';

                try {
                    const response = await fetch('/certificate/ssl/enable', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ certId: selectedCertId })
                    });
                    
                    const responseData = await response.json();
                    
                    if (response.ok && responseData.success) {
                        // 直接跳转到新URL
                        window.location.href = newUrl.href;
                    } else {
                        checkbox.checked = false;
                        showModal('操作失败', `
                            <div style="padding: 20px;">
                                <p style="margin: 0; font-size: 14px; color: #606266;">应用证书失败：${responseData.error || '未知错误'}</p>
                            </div>
                        `);
                    }
                } catch (error) {
                    checkbox.checked = false;
                    showModal('操作失败', `
                        <div style="padding: 20px;">
                            <p style="margin: 0; font-size: 14px; color: #606266;">应用证书失败：${error.message}</p>
                        </div>
                    `);
                }
            }, () => {
                checkbox.checked = false;
            });
        }, () => {
            // 取消回调
            checkbox.checked = false;
        });

        // 加载证书列表
        try {
            const response = await fetch('/certificate/list');
            const certificates = await response.json();
            
            const select = document.getElementById('modal-ssl-cert-select');
            select.innerHTML = '<option value="">请选择证书</option>';
            
            certificates.forEach(cert => {
                if (cert.status === 'valid') {
                    const option = document.createElement('option');
                    option.value = cert.id;
                    option.textContent = cert.domain;
                    select.appendChild(option);
                }
            });
        } catch (error) {
            console.error('获取证书列表失败:', error);
            checkbox.checked = false;
            showModal('错误', `
                <div style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #606266;">获取证书列表失败</p>
                </div>
            `);
        }
    } else {
        // 添加二次确认
        showModal('确认关闭SSL', `
            <div style="padding: 20px;">
                <p style="margin: 0; font-size: 14px; color: #606266;">确定要关闭SSL吗？关闭后面板将通过HTTP访问</p>
            </div>
        `, async () => {
            // 获取当前URL并准备新URL
            const currentUrl = new URL(window.location.href);
            const newUrl = new URL(currentUrl);
            newUrl.protocol = 'http:';

            try {
                const response = await fetch('/certificate/ssl/disable', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const responseData = await response.json();
                    if (responseData.success) {
                        // 直接跳转到新URL
                        window.location.href = newUrl.href;
                    } else {
                        checkbox.checked = true;
                        showModal('操作失败', `
                            <div style="padding: 20px;">
                                <p style="margin: 0; font-size: 14px; color: #606266;">关闭 SSL 失败：${responseData.error || '未知错误'}</p>
                            </div>
                        `);
                    }
                } else {
                    checkbox.checked = true;
                    showModal('操作失败', `
                        <div style="padding: 20px;">
                            <p style="margin: 0; font-size: 14px; color: #606266;">关闭 SSL 失败：服务器响应错误</p>
                        </div>
                    `);
                }
            } catch (error) {
                checkbox.checked = true;
                showModal('操作失败', `
                    <div style="padding: 20px;">
                        <p style="margin: 0; font-size: 14px; color: #606266;">关闭 SSL 失败：${error.message}</p>
                    </div>
                `);
            }
        }, () => {
            checkbox.checked = true;
        });
    }
}

// 在页面加载时初始化证书管理
document.addEventListener('DOMContentLoaded', () => {
    const certificateSection = document.querySelector('.certificate-section');
    if (certificateSection) {
        initializeSSLSettings();
    }
});
