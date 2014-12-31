/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# detail charts wrapper
#
#
*/

;(function(projections){


function detail(options) {

  var starting_data = options.data;
  var starting_settings = options.settings;
  var czone_names = options.names;

  // create bar chart making function
  var bar = projections.barChart({
    "data" : starting_data,
    "settings" : starting_settings
  });

  // create line chart making function
  var line = projections.lineChart({
    "data" : starting_data,
    "settings" : starting_settings
  });

  // create pyramid charts for all the
  var detail_visuals = [
    // ids for chart containers
    "all",
    "white",
    "black",
    "hispanic",
    "other"
  ].map(function(id) {
    // add all the bar charts to the visuals list
    return bar({
      renderTo : "div.pyramid#" + id,
      race : id
    });
  });

  // create line charts for age and races
  detail_visuals = detail_visuals.concat([
    // ids for chart containers
    "age",
    "race"
  ].map(function(category) {
    // add the line charts to the visuals list
    return line({
      renderTo : "#" + category + "-lines",
      category : category
    });
  }));


  // change growth text
  var percent = d3.format(".2%");
  var comma = d3.format(",");
  var zeros = d3.format("05d");

  var updateDetailText = function(data, settings) {
      var czone = settings.detail_czone;
      if (czone !== 0) czone = zeros(czone);
      // update detail title
      var name = czone_names[parseFloat(czone)] || "United States";
      $("h1#region").text(name);

      // calculate percentage growth
      var start = settings.start_abbr();
      var end = settings.end_abbr();
      var start_total = 0;
      var end_total = 0;
      var pyramid_year = settings.pyramid_abbr();

      // also find the totals for each race
      // used to calculate the maximum percent change
      var race_totals = {};
      // first pass to get totals
      data.map(function(row) {
        if (row.age == "99" && row.r == "T") {
          if (row.yr == start) start_total += parseFloat(row.pop);
          if (row.yr == end) end_total += parseFloat(row.pop);
        }
        if (row.age == "99" && row.yr == pyramid_year) {
          race_totals[row.r] = row.pop;
        }
      });
      // second pass to find max percent growth
      var max_growth = {};
      data.map(function(row) {
        if (row.age != "99" && row.yr == pyramid_year) {
          // get the current maximum for this race
          var curr_max = max_growth[row.r] || 0;
          var row_per = (row.pop / (race_totals[row.r] || 1));
          // adjust max if necessary
          max_growth[row.r] = (curr_max > row_per ? curr_max : row_per);
        }
      });
      // update text
      start_total = start_total | 1; // defense agains div#0
      d3.select("#growth-cell")
        .text(percent((end_total - start_total) / start_total));
      d3.select("#start-change").text(comma(start_total));
      d3.select("#end-change").text(comma(end_total));
      var overall_max = 0;
      for (var race in max_growth) {
        var curr_max = max_growth[race];
        overall_max = (overall_max > curr_max ? overall_max : curr_max);
      }
      // increase max by 40 percent for data label
      return overall_max*1.4;
  };

  // load starting settings
  updateDetailText(starting_data, starting_settings);



  return {
    update : function(settings) {

      // update all the individual detail charts
      // when 'detail's update method is called
      var filename = projections.path(settings);
      var czone = parseFloat(settings.detail_czone);

      // update download links
      projections.downloadLinks(settings);

      var csv;
      if (settings.boundary == "states") {
        csv = 'data/states/Charts/' + czone + '_' + filename;
      } else {
        csv = 'data/Charts/' + czone + '_' + filename;
      }

      // get new data and update charts
      d3.csv(csv, function(error, data) {
        if (error) throw error;
        var max = updateDetailText(data, settings);
        // update all plots
        detail_visuals.map(function(chart) {
          chart.update(data, max);
        });
      });
    }
  };


}

projections.detail = detail;

})(projections);