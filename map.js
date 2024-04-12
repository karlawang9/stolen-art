const svg = d3.select("#choropleth");
const width = svg.attr("width");
const height = svg.attr("height");
const margin = { top: 20, right: 20, bottom: 20, left:20};
const mapWidth = width - margin.left - margin.right;
const mapHeight = height - margin.top - margin.bottom;
const map = svg.append("g")
                .attr("transform",`translate(${margin.left},${margin.top})`);
const legend = svg.append("g")
                    .attr("transform",`translate(${margin.left+60},${height/2.0})`);

const requestMapData = async function() {

    // load data
    const world = await d3.json("../countries-110m.json");
    const artData = await d3.csv("../interpol_country_data.csv"); // no autotype since we want country codes to be read in as strings
    artData.forEach( (d, i) => {
        d.total = Number(d.total); // now convert totals to numeric data
    });

    // initialize dict for reference later
    var countryDict = {}
    artData.forEach (d => {
        countryDict[d.country_code] = d;
    });


    // ***** BASE MAP VISUALIZATION *****
    // set up underlying map structure
    var countries = topojson.feature(world, world.objects.countries);
    var countriesMesh = topojson.mesh(world, world.objects.countries);
    var projection = d3.geoNaturalEarth1()
                        .fitSize([mapWidth, mapHeight], countries)
                        .clipExtent([[70, 0], [width, height - 140]]); //shift Antarctica and pacific US islands out of view;
    var path = d3.geoPath().projection(projection);

    map.selectAll("path.country").data(countries.features)
                            .join("path")
                            .attr("class", "country")
                            .attr("note", d => d.id) 
                            .attr("d", path)
                            .on("mouseover",  mouseEntersCountry)
                            .on("mouseout",  mouseLeavesCountry);

    map.append("path").datum(countriesMesh)
                        .attr("class", "outline")
                        .attr("d", path);

    // set up colorscale and color in countries
    var colors = ["#fff", "#a4bcd5", "#8895c4", "#7467ad", "#642d89"];
    const colorScale = d3.scaleQuantile()
                            .domain(d3.map(artData, d => d.total))
                            .range(colors);
    let getColor = d => {
        let countryData = countryDict[d.id];
        if (countryData === undefined) {
            return "lightgrey";
        }
        else return colorScale(countryData.total);
    }
    map.selectAll(".country")
        .style("fill", d => getColor(d));


    // ***** MOUSEOVER INTERACTIVITY *****
    let momesh =  map.append("path")
                        .attr("class","mouseover outline")
                        .style("stroke", "black")
                        .style("stroke-width", 3)
                        .attr("d", "");

    let tooltipWidth = 150;
    let tooltipHeight = 40;
    
    let tooltip = map.append("g")
                    .attr("class","tooltip")
                    .attr("visibility","hidden");

    tooltip.append("rect")
            .attr("fill", "black")
            .attr("opacity", 0.8)
            .attr("x", -tooltipWidth / 2.0)
            .attr("y", 0)
            .attr("width",tooltipWidth)
            .attr("height",tooltipHeight)

    let txt = tooltip.append("text")
                    .attr("fill", "white")
                    .attr("text-anchor","middle")
                    .attr("alignment-baseline","hanging")
                    .attr("x", 0)
                    .attr("y", 2);
    let txt2 = tooltip.append("text")
                    .attr("fill", "white")
                    .attr("text-anchor","middle")
                    .attr("alignment-baseline","hanging")
                    .attr("x", 0)
                    .attr("y", 22);    
                    
    function mouseEntersCountry() {
        let country = d3.select(this);
        let countryID = country.datum().id;
        let countryDat = countryDict[countryID];
        
        if (countryDat !== undefined) {
            txt.text(countryDat.country_name);
            txt2.text("# of Art Stolen: " + countryDat.total);

            tooltip.style("visibility", "visible");
            txt.text(countryDat.country_name);
            txt2.text("# of Art Stolen: " + countryDat.total);
            
            let bounds = path.bounds( country.datum() );

            let xPos = (bounds[0][0]+bounds[1][0])/2.0;
            let yPos = bounds[1][1] - 15;
            
            tooltip.attr("transform",`translate(${xPos},${yPos})`);
            
            var mo = topojson.mesh(world, world.objects.countries, function(a, b) { return a.id === countryID || b.id === countryID; });
            
            momesh.datum(mo).attr("d", path)
        };
    };
    function mouseLeavesCountry() {
        tooltip.style("visibility","hidden");
        let country = d3.select(this);
        momesh.attr("d", "");
    };


    // ***** MAP LEGEND *****
    // get quantile thresholds
    let thresholds = colorScale.quantiles();
    thresholds = thresholds.map(t => Math.round(t))
    let legendThresholds = [];

    // create dictionary of legend entries and colors
    // will only use last 4 colors from colorscale since first two colors are just 0 thresholds
    for (i=0; i<thresholds.length; i++) {
        if (i == 0) {
            legendThresholds.push(
                {
                    "text": String(thresholds[i]),
                    "color": colors[i+1]
                });
        }
        else if (i !== 3) {
            legendThresholds.push(
                {
                    "text": String(thresholds[i]) + " to " + String(thresholds[i+1]-1), 
                    "color": colors[i+1]
                });
        }
        else {
            legendThresholds.push(
                {
                    "text": String(thresholds[i]) + " and up",
                    "color": colors[i+1]
                });
        };
    };

    // add last legend entry for no data countries
    legendThresholds.push(
        {
            "text": "No data",
            "color": "lightgrey"
        }
    );

    // add the legend color boxes and text labels
    legend.append("text")
            .text("Art Theft Volume")
            .attr("alignment-baseline","hanging")
            .style("font-weight", "bold");
    legendThresholds.forEach ( (d, i) => {
        legend.append("rect")
                .attr("x", 10)
                .attr("y", (i+1) * 22)
                .attr("width", 15)
                .attr("height", 15)
                .style("stroke", "black")
                .style("stroke-width", "1px")
                .style("fill", d['color']);
        legend.append("text")
                .text(d['text'])
                .attr("x", 35)
                .attr("y", (i+1) * 22)
                .attr("alignment-baseline","hanging");
    });

    // add label for data source
    svg.append("text")
        .text("Source: INTERPOL Stolen Works of Art Database")
        .attr("x", width-margin.right)
        .attr("y", height-margin.bottom-70)
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "baseline")
        .style("font-size", "0.8em")
        .style("fill", "darkgrey");
    
};

requestMapData();