const SIZE = 20;
const RADIUS = SIZE / 2 * Math.sqrt(2);
const A2 = RADIUS / Math.cos(Math.PI / 6);
const MILISECONDS_IN_YEAR = 31536000000;
const HEXAGON_POINTS = hexagon();

const VOTE_BASE_SIZE = 5;
const VOTE_MAX = 200;
const VOTE_FACTOR = (SIZE - VOTE_BASE_SIZE) / VOTE_MAX;

const width = window.innerWidth,
    height = Math.max(window.innerHeight - 55, 100);

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

function addIssues(compressedIssues, selectedSubsystem, selectedAssignee, selectedGrouping) {
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

    let groupedIssues;
    if (selectedGrouping === "a") {
        groupedIssues = splitToGroups(
            compressedIssues,
            selectedAssignee,
            function (issue) {
                return [issue.a];
            },
            function (ci, ss) {
                return decodeAssignee(ci, ss);
            });
    } else {
        groupedIssues = splitToGroups(
            compressedIssues,
            selectedSubsystem,
            function (issue) {
                return issue.ss;
            },
            function (ci, ss) {
                return decodeSubsystem(ci, ss);
            });
    }
    
    const root = d3.hierarchy(groupedIssues)
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
                const numberOfIssues = compressedIssues.issues.length;
                if (numberOfIssues > 150) {
                    return RADIUS;
                } else {
                    const n = 17 - Math.sqrt(numberOfIssues);
                    return n * n;
                }
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

    const groupNodes = groupNode.nodes();
    if (groupNodes !== undefined && groupNodes.length > 0) {
        issueSelection.lastGroupNode = groupNodes[groupNodes.length - 1];
    }

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

    let dx = 0;
    let dy = 0;
    if (scale > 2) {
        dx = (width / 2) - (width / scale);
        dy = (height / 2) - (height / scale);
        scale = 2;
    }

    if (scale >= 1) {
        zoom.scaleExtent([1, 2]);
    } else {
        zoom.scaleExtent([scale, 2]);
    }

    const t = d3.zoomIdentity.translate(dx, dy).scale(scale);
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
    this.lastGroupNode = null;

    this.selected = null;
}

IssueSelection.prototype.closePopup = function () {
    if (this.selected) {
        const oldPolygon = d3.select(this.selected);
        oldPolygon.classed("issue_selected", false);

        this.markVisited(this.selected);

        this.selected = null;
        this.selectedIssuePanel.style.display = "none";
    }
};

IssueSelection.prototype.forget = function () {
    if (this.selected) {
        const oldPolygon = d3.select(this.selected);
        oldPolygon.classed("issue_selected", false);

        let issueId = oldPolygon.data()[0].data.id;
        this.removeVisited(issueId);

        this.markUnvisited(this.selected);

        this.selected = null;
        this.selectedIssuePanel.style.display = "none";
    }

    return false;
};

IssueSelection.prototype.updateVisited = function(issueId) {
    let [key, visitedStr] = this.fetchKeyToBucketString(issueId);

    const visited = visitedStr.split("\n");

    if (!visited.includes(issueId)) {
        visitedStr += issueId + "\n";
        store.set(key, visitedStr);
    }
};

IssueSelection.prototype.removeVisited = function(issueId) {
    let [key, visitedStr] = this.fetchKeyToBucketString(issueId);
    store.set(key, visitedStr.replace(issueId + "\n", ""));
};

IssueSelection.prototype.fetchKeyToBucketString = function (issueId) {
    let [prefix, number] = issueId.split("-");
    const key = prefix + Math.floor(parseInt(number) / 1000);
    let visitedStr = store.get(key);
    if (visitedStr === undefined) {
        visitedStr = "";
    }

    return [key, visitedStr];
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
    store.set("first.visit", "false");
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

    const lengthX = 3;
    const lengthY = 4;
    const margin = 0;

    d3.select(oldParent)
        .append("line")
        .attr("x1", 0)
        .attr("y1", -A2 + margin)
        .attr("x2", 0)
        .attr("y2", -A2 + margin + lengthY)
        .attr("class", "issue_visited_inside");

    d3.select(oldParent)
        .append("line")
        .attr("x1", 0)
        .attr("y1", A2 - (margin + lengthY))
        .attr("x2", 0)
        .attr("y2", A2 - margin)
        .attr("class", "issue_visited_inside");

    d3.select(oldParent)
        .append("line")
        .attr("x1", RADIUS - (margin + lengthX))
        .attr("y1", 0)
        .attr("x2", RADIUS - margin)
        .attr("y2", 0)
        .attr("class", "issue_visited_inside");

    d3.select(oldParent)
        .append("line")
        .attr("x1", -RADIUS + (margin + lengthX))
        .attr("y1", 0)
        .attr("x2", -RADIUS + margin)
        .attr("y2", 0)
        .attr("class", "issue_visited_inside");
};

IssueSelection.prototype.markUnvisited = function (polygonNode) {
    const oldParent = polygonNode.parentNode;
    const oldGrand = oldParent.parentNode;

    const oldPolygon = d3.select(polygonNode);
    oldPolygon.classed("issue_selected", false);
    oldPolygon.classed("issue_visited", false);

    if (this.lastGroupNode != null) {
        oldGrand.insertBefore(oldParent, this.lastGroupNode.nextSibling);
    }

    d3.select(oldParent).selectAll(".issue_visited_inside").remove();
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
 * @param groupSelector
 * @param selectedGroup
 * @param groupPresenter
 * @return {{children}}
 */
function splitToGroups(compressedIssues, selectedGroup, groupSelector, groupPresenter) {
    const issues = compressedIssues.issues;
    const groupNodes = {};

    for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        let issueGroups = groupSelector(issue);
        if (issueGroups === undefined || issueGroups.length === 0) {
            issueGroups = [undefined]
        }
        
        for (let index = 0; index < issueGroups.length; index++) {
            let group = issueGroups[index];
            if (selectedGroup !== undefined && selectedGroup !== null) {
                if (selectedGroup === UNSPECIFIED_VALUE) {
                    if (group !== undefined) {
                        continue;
                    }
                } else {
                    if (selectedGroup !== group) {
                        continue;
                    }
                }
            }

            let groupNode = groupNodes[group];
            if (typeof groupNode === "undefined") {
                groupNode = {
                    children: [],
                    name: groupPresenter(compressedIssues, group) 
                };
                groupNodes[group] = groupNode;
            }

            groupNode.children.push(issue);
        }
    }

    return {
        children: d3.values(groupNodes)
    };
}

function zoomed() {
    const event = d3.event;
    mainG.attr("transform", event.transform);
}

function hexagon() {
    let a = A2 / 2;
    return "" +
        0 + "," + (-A2) + " " +
        RADIUS + "," + (-a) + " " +
        RADIUS + "," + a + " " +
        0 + "," + A2 + " " +
        (-RADIUS) + "," + a + " " +
        (-RADIUS) + "," + (-a);
}

function decodeSubsystems(compressedIssues, subsystems) {
    return subsystems.map(function(subsystem) {
        return decodeSubsystem(compressedIssues, subsystem)
    });
}

function decodeSubsystem(compressedIssues, subsystem) {
    if (subsystem === undefined) return "Unspecified";
    return compressedIssues.subsystems[subsystem];
}

function decodeAssignee(compressedIssues, assignee) {
    if (assignee === null || assignee === undefined)  return "Unassigned";
    return compressedIssues.assignees[assignee];
}

function decodePriority(compressedIssues, priority) {
    if (priority === null || priority === undefined) return "No Priority";
    return compressedIssues.priorities[priority];
}

function decodeState(compressedIssues, state) {
    return compressedIssues.states[state];
}

