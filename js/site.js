// 在文件开头添加cookie检查
function checkCookies() {
    const requiredCookies = ['a', 't', 'p'];
    const hasCookies = requiredCookies.every(cookieName => {
        return document.cookie.split(';').some(cookie => {
            return cookie.trim().startsWith(cookieName + '=');
        });
    });

    if (!hasCookies) {
        window.location.href = '/recording';
        return false;
    }
    return true;
}

// 在页面加载时立即检查cookie
document.addEventListener('DOMContentLoaded', () => {
    if (!checkCookies()) {
        return;
    }
    // 确保设置面板已加载
    const settingsSection = document.querySelector('.settings-section');
    if (settingsSection) {
        initializeUI();
        restoreSidebarState();
        initializePanelSettings();
    } else {
        console.warn('Settings section not found');
    }
});

// 定期检查cookie是否存在
setInterval(checkCookies, 5000);  // 每5秒检查一次

// 在文件开头添加全局变量
window.systemInfo = {
    os_version: ''
};

document.querySelectorAll('.menu-group').forEach(group => {
    const menuItem = group.querySelector('.el-menu-item');
    const submenu = group.querySelector('.submenu');
    
    if (submenu) {
        menuItem.addEventListener('click', () => {
            // 如果当前菜单已展开，先关闭其他已展开的菜单
            if (!menuItem.classList.contains('expanded')) {
                document.querySelectorAll('.menu-group').forEach(otherGroup => {
                    if (otherGroup !== group) {
                        const otherMenuItem = otherGroup.querySelector('.el-menu-item');
                        const otherSubmenu = otherGroup.querySelector('.submenu');
                        if (otherMenuItem?.classList.contains('expanded')) {
                            otherMenuItem.classList.remove('expanded');
                            otherSubmenu?.classList.remove('open');
                            otherSubmenu.style.height = '0';
                        }
                    }
                });
            }

            menuItem.classList.toggle('expanded');
            
            // 计算子菜单高度
            const items = submenu.querySelectorAll('.el-menu-item');
            const totalHeight = Array.from(items).reduce((height, item) => {
                const style = window.getComputedStyle(item);
                const marginTop = parseFloat(style.marginTop);
                const marginBottom = parseFloat(style.marginBottom);
                return height + item.offsetHeight + marginTop + marginBottom;
            }, 0);
            
            // 设置高度和动画
            if (menuItem.classList.contains('expanded')) {
                submenu.classList.add('open');
                submenu.style.height = `${totalHeight}px`;
            } else {
                const currentHeight = submenu.offsetHeight;
                submenu.style.height = `${currentHeight}px`;
                // 触发回流
                submenu.offsetHeight;
                submenu.style.height = '0';
                setTimeout(() => {
                    submenu.classList.remove('open');
                }, 300);
            }
        });
    }
});

// 添加侧边栏折叠功能
const sidebar = document.querySelector('.sidebar');
const toggleBtn = document.querySelector('.toggle-sidebar');
const expandIcon = document.querySelector('.expand-icon');
const collapseIcon = document.querySelector('.collapse-icon');
const sidebarTitle = document.querySelector('.sidebar-title');

// 恢复侧边栏状态
function restoreSidebarState() {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        expandIcon.style.display = 'none';
        collapseIcon.style.display = 'block';
        sidebarTitle.querySelector('span').style.display = 'none';
    }
}

toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    expandIcon.style.display = isCollapsed ? 'none' : 'block';
    collapseIcon.style.display = isCollapsed ? 'block' : 'none';
    
    // 切换标题文字的显示状态
    const titleSpan = sidebarTitle.querySelector('span');
    titleSpan.style.display = isCollapsed ? 'none' : 'block';
    
    // 保存侧边栏状态
    localStorage.setItem('sidebarCollapsed', isCollapsed);
});

// 添加UI初始化函数
function initializeUI() {
    const menuItems = document.querySelectorAll('.el-menu-item');
    const sections = {
        '概览': { element: document.querySelector('.overview-section'), hash: '/overview' },
        '网络': { element: document.querySelector('.network-section'), hash: '/web-page' },
        '网页': { element: document.querySelector('.web-section'), hash: '/web' },
        '证书': { element: document.querySelector('.certificate-section'), hash: '/certificates' },
        '面板设置': { element: document.querySelector('.settings-section'), hash: '/panel-settings/foundation' }
    };

    // 根据当前URL显示对应页面
    function showPageFromHash() {
        // 移除开头的#号并获取当前hash
        const currentHash = window.location.hash.replace('#', '');
        let found = false;
        
        // 隐藏所有section
        Object.values(sections).forEach(section => {
            if (section.element) {
                section.element.style.display = 'none';
            }
        });

        // 移除所有菜单项的激活状态
        menuItems.forEach(item => item.classList.remove('is-active'));

        // 清除可能存在的模态窗口，并恢复 SSL 开关状态
        const modalContainer = document.querySelector('.modal-container');
        if (modalContainer) {
            const sslSwitch = document.getElementById('ssl-switch');
            if (sslSwitch) {
                // 根据当前协议恢复开关状态
                const isHttps = window.location.protocol === 'https:';
                sslSwitch.checked = isHttps;
            }
            modalContainer.remove();
            window.currentModalCallbacks = null;
        }

        // 处理面板设置的特殊情况
        if (currentHash.startsWith('/panel-settings/')) {
            const settingsSection = sections['面板设置'].element;
            if (settingsSection) {
                settingsSection.style.display = 'block';
                // 找到并激活对应的菜单项
                menuItems.forEach(item => {
                    if (item.querySelector('span').textContent === '面板设置') {
                        item.classList.add('is-active');
                    }
                });
                // 切换到对应的设置标签
                const tab = currentHash.split('/').pop();
                switchSettingsTab(tab);
            }
            found = true;
            return;
        }

        // 根据hash显示对应页面
        Object.entries(sections).forEach(([name, section]) => {
            if (currentHash === section.hash || 
                (currentHash === '' && name === '概览')) {
                if (section.element) {
                    section.element.style.display = 'block';
                    // 找到并激活对应的菜单项
                    menuItems.forEach(item => {
                        if (item.querySelector('span').textContent === name) {
                            item.classList.add('is-active');
                        }
                    });
                }
                found = true;
            }
        });

        // 如果没有找到对应页面，显示概览页
        if (!found) {
            sections['概览'].element.style.display = 'block';
            menuItems[0].classList.add('is-active');
            window.location.hash = sections['概览'].hash;
        }
    }

    // 初始显示
    showPageFromHash();

    // 监听hash变化
    window.addEventListener('hashchange', showPageFromHash);

    // 添加菜单点击事件
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const menuText = item.querySelector('span').textContent;
            
            // 如果是退出登录，不进行页面切换
            if (menuText === '退出登录') {
                return;
            }

            // 更新URL hash
            if (sections[menuText]) {
                window.location.hash = sections[menuText].hash;
            }
        });
    });
}

// 模态框控制
let currentModalCallback = null;
let currentModalCancelCallback = null;
const modalOverlay = document.querySelector('.modal-overlay');
const modalTitle = document.querySelector('.modal-title');
const modalBody = document.querySelector('.modal-body');

function showModal(title, content, callback, cancelCallback) {
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    currentModalCallback = callback;
    currentModalCancelCallback = cancelCallback;
    modalOverlay.style.display = 'flex';  // 使用 flex 布局居中显示
}

function closeModal() {
    modalOverlay.style.display = 'none';
    if (currentModalCancelCallback) {
        currentModalCancelCallback();
    }
    currentModalCallback = null;
    currentModalCancelCallback = null;
}

function submitModal() {
    if (currentModalCallback) {
        currentModalCallback();
    }
    modalOverlay.style.display = 'none';
    currentModalCallback = null;
    currentModalCancelCallback = null;
}

// 添加面板设置功能
async function initializePanelSettings() {
    console.log('Initializing panel settings...');
    
    // 获取设置值
    try {
        const response = await fetch('/settings/general');
        const settings = await response.json();
        console.log('Received settings:', settings);
        
        // 使用正确的ID选择器更新值
        const settingsMap = {
            'settings-user': settings.user,
            'settings-time': settings['timeout-period'],
            'settings-server': settings['server-address'],
            'settings-port': settings.post,
            'settings-listen': settings['listening-address'],
            'settings-unauth-set': getUnauthSettingText(settings['unauthenticated-settings']),
            'settings-ip': settings['authorized-ip'] || '未设置',
            'settings-domain': settings['Dnb-address'] || '未设置'
        };

        // 遍历并更新每个设置项
        Object.entries(settingsMap).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || '未设置';
                console.log(`Updated ${id} with value:`, value);
            } else {
                console.warn(`Element with id ${id} not found`);
            }
        });

    } catch (error) {
        console.error('Failed to fetch settings:', error);
    }
}

// 添加获取未认证设置文本的辅助函数
function getUnauthSettingText(code) {
    const settings = {
        '200': '200 - 帮助页面',
        '400': '400 - 错误请求',
        '401': '401 - 未授权',
        '403': '403 - 禁止访问',
        '404': '404 - 未找到',
        '408': '408 - 请求超时',
        '416': '416 - 无效请求'
    };
    return settings[code] || code;
}

// 添加设置标签切换功能
function switchSettingsTab(tab) {
    // 更新按钮状态
    const buttons = document.querySelectorAll('.settings-tab-btn');
    buttons.forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#606266';
        btn.style.border = '1px solid #dcdfe6';
    });
    
    const activeBtn = document.querySelector(`.settings-tab-btn[data-tab="${tab}"]`);
    if (activeBtn) {
        activeBtn.style.background = '#409eff';
        activeBtn.style.color = 'white';
        activeBtn.style.border = 'none';
    }

    // 更新内容显示
    document.getElementById('basicSettings').style.display = tab === 'foundation' ? 'block' : 'none';
    document.getElementById('securitySettings').style.display = tab === 'safe' ? 'block' : 'none';

    // 更新URL，但不触发页面刷新
    const newUrl = `/display#/panel-settings/${tab}`;
    window.history.pushState({ tab: tab }, '', newUrl);
}

// 添加URL变化监听
window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/panel-settings/')) {
        const tab = hash.split('/').pop();
        switchSettingsTab(tab);
    }
});

// 在页面加载时初始化设置标签
document.addEventListener('DOMContentLoaded', () => {
    // ... existing DOMContentLoaded code ...
    
    // 根据URL初始化设置标签
    const hash = window.location.hash;
    if (hash.startsWith('#/panel-settings/')) {
        const tab = hash.split('/').pop();
        switchSettingsTab(tab);
    }
});

// 修改错误处理的辅助函数
function handleSettingsError(result) {
    if (typeof result.error === 'string') {
        return result.error;
    } else if (result.message) {
        return result.message;
    } else if (result.msg) {
        return result.msg;
    } else {
        return '未知错误';
    }
}

// 添加面板设置模态窗口控制
let currentSettingsCallback = null;
let currentSettingsCancelCallback = null;
let settingsModalOverlay = null;
let settingsModalTitle = null;
let settingsModalBody = null;

// 初始化模态窗口元素
document.addEventListener('DOMContentLoaded', () => {
    settingsModalOverlay = document.querySelector('.settings-modal-overlay');
    settingsModalTitle = document.querySelector('.settings-modal-title');
    settingsModalBody = document.querySelector('.settings-modal-body');
});

function showSettingsModal(title, content, callback, cancelCallback) {
    if (!settingsModalOverlay || !settingsModalTitle || !settingsModalBody) {
        settingsModalOverlay = document.querySelector('.settings-modal-overlay');
        settingsModalTitle = document.querySelector('.settings-modal-title');
        settingsModalBody = document.querySelector('.settings-modal-body');
    }
    
    settingsModalTitle.textContent = title;
    settingsModalBody.innerHTML = content;
    currentSettingsCallback = callback;
    currentSettingsCancelCallback = cancelCallback;
    settingsModalOverlay.style.display = 'flex';
}

function closeSettingsModal() {
    if (settingsModalOverlay) {
        settingsModalOverlay.style.display = 'none';
        if (currentSettingsCancelCallback) {
            currentSettingsCancelCallback();
        }
        currentSettingsCallback = null;
        currentSettingsCancelCallback = null;
    }
}

function submitSettingsModal() {
    if (currentSettingsCallback) {
        currentSettingsCallback();
    }
}

// 添加错误提示函数
function showSettingsError(container, message) {
    // 移除已存在的错误提示
    const existingError = container.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 添加新的错误提示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.color = '#f56c6c';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.marginTop = '5px';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
}

// 修改面板设置模态框处理函数
function showSetupModal1() {
    const currentUser = document.getElementById('settings-user').value;
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">面板用户</label>
            <input type="text" id="modal-panel-user" class="modal-form-input" placeholder="请输入面板用户名" 
                   value="${currentUser === '未设置' ? '' : currentUser}"
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
    `;
    
    showSettingsModal('设置面板用户', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const newUser = document.getElementById('modal-panel-user').value;
        if (!newUser) {
            showSettingsError(container, '请输入面板用户名');
            return;
        }

        try {
            const response = await fetch('/settings/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user: newUser })
            });

            const result = await response.json();
            if (result.code === 0) {
                document.getElementById('settings-user').value = newUser;
                closeSettingsModal();
                await initializePanelSettings();
            } else {
                showSettingsError(container, result.msg || '设置失败');
            }
        } catch (error) {
            showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
        }
    });
}

function showSetupModal2() {
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">原密码</label>
            <input type="password" id="modal-panel-old-password" class="modal-form-input" placeholder="请输入原密码" 
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">新密码</label>
            <input type="password" id="modal-panel-password" class="modal-form-input" placeholder="请输入新密码" 
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">确认新密码</label>
            <input type="password" id="modal-panel-password-confirm" class="modal-form-input" placeholder="请再次输入新密码" 
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
    `;
    
    showSettingsModal('设置面板密码', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const oldPassword = document.getElementById('modal-panel-old-password').value;
        const newPassword = document.getElementById('modal-panel-password').value;
        const confirmPassword = document.getElementById('modal-panel-password-confirm').value;

        if (!oldPassword) {
            showSettingsError(container, '请输入原密码');
            return;
        }

        if (!newPassword) {
            showSettingsError(container, '请输入新密码');
            return;
        }

        if (!confirmPassword) {
            showSettingsError(container, '请确认新密码');
            return;
        }

        if (newPassword !== confirmPassword) {
            showSettingsError(container, '两次输入的新密码不一致');
            return;
        }

        try {
            const response = await fetch('/settings/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    oldPassword: oldPassword,
                    newPassword: newPassword 
                })
            });

            const result = await response.json();
            if (result.code === 0) {
                closeSettingsModal();
                // 删除所有相关的cookie
                const cookies = ['a', 't', 'p'];
                cookies.forEach(name => {
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                });
                // 直接跳转到登录页面
                window.location.href = '/recording';
            } else {
                showSettingsError(container, result.msg || '设置失败');
            }
        } catch (error) {
            showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
        }
    });
}

function showSetupModal3() {
    const currentTimeout = document.getElementById('settings-time').value;
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">超时时间（秒）</label>
            <input type="number" id="modal-timeout" class="modal-form-input" placeholder="请输入超时时间" 
                   value="${currentTimeout === '未设置' ? '' : currentTimeout}"
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
    `;
    
    showSettingsModal('设置超时时间', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const timeout = document.getElementById('modal-timeout').value;
        if (!timeout || timeout < 0) {
            showSettingsError(container, '请输入有效的超时时间');
            return;
        }

        try {
            const response = await fetch('/settings/timeout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ timeout: parseInt(timeout) })
            });

            const result = await response.json();
            if (result.code === 0) {
                document.getElementById('settings-time').value = timeout;
                closeSettingsModal();
                await initializePanelSettings();
            } else {
                showSettingsError(container, result.msg || '设置失败');
            }
        } catch (error) {
            showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
        }
    });
}

function showSetupModal4() {
    const currentServer = document.getElementById('settings-server').value;
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">服务器地址</label>
            <input type="text" id="modal-server-address" class="modal-form-input" placeholder="请输入服务器地址" 
                   value="${currentServer === '未设置' ? '' : currentServer}"
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
    `;
    
    showSettingsModal('设置服务器地址', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const serverAddress = document.getElementById('modal-server-address').value;
        if (!serverAddress) {
            showSettingsError(container, '请输入服务器地址');
            return;
        }

        try {
            const response = await fetch('/settings/server-address', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address: serverAddress })
            });

            const result = await response.json();
            if (result.code === 0) {
                document.getElementById('settings-server').value = serverAddress;
                closeSettingsModal();
                await initializePanelSettings();
            } else {
                showSettingsError(container, result.msg || '设置失败');
            }
        } catch (error) {
            showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
        }
    });
}

function showSetupModal5() {
    const currentPort = document.getElementById('settings-port').value;
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">面板端口</label>
            <input type="number" id="modal-panel-port" class="modal-form-input" placeholder="请输入面板端口" 
                   value="${currentPort === '未设置' ? '' : currentPort}"
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
            <div class="form-tip" style="margin-top: 5px; color: #909399; font-size: 12px;">设置成功后需要使用新端口重新登录面板</div>
        </div>
    `;
    
    showSettingsModal('设置面板端口', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const port = document.getElementById('modal-panel-port').value;
        if (!port || port < 1 || port > 65535) {
            showSettingsError(container, '请输入有效的端口号(1-65535)');
            return;
        }

        // 创建确认对话框
        const confirmDialog = document.createElement('div');
        confirmDialog.style.position = 'fixed';
        confirmDialog.style.top = '0';
        confirmDialog.style.left = '0';
        confirmDialog.style.width = '100%';
        confirmDialog.style.height = '100%';
        confirmDialog.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        confirmDialog.style.display = 'flex';
        confirmDialog.style.justifyContent = 'center';
        confirmDialog.style.alignItems = 'center';
        confirmDialog.style.zIndex = '2000';

        confirmDialog.innerHTML = `
            <div style="background: white; width: 400px; border-radius: 4px; overflow: hidden;">
                <div style="padding: 20px; display: flex; align-items: center;">
                    <i style="margin-right: 8px; color: #909399;">
                        <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                            <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
                            <path d="M24 24.0001V13.0001" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M24 33H24.02" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </i>
                    <span style="font-size: 16px; color: #303133;">端口修改</span>
                </div>
                <div style="padding: 20px; color: #606266;">服务端口修改需要重启服务，是否继续？</div>
                <div style="padding: 10px 20px 20px; text-align: right;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="padding: 8px 16px; margin-right: 10px; border-radius: 4px; border: 1px solid #dcdfe6; background: white; color: #606266; cursor: pointer;">
                        取消
                    </button>
                    <button id="confirmPortChange" 
                            style="padding: 8px 16px; border-radius: 4px; border: none; background: #409eff; color: white; cursor: pointer;">
                        输入
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmDialog);

        // 处理确认按钮点击
        document.getElementById('confirmPortChange').onclick = async () => {
            confirmDialog.remove();
            try {
                const response = await fetch('/settings/port', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ port: parseInt(port) })
                });

                const result = await response.json();
                if (result.code === 0) {
                    document.getElementById('settings-port').value = port;
                    closeSettingsModal();
                    // 保持当前协议、路径和hash，只修改端口号
                    const currentPath = window.location.pathname + window.location.hash;
                    const protocol = window.location.protocol;
                    window.location.href = `${protocol}//${window.location.hostname}:${port}${currentPath}`;
                } else {
                    showSettingsError(container, result.msg || '设置失败');
                }
            } catch (error) {
                showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
            }
        };
    });
}

function showSetupModal6() {
    const currentListen = document.getElementById('settings-listen').value;
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">监听地址</label>
            <input type="text" id="modal-listen-address" class="modal-form-input" placeholder="请输入监听地址" 
                   value="${currentListen === '未设置' ? '' : currentListen}"
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
    `;
    
    showSettingsModal('设置监听地址', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const address = document.getElementById('modal-listen-address').value;
        if (!address) {
            showSettingsError(container, '请输入监听地址');
            return;
        }

        try {
            const response = await fetch('/settings/listen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address })
            });

            const result = await response.json();
            if (result.code === 0) {
                document.getElementById('settings-listen').value = address;
                closeSettingsModal();
                await initializePanelSettings();
            } else {
                showSettingsError(container, result.msg || '设置失败');
            }
        } catch (error) {
            showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
        }
    });
}

function showSetupModal7() {
    const currentEntry = document.getElementById('settings-unauth-entrance').value;
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">安全入口</label>
            <input type="text" id="modal-security-entry" class="modal-form-input" placeholder="请输入安全入口" 
                   value="${currentEntry === '未设置' || currentEntry === '****' ? '' : currentEntry}"
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
    `;
    
    showSettingsModal('设置安全入口', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const entry = document.getElementById('modal-security-entry').value;
        if (!entry) {
            showSettingsError(container, '请输入安全入口');
            return;
        }

        try {
            const response = await fetch('/settings/security-entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ entry })
            });

            const result = await response.json();
            if (result.code === 0) {
                document.getElementById('settings-unauth-entrance').value = '****';
                closeSettingsModal();
                await initializePanelSettings();
            } else {
                showSettingsError(container, result.msg || '设置失败');
            }
        } catch (error) {
            showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
        }
    });
}

function showSetupModal8() {
    const currentUnauth = document.getElementById('settings-unauth-set').value;
    const currentCode = currentUnauth.split(' - ')[0] || '200';
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">未认证设置</label>
            <select id="modal-unauth-setting" class="modal-form-input" 
                    style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
                <option value="200" ${currentCode === '200' ? 'selected' : ''}>200 - 帮助页面</option>
                <option value="400" ${currentCode === '400' ? 'selected' : ''}>400 - 错误请求</option>
                <option value="401" ${currentCode === '401' ? 'selected' : ''}>401 - 未授权</option>
                <option value="403" ${currentCode === '403' ? 'selected' : ''}>403 - 禁止访问</option>
                <option value="404" ${currentCode === '404' ? 'selected' : ''}>404 - 未找到</option>
                <option value="408" ${currentCode === '408' ? 'selected' : ''}>408 - 请求超时</option>
                <option value="416" ${currentCode === '416' ? 'selected' : ''}>416 - 无效请求</option>
            </select>
        </div>
    `;
    
    showSettingsModal('设置未认证响应', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const setting = document.getElementById('modal-unauth-setting').value;
        if (!setting) {
            showSettingsError(container, '请选择未认证响应设置');
            return;
        }

        try {
            const response = await fetch('/settings/unauth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: parseInt(setting) })
            });

            const result = await response.json();
            if (result.code === 0) {
                document.getElementById('settings-unauth-set').value = getUnauthSettingText(setting);
                closeSettingsModal();
                await initializePanelSettings();
            } else {
                showSettingsError(container, result.msg || '设置失败');
            }
        } catch (error) {
            showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
        }
    });
}

function showSetupModal9() {
    const currentIPs = document.getElementById('settings-ip').value;
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">授权IP</label>
            <input type="text" id="modal-auth-ip" class="modal-form-input" placeholder="请输入授权IP，多个IP用逗号分隔" 
                   value="${currentIPs === '未设置' ? '' : currentIPs}"
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
    `;
    
    showSettingsModal('设置授权IP', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const ips = document.getElementById('modal-auth-ip').value;
        try {
            const response = await fetch('/settings/auth-ip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ips: ips ? ips.split(',').map(ip => ip.trim()) : [] })
            });

            const result = await response.json();
            if (result.code === 0) {
                document.getElementById('settings-ip').value = ips || '未设置';
                closeSettingsModal();
                await initializePanelSettings();
            } else {
                showSettingsError(container, result.msg || '设置失败');
            }
        } catch (error) {
            showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
        }
    });
}

function showSetupModal10() {
    const currentDomain = document.getElementById('settings-domain').value;
    const modalContent = `
        <div class="modal-form-item" style="margin-bottom: 24px;">
            <label class="modal-form-label" style="display: block; margin-bottom: 10px; color: #606266; font-size: 14px;">域名绑定</label>
            <input type="text" id="modal-domain-bind" class="modal-form-input" placeholder="请输入要绑定的域名" 
                   value="${currentDomain === '未设置' ? '' : currentDomain}"
                   style="width: 100%; height: 32px; padding: 0 12px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266;">
        </div>
    `;
    
    showSettingsModal('设置域名绑定', modalContent, async () => {
        const container = document.querySelector('.settings-modal-body .modal-form-item');
        const domain = document.getElementById('modal-domain-bind').value;
        try {
            const response = await fetch('/settings/domain-bind', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ domain: domain || '' })
            });

            const result = await response.json();
            if (result.code === 0) {
                document.getElementById('settings-domain').value = domain || '未设置';
                closeSettingsModal();
                await initializePanelSettings();
            } else {
                showSettingsError(container, result.msg || '设置失败');
            }
        } catch (error) {
            showSettingsError(container, `设置失败：${error.message || '请求失败'}`);
        }
    });
}