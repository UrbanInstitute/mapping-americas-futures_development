/*
//
//
// Population Projections 2.0
// Ben Southgate (bsouthga@gmail.com)
// 10/31/14
//
//
// mapping factory function
//
//
*/

// protect global scope
;(function(){


//
// given map settings, returns function
// to produce maps
//
function mapper(options) {

  //
  // These "magic numbers" are not the pixel width and height,
  // but simply a starting point for the w/h ratio
  // which tightly bounds the map. The actual visible
  // dimensions are set by the svg viewbox.
  //
  var width = 1011;
  var height = 588;
  // the assumption / age / race settings object
  var settings = options.settings;
  // standard projection function for the maps
  var geoPath = d3.geo.path().projection(
    d3.geo.albersUsa()
      .scale(width*1.2)
      .translate([width/2, height/2])
  );

  // cache for path strings (check for existence already)
  var pathcache = projections.cache.path = projections.cache.path || {};
  // cache for map data
  var datacache = projections.cache.data = projections.cache.data || {};
  // cache for map state data
  var statecache = (
    projections.cache.statedata = projections.cache.statedata || {}
  );

  // zero padding function
  var zeros = d3.format("05d"), i_d;

  // memoized path generation function
  var path = function(d) {
    var uid = d.id;
    if (uid in pathcache) {
      return pathcache[uid];
    } else {
      return (pathcache[uid] = geoPath(d));
    }
  };

  // create a path in an object to a value
  var recurseAssign = function(obj, path, value, last_index) {
    path.forEach(function(key, i) {
      if (i == last_index) return obj[key] = value;
      if (!(key in obj)) obj[key] = {};
      obj = obj[key] || {};
    });
  };

  // structure data for usage in map
  var prepMapData = function(raw) {
    var d = {};
    var id = (raw[0].cz !== undefined) ? "cz" : "stfips";
    var variable_order = [id, "agegrp", "yr", "r"];
    var last_index = variable_order.length - 1;
    var row, path;
    for (var r = 0, l=raw.length; r < l; r++) {
      row = raw[r];
      path = variable_order.map( function(n) { return row[n]; } );
      recurseAssign(d, path, Number(row.pop), last_index);
    }
    return d;
  };

  //
  //
  // map constructor
  //
  //
  function map(renderOpts) {

    // map object to return ("self")
    var self = {async : renderOpts.async};
    var container = d3.select(renderOpts.renderTo);
    var tooltipDiv;

    // local references to options
    var colors = options.colors;
    var bins = options.bins;
    var display = options.display;
    var missingColor = options.missingColor;
    var czone_topology = options.czone_topology;
    var state_topology = options.state_topology;
    var fixed = options.fixed;

    // Correct ratio of bins to colors
    // (there should be one more color than bins)
    var d = (colors.length - bins.length);
    var fixed_bins = (d <= 0) ? bins.slice(0, d-1) : bins;
    var fixed_colors = (d > 1) ? colors.slice(0, -d+1) : colors;

    // create scale for breaks
    var colorf = d3.scale.threshold()
                  .domain(fixed_bins)
                  .range(fixed_colors);

    var start_data = null;
    var createPopulationFunction = function(curr_settings, data) {

      if (fixed && !start_data) {
        start_data = curr_settings;
      }

      var settings = start_data || curr_settings;

      // get the different settigns
      var start = settings.start_abbr();
      var end = settings.end_abbr();
      var age = settings.age_number();
      var race = settings.race_abbr();
      // return a function which provides
      // the population values in the two periods
      // for a given czone
      var uid, v_start, v_end;
      return function(d) {
        uid = parseInt(d.id);
        if (data[uid]) {
          // get population values from starting and ending periods
          v_start = parseInt(data[uid][age][start][race]);
          v_end = parseInt(data[uid][age][end][race]);
          if (v_end !== 0 && v_start !== 0) {
            return {start : v_start, end : v_end};
          } else {
            return false;
          }
        } else {
          return false;
        }
      };
    };

    // color fill for czones, defaulting to missing color
    var createFill = function(settings, data) {
      // return function which calculates the population
      // growth rate over the period requested and returns a color
      var popf = createPopulationFunction(settings, data);
      return function(d) {
        var pop = popf(d);
        if (pop) {
          return colorf((pop.end - pop.start) / pop.start);
        } else {
          return missingColor;
        }
      };
    };

    // stop click events
    var stopped = function() {
      if (d3.event.defaultPrevented) d3.event.stopPropagation();
    };

    // map control icons (fontawesome)
    container.selectAll('i')
      .data(['search-plus', 'search-minus', 'arrows-alt'])
      .enter()
      .append('i')
      .attr('class', function(d) {
        return 'map-control fa fa-' + d;
      })
      .style('top', function(d, i) {
        return (10 + 30*i) + 'px';
      });

    // add svg container class to map
    container.classed('map-svg-container', true);

    // Container SVG which follows dimensions of its container div
    var svg = container.append('svg')
      .attr({
        "class" : "us-map map-svg",
        "preserveAspectRatio" : "xMinYMin meet",
        "viewBox" :  "0 0 " + width + " " + height
      })
      // stop event propogation when clicking, true indicates...
      // http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration
      .on("click", stopped, true);

    // container for paths
    var features = svg.append('g');

    // add geographic layer to features
    var addLayer = function(topology, classes) {
      return features.append('g')
                .selectAll('path')
                  .data(topology)
                .enter().append('path')
                  .attr({
                    "class": classes,
                    "id" : function(d) { return d.id; },
                    "d" : path
                  });
    };

    // States visible in background while transitioning
    var background_states = addLayer(
      state_topology, 'us-map-states-background'
    );

    // state paths to fill
    var fill_states = addLayer(
      state_topology, 'us-map-states-filled hidden'
    );

    // zone paths to fill
    var fill_czones = addLayer(
      czone_topology, 'us-map-czones'
    );

    // state paths for white state boundary
    var outline_states = addLayer(
      state_topology, 'us-map-states'
    );

    // state paths to hover over
    var hover_states = addLayer(
      state_topology, 'us-map-states-hover hidden us-map-boundary'
    );

    // zone paths for hovering
    var hover_czones = addLayer(
      czone_topology, 'us-map-czones-hover us-map-boundary'
    );

    var fill_boundary = fill_czones;
    var hover_boundary = hover_czones;


    /* ---------------------------
      Zooming behavior
    -----------------------------*/

    var zoom = d3.behavior.zoom()
        .center([width/2, height/2])
        .scaleExtent([1, 8])
        .on("zoom", zoomed);


    function zoomed() {
      features.style("stroke-width", 1.5 / d3.event.scale + "px");
      features.attr(
        "transform",
        "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"
      );
    }

    svg.call(zoom)
       .call(zoom.event)
       .on("dblclick.zoom", null);
    /* ---------------------------
    -----------------------------*/



    /* ---------------------------
      Map Tooltip
    -----------------------------*/
    if (d3.select('div.us-map-tooltip').empty()) {
      tooltipDiv = d3.select('body').append('div')
        .attr('class', 'us-map-tooltip hidden');
    } else {
      tooltipDiv = d3.select('div.us-map-tooltip');
    }

    // Move tooltip to position above mouse
    var x, y, tt_bbox;
    var moveToolTip = function(){
      x = d3.event.pageX;
      y = d3.event.pageY;
      tt_bbox = tooltipDiv.node().getBoundingClientRect();
      tooltipDiv.style({
        top :  "" + (y - tt_bbox.height - 20) + "px",
        left : "" + (x - tt_bbox.width / 2) + "px"
      });
    };

    // move the tooltip as the user moves their
    // mouse over the map container div
    container.on('mousemove', moveToolTip);

    var boundary_click_callback = function(){};
    fill_boundary.attr('fill', missingColor);

    var bind_click_callback = function(boundary) {
      boundary.on( 'mouseover', function(d){
          // create function to calculate population
          // numbers given current settings
          var popf = createPopulationFunction(settings, self.data);
          // create object holding start and end populations
          var pop = popf(d) || {};
          // add percentage and czone id to object
          pop.percent = (pop.end - pop.start) / pop.start;
          pop.boundary_id = this.id;
          // call tooltip html renderer on tooltip
          var formatter = options.tooltip.formatter;
          tooltipDiv.html(formatter.call(pop))
              .classed('hidden', false);
          // move the tooltip above the mouse (needed for IE)
          moveToolTip();
        })
        .on('mouseout', function(){
          // Fade out tooltip if not over map
          tooltipDiv.classed('hidden', true);
        })
        .on('click', function(){
          boundary_click_callback(this.id);
        });
    };

    bind_click_callback(hover_boundary);

    /* ---------------------------
    -----------------------------*/


    /* ---------------------------
      Map Control Icon Bindings
    -----------------------------*/
    // recenter map on click of reset button
    container.select(".fa-arrows-alt")
      .on('click', function(){self.reset();});


    // after hours of failing at figuring this out,
    // taken from http://stackoverflow.com/a/21653008/1718488
    function zoomByFactor(factor, dur) {
      var scale = zoom.scale();
      var ext = zoom.scaleExtent();
      var newScale = Math.max(ext[0], Math.min(ext[1], scale*factor));
      var t = zoom.translate();
      var c = [width / 2, height / 2];
      zoom
        .scale(newScale)
        .translate([
          c[0] + (t[0] - c[0]) / scale * newScale,
          c[1] + (t[1] - c[1]) / scale * newScale
        ])
        .event(svg.transition().duration(dur || 500));
    }

    // zoom in + out
    container.selectAll(".fa-search-plus, .fa-search-minus")
      .on('click', function(){
        zoomByFactor(
          d3.select(this).classed('fa-search-plus') ? 1.5 : (1/1.5)
        );
      });
    /* ---------------------------
    -----------------------------*/

    /* ---------------------------
      Legend
    -----------------------------*/
    // if a legend container id is passed to the map constructor
    // render a legend for this map to that container
    var legendRenderTo = renderOpts.legendRenderTo, legend;
    if (legendRenderTo) {

      // Clear previous legend
      var legend_container = d3.select(legendRenderTo)
                                .classed('map-legend-svg-container', true);
      legend_container.selectAll("*").remove();

      // if the legend is rendered somewhere else, copy the svg
      var existing = $('.us-map-legend.map-legend-svg').first();
      if (existing.length && !renderOpts.legendMouseover) {
        $(legendRenderTo).append(existing.clone());
      } else {
        // similar to the map, these simply guide the ratio of w/h
        // for the legend, the actual size is determined dynamically
        // by the svg view box
        var legend_width = 400;
        var legend_height = 30;
        // Append svg element to draw legend
        legend = legend_container
              .append('svg')
                .attr({
                  preserveAspectRatio : "xMinYMin meet",
                  viewBox :  "0 0 " + legend_width + " " + legend_height,
                  class : 'us-map-legend map-legend-svg'
                })
                .append('g');

        // Spacing between legend bins
        var offset = 0;
        // number of bins to render in legend
        var n_bins = fixed_bins.length;
        // Width of colored bins
        var binWidth = (legend_width*0.6 / (n_bins+1)) - offset;
        // height of colored bins
        var binHeight = (binWidth * 0.5);

        // add hidden svg canvas for calculating bounding boxes
        // even if the main svg is not yet being displayed
        var helper_svg = d3.select('body').append('svg')
          .style('visibility', "hidden");


        var decline_text = legend.append('text')
          .text('decline')
          .attr('class', 'growth-text');

        var dtext_dims = (function() {
          var t = helper_svg.append('text')
                    .text(decline_text.text())
                    .attr('class', 'growth-text');
          var w = t.node().getBBox();
          t.remove();
          return w;
        })();

        decline_text.attr({
          "x" : 0,
          "y" : dtext_dims.height
        });

        var dtext_pad = dtext_dims.width + 5;

        // add legend rectangles
        var legend_rects = legend.selectAll('rect')
            .data(fixed_colors)
            .enter()
            .append('rect')
              .attr({
                "class" : "us-map-legend-rect",
                id : function(d){ return d; },
                width : binWidth,
                height : binHeight,
                // position
                x : function(d, i) {
                  return offset/2 + i*binWidth + i*offset + dtext_pad;
                },
                y : 0,
                rx : 3,
                ry : 3
              })
              .style('fill', function(d){ return d; })
              .style('stroke', "#fff")
              .style('stroke-width', 3);

        if (renderOpts.legendMouseover) {
          // show zones with this legend color
          legend_rects.on('mouseover', function(){
            var fill = createFill(settings, self.data);
            var rect = this;
            fill_boundary.attr('fill', function(d){
                var czone_fill = d3.select(this).attr('fill');
                return czone_fill == rect.id ? czone_fill : missingColor;
            });
          }).on('mouseout', function(){
            var fill = createFill(settings, self.data);
            fill_boundary.attr('fill', fill);
          });
        }

        var formatter = options.legendFormat;
        // Add text to legend, and reposition it correctly
        legend.append('g').selectAll('text')
              .data(fixed_bins)
            .enter()
            .append('text')
              .attr('class', 'us-map-legend-label')
              .text(formatter)
              .attr({
                y : (binHeight + 10),
                x : function(d, i) {
                  // create text node in helper svg
                  // and use it to calculate the bounding box
                  // this is necessary if the client
                  // lands on the feature page, resulting
                  // in the map legend not being rendered and
                  // the text nodes having no width
                  var t = helper_svg.append('text')
                            .text(formatter(d))
                            .attr('class', 'us-map-legend-label');
                  var w = t.node().getBBox().width;
                  t.remove();
                  return (i+1)*(binWidth + offset) - (w/2) + dtext_pad;
                }
              });


        //half way accross the legend
        var half_way = ((n_bins+1) / 2)*(binWidth + offset) + dtext_pad;
        // midway line
        legend.append('line')
          .attr({
            "x1" : half_way,
            "x2" : half_way,
            "y1" : 0,
            "y2" : binHeight
          }).style({
            "stroke" : "#000",
            "stroke-width" : 0.5
          });

        //half way accross the legend
        var past_legend = (n_bins+1)*(binWidth + offset) + dtext_pad;

        var growth_text = legend.append('text')
          .text('growth')
          .attr('class', 'growth-text');

        var gtext_dims = (function() {
          var t = helper_svg.append('text')
                    .text(growth_text.text())
                    .attr('class', 'growth-text');
          var w = t.node().getBBox();
          t.remove();
          return w;
        })();

        growth_text.attr({
          "x" : past_legend + 5,
          "y" : gtext_dims.height
        });

        var no_pop_position = past_legend + gtext_dims.width + 20;

        legend.append('rect')
              .attr({
                "class" : "us-map-legend-rect",
                "width" : binWidth,
                "height": binHeight,
                "x" : no_pop_position,
                "rx" : 3,
                "ry" : 3
              })
              .style('stroke', "#fff")
              .style('stroke-width', 3)
              .style('fill', missingColor);

        var pop_text = legend.append('text')
          .text('no population')
          .attr('class', 'growth-text');

        var poptext_dims = (function() {
          var t = helper_svg.append('text')
                    .text(pop_text.text())
                    .attr('class', 'growth-text');
          var w = t.node().getBBox();
          t.remove();
          return w;
        })();

        pop_text.attr({
          "x" : no_pop_position + binWidth + 5,
          "y" : poptext_dims.height
        });



        // remove helper svg from body
        helper_svg.remove();
      }



    }
    /* ---------------------------
    -----------------------------*/

    // set click callback
    self.click = function(callback) {
      boundary_click_callback = callback;
      return self;
    };

    // reset zoom
    self.reset = function(duration) {
      svg.transition()
            .duration(duration || 750)
            .call(zoom.translate([0, 0]).scale(1).event);
      return self;
    };

    /* ----------------------------------
        center the map on a target boundary
       ---------------------------------- */
    self.target = function(boundary_id, duration) {
      // reset map if US is selected
      if (boundary_id == "0") return self.reset(duration);
      // get boundary dom node
      var node = $('path#' + boundary_id + '.us-map-boundary').get(0);
      // zoom to bounding box : http://bl.ocks.org/mbostock/9656675
      var bounds = geoPath.bounds(node.__data__),
          dx = bounds[1][0] - bounds[0][0],
          dy = bounds[1][1] - bounds[0][1],
          x = (bounds[0][0] + bounds[1][0]) / 2,
          y = (bounds[0][1] + bounds[1][1]) / 2,
          extent = zoom.scaleExtent(),
          scale = 0.9 / Math.max(dx / width, dy / height);
      // cap scale at zoom bounds
      scale = Math.min(extent[1], Math.max(extent[0], scale));
      var translate = [width / 2 - scale * x, height / 2 - scale * y];
      // zoom to boundary
      svg.transition()
          .duration(duration || 750)
          .call(zoom.translate(translate).scale(scale).event);
      // method chaining
      return self;
    };


    /* ----------------------------------
        center the map on a target czone
       ---------------------------------- */
    self.highlight = function(czone) {
      if (czone == "0") return self;
      var fade = function(d) {
        if (this.id == czone) {
          d3.select(this).classed('highlighted', true)
            .moveToFront();
        } else {
          d3.select(this).classed('faded', true);
        }
      };
      //
      // add fill css transitions,
      // and highlight the czone
      //
      fill_boundary
        .classed('transition', true)
        .each(fade);
      //
      // transition fade on mouseover
      //
      container.on('mouseover', function() {
        fill_boundary.classed('faded', false);
      })
      .on('mouseout', function() {
        fill_boundary.each(fade);
      });
      return self;
    };



    /* ---------------------------
        Update Function
      -----------------------------*/
    self.lag_path = null;
    self.lag_boundary = null;
    // update map with new assumption settings
    self.update = function(settings, callback) {

      // bounce back if already loading something
      if (!self.async && projections.loading_indicator) return self;

      // path to folder, using stored settings object
      var path = projections.path(settings);
      var boundary = settings.boundary;
      var changed = (self.lag_boundary != boundary);
      self.lag_boundary = boundary;

      if (changed) {
        fill_boundary.classed('hidden', true);
        hover_boundary.classed('hidden', true);
      }

      hover_boundary.on('click', null);

      if (boundary == "states") {
        fill_boundary = fill_states;
        hover_boundary = hover_states;
        path = "data/states/Map/" + path;
      } else {
        fill_boundary = fill_czones;
        hover_boundary = hover_czones;
        path = "data/Map/" + path;
      }

      // check if the assumptions have been changed
      // and if the path is the same as last time
      // if so, no need to update
      if (settings.assumption_change &&
          path == self.lag_path) return self;
      self.lag_path = path;


      // transition map to new fill color
      var transition = function(data, no_trans) {
        // create fill function for current settings
        var fill = createFill(settings, data);

        if (no_trans) {
          fill_boundary.attr('fill', fill);
        } else {
          fill_boundary
            .transition()
            .duration(300)
            .attr('fill', fill);
        }
      };


      // function to call when data is loaded
      var end_callback = function(){

        // if we're swithing between boundary types
        // no fade transition
        // the order in this ifstatement is
        // important for the click callback binding
        if (changed) {
          transition(self.data, true);

          fill_boundary.moveToFront();
          hover_boundary.moveToFront();

          self.lag_boundary = boundary;

          bind_click_callback(hover_boundary);

          // hidden removal needs to come
          // after event binding for click callback
          fill_boundary.classed('hidden', false);
          hover_boundary.classed('hidden', false);

        } else {
          transition(self.data);
        }

        projections.loading_indicator = false;
        if (callback) callback();
      };


      // try to get data from cache, or download it
      if (datacache[path]) {
        self.data = datacache[path];
        end_callback();
      } else {
        projections.loading_indicator = true;
        // progress bar for loading
        var start_seconds = Date.now();
        // progress bar, only show if loading is slow
        var progress_bar;
        // load csv
        d3.csv(path, function(error, downloaded_data){
          if (error) throw error;
          self.data = datacache[path] = prepMapData(downloaded_data);
          if (progress_bar) {
            progress_bar.remove(end_callback);
          } else {
            end_callback();
          }
        }).on("progress", function(event){
          var time = Date.now();
          // if loading has taken longer than 200 miliseconds,
          // add a progress bar to the svg window
          if (!progress_bar && (time - start_seconds) > 100) {
            progress_bar = projections.progress({
              "width" : width,
              "height" : height,
              "svg" : svg
            });
          }
          //update progress bar
          if (d3.event.lengthComputable) {
            var percentComplete = Math.round(
              d3.event.loaded * 100 / d3.event.total
            );
            if (progress_bar) progress_bar.update(percentComplete);
          }
        });
      }
      return self;
    };
    /* ---------------------------
    -----------------------------*/

    return self;
  }

  map.options = function(update) {
    options = $.extend({}, options, update);
    return map;
  };

  return map;
}



// write to projections module
projections.mapper = mapper;


}).call(this);