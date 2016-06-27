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
            window.open(d.url, '_blank');
        });

    node.append("title")
        .text(function (d) {
            return d.id + ": " + d.summary + ": " + d.priority + ": " + d.state + ": " + d.subsystems;
        });

    node.append("circle")
        .attr("r", function (d) {
            return d.r;
        })
        .style("fill", function (d) {
            if (d.priorityColor) {
                return d.priorityColor;
            } else {
                return "#aaffff";
            }
        });
    
    var MILISECONDS_IN_YEAR = 31536000000;
    var today = Date.now();

    for (var i = 1; i <= 5; i++) {
        var numberOfYears = i;

        node.filter(function (d) { return Math.abs(d.created - today) > (numberOfYears * MILISECONDS_IN_YEAR); })
            .append("circle")
            .attr("r", function (d) {
                return d.r / 6 * (6 - numberOfYears);
            })
            .style("stroke-width", 0.2)
            .style("stroke", "LightGrey")
            .style("fill", "none");
    }

    node.filter(function (d) { return d.votes > 0; })
        .append('text')
        .attr('font-family', 'FontAwesome')
        .attr('font-size', function (d) {
            return "0." + Math.floor(d.votes / 5) + "em";
        })
        .attr('x', function (d) { return -3; })
        .attr('y', function (d) { return 3; })
        .text(function(d) { return '\uf087'; });
}

d3.select(self.frameElement).style("height", height + "px");

function splitToSubsystems(issues) {
    var subsystemNodes = {};

    for (var i = 0; i < issues.length; i++) {
        var issue = issues[i];

        var subsystem = issue.subsystems;
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