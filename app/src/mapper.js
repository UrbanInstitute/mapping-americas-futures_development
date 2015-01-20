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
projections.mapper = function(options) {

  var
    //
    // These "magic numbers" are not the pixel width and height,
    // but simply a starting point for the w/h ratio
    // which tightly bounds the map. The actual visible
    // dimensions are set by the svg viewbox.
    //
    width = 1011,
    height = 588,
    // the assumption / age / race settings object
    settings = options.settings,
    // projection function
    d3Albers = d3.geo.albersUsa()
        .scale(width*1.2)
        .translate([width/2, height/2]),
    // standard projection function for the maps
    geoPath = d3.geo.path().projection(d3Albers),
    // cache for path strings (check for existence already)
    pathcache = projections.cache.path = projections.cache.path || {},
    // cache for map data
    datacache = projections.cache.data = projections.cache.data || {},
    // cache for map state data
    statecache = (
      projections.cache.statedata = projections.cache.statedata || {}
    ),
    // zero padding function
    zeros = d3.format("05d"),
    i_d,
    variable_order = ["agegrp", "yr", "r"],
    parsers = {
      "cz" : projections.dataParser(
        ["cz"].concat(variable_order)
      ),
      "stfips" : projections.dataParser(
        ["stfips"].concat(variable_order)
      )
    };


  // structure data for usage in map
  function prepMapData(raw) {
    var id = (raw[0].cz !== undefined) ? "cz" : "stfips";
    return parsers[id](raw);
  }

  // memoized path generation function
  function path(d) {
    var uid = d.id;
    if (uid in pathcache) {
      return pathcache[uid];
    } else {
      return (pathcache[uid] = geoPath(d));
    }
  }

  //
  //
  // map constructor
  //
  //
  function map(renderOpts) {

    // map object to return ("self")
    var
      self = {async : renderOpts.async},
      container = d3.select(renderOpts.renderTo),
      tooltipDiv,
      container_id = renderOpts.renderTo.replace("#",""),
      // local references to options
      colors = options.colors,
      bins = options.bins,
      display = options.display,
      missingColor = options.missingColor,
      czone_topology = options.czone_topology,
      state_topology = options.state_topology,
      fixed = options.fixed,
      // Correct ratio of bins to colors
      // (there should be one more color than bins)
      d = (colors.length - bins.length),
      fixed_bins = (d <= 0) ? bins.slice(0, d-1) : bins,
      fixed_colors = (d > 1) ? colors.slice(0, -d+1) : colors,
      // create scale for breaks
      colorf = d3.scale.threshold()
                  .domain(fixed_bins)
                  .range(fixed_colors),
      start_data = null,
      // add hidden svg canvas for calculating bounding boxes
      // even if the main svg is not yet being displayed
      helper_svg = d3.select('body').append('svg')
        .attr('class', 'helper-svg')
        .style('visibility', "hidden");




    function createPopulationFunction(curr_settings, data) {

      if (fixed && !start_data) {
        start_data = curr_settings;
      }

      var settings = start_data || curr_settings,
        // !!hacky -- 2000 -> 00 needs to be 0
        start = parseInt(settings.start_abbr()),
        end = parseInt(settings.end_abbr()),
        age = settings.age_number(),
        race = settings.race_abbr(),
        uid, v_start, v_end;

      // return a function which provides
      // the population values in the two periods
      // for a given czone
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

    }



    // color fill for czones, defaulting to missing color
    function createFill(settings, data) {
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
    }

    // stop click events
    function stopped() {
      if (d3.event.defaultPrevented) d3.event.stopPropagation();
    }


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
    var addLayer = function(topology, classes, swidth) {
      return features.append('g')
                .selectAll('path')
                  .data(topology)
                .enter().append('path')
                  .attr({
                    "class": classes,
                    "id" : function(d) { return "z" + d.id; },
                    "d" : path,
                    "stroke-width" : swidth || 1
                  });
    };

    // States visible in background while transitioning
    var
      background_states = addLayer(
        state_topology, 'us-map-states-background'
      ),
      fill_states = addLayer(
        state_topology, 'us-map-states-filled hidden', 2
      ),
      fill_czones = addLayer(
        czone_topology, 'us-map-czones'
      ),
      outline_states = addLayer(
        state_topology, 'us-map-states', 2
      ),
      hover_states = addLayer(
        state_topology, 'us-map-states-hover hidden us-map-boundary', 2
      ),
      hover_czones = addLayer(
        czone_topology, 'us-map-czones-hover us-map-boundary'
      );

    // extend self with city layers if desired
    if (renderOpts.cities) {

      (function(self) {

        self.cities = {};

        var cities = renderOpts.cities,
            point_coords = self.cities.coords = {},
            city_r = self.cities.start_r = 4,
            start_font = self.cities.start_font = 12,
            start_swidth = self.cities.start_swidth = 5,
            start_text_offset = self.cities.start_text_offset = 1,
            // calculate bounding box for city label
            // of given font size
            bb = self.getCityLabelBBox = function(d, font_size) {
              // cache bound to function
              var text = d.properties.NAME;
              return projections.getTextBBox(text, 'city-label', function(node) {
                return node.style('font-size', font_size + "px");
              });
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
        var city_label_highlights = features.append('g');
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

          city_label_highlights.append('text')
            .datum(d)
            .datum(d)
            .attr({
              class : 'city-label-highlight',
              x : px + city_r*2 + start_text_offset,
              y : py + dims.height/4 + start_text_offset
            }).text(t);

        });

        self.cities.labels = city_labels.selectAll('text');
        self.cities.label_highlights = city_label_highlights.selectAll('text');

      })(self);



    }

    var fill_boundary = fill_czones;
    var hover_boundary = hover_czones;


    /* ---------------------------
      Zooming behavior
    -----------------------------*/

    var zoom_extent = [1, 6.5];
    var lag_scale = null;

    function zoomed() {

      var s = d3.event.scale;
      var t = d3.event.translate;

      var trans = (
        "translate(" + t + ")scale(" + s + ")"
      );

      var swidth = 1 / s + "px";

      features
        .attr('stroke-width', swidth)
        .attr("transform",trans);

      outline_states.attr("stroke-width", 2 / s + "px");
      hover_boundary.attr("stroke-width", 2 / s + "px");
      fill_boundary.attr("stroke-width", 1 / s + "px");

      // semantic zooming for city labels
      if (self.cities && lag_scale != s) {
        lag_scale = s;

        var c = self.cities,
            new_r = c.start_r/s,
            new_font = c.start_font/s,
            new_swidth = c.start_swidth/s,
            new_offset = c.start_text_offset/s,
            spad = c.start_pad,
            coords = c.coords,
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

        c.label_highlights
          .style('font-size', new_font + "px")
          .attr({
            x : function(d) {
              var t = d.properties.NAME;
              return coords[t][0] + new_r*2 + new_offset;
            },
            y : function(d) {
              var t = d.properties.NAME;
              return coords[t][1] + new_font/4 + new_offset;
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

    }

    var zoom = d3.behavior.zoom()
        .center([width/2, height/2])
        .scaleExtent(zoom_extent)
        .on("zoom", zoomed);

    svg.call(zoom).call(zoom.event)
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
    function moveToolTip(){
      var x, y, tt_bbox;
      x = d3.event.pageX;
      y = d3.event.pageY;
      tt_bbox = tooltipDiv.node().getBoundingClientRect();
      tooltipDiv.style({
        top :  "" + (y - tt_bbox.height - 20) + "px",
        left : "" + (x - tt_bbox.width / 2) + "px"
      });
    }

    // move the tooltip as the user moves their
    // mouse over the map container div
    container.on('mousemove', moveToolTip);

    var boundary_click_callback = function(){};
    fill_boundary.attr('fill', missingColor);

    function bind_click_callback(boundary) {
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

    }

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
      var ext = zoom_extent;
      var newScale = Math.max(ext[0], Math.min(ext[1], scale*factor));
      var t = zoom.translate();
      var c = [width / 2, height / 2];
      zoom
        .scale(newScale)
        .translate([
          c[0] + (t[0] - c[0]) / scale * newScale,
          c[1] + (t[1] - c[1]) / scale * newScale
        ])
        .event(svg.transition().duration(dur || 200));
    }

    // zoom in + out
    container.selectAll(".fa-search-plus, .fa-search-minus")
      .on('click', function(){
        zoomByFactor(
          d3.select(this).classed('fa-search-plus') ?
            2 :
            (1/2),
          500
        );
      });
    /* ---------------------------
    -----------------------------*/

    if (renderOpts.legendRenderTo) {

      legend_opts = $.extend(
        {},
        renderOpts,
        options,
        {
          "bins" : fixed_bins,
          "colors" : fixed_colors
        }
      );

      if (renderOpts.legendMouseover) {
        legend_opts.legendMouseover = function(){
          var fill = createFill(settings, self.data);
          var rect = this;
          fill_boundary.attr('fill', function(d){
              var czone_fill = d3.select(this).attr('fill');
              return czone_fill == rect.id ? czone_fill : "#eeeeee";
          });
        };
        legend_opts.legendMouseout = function(){
          var fill = createFill(settings, self.data);
          fill_boundary.attr('fill', fill);
        };
      }

      projections.legend(legend_opts);

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
    self.highlight = function(fipscode) {

      svg.selectAll('path.us-map-boundary')
          .classed('highlight', function() {
            return this.id === "z" + fipscode;
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
        background_states.classed('hidden', false);
        d3.csv(path, function(error, downloaded_data){
          if (error) throw error;
          self.data = datacache[path] = prepMapData(downloaded_data);
          if (progress_bar) {
            progress_bar.remove(end_callback);
          } else {
            end_callback();
            background_states.classed('hidden', true);
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
};


})(projections);