const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const crypto = require('crypto');
const config = require('./config');

class NostalgiaVersionChecker {
    constructor() {
        // Config dosyasından ayarları al
        this.staticFiles = config.staticFiles || [];
        this.dynamicFolders = config.dynamicFolders || [];
        this.github = config.github;
        this.allFiles = []; // Tüm dosyalar (static + dynamic)
        this.checkInterval = config.checkIntervalMinutes * 60 * 1000;
        
        // Geriye uyumluluk için eski ayarlar
        this.files = config.files || [];
        this.fileName = config.fileName;
        this.githubUrl = config.githubUrl;
        this.currentVersion = null;
        
        // Axios config'i oluştur
        this.axiosConfig = {
            headers: config.request.headers,
            timeout: config.request.timeout
        };
        
        // GitHub API için ayrı config (daha basit headers)
        this.githubApiConfig = {
            timeout: config.request.timeout,
            headers: {
                'User-Agent': 'NostalgiaForInfinity-Updater',
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        
        // Proxy ayarları (eğer aktifse)
        if (config.proxy.enabled) {
            this.axiosConfig.proxy = {
                host: config.proxy.host,
                port: config.proxy.port,
                protocol: config.proxy.protocol
            };
            this.githubApiConfig.proxy = {
                host: config.proxy.host,
                port: config.proxy.port,
                protocol: config.proxy.protocol
            };
        }
    }

    // GitHub API ile klasördeki dosyaları al
    async getGitHubFolderContents(folderPath) {
        try {
            const url = `${this.github.apiUrl}/contents/${folderPath}?ref=${this.github.branch}`;
            console.log(`🔍 GitHub API: ${folderPath} klasörü kontrol ediliyor...`);
            
            const response = await axios.get(url, this.githubApiConfig);
            
            if (Array.isArray(response.data)) {
                return response.data.filter(item => item.type === 'file');
            }
            return [];
        } catch (error) {
            console.error(`❌ GitHub API hatası (${folderPath}):`, error.message);
            return [];
        }
    }

    // Dinamik klasörlerden dosya listesi oluştur
    async buildDynamicFileList() {
        console.log('🔄 Dinamik dosya listesi oluşturuluyor...');
        const dynamicFiles = [];

        for (const folder of this.dynamicFolders) {
            const githubFiles = await this.getGitHubFolderContents(folder.githubPath);
            
            for (const githubFile of githubFiles) {
                // Dosya uzantısını kontrol et
                const fileExt = path.extname(githubFile.name).toLowerCase();
                if (folder.fileExtensions.includes(fileExt)) {
                    const fileConfig = {
                        name: githubFile.name,
                        localPath: path.join(folder.localPath, githubFile.name),
                        githubUrl: `${this.github.rawUrl}/${folder.githubPath}/${githubFile.name}`,
                        githubPath: `${folder.githubPath}/${githubFile.name}`,
                        type: folder.type,
                        versionCheck: folder.versionCheck,
                        size: githubFile.size,
                        sha: githubFile.sha
                    };
                    dynamicFiles.push(fileConfig);
                }
            }
            
            console.log(`📁 ${folder.name}: ${githubFiles.length} dosya bulundu, ${dynamicFiles.filter(f => f.githubPath.startsWith(folder.githubPath)).length} dosya eklendi`);
        }

        return dynamicFiles;
    }

    // Tüm dosya listesini oluştur (static + dynamic)
    async buildCompleteFileList() {
        console.log('📋 Tam dosya listesi oluşturuluyor...');
        
        // Static dosyaları ekle
        const staticFiles = this.staticFiles.map(file => ({
            ...file,
            githubUrl: `${this.github.rawUrl}/${file.githubPath}`
        }));

        // Dynamic dosyaları al
        const dynamicFiles = await this.buildDynamicFileList();

        // Geriye uyumluluk için eski files array'ini de ekle
        const legacyFiles = this.files || [];

        this.allFiles = [...staticFiles, ...dynamicFiles, ...legacyFiles];
        
        console.log(`✅ Toplam ${this.allFiles.length} dosya tespit edildi:`);
        console.log(`  📌 Static: ${staticFiles.length}`);
        console.log(`  🔄 Dynamic: ${dynamicFiles.length}`);
        console.log(`  🔙 Legacy: ${legacyFiles.length}`);
        
        return this.allFiles;
    }

    // Dosya hash'i hesapla (config dosyaları için)
    calculateFileHash(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const fileContent = fs.readFileSync(filePath, 'utf8');
            return crypto.createHash('sha256').update(fileContent).digest('hex');
        } catch (error) {
            console.error(`❌ Hash hesaplanırken hata (${filePath}):`, error.message);
            return null;
        }
    }

    // Remote dosya hash'i hesapla
    async calculateRemoteHash(url) {
        try {
            const response = await axios.get(url, this.axiosConfig);
            return crypto.createHash('sha256').update(response.data).digest('hex');
        } catch (error) {
            console.error(`❌ Remote hash hesaplanırken hata (${url}):`, error.message);
            return null;
        }
    }

    // Tek dosya için güncelleme kontrolü
    async checkSingleFile(fileConfig) {
        console.log(`\n📁 ${fileConfig.name} kontrol ediliyor...`);
        
        let needsUpdate = false;
        let currentInfo = null;
        let remoteInfo = null;

        if (fileConfig.versionCheck && fileConfig.type === 'strategy') {
            // Python dosyası için version kontrolü
            currentInfo = this.getCurrentVersionForFile(fileConfig.localPath);
            remoteInfo = await this.getRemoteVersionForFile(fileConfig.githubUrl);
            
            if (currentInfo && remoteInfo) {
                const comparison = this.compareVersions(currentInfo, remoteInfo);
                needsUpdate = comparison === 1;
                console.log(`📋 Mevcut: ${currentInfo} | 🌐 Remote: ${remoteInfo}`);
            }
        } else {
            // Config dosyaları için hash kontrolü
            currentInfo = this.calculateFileHash(fileConfig.localPath);
            remoteInfo = await this.calculateRemoteHash(fileConfig.githubUrl);
            
            if (currentInfo && remoteInfo) {
                needsUpdate = currentInfo !== remoteInfo;
                console.log(`🔐 Hash karşılaştırması: ${needsUpdate ? 'Farklı' : 'Aynı'}`);
            }
        }

        return {
            file: fileConfig,
            needsUpdate,
            currentInfo,
            remoteInfo
        };
    }

    // Belirli dosya için version bilgisi al
    getCurrentVersionForFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`❌ ${filePath} dosyası bulunamadı!`);
                return null;
            }

            const fileContent = fs.readFileSync(filePath, 'utf8');
            const versionRegex = /def version\(self\) -> str:\s*\n\s*return\s*["']([^"']+)["']/;
            const match = fileContent.match(versionRegex);
            
            return match && match[1] ? match[1] : null;
        } catch (error) {
            console.error(`❌ ${filePath} okunurken hata:`, error.message);
            return null;
        }
    }

    // Remote dosya için version bilgisi al
    async getRemoteVersionForFile(url) {
        try {
            const response = await axios.get(url, this.axiosConfig);
            const versionRegex = /def version\(self\) -> str:\s*\n\s*return\s*["']([^"']+)["']/;
            const match = response.data.match(versionRegex);
            
            return match && match[1] ? match[1] : null;
        } catch (error) {
            console.error(`❌ Remote version alınırken hata (${url}):`, error.message);
            return null;
        }
    }

    // Tek dosyayı güncelle
    async updateSingleFile(fileConfig) {
        try {
            console.log(`⬇️  ${fileConfig.name} indiriliyor...`);
            const response = await axios.get(fileConfig.githubUrl, this.axiosConfig);
            
            // Klasör yoksa oluştur
            const dir = path.dirname(fileConfig.localPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Klasör oluşturuldu: ${dir}`);
            }
            
            // Dosyayı kaydet
            fs.writeFileSync(fileConfig.localPath, response.data, 'utf8');
            console.log(`✅ ${fileConfig.name} başarıyla güncellendi!`);
            
            return true;
        } catch (error) {
            console.error(`❌ ${fileConfig.name} güncellenirken hata:`, error.message);
            return false;
        }
    }

    // Mevcut dosyadan version bilgisini çıkart
    getCurrentVersion() {
        try {
            if (!fs.existsSync(this.fileName)) {
                console.log('❌ NostalgiaForInfinityX6.py dosyası bulunamadı!');
                return null;
            }

            const fileContent = fs.readFileSync(this.fileName, 'utf8');
            
            // Version fonksiyonunu bul ve version string'ini çıkart
            const versionRegex = /def version\(self\) -> str:\s*\n\s*return\s*["']([^"']+)["']/;
            const match = fileContent.match(versionRegex);
            
            if (match && match[1]) {
                this.currentVersion = match[1];
                console.log(`📋 Mevcut version: ${this.currentVersion}`);
                return this.currentVersion;
            } else {
                console.log('⚠️  Version bilgisi dosyada bulunamadı!');
                return null;
            }
        } catch (error) {
            console.error('❌ Dosya okunurken hata:', error.message);
            return null;
        }
    }

    // GitHub'dan version bilgisini al
    async getRemoteVersion() {
        try {
            console.log('🔍 GitHub\'dan version kontrol ediliyor...');
            const response = await axios.get(this.githubUrl, this.axiosConfig);
            
            const versionRegex = /def version\(self\) -> str:\s*\n\s*return\s*["']([^"']+)["']/;
            const match = response.data.match(versionRegex);
            
            if (match && match[1]) {
                console.log(`🌐 GitHub version: ${match[1]}`);
                return match[1];
            } else {
                console.log('⚠️  GitHub\'dan version bilgisi alınamadı!');
                return null;
            }
        } catch (error) {
            console.error('❌ GitHub\'a istek gönderilirken hata:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.log('🔧 Proxy bağlantısı kontrol edin (localhost:9090)');
            }
            return null;
        }
    }

    // Version karşılaştırma (v16.5.255 formatını parse et)
    compareVersions(current, remote) {
        try {
            // "v" karakterini kaldır ve sayıları ayır
            const currentParts = current.replace('v', '').split('.').map(Number);
            const remoteParts = remote.replace('v', '').split('.').map(Number);
            
            // Major, minor, patch karşılaştırması
            for (let i = 0; i < Math.max(currentParts.length, remoteParts.length); i++) {
                const curr = currentParts[i] || 0;
                const rem = remoteParts[i] || 0;
                
                if (rem > curr) return 1;  // Remote daha yüksek
                if (rem < curr) return -1; // Current daha yüksek
            }
            
            return 0; // Eşit
        } catch (error) {
            console.error('❌ Version karşılaştırma hatası:', error.message);
            return 0;
        }
    }

    // Docker container'ları restart et
    async restartDockerContainers() {
        return new Promise((resolve, reject) => {
            console.log('🐳 Docker containerlar durduruluyor...');
            
            exec(config.docker.downCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Docker down komutu hatası:', error.message);
                    reject(error);
                    return;
                }
                
                console.log('🛑 Docker containerlar durduruldu');
                if (stdout) console.log(stdout);
                
                // Containerlari tekrar başlat
                console.log('🚀 Docker containerlar başlatılıyor...');
                
                exec(config.docker.upCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.error('❌ Docker up komutu hatası:', error.message);
                        reject(error);
                        return;
                    }
                    
                    console.log('✅ Docker containerlar başarıyla başlatıldı!');
                    if (stdout) console.log(stdout);
                    resolve();
                });
            });
        });
    }

    // Dosyayı güncelle
    async updateFile() {
        try {
            console.log('⬇️  Yeni version indiriliyor...');
            const response = await axios.get(this.githubUrl, this.axiosConfig);
            
            // Yeni dosyayı kaydet
            fs.writeFileSync(this.fileName, response.data, 'utf8');
            console.log('✅ Dosya başarıyla güncellendi!');
            
            // Yeni version'u kontrol et
            this.getCurrentVersion();
            
            // Docker restart işlemi
            if (config.docker.enabled) {
                try {
                    await this.restartDockerContainers();
                    console.log('🎉 Güncelleme ve Docker restart tamamlandı!');
                } catch (dockerError) {
                    console.error('⚠️  Docker restart başarısız, ancak dosya güncellendi:', dockerError.message);
                }
            }
            
        } catch (error) {
            console.error('❌ Dosya güncellenirken hata:', error.message);
        }
    }

    // Çoklu dosya version kontrol işlemi
    async checkForUpdates() {
        console.log('\n🚀 Dinamik çoklu dosya version kontrol başlatılıyor...');
        console.log(`⏰ Zaman: ${new Date().toLocaleString('tr-TR')}`);
        
        // Önce tüm dosya listesini oluştur
        await this.buildCompleteFileList();
        
        console.log(`📊 Toplam ${this.allFiles.length} dosya kontrol edilecek`);
        
        const updateResults = [];
        let hasUpdates = false;

        // Her dosyayı kontrol et
        for (const fileConfig of this.allFiles) {
            const result = await this.checkSingleFile(fileConfig);
            updateResults.push(result);
            
            if (result.needsUpdate) {
                hasUpdates = true;
            }
        }

        // Güncelleme gerekli dosyaları listele
        const filesToUpdate = updateResults.filter(r => r.needsUpdate);
        
        if (filesToUpdate.length > 0) {
            console.log(`\n🆕 ${filesToUpdate.length} dosya güncelleme gerekiyor:`);
            filesToUpdate.forEach(r => {
                console.log(`  📄 ${r.file.name}`);
            });
            
            console.log('\n⬇️  Güncelleme işlemi başlatılıyor...');
            
            // Dosyaları güncelle
            let successCount = 0;
            for (const result of filesToUpdate) {
                const success = await this.updateSingleFile(result.file);
                if (success) successCount++;
            }
            
            console.log(`\n📈 Güncelleme sonucu: ${successCount}/${filesToUpdate.length} dosya başarılı`);
            
            // Docker restart (eğer en az bir dosya güncellendiyse)
            if (successCount > 0 && config.docker.enabled) {
                try {
                    await this.restartDockerContainers();
                    console.log('🎉 Güncelleme ve Docker restart tamamlandı!');
                } catch (dockerError) {
                    console.error('⚠️  Docker restart başarısız, ancak dosyalar güncellendi:', dockerError.message);
                }
            }
            
        } else {
            console.log('\n✅ Tüm dosyalar güncel, güncelleme gerekmez.');
        }
        
        console.log('─'.repeat(50));
    }

    // Geriye uyumluluk için eski version kontrol işlemi
    async checkForUpdatesLegacy() {
        console.log('\n🚀 Version kontrol başlatılıyor...');
        console.log(`⏰ Zaman: ${new Date().toLocaleString('tr-TR')}`);
        
        // Mevcut version'u al
        const currentVersion = this.getCurrentVersion();
        if (!currentVersion) {
            console.log('❌ Mevcut version alınamadı, işlem iptal edildi.');
            return;
        }
        
        // Remote version'u al
        const remoteVersion = await this.getRemoteVersion();
        if (!remoteVersion) {
            console.log('❌ Remote version alınamadı, işlem iptal edildi.');
            return;
        }
        
        // Version'ları karşılaştır
        const comparison = this.compareVersions(currentVersion, remoteVersion);
        
        if (comparison === 1) {
            console.log('🆕 Yeni version mevcut! Güncelleme başlatılıyor...');
            await this.updateFile();
        } else if (comparison === 0) {
            console.log('✅ Dosya güncel, güncelleme gerekmez.');
        } else {
            console.log('ℹ️  Mevcut version daha yeni veya eşit.');
        }
        
        console.log('─'.repeat(50));
    }

    // Uygulamayı başlat
    async start() {
        console.log('🎯 NostalgiaForInfinity Dinamik Çoklu Dosya Version Checker başlatıldı');
        console.log(`📁 Çalışma dizini: ${process.cwd()}`);
        console.log(`🐳 Docker restart: ${config.docker.enabled ? 'Aktif' : 'Pasif'}`);
        console.log(`🌐 Proxy: ${config.proxy.enabled ? `${config.proxy.host}:${config.proxy.port}` : 'Pasif'}`);
        console.log(`🔗 GitHub: ${this.github.owner}/${this.github.repo} (${this.github.branch})`);
        console.log(`⏰ Kontrol aralığı: ${config.checkIntervalMinutes} dakika`);
        
        // Konfigürasyon özeti
        console.log('\n⚙️  Konfigürasyon:');
        console.log(`  📌 Static dosyalar: ${this.staticFiles.length}`);
        console.log(`  🔄 Dinamik klasörler: ${this.dynamicFolders.length}`);
        this.dynamicFolders.forEach(folder => {
            console.log(`    📁 ${folder.name} (${folder.fileExtensions.join(', ')})`);
        });
        
        console.log('═'.repeat(50));
        console.log('🔄 Sürekli çalışma modu aktif - Durdurmak için Ctrl+C basın');
        console.log('═'.repeat(50));
        
        // Graceful shutdown için signal handler'ları ekle
        this.setupGracefulShutdown();
        
        // İlk kontrol
        await this.checkForUpdates();
        
        // Sürekli kontrol döngüsü
        this.startContinuousMode();
    }

    // Graceful shutdown setup
    setupGracefulShutdown() {
        const gracefulShutdown = () => {
            console.log('\n\n🛑 Kapatma sinyali alındı...');
            console.log('✅ Program güvenli şekilde sonlandırılıyor...');
            console.log('👋 Görüşürüz!');
            process.exit(0);
        };

        // SIGINT (Ctrl+C) ve SIGTERM sinyallerini yakala
        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);
        
        // Windows için
        if (process.platform === "win32") {
            const rl = require("readline").createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            rl.on("SIGINT", () => {
                process.emit("SIGINT");
            });
        }
    }

    // Sürekli çalışma modu
    startContinuousMode() {
        console.log(`\n⏳ Sonraki kontrol ${config.checkIntervalMinutes} dakika sonra...`);
        
        setTimeout(async () => {
            try {
                await this.checkForUpdates();
            } catch (error) {
                console.error('❌ Kontrol sırasında hata:', error.message);
            }
            
            // Recursive olarak kendini tekrar çağır
            this.startContinuousMode();
        }, this.checkInterval);
    }
}

// Uygulamayı başlat
const checker = new NostalgiaVersionChecker();
checker.start(); 