/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# Final rendering function calls
#
#
*/

;(function(projections){

// clone footer for feature
$('#feature-footer').html($('#footer').clone());

// move node to front
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

// load images async
$('img.async').each(function() {
  $this = $(this);
  $this.attr('src', $this.data().src);
});

// read more button
$('a.read-more').click(function () {
    var $this = $(this),
        moreText = "Read more",
        lessText = "Read less";
    $this.text($this.text() == moreText ? lessText : moreText);
    $("p#map-more-text").slideToggle("fast");
});

// initialize carousel (carousel.js)
var carousel = projections.carousel();

// settings to start map on
var default_settings = {
  mortality : "avg",
  fertility : "avg",
  migration : "avg",
  age       : "all",
  race      : "all",
  start     : 2010,
  end       : 2030,
  pyramid_year : 2010,
  boundary : "czones",
  detail_czone : 0 // 0 for US
};

// bind setting selection events, and store default settings
var select_settings = projections.select(default_settings);

// starting path given default settings
var start_filename = projections.path(select_settings);

// start detail data (for US)
var start_detail = "data/Charts/0_" + start_filename;

// Download data asynchronously and render on complete
// from mbostocks "queue.js" library
var q = queue();

// data to request on initial loading of map
var files = [
  "json/czone.geo.json",
  "json/czone.names.json",
  "json/us.small.geo.json",
  "json/cities.json",
  start_detail // include download of starting data
];

// Defer all files
files.forEach(function(filename) {
  // get file extension from filename
  var extension = filename.split('.').slice(-1)[0];
  // call appropriate d3 file reader function on file
  q.defer(d3[extension], filename);
});


// promise to be executed on data load
q.awaitAll(function(error, data) {

  // note any download errors
  if (error) throw error;

  // store all loaded datafiles in dictionary
  // indexed by filename
  var loaded = {};
  files.forEach(function(name, index) {
    loaded[name] = data[index];
  });

  // czone names
  var names = loaded['json/czone.names.json'];

  // populated cities
  var cities = loaded['json/cities.json'];

  // initalize czone dropdown
  var czone_dropdown = projections.dropdown(names);

  // detail graphics object (detail.js)
  var detail = projections.detail({
    settings : select_settings,
    data : loaded[start_detail],
    names : names
  });

  // pre-caculate topology for map
  var czones = loaded['json/czone.geo.json'];
  var czone_topology = topojson.feature(
    czones, czones.objects.czones
  ).features;

  // nice number formatting
  var commas = d3.format(',');
  var percent = d3.format(".2%");

  // state topology geojson
  var states = loaded["json/us.small.geo.json"];
  var state_topology = topojson.feature(
    states, states.objects.states
  ).features;

  var createToolTipFunc = function(click) {
    // create the html content of the tooltip
    // the function context is the data for the
    // area currently being moused over
    return function(){
        var p, t;
        if (this.percent) {
          p = percent(this.percent);
        } else {
          p = "(no population)";
        }
        if (this.end && this.start) {
          t = commas(this.end - this.start);
        } else {
          t = "(no population)";
        }
        var id = this.boundary_id;
        var a = (parseFloat(id) > 56 ? " area" : "");
        return (
          '<div id="name">' + names[id] + a + '</div>'+
          '<div id="growth_title">POPULATION GROWTH</div>'+
          '<div id="growth_value">' + p + '</div>'+
          '<div id="change_title">POPULATION CHANGE</div>' +
          '<div id="change_value">' + t + '</div>'+
          (click ? '<div id="discover">click to discover more</div>' : "")
        );
      };
  };

  // settings for map factory (mapper.js)
  // returns function to render maps
  // (does not create map itself)
  var map_opts = {
    // settings object
    settings : select_settings,
    // bins and colors to use in choropleth + legend
    bins : d3.range(-0.4, 0.5, 0.1),
    colors : [
      "#ff4f00", //       x < -40
      "#ff8400", // -40 < x < -30
      "#fdb913", // -30 < x < -20
      "#ffd990", // -20 < x < -10
      "#ffebc4", // -10 < x < 0
      "#cfe3f5", //   0 < x < 10
      "#82c4e9", //  10 < x < 20
      "#1696d2", //  20 < x < 30
      "#0076bc", //  30 < x < 40
      "#1D4281"  //  40 < x
    ],
    missingColor : "#aaa",
    // formatting function for legend labels
    legendFormat : d3.format("%"),
    // id and display variables
    id : "czone",
    display : "population",
    // czone topology
    czone_topology : czone_topology,
    // state topology
    state_topology : state_topology,
    // tooltip
    tooltip : {
      formatter : createToolTipFunc(true)
    }
  };


  var mapFactory = projections.mapper(map_opts);

  var small_map_tooltip = {
    tooltip : {
      formatter : createToolTipFunc(false)
    },
    fixed : true,
    multizoom : true
  };

  var smallMapFactory = projections.mapper(map_opts)
                                   .options(small_map_tooltip);

  var render_small_map = function(opt) {
    // start render options, async data loading
    var renderOpts = {
      renderTo : opt.id,
      async : true,
      zoomClass : opt.zoomClass
    };
    // create options object to load data for map
    var update_opts = $.extend({}, default_settings, (opt.d || {}));
    // render legend if necssary
    if (opt.legend) {
      renderOpts.legendRenderTo = opt.legend;
    }
    var m = smallMapFactory(renderOpts)
              .target(opt.cz)
              .highlight(opt.cz);

    m.__updateopts__ = update_opts;
    return m;
  };

  // object storing the settings for all
  // the small maps
  var small_maps = {
    //
    // race groupings
    //
    races_all : {
      id : "#races-inline-all",
      cz : "0",
      legend: "#races-inline",
      zoomClass : "races-inline"
    },
    races_white : {
      id : "#races-inline-white",
      cz : "0",
      d : {"race" : "white"},
      zoomClass : "races-inline"
    },
    races_black : {
      id : "#races-inline-black",
      cz : "0",
      d : {"race" : "black"},
      zoomClass : "races-inline"
    },
    races_hispanic : {
      id : "#races-inline-hispanic",
      cz : "0",
      d : {"race" : "hispanic"},
      zoomClass : "races-inline"
    }
  };

  // initialize map object
  var main_map =  mapFactory({
    renderTo : "#map_container",
    legendRenderTo : "#map_container-legend",
    legendMouseover : true,
    zoomClass : "main_map",
    cities : cities
  });

  // draw topology for all small maps
  // after main map has cached topology
  var small_rendered = {};
  for (var m in small_maps) {
    var opts = small_maps[m];
    small_rendered[m] = render_small_map(opts);
  }


  // list of all the visuals to update
  // on parameter changes
  var visuals = [];

  // update a small map and run a callback
  var update_from_cache = function(id, callback) {
    var init = small_rendered[id].__updateopts__;
    small_rendered[id].update(init, callback);
  };

  // update all the visuals when there is a settings change
  var refresh = function(settings) {
    visuals.forEach(function(chart) {
      chart.update(settings);
    });
  };

  // update all the visuals with the new settings
  // whenever a change is made to a setting
  select_settings.change(refresh);


  // function to update detail info
  var update_detail = function(czone) {

    // update czone
    var cz = parseFloat(czone);
    var cz_bound = (cz < 56 ? "states" : "czones");
    var old_bound = select_settings.boundary;

    select_settings.set({
      detail_czone : czone,
      boundary : (cz === 0 ? old_bound : cz_bound)
    });

    // zoom to czone in map
    main_map.target(czone, 1500);

    detail.update(select_settings);

    // update download links
    projections.downloadLinks(select_settings);

  };

  // whenever a new czone is selected,
  // update the charts
  czone_dropdown.change(update_detail);

  // add main map to visuals list
  visuals.push(
    // immediately update the map. This is done to allow
    // the inital map shape to render without having to
    // download the entire czone dataset
    main_map
    // update the detail map on click of a county
    .click(function(czone) {
      var detail_top = $("#detail-well").offset().top - 180,
          curr_top = projections.getTop();
      // update detail page to czone
      czone_dropdown.set(czone);
      update_detail(czone);
      // scroll to detail area of map page
      projections.scrollTo(curr_top, detail_top, 750);
    })
    .update(select_settings, function(){
      // update all the smaller maps once the main
      // map has downloaded the default data and updated.
      // The small maps are not added to the
      // visuals list as they are not to be changed
      // when the selections are updated

      // since the race charts are use the same
      // data as the main map, wait until it is cached
      update_from_cache('races_all');
      update_from_cache('races_white');
      update_from_cache('races_black');
      update_from_cache('races_hispanic');

    })
    // callbacks to show loading progress
    // in detail plots while map is downloading
    .pre_update(function() {
      // start loading icons
      detail.progress_start();
    })
    .on_progress(function(value) {
      detail.progress_update(value);
    })
    .post_update(function(settings) {
      detail
        .progress_end()
        .update(settings);
    })
  );

  //
  //
  // inline links to map settings in feature
  //
  //
  // link tooltips
  $('[data-toggle="tooltip"]').tooltip();
  // go to map on click
  $('.jump-to-map').click(function() {
    // set the user scroll position on the map
    // page to the top of the map itself
    carousel.top('map', 300);
    // transition to the map
    projections.goTo("map", function() {
      // scroll to map if not already there
      $('#return-to-map').trigger('click');
    });
    // updates the settings with the
    // data from the link, and then
    // run the provided settings callback
    var data = $(this).data();
    select_settings.set(data);
    // zoom map to given czone
    main_map.target(data.czone);
  });

});

})(projections);