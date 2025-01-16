const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

// 添加请求体解析中间件
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
// CSV 文件路径
const CSV_FILE = path.join(__dirname, 'data', 'users.csv');

// 读取 CSV 数据
function readCSV() {
    return new Promise((resolve, reject) => {
        const users = [];
        fs.createReadStream(CSV_FILE)
            .pipe(parse({ columns: true }))
            .on('data', (row) => {
                users.push(row);
            })
            .on('end', () => {
                resolve(users);
            })
            .on('error', reject);
    });
}

// 写入 CSV 数据
function writeCSV(users) {
    return new Promise((resolve, reject) => {
        stringify(users, { header: true }, (err, output) => {
            if (err) {
                reject(err);
                return;
            }
            fs.writeFile(CSV_FILE, output, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

// 如果配置文件不存在，创建默认配置
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ 
        routeAddress: '/w',
        domain: null,
        allowedDomains: [],
        'post': '9960',
        'listening-address': '0.0.0.0',
        'language': 'zh-cn',
        'timeout-period': '6400',
        'server-address': '',
        'server-address-control': 'false',
        'unauthenticated-settings': '200',
        'authorized-ip': '',
        'authorized-ip-control': 'false',
        'Dnb-address': '',
        'Dnb-control': 'false'
    }, null, 4));
}

// 读取配置文件
function readConfig() {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return config;
    } catch (error) {
        console.error('读取配置文件错误:', error);
        return { 
            routeAddress: '/w',
            domain: null,
            allowedDomains: [],
            'post': '9960',
            'listening-address': '0.0.0.0'
        };
    }
}

// 写入配置文件
function writeConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4));
    } catch (error) {
        console.error('写入配置文件错误:', error);
    }
}

// 检查域名访问权限的中间件
function domainAccessMiddleware(req, res, next) {
    const config = readConfig();
    const host = req.get('host');
    
    // 如果是通过IP访问，直接允许
    if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host)) {
        return next();
    }
    
    // 如果是通过localhost访问，直接允许
    if (/^localhost(:\d+)?$/.test(host)) {
        return next();
    }
    
    // 如果域名未设置，允许所有访问
    if (!config.domain) {
        return next();
    }
    
    // 检查域名是否匹配
    const requestDomain = host.split(':')[0];  // 移除端口号
    if (requestDomain === config.domain) {
        return next();
    }
    
    // 如果域名不匹配，返回403错误
    res.status(403).json({
        code: 403,
        msg: '域名访问未授权',
        data: null
    });
}

// 从配置文件读取当前地址
let modifiedAddress = readConfig().routeAddress;

// 存储当前活动的路由处理器
let currentRouteHandler = null;

// 清理所有自定义路由的辅助函数
function clearAllCustomRoutes(app) {
    // 保留系统路由和API路由
    app._router.stack = app._router.stack.filter(layer => {
        // 如果是路由层
        if (layer.route) {
            // 保留所有非重定向路由（如API路由）
            return layer.route.path.startsWith('/settings') || 
                   layer.route.path === '/recording' ||
                   layer.route.path === '/display' ||
                   layer.route.path === '/system' ||
                   layer.route.path === '/state' ||
                   layer.route.path === '/password' ||
                   layer.route.path.startsWith('/network/');
        }
        // 保留中间件层
        return true;
    });
}

// 设置安全入口接口
router.post('/security-entry', (req, res) => {
    try {
        const { entry } = req.body;

        // 验证参数
        if (!entry) {
            return res.json({
                code: 1,
                msg: '安全入口地址不能为空',
                data: null
            });
        }

        // 验证入口格式（必须以/开头）
        if (!entry.startsWith('/')) {
            return res.json({
                code: 2,
                msg: '安全入口必须以/开头',
                data: null
            });
        }

        // 清理所有自定义路由
        clearAllCustomRoutes(req.app);
        
        // 更新当前地址
        modifiedAddress = entry;
        
        // 读取配置
        const config = readConfig();
        
        // 更新配置
        config['routeAddress'] = entry;
        writeConfig(config);
        
        // 添加新路由
        currentRouteHandler = req.app.get(entry, (req, res) => {
            res.redirect('/recording');
        });

        res.json({
            code: 0,
            msg: '安全入口设置成功',
            data: {
                entry: entry
            }
        });
    } catch (error) {
        console.error('设置安全入口失败:', error);
        res.json({
            code: 500,
            msg: '设置安全入口失败: ' + error.message,
            data: null
        });
    }
});

// 域名设置接口
router.post('/domain', (req, res) => {
    try {
        const { domain } = req.body;
        
        if (!domain) {
            return res.json({
                code: 1,
                msg: '域名不能为空',
                data: null
            });
        }

        // 验证域名格式
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        if (!domainRegex.test(domain)) {
            return res.json({
                code: 2,
                msg: '域名格式不正确',
                data: null
            });
        }

        // 读取当前配置
        const config = readConfig();
        
        // 更新配置
        config.domain = domain;
        writeConfig(config);

        // 构建新的访问地址
        const url = `http://${domain}${config.routeAddress || '/w'}`;

        res.json({
            code: 0,
            msg: '域名设置成功',
            data: {
                domain: domain,
                url: url
            }
        });
    } catch (error) {
        console.error('设置域名失败:', error);
        res.json({
            code: 500,
            msg: '设置域名失败',
            data: null
        });
    }
});

// 获取通用设置接口
router.get('/general', async (req, res) => {
    try {
        // 读取配置文件
        const config = readConfig();
        
        // 读取用户数据
        const users = await readCSV();
        const username = users.length > 0 ? users[0].username : '';

        // 构建响应数据
        const generalSettings = {
            user: username,
            'timeout-period': config['timeout-period'] || '6400',
            'server-address': config['server-address-control'] === 'false' ? '' : (config['server-address'] || ''),
            'post': config['post'] || '9960',
            'listening-address': config['listening-address'] || '0.0.0.0',
            'unauthenticated-settings': config['unauthenticated-settings'] || '200',
            'authorized-ip': config['authorized-ip-control'] === 'false' ? '' : (config['authorized-ip'] || ''),
            'Dnb-address': config['Dnb-control'] === 'false' ? '' : (config['Dnb-address'] || '')
        };

        res.json(generalSettings);
    } catch (error) {
        console.error('获取通用设置失败:', error);
        res.status(500).json({
            code: 500,
            msg: '获取通用设置失败',
            data: null
        });
    }
});

// 用户名修改接口
router.post('/user', async (req, res) => {
    try {
        const { username } = req.body;

        // 验证用户名是否存在
        if (!username) {
            return res.json({
                code: 1,
                msg: '用户名不能为空',
                data: null
            });
        }

        // 读取用户数据
        const users = await readCSV();
        
        if (users.length === 0) {
            return res.json({
                code: 2,
                msg: '未找到用户数据',
                data: null
            });
        }

        // 修改第一个用户的用户名
        users[0].username = username;

        // 保存修改
        await writeCSV(users);

        res.json({
            code: 0,
            msg: '用户名修改成功，请重新登录',
            data: {
                username: username,
                needRelogin: true
            }
        });
    } catch (error) {
        console.error('修改用户名失败:', error);
        res.json({
            code: 500,
            msg: '修改用户名失败: ' + error.message,
            data: null
        });
    }
});

// 密码修改接口
router.post('/password', async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        // 验证参数
        if (!oldPassword || !newPassword) {
            return res.json({
                code: 1,
                msg: '原密码和新密码不能为空',
                data: null
            });
        }

        // 读取用户数据
        const users = await readCSV();
        
        if (users.length === 0) {
            return res.json({
                code: 2,
                msg: '未找到用户数据',
                data: null
            });
        }

        // 验证原密码
        if (users[0].password !== oldPassword) {
            return res.json({
                code: 3,
                msg: '原密码错误',
                data: null
            });
        }

        // 修改密码
        users[0].password = newPassword;

        // 保存修改
        await writeCSV(users);

        res.json({
            code: 0,
            msg: '密码修改成功，请重新登录',
            data: {
                needRelogin: true
            }
        });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.json({
            code: 500,
            msg: '修改密码失败: ' + error.message,
            data: null
        });
    }
});

// 超时时间设置接口
router.post('/timeout', (req, res) => {
    try {
        const { timeout } = req.body;

        // 验证参数
        if (!timeout) {
            return res.json({
                code: 1,
                msg: '超时时间不能为空',
                data: null
            });
        }

        // 验证超时时间格式
        const timeoutNum = parseInt(timeout);
        if (isNaN(timeoutNum) || timeoutNum <= 0) {
            return res.json({
                code: 2,
                msg: '超时时间必须是大于0的数字',
                data: null
            });
        }

        // 读取配置
        const config = readConfig();
        
        // 更新配置
        config['timeout-period'] = timeout.toString();
        writeConfig(config);

        res.json({
            code: 0,
            msg: '超时时间设置成功',
            data: {
                timeout: timeout
            }
        });
    } catch (error) {
        console.error('设置超时时间失败:', error);
        res.json({
            code: 500,
            msg: '设置超时时间失败: ' + error.message,
            data: null
        });
    }
});

// 服务器地址设置接口
router.post('/server', (req, res) => {
    try {
        const { address } = req.body;

        // 验证参数
        if (!address) {
            return res.json({
                code: 1,
                msg: '服务器地址不能为空',
                data: null
            });
        }

        // 读取配置
        const config = readConfig();
        
        // 更新配置
        config['server-address'] = address;
        config['server-address-control'] = 'true';  // 启用服务器地址控制

        writeConfig(config);

        res.json({
            code: 0,
            msg: '服务器地址设置成功',
            data: {
                address: address
            }
        });
    } catch (error) {
        console.error('设置服务器地址失败:', error);
        res.json({
            code: 500,
            msg: '设置服务器地址失败: ' + error.message,
            data: null
        });
    }
});

// 面板端口设置接口
router.post('/port', (req, res) => {
    try {
        const { port } = req.body;

        // 验证参数
        if (!port) {
            return res.json({
                code: 1,
                msg: '端口号不能为空',
                data: null
            });
        }

        // 验证端口号格式
        const portNum = parseInt(port);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            return res.json({
                code: 2,
                msg: '端口号必须是1-65535之间的数字',
                data: null
            });
        }

        // 读取配置
        const config = readConfig();
        
        // 更新配置
        config['post'] = port.toString();
        writeConfig(config);

        res.json({
            code: 0,
            msg: '端口设置成功，需要重启面板生效',
            data: {
                port: portNum,
                needRestart: true
            }
        });
    } catch (error) {
        console.error('设置端口失败:', error);
        res.json({
            code: 500,
            msg: '设置端口失败: ' + error.message,
            data: null
        });
    }
});

// 监听地址设置接口
router.post('/listen', (req, res) => {
    try {
        const { address } = req.body;

        // 验证参数
        if (!address) {
            return res.json({
                code: 1,
                msg: '监听地址不能为空',
                data: null
            });
        }

        // 验证IP地址格式（包括0.0.0.0和127.0.0.1等特殊地址）
        const ipRegex = /^((\d{1,3}\.){3}\d{1,3}|localhost)$/;
        if (!ipRegex.test(address)) {
            return res.json({
                code: 2,
                msg: '监听地址格式不正确',
                data: null
            });
        }

        // 如果是IP地址，验证每个段是否在0-255范围内
        if (address !== 'localhost') {
            const parts = address.split('.');
            for (const part of parts) {
                const num = parseInt(part);
                if (num < 0 || num > 255) {
                    return res.json({
                        code: 2,
                        msg: '监听地址格式不正确',
                        data: null
                    });
                }
            }
        }

        // 读取配置
        const config = readConfig();
        
        // 更新配置
        config['listening-address'] = address;
        writeConfig(config);

        res.json({
            code: 0,
            msg: '监听地址设置成功',
            data: {
                address: address
            }
        });
    } catch (error) {
        console.error('设置监听地址失败:', error);
        res.json({
            code: 500,
            msg: '设置监听地址失败: ' + error.message,
            data: null
        });
    }
});

// 设置未认证响应接口
router.post('/unauth', (req, res) => {
    try {
        const { code } = req.body;

        // 验证参数
        if (!code) {
            return res.json({
                code: 1,
                msg: '响应码不能为空',
                data: null
            });
        }

        // 验证响应码
        const validCodes = [200, 400, 401, 403, 404, 408, 416];
        if (!validCodes.includes(code)) {
            return res.json({
                code: 2,
                msg: '无效的响应码',
                data: null
            });
        }

        // 读取配置
        const config = readConfig();
        
        // 更新配置
        config['unauthenticated-settings'] = code.toString();
        writeConfig(config);

        res.json({
            code: 0,
            msg: '未认证响应设置成功',
            data: {
                code: code
            }
        });
    } catch (error) {
        console.error('设置未认证响应失败:', error);
        res.json({
            code: 500,
            msg: '设置未认证响应失败: ' + error.message,
            data: null
        });
    }
});

// 获取未认证响应预览接口
router.post('/preview', (req, res) => {
    try {
        const { code } = req.body;

        // 验证参数
        if (!code) {
            return res.json({
                code: 1,
                msg: '响应码不能为空',
                data: null
            });
        }

        // 将code转换为数字并验证
        const codeNum = parseInt(code);
        const validCodes = [200, 400, 401, 403, 404, 408, 416];
        if (!validCodes.includes(codeNum)) {
            return res.json({
                code: 2,
                msg: '无效的响应码',
                data: null
            });
        }

        // 读取对应的HTML文件
        const htmlPath = path.join(__dirname, 'page', `${codeNum}.html`);
        const content = fs.readFileSync(htmlPath, 'utf8');

        res.json({
            code: 0,
            msg: '获取预览成功',
            data: {
                code: codeNum,
                content: content
            }
        });
    } catch (error) {
        console.error('获取预览失败:', error);
        res.json({
            code: 500,
            msg: '获取预览失败: ' + error.message,
            data: null
        });
    }
});

// 辅助函数：获取状态码对应的文本
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
    return statusTexts[code] || 'Unknown Status';
}

// 辅助函数：获取状态码对应的描述
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
    return descriptions[code] || '未知状态';
}

// 添加语言更新接口
router.post('/update', (req, res) => {
    try {
        const { l, Language } = req.body;
        const timestamp = Date.now();

        // 读取配置
        const config = readConfig();

        // l=1: 请求当前语言设置
        if (l === '1' || l === 1) {
            return res.json({
                a: timestamp,
                l: 1,
                Language: config.language === 'en' ? 'en' : 'zh'
            });
        }

        // l=2: 更新语言设置
        if (l === '2' || l === 2) {
            // 验证语言参数
            if (!Language || (Language !== 'en' && Language !== 'zh')) {
                return res.json({
                    code: 1,
                    msg: '无效的语言设置',
                    data: null
                });
            }

            // 更新配置
            config.language = Language === 'en' ? 'en' : 'zh-cn';
            writeConfig(config);

            return res.json({
                a: timestamp,
                l: 2,
                Language: Language
            });
        }

        // 无效的 l 参数
        return res.json({
            code: 2,
            msg: '无效的操作类型',
            data: null
        });

    } catch (error) {
        console.error('语言设置操作失败:', error);
        return res.json({
            code: 500,
            msg: '语言设置操作失败: ' + error.message,
            data: null
        });
    }
});

// 导出路由器和其他需要的变量/函数
module.exports = {
    router,
    readConfig,
    writeConfig,
    modifiedAddress,
    currentRouteHandler,
    domainAccessMiddleware,
    clearAllCustomRoutes
};


