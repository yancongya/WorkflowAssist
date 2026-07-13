var SCRIPT_VERSION = "1.0";
var SCRIPT_TITLE = "WorkflowAssist";
var MAIN_PANEL_TITLE = "工作流助手";

var LOG_LEVEL = {
    ERROR: 0,
    NORMAL: 1,
    VERBOSE: 2
};
var currentLogLevel = LOG_LEVEL.NORMAL;

var scriptFile = new File($.fileName);
var scriptDir = scriptFile.parent;
var configFolder = new Folder(scriptDir.fsName + "/WorkflowAssist");

var CONFIG_DIR_NAME = "WorkflowAssist";

// ======================== 外部脚本路径配置 ========================
// 修改以下路径可自定义外部脚本位置
var EXT_SCRIPTS = {
    compress: "F:/插件脚本开发/auto_tiny/source/auto_tiny2.0.6.jsx"
    // 以后新增外部脚本在此添加，格式: key: "路径"
};
