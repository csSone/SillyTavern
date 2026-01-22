import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { spawn } from 'child_process';
import { LogWindow } from './log-window.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cliArguments = yargs(process.argv)
    .usage('Usage: <your-start-script> [options]')
    .option('width', {
        type: 'number',
        default: 800,
        describe: 'The width of the window',
    })
    .option('height', {
        type: 'number',
        default: 600,
        describe: 'The height of the window',
    })
    .parseSync();

/** @type {string} The URL to load in the window. */
let appUrl;
let mainWindow = null;
let serverProcess = null;
let isServerRunning = false;
let isStarting = false; // 防止并发启动

// 系统托盘
let tray = null;

// 服务器启动处理函数（用于清理）
let serverStartedListener = null;

// 强制终止超时
let forceKillTimeout = null;

// 日志窗口
const logWindow = new LogWindow();

// 获取 SillyTavern 根目录（开发环境或打包环境）
function getSillyTavernRoot() {
    // 开发环境：从 src/electron/ 向上两级
    const devRoot = path.resolve(__dirname, '../..');

    // 打包环境：SillyTavern 项目在 resources/app
    const prodRoot = path.join(process.resourcesPath, 'app');

    // 检测是否在开发环境
    const isDev = fs.existsSync(path.join(devRoot, 'package.json')) &&
                  fs.existsSync(path.join(devRoot, 'src'));

    return isDev ? devRoot : prodRoot;
}

const sillyTavernRoot = getSillyTavernRoot();

// 托盘图标 - 添加文件存在性检查
function getIconPath(iconName) {
    const iconPath = path.join(sillyTavernRoot, 'public', iconName);

    if (!fs.existsSync(iconPath)) {
        console.warn(`Icon file not found: ${iconPath}`);
        // 返回一个默认的空图标
        return null;
    }

    return iconPath;
}

// 延迟加载图标（带错误处理）
function getIcons() {
    const runningIconPath = getIconPath('st-launcher.ico');
    const stoppedIconPath = getIconPath('favicon.ico');

    const emptyIcon = nativeImage.createEmpty();

    return {
        running: runningIconPath ? nativeImage.createFromPath(runningIconPath) : emptyIcon,
        stopped: stoppedIconPath ? nativeImage.createFromPath(stoppedIconPath) : emptyIcon,
    };
}

let icons = getIcons();

/**
 * 创建系统托盘
 */
function createTray() {
    if (tray) {
        try {
            tray.destroy();
        } catch (e) {
            console.warn('Error destroying existing tray:', e);
        }
    }

    try {
        icons = getIcons();
        tray = new Tray(icons.stopped);
        tray.setToolTip('SillyTavern - 已停止');
        updateTrayMenu();

        // 双击托盘图标打开主窗口
        tray.on('double-click', () => {
            if (isServerRunning) {
                createSillyTavernWindow();
            }
        });
    } catch (error) {
        console.error('Failed to create tray:', error);
        tray = null;
    }
}

/**
 * 更新托盘菜单
 */
function updateTrayMenu() {
    if (!tray) return;

    const template = [
        {
            label: isServerRunning ? '停止服务器' : '启动服务器',
            click: () => isServerRunning ? stopServer() : startServer(),
        },
        { type: 'separator' },
        {
            label: '打开 SillyTavern',
            click: () => openBrowser(),
            enabled: isServerRunning,
        },
        {
            label: '查看日志...',
            click: () => logWindow.show(),
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => quitApp(),
        },
    ];

    tray.setContextMenu(Menu.buildFromTemplate(template));
    tray.setToolTip(`SillyTavern - ${isServerRunning ? '运行中' : '已停止'}`);

    // 更新托盘图标
    if (isServerRunning) {
        tray.setImage(icons.running);
    } else {
        tray.setImage(icons.stopped);
    }
}

/**
 * 在浏览器中打开 SillyTavern
 */
function openBrowser() {
    if (appUrl) {
        shell.openExternal(appUrl);
    }
}

/**
 * 退出应用
 */
function quitApp() {
    app.isQuitting = true;
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }
    if (mainWindow) {
        mainWindow.destroy();
    }
    logWindow.destroy();
    app.quit();
}

/**
 * 启动服务器
 */
function startServer() {
    if (isServerRunning) {
        console.log('Server is already running');
        return Promise.resolve();
    }

    logWindow.appendLog('正在启动服务器...', 'info');

    return new Promise((resolve, reject) => {
        let resolved = false;

        // 移除已存在的监听器（防止内存泄漏）
        if (serverStartedListener) {
            serverEvents.removeListener(EVENT_NAMES.SERVER_STARTED, serverStartedListener);
            serverStartedListener = null;
        }

        // 创建新的监听器 - 用于检测服务器何时启动
        // 注意：由于服务器运行在子进程中，serverEvents 无法跨进程通信
        // 我们改为检测 stdout 中的启动消息
        const handleServerStarted = (url) => {
            if (resolved) return;
            resolved = true;

            appUrl = url.toString();
            isServerRunning = true;
            isStarting = false; // 清理启动中标志
            logWindow.appendLog(`服务器已启动: ${appUrl}`, 'info');
            createSillyTavernWindow();
            updateTrayMenu();
            resolve();
        };

        serverStartedListener = handleServerStarted;

        // 设置工作目录
        process.chdir(sillyTavernRoot);
        logWindow.appendLog(`工作目录: ${sillyTavernRoot}`, 'info');

        // 使用 src/server-global.js 启动服务器
        const serverPath = path.join(sillyTavernRoot, 'src', 'server-global.js');
        logWindow.appendLog(`服务器路径: ${serverPath}`, 'info');

        serverProcess = spawn(process.execPath, [serverPath], {
            cwd: sillyTavernRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_ENV: app.isPackaged ? 'production' : 'development',
            },
        });

        // 捕获标准输出
        serverProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                console.log(message);
                logWindow.appendLog(message, 'info');

                // 检测服务器启动消息
                if (!resolved && message.includes('SillyTavern is listening on')) {
                    const urlMatch = message.match(/SillyTavern is listening on [^:]+: ([\d.]+):(\d+)/);
                    if (urlMatch) {
                        const host = urlMatch[1];
                        const port = urlMatch[2];
                        handleServerStarted(`http://${host}:${port}/`);
                    }
                }
            }
        });

        // 捕获错误输出
        serverProcess.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                console.error(message);
                logWindow.appendLog(message, 'error');
            }
        });

        // 监听服务器退出
        serverProcess.on('exit', (code, signal) => {
            isServerRunning = false;
            isStarting = false; // 清理启动中标志
            serverProcess = null;
            appUrl = null; // 清理 URL
            logWindow.appendLog(`服务器已退出 - 代码: ${code}, 信号: ${signal}`, 'warn');
            updateTrayMenu();
        });

        serverProcess.on('error', (err) => {
            logWindow.appendLog(`服务器错误: ${err.message}`, 'error');
            isServerRunning = false;
            isStarting = false; // 清理启动中标志
            serverProcess = null;

            // 清理监听器
            if (serverStartedListener) {
                serverEvents.removeListener(EVENT_NAMES.SERVER_STARTED, serverStartedListener);
                serverStartedListener = null;
            }

            updateTrayMenu();
            reject(err);
        });

        // 设置超时以防服务器启动失败
        const startupTimeout = setTimeout(() => {
            if (!resolved && serverProcess) {
                logWindow.appendLog('服务器启动超时（30秒），正在终止进程...', 'error');
                serverProcess.kill();
                serverProcess = null;
                isStarting = false;
                serverStartedListener = null;
                reject(new Error('服务器启动超时（30秒），请检查配置'));
            }
        }, 30000); // 30 秒超时

        // 清除超时的辅助函数
        const cleanupTimeout = () => clearTimeout(startupTimeout);

        // 确保在任何情况下都清除超时
        serverProcess.once('exit', () => {
            cleanupTimeout();
        });
        serverProcess.once('error', () => {
            cleanupTimeout();
        });
    });
}

/**
 * 停止服务器
 */
function stopServer() {
    if (!serverProcess || !isServerRunning) {
        logWindow.appendLog('服务器未运行', 'warn');
        return;
    }

    logWindow.appendLog('正在停止服务器...', 'info');

    // 清除之前的超时
    if (forceKillTimeout) {
        clearTimeout(forceKillTimeout);
    }

    // 设置强制终止超时（5秒后强制 SIGKILL）
    forceKillTimeout = setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
            logWindow.appendLog('强制终止服务器进程', 'warn');
            serverProcess.kill('SIGKILL');
        }
        forceKillTimeout = null;
    }, 5000);

    // 发送 SIGTERM 信号
    serverProcess.kill('SIGTERM');
}

/**
 * 创建 SillyTavern 主窗口
 */
function createSillyTavernWindow() {
    if (!appUrl) {
        console.error('The server has not started yet.');
        return;
    }

    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        return;
    }

    mainWindow = new BrowserWindow({
        width: cliArguments.width,
        height: cliArguments.height,
        title: 'SillyTavern',
        autoHideMenuBar: true,
    });

    mainWindow.loadURL(appUrl);

    // 窗口关闭时隐藏而非退出
    mainWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
            logWindow.appendLog('主窗口已隐藏到托盘', 'info');
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC 处理程序
ipcMain.on('start-server', () => {
    if (!isServerRunning && !isStarting) {
        isStarting = true;
        startServer()
            .finally(() => {
                isStarting = false;
            })
            .catch(err => {
                logWindow.appendLog(`启动服务器失败: ${err.message}`, 'error');
                console.error('Failed to start server:', err);
            });
    }
});

ipcMain.on('stop-server', () => {
    if (isServerRunning) {
        stopServer();
    }
});

ipcMain.on('get-server-status', (event) => {
    event.reply('server-status', {
        running: isServerRunning,
        url: appUrl,
    });
});

// 处理日志导出对话框 - 添加完善的错误处理
ipcMain.on('show-save-dialog', async (event, options) => {
    try {
        // 验证 options
        if (!options || typeof options !== 'object') {
            throw new Error('Invalid options provided');
        }

        const result = await dialog.showSaveDialog({
            title: options.title || '导出日志',
            defaultPath: options.defaultPath || '',
            filters: Array.isArray(options.filters) ? options.filters : undefined,
        });

        if (!result.canceled && result.filePath) {
            try {
                const logs = logWindow.exportLogs();
                const ext = path.extname(result.filePath).toLowerCase();
                let content;

                if (ext === '.json') {
                    // 验证 JSON 格式
                    try {
                        JSON.parse(logs); // 验证有效性
                        content = logs;
                    } catch (e) {
                        throw new Error('日志数据格式错误');
                    }
                } else {
                    // 转换为文本格式
                    let logData;
                    try {
                        logData = JSON.parse(logs);
                    } catch (e) {
                        throw new Error('无法解析日志数据');
                    }

                    content = logData.map(log => {
                        const date = new Date(log.timestamp);
                        // 验证时间戳
                        if (isNaN(date.getTime())) {
                            return `[无效时间] [${log.type.toUpperCase()}] ${log.message}`;
                        }
                        const time = date.toLocaleTimeString('zh-CN', { hour12: false });
                        return `[${time}] [${log.type.toUpperCase()}] ${log.message}`;
                    }).join('\n');
                }

                // 确保目录存在
                const dir = path.dirname(result.filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(result.filePath, content, 'utf8');
                event.reply('export-result', {
                    success: true,
                    message: `日志已成功导出到:\n${result.filePath}\n共 ${logData ? logData.length : 0} 条日志`,
                });
            } catch (error) {
                event.reply('export-result', {
                    success: false,
                    message: `导出失败: ${error.message}`,
                });
            }
        }
    } catch (error) {
        event.reply('export-result', {
            success: false,
            message: `操作失败: ${error.message}`,
        });
    }
});

// 应用就绪
app.whenReady().then(() => {
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0 && isServerRunning) {
            createSillyTavernWindow();
        }
    });

    // 自动启动服务器 - 添加错误处理
    startServer().catch(err => {
        logWindow.appendLog(`自动启动服务器失败: ${err.message}`, 'error');
        console.error('Failed to auto-start server:', err);
    });
});

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
    // 在 Windows/Linux 上，关闭所有窗口不退出应用（仅隐藏到托盘）
    if (process.platform !== 'darwin') {
        // 不退出，保持托盘运行
    }
});

// 应用退出前清理
app.on('before-quit', () => {
    app.isQuitting = true;

    // 清理服务器启动处理函数
    serverStartedListener = null;

    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }

    logWindow.destroy();
});
