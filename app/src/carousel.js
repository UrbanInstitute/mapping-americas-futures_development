/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# Carousel  + scrolling Events
#
#
*/


// protect global scope
;(function(){


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

/*
** resize header based on scroll
*/
// store selection references
// (selecting is slowwwww)
var $nav = $('nav.navbar'),
    $title = $('#title-span'),
    $margined = $('.height-adjust'),
    $logoimage = $('.logo-image'),
    $briefs = $('#briefs'),
    $map_affix = $('.affix#map-top'),
    start_size = parseFloat($nav.css('height')),
    end_size = 66,
    start_margin_top = parseFloat($('.height-adjust').css('margin-top')),
    end_margin_top = 10;


// linear scales for scroll position
var height = d3.scale.linear()
              .domain([0, 1])
              .range([start_size, end_size]);

var margin = d3.scale.linear()
              .domain([0, 1])
              .range([start_margin_top, end_margin_top]);

var font_size = d3.scale.linear()
              .domain([0, 1])
              .range([25, 16]);


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

  //scroll to top on page init;
  scrollTo(getTop(), 0, 0);

  // selection references
  var $win = $(window),
      $view = $('.view_button'),
      $car = $('.carousel'),
      // affix map controls
      $controls = $('#map-top'),
      $control_collapse = $('#control-collapse'),
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
      goTo = projections.goTo = function(p) {
        return $car.carousel(pages.indexOf(p));
      },
      // reset affix offset for different div sizes
      control_bottom = function() {
        return $controls.get(0).getBoundingClientRect().bottom - 100;
      },
      setAffixOffset = function() {
        if (!$('.affix').length) {
          $controls.data('bs.affix').options.offset = control_bottom();
        }
      };


  // Bind affix events once affixed div has
  // rendered bounding rect
  var init_affix = function() {

    // only show control toggle when affixed
    $control_toggle
      .click(function() {
        $control_collapse.slideToggle();
      })
      .hide();

    // bind affix listeners
    $controls
      .affix({
        offset: control_bottom(),
        bottom: function() { return false; }
      })
      .on('affix.bs.affix', function() {
        $filler.css('height',
           $controls.get(0).getBoundingClientRect().height
        );
      })
      .on('affixed.bs.affix', function() {
        $controls.css('width', $map_container.width());
        $control_collapse.hide();
        $control_toggle.show();
      })
      .on('affixed-top.bs.affix', function() {
        $controls.css('width', 'inherit');
        $control_collapse.show();
        $control_toggle.hide();
        $filler.css('height', 0);
      });

  };

  // Check hash in request, default to feature
  hash = hash ? hash.slice(1) : "feature";
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
      if (hash == "map" && !affix_initialized) {
        init_affix();
        affix_initialized = true;
      }
      setAffixOffset();
    });
  });

  if (hash == "map") {
    init_affix();
    affix_initialized = true;
  }

  $(window).on('resize', function() {
    scrollTo(getTop(), 0, 0);
    $controls.css('width', $map_container.width());
  });

  // record user scroll position
  $win.scroll(function(){
    view_top[hash] = Math.round(getTop());
    resizeHeader();
  });

  // map scroll top button
  $('#return-to-map').click(function(){
    var map_top = $(".hr-legend").offset().top - 50;
    scrollTo(getTop(), map_top, 750);
  });

  return {
    top : function(hash, value) {
      view_top[hash] = value;
    }
  };

} // carousel events

// export carousel initialization
projections.carousel = carousel;
projections.scrollTo = scrollTo;
projections.getTop = getTop;
}).call(this);