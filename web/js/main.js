const SIZE = 20;
const RADIUS = SIZE / 2 * Math.sqrt(2);
const A2 = RADIUS / Math.cos(Math.PI / 6);
const MILISECONDS_IN_YEAR = 31536000000;
const HEXAGON_POINTS = hexagon(RADIUS);

const VOTE_BASE_SIZE = 5;
const VOTE_MAX = 200;
const VOTE_FACTOR = (SIZE - VOTE_BASE_SIZE) / VOTE_MAX;

const width = window.innerWidth,
    height = window.innerHeight;

let scale = 1;

const zoom = d3.zoom().on("zoom", zoomed);

const svg = d3.select("#map")
    .append("svg")
    .attr("class", "view")
    .attr("width", width)
    .attr("height", height)
    .call(zoom);

const mainG = svg.append("g");
let issueSelection = null;

function addIssues(compressedIssues, selectedSubsystem) {
    issueSelection = new IssueSelection(compressedIssues);
    document.getElementById("clear_visited_button").onclick = issueSelection.clearVisited;

    if (compressedIssues.issues.length === 0) {
        return;
    }

    const coloursRainbow = ["#2c7bb6", "#00a6ca", "#00ccbc", "#90eb9d", "#ffff8c", "#f9d057", "#f29e2e", "#e76818", "#d7191c"];
    const colourRangeRainbow = d3.range(0, 1, 1.0 / (coloursRainbow.length - 1));
    colourRangeRainbow.push(1);

    const colorScaleRainbow = d3.scaleLinear()
        .domain(colourRangeRainbow)
        .range(coloursRainbow)
        .interpolate(d3.interpolateHcl);

    const votesLogScale = d3.scaleLog()
        .domain([1, VOTE_MAX + 1]);

    const issuesWithSubsystems = splitToSubsystems(compressedIssues, selectedSubsystem);

    const root = d3.hierarchy(issuesWithSubsystems)
        .sort(function (a, b) {
            let aIsChild = a.data.children === undefined;
            let bIsChild = b.data.children === undefined;

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

    const bubble = d3.pack()
        .size([width, height])
        .padding(function (d) {
            if (d === root) {
                return RADIUS;
            }

            return 0;
        });

    bubble(root);

    let leafR = RADIUS;
    const firstGroupNode = root.children[0];
    if (firstGroupNode) {
        const firstLeaf = firstGroupNode.children[0];
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

    const groupNode = mainG.selectAll(".group")
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

    const node = mainG.selectAll(".issue")
        .data(root.leaves().sort(function (a, b) {
            const dy = a.y - b.y;
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
            const groupData = d.parent.data;
            const data = d.data;
            return groupData.name + " - [" + data.id + "] " + data.s;
        })
    ;

    const issuePolygons = node.append("polygon")
        .attr("class", "issue_polygon")
        .attr("points", HEXAGON_POINTS)
        .attr("fill", function (d) {
            let votes = d.data.v;
            if (!votes) {
                votes = 0;
            }

            votes += 1;

            return colorScaleRainbow(votesLogScale(votes));
        })
        .on("click", function (d) {
            issueSelection.selectIssue(this, d);
        });

    const today = Date.now();
    for (let i = 1; i <= 5; i++) {
        const numberOfYears = i;
        const yearRadius = RADIUS / 6 * (6 - numberOfYears);

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

    const labelsSelection = mainG.selectAll(".group_label")
        .data(root.descendants().filter(function (d) {
            return d !== root && d.children;
        }))
        .enter().append("g")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .append("text")
        .attr("class", "group_label")
        .text(function (d) {
            const groupName = d.data.name;
            return d.children.length <= 5 ? "" + groupName : "" + groupName + " (" + d.children.length + ")";
        })
        .attr("y", function (d) {
            return -d.r - 10;
        })
        .attr("text-anchor", "middle");

    issueSelection.insertBefore = labelsSelection.nodes()[0].parentNode;

    let firstIssue = compressedIssues.issues[0];
    if (firstIssue) {
        const visitedIssuesSet = issueSelection.fetchVisited(firstIssue.id);
        issuePolygons
            .filter((d) => {
                return visitedIssuesSet[d.data.id];
            })
            .each((d, index, nodes) => {
                issueSelection.markVisited(nodes[index]);
            });
    }

    if (scale >= 1) {
        if (scale > 2) {
            zoom.scaleExtent([1, scale]);
        } else {
            zoom.scaleExtent([1, 2]);
        }
    } else {
        zoom.scaleExtent([scale, 2]);
    }
    const t = d3.zoomIdentity.scale(scale);
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

    this.insertBefore = null;

    this.selected = null;
}

IssueSelection.prototype.closePopup = function () {
    if (this.selected) {
        const oldPolygon = d3.select(this.selected);
        oldPolygon.classed("issue_selected", false);
        oldPolygon.classed("issue_visited", true);
        this.selected = null;
        this.selectedIssuePanel.style.display = "none";
    }
};

IssueSelection.prototype.updateVisited = function(issueId) {
    let [prefix, number] = issueId.split("-");
    const key = prefix + Math.floor(parseInt(number) / 1000);
    let visitedStr = store.get(key);
    if (visitedStr === undefined) {
        visitedStr = "";
    }

    const visited = visitedStr.split("\n");
    if (!visited.includes(issueId)) {
        visitedStr += issueId + "\n";
        store.set(key, visitedStr);
    }
};

IssueSelection.prototype.fetchVisited = function (someId) {
    let [prefix] = someId.split("-");

    const all = {};

    store.each((value, key) => {
        if (key.startsWith(prefix)) {
            let issuesIds = value.split("\n");
            for (const id of issuesIds) {
                all[id] = true;
            }
        }
    });

    return all;
};

IssueSelection.prototype.clearVisited = function () {
    store.clearAll();
    location.reload();
};

IssueSelection.prototype.markVisited = function (polygonNode) {
    const oldParent = polygonNode.parentNode;
    const oldGrand = oldParent.parentNode;

    if (this.insertBefore != null) {
        oldGrand.insertBefore(oldParent, this.insertBefore);
    } else {
        oldGrand.appendChild(oldParent);
    }

    const oldPolygon = d3.select(polygonNode);
    oldPolygon.classed("issue_selected", false);
    oldPolygon.classed("issue_visited", true);

    d3.select(oldParent)
        .append("line")
        .attr("x1", 0)
        .attr("y1", -A2 + 3)
        .attr("x2", 0)
        .attr("y2", -A2 + 6)
        .attr("class", "issue_visited");
};

IssueSelection.prototype.selectIssue = function(eventReceiver, d) {
    if (this.selected) {
        this.markVisited(this.selected);
    } else {
        this.selectedIssuePanel.style.display = "block";
    }

    if (this.selected === eventReceiver) {
        this.selected = null;
        this.selectedIssuePanel.style.display = "none";
    } else {
        const polygon = d3.select(eventReceiver);
        const parent = eventReceiver.parentNode;
        const grand = parent.parentNode;

        this.updateVisited(d.data.id);

        if (this.insertBefore != null) {
            grand.insertBefore(parent, this.insertBefore);
        } else {
            grand.appendChild(parent);
        }

        polygon.classed("issue_visited", false);
        polygon.classed("issue_selected", true);

        this.selected = eventReceiver;
    }

    const data = d.data;
    this.selectedReferenceElement.innerText = "[" + data.id + "]";
    this.selectedReferenceElement.href = "https://youtrack.jetbrains.com/issue/" + d.data.id;
    this.descriptionElement.innerText = data.s;
    this.priorityElement.innerText = decodePriority(this.compressedIssues, data.p);
    this.subsystemElement.innerText = decodeSubsystems(this.compressedIssues, data.ss);
    this.statusElement.innerText = decodeState(this.compressedIssues, data.st);
    this.assigneeElement.innerText = decodeAssignee(this.compressedIssues, data.a);
};

/**
 *
 * @param {{issues:Array()}}compressedIssues
 * @param selectedSubsystem
 * @return {{children}}
 */
function splitToSubsystems(compressedIssues, selectedSubsystem) {
    const issues = compressedIssues.issues;
    const subsystemNodes = {};

    for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        const subsystems = issue.ss;
        for (let s = 0; s < subsystems.length; s++) {
            const subsystem = subsystems[s];
            if (selectedSubsystem !== undefined && selectedSubsystem !== null) {
                if (selectedSubsystem !== subsystem) {
                    continue;
                }
            }

            let subsystemNode = subsystemNodes[subsystem];
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
    const event = d3.event;
    mainG.attr("transform", event.transform);
}

function hexagon(r) {
    let a = A2 / 2;
    return "" +
        0 + "," + (-A2) + " " +
        r + "," + (-a) + " " +
        r + "," + a + " " +
        0 + "," + A2 + " " +
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

