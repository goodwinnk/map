var width = window.innerWidth,
    height = window.innerHeight,
    color = d3.scale.category10();

var bubble = d3.layout.pack()
    .sort(null)
    .size([width, height])
    .padding(1.5);

var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", zoom))
    .append("g");


function addIssues(issues) {
    var nodes = bubble.nodes(splitToSubsystems(issues));

    var node = svg.selectAll(".node")
        .data(nodes.filter(function (d) {
            return !d.children;
        }))
        .enter().append("g")

        .attr("class", "node")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .on('click', function (d, i) {
            window.open('https://youtrack.jetbrains.com/issue/' + d.id, '_blank');
        });

    node.append("title")
        .text(function (d) {
            return d.id + ": " + d.summary + ": " + d.Priority + ": " + d.State + ": " + d.Subsystems;
        });

    node.append("circle")
        .attr("r", function (d) {
            return d.r;
        })
        .style("fill", function (d) {
            if (d.Priority_color) {
                return d.Priority_color;
            } else {
                return "#aaffff";
            }
        });

    // node.append("circle")
    //     .attr("r", function (d) {
    //         return d.r / 3;
    //     })
    //     .style("fill", function (d) {
    //         return color(d.State);
    //     });

    // node.append('text')
    //     .attr('font-family', 'FontAwesome')
    //     .attr('font-size', function (d) {
    //         return "0." + Math.floor(d.commentsCount / 3) + "em";
    //     })
    //     .attr('x', function (d) { return -3; })
    //     .attr('y', function (d) { return 3; })
    //     .text(function(d) {
    //         if (d.commentsCount > 0) {
    //             return '\uf0e6';
    //         } else {
    //             return null;
    //         }
    //     });

    var MILISECONDS_IN_YEAR = 31536000000;
    var today = Date.now();

    for (var i = 1; i <= 5; i++) {
        var numberOfYears = i;

        node.append("circle")
            .attr("r", function (d) {
                if (Math.abs(parseInt(d.created) - today) > (numberOfYears * MILISECONDS_IN_YEAR)) {
                    return d.r / 6 * (6 - numberOfYears);
                } else {
                    return null;
                }
            })
            .style("stroke-width", 0.4)
            .style("stroke", "LightGrey")
            .style("fill", "none");
    }

    node.append('text')
        .attr('font-family', 'FontAwesome')
        .attr('font-size', function (d) {
            return "0." + Math.floor(d.votes / 5) + "em";
        })
        .attr('x', function (d) { return -3; })
        .attr('y', function (d) { return 3; })
        .text(function(d) {
            if (d.votes > 0) {
                return '\uf087';
            } else {
                return null;
            }
        });
}

d3.select(self.frameElement).style("height", height + "px");

function splitToSubsystems(issues) {
    var subsystemNodes = {};

    for (var i = 0; i < issues.length; i++) {
        var issue = issues[i];

        var subsystem = issue.Subsystems;
        var node = subsystemNodes[subsystem];

        if (typeof node === "undefined") {
            node = {
                children: []
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
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}