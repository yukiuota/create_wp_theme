// 変換ルールの型定義
interface ConversionRule {
  pattern: RegExp;
  replace: string;
}

function convert(): void {
  const inputElement = document.getElementById("inputHtml") as HTMLTextAreaElement;
  const outputElement = document.getElementById("outputPhp") as HTMLTextAreaElement;

  if (!inputElement || !outputElement) {
    console.error("必要な要素が見つかりません");
    return;
  }

  let html: string = inputElement.value;

  // 変換ルール
  const rules: ConversionRule[] = [
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
  rules.forEach((rule: ConversionRule) => {
    html = html.replace(rule.pattern, rule.replace);
  });

  // srcset属性の特別な処理
  html = convertSrcset(html);

  // 出力
  outputElement.value = html;
}

// srcset属性を変換する関数
function convertSrcset(html: string): string {
  return html.replace(/srcset="([^"]+)"/g, (match: string, srcsetValue: string): string => {
    // srcsetの値をカンマで分割し、各エントリを処理
    const entries = srcsetValue.split(",").map((entry: string) => {
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

// グローバルスコープに関数を公開（HTMLから呼び出すため）
(window as any).convert = convert;
