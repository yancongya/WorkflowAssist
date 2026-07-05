function executeWorkflow(sourceComp, baseName, presetFile, activeStates) {
    if (!sourceComp) {
        alert("请先选择一个活动合成！");
        return false;
    }

    if (!baseName) {
        alert("基础名称不能为空！");
        return false;
    }

    var presetData = loadPreset(presetFile);
    if (!presetData || !presetData.steps || presetData.steps.length === 0) {
        alert("预设数据无效或为空！");
        return false;
    }

    app.beginUndoGroup("工作流助手 - " + baseName);

    try {
        var originalName = decodeUrlString(sourceComp.name);
        sourceComp.name = baseName;
        logMessage("当前合成已重命名: " + originalName + " → " + baseName, LOG_LEVEL.NORMAL, "ENGINE");

        var steps = presetData.steps;
        var lastComp = runSteps(sourceComp, baseName, steps, activeStates);

        if (lastComp) {
            lastComp.openInViewer();
        }

        app.endUndoGroup();

        var count = 0;
        var resultMsg = "工作流执行完成！\n共创建 ";
        for (var m = 0; m < steps.length; m++) {
            if (activeStates && !activeStates[m]) continue;
            count++;
            resultMsg += "\n" + count + ". " + baseName + steps[m].suffix;
            resultMsg += " (" + steps[m].width + "×" + steps[m].height + ")";
        }
        resultMsg = "工作流执行完成！\n共创建 " + count + " 个合成:\n" + resultMsg.replace("工作流执行完成！\n共创建 ", "");
        alert(resultMsg);
        return true;

    } catch (e) {
        app.endUndoGroup();
        alert("工作流执行出错: " + e.message);
        return false;
    }
}

function runSteps(sourceComp, baseName, steps, activeStates) {
    var currentComp = sourceComp;
    var lastComp = null;

    for (var j = 0; j < steps.length; j++) {
        if (activeStates && !activeStates[j]) {
            logMessage("跳过步骤 " + (j + 1) + ": " + steps[j].name, LOG_LEVEL.NORMAL, "ENGINE");
            continue;
        }

        var s = steps[j];
        var outputName = baseName + s.suffix;

        if (getCompByName(outputName)) {
            alert("合成已存在: " + outputName + "\n请先删除或重命名现有合成后再执行。");
            return null;
        }

        logMessage("执行步骤 " + (j + 1) + ": " + outputName, LOG_LEVEL.NORMAL, "ENGINE");

        var newComp = createComp(outputName, s.width, s.height, s.frameRate, s.duration);
        nestWithScale(currentComp, newComp, s.scaleMode, s.scalePercent);

        if (s.stagger && s.stagger.enabled) {
            var staggerOffset = currentComp.duration;
            var firstLayer = newComp.layer(1);
            for (var k = 1; k < s.stagger.count; k++) {
                var dup = firstLayer.duplicate();
                dup.startTime = k * staggerOffset;
                logMessage("  错层 " + (k + 1) + ": startTime=" + dup.startTime + "s (偏移=" + staggerOffset + "s)", LOG_LEVEL.NORMAL, "ENGINE");
            }
        }

        currentComp = newComp;
        lastComp = newComp;
    }

    return lastComp;
}

function executeSingleStep(sourceComp, baseName, presetFile, stepIndex) {
    if (!sourceComp) {
        alert("请先选择一个活动合成！");
        return false;
    }

    if (!baseName) {
        alert("基础名称不能为空！");
        return false;
    }

    var presetData = loadPreset(presetFile);
    if (!presetData || !presetData.steps || stepIndex >= presetData.steps.length) {
        alert("预设数据无效！");
        return false;
    }

    app.beginUndoGroup("工作流助手 - 单步 " + baseName);

    try {
        var originalName = decodeUrlString(sourceComp.name);
        sourceComp.name = baseName;
        logMessage("当前合成已重命名: " + originalName + " → " + baseName, LOG_LEVEL.NORMAL, "ENGINE");

        // 找到此步骤的源合成
        var stepSource = sourceComp;
        if (stepIndex > 0) {
            var prevName = baseName + presetData.steps[stepIndex - 1].suffix;
            stepSource = getCompByName(prevName);
            if (!stepSource) {
                alert("前置合成不存在: " + prevName + "\n请先执行前面的步骤。");
                sourceComp.name = originalName;
                app.endUndoGroup();
                return false;
            }
        }

        var s = presetData.steps[stepIndex];
        var outputName = baseName + s.suffix;

        if (getCompByName(outputName)) {
            alert("合成已存在: " + outputName + "\n请先删除或重命名现有合成后再执行。");
            sourceComp.name = originalName;
            app.endUndoGroup();
            return false;
        }

        var newComp = createComp(outputName, s.width, s.height, s.frameRate, s.duration);
        nestWithScale(stepSource, newComp, s.scaleMode, s.scalePercent);

        if (s.stagger && s.stagger.enabled) {
            var staggerOffset = stepSource.duration;
            var firstLayer = newComp.layer(1);
            for (var k = 1; k < s.stagger.count; k++) {
                var dup = firstLayer.duplicate();
                dup.startTime = k * staggerOffset;
            }
        }

        newComp.openInViewer();
        app.endUndoGroup();

        alert("单步执行完成: " + outputName + "\n(" + s.width + "×" + s.height + ", " + s.frameRate + "fps, " + s.duration + "s)");
        return true;

    } catch (e) {
        app.endUndoGroup();
        alert("单步执行出错: " + e.message);
        return false;
    }
}
