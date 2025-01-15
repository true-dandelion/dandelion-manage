// 更新监控值的辅助函数
function updateMonitorValue(type, percentage, detail) {
    const item = Array.from(document.querySelectorAll('.monitor-item')).find(
        el => el.querySelector('[style*="font-size: 14px"]')?.textContent === type
    );
    
    if (item) {
        // 更新百分比显示
        const valueEl = item.querySelector('[style*="font-size: 24px"]');
        if (valueEl) {
            // 添加过渡动画
            valueEl.style.transition = 'opacity 0.3s';
            valueEl.style.opacity = '0';
            setTimeout(() => {
                valueEl.textContent = `${percentage}%`;
                valueEl.style.opacity = '1';
            }, 300);
        }

        const svgPath = item.querySelector('svg path:last-child');
        if (svgPath) {
            svgPath.style.transition = 'stroke-dasharray 0.6s ease-in-out';
            svgPath.setAttribute('stroke-dasharray', `${percentage}, 100`);
        }

        const detailEl = item.querySelector('[style*="font-size: 12px"]');
        if (detailEl) {
            detailEl.style.transition = 'opacity 0.3s';
            detailEl.style.opacity = '0';
            setTimeout(() => {
                detailEl.textContent = detail;
                detailEl.style.opacity = '1';
            }, 300);
        }
    }
}

// 改进错误处理的系统信息更新函数
async function updateSystemInfo() {
    try {
        // 初始化所有数值为0
        document.querySelectorAll('.monitor-item').forEach(item => {
            const valueEl = item.querySelector('[style*="font-size: 24px"]');
            const svgPath = item.querySelector('svg path:last-child');
            const detailEl = item.querySelector('[style*="font-size: 12px"]');
            const type = item.querySelector('[style*="font-size: 14px"]')?.textContent;

            if (valueEl) {
                valueEl.textContent = '0%';
                if (svgPath) {
                    svgPath.setAttribute('stroke-dasharray', '0, 100');
                }
            }

            if (detailEl) {
                switch(type) {
                    case 'CPU':
                        detailEl.textContent = '(0/0)核';
                        break;
                    case '内存':
                        detailEl.textContent = '(0/0)GB';
                        break;
                    case '负载':
                        detailEl.textContent = '运行正常';
                        break;
                    case '/':
                        detailEl.textContent = '(0GB/0GB)';
                        break;
                }
            }
        });

        // 初始化系统信息
        document.querySelectorAll('.info-item div:last-child').forEach(item => {
            item.textContent = '-';
        });

        // 获取状态数据
        const stateResponse = await fetch('/state');
        if (!stateResponse.ok) {
            throw new Error(`HTTP error! status: ${stateResponse.status}`);
        }
        const stateData = await stateResponse.json();
        
        // 更新状态信息
        if (stateData) {
            updateMonitorValue('CPU', stateData.cpu.percentage, `(${stateData.cpu.used}/${stateData.cpu.total})核`);
            updateMonitorValue('内存', stateData.memory.percentage, `(${stateData.memory.used}/${stateData.memory.total})GB`);
            updateMonitorValue('负载', stateData.load.percentage, stateData.load.status);
            updateMonitorValue('/', stateData.disk.percentage, `(${stateData.disk.used}GB/${stateData.disk.total}GB)`);
        }

        // 获取系统信息
        const systemResponse = await fetch('/system');
        if (!systemResponse.ok) {
            throw new Error(`HTTP error! status: ${systemResponse.status}`);
        }
        const systemData = await systemResponse.json();
        
        // 更新系统信息
        if (systemData) {
            const systemInfoMap = {
                'hostname': '主机名称',
                'os_version': '发行版本',
                'kernel_version': '内核版本',
                'system_type': '系统类型',
                'boot_time': '启动时间',
                'uptime': '运行时间'
            };

            Object.entries(systemInfoMap).forEach(([key, label]) => {
                const infoItem = Array.from(document.querySelectorAll('.info-item')).find(
                    item => item.querySelector('div').textContent === label
                );
                if (infoItem) {
                    const valueEl = infoItem.querySelector('div:last-child');
                    if (valueEl) {
                        valueEl.textContent = systemData[key] || '-';
                    }
                }
            });
        }

    } catch (error) {
        console.error('系统信息更新失败:', error.message);
        // 在页面上显示错误状态
        document.querySelectorAll('.info-item div:last-child').forEach(item => {
            item.textContent = '获取失败';
        });
    }
}

// 初始化页面
(async function initPage() {
    // 初始化数据
    await updateSystemInfo();
    
    // 设置定时器，每30秒更新一次状态数据
    setInterval(async () => {
        try {
            // 只获取状态数据
            const stateResponse = await fetch('/state');
            const stateData = await stateResponse.json();
            
            if (stateData) {
                updateMonitorValue('CPU', stateData.cpu.percentage, `(${stateData.cpu.used}/${stateData.cpu.total})核`);
                updateMonitorValue('内存', stateData.memory.percentage, `(${stateData.memory.used}/${stateData.memory.total})GB`);
                updateMonitorValue('负载', stateData.load.percentage, stateData.load.status);
                updateMonitorValue('/', stateData.disk.percentage, `(${stateData.disk.used}GB/${stateData.disk.total}GB)`);
            }
        } catch (error) {
            console.error('Failed to fetch state info:', error);
        }
    }, 30000);
})();

// 添加页面可见性变化监听
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
        try {
            const systemResponse = await fetch('/system');
            const systemData = await systemResponse.json();
            
            if (systemData) {
                const systemInfoMap = {
                    'hostname': '主机名称',
                    'os_version': '发行版本',
                    'kernel_version': '内核版本',
                    'system_type': '系统类型',
                    'boot_time': '启动时间',
                    'uptime': '运行时间'
                };

                Object.entries(systemInfoMap).forEach(([key, label]) => {
                    const infoItem = Array.from(document.querySelectorAll('.info-item')).find(
                        item => item.querySelector('div').textContent === label
                    );
                    if (infoItem) {
                        const valueEl = infoItem.querySelector('div:last-child');
                        if (valueEl) {
                            valueEl.textContent = systemData[key] || '-';
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Failed to fetch system info:', error);
        }
    }
});
