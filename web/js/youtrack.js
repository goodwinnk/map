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
    let query = getParam("q");
    if (query !== "all" && query !== "idea") return;

    document.getElementById("group_dropdown").style.display = "block";

    var list = document.getElementById("group_dropdown_menu");
    var subsystems = compressedIssues.subsystems;
    if (!list || !subsystems) return;

    var groups = {};
    groups["All"] = undefined;

    Object.entries(subsystems).forEach(([key, value]) => {
        groups[value] = key;
    });

    Object.keys(groups).sort().forEach(function (key) {
        var value = groups[key];
        var a = document.createElement("a");
        a.appendChild(document.createTextNode(key));
        a.href = key !== undefined ? "?g=" + key : "";
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

function hrefParam(key, value, clearParams) {
    const encodedKey = encodeURI(key);

    const isDefaultValue = value === undefined || value === null;

    var paramsArray = document.location.search.substr(1).split('&');
    if (paramsArray.length === 1 && paramsArray[0] === "") {
        paramsArray = [];
    }
    const filteredParams = (clearParams !== undefined || isDefaultValue) ?
        paramsArray.filter(param => {
            var [pKey] = param.split('=');
            var inClearParams = (clearParams !== undefined) ? clearParams.includes(pKey) : false;
            var isDefaultValueKey = isDefaultValue && pKey === encodedKey;
            return !(inClearParams || isDefaultValueKey);
        }) :
        paramsArray;

    if (!isDefaultValue) {
        var index = filteredParams.length;
        for (var i = 0; i < paramsArray.length; i++) {
            var [pKey] = paramsArray[i].split('=');
            if (pKey === encodedKey) {
                index = i;
                break;
            }
        }

        filteredParams[index] = [encodedKey, encodeURI(value)].join('=');
    }

    if (filteredParams.length === 0) {
        document.location.href = document.location.href.split("?")[0];
        return;
    }

    document.location.search = filteredParams.join('&');
}