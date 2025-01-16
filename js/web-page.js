// 添加创建网页相关函数
function showCreateWebModal() {
    const template = document.getElementById('createWebModalTemplate').innerHTML;
    showModal('创建网站', template, submitCreateWeb);

    // 清除所有错误提示
    clearAllErrors();
    
    // 清除所有类型的目录
    typeDirectories.nodejs = '';
    typeDirectories.program = '';
    typeDirectories.static = '';
    selectedDirectory = '';

    // 添加类型切换事件
    const typeRadios = document.querySelectorAll('input[name="webType"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            // 清除所有错误提示
            clearAllErrors();
            
            // 更新选中状态的样式
            const labels = document.querySelectorAll('.modal-radio');
            labels.forEach(label => {
                const input = label.querySelector('input');
                if (input.checked) {
                    label.style.color = '#409eff';
                } else {
                    label.style.color = '#606266';
                }
            });
            updateExtraFields();
        });
    });

    // 初始化额外字段
    updateExtraFields();
}

// 获取package.json中的入口文件
async function getPackageEntryFile(directory) {
    try {
        // 从后端获取入口文件列表
        const response = await fetch(`/web-page/entry-files?directory=${encodeURIComponent(directory)}`);
        const data = await response.json();
        
        if (data.code === 200) {
            return data; // 返回完整的响应数据
        }
        return { code: 500, entries: [] }; // 如果没有数据则返回空数组
    } catch (error) {
        console.error('获取入口文件失败:', error);
        return { code: 500, entries: [] }; // 出错时返回空数组
    }
}

// 添加类型目录存储
const typeDirectories = {
    nodejs: '',
    program: '',
    static: ''
};

// 修改选择目录函数
function selectDirectory(path) {
    // 更新目录输入框
    const webDirectoryInput = document.getElementById('webDirectory');
    const editWebDirectoryInput = document.getElementById('editWebDirectory');
    
    if (webDirectoryInput) {
        webDirectoryInput.value = path;
        // 如果是nodejs类型，加载入口文件选项
        const selectedType = document.querySelector('input[name="webType"]:checked')?.value;
        if (selectedType === 'nodejs') {
            loadEntryFileOptions(path);
        }
    }
    if (editWebDirectoryInput) {
        editWebDirectoryInput.value = path;
    }
    
    // 更新当前路径和选中的目录
    selectedDirectory = path;
    const currentPathInput = document.getElementById('currentPath');
    if (currentPathInput) {
        currentPathInput.value = path;
    }
    
    // 关闭目录选择器
    closeDirectorySelector();
}

// 修改确认目录选择函数
function confirmDirectorySelection() {
    if (!selectedDirectory) {
        alert('请先选择一个目录');
        return;
    }
    
    const webDirectoryInput = document.getElementById('webDirectory');
    const editWebDirectoryInput = document.getElementById('editWebDirectory');
    
    if (webDirectoryInput) {
        webDirectoryInput.value = selectedDirectory;
        // 如果是nodejs类型，加载入口文件选项
        const selectedType = document.querySelector('input[name="webType"]:checked')?.value;
        if (selectedType === 'nodejs') {
            loadEntryFileOptions(selectedDirectory);
        }
    }
    if (editWebDirectoryInput) {
        editWebDirectoryInput.value = selectedDirectory;
    }
    
    closeDirectorySelector();
}

// 添加清除所有错误提示的函数
function clearAllErrors() {
    // 获取所有带有错误提示的输入框
    const inputs = document.querySelectorAll('.modal-form-input');
    inputs.forEach(input => {
        input.style.borderColor = '#dcdfe6';
        const errorTip = input.nextElementSibling;
        if (errorTip && errorTip.className === 'error-tip') {
            errorTip.remove();
        }
    });
}

// 修改updateExtraFields函数，在开始时清除所有错误提示和目录内容
function updateExtraFields() {
    // 清除所有错误提示
    clearAllErrors();
    
    const selectedType = document.querySelector('input[name="webType"]:checked').value;
    const extraFields = document.getElementById('extraFields');
    const webDirectoryInput = document.getElementById('webDirectory');
    
    // 清除目录内容
    webDirectoryInput.value = '';
    typeDirectories[selectedType] = '';
    selectedDirectory = '';
    
    const inputStyle = `width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266; transition: border-color 0.2s;`;
    const labelStyle = `display: block; margin-bottom: 10px; color: #606266; font-size: 14px;`;
    const selectStyle = `
        width: 100%;
        height: 32px;
        padding: 0 30px 0 12px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        color: #606266;
        transition: all 0.3s;
        background: white url("data:image/svg+xml,%3Csvg  viewBox='0 0 20 20' fill='%23606266'%3E%3Cpath d='M10 12l-6-6h12l-6 6z'/%3E%3C/svg%3E") no-repeat right 8px center/12px;
        appearance: none;
        cursor: pointer;
    `;
    const buttonStyle = `
        padding: 0 15px;
        height: 32px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        background: white;
        color: #606266;
        cursor: pointer;
        transition: all 0.3s;
        min-width: 80px;
        &:hover {
            color: #409eff;
            border-color: #c6e2ff;
            background-color: #ecf5ff;
        }
    `;
    
    switch(selectedType) {
        case 'nodejs':
            extraFields.innerHTML = `
                <div class="modal-form-item" style="margin-bottom: 24px;">
                    <label class="modal-form-label" style="${labelStyle}">入口文件</label>
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1; position: relative;">
                            <select class="modal-form-input" id="entryFile" style="${selectStyle}">
                                <option value="" disabled selected>请先选择目录</option>
                            </select>
                        </div>
                        <input type="text" class="modal-form-input" id="customEntryFile" 
                               placeholder="自定义入口文件" 
                               style="display: none; flex: 1; ${inputStyle}">
                        <button onclick="toggleCustomEntry()" id="customEntryBtn"
                                style="${buttonStyle}">
                            自定义
                        </button>
                    </div>
                </div>
                <div class="modal-form-item" style="margin-bottom: 24px;">
                    <label class="modal-form-label" style="${labelStyle}">端口</label>
                    <input type="number" class="modal-form-input" id="port" 
                           placeholder="请输入端口号" 
                           style="${inputStyle}">
                </div>
            `;
            
            // 如果已有目录，则加载入口文件选项
            if (typeDirectories[selectedType]) {
                loadEntryFileOptions(typeDirectories[selectedType]);
            }
            break;
        case 'program':
            extraFields.innerHTML = `
                <div class="modal-form-item" style="margin-bottom: 24px;">
                    <label class="modal-form-label" style="${labelStyle}">端口</label>
                    <input type="number" class="modal-form-input" id="port" placeholder="请输入端口号" style="${inputStyle}">
                </div>
            `;
            break;
        case 'static':
            extraFields.innerHTML = `
                <div class="modal-form-item" style="margin-bottom: 24px;">
                    <label class="modal-form-label" style="${labelStyle}">首页文件</label>
                    <input type="text" class="modal-form-input" id="indexFile" placeholder="例如：index.html" style="${inputStyle}">
                </div>
                <div class="modal-form-item" style="margin-bottom: 24px;">
                    <label class="modal-form-label" style="${labelStyle}">端口</label>
                    <input type="number" class="modal-form-input" id="port" placeholder="请输入端口号" style="${inputStyle}">
                </div>
            `;
            break;
    }
}

// 加载入口文件选项
async function loadEntryFileOptions(directory) {
    const entryFiles = await getPackageEntryFile(directory);
    const entryFileSelect = document.getElementById('entryFile');
    
    if (!entryFiles || !entryFiles.entries || entryFiles.entries.length === 0) {
        entryFileSelect.innerHTML = `
            <option value="" disabled selected>未找到入口文件</option>
            <option value="custom">自定义...</option>
        `;
    } else {
        entryFileSelect.innerHTML = `
            <option value="" disabled>请选择入口文件</option>
            ${entryFiles.entries.map(entry => `
                <option value="${entry.command}">${entry.name} (${entry.command})</option>
            `).join('')}
            <option value="custom">自定义...</option>
        `;
    }
    
    // 监听选择变化
    entryFileSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            toggleCustomEntry(true);
        }
    });
}

// 切换自定义入口文件输入框
function toggleCustomEntry(forceShow = false) {
    const entryFileSelect = document.getElementById('entryFile').parentElement;
    const customEntryFile = document.getElementById('customEntryFile');
    const customEntryBtn = document.getElementById('customEntryBtn');
    
    if (forceShow || customEntryFile.style.display === 'none') {
        entryFileSelect.style.display = 'none';
        customEntryFile.style.display = 'block';
        customEntryBtn.textContent = '选择';
        customEntryBtn.style.color = '#409eff';
        customEntryBtn.style.borderColor = '#c6e2ff';
        customEntryBtn.style.backgroundColor = '#ecf5ff';
        customEntryFile.focus();
    } else {
        entryFileSelect.style.display = 'block';
        customEntryFile.style.display = 'none';
        customEntryBtn.textContent = '自定义';
        customEntryBtn.style.color = '#606266';
        customEntryBtn.style.borderColor = '#dcdfe6';
        customEntryBtn.style.backgroundColor = 'white';
        document.getElementById('entryFile').selectedIndex = 0;
    }
}

async function submitCreateWeb() {
    const type = document.querySelector('input[name="webType"]:checked').value;
    const nameInput = document.getElementById('webName');
    const directoryInput = document.getElementById('webDirectory');
    const portInput = document.getElementById('port');
    let hasError = false;

    // 重置所有输入框样式
    const resetInputStyle = (input) => {
        input.style.borderColor = '#dcdfe6';
        const errorTip = input.nextElementSibling;
        if (errorTip && errorTip.className === 'error-tip') {
            errorTip.remove();
        }
    };

    // 显示错误样式
    const showError = (input, message) => {
        input.style.borderColor = '#f56c6c';
        input.style.transition = 'all 0.3s';
        // 如果已经有错误提示则不重复添加
        let errorTip = input.nextElementSibling;
        if (!errorTip || errorTip.className !== 'error-tip') {
            errorTip = document.createElement('div');
            errorTip.className = 'error-tip';
            errorTip.style.cssText = 'color: #f56c6c; font-size: 12px; margin-top: 4px;';
            input.parentNode.insertBefore(errorTip, input.nextSibling);
        }
        errorTip.textContent = message;
        hasError = true;
    };

    // 重置所有输入框样式
    [nameInput, directoryInput, portInput].forEach(resetInputStyle);

    // 验证必填字段
    if (!nameInput.value.trim()) {
        showError(nameInput, '请输入网站名称');
    }
    if (!directoryInput.value.trim()) {
        showError(directoryInput, '请选择网站目录');
    }
    if (!portInput.value.trim()) {
        showError(portInput, '请输入端口号');
    }

    const data = {
        type,
        name: nameInput.value,
        directory: directoryInput.value,
        port: portInput.value
    };

    // 根据类型验证额外字段
    switch(type) {
        case 'nodejs':
            const customEntryFile = document.getElementById('customEntryFile');
            const entryFileSelect = document.getElementById('entryFile');
            const entryFileInput = customEntryFile.style.display === 'block' ? customEntryFile : entryFileSelect;
            
            resetInputStyle(entryFileInput);
            data.entryFile = customEntryFile.style.display === 'block' 
                ? customEntryFile.value 
                : entryFileSelect.value;
                
            if (!data.entryFile) {
                showError(entryFileInput, '请选择或输入入口文件');
            }
            break;
            
        case 'static':
            const indexFileInput = document.getElementById('indexFile');
            resetInputStyle(indexFileInput);
            data.indexFile = indexFileInput.value;
            
            if (!data.indexFile) {
                showError(indexFileInput, '请输入首页文件');
            }
            break;
    }

    if (hasError) {
        return false;
    }

    try {
        const response = await fetch('/web-page/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            // 刷新网页列表
            refreshWebList();
            return true;
        } else {
            const errorMessage = await response.text();
            const errorInput = document.getElementById('webName'); // 默认在名称输入框显示错误
            showError(errorInput, `创建失败：${errorMessage}`);
            return false;
        }
    } catch (error) {
        const errorInput = document.getElementById('webName');
        showError(errorInput, `创建失败：${error.message}`);
        return false;
    }
}

// 添加刷新网页列表的函数
async function refreshWebList() {
    try {
        const response = await fetch('/web-page/list');
        const data = await response.json();
        
        const tbody = document.querySelector('.web-table tbody');
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 60px 0; text-align: center; color: #909399;">
                        <div style="font-size: 14px;">暂无数据</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${item.name}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${item.type}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${item.directory}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">
                    <span class="status-tag ${item.status === 'running' ? 'running' : 'stopped'}">
                        ${item.status === 'running' ? '运行中' : '已停止'}
                    </span>
                </td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${item.protocol}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${item.port || '-'}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${item.expireTime || '-'}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">${item.certExpireTime || '-'}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #ebeef5;">
                    <button class="operation-btn" onclick="operateWeb('${item.id}', '${item.status === 'running' ? 'stop' : 'start'}')">${item.status === 'running' ? '停止' : '启动'}</button>
                    <button class="operation-btn" onclick="editWeb('${item.id}')">编辑</button>
                    <button class="operation-btn danger" onclick="deleteWeb('${item.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to refresh web list:', error);
    }
}

// 添加显示确认模态窗口的函数
function showWebConfirmModal(title, message, onConfirm, onCancel = true) {
    const modalHtml = `
        <div class="web-modal-container">
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
                        <button onclick="closeWebConfirmModal(false)" style="
                            padding: 8px 15px;
                            border: 1px solid #dcdfe6;
                            background: white;
                            color: #606266;
                            border-radius: 4px;
                            cursor: pointer;
                            transition: all 0.3s;
                        " onmouseover="this.style.backgroundColor='#f5f7fa'"
                           onmouseout="this.style.backgroundColor='white'">取消</button>
                    ` : ''}
                    <button onclick="closeWebConfirmModal(true)" style="
                        padding: 8px 15px;
                        border: none;
                        background: #409eff;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                    " onmouseover="this.style.backgroundColor='#66b1ff'"
                       onmouseout="this.style.backgroundColor='#409eff'">确定</button>
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

    window.webConfirmModalCallback = onConfirm;
}

// 添加关闭确认模态窗口的函数
function closeWebConfirmModal(confirmed) {
    const modalContainer = document.querySelector('.web-modal-container');
    if (modalContainer) {
        modalContainer.remove();
        if (confirmed && window.webConfirmModalCallback) {
            window.webConfirmModalCallback();
        }
    }
}

// 修改网页操作相关函数
async function operateWeb(id, action) {
    try {
        if (action === 'stop') {
            showWebConfirmModal(
                '停止确认',
                '确定要停止这个网站吗？',
                async () => {
                    try {
                        const response = await fetch(`/web-page/${action}/${id}`, {
                            method: 'POST'
                        });
                        
                        if (response.ok) {
                            refreshWebList();
                        } else {
                            showWebConfirmModal('错误', `停止失败：${await response.text()}`, null, false);
                        }
                    } catch (error) {
                        showWebConfirmModal('错误', `停止失败：${error.message}`, null, false);
                    }
                }
            );
        } else {
            // 直接启动，无需确认
            const response = await fetch(`/web-page/${action}/${id}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                showWebConfirmModal('成功', '网站已启动', () => {
                    refreshWebList();
                }, false);
            } else {
                showWebConfirmModal('错误', `启动失败：${await response.text()}`, null, false);
            }
        }
    } catch (error) {
        showWebConfirmModal('错误', `操作失败：${error.message}`, null, false);
    }
}

async function deleteWeb(id) {
    showWebConfirmModal(
        '删除确认',
        '确定要删除这个网站吗？此操作不可恢复！',
        async () => {
            try {
                const response = await fetch(`/web-page/delete/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    refreshWebList();
                } else {
                    showWebConfirmModal('错误', `删除失败：${await response.text()}`, null, false);
                }
            } catch (error) {
                showWebConfirmModal('错误', `删除失败：${error.message}`, null, false);
            }
        }
    );
}

// 在页面加载时初始化网页列表
document.addEventListener('DOMContentLoaded', () => {
    // 如果在网页页面，初始化网页列表
    const webSection = document.querySelector('.web-section');
    if (webSection) {
        refreshWebList();
    }
});

// 添加目录选择相关变量
let currentDirectory = '';
let selectedDirectory = '';

// 修改打开目录选择器函数
function openDirectorySelector() {
    const modal = document.getElementById('directorySelectorModal');
    modal.style.display = 'block';
    
    // 添加遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'directory-selector-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2999;
    `;
    document.body.appendChild(overlay);
    
    // 阻止事件冒泡
    modal.addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    // 重置目录历史
    directoryHistory = [];
    currentDirectoryIndex = -1;
    
    // 加载初始目录
    loadDirectory();
}

// 添加目录历史记录
let directoryHistory = [];
let currentDirectoryIndex = -1;

// 更新面包屑导航
function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('directoryBreadcrumb');
    if (!breadcrumb) return;

    const parts = path.split(/[\\/]/);
    let html = `
        <span class="breadcrumb-item" onclick="loadDirectory('')" 
              style="color: #409eff; cursor: pointer; padding: 2px 8px; border-radius: 4px; transition: all 0.3s;"
              onmouseover="this.style.backgroundColor='#ecf5ff'"
              onmouseout="this.style.backgroundColor='transparent'">
            根目录
        </span>`;

    let currentPath = '';
    parts.forEach((part, index) => {
        if (!part) return;
        currentPath += (currentPath ? '/' : '') + part;
        html += `
            <span style="color: #909399; margin: 0 4px;">/</span>
            <span class="breadcrumb-item" 
                  onclick="loadDirectory('${currentPath}')"
                  style="color: ${index === parts.length - 1 ? '#303133' : '#409eff'}; 
                         cursor: pointer; 
                         padding: 2px 8px; 
                         border-radius: 4px;
                         transition: all 0.3s;"
                  onmouseover="this.style.backgroundColor='#ecf5ff'"
                  onmouseout="this.style.backgroundColor='transparent'">
                ${part}
            </span>`;
    });

    breadcrumb.innerHTML = html;
}

// 修改加载目录内容函数
async function loadDirectory(path = '') {
    try {
        const response = await fetch(`/web-page/search${path ? `?choose=${encodeURIComponent(path)}` : ''}`);
        const data = await response.json();
        
        if (data.code === 200) {
            currentDirectory = data.message.currentPath;
            
            // 更新当前路径输入框
            const currentPathInput = document.getElementById('currentPath');
            currentPathInput.value = currentDirectory;
            
            // 更新面包屑导航
            updateBreadcrumb(currentDirectory);
            
            // 更新目录历史
            if (currentDirectoryIndex < directoryHistory.length - 1) {
                directoryHistory = directoryHistory.slice(0, currentDirectoryIndex + 1);
            }
            directoryHistory.push(currentDirectory);
            currentDirectoryIndex = directoryHistory.length - 1;
            
            // 更新导航按钮状态
            updateNavigationButtons();
            
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = data.message.files
                .sort((a, b) => {
                    // 目录排在前面
                    if (a.isDir !== b.isDir) {
                        return b.isDir ? 1 : -1;
                    }
                    // 同类型按名称排序
                    return a.name.localeCompare(b.name);
                })
                .map(file => `
                    <div class="file-item" 
                         onclick="${file.isDir ? `loadDirectory('${file.path.replace(/\\/g, '/').replace(/'/g, "\\'")}')` : ''}"
                         style="
                            padding: 12px 15px;
                            cursor: ${file.isDir ? 'pointer' : 'default'};
                            display: flex;
                            align-items: center;
                            border-radius: 4px;
                            margin-bottom: 4px;
                            ${file.isDir ? 'background-color: #f5f7fa;' : ''}
                            transition: all 0.3s;
                         "
                         onmouseover="this.style.backgroundColor='${file.isDir ? '#eef1f6' : '#f5f7fa'}'"
                         onmouseout="this.style.backgroundColor='${file.isDir ? '#f5f7fa' : 'transparent'}'">
                        <i class="el-icon" style="margin-right: 8px; color: ${file.isDir ? '#409eff' : '#909399'};">
                            <svg width="16" height="16">
                                <use href="#icon-${getFileIcon(file)}"></use>
                            </svg>
                        </i>
                        <span style="flex: 1; color: #606266;">${file.name}</span>
                        ${file.isDir ? `
                            <button class="select-dir-btn"
                                    onclick="event.stopPropagation(); selectDirectory('${file.path.replace(/\\/g, '/').replace(/'/g, "\\'")}')"
                                    style="
                                        padding: 6px 16px;
                                        border: 1px solid #dcdfe6;
                                        border-radius: 4px;
                                        background: white;
                                        color: #606266;
                                        cursor: pointer;
                                        transition: all 0.3s;
                                        font-size: 12px;
                                    "
                                    onmouseover="this.style.color='#409eff'; this.style.borderColor='#c6e2ff'; this.style.backgroundColor='#ecf5ff'"
                                    onmouseout="this.style.color='#606266'; this.style.borderColor='#dcdfe6'; this.style.backgroundColor='white'">
                                选择
                            </button>
                        ` : ''}
                    </div>
                `).join('');
        } else {
            showWebConfirmModal('错误', '加载目录失败：' + data.message, null, false);
        }
    } catch (error) {
        console.error('加载目录失败:', error);
        showWebConfirmModal('错误', '加载目录失败：' + error.message, null, false);
    }
}

// 更新导航按钮状态
function updateNavigationButtons() {
    const backBtn = document.getElementById('directoryBackBtn');
    const forwardBtn = document.getElementById('directoryForwardBtn');
    
    if (backBtn) {
        backBtn.disabled = currentDirectoryIndex <= 0;
        backBtn.style.opacity = currentDirectoryIndex <= 0 ? '0.5' : '1';
        backBtn.style.cursor = currentDirectoryIndex <= 0 ? 'not-allowed' : 'pointer';
    }
    
    if (forwardBtn) {
        forwardBtn.disabled = currentDirectoryIndex >= directoryHistory.length - 1;
        forwardBtn.style.opacity = currentDirectoryIndex >= directoryHistory.length - 1 ? '0.5' : '1';
        forwardBtn.style.cursor = currentDirectoryIndex >= directoryHistory.length - 1 ? 'not-allowed' : 'pointer';
    }
}

// 添加前进后退导航功能
function navigateDirectory(direction) {
    if (direction === 'back' && currentDirectoryIndex > 0) {
        currentDirectoryIndex--;
        loadDirectory(directoryHistory[currentDirectoryIndex]);
    } else if (direction === 'forward' && currentDirectoryIndex < directoryHistory.length - 1) {
        currentDirectoryIndex++;
        loadDirectory(directoryHistory[currentDirectoryIndex]);
    }
}

// 获取文件图标
function getFileIcon(file) {
    if (file.isDir) {
        return 'folder';
    }
    
    // 获取文件扩展名
    const ext = file.name.split('.').pop().toLowerCase();
    
    // 根据扩展名返回对应图标
    switch (ext) {
        case 'json':
            return 'json';
        case 'js':
            return 'js';
        case 'txt':
            return 'txt';
        default:
            return 'file';
    }
}

function showModal(title, content, submitCallback) {
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalTitle = modalOverlay.querySelector('.modal-title');
    const modalBody = modalOverlay.querySelector('.modal-body');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    
    // 直接存储回调函数
    modalOverlay._submitCallback = submitCallback;
    
    modalOverlay.style.display = 'flex';
}

// 修改submitModal函数，使其返回Promise
async function submitModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    const callback = modalOverlay._submitCallback;
    
    if (typeof callback === 'function') {
        try {
            return await callback();
        } catch (error) {
            console.error('提交失败:', error);
            return false;
        }
    }
    return false;
}

function closeModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    modalOverlay.style.display = 'none';
    // 清除回调函数
    delete modalOverlay._submitCallback;
    // 清除所有错误提示
    clearAllErrors();
}

// 处理协议切换
async function handleProtocolChange(radio) {
    const certificateSelector = document.getElementById('certificateSelector');
    if (radio.value === 'https') {
        certificateSelector.style.display = 'block';
        await loadCertificates();
    } else {
        certificateSelector.style.display = 'none';
    }
}

// 加载证书列表
async function loadCertificates() {
    try {
        const response = await fetch('/web-page/certificates');
        const data = await response.json();
        
        const certificateSelect = document.getElementById('editWebCertificate');
        certificateSelect.innerHTML = '<option value="">请选择证书</option>';
        
        if (data && data.length > 0) {
            data.forEach(cert => {
                certificateSelect.innerHTML += `<option value="${cert.id}">${cert.domain}</option>`;
            });
        }
    } catch (error) {
        console.error('加载证书列表失败:', error);
    }
}

// 修改显示编辑网站模态框函数
async function showEditWebModal(websiteId) {
    try {
        // 获取网站详情
        const response = await fetch(`/web-page/detail/${websiteId}`);
        if (!response.ok) {
            throw new Error('获取网站详情失败');
        }
        
        const website = await response.json();
        const template = document.getElementById('editWebModalTemplate').innerHTML;
        
        // 显示模态框
        showModal('编辑网站', template, () => submitEditWeb(websiteId));
        
        // 填充表单数据
        document.getElementById('editWebName').value = website.name;
        document.getElementById('editWebDirectory').value = website.directory;
        document.getElementById('editWebPort').value = website.port || '';
        
        // 设置协议选择
        const protocolRadios = document.getElementsByName('editProtocol');
        for (const radio of protocolRadios) {
            if (radio.value === website.protocol) {
                radio.checked = true;
                // 如果是https协议，显示证书选择器并加载证书
                if (radio.value === 'https') {
                    document.getElementById('certificateSelector').style.display = 'block';
                    await loadCertificates();
                    // 如果网站有证书，选中对应的证书
                    if (website.certificateId) {
                        document.getElementById('editWebCertificate').value = website.certificateId;
                    }
                }
            }
        }
        
        // 存储当前目录
        selectedDirectory = website.directory;
        
    } catch (error) {
        console.error('显示编辑模态框失败:', error);
        showWebConfirmModal('错误', '获取网站详情失败', null, false);
    }
}

// 修改提交编辑网站函数
async function submitEditWeb(websiteId) {
    const nameInput = document.getElementById('editWebName');
    const directoryInput = document.getElementById('editWebDirectory');
    const portInput = document.getElementById('editWebPort');
    const protocolRadio = document.querySelector('input[name="editProtocol"]:checked');
    const certificateSelect = document.getElementById('editWebCertificate');
    
    let hasError = false;
    
    // 重置所有输入框样式
    const resetInputStyle = (input) => {
        input.style.borderColor = '#dcdfe6';
        const errorTip = input.nextElementSibling;
        if (errorTip && errorTip.className === 'error-tip') {
            errorTip.remove();
        }
    };
    
    // 显示错误样式
    const showError = (input, message) => {
        input.style.borderColor = '#f56c6c';
        input.style.transition = 'all 0.3s';
        let errorTip = input.nextElementSibling;
        if (!errorTip || errorTip.className !== 'error-tip') {
            errorTip = document.createElement('div');
            errorTip.className = 'error-tip';
            errorTip.style.cssText = 'color: #f56c6c; font-size: 12px; margin-top: 4px;';
            input.parentNode.insertBefore(errorTip, input.nextSibling);
        }
        errorTip.textContent = message;
        hasError = true;
    };
    
    // 重置所有输入框样式
    [nameInput, directoryInput, portInput].forEach(resetInputStyle);
    
    // 验证必填字段
    if (!nameInput.value.trim()) {
        showError(nameInput, '请输入网站名称');
    }
    if (!directoryInput.value.trim()) {
        showError(directoryInput, '请选择网站目录');
    }
    if (!portInput.value.trim()) {
        showError(portInput, '请输入端口号');
    }
    if (!protocolRadio) {
        document.querySelector('input[name="editProtocol"][value="http"]').checked = true;
    }
    
    // 如果选择了https协议，验证证书
    if (protocolRadio && protocolRadio.value === 'https' && !certificateSelect.value) {
        showError(certificateSelect, '请选择证书');
    }
    
    if (hasError) {
        return false;
    }
    
    try {
        const response = await fetch(`/web-page/edit/${websiteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: nameInput.value.trim(),
                directory: directoryInput.value.trim(),
                port: portInput.value.trim(),
                protocol: protocolRadio ? protocolRadio.value : 'http',
                certificateId: protocolRadio && protocolRadio.value === 'https' ? certificateSelect.value : null
            })
        });
        
        if (response.ok) {
            refreshWebList();
            return true;
        } else {
            const errorMessage = await response.text();
            showError(nameInput, `编辑失败：${errorMessage}`);
            return false;
        }
    } catch (error) {
        showError(nameInput, `编辑失败：${error.message}`);
        return false;
    }
}

// 修改editWeb函数
function editWeb(id) {
    showEditWebModal(id);
}

// 添加更新网络连接信息的函数
async function updateNetworkConnections() {
    try {
        const response = await fetch('/network/connections');
        const connections = await response.json();
        
        const tableBody = document.getElementById('connectionTableBody');
        if (!connections || connections.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="padding: 20px; text-align: center; color: #909399;">
                        暂无连接
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = connections.map(conn => `
            <tr style="border-bottom: 1px solid #ebeef5;">
                <td style="padding: 12px; color: #606266;">${conn.remote_ip}</td>
                <td style="padding: 12px; color: #606266;">${conn.remote_port}</td>
                <td style="padding: 12px; color: #606266;">${conn.local_ip}</td>
                <td style="padding: 12px; color: #606266;">${conn.local_port}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to fetch network connections:', error);
        const tableBody = document.getElementById('connectionTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 20px; text-align: center; color: #909399;">
                    获取连接信息失败
                </td>
            </tr>
        `;
    }
}

// 初始化网络页面
function initializeWebPage() {
    // 初始化网络连接信息
    updateNetworkConnections();
    // 设置定时更新
    setInterval(updateNetworkConnections, 30000);
}

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    const networkSection = document.querySelector('.network-section');
    if (networkSection) {
        initializeWebPage();
    }
});

// 添加网络监控功能
function initializeNetworkMonitoring() {
    const networkBtns = document.querySelectorAll('.network-btn');
    const networkChart = document.querySelector('.network-chart');
    let chart = null;
    let currentMode = 'traffic';

    // 初始化图表
    function initChart() {
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        networkChart.innerHTML = '';
        networkChart.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const now = new Date();
        const labels = Array.from({length: 10}, (_, i) => {
            const time = new Date(now.getTime() - (9 - i) * 1000);
            return time.toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        });

        const datasets = currentMode === 'traffic' ? [
            {
                label: '上行',
                data: Array(10).fill(0),
                borderColor: 'rgb(64, 158, 255)',
                backgroundColor: 'rgba(64, 158, 255, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: '下行',
                data: Array(10).fill(0),
                borderColor: 'rgb(103, 194, 58)',
                backgroundColor: 'rgba(103, 194, 58, 0.1)',
                fill: true,
                tension: 0.4
            }
        ] : [
            {
                label: '读取',
                data: Array(10).fill(0),
                borderColor: 'rgb(64, 158, 255)',
                backgroundColor: 'rgba(64, 158, 255, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: '写入',
                data: Array(10).fill(0),
                borderColor: 'rgb(103, 194, 58)',
                backgroundColor: 'rgba(103, 194, 58, 0.1)',
                fill: true,
                tension: 0.4
            }
        ];

        const yAxisConfig = currentMode === 'traffic' ? {
            title: {
                display: true,
                text: 'KB/s'
            },
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.05)'
            }
        } : {
            title: {
                display: true,
                text: 'MB'
            },
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.05)'
            }
        };

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: yAxisConfig,
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += currentMode === 'traffic' 
                                        ? context.parsed.y.toFixed(2) + ' KB/s'
                                        : context.parsed.y.toFixed(2) + ' MB';
                                }
                                return label;
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    // 更新网络数据
    async function updateNetworkData() {
        try {
            const interface = 'all';
            const response = await fetch(`/network/${currentMode}?interface=${interface}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // 更新统计数据
            if (currentMode === 'traffic') {
                document.querySelector('.traffic-stats .stat-item:first-child').innerHTML = `
                    <div style="color: #909399; font-size: 14px; margin-bottom: 5px;">上行: ${data.upload_speed} KB/s</div>
                    <div style="color: #909399; font-size: 14px;">总发送: ${data.total_upload} GB</div>
                `;
                document.querySelector('.traffic-stats .stat-item:last-child').innerHTML = `
                    <div style="color: #909399; font-size: 14px; margin-bottom: 5px;">下行: ${data.download_speed} KB/s</div>
                    <div style="color: #909399; font-size: 14px;">总接收: ${data.total_download} MB</div>
                `;
            } else {
                document.querySelector('.io-stats .stat-item:first-child').innerHTML = `
                    <div style="color: #909399; font-size: 14px; margin-bottom: 5px;">读取: ${data.read_size} MB</div>
                    <div style="color: #909399; font-size: 14px;">读写次数: ${data.io_count} 次/s</div>
                `;
                document.querySelector('.io-stats .stat-item:last-child').innerHTML = `
                    <div style="color: #909399; font-size: 14px; margin-bottom: 5px;">写入: ${data.write_size} MB</div>
                    <div style="color: #909399; font-size: 14px;">读写延迟: ${data.io_delay} ms</div>
                `;
            }

            // 更新图表数据
            if (chart) {
                const now = new Date();
                chart.data.labels = Array.from({length: 10}, (_, i) => {
                    const time = new Date(now.getTime() - (9 - i) * 1000);
                    return time.toLocaleTimeString('zh-CN', { 
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                });

                if (currentMode === 'traffic') {
                    chart.data.datasets[0].data = data.chart_data.upload;
                    chart.data.datasets[1].data = data.chart_data.download;
                } else {
                    chart.data.datasets[0].data = data.chart_data.read;
                    chart.data.datasets[1].data = data.chart_data.write;
                }
                chart.update();
            }
        } catch (error) {
            console.error('获取网络数据失败:', error);
            
            // 显示错误状态在统计数据区域
            if (currentMode === 'traffic') {
                document.querySelector('.traffic-stats .stat-item:first-child').innerHTML = `
                    <div style="color: #f56c6c; font-size: 14px;">获取数据失败</div>
                `;
                document.querySelector('.traffic-stats .stat-item:last-child').innerHTML = `
                    <div style="color: #f56c6c; font-size: 14px;">获取数据失败</div>
                `;
            } else {
                document.querySelector('.io-stats .stat-item:first-child').innerHTML = `
                    <div style="color: #f56c6c; font-size: 14px;">获取数据失败</div>
                `;
                document.querySelector('.io-stats .stat-item:last-child').innerHTML = `
                    <div style="color: #f56c6c; font-size: 14px;">获取数据失败</div>
                `;
            }

            // 如果图表存在，清空数据
            if (chart) {
                chart.data.datasets.forEach(dataset => {
                    dataset.data = Array(10).fill(0);
                });
                chart.update();
            }
        }
    }

    // 初始化按钮事件
    networkBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            networkBtns.forEach(b => {
                b.style.background = 'white';
                b.style.color = '#606266';
                b.style.border = '1px solid #dcdfe6';
            });
            btn.style.background = '#409eff';
            btn.style.color = 'white';
            btn.style.border = 'none';
            currentMode = index === 0 ? 'traffic' : 'io';

            // 切换统计信息显示
            document.querySelector('.traffic-stats').style.display = currentMode === 'traffic' ? 'flex' : 'none';
            document.querySelector('.io-stats').style.display = currentMode === 'io' ? 'flex' : 'none';
            
            // 切换网络连接表格显示
            document.querySelector('.network-connections').style.display = currentMode === 'traffic' ? 'block' : 'none';

            // 更新图表配置
            if (chart) {
                chart.destroy();
            }
            initChart();
            updateNetworkData();
        });
    });

    // 初始化
    initChart();
    updateNetworkData();

    // 定时更新数据
    setInterval(updateNetworkData, 3000);
}

// 在页面加载时初始化网络监控
document.addEventListener('DOMContentLoaded', () => {
    const networkSection = document.querySelector('.network-section');
    if (networkSection) {
        initializeNetworkMonitoring();
    }
});

// 关闭目录选择器
function closeDirectorySelector() {
    const modal = document.getElementById('directorySelectorModal');
    modal.style.display = 'none';
    
    // 移除遮罩层
    const overlay = document.querySelector('.directory-selector-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// 导航到上级目录
function navigateToParent() {
    if (!currentDirectory) return;
    
    const parentPath = currentDirectory.split(/[\\/]/).slice(0, -1).join('/');
    if (parentPath) {
        loadDirectory(parentPath);
    } else {
        // 如果已经在根目录，则加载根目录
        loadDirectory('');
    }
}
