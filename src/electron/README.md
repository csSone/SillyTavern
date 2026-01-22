# SillyTavern 系统托盘启动器

为 SillyTavern 提供 Windows 系统托盘启动器，解决传统 start.bat 的问题。

## 功能特性

- ✅ **系统托盘集成** - 最小化到系统托盘，后台运行
- ✅ **一键启动/停止** - 右键托盘图标快速控制服务器
- ✅ **实时日志查看** - 独立日志窗口，支持搜索、过滤、导出
- ✅ **自动启动服务器** - 应用启动时自动启动 SillyTavern 服务器
- ✅ **智能状态管理** - 防止重复启动，状态同步更新
- ✅ **Toast 通知** - 非阻塞式操作反馈
- ✅ **完整打包** - 独立可执行文件，无需 Node.js 环境

## 解决的问题

相比传统的 `start.bat` 方式：

| 问题 | start.bat | 系统托盘启动器 |
|------|-----------|----------------|
| 点击窗口导致暂停 | ❌ 会暂停 | ✅ 不影响 |
| 需要保持窗口打开 | ❌ 必须保持 | ✅ 可关闭到托盘 |
| 日志查看不便 | ❌ CMD 窗口 | ✅ 专用日志窗口 |
| 搜索过滤日志 | ❌ 不支持 | ✅ 支持 |
| 导出日志 | ❌ 不支持 | ✅ 支持 |
| 后台运行 | ❌ 不支持 | ✅ 支持 |

## 安装说明

### 方式一：使用打包版本（推荐）

1. 下载 `SillyTavern-Portable-x.x.x.exe` 或安装程序
2. 双击运行
3. 首次运行会自动启动服务器

### 方式二：开发模式运行

```bash
# 进入 electron 目录
cd E:\SillyTavern\src\electron

# 安装依赖
npm install

# 启动开发版本
npm start
```

## 使用方法

### 托盘菜单

右键点击系统托盘图标可以看到以下菜单：

- **启动服务器 / 停止服务器** - 控制 SillyTavern 服务器
- **打开 SillyTavern** - 在浏览器中打开 SillyTavern 界面
- **查看日志...** - 打开日志查看窗口
- **退出** - 完全退出应用

### 日志查看器

日志查看器提供以下功能：

- **清除日志** - 清空当前显示的所有日志
- **导出日志** - 导出为文本或 JSON 文件
- **自动滚动** - 新日志自动滚动到底部
- **类型过滤** - 按日志类型（信息/警告/错误）过滤
- **搜索** - 在日志中搜索关键词

### 状态说明

托盘图标会根据服务器状态变化：

- 🔴 **已停止** - 服务器未运行，图标为 `favicon.ico`
- 🟢 **运行中** - 服务器正在运行，图标为 `st-launcher.ico`

## 开发说明

### 项目结构

```
src/electron/
├── index.js                 # 主进程入口
├── log-window.js            # 日志窗口管理
├── log-viewer.html          # 日志查看器 UI
├── log-viewer.js            # 日志查看器逻辑
├── log-viewer-preload.js    # 日志窗口预加载脚本（安全 IPC）
├── electron-builder.json    # 打包配置
├── package.json             # 项目配置
├── .npmrc                   # npm 镜像配置
└── README.md                # 本文档
```

### 技术栈

- **Electron** - 桌面应用框架
- **Node.js** - 后端运行时
- **electron-builder** - 打包工具

### 安全特性

- ✅ **Context Isolation** - 启用，隔离渲染进程
- ✅ **Preload Scripts** - 使用安全的 IPC 桥接
- ✅ **Node Integration** - 禁用，防止直接访问 Node.js API
- ✅ **CSRF Protection** - 继承 SillyTavern 的 CSRF 保护

### 内存管理

- 自动清理事件监听器，防止内存泄漏
- 日志数量限制为 10,000 条
- 超时自动清理，防止定时器泄漏

## 构建说明

### 前置要求

- Node.js >= 18
- npm >= 9

### 构建步骤

```bash
cd E:\SillyTavern\src\electron

# 安装依赖
npm install

# 构建便携版 exe（推荐）
npm run build:portable

# 构建安装程序
npm run build:nsis

# 构建所有目标
npm run build
```

### 输出位置

构建完成后，安装程序和可执行文件位于：

```
E:\SillyTavern\dist\electron\
├── SillyTavern-Portable-x.x.x.exe      # 便携版
├── SillyTavern-Setup-x.x.x.exe         # 安装程序
└── builder-effective-config.yaml       # 构建配置
```

### 打包说明

打包后的应用程序包含：

- Electron 运行时（~150MB）
- 完整的 SillyTavern 项目文件
- 所有依赖项
- 预估大小：**400-500MB**

### .npmrc 配置说明

项目包含 `.npmrc` 文件，配置了国内镜像加速下载：

```ini
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

如果网络环境允许，可以注释掉这些配置使用官方源。

## 常见问题

### Q: 托盘图标不显示？

**A:** 确保 `public/st-launcher.ico` 和 `public/favicon.ico` 文件存在。

### Q: 服务器启动失败？

**A:** 检查以下几点：
1. 端口 8000 是否被占用
2. Node.js 版本是否 >= 18
3. 查看日志窗口的错误信息

### Q: 如何修改默认端口？

**A:** 编辑 SillyTavern 的 `config.yaml` 文件，修改 `port` 配置项。

### Q: 日志窗口打不开？

**A:** 检查 `log-viewer.html` 和 `log-viewer.js` 文件是否存在且路径正确。

### Q: 如何完全卸载？

**A:**
- **便携版**: 直接删除 exe 文件
- **安装版**: 通过"控制面板 > 程序和功能"卸载

### Q: 可以同时运行多个实例吗？

**A:** 不建议。多个实例会争夺相同的端口和资源，导致冲突。

### Q: 应用占用多少内存？

**A:** Electron 框架本身约占用 100-150MB，加上 SillyTavern 服务器总计约 200-300MB。

### Q: 如何启用开发模式？

**A:** 在 `log-window.js` 中取消注释：
```javascript
if (process.env.NODE_ENV === 'development') {
    this.window.webContents.openDevTools();
}
```

然后设置环境变量运行：
```bash
set NODE_ENV=development && npm start
```

## 故障排除

### 服务器无法启动

1. 检查端口占用：
```bash
netstat -ano | findstr :8000
taskkill /PID <进程ID> /F
```

2. 查看日志窗口的错误信息

3. 手动测试服务器：
```bash
cd E:\SillyTavern
npm start
```

### 应用崩溃

1. 查看事件查看器（Windows 日志）
2. 检查是否有足够的磁盘空间
3. 确认杀毒软件没有拦截

### 日志导出失败

1. 确保有写入权限
2. 检查磁盘空间
3. 验证日志数据格式（自动验证）

## 贡献指南

欢迎提交 Issue 和 Pull Request！

在提交代码前，请确保：

1. 代码符合 ESLint 规范：`npm run lint`
2. 添加必要的注释
3. 测试所有功能
4. 更新相关文档

## 许可证

本项目遵循 SillyTavern 的相同许可证。

## 致谢

- [Electron](https://electronjs.org/) - 桌面应用框架
- [electron-builder](https://electron.build/) - 打包工具
- [SillyTavern](https://github.com/SillyTavern/SillyTavern) - 主项目

## 更新日志

### v1.0.0 (2025-01-22)

- ✨ 初始版本
- ✅ 系统托盘集成
- ✅ 日志查看器
- ✅ Toast 通知
- ✅ 智能状态管理
- ✅ 安全加固（Context Isolation）
- ✅ 内存泄漏修复
- ✅ 完整打包配置

## 联系方式

如有问题或建议，请提交 [GitHub Issue](https://github.com/SillyTavern/SillyTavern/issues)。
