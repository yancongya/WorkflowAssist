logMessage("脚本启动 - 版本 " + SCRIPT_VERSION, LOG_LEVEL.NORMAL, "STARTUP");
logMessage("配置目录: " + configFolder.fsName, LOG_LEVEL.NORMAL, "STARTUP");
ensureConfigDir();

var win = createMainUI(thisObj);

if (thisObj instanceof Panel) {
    thisObj.layout.layout(true);
    thisObj.onResizing = thisObj.onResize = function() {
        this.layout.resize();
    };
} else {
    win.show();
}

})(this);
