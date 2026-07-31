function getMarkerTime(comp, markerName) {
    var markers = comp.markerProperty;
    if (!markers || markers.numKeys === 0) return -1;
    for (var i = 1; i <= markers.numKeys; i++) {
        try {
            var t = markers.keyTime(i);
            var v = markers.keyValue(i);
            if (!v) continue;
            if (v.comment === markerName) return t;
            if (v.toString() === markerName) return t;
            if (v.comment && v.comment.indexOf(markerName) >= 0) return t;
        } catch(e) {}
    }
    return -1;
}

function findGiftWallFolder(projectDir, keyword) {
    if (!keyword) keyword = "礼物墙";
    var outputDir = new Folder(projectDir + "/输出");
    if (!outputDir.exists) {
        alert("未找到'输出'文件夹，请先保存项目。");
        return null;
    }

    var re = null;
    try {
        re = new RegExp(keyword);
    } catch(e) {
        re = null;
    }

    var items = outputDir.getFiles();
    var giftDirs = [];
    for (var i = 0; i < items.length; i++) {
        if (items[i] instanceof Folder) {
            var name = decodeUrlString(items[i].name);
            var matched = false;
            if (re) {
                matched = re.test(name);
            } else {
                matched = name.indexOf(keyword) >= 0;
            }
            if (matched) giftDirs.push(items[i]);
        }
    }

    if (giftDirs.length === 0) {
        alert("输出文件夹中未找到匹配 '" + keyword + "' 的文件夹。\n请在输出目录下创建对应文件夹。");
        return null;
    }

    if (giftDirs.length === 1) return giftDirs[0];

    var dialog = new Window("dialog", "选择" + keyword + "文件夹");
    dialog.orientation = "column";
    dialog.alignChildren = "left";
    dialog.add("statictext", undefined, "找到多个匹配 '" + keyword + "' 的文件夹，请选择:");

    var dd = dialog.add("dropdownlist", undefined, []);
    for (var j = 0; j < giftDirs.length; j++) {
        dd.add("item", decodeUrlString(giftDirs[j].name));
    }
    dd.selection = 0;

    var btnRow = dialog.add("group");
    btnRow.alignment = "center";
    var okBtn = btnRow.add("button", undefined, "确定");
    var cancelBtn = btnRow.add("button", undefined, "取消");

    var picked = null;
    okBtn.onClick = function() {
        try {
            picked = giftDirs[dd.selection.index];
            dialog.close();
        } catch(e) { alert("选择出错: " + (e.message || e.toString())); }
    };
    cancelBtn.onClick = function() {
        try { dialog.close(); } catch(e) {}
    };

    dialog.show();
    return picked;
}

function exportOneFrame(comp, outputFolder, fileName, time) {
    var destFile = renderSingleFrame(comp, outputFolder, fileName, time);
    if (destFile) {
        logMessage(fileName + "已保存: " + destFile.fsName, 2, "FRAME");
    } else {
        logMessage(fileName + "渲染失败", 3, "FRAME");
    }
    return destFile;
}

function autoExportFrames(comp) {
    if (!comp || !(comp instanceof CompItem)) {
        alert("请先选择一个合成！");
        return;
    }
    if (!app.project.file) {
        alert("请先保存项目文件！");
        return;
    }

    var projectDir = app.project.file.parent.fsName;
    var tHL = getMarkerTime(comp, "高光图");
    var tFF = getMarkerTime(comp, "首帧");
    var tDF = getMarkerTime(comp, "展示帧");

    var anyMarker = (tHL >= 0 || tFF >= 0 || tDF >= 0);
    var exported = [];

    if (!anyMarker) {
        logMessage("未找到标记，使用当前时间导出高光图", 2, "FRAME");
        var outDir = new Folder(projectDir + "/输出");
        if (!outDir.exists) outDir.create();
        var f = exportOneFrame(comp, outDir, "高光图", comp.time);
        if (f) exported.push("高光图: " + f.fsName);
    } else {
        if (tHL >= 0) {
            logMessage("找到标记 高光图 在 " + tHL.toFixed(2) + "s", 2, "FRAME");
            var outDir = new Folder(projectDir + "/输出");
            if (!outDir.exists) outDir.create();
            var f = exportOneFrame(comp, outDir, "高光图", tHL);
            if (f) exported.push("高光图: " + f.fsName);
        }
        if (tFF >= 0 || tDF >= 0) {
            var giftFolder = findGiftWallFolder(projectDir);
            if (giftFolder) {
                if (tFF >= 0) {
                    logMessage("找到标记 首帧 在 " + tFF.toFixed(2) + "s", 2, "FRAME");
                    var f = exportOneFrame(comp, giftFolder, "首帧", tFF);
                    if (f) exported.push("首帧: " + f.fsName);
                }
                if (tDF >= 0) {
                    logMessage("找到标记 展示帧 在 " + tDF.toFixed(2) + "s", 2, "FRAME");
                    var f = exportOneFrame(comp, giftFolder, "展示帧", tDF);
                    if (f) exported.push("展示帧: " + f.fsName);
                }
            }
        }
    }

    if (exported.length > 0) {
        alert("导出完成:\n" + exported.join("\n"));
    } else {
        alert("导出失败，请检查渲染队列。");
    }

    try { comp.openInViewer(); } catch(e) {}
}
