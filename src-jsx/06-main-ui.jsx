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

    function clearContainer(container) {
        while (container.children.length > 0) {
            container.remove(container.children[0]);
        }
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

    function stripKnownSuffixes(name) {
        var presetFile = getSelectedPresetFile();
        if (!presetFile) return name;
        var presetData = loadPreset(presetFile);
        if (!presetData || !presetData.steps) return name;
        for (var si = 0; si < presetData.steps.length; si++) {
            var sfx = presetData.steps[si].suffix;
            if (name.length > sfx.length && name.lastIndexOf(sfx) === name.length - sfx.length) {
                return name.substring(0, name.length - sfx.length);
            }
        }
        return name;
    }

    function detectCurrentComp() {
        var name = getActiveCompName();
        if (name) {
            curCompText.text = name;
            if (!nameInput.text || nameInput.text === "") {
                nameInput.text = stripKnownSuffixes(name);
            }
        } else {
            curCompText.text = "（无活动合成）";
        }
    }

    btnRefresh.onClick = function() {
        detectCurrentComp();
        updateStepPreview();
        refreshOutputUI();
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
    nameInput.onChange = function() {
        updateStepPreview();
        refreshOutputUI();
    };

    // ================== 预设选择行（通用，始终可见） ==================
    var presetRow = win.add("group");
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
    presetDropdown.onChange = function() {
        updateStepPreview();
        refreshOutputUI();
    };

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

    var tabPackage = tabGroup.add("button", undefined, "打包");
    tabPackage.preferredSize.width = 80;

    // ================== 内容容器 ==================
    var tabContent = win.add("panel");
    tabContent.orientation = "stack";
    tabContent.alignment = ["fill", "fill"];
    tabContent.minimumSize.height = 160;

    // --- 整理面板 ---
    var organizeGroup = tabContent.add("group");
    organizeGroup.orientation = "column";
    organizeGroup.alignChildren = ["fill", "top"];
    organizeGroup.alignment = ["fill", "fill"];
    organizeGroup.spacing = 4;
    organizeGroup.margins = 6;

    // 步骤按钮区域
    var stepPreviewPanel = organizeGroup.add("panel");
    stepPreviewPanel.orientation = "column";
    stepPreviewPanel.alignChildren = ["fill", "top"];
    stepPreviewPanel.alignment = ["fill", "fill"];
    stepPreviewPanel.spacing = 3;
    stepPreviewPanel.margins = 4;
    stepPreviewPanel.text = "工作流步骤";

    var stepContainer = stepPreviewPanel.add("group");
    stepContainer.orientation = "column";
    stepContainer.alignChildren = ["fill", "top"];
    stepContainer.alignment = ["fill", "top"];
    stepContainer.spacing = 2;
    stepContainer.margins = [0, 0, 0, 0];

    var stepTipLine = stepPreviewPanel.add("statictext", undefined, "点击切换 | Ctrl+点击单步执行");
    stepTipLine.alignment = ["center", "bottom"];
    stepTipLine.margins = [0, 2, 0, 0];

    var stepButtons = [];
    var stepActiveStates = [];

    // --- 输出面板 ---
    var outputGroup = tabContent.add("group");
    outputGroup.orientation = "column";
    outputGroup.alignChildren = ["fill", "fill"];
    outputGroup.alignment = ["fill", "fill"];
    outputGroup.spacing = 4;
    outputGroup.margins = 6;
    outputGroup.visible = false;

    var outputStepPanel = outputGroup.add("panel");
    outputStepPanel.orientation = "column";
    outputStepPanel.alignChildren = ["fill", "top"];
    outputStepPanel.alignment = ["fill", "fill"];
    outputStepPanel.spacing = 3;
    outputStepPanel.margins = 4;
    outputStepPanel.text = "输出步骤";

    var outputStepContainer = outputStepPanel.add("group");
    outputStepContainer.orientation = "column";
    outputStepContainer.alignChildren = ["fill", "top"];
    outputStepContainer.alignment = ["fill", "top"];
    outputStepContainer.spacing = 2;
    outputStepContainer.margins = [0, 0, 0, 0];

    // --- 打包面板 ---
    var packageGroup = tabContent.add("group");
    packageGroup.orientation = "column";
    packageGroup.alignChildren = ["fill", "top"];
    packageGroup.alignment = ["fill", "fill"];
    packageGroup.spacing = 6;
    packageGroup.margins = 6;
    packageGroup.visible = false;

    var packagePanel = packageGroup.add("panel");
    packagePanel.orientation = "column";
    packagePanel.alignChildren = ["fill", "top"];
    packagePanel.alignment = ["fill", "top"];
    packagePanel.spacing = 4;
    packagePanel.margins = 6;
    packagePanel.text = "项目工具";

    var btnConsolidate = packagePanel.add("button", undefined, "整理项目  — 合并重复素材");
    btnConsolidate.alignment = ["fill", "top"];
    btnConsolidate.preferredSize.height = 26;
    btnConsolidate.helpTip = "合并项目中所有重复的素材文件";

    var btnReduce = packagePanel.add("button", undefined, "减少项目  — 删除未使用素材");
    btnReduce.alignment = ["fill", "top"];
    btnReduce.preferredSize.height = 26;
    btnReduce.helpTip = "删除项目中未使用的素材和合成";

    btnConsolidate.onClick = function() {
        if (!app.project) { alert("请先打开一个项目！"); return; }
        try {
            app.project.consolidateFootage();
            alert("整理项目完成！");
        } catch(e) {
            alert("整理项目出错: " + e.toString());
        }
    };

    btnReduce.onClick = function() {
        if (!app.project) { alert("请先打开一个项目！"); return; }
        alert("请在 AE 菜单手动操作:\n\n文件 → 依赖关系 → 减少项目");
    };

    var renderRows = [];
    var renderActiveStates = [];
    var importActiveStates = [];
    var renderStatusTexts = [];

    function refreshOutputUI() {
        clearContainer(outputStepContainer);
        renderRows = [];
        renderActiveStates = [];
        importActiveStates = [];
        renderStatusTexts = [];

        var baseName = nameInput.text || "{基础名称}";
        var presetFile = getSelectedPresetFile();
        if (!presetFile) return;

        var presetData = loadPreset(presetFile);
        if (!presetData || !presetData.steps) return;

        for (var i = 0; i < presetData.steps.length; i++) {
            var s = presetData.steps[i];
            var rc = s.render || {enabled: true, importBack: true};

            var row = outputStepContainer.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.alignment = ["fill", "top"];
            row.spacing = 4;
            row.margins = [0, 0, 0, 0];

            var chkRender = row.add("checkbox", undefined, "渲染");
            chkRender.value = rc.enabled;
            chkRender.preferredSize.width = 50;

            var label = row.add("statictext", undefined, "Step " + (i + 1) + ": " + s.name);
            label.preferredSize.width = 100;

            var chkImport = row.add("checkbox", undefined, "导入");
            chkImport.value = rc.importBack;
            chkImport.preferredSize.width = 65;

            var status = row.add("statictext", undefined, "待渲染");
            status.alignment = ["right", "center"];
            status.preferredSize.width = 80;
            status.margins = [0, 0, 4, 0];
            setTextColor(status, [0.5, 0.5, 0.5, 1]);

            chkRender.onClick = function() {
                chkImport.enabled = this.value;
            };

            renderRows.push(row);
            renderActiveStates.push(chkRender);
            importActiveStates.push(chkImport);
            renderStatusTexts.push(status);
        }
        outputStepContainer.layout.layout(true);
    }

    var currentTab = "organize";

    function showOrganizeTab() {
        currentTab = "organize";
        organizeGroup.visible = true;
        outputGroup.visible = false;
        packageGroup.visible = false;
        btnExecute.text = "▶ 执行工作流";
        btnExecute.helpTip = "重命名当前合成并按预设步骤创建嵌套合成";
        bottomGroup.visible = true;
        tabContent.layout.layout(true);
    }

    function showOutputTab() {
        currentTab = "output";
        organizeGroup.visible = false;
        outputGroup.visible = true;
        packageGroup.visible = false;
        btnExecute.text = "▶ 执行输出";
        btnExecute.helpTip = "依次渲染并导入序列帧";
        bottomGroup.visible = true;
        refreshOutputUI();
        tabContent.layout.layout(true);
    }

    function showPackageTab() {
        currentTab = "package";
        organizeGroup.visible = false;
        outputGroup.visible = false;
        packageGroup.visible = true;
        bottomGroup.visible = false;
        tabContent.layout.layout(true);
    }

    tabOrganize.onClick = function() { showOrganizeTab(); };
    tabOutput.onClick = function() { showOutputTab(); };
    tabPackage.onClick = function() { showPackageTab(); };

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
            refreshOutputUI();
        } else {
            stepPreviewPanel.text = "工作流步骤 - 未找到预设文件";
        }
    }

    function getSelectedPresetFile() {
        if (!presetDropdown.selection) return null;
        var idx = presetDropdown.selection.index;
        if (idx < 0 || idx >= cachedPresetFiles.length) return null;
        return cachedPresetFiles[idx].file;
    }

    // ================== 更新步骤按钮 ==================
    function updateStepPreview() {
        var baseName = nameInput.text || "{基础名称}";
        var presetFile = getSelectedPresetFile();
        if (!presetFile) {
            clearContainer(stepContainer);
            return;
        }

        var presetData = loadPreset(presetFile);
        if (!presetData || !presetData.steps) {
            clearContainer(stepContainer);
            return;
        }

        clearContainer(stepContainer);
        stepButtons = [];
        stepActiveStates = [];

        for (var i = 0; i < presetData.steps.length; i++) {
            stepActiveStates[i] = true;
            var s = presetData.steps[i];

            var btn = stepContainer.add("button", undefined, "");
            btn.alignment = ["fill", "top"];
            btn.preferredSize.height = 24;

            buildStepButton(btn, i, s, baseName, true, presetFile);
            stepButtons.push(btn);
        }

        stepContainer.layout.layout(true);
    }

    function buildStepHelpTip(index, s, baseName) {
        var tip = "Step " + (index + 1) + ": " + s.name + "\n";
        var outLabel = s.rename ? String(s.rename).replace("{baseName}", baseName) : baseName + (s.suffix || "");
        tip += "合成: " + outLabel + "\n";
        tip += "尺寸: " + s.width + "\u00D7" + s.height + "\n";
        tip += "帧率: " + s.frameRate + "fps\n";
        tip += "时长: ";
        if (typeof s.duration === "string" && s.duration === "custom") {
            tip += "自定义（运行前弹窗输入）\n";
        } else {
            tip += s.duration + "s\n";
        }
        tip += "图层: ";
        if (s.scaleMode === "fit_width") {
            tip += "自适应宽度缩放";
        } else if (s.scaleMode === "custom") {
            tip += s.scalePercent + "% 缩放";
        }
        if (s.stagger && s.stagger.enabled) {
            tip += "\n错层: " + s.stagger.count + "层, 偏移=";
            if (index > 0) {
                tip += s.duration + "s";
            } else {
                tip += "?s";
            }
        }
        tip += "\n\n单击: 切换启用/禁用 | Ctrl+单击: 立即执行此步骤";
        return tip;
    }

    function buildStepButton(btn, index, s, baseName, isActive, presetFile) {
        var prefix = isActive ? "\u2713 " : "\u25CB ";
        btn.text = prefix + "Step " + (index + 1) + ": " + s.name;
        btn.helpTip = buildStepHelpTip(index, s, baseName);
        btn._stepIndex = index;
        btn._stepName = s.name;

        btn.onClick = function() {
            var ctrlKey = ScriptUI.environment.keyboardState.ctrlKey;
            var idx = this._stepIndex;

            if (ctrlKey) {
                var sourceComp = getActiveComp();
                if (!sourceComp) {
                    alert("请先在 After Effects 中选择一个活动合成！");
                    return;
                }
                var base = nameInput.text;
                if (!base) {
                    alert("请输入基础名称！");
                    return;
                }
                var pFile = getSelectedPresetFile();
                if (!pFile) return;

                executeSingleStep(sourceComp, base, pFile, idx);
            } else {
                stepActiveStates[idx] = !stepActiveStates[idx];
                var active = stepActiveStates[idx];
                var p2 = active ? "\u2713 " : "\u25CB ";
                this.text = p2 + "Step " + (idx + 1) + ": " + this._stepName;
            }
        };
    }

    // ================== 执行 ==================
    btnExecute.onClick = function() {
        if (currentTab === "package") {
            return;
        } else if (currentTab === "output") {
            var baseName = stripKnownSuffixes(nameInput.text);
            if (!baseName) {
                alert("请输入基础名称！");
                return;
            }

            if (!app.project.file) {
                alert("请先保存项目文件！");
                return;
            }

            var presetFile = getSelectedPresetFile();
            if (!presetFile) {
                alert("请先选择一个预设！");
                return;
            }

            var projectDir = app.project.file.parent.fsName;
            var presetData = loadPreset(presetFile);
            if (!presetData || !presetData.steps) {
                alert("预设数据无效！");
                return;
            }

            for (var i = 0; i < presetData.steps.length; i++) {
                if (!renderActiveStates[i] || !renderActiveStates[i].value) continue;

                var s = presetData.steps[i];
                var compName = baseName + s.suffix;
                var comp = getCompByName(compName);

                if (!comp) {
                    alert("未找到合成: " + compName + "\n请先执行工作流创建合成。");
                    renderStatusTexts[i].text = "未找到";
                    setTextColor(renderStatusTexts[i], [0.8, 0.2, 0.2, 1]);
                    continue;
                }

                renderStatusTexts[i].text = "渲染中...";
                setTextColor(renderStatusTexts[i], [0.2, 0.4, 0.8, 1]);
                outputStepContainer.layout.layout(true);

                var settings = { importBack: importActiveStates[i] && importActiveStates[i].value };
                var success = renderCompToSequence(comp, projectDir, settings);

                if (success) {
                    renderStatusTexts[i].text = "完成";
                    setTextColor(renderStatusTexts[i], [0.2, 0.6, 0.2, 1]);
                } else {
                    renderStatusTexts[i].text = "出错";
                    setTextColor(renderStatusTexts[i], [0.8, 0.2, 0.2, 1]);
                }
                outputStepContainer.layout.layout(true);
            }

            alert("输出处理完成！");
        } else {
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

            executeWorkflow(sourceComp, baseName, presetFile, stepActiveStates);
        }
    };

    // ================== 初始化 ==================
    detectCurrentComp();
    refreshPresetList();

    return win;
}
