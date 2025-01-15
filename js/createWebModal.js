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
