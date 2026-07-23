function ensureSequenceTemplate() {
    var templateNames = ["序列帧", "PNG Sequence", "PNG 序列"];
    for (var t = 0; t < templateNames.length; t++) {
        try {
            var tempComp = app.project.items.addComp("__template_check__", 10, 10, 1, 1, 30);
            var rqItem = app.project.renderQueue.items.add(tempComp);
            var om = rqItem.outputModule(1);
            om.applyTemplate(templateNames[t]);
            rqItem.remove();
            try { tempComp.remove(); } catch(e) {}
            logMessage("模板已存在: " + templateNames[t], LOG_LEVEL.VERBOSE, "RENDER");
            return;
        } catch(e) {}
    }

    logMessage("序列帧模板不存在，正在创建...", LOG_LEVEL.NORMAL, "RENDER");
    var tempComp = app.project.items.addComp("__template_create__", 10, 10, 1, 1, 30);
    var rqItem = app.project.renderQueue.items.add(tempComp);
    var om = rqItem.outputModule(1);

    try {
        om.setSetting("Format", "8");
    } catch(e) {
        logMessage("setSetting Format 失败: " + e.toString(), LOG_LEVEL.WARNING, "RENDER");
    }

    om.file = new File(Folder.temp.fsName + "/__template_temp_[#####].png");

    try {
        om.saveToTemplate("序列帧");
        logMessage("模板已创建: 序列帧", LOG_LEVEL.NORMAL, "RENDER");
    } catch(e) {
        logMessage("模板创建失败: " + e.toString(), LOG_LEVEL.WARNING, "RENDER");
    }

    rqItem.remove();
    try { tempComp.remove(); } catch(e) {}
}

function applySequenceTemplate(om) {
    var names = ["序列帧", "PNG 序列", "PNG Sequence", "PNG", "PNG Sequence with Alpha"];
    for (var n = 0; n < names.length; n++) {
        try {
            om.applyTemplate(names[n]);
            var fmt = om.getSetting("Format");
            if (fmt === "8") {
                return true;
            }
        } catch(e) {}
    }
    return false;
}

function renderCompToSequence(comp, projectDir, settings) {
    logMessage("开始渲染: " + comp.name, LOG_LEVEL.NORMAL, "RENDER");

    try {
        var outDir = new Folder(projectDir + "/" + comp.name);
        if (outDir.exists) {
            var oldFiles = outDir.getFiles("*");
            for (var f = 0; f < oldFiles.length; f++) {
                try { oldFiles[f].remove(); } catch(e) {}
            }
        } else {
            outDir.create();
        }

        var rqItem = app.project.renderQueue.items.add(comp);
        var om = rqItem.outputModule(1);

        while (rqItem.outputModules.length > 1) {
            rqItem.outputModule(rqItem.outputModules.length).remove();
        }

        ensureSequenceTemplate();
        var ok = applySequenceTemplate(om);
        if (!ok) {
            logMessage("无法应用序列帧模板，使用默认设置", LOG_LEVEL.WARNING, "RENDER");
        }

        var outFile = new File(outDir.fsName + "/" + comp.name + "_[#####].png");
        om.file = outFile;

        try {
            var fmt = om.getSetting("Format");
            if (fmt !== "8") {
                logMessage("设置文件后Format已变: " + fmt + "，重新应用模板", LOG_LEVEL.WARNING, "RENDER");
                applySequenceTemplate(om);
            }
        } catch(e) {
            logMessage("验证Format失败: " + e.toString(), LOG_LEVEL.WARNING, "RENDER");
        }

        app.project.renderQueue.render();

        if (settings.importBack) {
            importSequenceToComp(comp, outDir);
        }

        rqItem.remove();

        logMessage("渲染完成: " + comp.name, LOG_LEVEL.NORMAL, "RENDER");
        return true;

    } catch (e) {
        logMessage("渲染出错: " + e.message, LOG_LEVEL.ERROR, "RENDER");
        alert("渲染出错: " + e.message);
        return false;
    }
}

function findFirstFileInFolder(folder) {
    if (!folder || !folder.exists) return null;

    var patterns = ["*.png", "*.tga", "*.tif", "*.tiff", "*.jpg", "*.jpeg", "*.exr", "*.bmp", "*.mp4", "*.mov", "*.avi"];
    for (var p = 0; p < patterns.length; p++) {
        var files = folder.getFiles(patterns[p]);
        if (files.length > 0) return files[0];
    }
    return null;
}

function importSequenceToComp(comp, outDir) {
    var firstFile = findFirstFileInFolder(outDir);
    if (!firstFile) {
        logMessage("未找到渲染文件: " + outDir.fsName, LOG_LEVEL.ERROR, "RENDER");
        alert("未找到渲染文件:\n" + outDir.fsName);
        return null;
    }

    var importOpt = new ImportOptions(firstFile);
    importOpt.sequence = true;
    importOpt.forceAlphabetical = true;

    var footage = app.project.importFile(importOpt);
    footage.name = comp.name + "_序列";

    var targetFrameRate = comp.frameRate;
    var actualRate = footage.frameRate;
    logMessage("导入序列帧率: 实际=" + actualRate + "fps, 目标=" + targetFrameRate + "fps", LOG_LEVEL.NORMAL, "RENDER");

    if (Math.abs(actualRate - targetFrameRate) > 0.01) {
        try {
            footage.mainSource.conformFrameRate = targetFrameRate;
            logMessage("帧率已设为: " + targetFrameRate + "fps", LOG_LEVEL.NORMAL, "RENDER");
        } catch(e) {
            logMessage("设置帧率失败: " + e.toString(), LOG_LEVEL.WARNING, "RENDER");
        }
    }

    var layer = comp.layers.add(footage);
    layer.solo = true;
    layer.name = comp.name + "_渲染";
    layer.moveToBeginning();

    logMessage("渲染结果已导入: " + comp.name + " (" + targetFrameRate + "fps)", LOG_LEVEL.NORMAL, "RENDER");
    return footage;
}

function cleanFolder(folder) {
    var count = 0;
    var files = folder.getFiles();
    for (var fi = 0; fi < files.length; fi++) {
        if (files[fi] instanceof Folder) {
            count += cleanFolder(files[fi]);
            files[fi].remove();
        } else {
            files[fi].remove();
        }
        count++;
    }
    return count;
}

function renderSingleFrame(comp, outputFolder, fileName, time) {
    if (time === undefined) time = comp.time;
    if (fileName === undefined) fileName = "高光图";

    var tempFolder = new Folder(Folder.temp.fsName + "/__singleframe_" + String(Math.random()).substr(2, 6));
    if (!tempFolder.exists) tempFolder.create();

    var rqItem = null;
    var result = null;

    try {
        rqItem = app.project.renderQueue.items.add(comp);
        rqItem.timeSpanStart = time;
        rqItem.timeSpanDuration = 1.0 / comp.frameRate;

        while (rqItem.outputModules.length > 1) {
            rqItem.outputModule(rqItem.outputModules.length).remove();
        }

        var om = rqItem.outputModule(1);

        ensureSequenceTemplate();
        var templateOk = false;
        var tplNames = ["序列帧", "PNG 序列", "PNG Sequence"];
        for (var tn = 0; tn < tplNames.length; tn++) {
            try { om.applyTemplate(tplNames[tn]); templateOk = true; break; } catch(e) {}
        }
        if (!templateOk) {
            try { om.setSetting("Format", "8"); } catch(e) {}
        }

        om.file = new File(tempFolder.fsName + "/" + fileName + "_[#####].png");

        app.project.renderQueue.render();

        var renderedFile = findFirstFileInFolder(tempFolder);
        if (renderedFile) {
            if (!outputFolder.exists) outputFolder.create();
            var destFile = new File(outputFolder.fsName + "/" + fileName + ".png");
            renderedFile.copy(destFile.fsName);
            result = destFile;
        }
    } catch(e) {
        logMessage("renderSingleFrame 出错: " + (e.message || e.toString()), LOG_LEVEL.ERROR, "RENDER");
    }

    if (rqItem) { try { rqItem.remove(); } catch(e) {} }
    try { cleanFolder(tempFolder); tempFolder.remove(); } catch(e) {}

    return result;
}
