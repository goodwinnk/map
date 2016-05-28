var width = 960,
    height = 500,
    radius = 300;

var p0 = [250, 200, 60],
    p1 = [560, 300, 120];

var svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");