const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { stat } = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const https = require('https');

// 存储运行中的服务器实例
const runningServers = new Map();

// 添加证书数据文件路径
const CERTIFICATES_FILE = path.join(__dirname, 'data', 'certificates.json');

// 读取证书数据
async function readCertificates() {
    try {
        await fs.access(CERTIFICATES_FILE);
        const data = await fs.readFile(CERTIFICATES_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// 添加body-parser中间件
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// 存储网站数据的文件路径
const WEB_SITES_FILE = path.join(__dirname, 'data', 'websites.json');

// 确保数据目录和文件存在
async function ensureDataFile() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir);
    }

    try {
        await fs.access(WEB_SITES_FILE);
    } catch {
        await fs.writeFile(WEB_SITES_FILE, '[]');
    }
}

// 读取网站数据
async function readWebsites() {
    await ensureDataFile();
    const data = await fs.readFile(WEB_SITES_FILE, 'utf8');
    return JSON.parse(data);
}

// 写入网站数据
async function writeWebsites(websites) {
    await ensureDataFile();
    await fs.writeFile(WEB_SITES_FILE, JSON.stringify(websites, null, 2));
}

// 目录浏览接口
router.get('/search', async (req, res) => {
    try {
        let path;
        if (req.query.choose) {
            path = decodeURIComponent(req.query.choose);
            if (!path) {
                throw new Error('无效的路径');
            }
        } else {
            path = process.platform === 'win32' ? __dirname : '/';
        }

        try {
            await fs.access(path);
        } catch (error) {
            return res.status(400).json({
                code: 400,
                message: `路径不存在或无法访问: ${path}`
            });
        }

        const files = await fs.readdir(path);
        const fileDetails = await Promise.all(
            files.map(async (file) => {
                const fullPath = path + (path.endsWith('/') || path.endsWith('\\') ? '' : path.includes('/') ? '/' : '\\') + file;
                try {
                    const stats = await stat(fullPath);
                    return {
                        path: fullPath,
                        name: file,
                        isDir: stats.isDirectory()
                    };
                } catch (err) {
                    console.error(`Error reading file ${file}:`, err);
                    return null;
                }
            })
        );

        const validFiles = fileDetails.filter(file => file !== null);

        res.json({
            code: 200,
            message: {
                currentPath: path,
                files: validFiles
            }
        });
    } catch (error) {
        res.status(500).json({
            code: 500,
            message: `获取文件列表失败: ${error.message}`
        });
    }
});

// 获取入口文件列表接口
router.get('/entry-files', async (req, res) => {
    try {
        const directory = decodeURIComponent(req.query.directory);
        const packageJsonPath = path.join(directory, 'package.json');
        
        try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            const entries = [];
            
            // 从scripts中获取所有启动命令
            if (packageJson.scripts) {
                // 遍历所有scripts
                Object.entries(packageJson.scripts).forEach(([name, command]) => {
                    // 将脚本名称和命令组合成一个对象
                    entries.push({
                        name: name,
                        command: command
                    });
                });
            }
            
            res.json({
                code: 200,
                entries
            });
        } catch {
            // 如果找不到package.json或解析失败，返回空列表
            res.json({
                code: 200,
                entries: []
            });
        }
    } catch (error) {
        res.status(500).json({
            code: 500,
            message: `获取启动命令列表失败: ${error.message}`
        });
    }
});

// 创建网站接口
router.post('/create', async (req, res) => {
    try {
        const { type, name, directory, port, entryFile, startCommand, indexFile } = req.body;
        
        // 验证必填字段
        if (!type || !name || !directory || !port) {
            return res.status(400).send('缺少必填字段');
        }
        
        // 验证类型特定字段
        if ((type === 'nodejs' && !entryFile) ||
            (type === 'program' && !startCommand) ||
            (type === 'static' && !indexFile)) {
            return res.status(400).send('缺少类型特定的必填字段');
        }
        
        // 验证目录是否存在
        try {
            await fs.access(directory);
        } catch {
            return res.status(400).send('目录不存在或无法访问');
        }
        
        // 验证端口是否被占用
        const websites = await readWebsites();
        if (websites.some(site => site.port === port)) {
            return res.status(400).send('端口已被占用');
        }
        
        // 创建新网站配置
        const newWebsite = {
            id: uuidv4(),
            type,
            name,
            directory,
            port,
            status: 'stopped',
            protocol: 'http',
            createdAt: new Date().toISOString(),
            ...(type === 'nodejs' && { entryFile }),
            ...(type === 'program' && { startCommand }),
            ...(type === 'static' && { indexFile })
        };
        
        // 保存网站配置
        websites.push(newWebsite);
        await writeWebsites(websites);
        
        res.status(200).send('创建成功');
    } catch (error) {
        res.status(500).send(`创建失败: ${error.message}`);
    }
});

// 获取网站列表接口
router.get('/list', async (req, res) => {
    try {
        const websites = await readWebsites();
        res.json(websites);
    } catch (error) {
        res.status(500).json([]);
    }
});

// 获取网站详情接口
router.get('/detail/:id', async (req, res) => {
    try {
        const websites = await readWebsites();
        const website = websites.find(site => site.id === req.params.id);
        
        if (!website) {
            return res.status(404).send('网站不存在');
        }
        
        res.json(website);
    } catch (error) {
        res.status(500).send(`获取网站详情失败: ${error.message}`);
    }
});

// 创建静态网页服务器
async function createStaticServer(website) {
    const app = express();
    
    // 首页路由 - 当访问根路径时返回首页文件
    app.get('/', (req, res) => {
        res.sendFile(path.join(website.directory, website.indexFile));
    });
    
    // 设置静态文件目录，但不自动返回index.html
    app.use(express.static(website.directory, {
        index: false
    }));
    
    // 其他路由 - 如果文件不存在则返回404
    app.use((req, res) => {
        res.status(404).send('404 Not Found');
    });
    
    let server;
    
    if (website.protocol === 'https') {
        // 获取证书列表
        const certificates = await readCertificates();
        
        // 如果指定了证书ID，使用指定的证书
        let certificate;
        if (website.certificateId) {
            certificate = certificates.find(cert => cert.id === website.certificateId);
        }
        
        // 如果没有指定证书或找不到指定的证书，使用第一个有效的证书
        if (!certificate) {
            certificate = certificates.find(cert => cert.status === 'valid');
        }
        
        if (!certificate) {
            throw new Error('没有可用的SSL证书');
        }
        
        // 读取证书文件
        const httpsOptions = {
            key: await fs.readFile(certificate.keyPath),
            cert: await fs.readFile(certificate.certPath)
        };
        
        // 创建HTTPS服务器
        server = https.createServer(httpsOptions, app);
    } else {
        // 创建HTTP服务器
        server = http.createServer(app);
    }
    
    return new Promise((resolve, reject) => {
        server.listen(website.port, () => {
            console.log(`${website.protocol.toUpperCase()} 网站 ${website.name} 运行在端口 ${website.port}`);
            resolve(server);
        });
        
        server.on('error', (error) => {
            reject(error);
        });
    });
}

// 添加创建NodeJS服务器的函数
async function createNodeJSServer(website) {
    const { spawn } = require('child_process');
    const path = require('path');

    return new Promise((resolve, reject) => {
        // 解析命令和参数
        const [command, ...args] = website.entryFile.split(' ');
        
        // 创建子进程，使用childProcess而不是process
        const childProcess = spawn(command, args, {
            cwd: website.directory,
            shell: true,
            env: {
                ...process.env,
                PORT: website.port
            }
        });

        // 记录输出
        childProcess.stdout.on('data', (data) => {
            console.log(`[${website.name}] ${data}`);
        });

        childProcess.stderr.on('data', (data) => {
            console.error(`[${website.name}] Error: ${data}`);
        });

        // 监听错误
        childProcess.on('error', (error) => {
            console.error(`[${website.name}] Failed to start: ${error.message}`);
            reject(error);
        });

        // 监听退出
        childProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(`[${website.name}] Process exited with code ${code}`);
                reject(new Error(`Process exited with code ${code}`));
            }
        });

        // 等待一段时间确保服务启动成功
        setTimeout(() => {
            resolve(childProcess);
        }, 2000);
    });
}

// 添加创建程序运行服务器的函数
async function createProgramServer(website) {
    const { spawn } = require('child_process');
    const path = require('path');

    return new Promise((resolve, reject) => {
        // 创建子进程
        const childProcess = spawn('node', ['server.js'], {
            cwd: website.directory,
            shell: true,
            env: {
                ...process.env,
                PORT: website.port
            }
        });

        // 记录输出
        childProcess.stdout.on('data', (data) => {
            console.log(`[${website.name}] ${data}`);
        });

        childProcess.stderr.on('data', (data) => {
            console.error(`[${website.name}] Error: ${data}`);
        });

        // 监听错误
        childProcess.on('error', (error) => {
            console.error(`[${website.name}] Failed to start: ${error.message}`);
            reject(error);
        });

        // 监听退出
        childProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(`[${website.name}] Process exited with code ${code}`);
                reject(new Error(`Process exited with code ${code}`));
            }
        });

        // 等待一段时间确保服务启动成功
        setTimeout(() => {
            resolve(childProcess);
        }, 2000);
    });
}

// 修改启动网站接口
router.post('/start/:id', async (req, res) => {
    try {
        const websites = await readWebsites();
        const website = websites.find(site => site.id === req.params.id);
        
        if (!website) {
            return res.status(404).send('网站不存在');
        }
        
        // 检查是否已经在运行
        if (runningServers.has(website.id)) {
            return res.status(400).send('网站已经在运行');
        }
        
        let server;
        switch (website.type) {
            case 'static':
                try {
                    // 检查目录和首页文件是否存在
                    await fs.access(website.directory);
                    await fs.access(path.join(website.directory, website.indexFile));
                    
                    // 创建并启动静态服务器
                    server = await createStaticServer(website);
                    runningServers.set(website.id, server);
                    
                    // 更新网站状态
                    website.status = 'running';
                    await writeWebsites(websites);
                    
                    res.status(200).send('启动成功');
                } catch (error) {
                    return res.status(500).send(`启动失败: ${error.message}`);
                }
                break;
                
            case 'nodejs':
                try {
                    // 检查目录是否存在
                    await fs.access(website.directory);
                    
                    // 创建并启动NodeJS服务器
                    server = await createNodeJSServer(website);
                    runningServers.set(website.id, server);
                    
                    // 更新网站状态
                    website.status = 'running';
                    await writeWebsites(websites);
                    
                    res.status(200).send('启动成功');
                } catch (error) {
                    return res.status(500).send(`启动失败: ${error.message}`);
                }
                break;
                
            case 'program':
                try {
                    // 检查目录是否存在
                    await fs.access(website.directory);
                    
                    // 创建并启动程序服务器
                    server = await createProgramServer(website);
                    runningServers.set(website.id, server);
                    
                    // 更新网站状态
                    website.status = 'running';
                    await writeWebsites(websites);
                    
                    res.status(200).send('启动成功');
                } catch (error) {
                    return res.status(500).send(`启动失败: ${error.message}`);
                }
                break;
                
            default:
                res.status(400).send('不支持的网站类型');
        }
    } catch (error) {
        res.status(500).send(`启动失败: ${error.message}`);
    }
});

// 修改停止网站接口
router.post('/stop/:id', async (req, res) => {
    try {
        const websites = await readWebsites();
        const website = websites.find(site => site.id === req.params.id);
        
        if (!website) {
            return res.status(404).send('网站不存在');
        }
        
        // 获取运行中的服务器实例
        const server = runningServers.get(website.id);
        if (!server) {
            return res.status(400).send('网站未在运行');
        }
        
        // 根据网站类型执行不同的停止操作
        switch (website.type) {
            case 'static':
                // 关闭HTTP/HTTPS服务器
                await new Promise((resolve, reject) => {
                    server.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                break;
                
            case 'nodejs':
            case 'program':
                // 终止子进程
                if (process.platform === 'win32') {
                    // Windows平台
                    require('child_process').exec(`taskkill /pid ${server.pid} /T /F`);
                } else {
                    // Unix平台
                    server.kill('SIGTERM');
                }
                break;
        }
        
        // 从运行列表中移除
        runningServers.delete(website.id);
        
        // 更新网站状态
        website.status = 'stopped';
        await writeWebsites(websites);
        
        res.status(200).send('停止成功');
    } catch (error) {
        res.status(500).send(`停止失败: ${error.message}`);
    }
});

// 修改删除网站接口
router.delete('/delete/:id', async (req, res) => {
    try {
        const websites = await readWebsites();
        const websiteIndex = websites.findIndex(site => site.id === req.params.id);
        
        if (websiteIndex === -1) {
            return res.status(404).send('网站不存在');
        }
        
        // 如果网站正在运行，先停止它
        const website = websites[websiteIndex];
        const server = runningServers.get(website.id);
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            runningServers.delete(website.id);
        }
        
        // 删除网站配置
        websites.splice(websiteIndex, 1);
        await writeWebsites(websites);
        
        res.status(200).send('删除成功');
    } catch (error) {
        res.status(500).send(`删除失败: ${error.message}`);
    }
});

// 初始化函数：启动所有状态为running的网站
async function initializeRunningWebsites() {
    try {
        const websites = await readWebsites();
        for (const website of websites) {
            if (website.status === 'running') {
                try {
                    switch (website.type) {
                        case 'static':
                            // 检查目录和首页文件是否存在
                            await fs.access(website.directory);
                            await fs.access(path.join(website.directory, website.indexFile));
                            
                            // 创建并启动静态服务器
                            const server = await createStaticServer(website);
                            runningServers.set(website.id, server);
                            console.log(`已重启静态网站: ${website.name} (端口: ${website.port})`);
                            break;
                            
                        case 'nodejs':
                            // 检查目录是否存在
                            await fs.access(website.directory);
                            
                            // 创建并启动NodeJS服务器
                            const nodejsServer = await createNodeJSServer(website);
                            runningServers.set(website.id, nodejsServer);
                            console.log(`已重启NodeJS网站: ${website.name} (端口: ${website.port})`);
                            break;
                            
                        case 'program':
                            // 检查目录是否存在
                            await fs.access(website.directory);
                            
                            // 创建并启动程序服务器
                            const programServer = await createProgramServer(website);
                            runningServers.set(website.id, programServer);
                            console.log(`已重启程序: ${website.name} (端口: ${website.port})`);
                            break;
                    }
                } catch (error) {
                    console.error(`重启网站 ${website.name} 失败:`, error);
                    website.status = 'stopped';
                }
            }
        }
        // 保存更新后的状态
        await writeWebsites(websites);
    } catch (error) {
        console.error('初始化运行中的网站失败:', error);
    }
}

// 在模块加载时执行初始化
initializeRunningWebsites().catch(console.error);

// 编辑网站
router.put('/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, directory, protocol, certificateId } = req.body;
        
        // 验证必填字段
        if (!name || !directory) {
            return res.status(400).send('网站名称和目录不能为空');
        }
        
        // 验证目录是否存在
        try {
            await fs.access(directory);
        } catch {
            return res.status(400).send('目录不存在');
        }
        
        // 如果是HTTPS协议，验证证书
        if (protocol === 'https') {
            const certificates = await readCertificates();
            const certificate = certificates.find(cert => cert.id === certificateId);
            
            if (!certificate) {
                return res.status(400).send('请选择有效的SSL证书');
            }
            
            if (certificate.status !== 'valid') {
                return res.status(400).send('所选证书无效');
            }
        }
        
        // 读取网站列表
        const websites = await readWebsites();
        const websiteIndex = websites.findIndex(site => site.id === id);
        
        if (websiteIndex === -1) {
            return res.status(404).send('网站不存在');
        }
        
        // 检查是否有其他网站使用相同的名称或目录
        const hasDuplicate = websites.some((site, index) => {
            if (index === websiteIndex) return false; // 跳过当前网站
            return site.name === name || site.directory === directory;
        });
        
        if (hasDuplicate) {
            return res.status(400).send('网站名称或目录已被使用');
        }
        
        // 如果网站正在运行，需要先停止
        const website = websites[websiteIndex];
        if (website.status === 'running') {
            // 停止网站
            if (website.type === 'static') {
                const server = runningServers.get(website.id);
                if (server) {
                    server.close();
                    runningServers.delete(website.id);
                }
            }
            // 更新状态
            website.status = 'stopped';
        }
        
        // 更新网站信息
        websites[websiteIndex] = {
            ...website,
            name,
            directory,
            protocol: protocol || 'http',
            certificateId: protocol === 'https' ? certificateId : undefined,
            updateTime: new Date().toISOString()
        };
        
        // 保存更新
        await writeWebsites(websites);
        
        res.sendStatus(200);
    } catch (error) {
        console.error('编辑网站失败:', error);
        res.status(500).send('编辑网站失败: ' + error.message);
    }
});

// 获取可用证书列表接口
router.get('/certificates', async (req, res) => {
    try {
        const certificates = await readCertificates();
        const validCertificates = certificates.filter(cert => cert.status === 'valid');
        res.json(validCertificates);
    } catch (error) {
        res.status(500).send('获取证书列表失败: ' + error.message);
    }
});

module.exports = router;
