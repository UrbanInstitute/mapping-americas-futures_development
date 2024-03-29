/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# Carousel + scrolling Events + affix
#
#
*/


;(function(projections) {


/*
** resize header based on scroll
*/

var $nav = $('nav.navbar'),
    $title = $('#title-span'),
    $margined = $('.height-adjust'),
    $logoimage = $('.logo-image'),
    $briefs = $('#briefs'),
    $map_affix = $('.affix#map-top'),
    start_size = parseFloat($nav.css('height')),
    end_size = 66,
    start_margin_top = parseFloat($('.height-adjust').css('margin-top')),
    end_margin_top = 10,

    // linear scales for scroll position
    height = d3.scale.linear()
              .domain([0, 1])
              .range([start_size, end_size]),

    margin = d3.scale.linear()
              .domain([0, 1])
              .range([start_margin_top, end_margin_top]),

    font_size = d3.scale.linear()
              .domain([0, 1])
              .range([25, 16]);


// get top offset
function getTop() {
  var doc = document.documentElement;
  var top = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
  return top;
}

// animate scrolling from start to end
function scrollTo(start, end, duration, callback){
  $({scrTop: start}).animate({scrTop: end}, {
    duration: duration,
    step: function(val) {
      window.scrollTo(0, val);
    },
    complete : callback
  });
}

function resizeHeader() {
  var scr = Math.min(1, getTop()/(350 - end_size)),
      h = height(scr);

  $map_affix.css('top', h + 'px');
  $nav.css('height' , h + 'px');
  $briefs.css('top', h + 'px');
  $title.css('line-height', h + 'px')
        .css('font-size', font_size(scr) + 'px');
  $margined.css('margin-top', margin(scr) + 'px');
  $logoimage.css('height', h*0.8 + 'px')
            .css('margin-top', h*0.1 + 'px');
}

/*
#
# Define carousel animation events
#
*/
function carousel() {

  // selection references
  var
    $win = $(window),
    $view = $('.view_button'),
    $car = $('.carousel'),
    // affix map controls
    $controls = $('#map-top'),
    $control_collapse = $('#control-collapse'),
    $control_row = $('#control-row');
    $control_toggle = $('#control-collapse-toggle'),
    $legend_header = $('#legend-header'),
    $map_container = $('#map_container'),
    $filler = $('#space-filler'),
    affix_initialized = false,
    // Get page to start on from url
    hash = window.location.hash,
    // User scroll position for each carousel component
    view_top = {map : 0, feature : 0},
    // function to go to index of page in carousel
    pages = ["feature", "map"],
    goTo = projections.goTo = function(p, callback) {
      p = p != "map" ? "feature" : "map";
      return $car.on('slide.bs.carousel', callback || function(){})
                  .carousel(pages.indexOf(p));
    };


  // controls bounding rect
  function controlBBox() {
    return $control_row.get(0).getBoundingClientRect();
  }

  // reset affix offset for different div sizes
  function control_bottom() {
    return $win.scrollTop() + controlBBox().bottom - 150;
  }


  function setAffixOffset() {
    if (affix.affixed) {
      $controls.data('bs.affix').options.offset = control_bottom();
    }
  }

  function startAffix() {
    // The affix needs to stretch
    // all the way across the screen
    $filler.css('height', controlBBox().height);
    $controls
      .css('left', 0)
      .css('width', $win.width());
    // Padd the controls to keep them
    // in line with the map
    $control_collapse
      .css('padding-top', 30)
      .css('width', $map_container.width());
    $control_collapse.hide();
    $control_toggle.show();
  }

  function endAffix() {
    $controls
      .css('width', '')
      .css('padding-top', '')
      .css('left', '');
    $control_collapse
      .css('width', '')
      .show();
    $control_toggle.hide();
    $filler.css('height', 0);
  }


  // Bind affix events once affixed div has
  // rendered bounding rect
  var affix = {
    active : false,
    affixed : false,
    init : function() {

      this.active = true;

      // scroll to top to get correct affix scrollpoint
      // no mobile affix
      if (projections.mobile() || projections.ie9) {
        $control_toggle.remove();
        return false;
      }

      // only show control toggle when affixed
      $control_toggle
        .click(function() {
          $control_collapse.slideToggle(function() {
            // change collapse button text
            $control_toggle.html(
              ($control_collapse.css('display') === "none") ?
              ('<span class="settings-dropdown-icon">' +
                '<i class="fa fa-3 fa-chevron-circle-down"></i>' +
              '</span>Change settings') :
              ('<span class="settings-dropdown-icon">' +
                '<i class="fa fa-3 fa-times-circle"></i>' +
              '</span>Close Settings')
            );
         });
        }).hide(); // hide on load

      // bind affix listeners
      // need to bind events before affix init
      // (https://github.com/twbs/bootstrap/pull/14331)
      var self = this;
      $controls
        .on('affix.bs.affix', function() {
          self.affixed = true;
          startAffix();
        })
        .on('affixed-top.bs.affix', function() {
          self.affixed = false;
          endAffix();
        })
        .affix({
          offset: control_bottom(),
          bottom: function() { return false; }
        });
      return this;

    },
    disable : function() {
      if (!this.active) return this;
      this.active = this.affixed = false;
      endAffix();
      $win.off('.affix');
      // unbind events and remove affix classes
      $controls
        .unbind()
        .removeData('bs.affix')
        .removeClass('affix affix-top affix-bottom');
      $control_toggle.off();
      return this;
    },
    reset : function() {
      return this.disable().init();
    }
  };

  // Check hash in request, default to feature
  hash = hash ? hash.slice(1) : "map";
  hash = hash != "map" ? "feature" : "map";

  // initialize carousel with no wrapping
  $car.carousel({interval : false, wrap : false});

  // links to aspects of the feature in
  // the header
  $('.carousel-link').click(function() {
    goTo(this.id);
  });

  // go to page in url
  goTo(hash);

  // on click of side tab, change to that page
  $view.click( function(){ goTo(this.id); } );

  // fade buttons and scroll on carousel move
  $('#carousel').on('slide.bs.carousel', function() {
    // fade out old button
    $("#" + hash + " .view_button").fadeOut(200);
    // store window top position of old view
    var start = view_top[hash];
    // get new view hash
    hash = $('.item:not(.active)').attr('id');
    // get window top of new view
    var end = view_top[hash];
    // alter url to match view
    window.location.hash = hash;
    // fade in new button
    $("#" + hash + " .view_button").fadeIn(200);
    // animate window position to new top
    scrollTo(start, end, 700, function() {
      if (hash == "map" && !affix.active) {
        affix.init();
      }
      setAffixOffset();
    });
  });

  if (hash == "map") {
    affix.init();
  }

  $win
    .on('resize', function() {
      if (projections.mobile()) {
        affix.disable();
      } else {
        affix.reset();
      }
      if (affix.affixed) {
        startAffix();
      }
    })
    .scroll(function(){
      view_top[hash] = Math.round(getTop());
      resizeHeader();
    })
    .on('hashchange', function() {
      goTo(window.location.hash.slice(1));
    });

  $('#return-to-map').click(function(){
    var map_top = $("#legend-header").offset().top - 150;
    scrollTo(getTop(), map_top, 750);
  });

  return {
    top : function(hash, value) {
      view_top[hash] = value;
    }
  };

}

projections.carousel = carousel;
projections.scrollTo = scrollTo;
projections.getTop = getTop;

})(projections);