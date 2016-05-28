function loadIssues() {
    d3.json(yt("rest/issue/byproject/KT\?filter\=Assignee:goodwinnk&max=4"), function (error, data) {
        var title = document.getElementById("issue_title");
        if (undefined === data) {
            title.innerHTML = "No Data";
        } else {
            var result = "";
            for (var i = 0; i < data.length; i++) {
                var issue = adapt(data[i]);
                result += issue.summary + " " + issue.Priority + " " + issue.votes + "</br>";
            }

            title.innerHTML = result;
        }
    });
}

/**
 * @param {{field:[]}} issue
 * @returns {{summary:String,Priority:String,votes:I}}
 */
function adapt(issue) {
    for (var i = 0; i < issue.field.length; i++) {
        var field = issue.field[i];
        var value = field.value;
        var name = field.name;

        if (Array.isArray(value) && value.length == 1) {
            issue[name] = value[0];
        } else {
            issue[field.name] = value;
        }
    }

    delete issue.field;
    //noinspection JSValidateTypes
    return issue;
}

function yt(suffix) {
    return "http://localhost/test/" + suffix;
}