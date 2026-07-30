function setupLoopAnimation(comp, layer, loopDuration) {
    logMessage("设置循环动画: comp=" + decodeUrlString(comp.name) + ", layer=" + layer.name + ", duration=" + loopDuration + "s", LOG_LEVEL.NORMAL, "LOOP");

    // === 第 1 层：原始图层提前 1 秒 ===
    layer.startTime -= 1;

    // 设置工作区
    comp.workAreaStart = 0;
    comp.workAreaDuration = loopDuration;

    // === 第 2 层：复制层，放到循环衔接位置，淡入 0→100 ===
    var layer2 = layer.duplicate();
    layer2.startTime += loopDuration;

    var op2 = layer2.property("Opacity");
    if (op2) {
        op2.setValueAtTime(layer2.startTime, 0);
        op2.setValueAtTime(layer2.startTime + 1, 100);
    }

    // === 第 3 层：从第 2 层第二个关键帧处派生，后半段移到合成开头 ===
    var splitTime = layer2.startTime + 1;
    var layer3 = layer2.duplicate();
    layer2.outPoint = splitTime;

    // 原层 startTime=-1，合成 0 帧自动对齐到源素材第 1 秒（裁切起点）
    layer3.startTime = -1;
    layer3.inPoint = 0;
    layer3.outPoint = 1;

    // 常量 100% 透明度（去除继承的淡入关键帧）
    var op3 = layer3.property("Opacity");
    if (op3) {
        while (op3.numKeys > 0) {
            op3.removeKey(1);
        }
        op3.setValue(100);
    }

    // 标记首帧和展示帧
    var markers = comp.markerProperty;
    markers.setValueAtTime(0, new MarkerValue("\u9996\u5E27"));
    markers.setValueAtTime(loopDuration, new MarkerValue("\u5C55\u793A\u5E27"));

    logMessage("循环动画设置完成: 第2层淡入段裁切保留原位, 第3层后半段移到开头", LOG_LEVEL.NORMAL, "LOOP");
}
