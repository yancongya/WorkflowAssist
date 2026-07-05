// 渲染引擎测试脚本
// 在 AE 中运行此脚本，逐步测试输出模块配置方法

(function() {

    // 确保有项目
    if (!app.project) {
        alert("请先打开一个项目！");
        return;
    }

    // 确保有活动合成（或创建一个）
    var testComp = app.project.activeItem;
    if (!testComp || !(testComp instanceof CompItem)) {
        testComp = app.project.items.addComp("__test_render__", 1, 1, 1, 1, 30);
    }

    // 测试结果收集
    var results = [];

    function addResult(step, success, detail) {
        var icon = success ? "✓" : "✗";
        results.push(icon + " " + step + ": " + (detail || ""));
    }

    // =============================================
    // 测试 1: 读取默认 OM 设置
    // =============================================
    function test1() {
        var rq = app.project.renderQueue;
        var item = rq.items.add(testComp);
        var om = item.outputModule(1);

        var format = "(无法读取)";
        try {
            format = om.getSetting("Format");
        } catch(e) {
            format = "getSetting失败: " + e.toString();
        }

        var settingsObj = "(无法读取)";
        try {
            if (om.settings) {
                settingsObj = JSON.stringify(om.settings);
                if (settingsObj.length > 200) settingsObj = settingsObj.substring(0, 200) + "...";
            } else {
                settingsObj = "om.settings 不存在或为 undefined";
            }
        } catch(e) {
            settingsObj = "om.settings 读取失败: " + e.toString();
        }

        // 尝试枚举所有 getSetting 可读的常见 key
        var keys = ["Format", "Video Output", "Channels", "Depth", "Crop", "Audio Output"];
        var settingsDump = "";
        for (var k = 0; k < keys.length; k++) {
            try {
                var val = om.getSetting(keys[k]);
                settingsDump += keys[k] + "=" + val + "  ";
            } catch(e) {
                settingsDump += keys[k] + "=ERR  ";
            }
        }

        addResult("读取 Format", true, format);
        addResult("om.settings 对象", settingsObj !== "(无法读取)" && settingsObj.indexOf("不存在") < 0, settingsObj);
        addResult("常见 Keys", true, settingsDump);

        item.remove();

        alert("测试1: 读取默认 OM 设置\n\n" +
              "Format = " + format + "\n\n" +
              "settings 对象:\n" + settingsObj + "\n\n" +
              "常见 Keys:\n" + settingsDump);
    }

    // =============================================
    // 测试 2: 文件扩展名自动检测
    // =============================================
    function test2() {
        var rq = app.project.renderQueue;
        var item = rq.items.add(testComp);
        var om = item.outputModule(1);

        // 只设置文件路径，不调任何模板
        om.file = new File(Folder.temp.fsName + "/__test/[#####].png");

        var formatAfter = "(无法读取)";
        try {
            formatAfter = om.getSetting("Format");
        } catch(e) {
            formatAfter = "读取失败: " + e.toString();
        }

        addResult("文件扩展名自动检测", formatAfter.indexOf("PNG") >= 0 || formatAfter.indexOf("序列") >= 0 || formatAfter.indexOf("Sequence") >= 0, "Format=" + formatAfter);

        item.remove();

        alert("测试2: 文件扩展名自动检测\n\n" +
              "设置文件后 Format = " + formatAfter + "\n\n" +
              (formatAfter.indexOf("PNG") >= 0 || formatAfter.indexOf("序列") >= 0 || formatAfter.indexOf("Sequence") >= 0 ?
                "✓ PNG 格式自动检测成功" : "✗ 文件扩展名未能切换格式，Format 仍为 " + formatAfter));
    }

    // =============================================
    // 测试 3: applyTemplate 各种名称
    // =============================================
    function test3() {
        var templateNames = [
            "序列帧",
            "PNG Sequence",
            "PNG 序列",
            "PNG",
            "PNG Sequence with Alpha"
        ];

        var found = "(未找到任何模板)";
        for (var t = 0; t < templateNames.length; t++) {
            var rq = app.project.renderQueue;
            var item = rq.items.add(testComp);
            var om = item.outputModule(1);

            try {
                om.applyTemplate(templateNames[t]);
                var fmt = om.getSetting("Format");
                found = templateNames[t] + " 成功, Format=" + fmt;
                addResult(templateNames[t], true, fmt);
                item.remove();
                break;
            } catch(e) {
                addResult(templateNames[t], false, e.toString().substring(0, 80));
                item.remove();
            }
        }

        alert("测试3: applyTemplate 各种模板名\n\n" +
              results.slice(1, 1 + templateNames.length).join("\n") + "\n\n" +
              "结果: " + found);
    }

    // =============================================
    // 测试 4: om.settings 直接写
    // =============================================
    function test4() {
        var rq = app.project.renderQueue;
        var item = rq.items.add(testComp);
        var om = item.outputModule(1);

        var success = false;
        try {
            if (om.settings) {
                om.settings.Format = "PNG_Sequence";
                om.file = new File(Folder.temp.fsName + "/__test/[#####].png");
                var fmt = om.getSetting("Format");
                success = fmt.indexOf("PNG") >= 0 || fmt.indexOf("序列") >= 0;
                addResult("om.settings.Format=PNG_Sequence", success, "Format=" + fmt);
            } else {
                addResult("om.settings 直接写", false, "om.settings 不可用");
            }
        } catch(e) {
            addResult("om.settings 直接写", false, e.toString().substring(0, 80));
        }

        item.remove();

        alert("测试4: om.settings 直接写 Format\n\n" +
              (om.settings ? "om.settings 对象存在" : "om.settings 不存在") + "\n\n" +
              (success ? "✓ 成功! Format 已改为 PNG_Sequence" : "✗ 失败"));
    }

    // =============================================
    // 测试 5: setSetting 不同 Key
    // =============================================
    function test5() {
        var formatKeys = [
            "Format",
            "File Type",
            "Output Format",
            "Video Format",
            "MainOptions.Format"
        ];

        var found = "(无)";
        for (var f = 0; f < formatKeys.length; f++) {
            var rq = app.project.renderQueue;
            var item = rq.items.add(testComp);
            var om = item.outputModule(1);

            try {
                om.setSetting(formatKeys[f], "PNG_Sequence");
                om.file = new File(Folder.temp.fsName + "/__test/[#####].png");
                var fmt = om.getSetting("Format");
                if (fmt.indexOf("PNG") >= 0 || fmt.indexOf("序列") >= 0) {
                    found = formatKeys[f] + " 成功! Format=" + fmt;
                    addResult(formatKeys[f], true, fmt);
                    item.remove();
                    break;
                }
                addResult(formatKeys[f], false, "Format仍为" + fmt);
                item.remove();
            } catch(e) {
                addResult(formatKeys[f], false, e.toString().substring(0, 80));
                item.remove();
            }
        }

        alert("测试5: setSetting 不同 Key 名\n\n" +
              results.slice(1 + 4 + 1 + 1, results.length).join("\n") + "\n\n" +
              "结果: " + found);
    }

    // =============================================
    // 测试 6: saveToTemplate
    // =============================================
    function test6() {
        var rq = app.project.renderQueue;
        var item = rq.items.add(testComp);
        var om = item.outputModule(1);

        var saveOk = false;
        try {
            om.file = new File(Folder.temp.fsName + "/__test/[#####].png");
            om.saveToTemplate("__test_workflowassist__");
            saveOk = true;
            addResult("saveToTemplate", true, "模板已保存");
        } catch(e) {
            addResult("saveToTemplate", false, e.toString().substring(0, 80));
        }

        item.remove();

        // 验证能否应用
        if (saveOk) {
            var item2 = rq.items.add(testComp);
            var om2 = item2.outputModule(1);
            try {
                om2.applyTemplate("__test_workflowassist__");
                var fmt = om2.getSetting("Format");
                addResult("验证应用模板", true, "Format=" + fmt);
                item2.remove();
                alert("测试6: saveToTemplate\n\n模板已保存，验证应用成功\nFormat = " + fmt);
            } catch(e) {
                addResult("验证应用模板", false, e.toString().substring(0, 80));
                item2.remove();
                alert("测试6: saveToTemplate\n\n模板已保存，但验证失败: " + e.toString());
            }
        } else {
            alert("测试6: saveToTemplate\n\n模板保存失败");
        }
    }

    // =============================================
    // 执行所有测试
    // =============================================
    alert("渲染引擎测试脚本\n\n" +
          "将依次进行 6 项测试，每步弹窗显示结果。\n\n" +
          "测试前请确认:\n" +
          "1. AE 项目已打开\n" +
          "2. 没有正在进行的渲染\n\n" +
          "点击确定开始测试");

    test1();
    test2();
    test3();
    test4();
    test5();
    test6();

    // 清理：删除临时合成
    try {
        if (testComp.name.indexOf("__test") === 0) {
            testComp.remove();
        }
    } catch(e) {}

    // 输出汇总
    var summary = "=== 测试汇总 ===\n\n";
    summary += results.join("\n");

    alert(summary);

    $.writeln(summary);

})();
