const axios = require('axios');
const config = require('./config');

class TelegramNotifier {
    constructor() {
        this.enabled = config.telegram.enabled;
        this.botToken = config.telegram.botToken;
        this.chatId = config.telegram.chatId;
        this.messages = config.telegram.messages;
    }

    // 发送消息到 Telegram
    async sendMessage(message) {
        if (!this.enabled || !this.botToken || !this.chatId) {
            console.log('⚠️ Telegram 通知未配置或已禁用');
            return false;
        }

        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            const response = await axios.post(url, {
                chat_id: this.chatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

            console.log('✅ Telegram 消息发送成功');
            return true;
        } catch (error) {
            console.error('❌ Telegram 消息发送失败:', error.message);
            return false;
        }
    }

    // 格式化消息模板
    formatMessage(template, data) {
        let message = template;
        for (const [key, value] of Object.entries(data)) {
            message = message.replace(`{${key}}`, value);
        }
        return message;
    }

    // 发送新版本可用通知
    async notifyUpdateAvailable(fileConfig, currentVersion, remoteVersion, versionDiff) {
        const message = config.telegram.messages.updateAvailable
            .replace('{repo}', config.github.repo)
            .replace('{branch}', config.github.branch)
            .replace('{currentVersion}', currentVersion || '未知')
            .replace('{remoteVersion}', remoteVersion || '未知')
            .replace('{versionDiff}', versionDiff)
            .replace('{fileName}', fileConfig.name)
            .replace('{githubUrl}', fileConfig.githubUrl)
            .replace('{time}', new Date().toLocaleString('zh-CN'));

        await this.sendMessage(message);
    }


    // 发送更新成功通知
    async notifyUpdateSuccess(version, updatedFiles, fileSize, fileHash, duration) {
        const message = config.telegram.messages.updateSuccess
            .replace('{repo}', config.github.repo)
            .replace('{branch}', config.github.branch)
            .replace('{version}', version)
            .replace('{updatedFiles}', updatedFiles.join(', '))
            .replace('{fileSize}', this.formatFileSize(fileSize))
            .replace('{fileHash}', fileHash ? fileHash.substring(0, 12) + '...' : '未知')
            .replace('{time}', new Date().toLocaleString('zh-CN'))
            .replace('{duration}', duration);

        await this.sendMessage(message);
    }

    // 发送更新失败通知
    async notifyUpdateError(error) {
        const message = this.formatMessage(this.messages.updateError, {
            repo: `${config.github.owner}/${config.github.repo}`,
            error: error.message || error.toString(),
            time: new Date().toLocaleString('zh-CN')
        });
        return await this.sendMessage(message);
    }

    // 发送检查完成通知
    async notifyCheckComplete(totalFiles, needsUpdate, status, currentVersion, latestVersion, updateRate) {
        const nextCheckTime = new Date(Date.now() + config.checkIntervalMinutes * 60 * 1000)
            .toLocaleString('zh-CN');

        const message = config.telegram.messages.checkComplete
            .replace('{repo}', config.github.repo)
            .replace('{branch}', config.github.branch)
            .replace('{status}', status)
            .replace('{totalFiles}', totalFiles)
            .replace('{needsUpdate}', needsUpdate)
            .replace('{currentVersion}', currentVersion || '未知')
            .replace('{latestVersion}', latestVersion || '未知')
            .replace('{time}', new Date().toLocaleString('zh-CN'))
            .replace('{nextCheckTime}', nextCheckTime)
            .replace('{updateRate}', updateRate.toFixed(1));

        await this.sendMessage(message);
    }

    // 发送自定义消息
    async sendCustomMessage(text) {
        return await this.sendMessage(text);
    }

    // Docker 重启通知
    // Docker 重启通知
    async notifyDockerRestart(status, containerCount, duration, outputLog) {
        try {
            // 限制日志长度，避免消息过长
            const truncatedLog = outputLog.length > 200
                ? outputLog.substring(0, 200) + '...'
                : outputLog;

            const message = config.telegram.messages.dockerRestart
                .replace('{repo}', config.github.repo)
                .replace('{status}', status)
                .replace('{containerCount}', containerCount || '未知')
                .replace('{duration}', duration)
                .replace('{time}', new Date().toLocaleString('zh-CN'))
                .replace('{outputLog}', truncatedLog);

            await this.sendMessage(message);
        } catch (error) {
            console.error('❌ 发送 Docker 重启通知失败:', error.message);
        }
    }

    // 辅助方法：格式化文件大小
    formatFileSize(bytes) {
        if (!bytes) return '未知';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    }
}

module.exports = TelegramNotifier;