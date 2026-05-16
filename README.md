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

部署到腾讯云 CloudBase（静态托管 + 云函数）

1. 这个项目已改造为“前端静态页面 + CloudBase 云函数后端”的方案：
   - 前端静态资源位于 `public/`，会构建到 `dist/`。
   - 后端云函数代码位于 `functions/api/`，实现注册、登录、文件上传、文件列表、预览和删除。
2. 运行 `npm run build` 会将静态页面复制到 `dist/`，支持 CloudBase 静态托管的部署要求。
3. GitHub Actions 工作流 `.github/workflows/deploy.yml` 已配置：
   - 安装依赖
   - 构建静态页面
   - 安装云函数依赖
   - 部署 `functions/api` 云函数
   - 部署静态页面到 CloudBase Hosting
4. 在 GitHub 仓库中配置以下 Secrets：
   - `TCB_SECRET_ID`
   - `TCB_SECRET_KEY`
   - `TCB_ENV_ID`
5. 本地运行方式：
   - 如需继续测试本地后端，可使用本地 Express 服务：`npm run dev`
   - 若要试用 CloudBase 后端，请将 `public/config.js` 中的 `window.API_BASE` 指向 CloudBase 云函数 URL，例如：
     `window.API_BASE = 'https://<your-env>.service.tcloudbase.com/api';`

> 说明：CloudBase 托管会部署前端静态页面，而完整的 API 后端由 `functions/api` 云函数提供。当前项目已支持完整 CloudBase 部署方案。
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
