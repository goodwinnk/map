var SIZE = 20;
var RADIUS = SIZE / 2 * Math.sqrt(2);
var MILISECONDS_IN_YEAR = 31536000000;
var HEXAGON_POINTS = hexagon(RADIUS);

var VOTE_BASE_SIZE = 5;
var VOTE_MAX = 200;
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
var issueSelection = null;

function addIssues(compressedIssues) {
    issueSelection = new IssueSelection(compressedIssues);

    var coloursRainbow = ["#2c7bb6", "#00a6ca", "#00ccbc", "#90eb9d", "#ffff8c", "#f9d057", "#f29e2e", "#e76818", "#d7191c"];
    var colourRangeRainbow = d3.range(0, 1, 1.0 / (coloursRainbow.length - 1));
    colourRangeRainbow.push(1);

    var colorScaleRainbow = d3.scaleLinear()
        .domain(colourRangeRainbow)
        .range(coloursRainbow)
        .interpolate(d3.interpolateHcl);

    var votesLogScale = d3.scaleLog()
        .domain([1, VOTE_MAX + 1]);

    var issuesWithSubsystems = splitToSubsystems(compressedIssues);

    var root = d3.hierarchy(issuesWithSubsystems)
        .sort(function (a, b) {
            var aIsChild = a.data.children === undefined;
            var bIsChild = b.data.children === undefined;

            if (aIsChild && bIsChild) {
                if (b.data.v !== a.data.v) {
                    return b.data.v - a.data.v;
                }

                return a.data.c - b.data.c;
            }

            if (!aIsChild && !bIsChild) {
                return b.children.length - a.children.length;
            }

            return 0;
        })
        .count();

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
            return d.r + 3;
        });

    groupNode
        .append("title")
        .text(function (d) {
            return d.data.name;
        });

    var node = mainG.selectAll(".issue")
        .data(root.leaves().sort(function (a, b) {
            var dy = a.y - b.y;
            if (dy > 0.001) {
                return dy;
            }
            return -(a.x - b.x);
        }))
        .enter()
        .append("g")
        .attr("class", "issue")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
    ;

    node.append("title")
        .text(function (d) {
            var groupData = d.parent.data;
            var data = d.data;
            return groupData.name + " - [" + data.id + "] " + data.s;
        })
    ;

    node.append("polygon")
        .attr("class", "issue_polygon")
        .attr("points", HEXAGON_POINTS)
        .attr("fill", function (d) {
            var votes = d.data.v;
            if (!votes) {
                votes = 0;
            }

            votes += 1;

            return colorScaleRainbow(votesLogScale(votes));
        })
        .on("click", function (d) {
            issueSelection.selectIssue(this, d);
        })
    ;

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
                if (!d.data.v) {
                    return "unvoted_year_circle";
                }
                return "year_circle";
            });
    }

    node
        .filter(function (d) {
            return d.data.v > 0;
        })
        .append('text')
        .attr("class", "vote_text")
        .attr('font-size', function (d) {
            return "" + Math.ceil(VOTE_BASE_SIZE + Math.min(d.data.v, VOTE_MAX) * VOTE_FACTOR) + "px";
        })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .text(function (d) {
            return d.data.v;
        });

    var groupLabels = mainG.selectAll(".groups-label")
        .data(root.descendants().filter(function (d) {
            return d !== root && d.children;
        }))
        .enter().append("g")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .append("text")
        .attr("class", "group-label")
        .text(function (d) {
            var groupName = d.data.name;
            return d.children.length <= 5 ? "" + groupName : "" + groupName + " (" + d.children.length + ")";
        })
        .attr("y", function (d) {
            return -d.r - 10;
        })
        .attr("text-anchor", "middle");

    if (scale >= 1) {
        zoom.scaleExtent([1, 2]);
    } else {
        zoom.scaleExtent([scale, 2]);
    }
    var t = d3.zoomIdentity.scale(scale);
    zoom.transform(svg, t);
}

function IssueSelection(compressedIssues) {
    this.compressedIssues = compressedIssues;

    this.selectedIssuePanel = document.getElementById("selected-issue-panel");
    this.selectedReferenceElement = document.getElementById("selected-issue-ref");
    this.descriptionElement = document.getElementById("selected-issue-description");
    this.subsystemElement = document.getElementById("selected-issue-subsystem");
    this.priorityElement = document.getElementById("selected-issue-priority");
    this.statusElement = document.getElementById("selected-issue-status");
    this.assigneeElement = document.getElementById("selected-issue-assignee");

    this.selected = null;
}

IssueSelection.prototype.closePopup = function () {
    if (this.selected) {
        d3.select(this.selected).classed("issue_selected", false);
        this.selected = null;
        this.selectedIssuePanel.style.display = "none";
    }
};

IssueSelection.prototype.selectIssue = function(eventReceiver, d) {
    var polygon = d3.select(eventReceiver);

    if (this.selected) {
        d3.select(this.selected).classed("issue_selected", false);
    } else {
        this.selectedIssuePanel.style.display = "block";
    }

    if (this.selected === eventReceiver) {
        this.selected = null;
        this.selectedIssuePanel.style.display = "none";
    } else {
        polygon.classed("issue_selected", true);
        this.selected = eventReceiver;
    }

    var data = d.data;
    this.selectedReferenceElement.innerText = "[" + data.id + "]";
    this.selectedReferenceElement.href = "https://youtrack.jetbrains.com/issue/" + d.data.id;
    this.descriptionElement.innerText = data.s;
    this.priorityElement.innerText = decodePriority(this.compressedIssues, data.p);
    this.subsystemElement.innerText = decodeSubsystems(this.compressedIssues, data.ss);
    this.statusElement.innerText = decodeState(this.compressedIssues, data.st);
    this.assigneeElement.innerText = decodeAssignee(this.compressedIssues, data.a);
};

function splitToSubsystems(compressedIssues) {
    var issues = compressedIssues.issues;
    var subsystemNodes = {};

    for (var i = 0; i < issues.length; i++) {
        var issue = issues[i];

        var subsystems = issue.ss;
        for (var s = 0; s < subsystems.length; s++) {
            var subsystem = subsystems[s];
            var subsystemNode = subsystemNodes[subsystem];

            if (typeof subsystemNode === "undefined") {
                subsystemNode = {
                    children: [],
                    name: decodeSubsystem(compressedIssues, subsystem)
                };
                subsystemNodes[subsystem] = subsystemNode;
            }

            subsystemNode.children.push(issue);
        }
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

function decodeSubsystems(compressedIssues, subsystems) {
    return subsystems.map(function(subsystem) {
        return decodeSubsystem(compressedIssues, subsystem)
    });
}

function decodeSubsystem(compressedIssues, subsystem) {
    return compressedIssues.subsystems[subsystem];
}

function decodeAssignee(compressedIssues, assignee) {
    if (!assignee) return "Unassigned";
    return compressedIssues.assignees[assignee];
}

function decodePriority(compressedIssues, priority) {
    if (!priority) return "No Priority";
    return compressedIssues.priorities[priority];
}

function decodeState(compressedIssues, state) {
    return compressedIssues.states[state];
}

