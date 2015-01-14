/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# Bar Chart Creation
#
#
*/

;(function(projections){


function barChart(options) {

  var ages, start_data,
      settings = options.settings,
      // data parsing function
      prepData = projections.dataParser(["age", "yr", "r"]);


  // create the formatted strings for the bar lables
  function bucket(a) {
    return (a != ages[0]) ? ("" + a + "-" + (a+4)) : (a + "+");
  }

  // Capitalize word
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  start_data = prepData(options.data);

  // create age buckets from data keys
  ages = Object.keys(start_data)
                .map(parseFloat) // parse strings
                .reverse() // reverse order for age buckets in plot
                .slice(1); // remove "99" indicating all ages


  // function to create bar chart
  function bar(renderOpts) {
    // create object to hold chart updating function
    // as well as current data
    var
      self = {data : start_data},
      container = d3.select(renderOpts.renderTo),
      race = projections.raceAbbr(renderOpts.race),
      margin = self.margin = { top: 50, right: 40, bottom: 40, left: 65 },
      // chart h/w vs full svg h/w
      width = 300 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom,
      full_width = self.width = width + margin.left + margin.right,
      full_height = self.height = height + margin.top + margin.bottom,
      total = 0;

    // get population number for age, year, race
    function value(a){
      return self.data[a][0][race];
    }

    // generate percentage stat for bar width
    function pop_percent(a) {
      return value(a) / total;
    }

    ages.map(function(a) { total += value(a); });
    total = total || 1; // to avoid division by 0

    var max = 0.15;

    // scale for bar width
    var x = d3.scale.linear()
      .domain([0, max])
      .range([0, width]);

    // ordinal scale to space y axis
    var y = d3.scale.ordinal()
              .rangeRoundBands([height, 0], 0.1)
              .domain(ages.map(bucket).reverse());

    // create y axis using calculated age buckets
    var yAxis = d3.svg.axis()
        .scale(y)
        .outerTickSize(0)
        .orient("left");

    // create y axis using calculated percentage scale
    var xAxis = d3.svg.axis()
        .scale(x)
        .tickFormat(d3.format('%'))
        .outerTickSize(0)
        .ticks(3)
        .orient("bottom");

    // space between bars, and bar dimension
    var buffer = 6;
    var barHeight = height / ages.length;


    // container svg, dynamically sized
    container.classed('chart-svg-container', true)

    var svg = self.svg = container.append('svg')
      .attr({
        "preserveAspectRatio" : "xMinYMin meet",
        "viewBox" :  "0 0 " + full_width + " " + full_height,
        "class" : "chart-svg"
      })
      .append('g')
        .attr(
          'transform',
          'translate(' + margin.left + ',' + margin.top + ')'
        );

    // title text for bar chart
    svg.append('text')
      .attr({
        "class" : "bar-title",
        "y" : -15
      }).text(capitalize(renderOpts.race));

    // y grid lines
    var gridAxis = d3.svg.axis().scale(x)
              .orient("bottom")
              .tickSize(-height, 0, 0)
              .ticks(4)
              .tickFormat("");

    var grid_lines = svg.append('g')
      .attr('class', 'y grid')
      .attr("transform", "translate(0," + height + ")")
      .call(gridAxis);

    // bar chart rectangles
    var bar_container = svg.append('g')
      .selectAll('g')
      .data(ages)
      .enter().append('g')
      .attr("transform", function(d, i) {
        return "translate(0,"+(i * barHeight + buffer/2)+")";
      })
      .attr("id" , function(d) { return race + "," + bucket(d); })
      .attr('width', width)
      .attr('height', barHeight + buffer/2);

    var bars =  bar_container.append('rect')
      .attr({
        "class" : function(d) { return 'pyramid bar ' + bucket(d); },
        "width" : function(d) { return x(pop_percent(d)); },
        "height" : barHeight - buffer / 2,
      });

    // render y axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // render x axis
    var x_axis_g = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);


    var p = d3.format(".1%");
    var datalabels = bar_container.append('text')
      .text(function(d) {return p(pop_percent(d));})
      .attr({
        class : function(d) { return 'datalabel ' + bucket(d); },
        x : function(d) { return 5 + x(pop_percent(d)); },
        y : buffer + barHeight / 2
      }).style('opacity', 0);

    // highlight all same y-value
    bar_container
      .on('mouseover', function(){
        var selected = this.id.split(",")[1];
        d3.selectAll('.pyramid.bar')
          .classed('highlight', function(){
            return d3.select(this).classed(selected);
          });
        d3.selectAll('.datalabel')
          .style('opacity', function() {
            // boolean to number
            return +d3.select(this).classed(selected);
          });
      })
      .on('mouseout', function(){
        d3.selectAll('.pyramid.bar').classed('highlight', false);
        d3.selectAll('.datalabel').style('opacity', 0);
      });


    // data update
    self.update = function(new_data, maximum) {

      var dur = 300;

      // bounce back if already loading something
      if (projections.loading_indicator) return self;

      // store new data
      self.data = prepData(new_data);

      // get population number for age, year, race
      var year = settings.pyramid_abbr();
      var value = function(a){
        return parseFloat(self.data[a][year][race]);
      };

      // calculate total for this group
      var total = 0;
      ages.map(function(a) { total += value(a); });
      total = total || 1; // prevent divsion by 0

      // generate percentage stat for bar width
      var pop_percent = function(a) {
        return value(a) / total;
      };

      maximum = maximum || 0.15;

      x.domain([0, maximum]);

      bars
        .transition()
        .duration(dur)
        .attr("width" , function(d) {
          return x(pop_percent(d));
        });

      x_axis_g
        .transition()
        .duration(dur)
        .call(xAxis);

      grid_lines
        .transition()
        .duration(dur)
        .call(gridAxis);

      datalabels
        .text(function(d){ return p(pop_percent(d)); })
        .attr("x",  function(d){ return 5 + x(pop_percent(d)); } );

      return self;
    };

    return self;
  }

  // return factory
  return bar;
}

projections.barChart = barChart;

})(projections);