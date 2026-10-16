# Natural Ink web

[English](README.md)

可独立部署到 GitHub Pages 的手写排版工具。支持中英文手写、Markdown／部分 LaTeX 公式、PDF 文本提取、紧凑分栏排版和矢量 PDF／SVG 下载。默认英文，支持中英文界面和明暗主题切换。

**这是独立前端项目：只需本目录内的文件，不需要外层 Python 项目、Python、uv 或后端。** 文件在浏览器本地处理，正文不会上传或自动保存。

## 本地运行

推荐 Node.js 24，也支持 Node.js 22.13+。在本目录（独立仓库的根目录）运行：

```sh
npm ci
npm run dev
```

检查与构建：

```sh
npm test
npm run format:check
npm run build
npm run preview
```

`npm run build` 生成 `dist/`，部署时应保留整个目录。字体轮廓已压缩打包在 `font-data/`，构建时由 Node 校验哈希并还原，无需 Python 或下载字体。安装 npm 依赖后，测试和构建可离线运行；`npm audit` 则需要网络。

## 只上传此目录到 GitHub

1. 创建新仓库，将 **`web/` 内的内容放在新仓库根目录**，不是再包一层 `web/`。务必包含隐藏的 `.github/` 和 `.gitignore`，以及 `font-data/`、`licenses/`、源码、测试、脚本、配置、`package-lock.json` 和许可文件。请使用 Git 提交推送；不建议通过网页逐个上传大量文件。
2. 不上传 `node_modules/`、`dist/`、`public/assets/`、`.test-build/` 等生成目录，它们已在本目录 `.gitignore` 中排除。字体压缩包 `font-data/*.json.gz` 必须提交。
3. 在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
4. 推送默认分支，或手动运行 **checks and Pages**。工作流使用 Node 24，自动安装依赖、扫描已知漏洞、测试、检查格式、构建并发布 `dist/`，无需 Python。
5. 打开工作流给出的站点地址，检查语言／主题、中文显示、PDF 文本导入和整份 PDF 下载。支持项目子路径，无需修改 Vite 的相对 base。

例如，新建一个空仓库后，在复制好的项目根目录执行（替换仓库地址）：

```sh
git init -b main
git add .
git commit -m "Initial web release"
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

`index.html` 中的 Source 链接默认指向原项目，可改为新仓库地址。尚未自动创建、推送或发布你的新仓库。

## 字体、体积与许可

中文轮廓解压后约 142 MB，整个静态站点约 170 MB，但浏览器只按需获取使用到的中文分片。源码中仅保存压缩后的可分发字体数据，每个压缩包均有 SHA-256 校验。它们是运行所需的许可资源，不是本机字体缓存。

英文使用 Caveat 及其受控字形变化；中文使用文楷／Klee One 衍生的 NaturalInkCJK，保留笔画结构并使用较小变化。代码为 MIT；字体保留 SIL OFL，不改为 MIT。请保留 `LICENSE`、`NOTICE.md`、`licenses/` 和 `THIRD_PARTY.md`。

## 功能边界

- PDF 导入提取已有文本层，导入前可审阅和编辑。扫描件、图片和轮廓文字需要 OCR，目前未实现 OCR。
- 不还原 PDF 图片、表格、原版式或公式的 LaTeX 结构。
- 导出的 PDF 是矢量轮廓，文本不可选择；请另外保留原始 Markdown／纯文本。
- LaTeX 仅支持公式子集，不是完整 TeX 编译器。
- 上限：12,000 源字符、20 页输出、20 MB／50 页导入 PDF。更长提取文本可在审阅区裁剪后导入。
- 本独立仓库不包含 Python PDF tracing 或 Goodnotes 导出。

详细语法、排版设置、数据来源及维护方式见 [英文说明](README.md)。
