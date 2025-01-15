const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 读取配置文件
function readConfig() {
    try {
        const configPath = path.join(__dirname, 'data', 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config;
    } catch (error) {
        console.error('读取配置文件错误:', error);
        return {
            'unauthenticated-settings': '408' // 默认使用 408
        };
    }
}

// 获取状态码对应的错误页面内容
function getErrorPageContent(statusCode) {
    try {
        const errorPagePath = path.join(__dirname, 'page', `${statusCode}.html`);
        return fs.readFileSync(errorPagePath, 'utf8');
    } catch (error) {
        // 如果找不到对应的错误页面，返回默认错误信息
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${statusCode} - 请求错误</title>
                <meta charset="utf-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                        background: #f5f5f5;
                    }
                    .error-container {
                        background: white;
                        padding: 30px;
                        border-radius: 5px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        display: inline-block;
                    }
                    h1 {
                        color: #e74c3c;
                        margin-bottom: 20px;
                    }
                    p {
                        color: #666;
                        margin-bottom: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>${statusCode} 错误</h1>
                    <p>${getStatusText(statusCode)}</p>
                    <p>${getStatusDescription(statusCode)}</p>
                </div>
            </body>
            </html>
        `;
    }
}

// 获取状态码对应的文本描述
function getStatusText(code) {
    const statusTexts = {
        200: 'OK',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        408: 'Request Timeout',
        416: 'Range Not Satisfiable'
    };
    return statusTexts[code] || 'Unknown Error';
}

// 获取状态码对应的中文描述
function getStatusDescription(code) {
    const descriptions = {
        200: '请求成功',
        400: '服务器无法理解请求',
        401: '需要身份验证',
        403: '服务器拒绝请求',
        404: '请求的资源不存在',
        408: '请求超时',
        416: '请求范围不合法'
    };
    return descriptions[code] || '未知错误';
}

// 处理所有未定义的路由
router.use('*', (req, res) => {
    const config = readConfig();
    const statusCode = parseInt(config['unauthenticated-settings']) || 408;
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(statusCode);
    
    // 获取并发送错误页面内容
    const errorContent = getErrorPageContent(statusCode);
    res.send(errorContent);
});

module.exports = router;
