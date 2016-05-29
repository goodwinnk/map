var width = 960,
    height = 400,
    format = d3.format(",d"),
    color = d3.scale.category20c();

var bubble = d3.layout.pack()
    .sort(null)
    .size([width, height])
    .padding(1.5);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "bubble");

function addIssues(issues) {
    var nodes = bubble.nodes({"children":issues});

    var node = svg.selectAll(".node")
        .data(nodes.filter(function(d) { return !d.children; }))
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

    node.append("title")
        .text(function(d) { return d.id + ": " + d.summary + ": " + d.Priority; });

    node.append("circle")
        .attr("r", function(d) { return d.r; })
        .style("fill", function(d) { return color(d.Priority); });
}

d3.select(self.frameElement).style("height", height + "px");
