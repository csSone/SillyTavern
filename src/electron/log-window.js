import { BrowserWindow, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 日志查看窗口管理器
 */
export class LogWindow {
    constructor() {
        this.window = null;
        this.logs = [];
        this.maxLogs = 10000; // 最大日志条数
    }

    /**
     * 显示日志窗口
     */
    show() {
        if (!this.window) {
            this.createWindow();
        }
        this.window.show();
        this.window.focus();

        // 发送现有日志
        if (this.logs.length > 0) {
            this.window.webContents.send('init-logs', this.logs);
        }
    }

    /**
     * 创建日志窗口
     */
    createWindow() {
        this.window = new BrowserWindow({
            width: 900,
            height: 600,
            title: 'SillyTavern 服务器日志',
            icon: path.join(__dirname, '../../public/favicon.ico'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'log-viewer-preload.js'),
            },
        });

        this.window.loadFile(path.join(__dirname, 'log-viewer.html'));

        // 窗口关闭时隐藏而非退出
        this.window.on('close', (e) => {
            if (!app.isQuitting) {
                e.preventDefault();
                this.window.hide();
            }
        });

        this.window.on('closed', () => {
            this.window = null;
        });

        // 开发模式下打开开发者工具
        if (process.env.NODE_ENV === 'development') {
            // this.window.webContents.openDevTools();
        }
    }

    /**
     * 添加日志
     * @param {string} message - 日志消息
     * @param {string} type - 日志类型 (info, error, warn)
     */
    appendLog(message, type = 'info') {
        const logEntry = {
            message,
            type,
            timestamp: new Date().toISOString(),
        };

        // 保存日志
        this.logs.push(logEntry);

        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 发送到渲染进程
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('new-log', logEntry);
        }
    }

    /**
     * 清除日志
     */
    clearLogs() {
        this.logs = [];
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('clear-logs');
        }
    }

    /**
     * 导出日志
     * @returns {string} - JSON 格式的日志
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * 销毁窗口
     */
    destroy() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.destroy();
            this.window = null;
        }
    }

    /**
     * 隐藏窗口
     */
    hide() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.hide();
        }
    }

    /**
     * 获取日志数量
     * @returns {number}
     */
    getLogCount() {
        return this.logs.length;
    }
}
