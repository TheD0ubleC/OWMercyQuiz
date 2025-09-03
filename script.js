// DOM元素
const themeToggle = document.getElementById('themeToggle');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const searchInput = document.getElementById('searchInput');
const questionList = document.getElementById('questionList');
const resultCount = document.getElementById('resultCount');

// 模态框元素
const renameModal = document.getElementById('renameModal');
const modalClose = document.getElementById('modalClose');
const renameInput = document.getElementById('renameInput');
const cancelRename = document.getElementById('cancelRename');
const confirmRename = document.getElementById('confirmRename');

// 删除模态框元素
const deleteModal = document.getElementById('deleteModal');
const deleteModalClose = document.getElementById('deleteModalClose');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');

// 当前状态
let currentTheme = 'light';
let files = JSON.parse(localStorage.getItem('files')) || [];
let currentFileId = null;
let currentRenameFileId = null;
let currentDeleteFileId = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 从localStorage加载主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    }

    // 渲染文件列表
    renderFileList();

    // 设置事件监听器
    setupEventListeners();

    // 初始禁用搜索框
    updateSearchInputState();
});

// 设置事件监听器
function setupEventListeners() {
    // 主题切换
    themeToggle.addEventListener('click', toggleTheme);

    // 文件上传
    fileInput.addEventListener('change', handleFileUpload);

    // 搜索输入
    searchInput.addEventListener('input', debounce(performSearch, 300));

    // 模态框事件
    modalClose.addEventListener('click', closeRenameModal);
    cancelRename.addEventListener('click', closeRenameModal);
    confirmRename.addEventListener('click', confirmRenameAction);

    // 删除模态框事件
    deleteModalClose.addEventListener('click', closeDeleteModal);
    cancelDelete.addEventListener('click', closeDeleteModal);
    confirmDelete.addEventListener('click', confirmDeleteAction);

    // 点击模态框背景关闭
    renameModal.addEventListener('click', (e) => {
        if (e.target === renameModal) {
            closeRenameModal();
        }
    });

    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (renameModal.classList.contains('show')) {
                closeRenameModal();
            }
            if (deleteModal.classList.contains('show')) {
                closeDeleteModal();
            }
        }
    });

    // 输入框回车确认
    renameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            confirmRenameAction();
        }
    });
}

// 切换主题
function toggleTheme() {
    if (currentTheme === 'light') {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
}

// 启用夜间模式
function enableDarkMode() {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i> 日间模式';
    currentTheme = 'dark';
    localStorage.setItem('theme', 'dark');
}

// 禁用夜间模式
function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i> 夜间模式';
    currentTheme = 'light';
    localStorage.setItem('theme', 'light');
}

// 更新搜索框状态
function updateSearchInputState() {
    if (currentFileId) {
        searchInput.disabled = false;
        searchInput.placeholder = "输入关键词搜索题目...";
    } else {
        searchInput.disabled = true;
        searchInput.placeholder = "请先选择文件...";
        searchInput.value = "";
    }
}

// 打开重命名模态框
function openRenameModal(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    currentRenameFileId = fileId;
    renameInput.value = file.name;
    renameModal.classList.add('show');
    document.body.classList.add('modal-open');

    // 聚焦输入框并选中文本
    setTimeout(() => {
        renameInput.focus();
        renameInput.select();
    }, 100);
}

// 关闭重命名模态框
function closeRenameModal() {
    renameModal.classList.remove('show');
    document.body.classList.remove('modal-open');
    currentRenameFileId = null;
}

// 打开删除确认模态框
function openDeleteModal(fileId) {
    currentDeleteFileId = fileId;
    deleteModal.classList.add('show');
    document.body.classList.add('modal-open');
}

// 关闭删除确认模态框
function closeDeleteModal() {
    deleteModal.classList.remove('show');
    document.body.classList.remove('modal-open');
    currentDeleteFileId = null;
}

// 确认重命名
function confirmRenameAction() {
    const newName = renameInput.value.trim();
    if (!newName) return;

    const file = files.find(f => f.id === currentRenameFileId);
    if (!file) return;

    file.name = newName;
    saveFiles();
    renderFileList();
    closeRenameModal();
}

// 确认删除
function confirmDeleteAction() {
    if (!currentDeleteFileId) return;

    files = files.filter(f => f.id !== currentDeleteFileId);
    if (currentFileId === currentDeleteFileId) {
        currentFileId = null;
    }
    saveFiles();
    renderFileList();
    updateSearchInputState();
    clearResults();
    closeDeleteModal();
}

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // 移除扩展名

        // 尝试从文件内容中提取模式名称
        let patternName = extractPatternName(content);
        const displayName = patternName || fileName;

        // 创建文件对象
        const fileObj = {
            id: Date.now().toString(),
            name: displayName,
            originalName: file.name,
            content: content,
            uploadedAt: new Date().toISOString()
        };

        // 添加到文件列表
        files.push(fileObj);
        saveFiles();
        renderFileList();

        // 自动选择新上传的文件
        selectFile(fileObj.id);
    };
    reader.readAsText(file);

    // 重置文件输入，允许再次选择相同文件
    event.target.value = '';
}

// 从文件内容提取模式名称
function extractPatternName(content) {
    const firstTenLines = content.split('\n').slice(0, 10).join('\n');
    const patternMatch = firstTenLines.match(/模式名称:\s*"([^"]+)"/);
    return patternMatch ? patternMatch[1] : null;
}

// 渲染文件列表
function renderFileList() {
    if (files.length === 0) {
        fileList.innerHTML = '<div class="no-results">暂无上传文件</div>';
        return;
    }

    fileList.innerHTML = files.map(file => `
        <div class="file-item ${currentFileId === file.id ? 'active' : ''}" data-id="${file.id}">
            <span class="file-name">${file.name}</span>
            <div class="file-actions">
                <button class="file-action-btn download-btn" data-id="${file.id}" title="下载文件">
                    <i class="fas fa-download"></i>
                </button>
                <button class="file-action-btn rename-btn" data-id="${file.id}" title="重命名">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="file-action-btn delete-btn" data-id="${file.id}" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // 添加文件操作事件监听器
    document.querySelectorAll('.file-item').forEach(item => {
        const id = item.dataset.id;
        item.addEventListener('click', () => selectFile(id));
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        const id = btn.dataset.id;
        btn.addEventListener('click', e => {
            e.stopPropagation();
            downloadFile(id);
        });
    });

    document.querySelectorAll('.rename-btn').forEach(btn => {
        const id = btn.dataset.id;
        btn.addEventListener('click', e => {
            e.stopPropagation();
            openRenameModal(id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        const id = btn.dataset.id;
        btn.addEventListener('click', e => {
            e.stopPropagation();
            openDeleteModal(id);
        });
    });
}

// 选择文件
function selectFile(id) {
    currentFileId = id;
    renderFileList();
    updateSearchInputState();
    performSearch();
}

// 重命名文件 - 现在使用模态框
function renameFile(id) {
    openRenameModal(id);
}

// 删除文件 - 现在使用模态框
function deleteFile(id) {
    openDeleteModal(id);
}

// 下载文件
function downloadFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // 创建下载链接
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName || `${file.name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// 下载当前选中的文件
function downloadCurrentFile() {
    if (!currentFileId) return;
    downloadFile(currentFileId);
}

// 保存文件到localStorage
function saveFiles() {
    localStorage.setItem('files', JSON.stringify(files));
}

// 执行搜索
function performSearch() {
    if (!currentFileId) {
        clearResults();
        return;
    }

    const keyword = searchInput.value.trim();
    if (!keyword) {
        clearResults();
        resultCount.textContent = '0 个结果';
        return;
    }

    const file = files.find(f => f.id === currentFileId);
    if (!file) return;

    // 解析文件内容，提取所有问题和答案
    const questions = parseQuestions(file.content);

    // 过滤与关键词相关的问题
    const filteredQuestions = questions.filter(q =>
        q.question.toLowerCase().includes(keyword.toLowerCase())
    );

    // 显示结果
    displayResults(filteredQuestions);

    // 更新结果计数
    resultCount.textContent = `${filteredQuestions.length} 个结果`;
}

// 解析文件内容，提取所有问题和答案
function parseQuestions(content) {
    const questions = [];
    const lines = content.split('\n');

    let currentQuestion = null;
    let options = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 匹配问题行: 全局.quize[0] = 自定义字符串("问题内容");
        const questionMatch = line.match(/全局\.quize\[0\]\s*=\s*自定义字符串\("([^"]+)"\)/);
        if (questionMatch) {
            // 如果已经有收集的问题，先保存
            if (currentQuestion && options.length >= 4) {
                questions.push({
                    question: currentQuestion,
                    options: [...options]
                });
            }

            // 开始新问题
            currentQuestion = questionMatch[1];
            options = [];
            continue;
        }

        // 匹配选项行: 全局.quize[1-4] = 自定义字符串("选项内容");
        const optionMatch = line.match(/全局\.quize\[([1-4])\]\s*=\s*自定义字符串\("([^"]+)"\)/);
        if (optionMatch && currentQuestion) {
            const index = parseInt(optionMatch[1]) - 1;
            options[index] = optionMatch[2];
            continue;
        }

        // 匹配答案行: 全局.quize[5] = 数字;
        const answerMatch = line.match(/全局\.quize\[5\]\s*=\s*(\d+)/);
        if (answerMatch && currentQuestion && options.length >= 4) {
            const answerIndex = parseInt(answerMatch[1]) - 1;

            // 确保答案索引有效
            if (answerIndex >= 0 && answerIndex < 4 && options[answerIndex]) {
                questions.push({
                    question: currentQuestion,
                    options: [...options],
                    answer: options[answerIndex],
                    answerIndex: answerIndex
                });
            }

            // 重置当前问题
            currentQuestion = null;
            options = [];
        }
    }

    return questions;
}

// 显示搜索结果
function displayResults(questions) {
    if (questions.length === 0) {
        questionList.innerHTML = '<div class="no-results">未找到相关问题</div>';
        return;
    }

    questionList.innerHTML = questions.map(q => `
        <div class="result-item">
            <div class="question-text">${q.question}</div>
            <div class="options-grid">
                ${q.options.map((opt, i) => `
                    <div class="option-item ${i === q.answerIndex ? 'option-correct' : 'option-incorrect'}">
                        <span class="option-number">${i + 1}</span>
                        <span class="option-text">${opt}</span>
                        ${i === q.answerIndex ? '<span class="correct-mark">✓</span>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// 清除搜索结果
function clearResults() {
    if (!currentFileId) {
        questionList.innerHTML = '<div class="no-results">请先上传并选择文件</div>';
    } else if (!searchInput.value.trim()) {
        questionList.innerHTML = '<div class="no-results">请输入关键词搜索</div>';
    } else {
        questionList.innerHTML = '<div class="no-results">未找到相关问题</div>';
    }
    resultCount.textContent = '0 个结果';
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}