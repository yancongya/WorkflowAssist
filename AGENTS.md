# WorkflowAssist Project Guide

## Project Structure

```
WorkflowAssist/
├── src-jsx/              # 开发源码（模块化）
│   00-header.jsx         文件头 IIFE 包装
│   01-constants.jsx      常量（版本/标题/日志级别）
│   01a-icons.jsx         图标 PNG 二进制数据（自动生成）
│   02-logger.jsx         日志模块
│   03-config-store.jsx   JSON 配置读写 + 预设扫描
│   04-ae-utils.jsx       AE 工具函数（合成/图层/嵌套）
│   05-workflow-engine.jsx 工作流执行引擎（核心逻辑）
│   05a-render-engine.jsx 渲染引擎（序列帧渲染+导入）
│   06-main-ui.jsx        主 ScriptUI 界面
│   07-bootstrap.jsx      入口 + NOUI 生成触发
├── icons/                # SVG 图标源文件（构建时转为 PNG 编码）
├── config/               # 预设 JSON 源文件（开发用）
├── scripts/
│   build-jsx.ps1         构建脚本（拼接 JSX + 复制预设）
│   convert-icons.js      图标转换脚本（SVG → PNG → ExtendScript 二进制编码）
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
| Icon conversion (SVG/PNG → .toSource() format for AE) | `iconizing` |
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
1. `scripts/convert-icons.js` 将 `icons/*.svg` 转为 PNG → 用 `toSource()` 格式编码为 ExtendScript 二进制字符串 → 写入 `src-jsx/01a-icons.jsx`
2. 按文件名数字顺序拼接 `src-jsx/*.jsx` → `dist/WorkflowAssist.jsx`
3. 将 `config/*` 全部文件复制到 `dist/WorkflowAssist/`（预设 JSON + 资源文件）
4. 如果 AE ScriptUI Panels 存在软连接则跳过复制，否则自动复制到 AE

## Link to AE

```powershell
npm run link-ae
```

创建软连接将 `dist/WorkflowAssist.jsx` 链接到 AE 的 ScriptUI Panels 目录：
- 首次运行需要管理员权限（自动提升）
- 已存在软连接时会显示当前链接信息
- 支持指定 AE 版本：`powershell -ExecutionPolicy Bypass -File scripts/link-to-ae.ps1 -AeVersion 2024`

**原理**：需要同时链接两个资源：
1. **文件软连接**：`WorkflowAssist.jsx` → 脚本文件
2. **目录连接**：`WorkflowAssist/` → 预设目录

因为脚本通过 `$.fileName` 获取路径，拼接 `/WorkflowAssist` 找预设目录。软连接后 `$.fileName` 返回 AE 目录，必须用目录连接让预设目录在同位置可访问。

## Icon Encoding for AE ScriptUI (重要发现)

AE ScriptUI `image` / `iconbutton` 控件**不支持**以下方式：
- base64 data URI（`ScriptUI.newImage()` 会当文件路径打开）
- 文件路径（`"jsx 不支持图片文件"`）

**唯一有效的方式**：PNG 文件二进制数据经过 `.toSource()` 转义后直接传给控件：

```javascript
// image 控件（显示图标，无按钮背景/hover）
group.add("image", undefined, "\u0089PNG\r\n\x1A\n...");

// iconbutton 控件（有按钮背景+hover，推荐）
group.add("iconbutton", undefined, "\u0089PNG\r\n\x1A\n...", {style: "toolbutton"});
```

`scripts/convert-icons.js` 中使用 `sharp` 渲染 SVG→PNG，然后实现 `toSource()` 转换函数将 Buffer 转为 ExtendScript 兼容的转义字符串（`\xNN` / `\u00NN` / 字面字符），输出到 `01a-icons.jsx`。

此发现记录于 `scripts/convert-icons.js` 顶部注释，作为 AE 图标转换的权威参考。

## Syntax Verification

```powershell
node -e "const fs=require('fs'); new Function(fs.readFileSync('dist/WorkflowAssist.jsx','utf8')); console.log('syntax ok')"
```

## Module Order (loaded in this order)

```
00-header.jsx → 01-constants.jsx → 01a-icons.jsx → 02-logger.jsx → 03-config-store.jsx
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

### ScriptUI 事件回调必须加 try/catch
**ScriptUI 静默吞异常。** 事件回调（`onClick` / `onChange`）中抛异常不会在 AE 控制台报错，用户只看到"点了没反应"。所有回调必须用 try/catch 包裹：

```javascript
btn.onClick = function() {
    try {
        // 实际逻辑
    } catch(e) {
        alert("按钮出错: " + (e.message || e.toString()));
    }
};
```

此规则适用于：Tab 按钮、功能按钮、步骤按钮、下拉框 onChange、输入框 onChange、键盘/鼠标事件。

### 循环内创建回调避免闭包陷阱
`for` 循环内用 `var` 定义控件后创建 `onClick`，闭包引用的永远是**最后一个**变量值。绕开方式：把依赖的控件挂到 `this` 上：

```javascript
// 错误：chkImport 永远是最后一个
chkRender.onClick = function() { chkImport.enabled = this.value; };

// 正确：用属性绕过闭包
chkRender._chkImport = chkImport;
chkRender.onClick = function() { this._chkImport.enabled = this.value; };
```

### stripKnownSuffixes 的 sfx 空值检查
`stripKnownSuffixes()` 遍历预设步骤时，遇到没有 `suffix` 字段的步骤（只有 `rename`），`sfx` 为 `undefined`，访问 `sfx.length` 抛异常。必须加 `if (sfx && ...)` 守卫。

### 新 stack 面板的 visible 守卫
`tabContent` 是 `orientation: "stack"` 面板，新增子面板后，所有 Tab 切换函数中访问其他面板的 `.visible` 都要加 `if` 守卫，防止面板创建失败（如 stack 面板兼容性问题）导致切换 Tab 时崩溃：

```javascript
function showSomeTab() {
    currentTab = "some";
    if (otherPanel) otherPanel.visible = false;
    if (targetPanel) targetPanel.visible = true;
    tabContent.layout.layout(true);
}
```

### ScriptUI 实时键盘检测
使用 `win.addEventListener("keydown"/"keyup")` 可实时检测键盘状态，配合 `mouseover/mouseout` 实现悬停时按键响应：

```javascript
win.addEventListener("keydown", function() {
    if (isHovered) updateBtnText(); // 按键时更新
});
win.addEventListener("keyup", function() {
    if (isHovered) updateBtnText(); // 松开时恢复
});
```

参考：TYC_CompAssist 脚本 `presetLabel` 实现，`cep-playground` skill `ref/extendscript.md`

### Built-in Only — 内联为主，外部脚本通过 EXT_SCRIPTS 引用
**优先内联功能在 src-jsx 模块中。** 当需要调用外部 JSX 脚本时，使用 `EXT_SCRIPTS` 配置模式：

```javascript
// 01-constants.jsx 中配置路径
var EXT_SCRIPTS = {
    compress: "F:/path/to/script.jsx"
    // 以后新增外部脚本在此添加
};

// 06-main-ui.jsx 中引用
btn.onClick = function() {
    var scriptFile = new File(EXT_SCRIPTS.compress);
    if (scriptFile.exists) {
        $.evalFile(scriptFile);
    }
};
```

内联功能的约定（适用于不需要外部引用的情况）：
1. 在 `06-main-ui.jsx` 的 `createMainUI` 闭包内创建对应的函数
2. 按钮的 `onClick` 直接调用该函数
3. 确认函数使用 `app.beginUndoGroup()` / `app.endUndoGroup()` 包裹操作
4. 确认函数正确汇报错误（`try/catch` + `alert()`）

### 功能按钮面板约定
`funcPanel` 中的按钮通过 `addFuncButton()` 创建，自动管理宽度。
- 添加新按钮：`var btn = addFuncButton("标题", "iconKey", "提示");`
- 设置点击：`btn.onClick = function() { ... };`
- 按钮数量变化后调用 `relayoutFuncButtons()` 重排宽度
- 图标源文件放 `icons/`（SVG 或 PNG），构建时自动通过 `convert-icons.js` 转为 `.toSource()` 格式嵌入 `01a-icons.jsx`
- 控件优先级：`iconbutton`（有按钮背景+hover）→ `image`（纯图标）→ `button`（文字 fallback）
- 外部脚本调用使用 `EXT_SCRIPTS` 配置模式，路径定义在 `01-constants.jsx`

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

### 第二行功能按钮（`addIconButton2`）
`addIconButton2` 与 `addFuncButton` 的区别：
- `addFuncButton`：图标不可用时回退到 `image` 控件 → `button`
- `addIconButton2`：图标不可用时**直接回退到 `button`**（跳过 `image`，因为 `image` 不支持 `onClick`）

### 生成 .bat 文件的编码陷阱
`encoding = "UTF8"` 写入 .bat 文件 + `chcp 65001` 的组合**不可靠**，因为：
- cmd.exe 用系统 ANSI 编码（中文系统 = GBK）读取 .bat 文件，而非 `chcp` 设置的代码页
- `chcp 65001` 只改变控制台的**输出**编码，不改变 cmd **读取 .bat 文件**的编码
- 因此 .bat 中的中文（如 `pushd "预览文件夹名"`）始终会被 GBK 解码乱码

**可靠做法**：在 ExtendScript 侧完成文件夹发现，在文件夹**内部**生成纯 ASCII 的 .bat，运行时通过 `%~dp0` 定位自身目录，通过 PowerShell `$((Get-Item .).Name)` 获取文件夹名：
```javascript
var batFile = new File(folder.fsName + "/render.bat"); // 放在目标文件夹内
// bat 内容不含任何中文字符
var content = '@echo off\r\n';
content += 'cd /d "%~dp0"\r\n';
content += 'powershell -NoProfile -Command "...$(Get-Item .).Name...\r\n';
```
不需要 `encoding = "UTF8"`，不需要 `chcp 65001`。

**进阶：如果 bat 必须包含中文（如路径含中文），则必须用 `encoding = "UTF8"` + `chcp 65001` 组合**。原因：Windows "Beta: Use Unicode UTF-8 for worldwide language support" 设置开启后，系统 ANSI 编码变为 UTF-8 而 OEM 编码维持原值（如 GBK），两方不一致导致乱码。显式设定 UTF-8 读写和 chcp 65001 可确保两端统一。参考 `sortOutputFiles` 和 `renderPreviewToMp4` 的最终实现。
