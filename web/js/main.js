var width = window.innerWidth,
    height = window.innerHeight;

var svg = d3.select("#map")
    .append("svg")
    .attr("class", "view")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().scaleExtent([1, 8]).on("zoom", zoom))
    .append("g");

function addIssues(issues) {
    var issuesWithSubsystems = splitToSubsystems(issues);

    var root = d3.hierarchy(issuesWithSubsystems)
        .sum(function (d) {
            return 20;
        });

    var bubble = d3.pack()
        .size([width, height]);

    bubble(root);

    var groupNode = svg.selectAll(".group")
        .data(root.descendants().filter(function (d) {
            return d !== root && d.children;
        }))
        .enter().append("g")
        .attr("class", "group")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    groupNode
        .append("circle")
        .attr("r", function (d) {
            return d.r;
        });

    groupNode
        .append("title")
        .text(function (d) {
            return "" + d.data.groups;
        });

    // groupNode
    //     .append("text")
    //     .text(function (d) {
    //         return "" + d.groups;
    //     })
    //     .attr('font-size', function (d) {
    //         return "0.1em";
    //     })
    //     .style("text-anchor", "middle")
    //     .attr("y", function (d) {
    //         -d.y;
    //     });

    var node = svg.selectAll(".issue")
        .data(root.leaves())
        .enter().append("g")
        .attr("class", "issue")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .on('click', function (d, i) {
            window.open(d.data.url, '_blank');
        });

    node.append("title")
        .text(function (d) {
            var data = d.data;
            return data.id + ": " + data.summary + ": " + data.priority + ": " +
                data.state + ": " + data.subsystems + " " + data.assignee;
        });

    node.append("circle")
        .attr("r", function (d) {
            return d.r;
        })
        .style("fill", function (d) {
            var priority = d.data.priority;
            if (priority === "Minor") {
                return "lightgreen"
            } else if (priority === "Normal") {
                return "forestgreen";
            } else if (priority === "Major") {
                return "orange";
            } else if (priority === "Critical") {
                return "deeppink"
            }

            return "gray"
        })
    ;
    // // node.append("image")
    // //     .attr("xlink:href", "../img/trees.png")
    // //     .attr("x", function (d) {
    // //         return -d.r
    // //     })
    // //     .attr("y", function (d) {
    // //         return -d.r;
    // //     })
    // //     .attr("width", function (d) {
    // //         return d.r * 2;
    // //     })
    // //     .attr("height", function (d) {
    // //         return d.r * 2;
    // //     });
    //
    var MILISECONDS_IN_YEAR = 31536000000;
    var today = Date.now();

    for (var i = 1; i <= 5; i++) {
        var numberOfYears = i;

        node.filter(function (d) { return Math.abs(d.data.created - today) > (numberOfYears * MILISECONDS_IN_YEAR); })
            .append("circle")
            .attr("r", function (d) {
                return d.r / 6 * (6 - numberOfYears);
            })
            .attr("class", "year_circle")
    }

    node.filter(function (d) { return d.data.votes > 0; })
        .append('text')
        .attr('font-family', 'FontAwesome')
        .attr('font-size', function (d) {
            return "0." + Math.floor(d.votes / 5) + "em";
        })
        .attr('x', function (d) { return -3; })
        .attr('y', function (d) { return 3; })
        .text(function(d) { return '\uf087'; });
}

function splitToSubsystems(issues) {
    var subsystemNodes = {};

    for (var i = 0; i < issues.length; i++) {
        var issue = issues[i];

        var subsystem = issue.subsystems;
        var node = subsystemNodes[subsystem];

        if (typeof node === "undefined") {
            node = {
                children: [],
                groups: subsystem
            };
            subsystemNodes[subsystem] = node;
        }

        node.children.push(issue);
    }

    return {
        children: d3.values(subsystemNodes)
    };
}

function zoom() {
    var event = d3.event;
    svg.attr("transform", event.transform);
}