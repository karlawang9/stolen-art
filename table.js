const table = d3.select("#table table");
var tbody = table.append("tbody");

const requestTableData = async function() {

    const artData = await d3.csv("interpol_country_data.csv"); // no autotype, need country codes as strings
    artData.forEach( (d, i) => {
        d.total = Number(d.total); // now convert totals to numeric data
    });

    // create array of key-value pairs
    var items = []
    artData.forEach (d => {
        items.push([d.country_name, d.total]);
    });
    
    // sort array based on values
    items.sort(
        (first, second) => { return second[1] - first[1] } 
    );

    for (i=0; i<10; i++) {
        country_name = items[i][0];
        total = items[i][1];

        var tr = tbody.append("tr");
        tr.append("td").text(country_name);
        tr.append("td").text(d3.format(",")(total));
    };

};

requestTableData();