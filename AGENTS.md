# WorkflowAssist Project Guide

## Project Structure

```
WorkflowAssist/
├── src-jsx/              # 开发源码（模块化）
│   00-header.jsx         文件头 IIFE 包装
│   01-constants.jsx      常量（版本/标题/日志级别）
│   01a-icons.jsx         图标 PNG 二进制数据（自动生成）
│   02-logger.jsx         日志模块
│   03-config-store.jsx   JSON 配置读写 + 预设扫描（跳过 sort/ 子目录）
│   04-ae-utils.jsx       AE 工具函数（合成/图层/嵌套）
│   05-workflow-engine.jsx 工作流执行引擎（核心逻辑）
│   05a-render-engine.jsx 渲染引擎（序列帧渲染+导入）
│   06-main-ui.jsx        主 ScriptUI 界面（含 sortOutputFiles()）
│   07-bootstrap.jsx      入口 + NOUI 生成触发
├── icons/                # SVG 图标源文件（构建时转为 PNG 编码）
├── config/               # 预设 JSON 源文件 + 资源文件（开发用）
│   ├── sort/             # 输出整理规则 JSON（不被 scanPresetFiles 扫描为预设）
│   │   ├── gift.json
│   │   └── vehicle.json
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
| `duration` | number / `"custom"` / `"source"` | yes | 时长（秒）。`"custom"` 弹窗输入，`"source"` 使用源合成时长 |
| `scaleMode` | string | yes | `"fit_width"` 自适应宽度 / `"custom"` 自定义百分比 |
| `scalePercent` | number | no | 自定义缩放百分比（`scaleMode: "custom"` 时必填） |
| `stagger` | object | no | 错层配置 `{ enabled, count }` |
| `render` | object | no | 渲染配置 `{ enabled, importBack }` |
| `trimEnd` | number | no | 裁剪末尾帧数（礼物墙预览用，删掉最后 1 帧避免循环闪烁） |
| `loopCount` | number | no | 合成循环次数（礼物墙预览用） |

### sortConfig 预设字段

| Field | Type | Description |
|-------|------|-------------|
| `sortConfig` | string | 可选。指向 `config/sort/xxx.json` 的相对路径。有此字段的预设才支持输出整理按钮。 |
| `sync` | object | 可选。远程同步配置 `{ targetPath }`。把源文件和输出推送到网络共享文件夹。 |

### sync 字段说明

```json
{ "targetPath": "\\\\172.19.241.43\\互娱中台设计-文件共享\\A礼物" }
```
- 在项目目录旁创建 `{项目名}文件夹/`，复制 `源文件/` 和 `输出/` 进去
- 再整体推到网络路径
- 勋章/头像框/挂件/礼物/礼物墙 等需要团队共享的项目使用（礼物墙与礼物同目标路径）
- 同步三步（收集/推送/清理）每步执行完必须 `alert()` 弹窗通知执行结果——不管全量执行（`executeAllSync`）还是 Ctrl+单击单步（`executeSyncStep`），走同一函数自动生效

---

## Sort Config JSON 规范（`config/sort/*.json`）

输出整理规则的外部化配置文件，存放在 `config/sort/` 子目录（不会被 `scanPresetFiles()` 扫描为工作流预设）。

### 顶层字段

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | no | 人类可读的配置说明，弹窗时显示在日志区 |
| `required` | array | yes | 所需文件列表，全部存在才能执行整理 |
| `rename` | array | yes | 重命名规则列表 |
| `zip` | object | no | 打包配置（PAG 文件打包为 zip） |
| `keepSourceFiles` | boolean | no | **顶层变量**。`true` 时打包后不删除源文件（默认删除）。由 `getKeepSourceFiles()`（06-main-ui.jsx）统一读取，兼容旧的 `zip.keepOriginals`（已废弃，优先读顶层） |
| `clipboard` | array | no | 完成后复制到剪贴板的文件列表（支持 `{prefix}` 模板） |
| `subfolder` | string | no | 在 `输出/` 下进一步定位子文件夹，值是**正则表达式**（如 `"礼物墙"`）。配合 `findGiftWallFolder(dir, keyword)` 使用，keyword 即此字段值；匹配失败回退 `indexOf`。无此字段的预设直接读 `输出/` 根目录 |

### required 条目字段

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | 精确文件名匹配 |
| `regex` | string | 正则匹配文件名 |
| `fallback` | string | 备选文件名（如 `animated_bmp.pag` 作为 `animated.pag` 的 fallback） |
| `label` | string | 缺失时显示的人类可读名称（优先于 name/regex） |
| `size` | [number, number] | 可选。PNG 尺寸校验 `[宽, 高]`。同时作为**尺寸兜底匹配**——名字没对上但尺寸对的 PNG 也算匹配 |
| `count` | number | 可选。需要匹配的数量（配合 `regex` 使用，如 `count: 2` 要求至少 2 个文件匹配 regex） |
| `maxSize` | string / number | 可选。文件大小上限。字符串支持 `"500kb"`/`"5mb"`/`"1gb"`（大小写不敏感、可带空格），数字视为字节数。匹配的文件超过上限时检查/执行都会停止并提示。由 `parseMaxSize()`/`fmtMaxSize()`（06-main-ui.jsx）解析显示 |
| `excludeName` | string / string[] | 可选。精确排除文件名（单字符串或数组） |
| `excludeRegex` | string | 可选。正则排除文件名（如 `"预览"` 排除所有带"预览"的文件） |

### rename 条目字段

| Field | Type | Description |
|-------|------|-------------|
| `match` | string | 精确文件名匹配 |
| `regex` | string | 正则匹配文件名 |
| `to` | string | 目标文件名，支持 `{prefix}` 模板变量 |
| `size` | [number, number] | 可选。尺寸匹配：与 `regex` 同时存在时做 **AND 过滤**（regex 匹配后再用 size 缩小范围）；单独存在时做尺寸兜底 |
| `order` | number | 可选。排序后取第 N 个（0-indexed）。配合 `regex` 使用，候选按文件名排序后取 `Math.min(order, candidates.length-1)` |
| `excludeName` | string / string[] | 可选。精确排除文件名（单字符串或数组） |
| `excludeRegex` | string | 可选。正则排除文件名 |

### zip 字段

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | string[] | yes | 要打包的文件列表（支持 `{prefix}` 模板） |
| `name` | string | yes | ZIP 文件名（支持 `{prefix}` 模板） |
| `keepOriginals` | boolean | no | **已废弃**。改用顶层 `keepSourceFiles`。仅当顶层未定义时由 `getKeepSourceFiles()` 读取 |

### 匹配优先级

1. `match` 精确匹配
2. `regex` 正则匹配
3. `fallback` 备选匹配（仅 required）
4. `size` 尺寸兜底（PNG 文件，读取文件头 24 字节获取宽高）

### Naming

```javascript
newName = String(rule.to).replace("{prefix}", output_name);
```

### 配置示例

```json
// config/sort/vehicle.json
{
  "description": "海外座驾输出整理：按文件名或 PNG 尺寸识别气泡图(90×90)和封面图(314×196)",
  "required": [
    { "name": "animated.pag", "fallback": "animated_bmp.pag" },
    { "name": "banner.pag" },
    { "regex": "气泡\\.png$", "label": "气泡.png（90×90）", "size": [90, 90] },
    { "regex": "封面图\\.png$", "label": "驾封面图.png（314×196）", "size": [314, 196] }
  ],
  "rename": [
    { "match": "animated_bmp.pag", "to": "animated.pag" },
    { "regex": "气泡\\.png$", "to": "{prefix}气泡.png", "size": [90, 90] },
    { "regex": "封面图\\.png$", "to": "{prefix}驾封面图.png", "size": [314, 196] }
  ],
  "zip": {
    "files": ["animated.pag", "banner.pag"],
    "name": "{prefix}PAG.zip"
  },
  "clipboard": [
    "{prefix}PAG.zip",
    "{prefix}气泡.png",
    "{prefix}驾封面图.png"
  ]
}
```

### 添加新项目类型

1. 创建 `config/新项目.json`（预设）
2. 创建 `config/sort/新项目.json`（输出整理规则）
3. 在预设 JSON 中加 `"sortConfig": "sort/新项目.json"`
4. 构建即可，**无需改 JSX 代码**

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

### 功能按钮自适应布局（重要）
按钮布局**不按固定每行个数**，而是按面板实际宽度 flow 排布（`06-main-ui.jsx`）：
- 每个按钮的固有宽度：图标组 = `ICON_BTN_WIDTH`(32)，文字按钮 = `max(60, label.length*12+20)`；图标组高度 `[32, 30]`、图标 `[18, 18]`（紧凑版）
- `getCurrentRow(idealW)`：创建按钮时按当前面板宽度 first-fit 分派到行（`_rowWidths` 记录每行已占宽度）
- `computeRowCount()`：按当前宽度重新估算需要几行
- 窗口 `onResize` → `handleFuncResize()`：行数变化时调用 `updateFuncButtons()` 整体重建（ScriptUI 控件无法跨容器移动，只能重建），行数不变时仅 `relayoutFuncButtons()` 均分宽度
- `updateFuncButtons()` 重建前必须重置 `_rowWidths = []`，否则分派错乱
- 面板宽度取值：`funcPanel.size.width`（布局后真实值）→ `preferredSize.width` → 兜底 368

### 功能按钮按行数自适应高度（重要）
**现象**：12 个按钮全部创建成功（DEBUG 确认 rows=2, buttons=12），但界面只显示第一行——`funcPanel` 实际高度只有 52px，第二行在面板外被裁切。按钮没丢，是被窗口挤压。

**根因**：ScriptUI 布局中 `alignment: ["fill", "top"]` 的面板分到的空间 = 窗口剩余空间，不是它请求的高度。窗口 `preferredSize.height=380`，上方元素（项目名/预设行/Tab/内容面板）占满后，`funcPanel` 只分到 52px。**子面板设 `preferredSize.height` 只是请求，不会让窗口变高。**

**修复**（`updateFuncButtons()` 内，重建后执行）：
1. 按实际行数算按钮容器高度：`rowsTotalH = rowCount * 34 + (rowCount-1) * spacing`，设 `funcRowsContainer.preferredSize.height`
2. 算面板需求：`needH = rowsTotalH + 面板上下 margins + funcPanel.spacing + textH(16)`，`funcPanel.preferredSize.height = max(当前, needH)`
3. **必须同步调窗口**：遍历 `win.children` 累计各子元素高度 + 间距 + 窗口 margins，`win.preferredSize.height = max(当前, totalNeeded)`，再 `win.layout.layout(true)`
4. **测量前必须先布局**：首次渲染（`createMainUI` 内调用）时窗口尚未 layout，`ch.size.height` 全是 0，直接累计会算出过小的 totalNeeded 导致窗口没变高。必须先 `win.layout.layout(true)` 让子元素 size 落位再测量

**排障手法**：双层 DEBUG 弹窗确认——①函数层打印 `keys count` 排除预设/图标/函数缺失；②布局层打印 `rows/buttons/funcPanel=[w x h]/funcRows=[w x h]` 对比请求高度与实际高度，一眼看出是裁切而非缺失。

### 重命名项目文件用 save(newFile) + remove(oldFile)
AE 没有原生"重命名项目"API。`File.rename()` 在 AE 打开项目时不更新 `app.project.file`，后续 Ctrl+S 会写到不存在的旧路径。

**正确做法**：用 `app.project.save(newFile)` 另存为新文件（这会自动更新 `app.project.file`），然后 `oldFile.remove()` 删除旧文件。两步都在 try/catch 内：

```javascript
app.project.save();           // 先保存当前状态
app.project.save(newFile);    // 另存为新文件（app.project.file 自动更新）
if (oldFile.exists) {
    oldFile.remove();         // 删除旧文件（失败则提示手动删除）
}
```

参考实现：`06-main-ui.jsx` 的 `renameProject()` 函数。

### Tab 步骤区可滚动高度约定
三个 Tab（整理/输出/同步）的步骤区都包在 `{scrollable: true}` 的滚动面板里（`stepScroll`/`outputScroll`/`syncScroll`），限制最大可见高度：
- `STEP_SCROLL_MAX_H = 170`（`06-main-ui.jsx`）
- 高度按条目数动态计算：`setScrollPanelHeight(scrollPanel, itemCount, itemHeight, itemSpacing, extraPad)`，取 `min(内容高度, 170)`，条目少时自动变矮、条目多时出现内部滚动条
- 外层步骤面板（`stepPreviewPanel`/`outputStepPanel`/`syncPanel`）与 `tabContent` 全部用 `["fill", "top"]` 对齐 + `maximumSize.height` 硬上限（220/220/240），防止被窗口高度拉伸出大块空白
- 新增/修改步骤区刷新函数时，所有路径（含 early-return）都要调用 `setScrollPanelHeight()`，否则高度不会更新

### 窗口缩放右侧裁切约定
窗口 `onResizing`/`onResize` 处理（`06-main-ui.jsx`）固定顺序：`layout.resize()` → `handleFuncResize()` → `relayoutOutputRows()` → `layout.layout(true)`。
- `getFuncPanelWidth()` 取值顺序：`funcPanel.size.width` → `win.size.width - 12`（缩放中实时值，防按钮按旧宽度换行导致右侧裁切）→ `preferredSize.width` → 兜底 368
- 输出 Tab 行内宽度用 `relayoutOutputRows()` 动态分配：中间 label 吸收宽度变化，固定项（渲染 45 / 导入 55 / 状态 60）永远不裁切
- `refreshOutputUI()` 和 `showOutputTab()` 布局后都要调用 `relayoutOutputRows()`，否则 label 宽度不更新

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

### 渲染序列去重（`importSequenceToComp`）
重复渲染同一个合成会堆积重复素材和图层（`xxx_序列`、`xxx_序列_1`… 和多个渲染图层）。`importSequenceToComp()`（`05a-render-engine.jsx`）在导入前必须清理：

```javascript
// 先移除旧的导入图层（合成内叫 `合成名_渲染`）
for (var li = 1; li <= comp.layers.length; li++) {
    var lyr = comp.layer(li);
    if (lyr && lyr.name === layerName) { try { lyr.remove(); } catch(e) {} break; }
}
// 再移除旧素材项（项目面板叫 `合成名_序列`）
for (var i = 1; i <= app.project.items.length; i++) {
    var item = app.project.items[i];
    if (item && item.name === footageName) { try { item.remove(); } catch(e) {} break; }
}
```

- 图层名 = `合成名_渲染`，素材名 = `合成名_序列`，两者约定固定
- 清理顺序：先图层后素材（素材被图层引用时 remove 会失败）
- `renderCompToSequence()` 渲染前清空输出目录旧帧（`outDir.getFiles("*")` 逐个 remove）
- 每次 import 前先移除旧的图层和素材，确保重复执行结果一致

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

### sortOutputFiles 压缩安全约定
```javascript
// 1. JS 侧先删旧 zip，避免 bat 内 -Force 出错丢 zip
var oldZip = new File(outputFolder.fsName + "/" + zipName);
if (oldZip.exists) oldZip.remove();

// 2. bat 内 Compress-Archive 不用 -Force（旧 zip 已删）
"Compress-Archive -Path ... -DestinationPath 'xxx.zip'"

// 3. del 用 if %errorlevel%==0 链式，压缩失败不删源文件
'if %errorlevel%==0 del "animated.pag" "banner.pag"'
```

### 用户输入文件名净化
用户输入的 prefix（如 `1/4`）可能含 Windows 非法字符（`\ / : * ? " < > |`），必须在 `sortOutputFiles()` 的 `confirmButton.onClick` 入口处替换：
```javascript
var safeName = output_name.replace(/[\\\/:*?"<>|]/g, "-");
```
替换后写入日志告知用户，再赋值回 `output_name`。

### PNG 尺寸获取（`getPngDimensions`）
读 PNG 文件头 24 字节获取宽高，用于 required 和 rename 的 `size` 兜底匹配：
```javascript
function getPngDimensions(filePath) {
    var f = new File(filePath);
    if (!f.exists) return null;
    f.open("r");
    f.encoding = "BINARY";
    var raw = f.read(24);
    f.close();
    // PNG signature + IHDR chunk: bytes 16-23 = width(4) + height(4)
    var w = (raw.charCodeAt(16) << 24) | (raw.charCodeAt(17) << 16) |
            (raw.charCodeAt(18) << 8) | raw.charCodeAt(19);
    var h = (raw.charCodeAt(20) << 24) | (raw.charCodeAt(21) << 16) |
            (raw.charCodeAt(22) << 8) | raw.charCodeAt(23);
    return [w, h];
}
```

### MP4 尺寸获取（`getMp4Dimensions`）
读 MP4 文件搜索 `tkhd` atom 获取宽高，用于 sortConfig 的 `size` 匹配：

关键坑：
- **`f.open("r")` 而不是 `"e"`** —— `"e"` 在 Windows 上二进制读取可能不可靠。用 `"r"` + `encoding = "BINARY"`（和 `getPngDimensions` 一致）。
- **从文件头开始读** —— AE 导出的 MP4 默认没有 fast-start（moov box 在文件开头），所以先读开头 256KB。只有开头没找到才从末尾读。
- **循环找 `tkhd` 跳过音轨** —— 音轨的 `tkhd` 宽高为 0，要找到第一个非零宽高的 track。

参考实现：`06-main-ui.jsx` 的 `getMp4Dimensions()` 和 `getFileDimensions()`。

### sortConfig rename 的 `size` 字段语义（重要）
rename 规则的匹配按 `match → regex → size` 顺序尝试，原本的设计是 OR 语义（前面没匹配上才试 size）：

```javascript
// 旧的 OR 语义
var matched = false;
if (rule.match && fName === rule.match) matched = true;
if (!matched && rule.regex) { /* regex + exclude */ }
if (!matched && rule.size) { /* match by size */ }  // size 作为备选
```

giftwall 需要的是 **AND 语义**（regex 匹配后再用 size 缩小范围），所以改为：

```javascript
// 现在的 AND + standalone 混合语义
var matched = false;
if (rule.match && fName === rule.match) matched = true;
if (!matched && rule.regex) { /* regex + exclude */ }
if (rule.size) {
    var sizeMatch = dims[0] === rule.size[0] && dims[1] === rule.size[1];
    if (matched) {
        if (!sizeMatch) matched = false;       // AND 过滤
    } else {
        if (sizeMatch && !isExcluded(...)) matched = true;  // standalone
    }
}
```

**注意**：所有 rename 匹配逻辑已提取为共享函数 `matchRenameRule()`（`06-main-ui.jsx`），三处调用点（check preview、execution order 路径、execution 非 order 路径）统一使用。如需修改匹配逻辑，只改此函数一处即可。

### processedNames 必须记新旧名
`sortOutputFiles()` 中，rename 后 `File.name` 在 ExtendScript 中会更新为新文件名。如果 `processedNames` 只记旧名，后续规则扫描到同一个 File 对象时拿到的是新名，`processedNames[新名]` 不存在，导致一个文件被多次重命名。

**修复**：rename 后同时标记新旧名。

```javascript
processedNames[oldName] = true;
processedNames[newName] = true;  // 防止 File.name 更新后被重复处理
```

### sortOutputFiles 的 rename 匹配逻辑集中维护
`matchRenameRule(rule, fileName, filePath)` 是唯一处理 rename 规则匹配的函数，三处调用点统一调用：

| 调用点 | 位置 | 用途 |
|--------|------|------|
| 执行 order 路径 | 遍历文件收集候选 | `if (matchRenameRule(...)) matches.push(...)` |
| 执行非 order 路径 | 遍历规则匹配文件 | `if (matchRenameRule(...)) { rename... }` |
| 检查按钮预览 | 预览重命名结果 | `if (matchRenameRule(...)) matches.push(...)` |

**原则**：任何时候新增 rename 匹配条件（如按类型、按采集日期等），只改 `matchRenameRule()` 一处，三处自动生效。

### sortConfig 构建时校验
`scripts/build-jsx.ps1` 现在包含 sort JSON 的自动校验：
- required/rename 项的必填字段
- `size` 格式校验（必须是 `[宽, 高]`）
- `count` 与 `regex` 的依赖检查
- zip 配置完整性

新增 sort JSON 后，运行构建脚本会自动校验，WARN 不会中断构建但会提示。

---

## sortConfig 功能开发工作流（礼物墙经验总结）

新增 sortConfig 字段或修改匹配逻辑时，按以下流程避免反复返工：

### 第一步：明确语义

新增字段前，先确定：
- **OR 还是 AND？** — `size` 最初是 regex 匹配失败的"备选"（OR），giftwall 需要的是"regex 匹配后再过滤"（AND）。两者互斥，不能混用
- **与已有字段的组合关系** — `size+regex` 同时出现时是什么语义？`excludeRegex+size` 同时出现时谁优先？
- **写入 AGENTS.md 再编码** — 先更新 Sort Config JSON 规范章节，再改代码。避免"边写边想"导致的反复

### 第二步：代码实现

**集中逻辑，三处调用**：

```
matchRenameRule() ← 执行 order 路径
                  ← 执行非 order 路径
                  ← 检查预览（check button）
```

- 所有 rename 匹配逻辑写在 `matchRenameRule()` 一个函数里
- 三处调用点只调用此函数，不独立实现匹配
- 如果调用点逻辑各不相同（如检查预览有 `isExcluded` 预过滤），先在函数内统一处理，再考虑调用点的差异

### 第三步：构建并验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-jsx.ps1
node -e "const fs=require('fs'); new Function(fs.readFileSync('dist/WorkflowAssist.jsx','utf8')); console.log('syntax ok')"
```

构建时自动：
- sort JSON 格式校验（required/rename 字段完整性、size 格式、count+regex 依赖）
- 图标转换
- 预设同步

### 第四步：检查预览 vs 实际执行

**"检查"按钮和"执行"按钮不是两套逻辑，而是同一套逻辑的两个入口。**

- 检查预览没报错 + 结果显示正确 → 执行应该同样正确
- 如果执行结果与预览不一致，说明预览和执行走了不同代码路径 → **这是 bug，不是预期行为**
- 现在 `matchRenameRule()` 统一后，预览和执行不再可能不同步

### 第五步：踩坑 checklist

新增 sortConfig 功能时逐一核对：

- [ ] `matchRenameRule()` 中实现了新逻辑，三处调用点自动生效
- [ ] required 检查用 `checkRequiredEntry()` 统一（检查/执行两处共用），不要各自实现
- [ ] `maxSize` 用 `parseMaxSize()` 解析（支持 `"500kb"`/`"5mb"`/数字=字节），不要直接比较字符串
- [ ] `if (rule.size)` 而不是 `if (!matched && rule.size)`（否则 size 过滤在 regex 匹配后不执行）
- [ ] size 作为 standalone 匹配时也检查 `isExcluded`（预览视频和主效果同分辨率时容易误匹配）
- [ ] rename 后 `processedNames` 同时标记旧名和新名（`File.name` 在 rename 后自动更新）
- [ ] MP4 尺寸读取用 `f.open("r")`，先读文件头再读尾
- [ ] ZIP 源文件是 rename 后的名字（不是原文件名）
- [ ] sort JSON 修改后跑一次 `build-jsx.ps1` 校验
- [ ] 构建成功后重新加载 AE 脚本测试（不要用旧的 dist 文件）

