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
//# sourceMappingURL=index.js.map