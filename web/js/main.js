var SIZE = 20;
var RADIUS = SIZE / 2 * Math.sqrt(2);
var MILISECONDS_IN_YEAR = 31536000000;
var HEXAGON_POINTS = hexagon(RADIUS);

var VOTE_BASE_SIZE = 5;
var VOTE_MAX = 100;
var VOTE_FACTOR = (SIZE - VOTE_BASE_SIZE) / VOTE_MAX;

var width = window.innerWidth,
    height = window.innerHeight;

var scale = 1;

var zoom = d3.zoom().on("zoom", zoomed);

var svg = d3.select("#map")
    .append("svg")
    .attr("class", "view")
    .attr("width", width)
    .attr("height", height)
    .call(zoom);

var mainG = svg.append("g");

function addIssues(issues) {
    var issuesWithSubsystems = splitToSubsystems(issues);

    var root = d3.hierarchy(issuesWithSubsystems).count();

    var bubble = d3.pack()
        .size([width, height])
        .padding(function (d) {
            if (d === root) {
                return RADIUS;
            }

            return 0;
        });

    bubble(root);

    var leafR = RADIUS;
    var firstGroupNode = root.children[0];
    if (firstGroupNode) {
        var firstLeaf = firstGroupNode.children[0];
        if (firstLeaf) {
            leafR = firstLeaf.r;
        }
    }

    scale = leafR / RADIUS;

    root.each(function (d) {
        d.x /= scale;
        d.y /= scale;
        d.r /= scale;
    });

    var groupNode = mainG.selectAll(".group")
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
            // var firstLeaf = d.children[0];
            // var delta = firstLeaf ? firstLeaf.r / 2 : 0;
            return d.r;
        });

    groupNode
        .append("title")
        .text(function (d) {
            return "" + d.data.groups;
        });

    var node = mainG.selectAll(".issue")
        .data(root.leaves().sort(function (a, b) {
            var dy = a.y - b.y;
            if (dy > 0.001) {
                return dy;
            }
            return -(a.x - b.x);
        }))
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
        .attr("points", HEXAGON_POINTS)
        .attr("class", function (d) {
            var priority = decodePriority(d.data.p);
            if (priority === "Minor") {
                return "minor_priority";
            } else if (priority === "Normal") {
                return "normal_priority";
            } else if (priority === "Major") {
                return "major_priority";
            } else if (priority === "Critical") {
                return "critical_priority";
            }

            return "unknown_priority";
        })
    ;

    // node
    //     .append("image")
    //     .attr("xlink:href", function (d) {
    //         var priority = decodePriority(d.data.p);
    //         if (priority === "Minor") {
    //             return "../img/bushes.png"
    //         } else if (priority === "Normal") {
    //             return "../img/trees.png";
    //         } else if (priority === "Major") {
    //             return "../img/dunes.png";
    //         } else if (priority === "Critical") {
    //             return "../img/vulcano.png"
    //         }
    //
    //         return "../img/rocs.png"
    //
    //     })
    //     .attr("x", -(SIZE / 2))
    //     .attr("y", -(SIZE / 2))
    //     .attr("width", SIZE)
    //     .attr("height", SIZE);

    var today = Date.now();
    for (var i = 1; i <= 5; i++) {
        var numberOfYears = i;
        var yearRadius = RADIUS / 6 * (6 - numberOfYears);

        node
            .filter(function (d) {
                return Math.abs(d.data.c - today) > (numberOfYears * MILISECONDS_IN_YEAR);
            })
            .append("circle")
            .attr("r", yearRadius)
            .attr("class", function (d) {
                var priority = decodePriority(d.data.p);
                if (priority === "Critical") {
                    return "critical_year_circle";
                }

                return "year_circle";
            })
        ;
    }

    node
        .filter(function (d) {
            return d.data.v > 0;
        })
        .append('text')
        .attr('font-family', 'FontAwesome')
        .attr('font-size', function (d) {
            return "" + Math.ceil(VOTE_BASE_SIZE + Math.min(d.data.v, VOTE_MAX) * VOTE_FACTOR) + "px";
        })
        .attr('x', function (d) {
            return -Math.ceil(VOTE_BASE_SIZE + Math.min(d.data.v, VOTE_MAX) * VOTE_FACTOR) / 2;
        })
        .attr('y', function (d) {
            return Math.ceil(VOTE_BASE_SIZE + Math.min(d.data.v, VOTE_MAX) * VOTE_FACTOR) / 2;
        })
        .text('\uf087');

    // groupNode
    //     .append("text")
    //     .text(function (d) {
    //         return "" + d.groups;
    //     })
    //     .style("text-anchor", "middle")
    // ;

    var t = d3.zoomIdentity.scale(scale);
    zoom.transform(svg, t);
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

function zoomed() {
    var event = d3.event;
    mainG.attr("transform", event.transform);
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