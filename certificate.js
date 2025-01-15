const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const forge = require('node-forge');
const https = require('https');

// 添加 JSON 解析中间件
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// 配置证书文件存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'certs');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// 证书数据存储路径
const CERT_DATA_FILE = path.join(__dirname, 'data', 'certificates.json');

// 确保数据文件存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(CERT_DATA_FILE)) {
    fs.writeFileSync(CERT_DATA_FILE, JSON.stringify([]));
}

// 读取证书数据
async function readCertificates() {
    try {
        const data = await promisify(fs.readFile)(CERT_DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取证书数据失败:', error);
        return [];
    }
}

// 写入证书数据
async function writeCertificates(certificates) {
    try {
        await promisify(fs.writeFile)(CERT_DATA_FILE, JSON.stringify(certificates, null, 2));
    } catch (error) {
        console.error('写入证书数据失败:', error);
        throw error;
    }
}

// 从证书文件中解析信息
async function parseCertificateInfo(certPath) {
    try {
        const certPem = await promisify(fs.readFile)(certPath, 'utf8');
        const cert = forge.pki.certificateFromPem(certPem);
        
        // 获取域名（从使用者备用名称或通用名称）
        let domain = null;
        const altNames = cert.extensions.find(ext => ext.name === 'subjectAltName');
        if (altNames) {
            domain = altNames.altNames[0].value;
        } else {
            domain = cert.subject.getField('CN').value;
        }

        // 获取过期时间
        const expireTime = cert.validity.notAfter;
        
        return {
            domain,
            expireTime: expireTime.toISOString(),
            status: expireTime > new Date() ? 'valid' : 'expired'
        };
    } catch (error) {
        console.error('解析证书信息失败:', error);
        throw error;
    }
}

// 从证书内容中解析信息
function parseCertificateContent(certContent) {
    try {
        const cert = forge.pki.certificateFromPem(certContent);
        
        // 获取域名（从使用者备用名称或通用名称）
        let domain = null;
        const altNames = cert.extensions.find(ext => ext.name === 'subjectAltName');
        if (altNames) {
            domain = altNames.altNames[0].value;
        } else {
            domain = cert.subject.getField('CN').value;
        }

        // 获取过期时间
        const expireTime = cert.validity.notAfter;
        
        return {
            domain,
            expireTime: expireTime.toISOString(),
            status: expireTime > new Date() ? 'valid' : 'expired'
        };
    } catch (error) {
        console.error('解析证书内容失败:', error);
        throw error;
    }
}

// SSL 配置文件路径
const SSL_CONFIG_FILE = path.join(__dirname, 'data', 'ssl_config.json');

// 确保 SSL 配置文件存在
if (!fs.existsSync(SSL_CONFIG_FILE)) {
    fs.writeFileSync(SSL_CONFIG_FILE, JSON.stringify({
        enabled: false,
        certId: null
    }));
}

// 读取 SSL 配置
async function readSSLConfig() {
    try {
        const data = await promisify(fs.readFile)(SSL_CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取 SSL 配置失败:', error);
        return { enabled: false, certId: null };
    }
}

// 写入 SSL 配置
async function writeSSLConfig(config) {
    try {
        await promisify(fs.writeFile)(SSL_CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('写入 SSL 配置失败:', error);
        throw error;
    }
}

// 获取 SSL 设置
router.get('/ssl/settings', async (req, res) => {
    try {
        const config = await readSSLConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: '获取 SSL 设置失败' });
    }
});

// 启用 SSL
router.post('/ssl/enable', async (req, res) => {
    try {
        // 添加调试日志
        console.log('收到的请求体:', req.body);
        
        // 验证请求体
        if (!req.body) {
            console.log('请求体为空');
            return res.status(400).json({ error: '请求体不能为空' });
        }

        // 验证 certId
        const certId = req.body.certId;
        if (!certId) {
            console.log('certId 为空');
            return res.status(400).json({ error: '证书 ID 不能为空' });
        }

        console.log('处理的证书ID:', certId);

        // 获取证书信息
        const certificates = await readCertificates();
        console.log('查找到的证书列表:', certificates);
        
        const cert = certificates.find(c => c.id === certId);
        console.log('找到的证书:', cert);

        if (!cert) {
            return res.status(404).json({ error: '证书不存在' });
        }

        if (cert.status !== 'valid') {
            return res.status(400).json({ error: '证书已过期或无效' });
        }

        // 读取证书文件
        const certContent = await promisify(fs.readFile)(cert.certPath, 'utf8');
        const keyContent = await promisify(fs.readFile)(cert.keyPath, 'utf8');

        // 验证证书和密钥是否匹配
        try {
            const certPem = forge.pki.certificateFromPem(certContent);
            const keyPem = forge.pki.privateKeyFromPem(keyContent);
            
            // 使用私钥签名一些数据，然后用证书的公钥验证
            const md = forge.md.sha256.create();
            md.update('test', 'utf8');
            const signature = keyPem.sign(md);
            const verified = certPem.publicKey.verify(md.digest().bytes(), signature);
            
            if (!verified) {
                throw new Error('证书和私钥不匹配');
            }
        } catch (error) {
            console.error('证书验证失败:', error);
            return res.status(400).json({ error: '证书验证失败: ' + error.message });
        }

        // 更新 SSL 配置
        await writeSSLConfig({
            enabled: true,
            certId: certId
        });

        // 创建 HTTPS 服务器选项
        const httpsOptions = {
            cert: certContent,
            key: keyContent
        };

        // 发送成功响应
        res.json({ 
            success: true, 
            message: 'SSL 已启用',
            httpsOptions
        });

    } catch (error) {
        console.error('启用 SSL 失败:', error);
        res.status(500).json({ error: '启用 SSL 失败: ' + error.message });
    }
});

// 禁用 SSL
router.post('/ssl/disable', async (req, res) => {
    try {
        await writeSSLConfig({
            enabled: false,
            certId: null
        });
        
        res.json({ success: true, message: 'SSL 已禁用' });
    } catch (error) {
        console.error('禁用 SSL 失败:', error);
        res.status(500).json({ error: '禁用 SSL 失败: ' + error.message });
    }
});

// 获取证书列表
router.get('/list', async (req, res) => {
    try {
        const certificates = await readCertificates();
        res.json(certificates);
    } catch (error) {
        res.status(500).json({ error: '获取证书列表失败' });
    }
});

// 创建证书（文件上传方式）
router.post('/create', upload.fields([
    { name: 'cert', maxCount: 1 },
    { name: 'key', maxCount: 1 }
]), async (req, res) => {
    try {
        const { type } = req.body;
        const certificates = await readCertificates();
        
        let certData = {
            id: Date.now().toString(),
            type: type,
            createTime: new Date().toISOString()
        };

        let certInfo;
        if (type === 'upload') {
            if (!req.files['cert'] || !req.files['key']) {
                return res.status(400).json({ error: '证书文件和密钥文件都是必需的' });
            }
            
            certData.certPath = req.files['cert'][0].path;
            certData.keyPath = req.files['key'][0].path;
            
            // 解析证书信息
            certInfo = await parseCertificateInfo(certData.certPath);
        } else if (type === 'code') {
            const { certContent, keyContent } = req.body;
            if (!certContent || !keyContent) {
                return res.status(400).json({ error: '证书内容和密钥内容都是必需的' });
            }
            
            const certPath = path.join(__dirname, 'certs', `${certData.id}-cert.pem`);
            const keyPath = path.join(__dirname, 'certs', `${certData.id}-key.pem`);
            
            await promisify(fs.writeFile)(certPath, certContent);
            await promisify(fs.writeFile)(keyPath, keyContent);
            
            certData.certPath = certPath;
            certData.keyPath = keyPath;
            
            // 解析证书信息
            certInfo = parseCertificateContent(certContent);
        }

        // 添加解析出的信息
        certData.domain = certInfo.domain;
        certData.expireTime = certInfo.expireTime;
        certData.status = certInfo.status;

        certificates.push(certData);
        await writeCertificates(certificates);
        
        res.json({ success: true, message: '证书创建成功', id: certData.id });
    } catch (error) {
        console.error('创建证书失败:', error);
        res.status(500).json({ error: '创建证书失败: ' + error.message });
    }
});

// 下载证书
router.get('/download/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const certificates = await readCertificates();
        const cert = certificates.find(c => c.id === id);
        
        if (!cert) {
            return res.status(404).json({ error: '证书不存在' });
        }
        
        const certFile = await promisify(fs.readFile)(cert.certPath);
        const keyFile = await promisify(fs.readFile)(cert.keyPath);
        
        // 创建ZIP文件
        const zip = new require('jszip')();
        zip.file('certificate.pem', certFile);
        zip.file('private.key', keyFile);
        
        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=certificate-${id}.zip`);
        res.send(zipContent);
    } catch (error) {
        console.error('下载证书失败:', error);
        res.status(500).json({ error: '下载证书失败' });
    }
});

// 续期证书
router.post('/renew/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const certificates = await readCertificates();
        const certIndex = certificates.findIndex(c => c.id === id);
        
        if (certIndex === -1) {
            return res.status(404).json({ error: '证书不存在' });
        }
        
        // 更新证书过期时间（这里需要根据实际情况处理证书续期逻辑）
        certificates[certIndex].expireTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        certificates[certIndex].status = 'valid';
        
        await writeCertificates(certificates);
        res.json({ success: true, message: '证书续期成功' });
    } catch (error) {
        console.error('续期证书失败:', error);
        res.status(500).json({ error: '续期证书失败' });
    }
});

// 检查证书使用状态
router.get('/check-usage/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 读取证书列表
        const certificates = await readCertificates();
        const cert = certificates.find(c => c.id === id);
        
        if (!cert) {
            return res.status(404).json({ error: '证书不存在' });
        }

        // 读取网站配置文件
        const WEB_CONFIG_FILE = path.join(__dirname, 'data', 'websites.json');
        let websites = [];
        
        if (fs.existsSync(WEB_CONFIG_FILE)) {
            const websiteData = await promisify(fs.readFile)(WEB_CONFIG_FILE, 'utf8');
            websites = JSON.parse(websiteData);
        }

        // 检查 SSL 配置
        const sslConfig = await readSSLConfig();
        
        // 查找使用该证书的网站
        const usedBy = [];
        
        // 检查面板 SSL 设置
        if (sslConfig.enabled && sslConfig.certId === id) {
            usedBy.push('面板 SSL');
        }

        // 检查网站配置
        websites.forEach(site => {
            if (site.protocol === 'https' && site.certificateId === id) {
                usedBy.push(site.name);
            }
        });

        res.json({
            inUse: usedBy.length > 0,
            usedBy: usedBy
        });

    } catch (error) {
        console.error('检查证书使用状态失败:', error);
        res.status(500).json({ error: '检查证书使用状态失败: ' + error.message });
    }
});

// 删除证书前检查是否可以删除
router.delete('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 先检查证书是否存在
        const certificates = await readCertificates();
        const certIndex = certificates.findIndex(c => c.id === id);
        
        if (certIndex === -1) {
            return res.status(404).json({ error: '证书不存在' });
        }

        // 检查证书使用状态
        // 读取网站配置文件
        const WEB_CONFIG_FILE = path.join(__dirname, 'data', 'websites.json');
        let websites = [];
        
        if (fs.existsSync(WEB_CONFIG_FILE)) {
            const websiteData = await promisify(fs.readFile)(WEB_CONFIG_FILE, 'utf8');
            websites = JSON.parse(websiteData);
        }

        // 检查 SSL 配置
        const sslConfig = await readSSLConfig();
        
        // 查找使用该证书的网站
        const usedBy = [];
        
        // 检查面板 SSL 设置
        if (sslConfig.enabled && sslConfig.certId === id) {
            usedBy.push('面板 SSL');
        }

        // 检查网站配置
        websites.forEach(site => {
            if (site.protocol === 'https' && site.certificateId === id) {
                usedBy.push(site.name);
            }
        });

        if (usedBy.length > 0) {
            return res.status(400).json({ 
                error: '证书正在使用中，无法删除',
                usedBy: usedBy
            });
        }
        
        // 如果证书未被使用，执行删除操作
        const cert = certificates[certIndex];
        
        // 删除证书文件
        if (cert.certPath && fs.existsSync(cert.certPath)) {
            await promisify(fs.unlink)(cert.certPath);
        }
        if (cert.keyPath && fs.existsSync(cert.keyPath)) {
            await promisify(fs.unlink)(cert.keyPath);
        }
        
        // 从数据中移除证书记录
        certificates.splice(certIndex, 1);
        await writeCertificates(certificates);
        
        res.json({ success: true, message: '证书删除成功' });
    } catch (error) {
        console.error('删除证书失败:', error);
        res.status(500).json({ error: '删除证书失败: ' + error.message });
    }
});

// 添加网页列表接口
router.get('/web-page/list', async (req, res) => {
    try {
        // 读取网站配置文件
        const WEB_CONFIG_FILE = path.join(__dirname, 'data', 'websites.json');
        let websites = [];
        
        if (fs.existsSync(WEB_CONFIG_FILE)) {
            const websiteData = await promisify(fs.readFile)(WEB_CONFIG_FILE, 'utf8');
            websites = JSON.parse(websiteData);
        }

        // 获取 SSL 配置
        const sslConfig = await readSSLConfig();

        // 如果面板启用了 SSL，添加到列表中
        if (sslConfig.enabled && sslConfig.certId) {
            websites.push({
                id: 'panel',
                name: '面板 SSL',
                protocol: 'https',
                certificateId: sslConfig.certId
            });
        }

        res.json(websites);
    } catch (error) {
        console.error('获取网页列表失败:', error);
        res.status(500).json({ error: '获取网页列表失败: ' + error.message });
    }
});

// 更新证书
router.post('/update/:id', upload.fields([
    { name: 'cert', maxCount: 1 },
    { name: 'key', maxCount: 1 }
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;
        
        // 读取证书列表
        const certificates = await readCertificates();
        const certIndex = certificates.findIndex(c => c.id === id);
        
        if (certIndex === -1) {
            return res.status(404).json({ error: '证书不存在' });
        }

        const oldCert = certificates[certIndex];
        let certInfo;

        if (type === 'upload') {
            if (!req.files['cert'] || !req.files['key']) {
                return res.status(400).json({ error: '证书文件和密钥文件都是必需的' });
            }

            // 删除旧文件
            if (oldCert.certPath && fs.existsSync(oldCert.certPath)) {
                await promisify(fs.unlink)(oldCert.certPath);
            }
            if (oldCert.keyPath && fs.existsSync(oldCert.keyPath)) {
                await promisify(fs.unlink)(oldCert.keyPath);
            }
            
            // 保存新文件
            const certPath = req.files['cert'][0].path;
            const keyPath = req.files['key'][0].path;
            
            // 解析证书信息
            certInfo = await parseCertificateInfo(certPath);

            // 更新证书信息
            certificates[certIndex] = {
                ...oldCert,
                type: type,
                certPath: certPath,
                keyPath: keyPath,
                domain: certInfo.domain,
                expireTime: certInfo.expireTime,
                status: certInfo.status,
                updateTime: new Date().toISOString()
            };
        } else if (type === 'code') {
            const { certContent, keyContent } = req.body;
            if (!certContent || !keyContent) {
                return res.status(400).json({ error: '证书内容和密钥内容都是必需的' });
            }

            // 删除旧文件
            if (oldCert.certPath && fs.existsSync(oldCert.certPath)) {
                await promisify(fs.unlink)(oldCert.certPath);
            }
            if (oldCert.keyPath && fs.existsSync(oldCert.keyPath)) {
                await promisify(fs.unlink)(oldCert.keyPath);
            }
            
            // 保存新文件
            const certPath = path.join(__dirname, 'certs', `${id}-cert.pem`);
            const keyPath = path.join(__dirname, 'certs', `${id}-key.pem`);
            
            await promisify(fs.writeFile)(certPath, certContent);
            await promisify(fs.writeFile)(keyPath, keyContent);
            
            // 解析证书信息
            certInfo = parseCertificateContent(certContent);

            // 更新证书信息
            certificates[certIndex] = {
                ...oldCert,
                type: type,
                certPath: certPath,
                keyPath: keyPath,
                domain: certInfo.domain,
                expireTime: certInfo.expireTime,
                status: certInfo.status,
                updateTime: new Date().toISOString()
            };
        }

        // 保存更新后的证书列表
        await writeCertificates(certificates);
        
        res.json({ success: true, message: '证书更新成功' });
    } catch (error) {
        console.error('更新证书失败:', error);
        res.status(500).json({ error: '更新证书失败: ' + error.message });
    }
});

module.exports = {
    router,
    readSSLConfig,  // 导出此函数以供其他模块使用
    readCertificates  // 导出证书读取函数
};
