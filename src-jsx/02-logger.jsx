function logMessage(msg, level, tag) {
    if (level === undefined) level = LOG_LEVEL.NORMAL;
    if (tag === undefined) tag = "WORKFLOW";
    if (level > currentLogLevel) return;

    var timestamp = new Date().toLocaleTimeString();
    $.writeln("[" + timestamp + "][" + tag + "] " + msg);
}
