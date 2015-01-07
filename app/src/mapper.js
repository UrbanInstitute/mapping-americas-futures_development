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

;(function(projections){


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
  var width = 1011*2;
  var height = 588*2;
  // the assumption / age / race settings object
  var settings = options.settings;
  // projection function
  var d3Albers = d3.geo.albersUsa()
      .scale(width*1.2)
      .translate([width/2, height/2]);
  // standard projection function for the maps
  var geoPath = d3.geo.path().projection(d3Albers);

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
    var
      d = {},
      id = (raw[0].cz !== undefined) ? "cz" : "stfips",
      variable_order = [id, "agegrp", "yr", "r"],
      last_index = variable_order.length - 1,
      row,
      path;

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

    var container_id = renderOpts.renderTo.replace("#","");

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

    // add hidden svg canvas for calculating bounding boxes
    // even if the main svg is not yet being displayed
    var helper_svg = d3.select('body').append('svg')
      .attr('class', 'helper-svg')
      .style('visibility', "hidden");

    // calculate text bounds
    var getTextBBox = function(text, classname, modifier) {
      // cache bound to function
      this.cache = this.cache || {};
      var id = text + "_" + classname;

      if (this.cache[id] && !modifier) return this.cache[id];

      var t = helper_svg.append('text')
                .text(text)
                .attr('class', classname);
      if (modifier) t = modifier(t);
      var bb = t.node().getBBox();
      t.remove();

      return this.cache[id] = bb;
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
    var zoom_class = renderOpts.zoomClass;
    var features = svg.append('g')
                      .attr("id", "features-" + container_id)
                      .attr('class', 'features ' + zoom_class);

    // add geographic layer to features
    var addLayer = function(topology, classes) {
      return features.append('g')
                .selectAll('path')
                  .data(topology)
                .enter().append('path')
                  .attr({
                    "class": classes,
                    "id" : function(d) { return "z" + d.id; },
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


    // add city paths
    if (renderOpts.cities) {

      (function(self) {

        self.cities = {};

        var cities = renderOpts.cities,
            point_coords = self.cities.coords = {},
            city_r = self.cities.start_r = 6,
            start_font = self.cities.start_font = 22,
            start_swidth = self.cities.start_swidth = 5,
            // calculate bounding box for city label
            // of given font size
            bb = self.getCityLabelBBox = function(d, font_size) {
              // cache bound to function
              this.cache = this.cache || {};

              var text = d.properties.NAME;
              var id = text + Math.round(font_size*1000);

              if (this.cache[id]) return this.cache[id];

              var t = helper_svg.append('text')
                        .text(text)
                        .style('font-size', font_size + "px")
                        .attr('class', 'city-label');

              var bb = t.node().getBBox();
              t.remove();
              return this.cache[id] = bb;

            };

        // calculate center of city point
        cities.features.forEach(function(d) {
          point_coords[d.properties.NAME] = d3Albers(
            d.geometry.coordinates
          );
        });

        self.cities.points = features.append('g').selectAll('.cities')
          .data(cities.features)
          .enter()
          .append('circle')
          .attr({
            r : city_r,
            rx : city_r/2,
            ry : city_r/2,
            cx : function(d) {
              return point_coords[d.properties.NAME][0];
            },
            cy : function(d) {
              return point_coords[d.properties.NAME][1];
            },
            class : 'cities'
          });


        // weave labels to stack nicely
        var city_labels = features.append('g');

        cities.features.forEach(function(d) {

          var t = d.properties.NAME,
              dims = bb(d, start_font),
              px = point_coords[t][0],
              py = point_coords[t][1];

          city_labels.append('text')
            .datum(d)
            .attr({
              class : 'city-label',
              x : px + city_r*2,
              y : py + dims.height/4
            }).text(t);

        });

        self.cities.labels = city_labels.selectAll('text');

      })(self);



    }

    var fill_boundary = fill_czones;
    var hover_boundary = hover_czones;


    /* ---------------------------
      Zooming behavior
    -----------------------------*/

    var zoom_extent = [1, 8];
    var lag_scale = null;

    var zoomed = function() {

      var trans = (
        "translate(" +
          d3.event.translate +
        ")scale(" + d3.event.scale + ")"
      );

      var swidth = 1 / d3.event.scale + "px";

      features
        .style("stroke-width", swidth)
        .attr("transform",trans);

      // semantic zooming for city labels
      if (self.cities && lag_scale != d3.event.scale) {
        lag_scale = d3.event.scale;

        var c = self.cities,
            s = d3.event.scale,
            new_r = c.start_r/s,
            new_font = c.start_font/s,
            new_swidth = c.start_swidth/s,
            spad = c.start_pad,
            coords = self.cities.coords,
            bb = self.getCityLabelBBox;

        c.points.attr({
          'r' : new_r
        });

        c.labels
          .style('font-size', new_font + "px")
          .attr({
            x : function(d) {
              var t = d.properties.NAME;
              return coords[t][0] + new_r*2;
            },
            y : function(d) {
              var t = d.properties.NAME;
              return coords[t][1] + new_font/4;
            }
          });

      }


      if (options.multizoom) {
        // Select all features with common zoomclass
        var other_features = d3.selectAll(
          '.' + zoom_class + ":not(#" + container_id + ")"
        );
        // give other features the transform of this feature
        other_features
          .style("stroke-width", swidth)
          .attr("transform",trans);
      }
    };

    var zoom = d3.behavior.zoom()
        .center([width/2, height/2])
        .scaleExtent(zoom_extent)
        .on("zoom", zoomed);

    svg.call(zoom)
        .call(zoom.event)
        // disable unwanted zoom events
        .on("dblclick.zoom", null)
        .on("wheel.zoom", null)
        .on("mousewheel.zoom", null)
        .on("MozMousePixelScroll.zoom", null);

    /* ---------------------------
    -----------------------------*/



    /* ---------------------------
      Map Tooltip
    -----------------------------*/
    if (d3.select('div.us-map-tooltip').empty()) {
      tooltipDiv = d3.select('body').append('div')
        .attr('class', 'us-map-tooltip hidden shadow');
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

          // rebind click event
          boundary.on('click', function(){
            boundary_click_callback(this.id.replace("z", ""));
          });

          // create function to calculate population
          // numbers given current settings
          var popf = createPopulationFunction(settings, self.data);
          // create object holding start and end populations
          var pop = popf(d) || {};
          // add percentage and czone id to object
          pop.percent = (pop.end - pop.start) / pop.start;
          pop.boundary_id = this.id.replace("z", "");
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
          d3.select(this).classed('fa-search-plus') ?
            1.5 :
            (1/1.5),
          750
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
        var n_colors = fixed_colors.length;
        // Width of colored bins
        var binWidth = (legend_width*0.6 / (n_bins+1)) - offset;
        // height of colored bins
        var binHeight = 10;
        var binStrokeWidth = 1;

        var midpad = function(i) {
          return i >= Math.round(n_colors / 2) ?
                 binStrokeWidth*2 : 0;
        };

        var decline_text = legend.append('text')
          .text('decline')
          .attr('class', 'growth-text');

        var dtext_dims = getTextBBox(
          decline_text.text(),
          'growth-text'
        );

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
                  return (
                    offset/2 +
                    i*binWidth +
                    i*offset +
                    midpad(i) +
                    dtext_pad
                  );
                },
                y : 0
              })
              .style('fill', function(d){ return d; })
              .style('stroke', "#fff")
              .style('stroke-width', binStrokeWidth);

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
                  var dims = getTextBBox(
                    formatter(d),
                    'us-map-legend-label'
                  );
                  return (
                    (i+1)*(binWidth + offset) -
                    (dims.width/2) +
                    midpad(i+1) +
                    dtext_pad
                  );
                }
              });


        //half way accross the legend
        var half_way = (
          ((n_bins+1) / 2)*(binWidth + offset) +
          binStrokeWidth +
          dtext_pad
        );
        // midway line
        legend.append('line')
          .attr({
            "x1" : half_way,
            "x2" : half_way,
            "y1" : binStrokeWidth/2,
            "y2" : binHeight - binStrokeWidth/2
          }).style({
            "stroke" : "#000",
            "stroke-width" : 0.5
          });

        //half way accross the legend
        var past_legend = (n_bins+1)*(binWidth + offset) + dtext_pad;

        var growth_text = legend.append('text')
          .text('growth')
          .attr('class', 'growth-text');

        var gtext_dims = getTextBBox(
          growth_text.text(),
          'growth-text'
        );

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
                "x" : no_pop_position
              })
              .style('stroke', "#fff")
              .style('stroke-width', binStrokeWidth)
              .style('fill', missingColor);

        var pop_text = legend.append('text')
          .text('no population')
          .attr('class', 'growth-text');

        var poptext_dims = getTextBBox(
          pop_text.text(),
          'growth-text'
        );

        pop_text.attr({
          "x" : no_pop_position + binWidth + 5,
          "y" : poptext_dims.height
        });

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
      self.highlight(0);
      svg.transition()
            .duration(duration || 750)
            .call(zoom.translate([0, 0]).scale(1).event);
      return self;
    };

    /* ----------------------------------
        center the map on a target boundary
       ---------------------------------- */
    self.target = function(boundary_id, duration) {
      self.highlight(boundary_id);
      // reset map if US is selected
      if (boundary_id == "0") return self.reset(duration);
      // get boundary dom node
      var node = $('path#z' + boundary_id + '.us-map-boundary').get(0);
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
        callback to be fired before every update
       ---------------------------------- */
    var pre_update = function() {};
    self.pre_update = function(callback) {
      if (callback) {
        pre_update = callback;
        return self;
      } else {
        return pre_update;
      }
    };


    /* ----------------------------------
        callback to be fired after every update
       ---------------------------------- */
    var post_update = function() {};
    self.post_update = function(callback) {
      if (callback) {
        post_update = callback;
        return self;
      } else {
        return post_update;
      }
    };

    /* ----------------------------------
        callback to be fired on progress change
       ---------------------------------- */
    var on_progress = function() {};
    self.on_progress = function(callback) {
      if (callback) {
        on_progress = callback;
        return self;
      } else {
        return on_progress;
      }
    };

    /* ----------------------------------
        highlight a czone with an outline
       ---------------------------------- */
    self.highlight = function(czone) {

      svg.selectAll('path.us-map-boundary')
          .classed('highlight', function() {
            return this.id === "z" + czone;
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

        // callback to execute on every update
        // used to render detail charts after
        // assumption changes have been downloaded
        post_update(settings);
      };


      // try to get data from cache, or download it
      if (datacache[path]) {
        self.data = datacache[path];
        end_callback();
      } else {
        projections.loading_indicator = true;
        pre_update();
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
            on_progress(percentComplete);
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


})(projections);