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
            return "kt-docs.json"
        }
    }

    return "kt-all.json";
}

function updateFilter() {
    var name = "All";
    var query = getParam("q");
    if (query) {
        if (query === "compiler") {
            name = "Compiler";
        } else if (query === "ide") {
            name = "IDE";
        } else if (query === "tools") {
            name ="Tools";
        } else if (query === "other") {
            name = "Other";
        } else if (query === "docs") {
            name = "Docs"
        }
    }

    document.getElementById("filter_selection").innerText = name;
}

function loadIssues() {
    d3.json("data/" + fileName()).then(function (data) {
        var title = document.getElementById("issue_title");
        if (undefined === data) {
            title.innerHTML = "No Data";
        } else {
            var result = "";
            var adapted = data.map(adapt);

            addIssues(adapted);
        }
    });
}

/**
 * @param {{field:[]}} issue
 * @returns {{summary:String,Priority:String,votes:I}}
 */
function adapt(issue) {
    issue.value = 15;
    issue.depth = 0;

    return issue;
}

function yt(suffix) {
    return "http://localhost/test/" + suffix;
}