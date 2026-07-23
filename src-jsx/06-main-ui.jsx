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
        try { relayoutFuncButtons(); } catch(e) {}
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

    // ================== 当前合成信息（hover显示） ==================
    var currentCompName = "（无）";

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
    nameInput.helpTip = "输入基础名称，源合成将被重命名为此名称\n当前合成: " + currentCompName;
    nameInput.onChange = function() {
        try {
            updateStepPreview();
            refreshOutputUI();
            tabContent.layout.layout(true);
        } catch(e) {
            logMessage("nameInput.onChange 出错: " + (e.message || e.toString()), LOG_LEVEL.ERROR, "UI");
        }
    };

    function makeIconButton(parent, symbol, tip) {
        var btn = parent.add("iconbutton", undefined, undefined, {style: "toolbutton"});
        btn.text = symbol;
        btn.helpTip = tip;
        btn.preferredSize = [22, 22];
        return btn;
    }

    var btnRefresh = nameGroup.add("iconbutton", undefined, ICON_DATA.refresh, {style: "toolbutton"});
    btnRefresh.helpTip = "重新获取当前活动合成";
    btnRefresh.preferredSize = [22, 22];
    var btnGetProject = nameGroup.add("iconbutton", undefined, ICON_DATA.getProject, {style: "toolbutton"});
    btnGetProject.helpTip = "取项目名 → 填入输入框";
    btnGetProject.preferredSize = [22, 22];

    function stripKnownSuffixes(name) {
        var presetFile = getSelectedPresetFile();
        if (!presetFile) return name;
        var presetData = loadPreset(presetFile);
        if (!presetData || !presetData.steps) return name;
        for (var si = 0; si < presetData.steps.length; si++) {
            var sfx = presetData.steps[si].suffix;
            if (sfx && name.length > sfx.length && name.lastIndexOf(sfx) === name.length - sfx.length) {
                return name.substring(0, name.length - sfx.length);
            }
        }
        return name;
    }

    function detectCurrentComp() {
        var name = getActiveCompName();
        if (name) {
            currentCompName = name;
            nameInput.helpTip = "输入基础名称，源合成将被重命名为此名称\n当前合成: " + currentCompName;
            if (!nameInput.text || nameInput.text === "") {
                nameInput.text = stripKnownSuffixes(name);
            }
        } else {
            currentCompName = "（无活动合成）";
            nameInput.helpTip = "输入基础名称，源合成将被重命名为此名称\n当前合成: " + currentCompName;
        }
    }

    btnRefresh.onClick = function() {
        try {
            detectCurrentComp();
            updateStepPreview();
            refreshOutputUI();
            tabContent.layout.layout(true);
        } catch(e) {
            logMessage("btnRefresh.onClick 出错: " + (e.message || e.toString()), LOG_LEVEL.ERROR, "UI");
            alert("刷新出错: " + (e.message || e.toString()));
        }
    };



    btnGetProject.onClick = function() {
        try {
            if (app.project && app.project.file) {
                var projFile = app.project.file.name.replace(/\.[^\.]+$/, "");
                var projName = decodeUrlString(projFile);
                nameInput.text = projName;
                logMessage("已获取项目文件名: " + projName, LOG_LEVEL.NORMAL, "UI");
            } else {
                alert("当前项目尚未保存！");
            }
        } catch(e) {
            logMessage("btnGetProject.onClick 出错: " + (e.message || e.toString()), LOG_LEVEL.ERROR, "UI");
            alert("获取项目名出错: " + (e.message || e.toString()));
        }
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
        try {
            updateStepPreview();
            refreshOutputUI();
            if (syncTargetInput) syncTargetInput.text = getSyncTargetPath();
            tabContent.layout.layout(true);
        } catch(e) {
            logMessage("presetDropdown.onChange 出错: " + (e.message || e.toString()), LOG_LEVEL.ERROR, "UI");
        }
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

    var tabSync = tabGroup.add("button", undefined, "同步");
    tabSync.preferredSize.width = 80;

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
            chkRender._stepIdx = i;

            var label = row.add("statictext", undefined, "Step " + (i + 1) + ": " + s.name);
            label.preferredSize.width = 100;

            var chkImport = row.add("checkbox", undefined, "导入");
            chkImport.value = rc.importBack;
            chkImport.preferredSize.width = 65;
            chkImport._stepIdx = i;

            var status = row.add("statictext", undefined, "待渲染");
            status.alignment = ["right", "center"];
            status.preferredSize.width = 80;
            status.margins = [0, 0, 4, 0];
            setTextColor(status, [0.5, 0.5, 0.5, 1]);

            chkRender._chkImport = chkImport;
            chkRender.onClick = function() {
                this._chkImport.enabled = this.value;
                saveCurrentRenderState(this._stepIdx);
            };
            chkImport.onClick = function() {
                saveCurrentRenderState(this._stepIdx);
            };

            renderRows.push(row);
            renderActiveStates.push(chkRender);
            importActiveStates.push(chkImport);
            renderStatusTexts.push(status);
        }
        outputStepContainer.layout.layout(true);
    }

    function saveCurrentRenderState(stepIdx) {
        var pf = getSelectedPresetFile();
        if (!pf) return;
        var pd = loadPreset(pf);
        if (!pd || !pd.steps || !pd.steps[stepIdx]) return;
        if (!pd.steps[stepIdx].render) pd.steps[stepIdx].render = {};
        pd.steps[stepIdx].render.enabled = renderActiveStates[stepIdx].value;
        pd.steps[stepIdx].render.importBack = importActiveStates[stepIdx].value;
        savePreset(pf, pd);
    }

    // --- 同步面板 ---
    var syncGroup, syncPanel, syncStepContainer, syncStepButtons, syncStepActiveStates;
    var syncStepTipLine, syncTargetRow, syncTargetLabel, syncTargetInput, syncStatusText;
    try {
        syncGroup = tabContent.add("group");
        syncGroup.orientation = "column";
        syncGroup.alignChildren = ["fill", "fill"];
        syncGroup.alignment = ["fill", "fill"];
        syncGroup.spacing = 4;
        syncGroup.margins = 6;
        syncGroup.visible = false;

        syncPanel = syncGroup.add("panel");
        syncPanel.orientation = "column";
        syncPanel.alignChildren = ["fill", "top"];
        syncPanel.alignment = ["fill", "fill"];
        syncPanel.spacing = 3;
        syncPanel.margins = 4;
        syncPanel.text = "同步步骤";

        syncStepContainer = syncPanel.add("group");
        syncStepContainer.orientation = "column";
        syncStepContainer.alignChildren = ["fill", "top"];
        syncStepContainer.alignment = ["fill", "top"];
        syncStepContainer.spacing = 2;
        syncStepContainer.margins = [0, 0, 0, 0];

        syncStepButtons = [];
        syncStepActiveStates = [];

        syncStepTipLine = syncPanel.add("statictext", undefined, "点击切换 | Ctrl+点击单步执行");
        syncStepTipLine.alignment = ["center", "bottom"];
        syncStepTipLine.margins = [0, 2, 0, 0];

        syncTargetRow = syncPanel.add("group");
        syncTargetRow.orientation = "row";
        syncTargetRow.alignment = ["fill", "top"];
        syncTargetRow.alignChildren = ["left", "center"];
        syncTargetRow.spacing = 4;
        syncTargetRow.margins = [0, 4, 0, 0];

        syncTargetLabel = syncTargetRow.add("statictext", undefined, "目标路径:");
        syncTargetLabel.alignment = ["left", "center"];

        syncTargetInput = syncTargetRow.add("edittext", undefined, "");
        syncTargetInput.alignment = ["fill", "center"];
        syncTargetInput.characters = 30;

        syncStatusText = syncPanel.add("statictext", undefined, "状态: 就绪");
    } catch(e) {
        alert("同步面板创建失败: " + (e.message || e.toString()) + "\n行号: " + e.line);
    }

    var currentTab = "organize";
    var tabHovered = null; // 跟踪哪个 tab 被 hover

    function showOrganizeTab() {
        currentTab = "organize";
        if (organizeGroup) organizeGroup.visible = true;
        if (outputGroup) outputGroup.visible = false;
        if (syncGroup) syncGroup.visible = false;
        tabContent.layout.layout(true);
    }

    function showOutputTab() {
        currentTab = "output";
        if (organizeGroup) organizeGroup.visible = false;
        if (outputGroup) outputGroup.visible = true;
        if (syncGroup) syncGroup.visible = false;
        refreshOutputUI();
        tabContent.layout.layout(true);
    }

    function showSyncTab() {
        currentTab = "sync";
        if (organizeGroup) organizeGroup.visible = false;
        if (outputGroup) outputGroup.visible = false;
        if (syncGroup) syncGroup.visible = true;
        refreshSyncUI();
        tabContent.layout.layout(true);
    }

    function executeAllSync() {
        if (!app.project.file) { alert("请先保存项目文件！"); return; }
        for (var i = 0; i < syncStepActiveStates.length; i++) {
            if (syncStepActiveStates[i]) {
                var ok = executeSyncStep(i);
                if (!ok) {
                    alert("同步步骤 " + (i + 1) + " 执行失败，终止后续步骤。");
                    break;
                }
            }
        }
    }

    function executeCurrentTab() {
        if (currentTab === "sync") {
            executeAllSync();
        } else if (currentTab === "output") {
            var baseName = stripKnownSuffixes(nameInput.text);
            if (!baseName) { alert("请输入基础名称！"); return; }
            if (!app.project.file) { alert("请先保存项目文件！"); return; }
            var presetFile = getSelectedPresetFile();
            if (!presetFile) { alert("请先选择一个预设！"); return; }
            var projectDir = app.project.file.parent.fsName;
            var presetData = loadPreset(presetFile);
            if (!presetData || !presetData.steps) { alert("预设数据无效！"); return; }
            if (renderActiveStates.length === 0) { alert("没有可渲染的步骤！"); return; }
            for (var i = 0; i < presetData.steps.length; i++) {
                if (!renderActiveStates[i] || !renderActiveStates[i].value) continue;
                var s = presetData.steps[i];
                var compName = resolveOutputName(baseName, s);
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
            if (!sourceComp) { alert("请先在 After Effects 中选择一个活动合成！"); return; }
            var baseName = nameInput.text;
            if (!baseName) { alert("请输入基础名称！"); return; }
            var presetFile = getSelectedPresetFile();
            if (!presetFile) { alert("请先选择一个预设！"); return; }
            executeWorkflow(sourceComp, baseName, presetFile, stepActiveStates);
        }
    }

    function updateTabText() {
        var ctrlKey = ScriptUI.environment.keyboardState.ctrlKey;
        if (tabHovered === "organize") {
            if (ctrlKey) {
                tabOrganize.text = "执行";
                tabOrganize.helpTip = "执行工作流 (Ctrl)";
            } else {
                tabOrganize.text = "整理";
                tabOrganize.helpTip = "切换到整理标签 | Ctrl+单击: 执行工作流";
            }
        } else if (tabHovered === "output") {
            if (ctrlKey) {
                tabOutput.text = "执行";
                tabOutput.helpTip = "执行输出 (Ctrl)";
            } else {
                tabOutput.text = "输出";
                tabOutput.helpTip = "切换到输出标签 | Ctrl+单击: 执行输出";
            }
        } else if (tabHovered === "sync") {
            if (ctrlKey) {
                tabSync.text = "执行";
                tabSync.helpTip = "执行同步 (Ctrl)";
            } else {
                tabSync.text = "同步";
                tabSync.helpTip = "切换到同步标签 | Ctrl+单击: 执行同步";
            }
        }
    }

    // 鼠标悬停事件
    tabOrganize.addEventListener("mouseover", function() {
        tabHovered = "organize";
        updateTabText();
    });
    tabOrganize.addEventListener("mouseout", function() {
        tabHovered = null;
        tabOrganize.text = "整理";
        tabOrganize.helpTip = "切换到整理标签 | Ctrl+单击: 执行工作流";
    });
    tabOutput.addEventListener("mouseover", function() {
        tabHovered = "output";
        updateTabText();
    });
    tabOutput.addEventListener("mouseout", function() {
        tabHovered = null;
        tabOutput.text = "输出";
        tabOutput.helpTip = "切换到输出标签 | Ctrl+单击: 执行输出";
    });

    tabSync.addEventListener("mouseover", function() {
        tabHovered = "sync";
        updateTabText();
    });
    tabSync.addEventListener("mouseout", function() {
        tabHovered = null;
        tabSync.text = "同步";
        tabSync.helpTip = "切换到同步标签 | Ctrl+单击: 执行同步";
    });

    // 键盘事件监听，实时更新 tab 文本
    win.addEventListener("keydown", function() {
        if (tabHovered) updateTabText();
    });
    win.addEventListener("keyup", function() {
        if (tabHovered) updateTabText();
    });

    tabOrganize.onClick = function() {
        try {
            if (ScriptUI.environment.keyboardState.ctrlKey) {
                executeCurrentTab();
            } else {
                showOrganizeTab();
            }
        } catch(e) {
            alert("整理Tab出错: " + (e.message || e.toString()) + "\n行号: " + e.line);
        }
    };
    tabOutput.onClick = function() {
        try {
            if (ScriptUI.environment.keyboardState.ctrlKey) {
                executeCurrentTab();
            } else {
                showOutputTab();
            }
        } catch(e) {
            alert("输出Tab出错: " + (e.message || e.toString()) + "\n行号: " + e.line);
        }
    };

    tabSync.onClick = function() {
        try {
            if (ScriptUI.environment.keyboardState.ctrlKey) {
                executeCurrentTab();
            } else {
                showSyncTab();
            }
        } catch(e) {
            alert("同步Tab出错: " + (e.message || e.toString()) + "\n行号: " + e.line);
        }
    };

    // ================== 功能按钮面板 ==================
    var funcPanel = win.add("panel");
    funcPanel.orientation = "column";
    funcPanel.alignment = ["fill", "top"];
    funcPanel.alignChildren = ["fill", "top"];
    funcPanel.spacing = 4;
    funcPanel.margins = 6;
    funcPanel.text = "功能";

    var funcRow = funcPanel.add("group");
    funcRow.orientation = "row";
    funcRow.alignment = ["fill", "top"];
    funcRow.alignChildren = ["fill", "center"];
    funcRow.spacing = 6;
    funcRow.margins = [0, 0, 0, 0];

    var funcButtons = [];

    function addFuncButton(label, iconKey, tip) {
        if (iconKey && typeof ICON_DATA !== 'undefined' && ICON_DATA[iconKey]) {
            try {
                var group = funcRow.add("group");
                group.orientation = "column";
                group.alignChildren = ["center", "center"];
                group.spacing = 0;
                group.helpTip = tip || "";
                group.preferredSize = [32, 36];

                var icon = group.add("iconbutton", undefined, ICON_DATA[iconKey], {style: "toolbutton"});
                icon.preferredSize = [20, 20];
                icon.helpTip = tip || "";

                var lbl = group.add("statictext", undefined, label);
                lbl.alignment = ["center", "center"];

                funcButtons.push(group);
                return icon;
            } catch (e) {
                // iconbutton failed, will fall through to text button below
            }
        }
        var btn = funcRow.add("button", undefined, label);
        btn.helpTip = tip || "";
        btn.preferredSize.height = 22;
        funcButtons.push(btn);
        return btn;
    }

    function relayoutFuncButtons() {
        if (funcButtons.length === 0) return;
        var pw = funcPanel.preferredSize.width;
        var totalWidth = pw - 12;
        var spacing = funcRow.spacing * (funcButtons.length - 1);
        var unitWidth = Math.max(32, (totalWidth - spacing) / funcButtons.length);
        for (var fi = 0; fi < funcButtons.length; fi++) {
            var item = funcButtons[fi];
            if (item.type === "group") {
                item.preferredSize.width = unitWidth;
            } else if (item.type === "iconbutton" || item.type === "image") {
                item.preferredSize = [20, 20];
            } else {
                item.preferredSize.width = Math.max(60, unitWidth);
            }
        }
        funcRow.layout.layout(true);
    }

    var btnMask = addFuncButton("蒙版", "addMask", "单击: 创建蒙版 | Ctrl+单击: 设置轨道遮罩");
    btnMask.onClick = function() {
        try {
            if (ScriptUI.environment.keyboardState.ctrlKey) {
                toggleTrackMatte();
            } else {
                createMaskLayer();
            }
        } catch(e) {
            alert("蒙版按钮出错: " + (e.message || e.toString()));
        }
    };

    var btnImportBg = addFuncButton("背景", "importBg", "从预设目录导入 bg.png 作为背景图层");
    btnImportBg.onClick = function() {
        try { importBgImage(); } catch(e) { alert("背景按钮出错: " + (e.message || e.toString())); }
    };

    var btnPag = addFuncButton("PAG", "pagExport", "独显选中图层 → 打标记 → 预合成为 animated → 生成高光图");
    btnPag.onClick = function() {
        try { pagExport(); } catch(e) { alert("PAG按钮出错: " + (e.message || e.toString())); }
    };

    var btnImportTemplate = addFuncButton("模板", "importTemplate", "单击: 导入高光图并替换模板末尾图层 | Ctrl+单击: 渲染当前帧为高光图");
    btnImportTemplate.onClick = function() {
        try {
            if (ScriptUI.environment.keyboardState.ctrlKey) {
                renderHighlightFrame();
            } else {
                importTemplateAndReplace();
            }
        } catch(e) { alert("模板按钮出错: " + (e.message || e.toString())); }
    };

    var btnOpenSVGA = addFuncButton("SVGA", "svgaPanel", "打开SVGAConverter面板");
    btnOpenSVGA.onClick = function() {
        try {
            var cmdId = app.findMenuCommandId("SVGAConverter_AE");
            if (cmdId !== 0) {
                app.executeCommand(cmdId);
            } else {
                alert("未找到 SVGAConverter_AE 面板命令！\n请确认该扩展已安装。");
            }
        } catch(e) {
            alert("SVGA按钮出错: " + (e.message || e.toString()));
        }
    };

    var btnCopyBanner = addFuncButton("Banner", "copyBanner", "根据合成时长选择并复制PAG文件到输出文件夹");
    btnCopyBanner.onClick = function() {
        try { copyBannerPag(); } catch(e) { alert("Banner按钮出错: " + (e.message || e.toString())); }
    };

    var btnCompress = addFuncButton("压缩", "autoTiny", "打开 Auto_Tinify 图片压缩工具");
    btnCompress.onClick = function() {
        try {
            var scriptPath = EXT_SCRIPTS.compress;
            if (!scriptPath) {
                alert("未配置压缩脚本路径！\n请在 01-constants.jsx 中设置 EXT_SCRIPTS.compress");
                return;
            }
            var scriptFile = new File(scriptPath);
            if (!scriptFile.exists) {
                alert("压缩脚本不存在: " + scriptPath);
                return;
            }
            $.evalFile(scriptFile);
        } catch(e) {
            alert("加载压缩脚本出错: " + e.toString());
        }
    };

    var btnSortOutput = addFuncButton("输出", "sortOutput", "整理输出文件夹文件并生成批处理");
    btnSortOutput.onClick = function() {
        try { sortOutputFiles(); } catch(e) { alert("整理输出按钮出错: " + (e.message || e.toString())); }
    };

    // ================== 第二行功能按钮 ==================
    var funcRow2 = funcPanel.add("group");
    funcRow2.orientation = "row";
    funcRow2.alignment = ["fill", "top"];
    funcRow2.alignChildren = ["fill", "center"];
    funcRow2.spacing = 6;
    funcRow2.margins = [0, 0, 0, 0];

    var funcButtons2 = [];

    function addIconButton2(label, iconKey, tip) {
        if (iconKey && typeof ICON_DATA !== 'undefined' && ICON_DATA[iconKey]) {
            try {
                var group = funcRow2.add("group");
                group.orientation = "column";
                group.alignChildren = ["center", "center"];
                group.spacing = 0;
                group.helpTip = tip || "";
                group.preferredSize = [32, 36];

                var icon = group.add("iconbutton", undefined, ICON_DATA[iconKey], {style: "toolbutton"});
                icon.preferredSize = [20, 20];
                icon.helpTip = tip || "";

                var lbl = group.add("statictext", undefined, label);
                lbl.alignment = ["center", "center"];

                funcButtons2.push(group);
                return icon;
            } catch (e) {}
        }
        var btn = funcRow2.add("button", undefined, label);
        btn.helpTip = tip || "";
        btn.preferredSize.height = 26;
        funcButtons2.push(btn);
        return btn;
    }

    function relayoutFuncButtons2() {
        if (funcButtons2.length === 0) return;
        var pw = funcPanel.preferredSize.width;
        var totalWidth = pw - 12;
        var spacing = funcRow2.spacing * (funcButtons2.length - 1);
        var unitWidth = Math.max(32, (totalWidth - spacing) / funcButtons2.length);
        for (var fi = 0; fi < funcButtons2.length; fi++) {
            var item = funcButtons2[fi];
            if (item.type === "group") {
                item.preferredSize.width = unitWidth;
            } else if (item.type === "iconbutton" || item.type === "image") {
                item.preferredSize = [20, 20];
            } else {
                item.preferredSize.width = Math.max(60, unitWidth);
            }
        }
        funcRow2.layout.layout(true);
    }

    var btnSaveProject = addIconButton2("保存", "saveProject", "自动保存未保存的项目到素材文件所在目录");
    btnSaveProject.onClick = function() {
        try { autoSaveProject(); } catch(e) { alert("保存按钮出错: " + (e.message || e.toString())); }
    };

    var btnRenderMp4 = addIconButton2("渲染合成", "renderMp4", "将'预览'文件夹中的序列帧重命名并合成为MP4视频");
    btnRenderMp4.onClick = function() {
        try { renderPreviewToMp4(); } catch(e) { alert("渲染合成按钮出错: " + (e.message || e.toString())); }
    };
    relayoutFuncButtons2();

    // ================== 内置功能函数 ==================

    function createMaskLayer() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("请先选择一个合成！");
            return;
        }

        app.beginUndoGroup("Create Simple Mask with Dropdown");

        try {
            var shapeLayer = comp.layers.addShape();
            shapeLayer.name = "蒙版";
            var opacityProp = shapeLayer.property("Transform").property("Opacity");

            var contents = shapeLayer.property("Contents");
            var ellipseGroup = contents.addProperty("ADBE Vector Group");
            var ellipseShape = ellipseGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
            var sizeProperty = ellipseShape.property("ADBE Vector Ellipse Size");
            if (sizeProperty && sizeProperty.canSetExpression) {
                sizeProperty.expression = [
                    'var w = thisComp.width * effect("宽度倍数")(1);',
                    'var h;',
                    'var v = effect("下拉菜单控件")(1);',
                    'if (v == 1) {',
                    '  h = thisComp.height / 2;',
                    '} else if (v == 2) {',
                    '  h = thisComp.height * 2 / 3;',
                    '} else if (v == 3) {',
                    '  h = thisComp.height * 3 / 4;',
                    '} else if (v == 4) {',
                    '  h = thisComp.height;',
                    '} else {',
                    '  h = thisComp.height / 2;',
                    '}',
                    'h += effect("动态调整")(1);',
                    '[w, h]'
                ].join("\n");
            }

            var fill = ellipseGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
            if (fill) fill.property("Color").setValue([0, 0, 0, 1]);

            var dropdownEffect = shapeLayer.property("Effects").addProperty("ADBE Dropdown Control");
            if (dropdownEffect) {
                var menuProperty = dropdownEffect.property(1);
                if (menuProperty && typeof menuProperty.setPropertyParameters === "function") {
                    menuProperty.setPropertyParameters(["半屏", "三分二", "四分三", "全屏"]);
                }
            }

            var sliderEffect = shapeLayer.property("Effects").addProperty("ADBE Slider Control");
            if (sliderEffect) {
                sliderEffect.name = "动态调整";
                var sliderProp = sliderEffect.property(1);
                if (sliderProp) sliderProp.setValue(0);
            }

            var widthScale = shapeLayer.property("Effects").addProperty("ADBE Slider Control");
            if (widthScale) {
                widthScale.name = "宽度倍数";
                var widthScaleProp = widthScale.property(1);
                if (widthScaleProp) widthScaleProp.setValue(3);
            }

            var blurSlider = shapeLayer.property("Effects").addProperty("ADBE Slider Control");
            var blurSliderProp = null;
            if (blurSlider) {
                blurSlider.name = "模糊控制";
                blurSliderProp = blurSlider.property(1);
                if (blurSliderProp) blurSliderProp.setValue(50);
            }

            var enableFadeCheckbox = shapeLayer.property("Effects").addProperty("ADBE Checkbox Control");
            if (enableFadeCheckbox) {
                enableFadeCheckbox.name = "启用渐变";
                var enableFadeProp = enableFadeCheckbox.property(1);
                if (enableFadeProp) enableFadeProp.setValue(1);
            }

            var boxBlurEffect = shapeLayer.property("Effects").addProperty("ADBE Box Blur2");

            var frameRate = comp.frameRate;
            var compDuration = comp.duration;

            shapeLayer.marker.setValueAtTime(0, new MarkerValue("开始渐显"));
            shapeLayer.marker.setValueAtTime(12 / frameRate, new MarkerValue("渐显完成"));
            shapeLayer.marker.setValueAtTime(compDuration - (8 / frameRate), new MarkerValue("开始渐隐"));
            shapeLayer.marker.setValueAtTime(compDuration - (1 / frameRate), new MarkerValue("渐隐完成"));

            if (opacityProp && opacityProp.canSetExpression) {
                opacityProp.expression = [
                    'var enableFade = effect("启用渐变")(1);',
                    '',
                    'if (enableFade == 0) {',
                    '    100;',
                    '} else {',
                    '    var marker1 = null;',
                    '    var marker2 = null;',
                    '    var marker3 = null;',
                    '    var marker4 = null;',
                    '',
                    '    for (var i = 1; i <= thisLayer.marker.numKeys; i++) {',
                    '        var c = thisLayer.marker.key(i).comment;',
                    '        var t = thisLayer.marker.key(i).time;',
                    '        if (c == "开始渐显") marker1 = t;',
                    '        else if (c == "渐显完成") marker2 = t;',
                    '        else if (c == "开始渐隐") marker3 = t;',
                    '        else if (c == "渐隐完成") marker4 = t;',
                    '    }',
                    '',
                    '    if (marker1 == null || marker2 == null || marker3 == null || marker4 == null) {',
                    '        0;',
                    '    } else if (time < marker1) {',
                    '        0;',
                    '    } else if (time < marker2) {',
                    '        linear(time, marker1, marker2, 0, 100);',
                    '    } else if (time < marker3) {',
                    '        100;',
                    '    } else if (time < marker4) {',
                    '        linear(time, marker3, marker4, 100, 0);',
                    '    } else {',
                    '        0;',
                    '    }',
                    '}'
                ].join("\n");
            }

            if (boxBlurEffect && blurSliderProp) {
                app.scheduleTask(
                    'var lyr = app.project.activeItem.layer("蒙版");'
                    + 'var fx = lyr.effect("快速方框模糊")||lyr.effect("Box Blur")||lyr.effect("Fast Box Blur");'
                    + 'var ctrl = lyr.effect("模糊控制");'
                    + 'if(fx&&ctrl){'
                    + 'try{fx.property(1).expression = \'effect("模糊控制")(1);\';}catch(e){}'
                    + '}',
                    100,
                    false
                );
            }
        } catch(e) {
            alert("创建蒙版出错: " + e.toString());
        }

        app.endUndoGroup();
    }

    function toggleTrackMatte() {
        var activeComp = app.project.activeItem;
        if (!(activeComp instanceof CompItem)) {
            alert("请选择一个合成");
            return;
        }

        var maskLayer = null;
        for (var i = 1; i <= activeComp.numLayers; i++) {
            if (activeComp.layer(i).name === "蒙版") {
                maskLayer = activeComp.layer(i);
                break;
            }
        }

        if (!maskLayer) {
            alert("未找到名为\"蒙版\"的图层");
            return;
        }

        var isMaskSelected = false;
        for (var i = 0; i < activeComp.selectedLayers.length; i++) {
            if (activeComp.selectedLayers[i] === maskLayer) {
                isMaskSelected = true;
                break;
            }
        }

        var originalLockState = maskLayer.locked;
        if (originalLockState) maskLayer.locked = false;

        app.beginUndoGroup(isMaskSelected ? "取消轨道遮罩" : "设置轨道遮罩");

        try {
            for (var i = 1; i <= activeComp.numLayers; i++) {
                var currentLayer = activeComp.layer(i);
                if (currentLayer !== maskLayer && currentLayer instanceof AVLayer) {
                    if (isMaskSelected) {
                        currentLayer.trackMatteType = TrackMatteType.NO_TRACK_MATTE;
                    } else {
                        maskLayer.moveBefore(currentLayer);
                        currentLayer.trackMatteType = TrackMatteType.ALPHA;
                    }
                }
            }

            if (!isMaskSelected) {
                maskLayer.moveToBeginning();
            }
        } catch(e) {
            alert("设置轨道遮罩出错: " + e.toString());
        }

        app.endUndoGroup();

        if (originalLockState) maskLayer.locked = true;
    }

    function importBgImage() {
        var currentComp = app.project.activeItem;
        if (!(currentComp instanceof CompItem)) {
            alert("请先选择一个合成！");
            return;
        }

        // 1. 找预览合成
        var previewComps = [];
        for (var i = 1; i <= app.project.items.length; i++) {
            var item = app.project.items[i];
            if (item instanceof CompItem) {
                var cName = decodeUrlString(item.name);
                if (/_预览$/.test(cName)) {
                    previewComps.push(item);
                }
            }
        }

        // 2. 确定目标合成
        var targetComp = null;
        if (previewComps.length === 0) {
            targetComp = currentComp;
        } else if (previewComps.length === 1) {
            var pc = previewComps[0];
            var usePreview = confirm("找到预览合成 \"" + decodeUrlString(pc.name) + "\"，是否将背景导入到该合成？\n\n是 = 导入到预览合成\n否 = 导入到当前合成", true, "选择目标合成");
            if (usePreview) {
                targetComp = pc;
            } else {
                targetComp = currentComp;
            }
        } else {
            var listDialog = new Window("dialog", "选择目标合成");
            listDialog.orientation = "column";
            listDialog.alignChildren = "left";
            listDialog.add("statictext", undefined, "找到多个预览合成，请选择背景导入目标：");

            var listBox = listDialog.add("listbox", undefined, []);
            listBox.preferredSize.width = 300;
            listBox.preferredSize.height = 120;

            for (var pi = 0; pi < previewComps.length; pi++) {
                listBox.add("item", decodeUrlString(previewComps[pi].name));
            }
            listBox.add("item", "--- 导入到当前合成");
            listBox.selection = 0;

            var btnGroup = listDialog.add("group");
            btnGroup.alignment = "right";
            var okBtn = btnGroup.add("button", undefined, "确定");
            var cancelBtn = btnGroup.add("button", undefined, "取消");

            var chosenIdx = null;
            okBtn.onClick = function() {
                chosenIdx = listBox.selection ? listBox.selection.index : null;
                listDialog.close();
            };
            cancelBtn.onClick = function() { listDialog.close(); };

            listDialog.show();
            if (chosenIdx === null) return;

            if (chosenIdx < previewComps.length) {
                targetComp = previewComps[chosenIdx];
            } else {
                targetComp = currentComp;
            }
        }

        // 3. 询问是否清理其他合成
        var shouldCleanup = confirm("是否同时清理其他合成中名为 \"bg\" 的图层？\n\n注意：此操作不可撤销（跨合成 undo 不完整）", false, "清理背景图层");

        // 4. 找目标合成中所有 bg 图层（含 bg.png）
        var hasBgLayer = false;
        for (var i = 1; i <= targetComp.layers.length; i++) {
            var l = targetComp.layer(i);
            if (l && (l.name === "bg" || l.name === "bg.png")) {
                hasBgLayer = true;
                break;
            }
        }

        // 5. 已有背景图层 → 提醒后停止
        if (hasBgLayer) {
            alert("目标合成 \"" + decodeUrlString(targetComp.name) + "\" 已有背景图层，请手动删除后重试。");
            return;
        }

        // 6. 重新导入：文件准备（undo 外部）
        if (!app.project.file) {
            alert("请先保存项目文件！");
            return;
        }

        var projectDir = app.project.file.parent.fsName;
        var bgFile = new File(projectDir + "/bg.png");

        if (!bgFile.exists) {
            var sourceFile = new File(getPresetResourcePath("bg.png"));
            if (!sourceFile.exists) {
                alert("找不到 bg.png 文件！\n请将 bg.png 放置在预设目录:\n" + configFolder.fsName);
                return;
            }
            if (!sourceFile.copy(bgFile.fsName)) {
                alert("复制 bg.png 到项目目录失败！");
                return;
            }
        }

        // 7. 导入 + 清理（一个 undo group）
        app.beginUndoGroup("Import bg.png");
        try {
            var importOptions = new ImportOptions(bgFile);
            var importedFile = app.project.importFile(importOptions);

            var bgLayer = targetComp.layers.add(importedFile);
            bgLayer.name = "bg";

            var compW = targetComp.width;
            var imgW = bgLayer.source.width;
            var imgH = bgLayer.source.height;

            var sf = (compW / imgW) * 100;
            bgLayer.transform.scale.setValue([sf, sf]);
            bgLayer.moveToEnd();

            if (shouldCleanup) cleanupBgFromOtherComps(targetComp);
        } catch (e) {
            alert("导入背景出错: " + e.toString());
        }
        app.endUndoGroup();
    }

    function cleanupBgFromOtherComps(keepComp) {
        try {
            for (var ci = 1; ci <= app.project.items.length; ci++) {
                var item = app.project.items[ci];
                if (item instanceof CompItem && item !== keepComp) {
                    for (var li = item.layers.length; li >= 1; li--) {
                        var l = item.layer(li);
                        if (l && (l.name === "bg" || l.name === "bg.png")) {
                            l.remove();
                        }
                    }
                }
            }
        } catch(e) {
            alert("清理其他合成背景图层出错: " + e.toString());
        }
    }

    function pagExport() {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            alert("请选择一个合成！");
            return;
        }
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("请选择至少一个图层！");
            return;
        }

        app.beginUndoGroup("PAG Export");

        try {
            for (var i = 1; i <= comp.layers.length; i++) {
                comp.layers[i].enabled = false;
            }
            for (var i = 0; i < selectedLayers.length; i++) {
                selectedLayers[i].enabled = true;
            }

            var shaderCode = "#version 100\nprecision mediump float;\nvarying highp vec2 vertexColor;\nuniform float uWidth;\nuniform float uHeight;\nuniform sampler2D inputImageTexture;\nvoid main() {\nvec2 uv = vertexColor;\nvec4 color = texture2D(inputImageTexture, uv);\nfloat sharpness = 0.3;\nfloat xOffset = 1./uWidth;\nfloat yOffset = 1./uHeight;\nvec4 neighbors[4];\nneighbors[0]=texture2D(inputImageTexture,uv+vec2(-xOffset,-yOffset));\nneighbors[1]=texture2D(inputImageTexture,uv+vec2(xOffset,yOffset));\nneighbors[2]=texture2D(inputImageTexture,uv+vec2(xOffset,-yOffset));\nneighbors[3]=texture2D(inputImageTexture,uv+vec2(-xOffset,yOffset));\nvec4 sharpenedColor=color*(sharpness*4.+1.);\nsharpenedColor-=neighbors[0]*sharpness;\nsharpenedColor-=neighbors[1]*sharpness;\nsharpenedColor-=neighbors[2]*sharpness;\nsharpenedColor-=neighbors[3]*sharpness;\ngl_FragColor=sharpenedColor;\n}";
            for (var i = 0; i < selectedLayers.length; i++) {
                try {
                    var myMarker = new MarkerValue("Shader");
                    myMarker.comment = shaderCode;
                    selectedLayers[i].property("Marker").setValueAtTime(comp.time, myMarker);
                } catch(e) {}
            }

            var layerIndices = [];
            for (var i = 0; i < selectedLayers.length; i++) {
                layerIndices.push(selectedLayers[i].index);
            }
            comp.layers.precompose(layerIndices, "animated", true);
        } catch(e) {
            alert("PAG导出出错: " + e.toString());
        }

        app.endUndoGroup();

        if (confirm("是否创建高光图合成？\n\n是 = 创建 675×1125 的高光图合成并打开预览\n否 = 仅完成预合成")) {
            app.beginUndoGroup("PAG 高光图");
            try {
                var newComp = app.project.items.addComp("高光图", 675, 1125, comp.pixelAspect, comp.duration, comp.frameRate);
                var precompLayer = newComp.layers.add(comp);
                var scaleFactor = (newComp.width / comp.width) * 100;
                precompLayer.property("Scale").setValue([scaleFactor, scaleFactor]);
                precompLayer.property("Position").setValue([newComp.width / 2, newComp.height / 2]);
                newComp.openInViewer();
            } catch(e) {
                alert("创建高光图合成出错: " + e.toString());
            }
            app.endUndoGroup();
        }
    }

    function renderHighlightFrame() {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            alert("请先选择一个活动合成！");
            return;
        }

        if (!app.project.file) {
            alert("请先保存项目文件！");
            return;
        }

        var projectDir = app.project.file.parent.fsName;
        var outputFolder = new Folder(projectDir + "/输出");
        var currentTimeStr = comp.time.toFixed(2);

        var destFile = renderSingleFrame(comp, outputFolder, "高光图", comp.time);
        if (destFile) {
            alert("高光图已保存:\n" + destFile.fsName + "\n\n当前帧位置: " + currentTimeStr + "秒");
        } else {
            alert("渲染高光图失败！\n请检查渲染队列。");
        }
    }

    function importTemplateAndReplace() {
        if (!app.project.file) {
            alert("请先保存项目文件！");
            return;
        }

        var projectDir = app.project.file.parent.fsName;
        var templateFile = new File(projectDir + "/xx2.aep");

        if (!templateFile.exists) {
            var sourceFile = new File(getPresetResourcePath("xx2.aep"));
            if (!sourceFile.exists) {
                alert("找不到 xx2.aep 模板文件！\n请确保模板文件在预设目录:\n" + configFolder.fsName);
                return;
            }
            sourceFile.copy(templateFile.fsName);
            if (!templateFile.exists) {
                alert("复制 xx2.aep 到项目目录失败！");
                return;
            }
        }

        var matFolder = new Folder(projectDir + "/(素材)");
        if (!matFolder.exists) {
            var sourceMatFolder = new Folder(getPresetResourcePath("(素材)"));
            if (sourceMatFolder.exists) {
                copyFolderRecursively(sourceMatFolder, matFolder);
            }
        }

        app.beginUndoGroup("Import Template and Replace");
        try {
            var importedFile = app.project.importFile(new ImportOptions(templateFile));

            var projectFolder = app.project.file.parent;
            var subFolders = projectFolder.getFiles(function(item) { return item instanceof Folder; });

            var ggt = null;
            for (var fi = 0; fi < subFolders.length; fi++) {
                ggt = findHighlightImageInFolder(subFolders[fi]);
                if (ggt) break;
            }

            var fullscreenComp = null;
            for (var i = 1; i <= app.project.items.length; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem && item.name === "全屏礼物") {
                    fullscreenComp = item;
                    break;
                }
            }

            if (!fullscreenComp) {
                alert("未找到名为 '全屏礼物' 的合成！");
                app.endUndoGroup();
                return;
            }

            fullscreenComp.openInViewer();

            var lastLayer = fullscreenComp.layer(fullscreenComp.layers.length);

            if (!ggt) {
                alert("没有找到高光图（文件名含'高光图'的 PNG）！");
                app.endUndoGroup();
                return;
            }

            lastLayer.replaceSource(ggt, true);

            var opacityProperty = lastLayer.property("Opacity");
            if (opacityProperty.numKeys > 0) {
                var keyframes = [];
                for (var ki = 1; ki <= opacityProperty.numKeys; ki++) {
                    keyframes.push({ time: opacityProperty.keyTime(ki), value: opacityProperty.keyValue(ki) });
                }
                for (var kj = opacityProperty.numKeys; kj >= 1; kj--) {
                    opacityProperty.removeKey(kj);
                }
                for (var kk = 0; kk < keyframes.length; kk++) {
                    opacityProperty.setValueAtTime(keyframes[kk].time, keyframes[kk].value);
                }
            } else {
                opacityProperty.setValue(100);
            }
        } catch (e) {
            alert("导入模板出错: " + e.toString());
        }
        app.endUndoGroup();
    }

    function copyFolderRecursively(source, dest) {
        if (!dest.exists) dest.create();
        var items = source.getFiles();
        for (var fi = 0; fi < items.length; fi++) {
            if (items[fi] instanceof Folder) {
                var subDest = new Folder(dest.fsName + "/" + items[fi].name);
                copyFolderRecursively(items[fi], subDest);
            } else if (items[fi] instanceof File) {
                items[fi].copy(dest.fsName + "/" + items[fi].name);
            }
        }
    }

    function findHighlightImageInFolder(directory) {
        var items = directory.getFiles(function(f) {
            if (f instanceof File) {
                var name = decodeURIComponent(f.name.trim());
                return name.match(/.*高光图.*\.png$/i);
            }
            return false;
        });
        for (var fi2 = 0; fi2 < items.length; fi2++) {
            if (items[fi2] instanceof File) {
                var opts = new ImportOptions(items[fi2]);
                return app.project.importFile(opts);
            }
        }
        return null;
    }

    function copyBannerPag() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("请先选中一个合成！");
            return;
        }

        if (!app.project.file) {
            alert("请先保存项目文件！");
            return;
        }

        var duration = Math.round(comp.duration);
        var folderName = getBannerFolderName(duration);
        if (!folderName) {
            alert("未找到对应时长的文件夹！当前支持的时长范围：3-15秒");
            return;
        }

        var bannerDir = new Folder(getPresetResourcePath("banner/" + folderName));
        if (!bannerDir.exists) {
            alert("目标文件夹不存在: " + bannerDir.fsName);
            return;
        }

        var pagFile = bannerDir.openDlg("请选择PAG文件", "*.pag");
        if (!pagFile) return;

        var projectFolder = app.project.file.parent;
        var outputFolder = new Folder(projectFolder.fsName + "/输出");
        if (!outputFolder.exists) outputFolder.create();

        var destFile = new File(outputFolder.fsName + "/" + pagFile.name);
        pagFile.copy(destFile.fsName);
        alert("文件已复制到: " + destFile.fsName);
    }

    function getBannerFolderName(duration) {
        var exactMap = {
            3: "3s用的", 4: "4S用的", 5: "5S用的",
            6: "6S用的", 7: "7S用的", 8: "8S用的",
            11: "11S用的", 15: "15s用的"
        };
        if (exactMap[duration]) return exactMap[duration];
        if (duration >= 8 && duration <= 9) return "8-9S用的";
        if (duration >= 10 && duration <= 11) return "10-11S用的";
        if (duration >= 12 && duration <= 14) return "12-14S用的";
        return null;
    }

    function syncProjectFolder() {
        if (!app.project.file) {
            alert("请先保存项目文件！");
            return;
        }

        var projectFile = app.project.file;
        var projectDir = projectFile.parent;
        var projectName = decodeUrlString(projectFile.name.replace(/\.[^\.]+$/, "")); // 去掉扩展名并解码
        var targetFolderName = projectName + "文件夹";
        var targetFolder = new Folder(projectDir.fsName + "/" + targetFolderName);

        // 第一步：检查目标文件夹是否存在
        if (!targetFolder.exists) {
            alert("未找到文件夹：" + targetFolderName + "\n请在项目旁边创建该文件夹。");
            return;
        }

        // 定义源文件夹
        var sourceFolder = new Folder(projectDir.fsName + "/源文件");
        var outputFolder = new Folder(projectDir.fsName + "/输出");

        // 第二步：复制源文件和输出文件夹到目标文件夹
        app.beginUndoGroup("同步项目文件夹");
        try {
            var copiedItems = [];

            // 复制源文件夹
            if (sourceFolder.exists) {
                var destSource = new Folder(targetFolder.fsName + "/源文件");
                copyFolder(sourceFolder, destSource);
                copiedItems.push("源文件");
            }

            // 复制输出文件夹
            if (outputFolder.exists) {
                var destOutput = new Folder(targetFolder.fsName + "/输出");
                copyFolder(outputFolder, destOutput);
                copiedItems.push("输出");
            }

            if (copiedItems.length === 0) {
                alert("项目旁边没有找到'源文件'或'输出'文件夹！");
                return;
            }

            // 第三步：复制目标文件夹到网络共享目录
            var networkPath = "\\\\172.19.241.43\\互娱中台设计-文件共享\\A礼物";
            var networkDest = new Folder(networkPath + "/" + targetFolderName);

            try {
                copyFolder(targetFolder, networkDest);

                // 验证复制是否成功
                var verifyPassed = true;
                var verifyMsg = "";

                // 检查网络目录中的文件夹是否存在
                if (copiedItems.indexOf("源文件") >= 0) {
                    var verifySource = new Folder(networkDest.fsName + "/源文件");
                    if (!verifySource.exists) {
                        verifyPassed = false;
                        verifyMsg += "\n- 源文件夹未找到";
                    }
                }
                if (copiedItems.indexOf("输出") >= 0) {
                    var verifyOutput = new Folder(networkDest.fsName + "/输出");
                    if (!verifyOutput.exists) {
                        verifyPassed = false;
                        verifyMsg += "\n- 输出文件夹未找到";
                    }
                }

                // 检查源文件夹中的文件数量
                if (verifyPassed) {
                    var localCount = countFiles(targetFolder);
                    var remoteCount = countFiles(networkDest);
                    if (remoteCount < localCount) {
                        verifyPassed = false;
                        verifyMsg += "\n- 文件数量不匹配（本地：" + localCount + "，远程：" + remoteCount + "）";
                    }
                }

                if (verifyPassed) {
                    var confirmMsg = "同步完成并验证通过！\n\n已复制：" + copiedItems.join("、") + "\n目标：" + networkPath + "\\" + targetFolderName;
                    confirmMsg += "\n\n是否清理项目目录中'" + targetFolderName + "'以外的文件？";

                    if (confirm(confirmMsg)) {
                        // 清理项目目录中除指定目录以外的文件
                        var cleanedCount = 0;
                        var items = projectDir.getFiles();
                        for (var i = 0; i < items.length; i++) {
                            var item = items[i];
                            // 跳过指定目录和项目文件
                            if (item.fsName === targetFolder.fsName || item.fsName === projectFile.fsName) {
                                continue;
                            }
                            // 删除其他文件/文件夹
                            if (item instanceof Folder) {
                                cleanedCount += cleanFolder(item);
                                item.remove();
                            } else {
                                item.remove();
                            }
                            cleanedCount++;
                        }
                        alert("已清理项目目录，删除了 " + cleanedCount + " 个文件/文件夹。");
                    }
                } else {
                    alert("同步完成但验证失败：" + verifyMsg + "\n\n请手动检查网络目录。");
                }
            } catch(e) {
                alert("复制到网络共享目录失败：" + e.message + "\n\n已复制：" + copiedItems.join("、") + "\n请检查网络连接或权限。");
            }
        } catch(e) {
            alert("同步出错：" + e.toString());
        }
        app.endUndoGroup();
    }

    function copyFolder(src, dest) {
        if (!dest.exists) {
            dest.create();
        }
        var files = src.getFiles();
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (f instanceof Folder) {
                var subDest = new Folder(dest.fsName + "/" + f.name);
                copyFolder(f, subDest);
            } else {
                var destFile = new File(dest.fsName + "/" + f.name);
                f.copy(destFile.fsName);
            }
        }
    }

    function countFiles(folder) {
        var count = 0;
        var files = folder.getFiles();
        for (var i = 0; i < files.length; i++) {
            if (files[i] instanceof Folder) {
                count += countFiles(files[i]);
            } else {
                count++;
            }
        }
        return count;
    }

    function cleanFolder(folder) {
        var count = 0;
        var files = folder.getFiles();
        for (var i = 0; i < files.length; i++) {
            if (files[i] instanceof Folder) {
                count += cleanFolder(files[i]);
                files[i].remove();
            } else {
                files[i].remove();
            }
            count++;
        }
        return count;
    }

    function getPngDimensions(filePath) {
        try {
            var f = new File(filePath);
            if (!f.exists) return null;
            f.open("r");
            f.encoding = "BINARY";
            var raw = f.read(24);
            f.close();
            if (raw.charCodeAt(0) !== 137 || raw.charCodeAt(1) !== 80 ||
                raw.charCodeAt(2) !== 78 || raw.charCodeAt(3) !== 71) {
                return null;
            }
            var w = (raw.charCodeAt(16) << 24) | (raw.charCodeAt(17) << 16) |
                    (raw.charCodeAt(18) << 8) | raw.charCodeAt(19);
            var h = (raw.charCodeAt(20) << 24) | (raw.charCodeAt(21) << 16) |
                    (raw.charCodeAt(22) << 8) | raw.charCodeAt(23);
            return [w, h];
        } catch(e) {
            return null;
        }
    }

    function sortOutputFiles() {
        if (!app.project.file) {
            alert("请先保存项目文件！");
            return;
        }

        var projectPath = app.project.file;
        var defaultPrefix = decodeUrlString(projectPath.name.replace(/\.[^\.]+$/, ''));

        var presetFile = getSelectedPresetFile();
        var presetData = presetFile ? loadPreset(presetFile) : null;
        var sortConfigPath = presetData && presetData.sortConfig ? getPresetResourcePath(presetData.sortConfig) : null;
        var sortConfig = null;
        if (sortConfigPath) {
            var scFile = new File(sortConfigPath);
            if (scFile.exists) sortConfig = loadPreset(scFile);
        }
        if (!sortConfig) {
            alert("当前预设（" + (presetDropdown.selection ? presetDropdown.selection.text : "未选择") + "）无需输出整理。");
            return;
        }

        var dialog = new Window("dialog", "输出文件整理");
        dialog.orientation = "column";
        dialog.alignChildren = "left";

        dialog.add("statictext", undefined, "请输入前缀名称:");
        var prefixInput = dialog.add("edittext", undefined, defaultPrefix);
        prefixInput.characters = 20;

        dialog.add("statictext", undefined, "运行日志:");
        var logText = dialog.add("edittext", undefined, "", {multiline: true, scrolling: true});
        logText.preferredSize = [400, 200];

        // 显示当前配置信息
        var presetName = presetDropdown.selection ? presetDropdown.selection.text : "未知";
        var infoLines = [];
        infoLines.push("预设: " + presetName);
        if (sortConfig.description) infoLines.push("说明: " + sortConfig.description);
        infoLines.push("");
        infoLines.push("需要文件: " + sortConfig.required.length + " 项");
        for (var ri = 0; ri < sortConfig.required.length; ri++) {
            var r = sortConfig.required[ri];
            infoLines.push("  " + (ri+1) + ". " + (r.label || r.name || r.regex || "尺寸 " + r.size));
        }
        infoLines.push("重命名规则: " + sortConfig.rename.length + " 条");
        for (var rr = 0; rr < sortConfig.rename.length; rr++) {
            var rn = sortConfig.rename[rr];
            infoLines.push("  " + (rr+1) + ". " + (rn.match || rn.regex || "") + " → " + rn.to);
        }
        if (sortConfig.zip) {
            infoLines.push("打包: " + sortConfig.zip.files.join(", ") + " → " + sortConfig.zip.name);
        }
        if (sortConfig.clipboard && sortConfig.clipboard.length > 0) {
            infoLines.push("复制到剪贴板: " + sortConfig.clipboard.join(", "));
        }
        infoLines.push("");

        logText.text = infoLines.join("\n");

        var buttonGroup = dialog.add("group");
        var confirmButton = buttonGroup.add("button", undefined, "确认");
        var cancelButton = buttonGroup.add("button", undefined, "取消");

        confirmButton.onClick = function() {
            try {
                var output_name = prefixInput.text.trim();
                if (!output_name) {
                    alert("请输入前缀名称！");
                    return;
                }
                // Windows 文件名非法字符: \ / : * ? " < > |
                var safeName = output_name.replace(/[\\\/:*?"<>|]/g, "-");
                if (safeName !== output_name) {
                    logText.text += "前缀含非法字符，已替换为: " + safeName + "\n";
                    output_name = safeName;
                }
                var projectFolder = projectPath.parent;
                var outputFolder = new Folder(projectFolder.fullName + "/输出");

                if (!outputFolder.exists) {
                    logText.text += "错误：未找到'输出'文件夹\n";
                    return;
                }

                var files = outputFolder.getFiles();

                // --- Check required files ---
                var missing = [];
                for (var ri = 0; ri < sortConfig.required.length; ri++) {
                    var req = sortConfig.required[ri];
                    var found = false;
                    for (var si = 0; si < files.length; si++) {
                        var sName = decodeUrlString(files[si].name);
                        var matched = false;
                        if (req.name && sName === req.name) matched = true;
                        if (!matched && req.regex) {
                            var re = new RegExp(req.regex, "i");
                            if (re.test(sName)) matched = true;
                        }
                        if (!matched && req.fallback && sName === req.fallback) matched = true;
                        if (matched && req.size) {
                            var dims = getPngDimensions(files[si].fsName);
                            if (!dims || dims[0] !== req.size[0] || dims[1] !== req.size[1]) {
                                matched = false;
                                continue;
                            }
                        }
                        if (matched) { found = true; break; }
                    }
                    // 尺寸兜底：名字没匹配上但有 size 要求的，试试按尺寸找
                    if (!found && req.size) {
                        for (var si = 0; si < files.length; si++) {
                            var dims = getPngDimensions(files[si].fsName);
                            if (dims && dims[0] === req.size[0] && dims[1] === req.size[1]) {
                                found = true;
                                break;
                            }
                        }
                    }
                    if (!found) {
                        missing.push(req.label || req.name || req.regex);
                    }
                }
                if (missing.length > 0) {
                    alert("输出文件夹缺少以下文件：\n- " + missing.join("\n- ") + "\n\n请先执行其他步骤生成所需文件。");
                    return;
                }

                // --- Rename files ---
                logText.text += "\n========== 开始处理文件 ==========\n";
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var fileName = decodeUrlString(file.name);
                    for (var rr = 0; rr < sortConfig.rename.length; rr++) {
                        var rule = sortConfig.rename[rr];
                        var matches = false;
                        if (rule.match && fileName === rule.match) matches = true;
                        if (!matches && rule.regex) {
                            var re2 = new RegExp(rule.regex, "i");
                            if (re2.test(fileName)) matches = true;
                        }
                        // 尺寸兜底：名字没匹配上但有 size 的，按 PNG 尺寸匹配
                        if (!matches && rule.size) {
                            var dims2 = getPngDimensions(file.fsName);
                            if (dims2 && dims2[0] === rule.size[0] && dims2[1] === rule.size[1]) {
                                matches = true;
                            }
                        }
                        if (matches) {
                            var newName = String(rule.to).replace("{prefix}", output_name);
                            var newFile = new File(file.parent.fsName + "/" + newName);
                            if (newFile.exists) {
                                logText.text += "已存在: " + newName + "\n";
                            } else if (file.rename(newFile)) {
                                logText.text += "重命名成功: " + fileName + " -> " + newName + "\n";
                            } else {
                                logText.text += "重命名失败: " + fileName + "\n";
                            }
                            break;
                        }
                    }
                }

                // --- Generate bat ---
                var zipFiles = [];
                for (var zf = 0; zf < sortConfig.zip.files.length; zf++) {
                    zipFiles.push("'" + sortConfig.zip.files[zf] + "'");
                }
                var zipName = String(sortConfig.zip.name).replace("{prefix}", output_name);

                var clipItems = [];
                for (var ci = 0; ci < sortConfig.clipboard.length; ci++) {
                    clipItems.push("'" + String(sortConfig.clipboard[ci]).replace("{prefix}", output_name) + "'");
                }

                var hasZipSources = true;
                var delFiles = [];
                for (var df = 0; df < sortConfig.zip.files.length; df++) {
                    var zipSrc = new File(outputFolder.fsName + "/" + sortConfig.zip.files[df]);
                    if (!zipSrc.exists) { hasZipSources = false; break; }
                    delFiles.push('"' + sortConfig.zip.files[df] + '"');
                }

                if (hasZipSources) {
                    // JS 侧先删旧 zip，避免 bat 内 -Force 出错丢 zip
                    var oldZip = new File(outputFolder.fsName + "/" + zipName);
                    if (oldZip.exists) oldZip.remove();

                    var batContent = '@echo off\r\n';
                    batContent += 'chcp 65001\r\n';
                    batContent += 'cd /d "%~dp0"\r\n';
                    batContent += 'powershell -NoProfile -Command "& {';
                    batContent += 'Compress-Archive -Path ' + zipFiles.join(',') + ' ';
                    batContent += '-DestinationPath \'' + zipName + '\'}"\r\n';
                    batContent += 'if %errorlevel%==0 del ' + delFiles.join(' ') + '\r\n';
                    batContent += 'timeout /t 1 /nobreak >nul\r\n';
                    batContent += 'powershell -Command "Get-Item ' + clipItems.join(',') + ' | Set-Clipboard"\r\n';
                    batContent += 'echo 文件已复制到剪贴板\r\n';
                    batContent += '(goto) 2>nul & del "%~f0"\r\n';

                    var batFile = new File(outputFolder.fsName + "/compress.bat");
                    batFile.encoding = "UTF8";
                    if (batFile.open("w")) { batFile.write(batContent); batFile.close(); }
                    if (batFile.exists) {
                        logText.text += "打包并复制到剪贴板\n";
                        batFile.execute();
                    }
                } else {
                    var clipBatContent = '@echo off\r\n';
                    clipBatContent += 'chcp 65001\r\n';
                    clipBatContent += 'cd /d "%~dp0"\r\n';
                    clipBatContent += 'powershell -Command "Get-Item ' + clipItems.join(',') + ' | Set-Clipboard"\r\n';
                    clipBatContent += 'echo 文件已复制到剪贴板\r\n';
                    clipBatContent += '(goto) 2>nul & del "%~f0"\r\n';

                    var clipBatFile = new File(outputFolder.fsName + "/compress.bat");
                    clipBatFile.encoding = "UTF8";
                    if (clipBatFile.open("w")) { clipBatFile.write(clipBatContent); clipBatFile.close(); }
                    if (clipBatFile.exists) {
                        logText.text += "成品已复制到剪贴板（无需打包）\n";
                        clipBatFile.execute();
                    }
                }

                var wxBatContent = '@echo off\r\n';
                wxBatContent += 'timeout /t 6 /nobreak >nul\r\n';
                wxBatContent += 'start "" "C:\\Program Files (x86)\\WXWork\\WXWork.exe"\r\n';
                wxBatContent += '(goto) 2>nul & del "%~f0"\r\n';

                var wxBatFile = new File(outputFolder.fsName + "/start_wxwork.bat");
                wxBatFile.encoding = "UTF8";
                if (wxBatFile.open("w")) {
                    wxBatFile.write(wxBatContent);
                    wxBatFile.close();
                    if (wxBatFile.exists) {
                        wxBatFile.execute();
                    }
                }
            } catch(e) {
                alert("整理输出出错: " + (e.message || e.toString()));
            }
        };

        cancelButton.onClick = function() {
            dialog.close();
        };

        dialog.show();
    }

    // ================== 自动保存未保存的项目 ==================
    function autoSaveProject() {
        if (app.project.file) {
            alert("项目已保存，无需操作。");
            return;
        }

        var importedFile = null;
        for (var i = 1; i <= app.project.items.length; i++) {
            var item = app.project.items[i];
            if (item instanceof FootageItem && item.file) {
                importedFile = item.file;
                break;
            }
        }

        if (!importedFile) {
            alert("未找到导入的文件，无法确定保存位置。");
            return;
        }

        var fileDir = importedFile.parent;
        var folderName = decodeURIComponent(fileDir.name);
        var projectName = "";

        var match = folderName.match(/^\d{8}\s+(.+)/);
        if (match) {
            projectName = match[1];
        }

        var result = prompt("请输入项目名称：", projectName);
        if (result === null) return;

        var saveName = result.trim();
        if (!saveName) {
            alert("项目名称不能为空！");
            return;
        }

        try {
            var saveFile = new File(fileDir.fsName + "/" + saveName + ".aep");
            app.project.save(saveFile);
            alert("项目已保存到：\n" + saveFile.fsName);
        } catch(e) {
            alert("保存失败：" + e.toString());
        }
    }

    // ================== 将预览序列帧合成为MP4 ==================
    function renderPreviewToMp4() {
        if (!app.project.file) {
            alert("请先保存项目文件！");
            return;
        }

        var projectDir = app.project.file.parent;
        var outFs = projectDir.fsName + "\\\u8F93\u51FA";

        var items = projectDir.getFiles();

        var previewFolders = [];
        for (var i = 0; i < items.length; i++) {
            if (items[i] instanceof Folder) {
                var folderName = decodeURIComponent(items[i].name);
                if (folderName.indexOf("预览") >= 0) {
                    previewFolders.push(items[i]);
                }
            }
        }

        if (previewFolders.length === 0) {
            alert("未找到包含'预览'的文件夹！");
            return;
        }

        var folderListStr = "";
        for (var fi = 0; fi < previewFolders.length; fi++) {
            folderListStr += "\n  " + (fi + 1) + ". " + decodeURIComponent(previewFolders[fi].name);
        }

        if (!confirm("找到以下包含\"预览\"的文件夹：" + folderListStr + "\n\n是否合成MP4？")) return;

        for (var fi = 0; fi < previewFolders.length; fi++) {
            var folder = previewFolders[fi];

            var batContent = '@echo off\r\n';
            batContent += 'chcp 65001 >nul\r\n';
            batContent += 'cd /d "%~dp0"\r\n';
            batContent += 'echo ========== MP4 Synthesize Start ==========\r\n';
            batContent += 'powershell -NoProfile -Command "';
            batContent += '$count=1; ';
            batContent += 'Get-ChildItem -Path . -Filter *.png -File | ';
            batContent += 'ForEach-Object { Rename-Item -Path $_.FullName -NewName (\\\"{0:0000}.png\\\" -f $count) -ErrorAction Stop; $count++ }; ';
            batContent += 'ffmpeg -y -r 24 -f image2 -i \\\"%%04d.png\\\" -vcodec libx264 -crf 20 -pix_fmt yuv420p \\\"$((Get-Item .).Name).mp4\\\"';
            batContent += '"\r\n';
            batContent += 'if errorlevel 1 (echo [FAIL]) else (echo [OK])\r\n';
            batContent += 'echo.\r\n';
            batContent += 'move /y "*.mp4" "' + outFs + '\\"\r\n';
            batContent += 'echo [Clipboard] Copying MP4s...\r\n';
            batContent += 'powershell -Command "Get-Item \'' + outFs + '\\*.mp4\' | Set-Clipboard"\r\n';
            batContent += 'echo [WeChat] Opening...\r\n';
            batContent += 'start "" "C:\\Program Files (x86)\\WXWork\\WXWork.exe"\r\n';
            batContent += 'echo ========== Done ==========\r\n';
            batContent += 'timeout /t 5 /nobreak\r\n';
            batContent += '(goto) 2>nul & del "%~f0"\r\n';

            var batFile = new File(folder.fsName + "/render.bat");
            batFile.encoding = "UTF8";
            if (batFile.open("w")) {
                batFile.write(batContent);
                batFile.close();
                if (batFile.exists) {
                    batFile.execute();
                }
            }
        }

        alert("正在合成 " + previewFolders.length + " 个MP4...\n处理完成后窗口将自动关闭");
    }

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
            try {
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
            } catch(e) {
                logMessage("步骤按钮出错: " + (e.message || e.toString()), LOG_LEVEL.ERROR, "UI");
            }
        };
    }

    // ================== 同步步骤函数 ==================
    var SYNC_STEP_NAMES = ["收集", "推送", "清理"];

    function getSyncTargetPath() {
        var presetFile = getSelectedPresetFile();
        if (!presetFile) return "";
        var data = loadPreset(presetFile);
        if (data && data.sync && data.sync.targetPath) {
            return data.sync.targetPath;
        }
        return "";
    }

    function refreshSyncUI() {
        clearContainer(syncStepContainer);
        syncStepButtons = [];
        syncStepActiveStates = [];

        syncTargetInput.text = getSyncTargetPath();

        for (var i = 0; i < SYNC_STEP_NAMES.length; i++) {
            syncStepActiveStates[i] = true;
            var btn = syncStepContainer.add("button", undefined, "");
            btn.alignment = ["fill", "top"];
            btn.preferredSize.height = 24;

            buildSyncStepButton(btn, i, true);
            syncStepButtons.push(btn);
        }

        syncStatusText.text = "状态: 就绪";
        syncStepContainer.layout.layout(true);
    }

    function buildSyncStepButton(btn, index, isActive) {
        var prefix = isActive ? "\u2713 " : "\u25CB ";
        btn.text = prefix + "Step " + (index + 1) + ": " + SYNC_STEP_NAMES[index];
        btn.helpTip = "Step " + (index + 1) + ": " + SYNC_STEP_NAMES[index] + "\n\n单击: 切换启用/禁用 | Ctrl+单击: 立即执行此步骤";
        btn._syncIndex = index;

        btn.onClick = function() {
            try {
                var ctrlKey = ScriptUI.environment.keyboardState.ctrlKey;
                var idx = this._syncIndex;

                if (ctrlKey) {
                    executeSyncStep(idx);
                } else {
                    syncStepActiveStates[idx] = !syncStepActiveStates[idx];
                    var active = syncStepActiveStates[idx];
                    var p2 = active ? "\u2713 " : "\u25CB ";
                    this.text = p2 + "Step " + (idx + 1) + ": " + SYNC_STEP_NAMES[idx];
                }
            } catch(e) {
                alert("同步步骤按钮出错: " + (e.message || e.toString()));
            }
        };
    }

    function executeSyncStep(index) {
        if (!app.project.file) { alert("请先保存项目文件！"); return false; }

        var projectFile = app.project.file;
        var projectDir = projectFile.parent;
        var projectName = decodeUrlString(projectFile.name.replace(/\.[^\.]+$/, ""));
        var targetFolderName = projectName + "文件夹";
        var targetFolder = new Folder(projectDir.fsName + "/" + targetFolderName);

        if (index === 0) {
            // Step 1: 收集 - 复制源文件和输出到项目文件夹
            syncStatusText.text = "状态: 正在收集...";
            var sourceFolder = new Folder(projectDir.fsName + "/源文件");
            var outputFolder = new Folder(projectDir.fsName + "/输出");
            var copied = [];

            if (sourceFolder.exists) {
                if (!targetFolder.exists) targetFolder.create();
                copyFolder(sourceFolder, new Folder(targetFolder.fsName + "/源文件"));
                copied.push("源文件");
            }
            if (outputFolder.exists) {
                if (!targetFolder.exists) targetFolder.create();
                copyFolder(outputFolder, new Folder(targetFolder.fsName + "/输出"));
                copied.push("输出");
            }

            if (copied.length === 0) {
                syncStatusText.text = "状态: 收集失败 - 未找到源文件或输出文件夹";
                return false;
            }
            syncStatusText.text = "状态: 收集完成 - " + copied.join("、");
            return true;
        }

        if (index === 1) {
            // Step 2: 推送 - 复制项目文件夹到网络路径
            var networkPath = syncTargetInput.text.trim();
            if (!networkPath) { alert("目标路径为空！请先在预设中配置。"); return false; }

            var presetFile = getSelectedPresetFile();
            if (presetFile) {
                var presetData = loadPreset(presetFile);
                if (presetData) {
                    if (!presetData.sync) presetData.sync = {};
                    presetData.sync.targetPath = networkPath;
                    savePreset(presetFile, presetData);
                }
            }

            if (!targetFolder.exists) {
                alert("项目文件夹不存在:\n" + targetFolder.fsName + "\n请先执行'收集'步骤。");
                syncStatusText.text = "状态: 推送失败 - 项目文件夹不存在";
                return false;
            }

            syncStatusText.text = "状态: 正在推送到网络...";
            var networkDest = new Folder(networkPath + "/" + targetFolderName);

            try {
                copyFolder(targetFolder, networkDest);

                var localCount = countFiles(targetFolder);
                var remoteCount = countFiles(networkDest);

                if (remoteCount < localCount) {
                    alert("推送完成但验证失败：文件数量不匹配\n本地：" + localCount + "，远程：" + remoteCount + "\n请手动检查网络目录。");
                    syncStatusText.text = "状态: 推送完成但验证失败";
                } else {
                    alert("推送完成并验证通过！\n目标：" + networkPath + "\\" + targetFolderName);
                    syncStatusText.text = "状态: 推送完成";
                }
                return true;
            } catch(e) {
                alert("推送到网络共享目录失败：" + e.message + "\n请检查网络连接或权限。");
                syncStatusText.text = "状态: 推送失败";
                return false;
            }
        }

        if (index === 2) {
            // Step 3: 清理 - 只保留 targetFolder，其他移入 _回收站/（非永久删除）
            if (!targetFolder.exists) {
                if (!confirm("项目文件夹 " + targetFolderName + " 不存在，是否创建？")) return false;
                targetFolder.create();
            }

            var trashFolder = new Folder(projectDir.fsName + "/_回收站");
            if (!trashFolder.exists) trashFolder.create();
            var timeStr = String(new Date().getFullYear()) + "-" + String(new Date().getMonth() + 1) + "-" + String(new Date().getDate()) + "_" + String(new Date().getHours()) + String(new Date().getMinutes()) + String(new Date().getSeconds());
            var trashBatch = new Folder(trashFolder.fsName + "/" + targetFolderName + "_" + timeStr);
            if (!trashBatch.exists) trashBatch.create();

            var count = 0;
            var items = projectDir.getFiles();
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.fsName === targetFolder.fsName) continue;
                if (item.fsName === trashFolder.fsName) continue;
                try {
                    item.rename(trashBatch.fsName + "/" + item.name);
                    count++;
                } catch(e) {
                    // rename across drives may fail, fallback to copy+remove
                    try {
                        if (item instanceof Folder) {
                            copyFolder(item, new Folder(trashBatch.fsName + "/" + item.name));
                            cleanFolder(item);
                            item.remove();
                        } else {
                            item.copy(trashBatch.fsName + "/" + item.name);
                            item.remove();
                        }
                        count++;
                    } catch(e2) {}
                }
            }

            syncStatusText.text = "状态: 清理完成 - 移除了 " + count + " 项到 _回收站";
            return true;
        }

        return false;
    }

    // ================== 初始化 ==================
    detectCurrentComp();
    refreshPresetList();
    funcPanel.preferredSize.width = win.preferredSize.width - 12;
    relayoutFuncButtons();

    return win;
}
