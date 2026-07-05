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
