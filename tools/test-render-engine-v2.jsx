// 渲染引擎测试脚本 v2 — 每次测试独立创建临时合成，避免对象失效
(function() {

    if (!app.project) { alert("请先打开一个项目！"); return; }

    var results = [];

    function addResult(step, success, detail) {
        var icon = success ? "✓" : "✗";
        results.push(icon + " " + step + ": " + (detail || ""));
    }

    function makeTempComp() {
        return app.project.items.addComp("__test__", 10, 10, 1, 1, 30);
    }

    // ===== 测试1: 读取默认 OM 设置 =====
    (function() {
        var c = makeTempComp();
        var rq = app.project.renderQueue;
        var item = rq.items.add(c);
        var om = item.outputModule(1);

        try {
            var fmt = om.getSetting("Format");
            var vOut = om.getSetting("Video Output");
            var ch = om.getSetting("Channels");
            var dp = om.getSetting("Depth");
            var crop = om.getSetting("Crop");
            addResult("默认 Format", true, fmt);
            addResult("Video Output", true, vOut);
            addResult("Channels", true, ch);
            addResult("Depth", true, dp);
            addResult("Crop", true, crop);
        } catch(e) {
            addResult("读取设置", false, e.toString());
        }

        try {
            var s = om.getSettings();
            addResult("om.getSettings() 方法", s !== undefined, typeof s);
        } catch(e) {
            addResult("om.getSettings() 方法", false, e.toString().substring(0, 60));
        }

        try {
            var s2 = om.settings;
            addResult("om.settings 属性", false, (s2 === undefined ? "undefined" : typeof s2));
        } catch(e) {
            addResult("om.settings 属性", false, e.toString().substring(0, 60));
        }

        item.remove();
        try { c.remove(); } catch(e) {}
    })();

    // ===== 测试2: 文件扩展名自动检测 =====
    (function() {
        var c = makeTempComp();
        var rq = app.project.renderQueue;
        var item = rq.items.add(c);
        var om = item.outputModule(1);

        om.file = new File(Folder.temp.fsName + "/__test/[#####].png");

        try {
            var fmt = om.getSetting("Format");
            addResult("文件扩展名(.png)自动检测", fmt === "8" || fmt === "PNG_Sequence", "Format=" + fmt);
        } catch(e) {
            addResult("文件扩展名(.png)自动检测", false, e.toString().substring(0, 60));
        }

        item.remove();
        try { c.remove(); } catch(e) {}
    })();

    // ===== 测试3: applyTemplate 各种名称 =====
    (function() {
        var names = ["序列帧", "PNG 序列", "PNG Sequence", "PNG", "PNG Sequence with Alpha"];
        var anySuccess = false;

        for (var t = 0; t < names.length; t++) {
            var c = makeTempComp();
            var rq = app.project.renderQueue;
            var item = rq.items.add(c);
            var om = item.outputModule(1);

            try {
                om.applyTemplate(names[t]);
                var fmt = om.getSetting("Format");
                addResult(names[t], true, "Format=" + fmt);
                if (fmt === "8") anySuccess = true;

                om.saveToTemplate("__test_auto__");
                addResult("saveToTemplate(" + names[t] + ")", true, "模板已保存");

                item.remove();
                try { c.remove(); } catch(e) {}
                break;
            } catch(e) {
                addResult(names[t], false, e.toString().substring(0, 60));
                item.remove();
                try { c.remove(); } catch(e) {}
            }
        }

        addResult("任一模板成功", anySuccess, "");
    })();

    // ===== 测试4: setSetting 不同 Key =====
    (function() {
        var keys = ["Format", "File Type", "Output Format", "MainOptions.Format"];
        var keySuccess = "";

        for (var f = 0; f < keys.length; f++) {
            var c = makeTempComp();
            var rq = app.project.renderQueue;
            var item = rq.items.add(c);
            var om = item.outputModule(1);

            try {
                om.setSetting(keys[f], "8");
                var fmt = om.getSetting("Format");
                if (fmt === "8") {
                    keySuccess = keys[f] + "=8 成功";
                    addResult(keys[f] + "=8", true, "Format=" + fmt);
                    item.remove();
                    try { c.remove(); } catch(e) {}
                    break;
                }
                addResult(keys[f] + "=8", false, "Format仍为" + fmt);
                item.remove();
                try { c.remove(); } catch(e) {}
            } catch(e) {
                addResult(keys[f] + "=8", false, e.toString().substring(0, 60));
                item.remove();
                try { c.remove(); } catch(e) {}
            }
        }

        if (!keySuccess) {
            for (var f2 = 0; f2 < keys.length; f2++) {
                var c2 = makeTempComp();
                var rq2 = app.project.renderQueue;
                var item2 = rq2.items.add(c2);
                var om2 = item2.outputModule(1);

                try {
                    om2.setSetting(keys[f2], "PNG_Sequence");
                    var fmt2 = om2.getSetting("Format");
                    if (fmt2 === "8" || fmt2 === "PNG_Sequence") {
                        keySuccess = keys[f2] + "=PNG_Sequence 成功";
                        addResult(keys[f2] + "=PNG_Sequence", true, "Format=" + fmt2);
                        item2.remove();
                        try { c2.remove(); } catch(e) {}
                        break;
                    }
                    addResult(keys[f2] + "=PNG_Sequence", false, "Format仍为" + fmt2);
                    item2.remove();
                    try { c2.remove(); } catch(e) {}
                } catch(e) {
                    addResult(keys[f2] + "=PNG_Sequence", false, e.toString().substring(0, 60));
                    item2.remove();
                    try { c2.remove(); } catch(e) {}
                }
            }
        }

        addResult("setSetting 任一成功", keySuccess !== "", keySuccess || "全部失败");
    })();

    // ===== 测试5: 通过 rqItem.applyTemplate 改变渲染设置后再设格式 =====
    (function() {
        var c = makeTempComp();
        var rq = app.project.renderQueue;
        var item = rq.items.add(c);
        var om = item.outputModule(1);

        try {
            item.applyTemplate("Best Settings");
            addResult("rqItem.applyTemplate(Best Settings)", true, "");
        } catch(e) {
            addResult("rqItem.applyTemplate(Best Settings)", false, e.toString().substring(0, 60));
        }

        om.file = new File(Folder.temp.fsName + "/__test/[#####].png");
        try {
            var fmt = om.getSetting("Format");
            addResult("Best Settings后设文件.png", fmt === "8", "Format=" + fmt);
        } catch(e) {
            addResult("Best Settings后设文件.png", false, e.toString().substring(0, 60));
        }

        item.remove();
        try { c.remove(); } catch(e) {}
    })();

    // ===== 测试6: 测试 saveToTemplate 后再次应用已验证 =====
    (function() {
        var c = makeTempComp();
        var rq = app.project.renderQueue;
        var item = rq.items.add(c);
        var om = item.outputModule(1);

        try {
            om.applyTemplate("__test_auto__");
            var fmt = om.getSetting("Format");
            addResult("应用 __test_auto__ 模板", fmt === "8", "Format=" + fmt);
        } catch(e) {
            addResult("应用 __test_auto__ 模板", false, e.toString().substring(0, 60));
        }

        item.remove();
        try { c.remove(); } catch(e) {}
    })();

    // ===== 汇总 =====
    var summary = "=== 测试汇总 v2 ===\n\n";
    for (var r = 0; r < results.length; r++) {
        summary += results[r] + "\n";
    }

    alert(summary);
    $.writeln(summary);

})();
