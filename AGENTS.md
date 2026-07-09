# WorkflowAssist Project Guide

## Project Structure

```
WorkflowAssist/
├── src-jsx/              # 开发源码（模块化）
│   00-header.jsx         文件头 IIFE 包装
│   01-constants.jsx      常量（版本/标题/日志级别）
│   02-logger.jsx         日志模块
│   03-config-store.jsx   JSON 配置读写 + 预设扫描
│   04-ae-utils.jsx       AE 工具函数（合成/图层/嵌套）
│   05-workflow-engine.jsx 工作流执行引擎（核心逻辑）
│   05a-render-engine.jsx 渲染引擎（序列帧渲染+导入）
│   06-main-ui.jsx        主 ScriptUI 界面
│   07-bootstrap.jsx      入口 + NOUI 生成触发
├── config/               # 预设 JSON 源文件（开发用）
├── scripts/
│   build-jsx.ps1         构建脚本（拼接 JSX + 复制预设）
├── dist/
│   WorkflowAssist.jsx    生成的可运行脚本（不手动编辑）
│   WorkflowAssist/       运行时预设目录（自动同步）
├── AGENTS.md             本文件
```

## Development via Skills

This project follows a skill-driven development flow. Always load the relevant skill before starting work:

| Scenario | Skill to Load |
|----------|---------------|
| Modular refactor / splitting JSX modules | `jsx-modular-refactor` |
| CEP extension development (AE panels) | `cep-extension-dev` |
| CEP/JSX 开发标准与可复用资产 | `cep-playground` |
| Writing docs for AE scripts | `writing` |

Load a skill:
```
/load-skill jsx-modular-refactor
```

Skills provide domain-specific workflows, conventions, and bundled references that guide development decisions. Always load the appropriate skill when the task matches its purpose.

## Build

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-jsx.ps1
```

构建过程：
1. 按文件名数字顺序拼接 `src-jsx/*.jsx` → `dist/WorkflowAssist.jsx`
2. 将 `config/*` 全部文件复制到 `dist/WorkflowAssist/`（预设 JSON + 资源文件）

## Syntax Verification

```powershell
node -e "const fs=require('fs'); new Function(fs.readFileSync('dist/WorkflowAssist.jsx','utf8')); console.log('syntax ok')"
```

## Module Order (loaded in this order)

```
00-header.jsx → 01-constants.jsx → 02-logger.jsx → 03-config-store.jsx
→ 04-ae-utils.jsx → 05-workflow-engine.jsx → 05a-render-engine.jsx
→ 06-main-ui.jsx → 07-bootstrap.jsx
```

## Preset JSON Specification

### Step Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | 步骤显示名称（UI 按钮标签） |
| `rename` | string | no | 输出合成名（支持 `{baseName}` 模板变量）。有则完全覆盖 `baseName + suffix` |
| `suffix` | string | no | 追加到 baseName 后的后缀。与 `rename` 互斥，`rename` 优先 |
| `width` | number | yes | 合成宽度 |
| `height` | number | yes | 合成高度 |
| `frameRate` | number | yes | 帧率 |
| `duration` | number / `"custom"` | yes | 时长（秒）。`"custom"` 表示运行前弹窗输入 |
| `scaleMode` | string | yes | `"fit_width"` 自适应宽度 / `"custom"` 自定义百分比 |
| `scalePercent` | number | no | 自定义缩放百分比（`scaleMode: "custom"` 时必填） |
| `stagger` | object | no | 错层配置 `{ enabled, count }` |
| `render` | object | no | 渲染配置 `{ enabled, importBack }` |

### Naming Priority

```javascript
function resolveOutputName(baseName, step) {
    if (step.rename) {
        return String(step.rename).replace("{baseName}", baseName);
    }
    return baseName + (step.suffix || "");
}
```

Example scenarios (baseName = "全屏座驾a-独角兽"):

| rename | suffix | Result |
|--------|--------|--------|
| `"动画"` | — | `"动画"` |
| `"{baseName}_成品"` | — | `"全屏座驾a-独角兽_成品"` |
| — | `"_预览"` | `"全屏座驾a-独角兽_预览"` |
| — | `""` | `"全屏座驾a-独角兽"` |

### Existing Preset Examples

```jsonc
// 礼物.json — 使用 rename + custom 时长
{ "name": "动画", "rename": "动画", "duration": "custom", "scaleMode": "fit_width" }

// 头像框.json — 使用 suffix + 固定时长 + 错层
{ "name": "预览", "suffix": "_预览", "duration": 6, "scaleMode": "custom", "scalePercent": 150, "stagger": {"enabled": true, "count": 2} }
```

## Core Conventions

### Source Comp Is Read-Only
**源合成不可修改。** 工作流执行过程中，源合成对象保持原名、原属性不变。任何代码不得对 `sourceComp.name` 赋值。

### New Step Fields Go Through resolveOutputName
新增的命名相关字段必须在 `resolveOutputName()`（`05-workflow-engine.jsx`）中处理，且 UI 的 `buildStepHelpTip()`（`06-main-ui.jsx`）同步更新 tooltip 显示。

### Custom Duration Protocol
步骤 `duration: "custom"` 时，引擎在 `runSteps()` / `executeSingleStep()` 中调用 `prompt()` 弹窗。全工作流只弹一次，结果缓存给同次所有 custom 步骤。

### UI 交互约定
- 预设下拉切换（`presetDropdown.onChange`）必须刷新步骤预览和输出 UI
- 预设源文件存在 `config/`，构建时自动同步到 `dist/WorkflowAssist/`
- 不改动 `dist/WorkflowAssist.jsx` 本身

### Built-in Only — 禁止外部脚本调用
**所有功能必须内联在 src-jsx 模块中**，不得使用 `$.evalFile()` 或类似方式调用外部 JSX 文件。

当需要把外部 JSX 脚本集成到项目时：
1. 在 `06-main-ui.jsx` 的 `createMainUI` 闭包内创建对应的函数（如 `createMaskLayer()`、`toggleTrackMatte()`）
2. 按钮的 `onClick` 直接调用该函数
3. 确认函数使用 `app.beginUndoGroup()` / `app.endUndoGroup()` 包裹操作
4. 确认函数正确汇报错误（`try/catch` + `alert()`）

### 功能按钮面板约定
`funcPanel` 中的按钮通过 `addFuncButton()` 创建，自动管理宽度。
- 添加新按钮：`var btn = addFuncButton("标签", "提示");`
- 设置点击：`btn.onClick = function() { ... };`
- 按钮数量变化后调用 `relayoutFuncButtons()` 重排宽度

### 资源文件约定
`config/` 目录不仅存放 JSON 预设，也存放资源文件（如图片）。通过 `getPresetResourcePath(filename)`（`03-config-store.jsx`）解析运行时路径：

```javascript
var bgFile = new File(getPresetResourcePath("bg.png"));
```

构建脚本会将 `config/` 下所有文件同步到 `dist/WorkflowAssist/`，不仅限于 JSON。

### 项目目录导入模式
对于导入图片等资源的函数，采用"先复制到项目目录再导入"的模式：

1. 检查项目文件是否已保存
2. 检查项目目录下是否已有该文件 — 有则跳过复制
3. 没有则从预设目录复制到项目目录
4. **文件复制操作放在 undo group 外部**，只有导入+图层操作在 undo group 内
5. 这样撤回不会删除已存在的资源文件，下次执行也无需重新复制
