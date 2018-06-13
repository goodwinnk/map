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
        .size([width, height])
        .padding(function (d) {
            if (d === root) {
                var firstGroupNode = root.children[0];
                if (firstGroupNode) {
                    var firstLeaf = firstGroupNode.children[0];
                    if (firstLeaf) {
                        return 20 * 2;
                    }
                }
            }

            return 0;
        });

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
            var firstLeaf = d.children[0];
            var delta = firstLeaf ? firstLeaf.r / 2 : 0;
            return d.r + 5;
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
            window.open("https://youtrack.jetbrains.com/issue/" + d.data.id, '_blank');
        });

    node.append("title")
        .text(function (d) {
            var data = d.data;
            return data.id + ": " + data.s + ": " +
                decodePriority(data.p) + ": " +
                decodeState(data.st) + ": " + data.ss + " " + data.a;
        });

    node.append("polygon")
        .attr("points", function (d) {
            return hexagon(d.r);
        })
        .style("fill", function (d) {
            var priority = decodePriority(d.data.p);
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
        .style("stroke", "lightgray")
        .style("stroke-width", function (d) {
            return 1 * d.r / 20;
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

        node
            .filter(function (d) {
                return Math.abs(d.data.c - today) > (numberOfYears * MILISECONDS_IN_YEAR);
            })
            .append("circle")
            .attr("r", function (d) {
                return d.r / 6 * (6 - numberOfYears);
            })
            .attr("class", "year_circle")
            .style("stroke-width", function (d) {
                return 1 * d.r / 20;
            })
        ;
    }

    // node.filter(function (d) { return d.data.v > 0; })
    //     .append('text')
    //     .attr('font-family', 'FontAwesome')
    //     .attr('font-size', function (d) {
    //         return "0." + Math.floor(d.votes / 5) + "em";
    //     })
    //     .attr('x', function (d) { return -3; })
    //     .attr('y', function (d) { return 3; })
    //     .text(function(d) { return '\uf087'; });
}

function splitToSubsystems(issues) {
    var subsystemNodes = {};

    for (var i = 0; i < issues.length; i++) {
        var issue = issues[i];

        var subsystem = issue.ss;
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

function hexagon(r) {
    var a2 = r / Math.cos(Math.PI / 6);
    var a = a2 / 2;
    return "" +
        0 + "," + (-a2) + " " +
        r + "," + (-a) + " " +
        r + "," + a + " " +
        0 + "," + a2 + " " +
        (-r) + "," + a + " " +
        (-r) + "," + (-a);
}

var encodedPriority = {
    "c": "Critical",
    "m": "Major",
    "n": "Normal",
    "mi": "Minor",
    "np": "No Priority",
    "u": "undefined"
};

function decodePriority(priority) {
    var dPriority = encodedPriority[priority];
    return dPriority ? dPriority : priority;
}

var encodedState = {
    "Op": "Open",
    "Sub": "Submitted",
    "WFR": "Wait for Reply",
    "Inv": "Investigating",
    "Rep": "Reproduction",
    "TBD": "To be discussed",
    "Spec": "Spec Needed",
    "InPr": "In Progress",
    "CNR": "Can't Reproduce",
    "Dup": "Duplicate",
    "F": "Fixed",
    "AsD": "As Designed",
    "Ob": "Obsolete",
    "Plan": "Planned",
    "TBC": "To be considered",
    "Dec": "Declined"
};

function decodeState(state) {
    var dState = encodedState[state];
    return dState ? dState : state
}