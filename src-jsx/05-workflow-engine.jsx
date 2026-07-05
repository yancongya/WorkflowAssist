function executeWorkflow(sourceComp, baseName, presetFile) {
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
        // 将当前合成重命名为基础名称
        var originalName = decodeUrlString(sourceComp.name);
        sourceComp.name = baseName;
        logMessage("当前合成已重命名: " + originalName + " → " + baseName, LOG_LEVEL.NORMAL, "ENGINE");

        // 检查所有目标合成是否已存在
        var steps = presetData.steps;
        for (var i = 0; i < steps.length; i++) {
            var checkName = baseName + steps[i].suffix;
            if (getCompByName(checkName)) {
                alert("合成已存在: " + checkName + "\n请先删除或重命名现有合成后再执行。");
                sourceComp.name = originalName;
                app.endUndoGroup();
                return false;
            }
        }

        // 按顺序执行工作流步骤
        var currentComp = sourceComp;
        var lastComp = null;
        for (var j = 0; j < steps.length; j++) {
            var s = steps[j];
            var outputName = baseName + s.suffix;

            logMessage("执行步骤 " + (j + 1) + ": " + outputName, LOG_LEVEL.NORMAL, "ENGINE");

            var newComp = createComp(outputName, s.width, s.height, s.frameRate, s.duration);
            nestWithScale(currentComp, newComp, s.scaleMode, s.scalePercent);

            // 处理错层（stagger）— 偏移量自动取上一步合成的时长
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

        // 打开最新创建的合成
        if (lastComp) {
            app.project.activeItem = lastComp;
        }

        app.endUndoGroup();

        var resultMsg = "工作流执行完成！\n共创建 " + steps.length + " 个合成:\n";
        for (var m = 0; m < steps.length; m++) {
            resultMsg += (m + 1) + ". " + baseName + steps[m].suffix;
            resultMsg += " (" + steps[m].width + "×" + steps[m].height + ")\n";
        }
        alert(resultMsg);
        return true;

    } catch (e) {
        app.endUndoGroup();
        alert("工作流执行出错: " + e.message);
        return false;
    }
}
