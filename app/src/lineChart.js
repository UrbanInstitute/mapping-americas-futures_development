/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# Line Chart Creation
#
#
*/

;(function(projections){

function lineChart(options) {

  var
    years = [2000, 2010, 2020, 2030],
    yvalue_extent = [0, 2*10e7],
    start_settings = options.settings,
    prepData = projections.dataParser(["age", "yr", "r"]),
    start_data = prepData(options.data);

  // Capitalize word
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // create data for race plots
  function getDataPrepper(category) {
    // return a data generation function
    // tailored to the chart category
    return {
      race : function(prepped) {
        // categorical colors for races
        var colors = [
          "#1696d2",
          "#fcb918",
          "rgb(255, 79, 0)",
          "#000000"
        ];
        var races = [
          "white",
          "black",
          "hispanic",
          "other"
        ];
        // total data is stored at 99
        var race_totals = prepped["99"];
        // abbreviation functions (from path.js)
        var r_abbr = projections.raceAbbr;
        var y_abbr = projections.yearAbbr;
        return races.map(function(race, index) {
          return {
            "id" : race,
            "color" : colors[index],
            "values" : years.map(function(year) {
              // get population for this race / year
              var pop = race_totals[y_abbr(year)][r_abbr(race)];
              return { year : year, population : pop };
            })
          };
        });
      },
      // age categories
      age : function(prepped) {
        // sequential colors for ages
        var colors = [
          "#b0d5f1",
          "#1696d2",
          "#00578b",
          "#000000"
        ];
        var ages = [
          "0-19",
          "20-49",
          "50-64",
          "65 and up"
        ];
        var age_breaks = [19, 49, 64];
        var age_data = {};
        ages.map(function(a) { age_data[a] = {}; });

        var get_bucket = function(age) {
          var bucket = "";
          age_breaks.map(function(abreak, index) {
            if (!bucket && age <= abreak) {
              bucket = ages[index];
            }
          });
          return bucket ? bucket : "65 and up";
        };

        for (var age in prepped) {

          var n_age = parseFloat(age),
              bkt = get_bucket(n_age);

          if (n_age != 99) {
            for (var year in prepped[age]) {
              // string year to number
              var n_year = 2000 + parseFloat(year);
              if (!(n_year in age_data[bkt])) age_data[bkt][n_year] = 0;
              // add up race totals for this year
              age_data[bkt][n_year] += prepped[age][year]["T"];
            }
          }
        }

        return ages.map(function(age, index) {
          return {
            "id" : age,
            "color" : colors[index],
            "values" : years.map(function(year) {
              var pop = age_data[age][year];
              return { year : year, population : pop };
            })
          };
        });
      }
    }[category];

  }


  function chart(renderOpts) {
    var self = {};
    self.data = start_data;
    self.category = renderOpts.category;

    var container = d3.select(renderOpts.renderTo);
    var margin = self.margin = { top: 90, right: 40, bottom: 60, left: 65 };

    // chart h/w vs full svg h/w
    var width = 800 - margin.left - margin.right;
    var height = 550 - margin.top - margin.bottom;
    var full_width = self.width = width + margin.left + margin.right;
    var full_height = self.height = height + margin.top + margin.bottom;

    container.append('div')
      .attr('class', 'line-title')
      .text(capitalize(self.category));

    // helper svg
    var helper_svg = d3.select('body').append('svg')
      .attr('class', 'helper-svg')
      .style('visibility', 'hidden');

    var svg_container = container.append('div');

    // container svg, dynamically sized
    svg_container.classed('chart-svg-container', true)
      .style('width', 100 + "%")
      .style('padding-bottom' , Math.round((full_height/full_width)*100) + "%");

    var svg = self.svg = svg_container.append('svg')
      .attr({
        "preserveAspectRatio" : "xMinYMin meet",
        "viewBox" :  "0 0 " + full_width + " " + full_height,
        "class" : "chart-svg"
      })
      .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


    var prepped = getDataPrepper(self.category)(self.data);

    var get_y_domain = function(prepped_data) {
      // find largest population value in new data,
      // and increase it by 20 % for y upper bound
      return [0, d3.max(prepped_data, function(g) {
        return d3.max(g.values, function(v) { return v.population; });
      })*1.2];
    };

    // d3 charting functions
    var x = d3.scale.linear()
              .domain(d3.extent(years))
              .range([0, width]);

    var y = d3.scale.linear()
              .domain(get_y_domain(prepped))
              .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .ticks(years.length)
        .tickSize(25, 0)
        .tickFormat(function(d) { return d; })
        .orient("bottom");

    var yTicks = 3;

    var yAxis = d3.svg.axis()
        .scale(y)
        .ticks(yTicks)
        .outerTickSize(0)
        .tickFormat(d3.format("s"))
        .orient("left");

    var yGrid = d3.svg.axis().scale(y)
            .ticks(yTicks)
            .tickSize(width, 0)
            .tickFormat("")
            .orient("left");

    var line = d3.svg.line()
                .x(function(d) { return x(d.year); })
                .y(function(d) { return y(d.population); });

    // id formatting
    var idf = function(s) { return "id_" + s.replace(/\W/g, ""); };

    // render y axis
    var y_axis_g = svg.append("g")
        .attr("class", "y axis linechart")
        .call(yAxis);

    // render x axis
    svg.append("g")
        .attr("class", "x axis linechart")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // y grid lines
    var y_grid_g = svg.append('g')
      .attr('class', 'grid linechart')
      .attr("transform", "translate(" + width + ",0)")
      .call(yGrid);

    var line_paths = svg.append('g').selectAll('path')
          .data(prepped)
        .enter()
        .append('path')
          .attr({
            "class" : "line",
            id : function(d)  {return idf(d.id); },
            stroke : function(d) { return d.color; },
            d : function(d) { return line(d.values); }
          });

    // legend
    var num_series = prepped.length,
        legend_length = full_width,
        legend_line_padding = 15,
        tween_text_padding = 5,
        legend_vertical_margin = 50;

    // calcuate bounds of svg text element
    var getTextBBox = function(text, class_name) {
      // memoize
      this.cache = this.cache || {};
      if (this.cache[text]) return this.cache[text];

      class_name = class_name || 'legend-text linechart';
      var t = helper_svg.append('text')
                .text(text)
                .attr('class', class_name);
      var dims = t.node().getBBox();
      t.remove();
      // store and return
      return this.cache[text] = dims;
    };

    var text_total_width = d3.sum(prepped, function(d) {
      return getTextBBox(capitalize(d.id)).width;
    });

    var legend_line_width = (
      (
          (legend_length - text_total_width) /
          (num_series + 1)
      ) -
      legend_line_padding -
      tween_text_padding
    );


    var legend_containers = svg.append('g')
      .selectAll('.legend')
      .data(prepped)
      .enter()
      .append('g')
      .attr('transform', function(d, i) {
        var padding = -margin.left - legend_line_padding;
        // add padding for all previous legend entries
        while(i) {
          lag_text = capitalize(prepped[i-1].id);
          padding += (
            legend_line_padding +
            legend_line_width +
            tween_text_padding +
            getTextBBox(lag_text).width
          );
          i--;
        }
        return 'translate(' + padding + ',' + (-legend_vertical_margin) + ')';
      })
      .attr('class', 'legend linechart')
      .attr('id', function(d) { return idf(d.id); });

    // legend category text
    legend_containers.append('text')
      .text(function(d) { return capitalize(d.id); })
      .attr('class', 'legend-text linechart')
      .attr('x', legend_line_padding + legend_line_width + tween_text_padding);

    var getTextDims = function(p) {
      // get dimensions of rendered text
      // for this legend entry
      var contents = d3.select(p.parentNode)
              .select('text').text();
      return getTextBBox(contents);
    };

    // colored line for legend
    legend_containers.append('line')
      .attr({
        "class" : 'line legend',
        "x1" : legend_line_padding,
        "x2" : legend_line_padding + legend_line_width,
        "y1" : function(d) {
          return -(getTextDims(this).height / 4);
        },
        "y2" : function(d) {
          return -(getTextDims(this).height / 4);
        },
      })
      .style({
        "stroke" : function(d) {return d.color; }
      });



    // store y scale in data for reference
    var add_scale = prepped.map(function(o) {
      o.y = y;
      return o;
    });




    var static_circles = svg.append('g')
      .selectAll('g')
      .data(add_scale)
    .enter().append('g');

    static_circles.selectAll('circle')
      .data(function(d) {
        d.values.forEach(function(v){
          v.color = d.color;
          v.id = d.id;
        });
        return d.values;
      })
    .enter().append('circle')
      .attr('class', function(d) {
        return 'linechart static-circle ' + idf(d.id);
      })
      .attr('r', 7)
      .attr('cx', function(d) {
        return x(d.year);
      })
      .attr('cy', function(d) {
        return y(d.population);
      })
      .style('fill', function(d) { return d.color; });

    // mouseover circles
    var mouseover_circles = svg.append('g')
      .selectAll('circle')
      .data(add_scale)
      .enter().append('circle')
          .attr('class', 'linechart mouseover circle')
          .attr('id', function(d) { return idf(d.id); })
          .attr('r', 7)
          .style('stroke', function(d) { return d.color; })
          .style('fill', "#fff")
          .style('stroke-width', 4)
          .style('opacity', 0);

    // tooltip
    var tooltip = svg.append('g')
                    .attr("class" , "linechart tooltip")
                    .style('opacity', 0);

    var tooltip_width = 250;
    var tooltip_height = 200;
    var tooltip_padding = 10;

    tooltip.append('rect')
          .attr({
            "width" : tooltip_width,
            "height" : tooltip_height,
            "rx" : 5,
            "ry" : 5
          }).style({
            fill : "#fff",
            opacity : 0.8,
            stroke : "#aaa"
          });

    var tt_year = tooltip.append('g').append('text')
          .attr('x', tooltip_padding)
          .attr('y', 40)
          .attr('class', 'linechart tooltip-year');

    var tt_lables = tooltip.append('g')
          .selectAll('text')
          .data(prepped)
        .enter().append('text')
          .attr('class', 'linechart tooltip-series')
          .attr('x', tooltip_padding)
          .attr('y', function(d, i) {
            return 80 + i*35;
          })
          .attr('id', function(d) { return idf(d.id); })
          .text(function(d) { return capitalize(d.id); });


    var tt_values = tooltip.append('g')
          .selectAll('text')
          .data(prepped)
        .enter().append('text')
          .attr('class', 'linechart tooltip-values')
          .attr('x', function() {
            return tooltip_width - tooltip_padding;
          })
          .attr('y', function(d, i) {
            return 80 + i*35;
          });

    // add plexiglass for mouseover
    var plexiglass = svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('opacity', 0);

    // nice formatting for large numbers
    var commas = d3.format(",");

    // get y value for year
    var get_y_value = function(d, year) {
      // get data associated with the series
      var y_value = null;
      // find the correct x value for this series
      d.values.map(function(obs) {
        if (year == obs.year) y_value = obs.population;
      });
      return y_value;
    };

    // move all circles to a given year
    var moveTooltip = function(year) {

      var transition_speed = 200;

      d3.selectAll('.linechart.tooltip')
        .transition()
        .duration(transition_speed)
        .attr('transform', function() {
          var w = this.getBBox().width;
          var x_val = Math.max(0, Math.min(width - w, x(year) - w/2));
          return "translate(" + x_val + ",0)";
        });

      d3.selectAll(".linechart.tooltip-year").text(year);

      d3.selectAll(".linechart.tooltip-values")
        .text(function(d) {
          return commas(get_y_value(d, year));
        })
        .attr('x', function() {
          var w = this.getBBox().width;
          return tooltip_width - w - tooltip_padding;
        });

      d3.selectAll('.linechart.circle')
        .transition()
        .duration(transition_speed)
        .attr('cx', x(year))
        .attr('cy', function(d) {
          // use stored y scale
          return d.y(get_y_value(d, year));
        });

    };

    // mouse movement events
    var lag_year = years[0];
    plexiglass.on('mousemove', function() {
        // get coordinates of mouse
        var m = d3.mouse(this);
        // get nearest decade
        var year = Math.round(x.invert(m[0])/10)*10;
        // move all circles (even those in other graphs)
        if (lag_year != year) {
          lag_year = year;
          moveTooltip(year);
        }
      });

    plexiglass.on('mouseover', function() {
      moveTooltip(lag_year);
      d3.selectAll('.linechart.circle, .linechart.tooltip')
        .style('opacity', 1);
    });

    plexiglass.on('mouseout', function() {
      d3.selectAll('.linechart.circle, .linechart.tooltip')
        .style('opacity', 0);
    });

    // remove svg used for bbox calculation
    helper_svg.remove();

    // legend hover behavior
    legend_containers
      .on('mouseover', function(d) {
        var id = this.id;
        line_paths.attr('stroke', function(d) {
          return this.id == id ? d.color : "#ccc";
        });
        static_circles.style('fill', function(d) {
          return d3.select(this).classed(id) ? d.color : "#ccc";
        });
      })
      .on('mouseout', function(d) {
        line_paths.attr('stroke', function(d) { return d.color; });
        static_circles.style('fill', function(d) { return d.color; });
      });

    //
    // update line chart with new data
    //
    self.update = function(new_data) {
      self.data = prepData(new_data);
      // prepare new data
      var prepped = getDataPrepper(self.category)(self.data);

      // animation duration
      var dur = 400;

      // update y scale domain
      y.domain(get_y_domain(prepped));

      // update the scale used in the circles
      var add_scale = prepped.map(function(o) {
        o.y = y;
        return o;
      });

      // update data for mouseover circle
      mouseover_circles.data(add_scale);

      // update circles on lines
      static_circles
          .data(add_scale)
        .selectAll('circle')
          .data(function(d) { return d.values; })
          .transition()
          .duration(dur)
          .attr('cx', function(d) { return x(d.year); })
          .attr('cy', function(d) { return y(d.population); });

      // update data for tooltip
      tt_values.data(prepped);
      moveTooltip(lag_year);

      // update y axis
      y_axis_g
        .transition()
        .duration(dur)
        .call(yAxis);

      // update y axis
      y_grid_g
        .transition()
        .duration(dur)
        .call(yGrid);

      // transition lines
      line_paths.data(prepped)
          .transition()
          .duration(dur)
          .attr("d" , function(d) { return line(d.values); });

      return self;
    };

    return self;
  }

  return chart;
}

// write to projections module
projections.lineChart = lineChart;

})(projections);