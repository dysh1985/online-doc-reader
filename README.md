# Online Doc Reader

简易在线文档阅读器（支持 PDF/TXT/DOCX/XLSX 上传与预览），后端：Express + Sequelize（SQLite 本地，支持 PostgreSQL via `DATABASE_URL`）。

快速开始（本地）

1. 安装依赖

```bash
cd D:/AI_VS_Practice/Online_Doc_Reader
npm install
```

2. 创建 `.env` 文件（或使用 `.env.example`）并设置 `JWT_SECRET`、`ADMIN_CODE`（可选）

3. 启动

```bash
npm run dev
```

前端访问：`http://localhost:3000/`

部署到 Render（简要步骤）

1. 在 GitHub 创建仓库并 push 代码（参考下方“推送到 GitHub”）。
2. 登录 Render，创建一个新的 Web Service，连接到你的 GitHub 仓库。
3. Build Command: `npm install`
   Start Command: `npm start`
4. 在 Render 的环境变量里设置 `JWT_SECRET` 和 `ADMIN_CODE`，如果使用 Postgres，设置 `DATABASE_URL`。

部署到腾讯云 CloudBase（静态托管）

1. CloudBase 静态托管要求项目根目录包含 `npm run build`，并生成静态目录 `dist/`。
2. 本项目已新增 `build.js`，运行 `npm run build` 会将 `public/` 中的静态页面复制到 `dist/`。
3. 如果你希望使用 CloudBase 静态托管，请在 GitHub 仓库中配置以下 Secrets：
   - `TCB_SECRET_ID`
   - `TCB_SECRET_KEY`
   - `TCB_ENV_ID`
4. 已添加 GitHub Actions 工作流文件 `.github/workflows/deploy.yml`，当你 push 到 `main` 分支时，会自动构建并部署 `dist/`。

> 注意：当前项目本地版本包含 Node.js 后端（Express、文件上传、登录逻辑），而 CloudBase 静态托管只能部署前端静态页面。如果你要部署完整的功能，需要额外将后端迁移到 CloudBase 云函数或使用腾讯云服务器/容器。

推送到 GitHub（示例）

```bash
cd D:/AI_VS_Practice/Online_Doc_Reader
git init
git add .
git commit -m "init online doc reader"
git branch -M main
git remote add origin https://github.com/dysh1985/online-doc-reader.git
git push -u origin main
```

注意事项
- Render 环境默认没有 LibreOffice，若需服务器端转换复杂格式请使用无外部依赖的库（已在项目中使用 `mammoth` 和 `xlsx`）。
- 生产请使用 Postgres（设置 `DATABASE_URL`）并使用 HTTPS/强密码策略。
- 文件存储：本示例使用本地 `uploads` 文件夹，生产建议使用 S3 或云存储，并在数据库里保存外部 URL。
