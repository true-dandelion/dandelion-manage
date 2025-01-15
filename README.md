## 语言language
English version English.md

# Web 证书管理系统

这是一个基于 Node.js 的 Web 证书管理系统，提供证书生成、管理和导出功能。

## 功能特点

- 证书生成与管理
- Web 界面操作
- 数据导入导出
- 系统监控
- 批量处理

## 技术栈

- Node.js
- Express.js
- CSV 处理
- 证书操作 (node-forge)
- 文件压缩 (jszip)

## 安装

1. 确保已安装 Node.js
2. 克隆项目到本地
3. 安装依赖：
```bash
npm install
```

## 使用方法

1. 启动服务器：
```bash
node index.js
```

2. 访问系统：
默认访问接口 `http://localhost:9960/w`

## 项目结构

- `/certs` - 证书存储目录
- `/data` - 数据文件目录
- `/html` - 前端页面
- `/js` - JavaScript 文件
- `certificate.js` - 证书处理核心逻辑
- `index.js` - 应用入口
- `page.js` - 页面路由
- `settings.js` - 系统设置
- `stop.js` - 接口错误访问

## 注意事项

- 请确保系统运行时具有适当的文件读写权限
- 建议定期备份证书和数据文件
- 请妥善保管生成的证书私钥

## 许可证

MIT License
