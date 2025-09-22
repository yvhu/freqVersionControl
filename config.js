module.exports = {
    // Version kontrol ayarları
    checkIntervalMinutes: process.env.CHECKINTERVALMINUTES || 720, // Kaç dakikada bir kontrol edilecek

    // Telegram 机器人配置
    telegram: {
        enabled: true,
        botToken: process.env.TELEGRAM_BOT_TOKEN || 'your_bot_token_here',
        chatId: process.env.TELEGRAM_CHAT_ID || 'your_chat_id_here',
        // 增强版消息模板
        messages: {
            updateAvailable: `🆕 *发现新版本！*
    📦 项目: {repo}
    🌿 分支: {branch}
    📋 当前版本: {currentVersion}
    🚀 远程版本: {remoteVersion}
    📊 版本差异: {versionDiff}
    📁 文件: {fileName}
    🔗 GitHub: [查看文件]({githubUrl})
    ⏰ 时间: {time}`,

            updateSuccess: `✅ *更新成功！*
    📦 项目: {repo}
    🌿 分支: {branch}
    🔄 更新版本: {version}
    📁 更新文件: {updatedFiles}
    📊 文件大小: {fileSize}
    📝 SHA256: {fileHash}
    ⏰ 更新时间: {time}
    🕒 耗时: {duration}`,

            updateError: `❌ *更新失败！*
    📦 项目: {repo}
    🌿 分支: {branch}
    📁 文件: {fileName}
    📋 错误类型: {errorType}
    🔍 错误详情: {errorMessage}
    📚 错误堆栈: {errorStack}
    ⏰ 时间: {time}`,

            checkComplete: `📊 *版本检查完成*
    📦 项目: {repo}
    🌿 分支: {branch}
    ✅ 检查状态: {status}
    📁 总检查文件: {totalFiles}
    🔄 需要更新: {needsUpdate}
    📋 当前版本: {currentVersion}
    🚀 最新版本: {latestVersion}
    ⏰ 检查时间: {time}
    🕒 下次检查: {nextCheckTime}
    📈 更新率: {updateRate}%`,

            dockerRestart: `🐳 *Docker 容器重启*
    📦 项目: {repo}
    ✅ 状态: {status}
    📊 容器数量: {containerCount}
    ⏰ 重启时间: {duration}
    🕒 完成时间: {time}
    📋 输出日志: {outputLog}`,

            summaryReport: `📈 *更新摘要报告*
    📦 项目: {repo}
    📅 周期: {period}
    📁 总文件数: {totalFiles}
    ✅ 成功更新: {successCount}
    ❌ 失败更新: {failedCount}
    ⚡ 更新次数: {updateCount}
    📊 成功率: {successRate}%
    ⏰ 最后检查: {lastCheckTime}
    🌐 运行时长: {uptime}`
        }
    },

    // GitHub repository ayarları
    github: {
        owner: 'iterativv',
        repo: 'NostalgiaForInfinity',
        branch: 'main',
        apiUrl: 'https://api.github.com/repos/iterativv/NostalgiaForInfinity',
        rawUrl: 'https://raw.githubusercontent.com/iterativv/NostalgiaForInfinity/refs/heads/main'
    },

    // Sabit dosyalar (manuel tanımlı)
    staticFiles: [
        {
            name: 'NostalgiaForInfinityX6.py',
            localPath: '../NostalgiaForInfinityX6.py',
            githubPath: 'NostalgiaForInfinityX6.py',
            type: 'strategy',
            versionCheck: true
        }
    ],

    // Dinamik klasörler (GitHub API ile otomatik tespit)
    dynamicFolders: [
        {
            name: 'configs',
            localPath: '../configs',
            githubPath: 'configs',
            type: 'config',
            versionCheck: false, // Hash kontrolü
            fileExtensions: ['.json', '.toml', '.yaml', '.yml', '.txt', '.md'] // İzin verilen uzantılar
        }
    ],

    // Geriye uyumluluk için eski dosya listesi (deprecated)
    files: [],

    // Geriye uyumluluk için eski ayarlar (deprecated)
    fileName: '../NostalgiaForInfinityX6.py', // Bir üst klasördeki dosya
    githubUrl: 'https://raw.githubusercontent.com/iterativv/NostalgiaForInfinity/refs/heads/main/NostalgiaForInfinityX6.py',

    // Docker ayarları
    docker: {
        enabled: true, // Docker restart
        downCommand: 'docker compose down',
        upCommand: 'docker compose up -d'
    },

    // Proxy ayarları
    proxy: {
        enabled: false, // Proxy
        host: 'localhost',
        port: 9090,
        protocol: 'http'
    },

    // HTTP isteği ayarları
    request: {
        timeout: 30000, // Timeout
        headers: {
            'Host': 'raw.githubusercontent.com',
            'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Sec-GPC': '1',
            'Accept-Language': 'en-US,en;q=0.8',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
            'Connection': 'close'
        }
    }
}; 
