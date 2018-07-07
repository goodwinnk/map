var DATES = ["02.07.2018"];

var queryDict = null;

function getParam(paramName) {
    if (!queryDict) {
        queryDict = {};
        location.search.substr(1).split("&").forEach(function (item) {
            var keyValue = item.split("=");
            queryDict[keyValue[0]] = keyValue[1]
        });
    }

    return queryDict[paramName]
}

function getDate() {
    var date = getParam("d");
    if (date) {
        if (DATES.includes(date)) {
            return date;
        }
    }

    return DATES[0];
}

function getGroup() {
    let groupStr = getParam("g");
    if (groupStr) {
        let groupInt = parseInt(groupStr);
        if (groupInt === -1) {
            return null;
        }
        return groupInt;
    } else {
        return null;
    }
}

/**
 * @param dateStr date string in dd.MM.YYYY format
 * @return date string in YYYY.MM.dd format
 */
function dateDir(dateStr) {
    var parts = dateStr.split('.');
    return parts[2] + "." + parts[1] + "." + parts[0];
}

function fileName() {
    var query = getParam("q");
    if (query) {
        if (query === "all") {
            return "kt-all.json";
        } else if (query === "compiler") {
            return "kt-compiler.json";
        } else if (query === "ide") {
            return "kt-ide.json";
        } else if (query === "tools") {
            return "kt-tools.json";
        } else if (query === "other") {
            return "kt-other.json";
        } else if (query === "docs") {
            return "kt-docs.json";
        } else if (query === "idea") {
            return "idea-all.json";
        }
    }

    return "kt-compiler.json";
}

function updateFilter() {
    var name = "Compiler";
    var query = getParam("q");
    if (query) {
        if (query === "all") {
            name = "All";
        } else if (query === "compiler") {
            name = "Compiler";
        } else if (query === "ide") {
            name = "IDE";
        } else if (query === "tools") {
            name ="Tools";
        } else if (query === "other") {
            name = "Other";
        } else if (query === "docs") {
            name = "Docs";
        } else if (query === "idea") {
            name = "IDEA all (Bonus)"
        }
    }

    document.getElementById("filter_selection").innerText = name;
}

function updateDate() {
    var list = document.getElementById("date_dropdown_menu");
    if (list) {
        for (var i = 0; i < DATES.length; i++) {
            var dateStr = DATES[i];

            var a = document.createElement("a");
            a.appendChild(document.createTextNode(dateStr));
            a.href = "?d=" + dateStr;
            a.onclick = (function (value) {
                return function () {
                    hrefParam("d", value);
                    return false;
                }
            })(dateStr);

            var item = document.createElement("li");
            item.appendChild(a);

            list.appendChild(item);
        }
    }

    document.getElementById("date_selection").innerText = getDate();
}

function updateGroups(compressedIssues) {
    var list = document.getElementById("group_dropdown_menu");
    var subsystems = compressedIssues.subsystems;
    if (!list || !subsystems) return;

    var groups = {};
    groups["All"] = -1;

    Object.entries(subsystems).forEach(([key, value]) => {
        groups[value] = key;
    });

    Object.keys(groups).sort().forEach(function (key) {
        var value = groups[key];
        var a = document.createElement("a");
        a.appendChild(document.createTextNode(key));
        a.href = "?g=" + key;
        a.onclick = (function (groupNumber) {
            return function () {
                hrefParam("g", groupNumber);
                return false;
            }
        })(value);

        var item = document.createElement("li");
        item.appendChild(a);

        list.appendChild(item);
    });

    var groupName = subsystems[getGroup()];
    if (!groupName) {
        groupName = "All"
    }

    document.getElementById("group_selection").innerText = groupName;
}

function loadIssues() {
    d3.json("data/" + dateDir(getDate()) + "/" + fileName()).then(function (data) {
        var title = document.getElementById("issue_title");
        if (undefined === data) {
            title.innerHTML = "No Data";
        } else {
            updateGroups(data);
            addIssues(data, getGroup());
        }
    });
}

function yt(suffix) {
    return "http://localhost/test/" + suffix;
}

function hrefParam(key, value) {
    key = encodeURI(key);
    value = encodeURI(value);

    var paramsArray = document.location.search.substr(1).split('&');

    var index = paramsArray.length;
    for (var i = 0; i < paramsArray.length; i++) {
        var x = paramsArray[i].split('=');
        if (x[0] === key) {
            index = i;
            break;
        }
    }

    paramsArray[index] = [key, value].join('=');

    document.location.search = paramsArray.join('&');
}