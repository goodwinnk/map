const DATES = ["02.07.2018"];
const ASSIGNEE_PARAM = "assignee";
const QUERY_PARAM = "q";
const SUBSYSTEM_PARAM = "g";

let queryDict = null;

function getParam(paramName) {
    if (!queryDict) {
        queryDict = {};
        location.search.substr(1).split("&").forEach(function (item) {
            const keyValue = item.split("=");
            queryDict[keyValue[0]] = keyValue[1]
        });
    }

    return queryDict[paramName]
}

function getDate() {
    const date = getParam("d");
    if (date) {
        if (DATES.includes(date)) {
            return date;
        }
    }

    return DATES[0];
}

function getGroup() {
    let groupStr = getParam(SUBSYSTEM_PARAM);
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

function getAssignee() {
    let groupStr = getParam(ASSIGNEE_PARAM);
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
    const parts = dateStr.split('.');
    return parts[2] + "." + parts[1] + "." + parts[0];
}

function fileName() {
    const query = getParam("q");
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
    let name = "Compiler";
    const query = getParam("q");
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
    const list = document.getElementById("date_dropdown_menu");
    if (list) {
        for (let i = 0; i < DATES.length; i++) {
            const dateStr = DATES[i];

            const a = document.createElement("a");
            a.appendChild(document.createTextNode(dateStr));
            a.href = "?d=" + dateStr;
            a.onclick = (function (value) {
                return function () {
                    hrefParam("d", value);
                    return false;
                }
            })(dateStr);

            const item = document.createElement("li");
            item.appendChild(a);

            list.appendChild(item);
        }
    }

    document.getElementById("date_selection").innerText = getDate();
}

/**
 * @param {{subsystems:Map}} compressedIssues
 */
function updateSubsystems(compressedIssues) {
    let query = getParam("q");
    if (query !== "all" && query !== "idea") return;

    document.getElementById("group_dropdown").style.display = "block";

    fillFilter(
        compressedIssues.subsystems,
        compressedIssues.subsystemCount,
        SUBSYSTEM_PARAM, [ASSIGNEE_PARAM],
        "group_dropdown_menu");
    fillFilterSelection(compressedIssues.subsystems, getGroup(), "group_selection");
}

function updateAssignees(compressedIssues) {
    fillFilter(
        compressedIssues.assignees, compressedIssues.assigneeCount,
        ASSIGNEE_PARAM, undefined,
        "assignee_dropdown_menu");
    fillFilterSelection(compressedIssues.assignees, getAssignee(), "assignee_selection");
}

function fillFilter(variantsObject, variantsCount, parameterName, clearParams, dropdownVariantsId) {
    let list = document.getElementById(dropdownVariantsId);
    if (!list || !variantsObject) return;

    const variantsNameToId = {};
    variantsNameToId["All"] = undefined;

    Object.entries(variantsObject).forEach(([key, value]) => {
        if (variantsCount !== undefined) {
            const count = variantsCount[key];
            if (count === undefined || count === 0) {
                return;
            }
        }
        variantsNameToId[value] = key;
    });

    Object.keys(variantsNameToId).sort().forEach(function (key) {
        const value = variantsNameToId[key];
        const a = document.createElement("a");

        const count = variantsCount !== undefined ? variantsCount[value] : undefined;
        const text = count === undefined ? key : key + " (" + count + ")";

        a.appendChild(document.createTextNode(text));

        a.onclick = (function (groupNumber) {
            return function () {
                hrefParam(parameterName, groupNumber, clearParams);
                return false;
            }
        })(value);

        const item = document.createElement("li");
        item.appendChild(a);

        list.appendChild(item);
    });
}

function fillFilterSelection(variantsObject, currentValue, dropdownSelectionId) {
    let groupName = variantsObject[currentValue];
    if (!groupName) {
        groupName = "All"
    }

    document.getElementById(dropdownSelectionId).innerText = groupName;
}

function loadIssues() {
    d3.json("data/" + dateDir(getDate()) + "/" + fileName()).then(function (data) {
        const title = document.getElementById("issue_title");
        if (undefined === data) {
            title.innerHTML = "No Data";
        } else {
            const updatedData = filterIssues(data);
            updateSubsystems(updatedData);
            updateAssignees(updatedData);
            addIssues(updatedData, getGroup(), getAssignee());
        }
    });
}

function filterIssues(compressedIssues) {
    const subsystem = getGroup();
    const assignee = getAssignee();

    const subsystemCount = {};
    const assigneeCount = {};

    const filteredIssues = [];

    const issues = compressedIssues.issues;
    for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        const subsystems = issue.ss;

        for (let s = 0; s < subsystems.length; s++) {
            const issueSubsystem = subsystems[s];
            if (subsystemCount[issueSubsystem] === undefined) {
                subsystemCount[issueSubsystem] = 0;
            }

            subsystemCount[issueSubsystem]++;
        }

        if (subsystem !== undefined && subsystem !== null) {
            if (!subsystems.includes(subsystem)) {
                continue;
            }
        }

        const issueAssignee = issue.a;
        if (issueAssignee !== undefined) {
            if (assigneeCount[issueAssignee] === undefined) {
                assigneeCount[issueAssignee] = 0;
            }

            assigneeCount[issueAssignee]++;
        }

        if (assignee !== undefined && assignee !== null) {
            if (assignee !== issueAssignee) {
                continue;
            }
        }

        filteredIssues.push(issue);
    }

    compressedIssues.issues = filteredIssues;
    compressedIssues["assigneeCount"] = assigneeCount;
    compressedIssues["subsystemCount"] = subsystemCount;

    return compressedIssues;
}

function yt(suffix) {
    return "http://localhost/test/" + suffix;
}

function hrefParam(key, value, clearParams) {
    const encodedKey = encodeURI(key);

    const isDefaultValue = value === undefined || value === null;

    let paramsArray = document.location.search.substr(1).split('&');
    if (paramsArray.length === 1 && paramsArray[0] === "") {
        paramsArray = [];
    }
    const filteredParams = (clearParams !== undefined || isDefaultValue) ?
        paramsArray.filter(param => {
            const [pKey] = param.split('=');
            const inClearParams = (clearParams !== undefined) ? clearParams.includes(pKey) : false;
            const isDefaultValueKey = isDefaultValue && pKey === encodedKey;
            return !(inClearParams || isDefaultValueKey);
        }) :
        paramsArray;

    if (!isDefaultValue) {
        let index = filteredParams.length;
        for (let i = 0; i < paramsArray.length; i++) {
            const [pKey] = paramsArray[i].split('=');
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

function queryHref(value) {
    hrefParam(QUERY_PARAM, value, [SUBSYSTEM_PARAM, ASSIGNEE_PARAM]);
    return false;
}