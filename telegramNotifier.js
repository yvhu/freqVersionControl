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
    async notifyUpdateAvailable(currentVersion, remoteVersion) {
        const message = this.formatMessage(this.messages.updateAvailable, {
            repo: `${config.github.owner}/${config.github.repo}`,
            currentVersion: currentVersion || '未知',
            remoteVersion: remoteVersion || '未知',
            time: new Date().toLocaleString('zh-CN')
        });
        return await this.sendMessage(message);
    }

    // 发送更新成功通知
    async notifyUpdateSuccess(version, updatedFiles = []) {
        const message = this.formatMessage(this.messages.updateSuccess, {
            repo: `${config.github.owner}/${config.github.repo}`,
            version: version || '未知',
            updatedFiles: updatedFiles.length > 0 ? updatedFiles.join(', ') : '无',
            time: new Date().toLocaleString('zh-CN')
        });
        return await this.sendMessage(message);
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
    async notifyCheckComplete(totalFiles, needsUpdate, status) {
        const message = this.formatMessage(this.messages.checkComplete, {
            repo: `${config.github.owner}/${config.github.repo}`,
            status: status,
            totalFiles: totalFiles,
            needsUpdate: needsUpdate,
            time: new Date().toLocaleString('zh-CN')
        });
        return await this.sendMessage(message);
    }

    // 发送自定义消息
    async sendCustomMessage(text) {
        return await this.sendMessage(text);
    }
}

module.exports = TelegramNotifier;