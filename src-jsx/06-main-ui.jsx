function createMainUI(parentPanel) {
    var isPanel = parentPanel instanceof Panel;
    var win;

    if (isPanel) {
        win = parentPanel;
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 4;
        win.margins = 6;
    } else {
        win = new Window("palette", MAIN_PANEL_TITLE, undefined, {resizeable: true, closeButton: true});
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 4;
        win.margins = 6;
    }

    win.preferredSize.width = 380;
    win.preferredSize.height = 420;
    win.minimumSize = [320, 300];

    win.onResizing = win.onResize = function() {
        try { this.layout.resize(); } catch(e) {}
    };

    win.parentPanel = parentPanel;

    function setTextColor(ctrl, color) {
        try {
            ctrl.graphics.foregroundColor = ctrl.graphics.newPen(ctrl.graphics.PenType.SOLID_COLOR, color, 1);
        } catch(e) {}
    }

    // ================== 当前合成行（含图标按钮） ==================
    var currentCompRow = win.add("group");
    currentCompRow.orientation = "row";
    currentCompRow.alignment = ["fill", "top"];
    currentCompRow.alignChildren = ["fill", "center"];
    currentCompRow.spacing = 2;
    currentCompRow.margins = [0, 0, 0, 2];

    var curLabel = currentCompRow.add("statictext", undefined, "当前合成:");
    curLabel.alignment = ["left", "center"];

    var curCompText = currentCompRow.add("statictext", undefined, "（无）");
    curCompText.alignment = ["fill", "center"];

    function makeIconButton(parent, symbol, tip) {
        var btn = parent.add("iconbutton", undefined, undefined, {style: "toolbutton"});
        btn.text = symbol;
        btn.helpTip = tip;
        btn.preferredSize = [22, 22];
        return btn;
    }

    var btnRefresh = makeIconButton(currentCompRow, "↻", "重新获取当前活动合成");
    var btnGetComp = makeIconButton(currentCompRow, "◎", "取合成名 → 填入输入框");
    var btnGetProject = makeIconButton(currentCompRow, "▣", "取项目名 → 填入输入框");

    function detectCurrentComp() {
        var name = getActiveCompName();
        if (name) {
            curCompText.text = name;
            if (!nameInput.text || nameInput.text === "") {
                nameInput.text = name;
            }
        } else {
            curCompText.text = "（无活动合成）";
        }
    }

    btnRefresh.onClick = function() {
        detectCurrentComp();
        updateStepPreview();
    };

    btnGetComp.onClick = function() {
        var compName = getActiveCompName();
        if (compName) {
            nameInput.text = compName;
            logMessage("已获取合成名称: " + compName, LOG_LEVEL.NORMAL, "UI");
        } else {
            alert("未找到当前活动合成！");
        }
    };

    btnGetProject.onClick = function() {
        if (app.project && app.project.file) {
            var projFile = app.project.file.name.replace(/\.[^\.]+$/, "");
            var projName = decodeUrlString(projFile);
            nameInput.text = projName;
            logMessage("已获取项目文件名: " + projName, LOG_LEVEL.NORMAL, "UI");
        } else {
            alert("当前项目尚未保存！");
        }
    };

    // ================== 基础名称输入行 ==================
    var nameGroup = win.add("group");
    nameGroup.orientation = "row";
    nameGroup.alignment = ["fill", "top"];
    nameGroup.alignChildren = ["fill", "center"];
    nameGroup.spacing = 4;
    nameGroup.margins = [0, 0, 0, 4];

    var nameLabel = nameGroup.add("statictext", undefined, "基础名称:");
    nameLabel.alignment = ["left", "center"];

    var nameInput = nameGroup.add("edittext", undefined, "");
    nameInput.characters = 18;
    nameInput.alignment = ["fill", "center"];
    nameInput.minimumSize.width = 140;
    nameInput.helpTip = "输入基础名称，源合成将被重命名为此名称";

    // ================== Tab 按钮行（居中） ==================
    var tabGroup = win.add("group");
    tabGroup.orientation = "row";
    tabGroup.alignment = ["center", "top"];
    tabGroup.spacing = 0;
    tabGroup.margins = [0, 0, 0, 0];
    tabGroup.alignChildren = ["center", "center"];

    var tabOrganize = tabGroup.add("button", undefined, "整理");
    tabOrganize.preferredSize.width = 80;

    var tabOutput = tabGroup.add("button", undefined, "输出");
    tabOutput.preferredSize.width = 80;

    // ================== 内容容器 ==================
    var contentPanel = win.add("panel");
    contentPanel.orientation = "column";
    contentPanel.alignChildren = ["fill", "fill"];
    contentPanel.alignment = ["fill", "fill"];
    contentPanel.spacing = 4;
    contentPanel.margins = 6;

    // --- 整理面板 ---
    var organizeGroup = contentPanel.add("group");
    organizeGroup.orientation = "column";
    organizeGroup.alignChildren = ["fill", "top"];
    organizeGroup.alignment = ["fill", "fill"];
    organizeGroup.spacing = 4;
    organizeGroup.margins = [0, 0, 0, 0];

    var presetRow = organizeGroup.add("group");
    presetRow.orientation = "row";
    presetRow.alignment = ["fill", "top"];
    presetRow.alignChildren = ["fill", "center"];
    presetRow.spacing = 4;
    presetRow.margins = [0, 0, 0, 2];

    var presetLabel = presetRow.add("statictext", undefined, "预设:");
    presetLabel.alignment = ["left", "center"];

    var presetDropdown = presetRow.add("dropdownlist", undefined, []);
    presetDropdown.alignment = ["fill", "center"];
    presetDropdown.minimumSize.width = 120;

    // 步骤预览区域
    var stepPreviewPanel = organizeGroup.add("panel");
    stepPreviewPanel.orientation = "column";
    stepPreviewPanel.alignChildren = ["fill", "fill"];
    stepPreviewPanel.alignment = ["fill", "fill"];
    stepPreviewPanel.spacing = 2;
    stepPreviewPanel.margins = 4;
    stepPreviewPanel.text = "工作流步骤预览";

    var stepDisplay = stepPreviewPanel.add("edittext", undefined, "请选择一个预设", {multiline: true, readonly: true, scrollable: true});
    stepDisplay.alignment = ["fill", "fill"];
    stepDisplay.minimumSize.height = 100;
    stepDisplay.margins = [4, 4, 4, 4];

    // --- 输出面板（占位） ---
    var outputGroup = contentPanel.add("group");
    outputGroup.orientation = "column";
    outputGroup.alignChildren = ["fill", "top"];
    outputGroup.alignment = ["fill", "fill"];
    outputGroup.spacing = 4;
    outputGroup.margins = [0, 0, 0, 0];
    outputGroup.visible = false;

    var outputPlaceholder = outputGroup.add("statictext", undefined, "输出功能开发中...");
    outputPlaceholder.alignment = ["center", "center"];
    outputPlaceholder.preferredSize.height = 80;
    setTextColor(outputPlaceholder, [0.5, 0.5, 0.5, 1]);

    function showOrganizeTab() {
        organizeGroup.visible = true;
        outputGroup.visible = false;
    }

    function showOutputTab() {
        organizeGroup.visible = false;
        outputGroup.visible = true;
    }

    tabOrganize.onClick = function() { showOrganizeTab(); };
    tabOutput.onClick = function() { showOutputTab(); };

    // ================== 底部执行按钮（居中） ==================
    var bottomGroup = win.add("group");
    bottomGroup.orientation = "row";
    bottomGroup.alignment = ["center", "top"];
    bottomGroup.spacing = 4;
    bottomGroup.margins = [0, 6, 0, 0];

    var btnExecute = bottomGroup.add("button", undefined, "▶ 执行工作流");
    btnExecute.alignment = ["center", "center"];
    btnExecute.preferredSize.width = 140;
    btnExecute.helpTip = "重命名当前合成并按预设步骤创建嵌套合成";

    // ================== 缓存预设文件列表 ==================
    var cachedPresetFiles = [];

    function refreshPresetList() {
        cachedPresetFiles = scanPresetFiles();
        presetDropdown.removeAll();
        if (cachedPresetFiles.length > 0) {
            for (var i = 0; i < cachedPresetFiles.length; i++) {
                presetDropdown.add("item", cachedPresetFiles[i].name);
            }
            presetDropdown.selection = presetDropdown.items[0];
            updateStepPreview();
        } else {
            stepDisplay.text = "未找到预设文件\n请在 " + configFolder.fsName + " 目录下添加 .json 预设文件";
        }
    }

    function getSelectedPresetFile() {
        if (!presetDropdown.selection) return null;
        var idx = presetDropdown.selection.index;
        if (idx < 0 || idx >= cachedPresetFiles.length) return null;
        return cachedPresetFiles[idx].file;
    }

    // ================== 更新步骤预览 ==================
    function updateStepPreview() {
        var baseName = nameInput.text || "{基础名称}";
        var presetFile = getSelectedPresetFile();
        if (!presetFile) {
            stepDisplay.text = "请选择一个预设";
            return;
        }

        var presetData = loadPreset(presetFile);
        if (!presetData || !presetData.steps) {
            stepDisplay.text = "预设数据无效";
            return;
        }

        var lines = [];
        for (var i = 0; i < presetData.steps.length; i++) {
            var s = presetData.steps[i];
            var line = "Step " + (i + 1) + ": ";
            line += s.width + "×" + s.height + "  ";
            line += s.frameRate + "fps  ";
            line += s.duration + "s  ";
            line += "→ " + baseName + s.suffix;
            lines.push(line);

            var layerDesc = "  └ 图层: ";
            if (s.scaleMode === "fit_width") {
                layerDesc += "自适应宽度缩放";
            } else if (s.scaleMode === "custom") {
                layerDesc += s.scalePercent + "% 缩放";
            }
            lines.push(layerDesc);

            if (s.stagger && s.stagger.enabled) {
                var prevDuration = "?";
                if (i > 0) {
                    prevDuration = presetData.steps[i - 1].duration;
                }
                var staggerLine = "  └ 错层: " + s.stagger.count + "层, 偏移=" + prevDuration + "s (上一步时长)";
                lines.push(staggerLine);
            }

            if (i < presetData.steps.length - 1) {
                lines.push("");
            }
        }

        stepDisplay.text = lines.join("\n");
    }

    presetDropdown.onChange = function() { updateStepPreview(); };
    nameInput.onChange = function() { updateStepPreview(); };

    // ================== 执行工作流 ==================
    btnExecute.onClick = function() {
        var sourceComp = getActiveComp();
        if (!sourceComp) {
            alert("请先在 After Effects 中选择一个活动合成！");
            return;
        }

        var baseName = nameInput.text;
        if (!baseName) {
            alert("请输入基础名称！");
            return;
        }

        var presetFile = getSelectedPresetFile();
        if (!presetFile) {
            alert("请先选择一个预设！");
            return;
        }

        executeWorkflow(sourceComp, baseName, presetFile);
    };

    // ================== 初始化 ==================
    detectCurrentComp();
    refreshPresetList();

    return win;
}
