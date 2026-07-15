function ensureConfigDir() {
    if (!configFolder.exists) {
        configFolder.create();
        logMessage("创建配置目录: " + configFolder.fsName, LOG_LEVEL.NORMAL, "CONFIG");
    }
}

function scanPresetFiles() {
    ensureConfigDir();
    var files = configFolder.getFiles("*.json");
    var presets = [];
    for (var i = 0; i < files.length; i++) {
        var fileName = files[i].name.replace(/\.json$/i, "");
        fileName = decodeUrlString(fileName);
        presets.push({
            name: fileName,
            file: files[i]
        });
    }
    presets.sort(function(a, b) { return a.name < b.name ? -1 : 1; });
    return presets;
}

function getPresetResourcePath(filename) {
    return configFolder.fsName + "/" + filename;
}

function loadPreset(file) {
    if (!file.exists) return null;
    try {
        file.open("r");
        file.encoding = "UTF-8";
        var content = file.read();
        file.close();
        var data = JSON.parse(content);
        return data;
    } catch (e) {
        logMessage("读取预设文件失败: " + file.fsName + " - " + e.message, LOG_LEVEL.ERROR, "CONFIG");
        return null;
    }
}

function savePreset(file, data) {
    try {
        file.encoding = "UTF-8";
        if (file.open("w")) {
            var content = JSON.stringify(data, null, 2);
            file.write(content);
            file.close();
            return true;
        }
    } catch (e) {
        logMessage("保存预设文件失败: " + file.fsName + " - " + e.message, LOG_LEVEL.ERROR, "CONFIG");
    }
    return false;
}
