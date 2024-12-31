class Gallery {
    constructor() {
        // GitHub 配置
        this.config = config.github;  // 使用配置文件中的值

        this.apiBase = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents`;
        this.rawBase = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}`;
        
        this.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${this.config.token}`  // 改回使用 'token' 前缀
        };

        this.currentCategory = '';
        this.loading = false;
        this.categories = {
            'xiuren': '秀人网',
            'mfstar': '模范学院',
            'mistar': '魅妍社',
            'mygirl': '美媛馆',
            'imiss': '爱蜜社',
            'bololi': '兔几盟',
            'youwu': '尤物馆',
            'uxing': '优星馆',
            'miitao': '蜜桃社',
            'feilin': '嗲囡囡',
            'wings': '影私荟',
            'taste': '顽味生活',
            'leyuan': '星乐园',
            'huayan': '花の颜',
            'dkgirl': '御女郎',
            'mintye': '薄荷叶',
            'youmi': '尤蜜荟',
            'candy': '糖果画报',
            'mtmeng': '模特联盟',
            'micat': '猫萌榜'
        };

        this.currentImageIndex = 0;  // 添加当前图片索引
        this.currentImages = [];     // 添加当前相册图片数组

        this.isPlaying = false;  // 添加播放状态
        this.slideInterval = null;  // 添加幻灯片计时器
        this.slideDelay = 3000;  // 幻灯片间隔时间（毫秒）

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.initElements();
        if (this.checkElements()) {
            this.initEventListeners();
            this.initCategories();
        }
    }

    initElements() {
        this.categorySelect = document.getElementById('categorySelect');
        this.albumsGrid = document.getElementById('albumsGrid');
        this.loadingEl = document.getElementById('loading');
        this.searchInput = document.getElementById('searchInput');
    }

    checkElements() {
        const elements = {
            'categorySelect': this.categorySelect,
            'albumsGrid': this.albumsGrid,
            'loadingEl': this.loadingEl,
            'searchInput': this.searchInput
        };

        let allFound = true;
        for (const [name, element] of Object.entries(elements)) {
            if (!element) {
                console.error(`Required element not found: ${name}`);
                allFound = false;
            }
        }
        return allFound;
    }

    initEventListeners() {
        // 分类选择事件
        this.categorySelect.addEventListener('change', () => {
            this.currentCategory = this.categorySelect.value;
            this.loadAlbums();
        });

        // 搜索输入事件
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 300);
        });
    }

    initCategories() {
        // 清空现有选项
        this.categorySelect.innerHTML = '<option value="">全部分类</option>';
        
        // 添加分类选项
        for (const [code, name] of Object.entries(this.categories)) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            this.categorySelect.appendChild(option);
        }
    }

    async loadAlbums() {
        if (this.loading) return;

        this.loading = true;
        this.loadingEl.style.display = 'block';
        this.albumsGrid.innerHTML = '';

        try {
            // 添加错误处理和重试逻辑
            const response = await fetch(`${this.apiBase}/${this.currentCategory}`, {
                headers: this.headers,
                cache: 'no-store'  // 禁用缓存
            });
            
            if (!response.ok) {
                console.error('API Response:', await response.text());
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // 过滤出目录
            const albums = data.filter(item => item.type === 'dir');
            
            // 添加加载进度显示
            let loadedCount = 0;
            const totalCount = albums.length;

            for (const album of albums) {
                await this.loadAlbumDetails(album.name);
                loadedCount++;
                
                // 更新加载进度
                this.loadingEl.innerHTML = `
                    <div class="loading-progress">
                        <img src="assets/loading.svg" alt="加载中">
                        <div class="progress-text">加载中 ${loadedCount}/${totalCount}</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading albums:', error);
            this.albumsGrid.innerHTML = `<div class="error-message">
                加载失败，请稍后重试<br>
                <small>${error.message}</small>
            </div>`;
        } finally {
            this.loading = false;
            this.loadingEl.style.display = 'none';
        }
    }

    handleSearch(query) {
        if (!query) {
            // 如果搜索框为空，显示所有内容
            this.loadAlbums();
            return;
        }

        // 将搜索词转换为小写以进行不区分大小写的搜索
        const searchLower = query.toLowerCase();

        // 获取所有卡片
        const cards = this.albumsGrid.getElementsByClassName('album-card');

        // 遍历所有卡片进行筛选
        Array.from(cards).forEach(card => {
            const title = card.querySelector('.album-title').textContent.toLowerCase();
            const author = card.querySelector('.album-author').textContent.toLowerCase();

            // 如果标题或作者包含搜索词，显示卡片，否则隐藏
            if (title.includes(searchLower) || author.includes(searchLower)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    async loadAlbumDetails(albumId) {
        try {
            // 获取元数据
            const metadataUrl = `${this.apiBase}/${this.currentCategory}/${albumId}/metadata.json`;
            const response = await fetch(metadataUrl, {
                headers: this.headers
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const content = atob(data.content);
            const albumData = JSON.parse(content);

            // 创建相册卡片
            this.createAlbumCard({
                ...albumData,
                id: albumId,
                coverUrl: `${this.rawBase}/${this.currentCategory}/${albumId}/cover.jpg`,
                url: `${this.rawBase}/${this.currentCategory}/${albumId}`
            });
        } catch (error) {
            console.error(`Error loading album ${albumId}:`, error);
        }
    }

    createAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'album-card';
        
        const title = this.decodeText(album.title);
        const author = this.decodeText(album.author);
        
        // 修改为点击打开模态框而不是新窗口
        card.innerHTML = `
            <div class="album-link">
                <img src="${album.coverUrl}" class="album-cover" alt="${title}" loading="lazy">
                <div class="album-info">
                    <h3 class="album-title">${title}</h3>
                    <div class="album-author">${author}</div>
                </div>
            </div>
        `;

        // 添加点击事件
        card.addEventListener('click', () => this.showAlbumDetails(album));
        this.albumsGrid.appendChild(card);
    }

    // 添加模态框展示方法
    showAlbumDetails(album) {
        let modal = document.getElementById('albumModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'albumModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        this.loadAlbumImages(album).then(images => {
            this.currentImages = images;  // 保存图片数组
            this.currentImageIndex = 0;   // 重置索引

            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn">&times;</span>
                    <h2>${this.decodeText(album.title)}</h2>
                    <div class="album-info">
                        <span class="author">${this.decodeText(album.author)}</span>
                        <span class="date">${album.date || ''}</span>
                    </div>
                    <div class="album-images">
                        ${images.map((img, idx) => `
                            <img src="${img}" 
                                alt="${album.title} - ${idx + 1}" 
                                loading="lazy"
                                data-index="${idx}"
                                class="album-image">
                        `).join('')}
                    </div>
                </div>
            `;

            // 添加图片点击事件
            const imgElements = modal.querySelectorAll('.album-image');
            imgElements.forEach(img => {
                img.addEventListener('click', (e) => {
                    this.showFullscreen(parseInt(e.target.dataset.index));
                });
            });

            // 关闭事件
            const closeBtn = modal.querySelector('.close-btn');
            closeBtn.onclick = () => modal.style.display = 'none';
            modal.onclick = (e) => {
                if (e.target === modal) modal.style.display = 'none';
            };

            modal.style.display = 'block';
        });
    }

    showFullscreen(index) {
        this.currentImageIndex = index;
        
        let viewer = document.getElementById('imageViewer');
        if (!viewer) {
            viewer = document.createElement('div');
            viewer.id = 'imageViewer';
            viewer.className = 'fullscreen-viewer';
            document.body.appendChild(viewer);
        }

        viewer.innerHTML = `
            <div class="viewer-content">
                <span class="close-viewer">&times;</span>
                <div class="image-container">
                    <img src="${this.currentImages[index]}" alt="Full size image">
                </div>
                <div class="viewer-controls">
                    <div class="image-counter">${index + 1} / ${this.currentImages.length}</div>
                    <button class="play-btn">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        const closeBtn = viewer.querySelector('.close-viewer');
        const imgContainer = viewer.querySelector('.image-container');
        const playBtn = viewer.querySelector('.play-btn');

        closeBtn.onclick = () => {
            this.stopSlideshow();
            viewer.style.display = 'none';
        };

        imgContainer.onclick = () => {
            if (this.isPlaying) {
                this.stopSlideshow();
            } else {
                this.navigateImage(1);
            }
        };

        playBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleSlideshow();
        };

        // 添加键盘事件
        document.addEventListener('keydown', this.handleKeyPress.bind(this));

        viewer.style.display = 'block';
        // 自动开始播放
        this.startSlideshow();
    }

    startSlideshow() {
        this.isPlaying = true;
        this.updatePlayButton();
        this.slideInterval = setInterval(() => {
            const nextIndex = (this.currentImageIndex + 1) % this.currentImages.length;
            this.navigateImage(1, true);
        }, this.slideDelay);
    }

    stopSlideshow() {
        this.isPlaying = false;
        this.updatePlayButton();
        if (this.slideInterval) {
            clearInterval(this.slideInterval);
            this.slideInterval = null;
        }
    }

    toggleSlideshow() {
        if (this.isPlaying) {
            this.stopSlideshow();
        } else {
            this.startSlideshow();
        }
    }

    updatePlayButton() {
        const playBtn = document.querySelector('.play-btn');
        if (playBtn) {
            playBtn.innerHTML = this.isPlaying ? `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
            ` : `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M8 5v14l11-7z"/>
                </svg>
            `;
        }
    }

    navigateImage(direction, loop = false) {
        let newIndex = this.currentImageIndex + direction;
        if (loop) {
            newIndex = newIndex % this.currentImages.length;
            if (newIndex < 0) newIndex = this.currentImages.length - 1;
        } else if (newIndex < 0 || newIndex >= this.currentImages.length) {
            return;
        }

        this.currentImageIndex = newIndex;
        const viewer = document.getElementById('imageViewer');
        const img = viewer.querySelector('img');
        const counter = viewer.querySelector('.image-counter');
        
        img.src = this.currentImages[newIndex];
        counter.textContent = `${newIndex + 1} / ${this.currentImages.length}`;
    }

    handleKeyPress(e) {
        const viewer = document.getElementById('imageViewer');
        if (viewer && viewer.style.display === 'block') {
            switch(e.key) {
                case 'ArrowLeft':
                    this.stopSlideshow();
                    this.navigateImage(-1);
                    break;
                case 'ArrowRight':
                case ' ':
                    if (this.isPlaying) {
                        this.stopSlideshow();
                    } else {
                        this.navigateImage(1);
                    }
                    break;
                case 'Escape':
                    this.stopSlideshow();
                    viewer.style.display = 'none';
                    break;
            }
        }
    }

    // 加载相册图片
    async loadAlbumImages(album) {
        try {
            const response = await fetch(`${this.apiBase}/${this.currentCategory}/${album.id}`, {
                headers: this.headers
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            // 过滤出所有图片文件
            return data
                .filter(file => file.name.match(/\d+\.jpg$/))
                .sort((a, b) => {
                    const numA = parseInt(a.name);
                    const numB = parseInt(b.name);
                    return numA - numB;
                })
                .map(file => `${this.rawBase}/${this.currentCategory}/${album.id}/${file.name}`);
        } catch (error) {
            console.error('Error loading album images:', error);
            return [];
        }
    }

    decodeText(text) {
        try {
            // 尝试多种解码方式
            return decodeURIComponent(escape(text));
        } catch (e) {
            try {
                return decodeURIComponent(text);
            } catch (e2) {
                return text;
            }
        }
    }
}

// 初始化画廊
new Gallery(); 