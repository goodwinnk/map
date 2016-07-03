function loadIssues() {
    d3.json("test_data/kt_all_overview.json", function (error, data) {
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