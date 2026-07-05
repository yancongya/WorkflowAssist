function decodeUrlString(str) {
    try {
        return decodeURIComponent(str);
    } catch (e) {
        return str;
    }
}

function getActiveComp() {
    var item = app.project.activeItem;
    if (item && item instanceof CompItem) {
        return item;
    }
    return null;
}

function getActiveCompName() {
    var comp = getActiveComp();
    if (comp) {
        return decodeUrlString(comp.name);
    }
    return null;
}

function getCompByName(name) {
    for (var i = 1; i <= app.project.items.length; i++) {
        var item = app.project.items[i];
        if (item instanceof CompItem) {
            var itemName = decodeUrlString(item.name);
            if (itemName === name) {
                return item;
            }
        }
    }
    return null;
}

function createComp(name, width, height, frameRate, duration) {
    var pixelAspect = 1.0;
    var comp = app.project.items.addComp(name, width, height, pixelAspect, duration, frameRate);
    logMessage("创建合成: " + name + " (" + width + "x" + height + ", " + frameRate + "fps, " + duration + "s)", LOG_LEVEL.NORMAL, "AE");
    return comp;
}

function calculateFitWidthScale(sourceComp, targetComp) {
    return (targetComp.width / sourceComp.width) * 100;
}

function nestWithScale(sourceComp, targetComp, scaleMode, scalePercent) {
    var layer = targetComp.layers.add(sourceComp);

    if (scaleMode === "fit_width") {
        var scale = calculateFitWidthScale(sourceComp, targetComp);
        layer.scale.setValue([scale, scale, 100]);
        logMessage("嵌套合成 - 自适应宽度缩放: " + scale.toFixed(1) + "%", LOG_LEVEL.NORMAL, "AE");
    } else if (scaleMode === "custom") {
        layer.scale.setValue([scalePercent, scalePercent, 100]);
        logMessage("嵌套合成 - 自定义缩放: " + scalePercent + "%", LOG_LEVEL.NORMAL, "AE");
    }

    layer.label = 1;
}
