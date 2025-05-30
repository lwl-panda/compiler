const DEFAULT_CONTENT = {
    html: '<!-- 2025-05-18 -->\n<h1>Hello World</h1>',
    css: 'body { background: #fff !important; color: #000 }',
    js: 'console.log("Init at 2025-05-18")'
};

const DEFAULT_AUTO_CONTENT = {
    html: '<!-- 这里输入自动输入的HTML代码 -->\n<div id="auto-div">自动生成的HTML内容</div>',
    css: '/* 这里输入自动输入的CSS代码 */\n#auto-div { color: red; font-size: 24px; }',
    js: '// 这里输入自动输入的JavaScript代码\nconsole.log("自动执行的JS代码");\ndocument.getElementById("auto-div").addEventListener("click", () => alert("点击事件!"));'
};

let editor, currentType = 'html';
let autoEditor, autoCurrentType = 'auto-html';

// 初始化 Monaco 编辑器和页面布局
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});
require(['vs/editor/editor.main'], function() {
    // 创建左右分栏布局
    Split(['#preview', '#container'], {
        direction: 'horizontal',
        sizes: [50, 50],
        gutterSize: 8,
        cursor: 'col-resize'
    });

    // 初始化主代码编辑器
    editor = monaco.editor.create(document.getElementById('container'), {
        value: localStorage.getItem('html') || DEFAULT_CONTENT.html,
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        autoIndent: true,
        formatOnPaste: false,
        formatOnType: false
    });

    // 初始化自动代码编辑器
    autoEditor = monaco.editor.create(document.getElementById('auto-code-container'), {
        value: localStorage.getItem('auto-html') || DEFAULT_AUTO_CONTENT.html,
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false
    });

    // 绑定编辑器内容变化事件
    editor.getModel().onDidChangeContent(handleEditorChange);
    
    // 初始化各种交互功能
    initTabs();
    initAutoCodeTabs();
    initModal();
    updatePreview();

    // 新增：4秒定时刷新
    //setInterval(updatePreview, 10000);
});

// 初始化代码类型标签页
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active')) return;

            // 移除旧模型的监听
            const oldModel = editor.getModel();
            oldModel?.onDidChangeContent(handleEditorChange);

            // 保存当前内容并切换标签
            localStorage.setItem(currentType, editor.getValue());
            currentType = tab.dataset.type;
            const newContent = localStorage.getItem(currentType) || DEFAULT_CONTENT[currentType];
            const newModel = monaco.editor.createModel(
                newContent,
                currentType === 'js' ? 'javascript' : currentType
            );

            // 设置新模型并绑定监听
            editor.setModel(newModel);
            newModel.onDidChangeContent(handleEditorChange);

            // 更新标签状态
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 立即更新预览
            updatePreview();
        });
    });
}

// 初始化自动代码标签页
function initAutoCodeTabs() {
    document.querySelectorAll('.auto-code-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active')) return;

            localStorage.setItem(autoCurrentType, autoEditor.getValue());

            autoCurrentType = tab.dataset.type;
            const type = autoCurrentType.replace('auto-', '');
            const newContent = localStorage.getItem(autoCurrentType) || DEFAULT_AUTO_CONTENT[type];
            const newModel = monaco.editor.createModel(
                newContent,
                type === 'js' ? 'javascript' : type
            );

            autoEditor.setModel(newModel);
            document.querySelectorAll('.auto-code-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

// 初始化设置模态框
function initModal() {
    const modal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.querySelector('.close-btn');
    const executeBtn = document.getElementById('execute-btn');
    
    // 打开设置模态框
    settingsBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });
    
    // 关闭设置模态框
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // 执行自动代码
    executeBtn.addEventListener('click', executeAutoCode);
}

// 执行自动代码
function executeAutoCode() {
    const speed = parseInt(document.getElementById('typing-speed').value) || 50;
    const delay = parseInt(document.getElementById('typing-delay').value) || 1000;
    
    // 保存自动代码内容
    localStorage.setItem(autoCurrentType, autoEditor.getValue());
    
    // 切换到对应的主编辑器标签
    const type = autoCurrentType.replace('auto-', '');
    document.querySelector(`.tab[data-type="${type}"]`).click();
    
    // 清空当前编辑器内容（确保在模型切换后执行）
    setTimeout(() => {
        editor.setValue('');
        localStorage.setItem(type, ''); // 清空本地存储
        updatePreview(); // 立即更新预览
    }, 0);
    
    // 获取自动代码内容并执行
    const content = autoEditor.getValue();
    setTimeout(() => {
        typeText(content, speed);
    }, delay);
    
    // 关闭模态框
    document.getElementById('settings-modal').style.display = 'none';
}

// 自动输入文本效果
function typeText(text, speed) {
    let i = 0;
    const model = editor.getModel();
    const types = ['html', 'css', 'js'];
    const currentIndex = types.indexOf(currentType);

    // 强制清空内容（双重保障）
    editor.setValue('');
    model.setValue('');

    function type() {
        if (i < text.length) {
            const position = editor.getPosition();
            const range = {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            };

            model.applyEdits([{
                range: range,
                text: text.charAt(i),
                forceMoveMarkers: true
            }]);

            const newPosition = {
                lineNumber: position.lineNumber,
                column: position.column + 1
            };

            if (text.charAt(i) === '\n') {
                newPosition.lineNumber = position.lineNumber + 1;
                newPosition.column = 1;
            }

            editor.setPosition(newPosition);
            editor.revealPositionInCenter(newPosition);

            i++;
            setTimeout(type, speed);
        } else {
            // 输入完成后保存内容并更新预览
            localStorage.setItem(currentType, editor.getValue());
            updatePreview();

            // 自动切换到下一个类型
            if (currentIndex < types.length - 1) {
                currentType = types[currentIndex + 1];
                const newContent = localStorage.getItem(currentType) || DEFAULT_CONTENT[currentType];
                const newModel = monaco.editor.createModel(
                    newContent,
                    currentType === 'js' ? 'javascript' : currentType
                );
                
                // 设置新模型并绑定监听
                editor.setModel(newModel);
                newModel.onDidChangeContent(handleEditorChange);
                
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelector(`.tab[data-type="${currentType}"]`).classList.add('active');

                // 获取下一个类型的自动代码内容
                const nextAutoType = `auto-${currentType}`;
                const nextContent = localStorage.getItem(nextAutoType) || DEFAULT_AUTO_CONTENT[currentType];
                
                // 清空下一个编辑器内容
                setTimeout(() => {
                    editor.setValue('');
                    localStorage.setItem(currentType, '');
                    typeText(nextContent, speed);
                }, 0);
            }
        }
    }

    type();
}

// 更新预览iframe
function updatePreview() {
    const html = `
        <!DOCTYPE html>
        <style>${localStorage.getItem('css') || DEFAULT_CONTENT.css}</style>
        ${localStorage.getItem('html') || DEFAULT_CONTENT.html}
        <script>try{${localStorage.getItem('js') || DEFAULT_CONTENT.js}}catch(e){console.error(e)}<\/script>
    `;
    document.getElementById('preview').srcdoc = html;
}

// 处理编辑器内容变化
function handleEditorChange() {
    localStorage.setItem(currentType, editor.getValue());
    updatePreview();
}

// 窗口大小变化时重新布局编辑器
window.addEventListener('resize', () => {
    editor.layout();
    if (autoEditor) autoEditor.layout();
});
