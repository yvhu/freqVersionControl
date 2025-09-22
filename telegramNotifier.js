// telegramNotifier.js 完整修复版本
const axios = require('axios');
const config = require('./config');

class TelegramNotifier {
    constructor() {
        this.botToken = config.telegram.botToken;
        this.chatId = config.telegram.chatId;
        this.enabled = config.telegram.enabled;
    }

    // 发送消息到 Telegram
    async sendMessage(message) {
        if (!this.enabled || !this.botToken || !this.chatId) {
            console.log('⚠️ Telegram 通知未启用或配置不完整');
            return false;
        }

        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            const response = await axios.post(url, {
                chat_id: this.chatId,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });

            console.log('✅ Telegram 消息发送成功');
            return true;
        } catch (error) {
            console.error('❌ Telegram 消息发送失败:', error.message);
            return false;
        }
    }

    // 转义 Telegram 特殊字符
    escapeTelegramChars(text) {
        if (!text) return '';
        return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
    }

    // 发现新版本通知
    async notifyUpdateAvailable(currentVersion, remoteVersion, fileConfig) {
        const versionDiff = this.getVersionDiff(currentVersion, remoteVersion);
        
        const message = config.telegram.messages.updateAvailable
            .replace(/{repo}/g, config.github.repo)
            .replace(/{branch}/g, config.github.branch)
            .replace(/{currentVersion}/g, this.escapeTelegramChars(currentVersion || '未知'))
            .replace(/{remoteVersion}/g, this.escapeTelegramChars(remoteVersion || '未知'))
            .replace(/{versionDiff}/g, versionDiff)
            .replace(/{fileName}/g, this.escapeTelegramChars(fileConfig?.name || '未知文件'))
            .replace(/{githubUrl}/g, fileConfig?.githubUrl || '未知')
            .replace(/{time}/g, new Date().toLocaleString('zh-CN'));

        return await this.sendMessage(message);
    }

    // 更新成功通知
    async notifyUpdateSuccess(version, updatedFiles, fileInfo = {}) {
        const message = config.telegram.messages.updateSuccess
            .replace(/{repo}/g, config.github.repo)
            .replace(/{branch}/g, config.github.branch)
            .replace(/{version}/g, this.escapeTelegramChars(version || '未知'))
            .replace(/{updatedFiles}/g, this.escapeTelegramChars(updatedFiles.join(', ') || '无'))
            .replace(/{fileSize}/g, this.formatFileSize(fileInfo.size))
            .replace(/{fileHash}/g, this.escapeTelegramChars(fileInfo.hash ? fileInfo.hash.substring(0, 12) + '...' : '未知'))
            .replace(/{time}/g, new Date().toLocaleString('zh-CN'))
            .replace(/{duration}/g, fileInfo.duration || '未知');

        return await this.sendMessage(message);
    }

    // 更新失败通知
    async notifyUpdateError(error, fileConfig = null) {
        const errorType = error.constructor?.name || 'Error';
        const errorMessage = error.message || '未知错误';
        const errorStack = error.stack ? error.stack.substring(0, 200) + '...' : '无堆栈信息';

        const message = config.telegram.messages.updateError
            .replace(/{repo}/g, config.github.repo)
            .replace(/{branch}/g, config.github.branch)
            .replace(/{fileName}/g, this.escapeTelegramChars(fileConfig?.name || '未知文件'))
            .replace(/{errorType}/g, this.escapeTelegramChars(errorType))
            .replace(/{errorMessage}/g, this.escapeTelegramChars(errorMessage))
            .replace(/{errorStack}/g, this.escapeTelegramChars(errorStack))
            .replace(/{time}/g, new Date().toLocaleString('zh-CN'));

        return await this.sendMessage(message);
    }

    // 检查完成通知
    async notifyCheckComplete(totalFiles, needsUpdate, status, versionInfo = {}) {
        const nextCheckTime = new Date(Date.now() + config.checkIntervalMinutes * 60 * 1000)
            .toLocaleString('zh-CN');
        
        const updateRate = totalFiles > 0 ? (needsUpdate / totalFiles * 100) : 0;

        const message = config.telegram.messages.checkComplete
            .replace(/{repo}/g, config.github.repo)
            .replace(/{branch}/g, config.github.branch)
            .replace(/{status}/g, this.escapeTelegramChars(status))
            .replace(/{totalFiles}/g, totalFiles)
            .replace(/{needsUpdate}/g, needsUpdate)
            .replace(/{currentVersion}/g, this.escapeTelegramChars(versionInfo.current || '未知'))
            .replace(/{latestVersion}/g, this.escapeTelegramChars(versionInfo.latest || '未知'))
            .replace(/{time}/g, new Date().toLocaleString('zh-CN'))
            .replace(/{nextCheckTime}/g, nextCheckTime)
            .replace(/{updateRate}/g, updateRate.toFixed(1));

        return await this.sendMessage(message);
    }

    // Docker 重启通知
    async notifyDockerRestart(status, containerInfo = {}) {
        const message = config.telegram.messages.dockerRestart
            .replace(/{repo}/g, config.github.repo)
            .replace(/{status}/g, this.escapeTelegramChars(status))
            .replace(/{containerCount}/g, containerInfo.count || '未知')
            .replace(/{duration}/g, containerInfo.duration || '未知')
            .replace(/{time}/g, new Date().toLocaleString('zh-CN'))
            .replace(/{outputLog}/g, this.escapeTelegramChars(containerInfo.log ? containerInfo.log.substring(0, 100) + '...' : '无日志'));

        return await this.sendMessage(message);
    }

    // 自定义消息
    async sendCustomMessage(customMessage) {
        const message = `💬 *自定义通知*\n${this.escapeTelegramChars(customMessage)}\n⏰ 时间: ${new Date().toLocaleString('zh-CN')}`;
        return await this.sendMessage(message);
    }

    // 辅助方法：格式化文件大小
    formatFileSize(bytes) {
        if (!bytes) return '未知';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    }

    // 辅助方法：计算版本差异
    getVersionDiff(current, remote) {
        if (!current || !remote) return '未知';
        
        try {
            const currentParts = current.replace('v', '').split('.').map(Number);
            const remoteParts = remote.replace('v', '').split('.').map(Number);
            
            for (let i = 0; i < Math.max(currentParts.length, remoteParts.length); i++) {
                if (remoteParts[i] > currentParts[i]) {
                    return `v${i === 0 ? '主要' : i === 1 ? '次要' : '修补'}版本更新`;
                }
            }
            return '版本相同';
        } catch {
            return '版本格式错误';
        }
    }
}

module.exports = TelegramNotifier;