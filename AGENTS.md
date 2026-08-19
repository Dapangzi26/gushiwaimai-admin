# 固始县外卖总后台 · AI 协作规则

> 本文件是本仓库的**实施真源**（改代码铁律）。
>
> **接手阅读顺序**
> 1. `E:\work-wiki\00-项目总览\`（先读 **AI协作总计划书** → 看板 → 架构红线）
> 2. 本仓库 **`docs/端内代码结构详细计划书.md`**
> 3. **本文**
> 4. 后端 admin 接口 → `E:\work-wiki\40-后端\接口清单.md`

---

## 1. 项目定位

- **技术栈**：Vue 3 + Vite + Element Plus + Pinia。
- **端口**：5190（`vite.config.js`，`strictPort: true`）。
- **通信**：只连后端 `E:\固始县外卖后端` 的 `/admin/*`；不与其他端直连。

---

## 2. 请求与鉴权

| 项 | 位置 |
|---|---|
| API 基址 | `.env.development` → `VITE_API_BASE_URL` |
| 统一请求 | `src/utils/request.js` |
| 登录态 | `localStorage` → `gushi-admin-auth` |

- 后端成功响应 `code === 200`；列表在 `data.list`。

---

## 3. 目录约定

| 目录 | 职责 |
|---|---|
| `src/views/` | 业务页面 |
| `src/api/` | 按模块封装 `/admin` 接口 |
| `src/router/` | 路由 |
| `src/utils/` | request、auth、socket（仅运营提醒） |

---

## 4. 全局红线

1. 业务规则以后端 + work-wiki 契约为准，不在前端自编判责/分账逻辑。
2. 只改任务明确要求改的文件；不顺手重构无关代码。
3. 不确定的地方必须问，不许猜着改。

---

> 更新记录：2026-07-23 首版（配合 docs/端内代码结构详细计划书.md）。
