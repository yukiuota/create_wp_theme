# WordPress Theme Converter

静的 HTML から WordPress テーマファイルに変換するウェブツールです。
HTML ファイルを WordPress 用の PHP ファイルに自動変換します。

## 機能

- **HTML タグの自動変換**: HTML の基本要素を WordPress 関数に変換
- **リンクの変換**: 相対パスや絶対パスを`home_url()`を使用した WordPress 形式に変換
- **画像・アセットの変換**: `src`属性を`get_template_directory_uri()`を使用した形式に変換
- **Retina 対応**: `srcset`属性にも対応し、高解像度ディスプレイ用の画像パスも正しく変換

## 変換ルール

### 基本変換

- `<title>` → `<?php wp_title('|', true, 'right'); bloginfo('name'); ?>`
- `</head>` → `<?php wp_head(); ?>\n</head>`
- `</body>` → `<?php wp_footer(); ?>\n</body>`
- `<meta charset="UTF-8">` → `<meta charset="<?php bloginfo('charset'); ?>">`

### リンク変換

- `href=""` → `href="<?php echo esc_url( home_url( '' ) ); ?>"`
- `href="/"` → `href="<?php echo esc_url( home_url( '/' ) ); ?>"`
- `href="/◯◯/"` → `href="<?php echo esc_url( home_url( '/◯◯/' ) ); ?>"`

### 画像・アセット変換

- `src="images/logo.png"` → `src="<?php echo esc_url( get_template_directory_uri() . '/images/logo.png' ); ?>"`
- Retina 対応の`srcset`属性も自動変換

### 変換対象外

以下の URL は変換されません：

- `http://`や`https://`で始まる絶対 URL
- `//`で始まるプロトコル相対 URL
- `#`で始まるアンカーリンク
- `javascript:`で始まる JavaScript リンク
- `mailto:`で始まるメールリンク

## セットアップ

### 必要な環境

- Node.js (v16 以上推奨)
- npm

### インストール

```bash
# 依存関係をインストール
npm install

# TypeScriptをコンパイル
npm run build
```

## 使用方法

1. `index.html`をブラウザで開く
2. 変換したい HTML コードを「HTML 入力」エリアに貼り付け
3. 「変換する」ボタンをクリック
4. 「変換結果」エリアから WordPress 用の PHP コードをコピー
5. `.php`ファイルとして保存して WordPress テーマで使用

### プロジェクト構成

```
create_wp_theme/
├── index.html              # メインのHTMLファイル
├── common/
│   ├── ts/
│   │   └── index.ts        # TypeScriptソースファイル
│   └── js/
│       ├── index.js        # コンパイル後のJavaScript
│       └── index.js.map    # ソースマップ
├── package.json            # npm設定
├── tsconfig.json          # TypeScript設定
└── README.md              # このファイル
```

## サポート

質問や問題がある場合は、[Issues](https://github.com/yukiuota/create_wp_theme/issues)で報告してください。

---
