"use strict";
// タブ切り替え関数
function switchTab(tabName) {
    // すべてのタブコンテンツを非表示
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach((content) => {
        content.classList.remove('active');
    });
    // すべてのタブボタンを非アクティブ化
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach((button) => {
        button.classList.remove('active');
    });
    // 選択されたタブを表示
    if (tabName === 'theme') {
        document.getElementById('themeTab')?.classList.add('active');
        tabButtons[0]?.classList.add('active');
    }
    else if (tabName === 'page') {
        document.getElementById('pageTab')?.classList.add('active');
        tabButtons[1]?.classList.add('active');
    }
    else if (tabName === 'batch') {
        document.getElementById('batchTab')?.classList.add('active');
        tabButtons[2]?.classList.add('active');
    }
}
// テーマファイル変換関数
function convert() {
    const inputElement = document.getElementById("inputHtml");
    const outputElement = document.getElementById("outputPhp");
    if (!inputElement || !outputElement) {
        console.error("必要な要素が見つかりません");
        return;
    }
    let html = inputElement.value;
    // 変換ルール
    const rules = [
        // タイトル
        {
            pattern: /<title>.*?<\/title>/,
            replace: "<title><?php wp_title('|', true, 'right'); bloginfo('name'); ?></title>",
        },
        // head終了直前に wp_head()
        { pattern: /<\/head>/, replace: "<?php wp_head(); ?>\n</head>" },
        // body終了直前に wp_footer()
        { pattern: /<\/body>/, replace: "<?php wp_footer(); ?>\n</body>" },
        // charset置換（HTMLのcharsetをWP関数に）
        { pattern: /<meta charset=".*?">/, replace: "<meta charset=\"<?php bloginfo('charset'); ?>\">" },
        // リンク変換：空のhref
        { pattern: /href=""/g, replace: "href=\"<?php echo esc_url( home_url( '' ) ); ?>\"" },
        // リンク変換：ルートパス
        { pattern: /href="\/"(?=[^\/]|$)/g, replace: "href=\"<?php echo esc_url( home_url( '/' ) ); ?>\"" },
        // リンク変換：相対パス（/で始まるパス）
        { pattern: /href="(\/[^"]*?)"/g, replace: "href=\"<?php echo esc_url( home_url( '$1' ) ); ?>\"" },
        // 画像・アセット変換：空のsrc
        { pattern: /src=""/g, replace: "src=\"<?php echo esc_url( get_template_directory_uri() . '/' ); ?>\"" },
        // 画像・アセット変換：相対パス（相対パス）
        {
            pattern: /src="(?!https?:\/\/|\/\/|#|javascript:|mailto:)([^"]+)"/g,
            replace: "src=\"<?php echo esc_url( get_template_directory_uri() . '/$1' ); ?>\"",
        },
    ];
    // 基本的な変換ルールを適用
    rules.forEach((rule) => {
        html = html.replace(rule.pattern, rule.replace);
    });
    // srcset属性の特別な処理
    html = convertSrcset(html);
    // 出力
    outputElement.value = html;
}
// srcset属性を変換する関数
function convertSrcset(html) {
    return html.replace(/srcset="([^"]+)"/g, (match, srcsetValue) => {
        // srcsetの値をカンマで分割し、各エントリを処理
        const entries = srcsetValue.split(",").map((entry) => {
            const trimmedEntry = entry.trim();
            // 各エントリから画像パスと記述子（1x, 2x など）を分離
            const parts = trimmedEntry.split(/\s+/);
            if (parts.length >= 1) {
                const imagePath = parts[0];
                const descriptor = parts.slice(1).join(" ");
                // 相対パスかどうかをチェック（絶対URLは変換しない）
                if (!imagePath.match(/^https?:\/\/|^\/\/|^#|^javascript:|^mailto:/)) {
                    const convertedPath = `<?php echo esc_url( get_template_directory_uri() . '/${imagePath}' ); ?>`;
                    return descriptor ? `${convertedPath} ${descriptor}` : convertedPath;
                }
            }
            return trimmedEntry;
        });
        return `srcset="${entries.join(", ")}"`;
    });
}
// 固定ページ用HTML変換関数
function convertForPage() {
    const inputElement = document.getElementById("inputPageHtml");
    const outputElement = document.getElementById("outputPageHtml");
    const protocolSelect = document.getElementById("protocolSelect");
    const domainInput = document.getElementById("domainInput");
    const yearInput = document.getElementById("yearInput");
    const monthInput = document.getElementById("monthInput");
    if (!inputElement || !outputElement || !protocolSelect || !domainInput || !yearInput || !monthInput) {
        console.error("必要な要素が見つかりません");
        return;
    }
    const protocol = protocolSelect.value;
    const domain = domainInput.value.trim();
    const year = yearInput.value.trim();
    const month = monthInput.value.trim().padStart(2, '0'); // 月を2桁にする
    if (!domain) {
        alert("ドメインを入力してください");
        return;
    }
    if (!year || !month) {
        alert("年と月を入力してください");
        return;
    }
    let html = inputElement.value;
    // imgタグのsrc属性を変換
    // 相対パスの画像を絶対パスに変換（wp-content/uploads/年/月/ファイル名）
    html = html.replace(/<img([^>]*?)src="([^"]*?)"([^>]*?)>/gi, (match, before, src, after) => {
        // すでに絶対パス（http:// または https:// で始まる）の場合はスキップ
        if (src.match(/^https?:\/\//)) {
            return match;
        }
        // ファイル名のみを抽出（パスが含まれている場合は最後の部分のみ）
        const fileName = src.split('/').pop() || src;
        // 新しいsrc属性を構築
        const newSrc = `${protocol}${domain}/wp-content/uploads/${year}/${month}/${fileName}`;
        return `<img${before}src="${newSrc}"${after}>`;
    });
    // srcset属性も変換
    html = html.replace(/srcset="([^"]+)"/gi, (match, srcsetValue) => {
        const entries = srcsetValue.split(",").map((entry) => {
            const trimmedEntry = entry.trim();
            const parts = trimmedEntry.split(/\s+/);
            if (parts.length >= 1) {
                let imagePath = parts[0];
                const descriptor = parts.slice(1).join(" ");
                // 絶対パスでない場合のみ変換
                if (!imagePath.match(/^https?:\/\//)) {
                    const fileName = imagePath.split('/').pop() || imagePath;
                    imagePath = `${protocol}${domain}/wp-content/uploads/${year}/${month}/${fileName}`;
                }
                return descriptor ? `${imagePath} ${descriptor}` : imagePath;
            }
            return trimmedEntry;
        });
        return `srcset="${entries.join(", ")}"`;
    });
    // 出力
    outputElement.value = html;
}
// グローバルスコープに関数を公開（HTMLから呼び出すため）
window.convert = convert;
window.convertForPage = convertForPage;
window.switchTab = switchTab;
// 一括変換用のファイル管理
let selectedFiles = [];
// ファイル選択イベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('batchFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
});
// ファイル選択ハンドラー
function handleFileSelect(event) {
    const input = event.target;
    if (input.files) {
        selectedFiles = Array.from(input.files);
        updateFileList();
    }
}
// ファイルリスト表示を更新
function updateFileList() {
    const fileListElement = document.getElementById('fileList');
    const convertBtn = document.getElementById('convertBatchBtn');
    if (!fileListElement || !convertBtn)
        return;
    if (selectedFiles.length === 0) {
        fileListElement.innerHTML = '<p style="color: #999; text-align: center;">選択されたファイルはありません</p>';
        convertBtn.disabled = true;
        return;
    }
    convertBtn.disabled = false;
    fileListElement.innerHTML = selectedFiles
        .map((file, index) => `
      <div class="file-item">
        <span class="file-item-name">${file.name}</span>
        <button class="file-item-remove" onclick="removeFile(${index})">削除</button>
      </div>
    `)
        .join('');
}
// ファイルを削除
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    // input要素もリセット
    const fileInput = document.getElementById('batchFileInput');
    if (fileInput) {
        fileInput.value = '';
    }
}
// HTMLファイルをPHPに変換（既存のconvert関数のロジックを再利用）
function convertHtmlToPhp(htmlContent) {
    let html = htmlContent;
    // 変換ルール（convert関数と同じ）
    const rules = [
        {
            pattern: /<title>.*?<\/title>/,
            replace: "<title><?php wp_title('|', true, 'right'); bloginfo('name'); ?></title>",
        },
        { pattern: /<\/head>/, replace: "<?php wp_head(); ?>\n</head>" },
        { pattern: /<\/body>/, replace: "<?php wp_footer(); ?>\n</body>" },
        { pattern: /<meta charset=".*?">/, replace: "<meta charset=\"<?php bloginfo('charset'); ?>\">" },
        { pattern: /href=""/g, replace: "href=\"<?php echo esc_url( home_url( '' ) ); ?>\"" },
        { pattern: /href="\/"(?=[^\/]|$)/g, replace: "href=\"<?php echo esc_url( home_url( '/' ) ); ?>\"" },
        { pattern: /href="(\/[^"]*?)"/g, replace: "href=\"<?php echo esc_url( home_url( '$1' ) ); ?>\"" },
        { pattern: /src=""/g, replace: "src=\"<?php echo esc_url( get_template_directory_uri() . '/' ); ?>\"" },
        {
            pattern: /src="(?!https?:\/\/|\/\/|#|javascript:|mailto:)([^"]+)"/g,
            replace: "src=\"<?php echo esc_url( get_template_directory_uri() . '/$1' ); ?>\"",
        },
    ];
    rules.forEach((rule) => {
        html = html.replace(rule.pattern, rule.replace);
    });
    html = convertSrcset(html);
    return html;
}
// 一括変換してZipダウンロード
async function convertBatch() {
    if (selectedFiles.length === 0) {
        alert('ファイルを選択してください');
        return;
    }
    const progressElement = document.getElementById('batchProgress');
    const progressText = document.getElementById('progressText');
    const convertBtn = document.getElementById('convertBatchBtn');
    if (!progressElement || !progressText)
        return;
    // 進捗表示
    progressElement.style.display = 'block';
    convertBtn.disabled = true;
    try {
        // JSZipインスタンスを作成
        const zip = new window.JSZip();
        // 各ファイルを読み込んで変換
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            progressText.textContent = `変換中: ${file.name} (${i + 1}/${selectedFiles.length})`;
            // ファイル内容を読み込み
            const content = await readFileAsText(file);
            // HTMLをPHPに変換
            const convertedContent = convertHtmlToPhp(content);
            // ファイル名を.phpに変更
            const phpFileName = file.name.replace(/\.(html|htm)$/i, '.php');
            // Zipに追加
            zip.file(phpFileName, convertedContent);
        }
        progressText.textContent = 'Zipファイルを生成中...';
        // Zipファイルを生成
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        // ダウンロード
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wordpress_theme_${new Date().getTime()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        progressText.textContent = `完了！ ${selectedFiles.length}個のファイルを変換しました`;
        setTimeout(() => {
            progressElement.style.display = 'none';
            convertBtn.disabled = false;
        }, 2000);
    }
    catch (error) {
        console.error('変換エラー:', error);
        progressText.textContent = `エラーが発生しました: ${error}`;
        convertBtn.disabled = false;
    }
}
// ファイルをテキストとして読み込むヘルパー関数
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                resolve(e.target.result);
            }
            else {
                reject(new Error('ファイルの読み込みに失敗しました'));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file, 'UTF-8');
    });
}
// グローバルスコープに新しい関数を公開
window.convertBatch = convertBatch;
window.removeFile = removeFile;
//# sourceMappingURL=index.js.map