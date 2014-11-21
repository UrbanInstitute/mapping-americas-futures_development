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
function scrollTo(start, end, duration){
  $({scrTop: start}).animate({scrTop: end}, {
    duration: duration,
    step: function(val) {
      window.scrollTo(0, val);
    }
  });
}

/*
** resize header based on scroll
*/
// store selection references
// (selecting is slowwwww)
var $nav = $('nav.navbar');
var $title = $('#title-span');
var $margined = $('.height-adjust');
var $logoimage = $('.logo-image');
var $briefs = $('#briefs');


var start_size = parseFloat($nav.css('height'));
var end_size = 66;
var start_margin_top = parseFloat($('.height-adjust').css('margin-top'));
var end_margin_top = 10;


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
  var scr = Math.min(1, getTop()/(350 - end_size));
  var h = height(scr);

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
  var $win = $(window);
  var $view = $('.view_button');
  var $car = $('.carousel');

  // Get page to start on from url
  var hash = window.location.hash;
  hash = hash ? hash.slice(1) : "feature";
  hash = hash != "map" ? "feature" : "map";

  // User scroll position for each carousel component
  var view_top = {map : 0, feature : 0};

  // initialize carousel with no wrapping
  $car.carousel({interval : false, wrap : false});

  // function to go to index of page in carousel
  var pages = ["feature", "map"];
  var goTo = function(p) {
    return $car.carousel(pages.indexOf(p));
  };
  projections.goTo = goTo;

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
    scrollTo(start, end, 700);
  });

  // record user scroll position
  $win.scroll(function(){
    view_top[hash] = Math.round(getTop());
    resizeHeader();
  });

  // map scroll top button
  $('#return-to-map').click(function(){
    var map_top = $("#map-top").offset().top - 50;
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