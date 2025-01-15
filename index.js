const express = require('express');
const app = express();
const fs = require('fs');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const path = require('path');
const os = require('os');
const si = require('systeminformation');
const settings = require('./settings.js');
const certificate = require('./certificate.js');
const webpage = require('./page.js');
const https = require('https');
const stop = require('./stop.js');

// 使用settings中的路由
app.use('/settings', settings.router);
app.use('/certificate', certificate.router);
app.use('/web-page', webpage);
// 从settings中获取当前地址和路由处理器
let modifiedAddress = settings.modifiedAddress;
let currentRouteHandler = settings.currentRouteHandler;

// 从配置文件读取端口和监听地址
const config = settings.readConfig();
const port = config['post'] || 3000;
const listeningAddress = config['listening-address'] || '0.0.0.0';

// 添加域名访问控制中间件
app.use(settings.domainAccessMiddleware);

// CSV 文件路径
const CSV_FILE = path.join(__dirname, 'data', 'users.csv');

// 确保 data 目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// 如果 CSV 文件不存在，创建一个包含表头的新文件
if (!fs.existsSync(CSV_FILE)) {
    const headers = ['username', 'password', 'lastLogin'];
    stringify([headers], (err, output) => {
        fs.writeFileSync(CSV_FILE, output);
    });
}

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

app.use('/js', express.static('js'));

// 中间件设置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化路由前清理所有自定义路由
settings.clearAllCustomRoutes(app);

// 初始化当前路由
currentRouteHandler = app.get(modifiedAddress, (req, res) => {
    res.redirect('/recording');
});


// recording页面路由
app.get('/recording', (req, res) => {
    res.sendFile(__dirname + '/html/page.html');
});

app.get('/display', (req, res) => {
    res.sendFile(__dirname + '/html/site.html');
});

// 处理登录请求
app.post('/password', async (req, res) => {
    const { a, b, e } = req.body;
    
    try {
        const users = await readCSV();
        const user = users.find(u => u.username === b && u.password === e);
        
        if (user) {
            // 更新最后登录时间
            user.lastpage = new Date().toISOString();
            await writeCSV(users);
            
            res.json({
                i: 200,
                f: '/display',
                a: Date.now(),
                b: b
            });
        } else {
            res.status(401).json({
                i: 401,
                f: '',
                b: b,
                g: '登录失败'
            });
        }
    } catch (error) {
        console.error('CSV 操作错误:', error);
        res.status(500).json({
            i: 500,
            g: '服务器错误'
        });
    }
});

// 格式化时间函数
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}秒`);
    
    return parts.join(' ');
}

// 系统信息接口
app.get('/system', async (req, res) => {
    try {
        const osInfo = await si.osInfo();
        const time = await si.time();
        const currentTime = Date.now();
        
        // 获取系统启动时间（以毫秒为单位）
        const bootTime = currentTime - (os.uptime() * 1000);
        const uptime = os.uptime();
        
        res.json({
            hostname: os.hostname(),
            os_version: osInfo.distro,
            kernel_version: osInfo.kernel,
            system_type: osInfo.platform,
            boot_time: formatDateTime(bootTime),
            uptime: formatUptime(uptime)
        });
    } catch (error) {
        console.error('获取系统信息失败:', error);
        res.status(500).json({ error: '获取系统信息失败' });
    }
});

// 系统状态接口
app.get('/state', async (req, res) => {
    try {
        const [cpu, mem, currentLoad, fsSize] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.currentLoad(),
            si.fsSize()
        ]);

        res.json({
            cpu: {
                percentage: parseFloat(cpu.currentLoad.toFixed(2)),
                used: cpu.cpus.length,
                total: os.cpus().length
            },
            memory: {
                percentage: parseFloat(((mem.used / mem.total) * 100).toFixed(2)),
                used: parseFloat((mem.used / (1024 * 1024 * 1024)).toFixed(2)),
                total: parseFloat((mem.total / (1024 * 1024 * 1024)).toFixed(2))
            },
            load: {
                percentage: parseFloat(currentLoad.currentLoad.toFixed(2)),
                status: currentLoad.currentLoad > 80 ? '高负载' : '正常'
            },
            disk: {
                percentage: parseFloat(fsSize[0].use.toFixed(2)),
                used: parseFloat((fsSize[0].used / (1024 * 1024 * 1024)).toFixed(2)),
                total: parseFloat((fsSize[0].size / (1024 * 1024 * 1024)).toFixed(2))
            }
        });
    } catch (error) {
        res.status(500).json({ error: '获取系统状态失败' });
    }
});

// 网络连接接口
app.get('/network/connections', async (req, res) => {
    try {
        const connections = await si.networkConnections();
        const formattedConnections = connections
            .filter(conn => conn.peerAddress && conn.peerPort && conn.localAddress && conn.localPort)
            .map(conn => ({
                remote_ip: conn.peerAddress || '-',
                remote_port: conn.peerPort || '-',
                local_ip: conn.localAddress || '-',
                local_port: conn.localPort || '-',
                state: conn.state || '-'
            }));
        res.json(formattedConnections);
    } catch (error) {
        res.status(500).json({ error: '获取网络连接信息失败' });
    }
});

// 网络接口列表
app.get('/network/interfaces', async (req, res) => {
    try {
        const interfaces = await si.networkInterfaces();
        const interfaceNames = interfaces.map(iface => iface.iface);
        res.json(interfaceNames);
    } catch (error) {
        res.status(500).json({ error: '获取网络接口列表失败' });
    }
});

// 存储历史数据
const historyData = {
    network: {
        upload: [],
        download: [],
        timestamp: [],
        total_upload: 0,
        total_download: 0,
        last_tx_bytes: 0,
        last_rx_bytes: 0,
        last_timestamp: Date.now()
    },
    disk: {
        read: [],
        write: [],
        timestamp: []
    }
};

// 最大历史数据点数
const MAX_HISTORY_POINTS = 60;

// 更新历史数据
function updateHistoryData(type, data) {
    const history = historyData[type];
    const now = new Date().toISOString();

    // 添加新数据点
    if (type === 'network') {
        history.upload.push(data.upload_speed);
        history.download.push(data.download_speed);
        history.timestamp.push(now);
    } else if (type === 'disk') {
        history.read.push(data.read_size);
        history.write.push(data.write_size);
        history.timestamp.push(now);
    }

    // 保持最大数据点数量
    if (history.timestamp.length > MAX_HISTORY_POINTS) {
        history.timestamp = history.timestamp.slice(-MAX_HISTORY_POINTS);
        if (type === 'network') {
            history.upload = history.upload.slice(-MAX_HISTORY_POINTS);
            history.download = history.download.slice(-MAX_HISTORY_POINTS);
        } else if (type === 'disk') {
            history.read = history.read.slice(-MAX_HISTORY_POINTS);
            history.write = history.write.slice(-MAX_HISTORY_POINTS);
        }
    }
}

// 监控任务
async function monitorTask() {
    try {
        // 网络监控
        const networkStats = await si.networkStats();
        if (networkStats && networkStats.length > 0) {
            const stat = networkStats[0];
            const currentTime = Date.now();
            const timeDiff = (currentTime - historyData.network.last_timestamp) / 1000; // 转换为秒

            // 计算速率（字节/秒）
            const txDiff = stat.tx_bytes - historyData.network.last_tx_bytes;
            const rxDiff = stat.rx_bytes - historyData.network.last_rx_bytes;

            // 计算 KB/s
            const uploadSpeed = parseFloat((txDiff / 1024 / timeDiff).toFixed(2));
            const downloadSpeed = parseFloat((rxDiff / 1024 / timeDiff).toFixed(2));

            // 更新总量
            historyData.network.total_upload += txDiff;
            historyData.network.total_download += rxDiff;

            const networkData = {
                upload_speed: uploadSpeed,
                download_speed: downloadSpeed
            };

            // 更新历史数据
            updateHistoryData('network', networkData);

            // 保存当前值用于下次计算
            historyData.network.last_tx_bytes = stat.tx_bytes;
            historyData.network.last_rx_bytes = stat.rx_bytes;
            historyData.network.last_timestamp = currentTime;
        }

        // 磁盘监控
        const diskStats = await si.disksIO();
        if (diskStats) {
            const diskData = {
                read_size: parseFloat((diskStats.rIO_sec / (1024 * 1024)).toFixed(2)) || 0,
                write_size: parseFloat((diskStats.wIO_sec / (1024 * 1024)).toFixed(2)) || 0
            };
            updateHistoryData('disk', diskData);
        }
    } catch (error) {
        console.error('监控任务错误:', error);
    }
}

// 启动监控任务
const MONITOR_INTERVAL = 1000; // 1秒更新一次
setInterval(monitorTask, MONITOR_INTERVAL);

// 修改网络流量统计接口
app.get('/network/traffic', async (req, res) => {
    try {
        const interface = req.query.interface || '';
        const stats = await si.networkStats(interface);
        const defaultStats = {
            upload_speed: 0,
            download_speed: 0,
            total_upload: parseFloat((historyData.network.total_upload / (1024 * 1024 * 1024)).toFixed(2)),
            total_download: parseFloat((historyData.network.total_download / (1024 * 1024)).toFixed(2)),
            chart_data: {
                upload: historyData.network.upload,
                download: historyData.network.download,
                timestamp: historyData.network.timestamp
            }
        };
        
        if (!stats || stats.length === 0) {
            return res.json(defaultStats);
        }

        const stat = stats[0];
        const result = {
            upload_speed: historyData.network.upload[historyData.network.upload.length - 1] || 0,
            download_speed: historyData.network.download[historyData.network.download.length - 1] || 0,
            total_upload: parseFloat((historyData.network.total_upload / (1024 * 1024 * 1024)).toFixed(2)),
            total_download: parseFloat((historyData.network.total_download / (1024 * 1024)).toFixed(2)),
            chart_data: {
                upload: historyData.network.upload,
                download: historyData.network.download,
                timestamp: historyData.network.timestamp
            }
        };
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '获取网络流量统计失败' });
    }
});

// 修改磁盘IO统计接口
app.get('/network/io', async (req, res) => {
    try {
        const disks = await si.disksIO();
        const defaultIO = {
            read_size: 0,
            write_size: 0,
            io_count: 0,
            io_delay: 0,
            chart_data: {
                read: historyData.disk.read,
                write: historyData.disk.write,
                timestamp: historyData.disk.timestamp
            }
        };

        if (!disks) {
            return res.json(defaultIO);
        }

        const result = {
            read_size: parseFloat((disks.rIO_bytes / (1024 * 1024)).toFixed(2)) || 0,
            write_size: parseFloat((disks.wIO_bytes / (1024 * 1024)).toFixed(2)) || 0,
            io_count: parseInt(disks.tIO) || 0,
            io_delay: parseFloat((disks.tIO_sec * 1000).toFixed(2)) || 0,
            chart_data: {
                read: historyData.disk.read,
                write: historyData.disk.write,
                timestamp: historyData.disk.timestamp
            }
        };
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '获取磁盘IO统计失败' });
    }
});

// 面板设置相关接口
app.post('/settings/user', async (req, res) => {
    const { username } = req.body;
    try {
        const users = await readCSV();
        const user = users.find(u => u.username === req.body.b);
        if (user) {
            user.username = username;
            await writeCSV(users);
            res.json({ success: true, message: '用户名修改成功' });
        } else {
            res.status(404).json({ error: '用户不存在' });
        }
    } catch (error) {
        res.status(500).json({ error: '修改用户名失败' });
    }
});

app.post('/settings/password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const users = await readCSV();
        const user = users.find(u => u.password === oldPassword);
        if (user) {
            user.password = newPassword;
            await writeCSV(users);
            res.json({ success: true, message: '密码修改成功' });
        } else {
            res.status(401).json({ error: '原密码错误' });
        }
    } catch (error) {
        res.status(500).json({ error: '修改密码失败' });
    }
});

app.post('/settings/timeout', (req, res) => {
    const { timeout } = req.body;
    try {
        const config = readConfig();
        config.timeout = parseInt(timeout);
        writeConfig(config);
        res.json({ success: true, message: '超时时间设置成功' });
    } catch (error) {
        res.status(500).json({ error: '设置超时时间失败' });
    }
});


app.post('/settings/server', (req, res) => {
    const { address } = req.body;
    try {
        const config = readConfig();
        config.serverAddress = address;
        writeConfig(config);
        res.json({ success: true, message: '服务器地址设置成功' });
    } catch (error) {
        res.status(500).json({ error: '设置服务器地址失败' });
    }
});

// 在所有其他路由之后添加 stop 路由处理器
app.use(stop);

// 创建 HTTP 服务器
const httpServer = app.listen(port, listeningAddress, () => {
    console.log(`HTTP 服务器运行在 http://${listeningAddress}:${port}`);
});

let httpsServer = null;

// 启动 HTTPS 服务器的函数
async function startHttpsServer() {
    try {
        const sslConfig = await certificate.readSSLConfig();
        if (!sslConfig.enabled || !sslConfig.certId) {
            return;
        }

        // 获取证书信息
        const certificates = await certificate.readCertificates();
        const cert = certificates.find(c => c.id === sslConfig.certId);
        if (!cert || cert.status !== 'valid') {
            console.error('SSL 证书无效或已过期');
            return;
        }

        const certContent = await fs.promises.readFile(cert.certPath, 'utf8');
        const keyContent = await fs.promises.readFile(cert.keyPath, 'utf8');

        const httpsOptions = {
            cert: certContent,
            key: keyContent
        };

        // 如果已存在 HTTPS 服务器，先关闭它
        if (httpsServer) {
            httpsServer.close();
        }

        // 关闭 HTTP 服务器
        httpServer.close(() => {
            console.log('HTTP 服务器已关闭，准备启动 HTTPS 服务器');
        });

        // 创建新的 HTTPS 服务器
        httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(port, listeningAddress, () => {
            console.log(`HTTPS 服务器运行在 https://${listeningAddress}:${port}`);
        });

        // 监听错误
        httpsServer.on('error', (error) => {
            console.error('HTTPS 服务器错误:', error);
        });

    } catch (error) {
        console.error('启动 HTTPS 服务器失败:', error);
    }
}

// 停止 HTTPS 服务器的函数
function stopHttpsServer() {
    if (httpsServer) {
        httpsServer.close(() => {
            console.log('HTTPS 服务器已停止');
            httpsServer = null;
            
            // 重新启动 HTTP 服务器
            httpServer.listen(port, listeningAddress, () => {
                console.log(`HTTP 服务器运行在 http://${listeningAddress}:${port}`);
            });
        });
    }
}

// 监听 SSL 配置变化
fs.watch(path.join(__dirname, 'data', 'ssl_config.json'), async (eventType) => {
    if (eventType === 'change') {
        try {
            const sslConfig = await certificate.readSSLConfig();
            if (sslConfig.enabled) {
                await startHttpsServer();
            } else {
                stopHttpsServer();
            }
        } catch (error) {
            console.error('处理 SSL 配置变化失败:', error);
        }
    }
});

// 初始化时检查是否需要启动 HTTPS 服务器
(async () => {
    try {
        const sslConfig = await certificate.readSSLConfig();
        if (sslConfig.enabled) {
            await startHttpsServer();
        }
    } catch (error) {
        console.error('初始化 HTTPS 服务器失败:', error);
    }
})();
