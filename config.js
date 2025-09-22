module.exports = {
    // Version kontrol ayarları
    checkIntervalMinutes: 60, // Kaç dakikada bir kontrol edilecek
    
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
