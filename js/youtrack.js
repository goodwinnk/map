function loadIssues() {
    d3.json("test_data/test-10.json", function (error, data) {
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

    issue.value = 15;
    issue.depth = 0;

    delete issue.field;
    //noinspection JSValidateTypes
    return issue;
}

function yt(suffix) {
    return "http://localhost/test/" + suffix;
}