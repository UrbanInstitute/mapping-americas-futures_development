/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# progress bar for loading
#
#
*/

;(function(projections){

function progress(options) {
  var width = options.width;
  var height = options.height;
  var svg = options.svg;

  var progress_width = width / 2.5;
  var progress_height = 30;

  var progress_scale = d3.scale.linear()
    .domain([0, 100])
    .range([0, progress_width]);


  var helper_svg = d3.select('body')
    .append('svg')
    .attr('class', 'helper-svg');

  var plexiglass = svg.append('g');

  plexiglass.append('rect')
    .attr({
      "width" : width,
      "height" : height,
      "class" : "us-map-plexiglass"
    });

  var dims = function(text, class_name) {
    var t = helper_svg.append('text')
      .text(text)
      .attr('class', class_name);
    var d = t.node().getBBox();
    t.remove();
    return d;
  };

  plexiglass.append('text')
      .text('Downloading Assumptions...')
      .attr({
        "class" : "us-map-progress-text",
        "x" : function() {
          var d = dims(
            'Downloading Assumptions...', "us-map-progress-text"
          );
          return (width / 2) - d.width/2;
        },
        "y" : (height / 2) - 20
      });

  plexiglass.append('rect')
      .attr({
        "class" : "us-map-progress-background",
        "width" : progress_width,
        "height" : progress_height,
        "x" : (width / 2) - (progress_width / 2),
        "y" : (height / 2),
        "rx" : 5,
        "ry" : 5
      });

  var progress_bar = plexiglass.append('rect')
      .attr({
        "class" : "us-map-progress-bar",
        "width" : 0,
        "height" : progress_height,
        "x" : (width / 2) - (progress_width / 2),
        "y" : (height / 2),
        "rx" : 5,
        "ry" : 5
      });

  helper_svg.remove();

  return {
    update : function(value) {
      progress_bar.attr('width', progress_scale(value));
      return this;
    },
    remove : function(callback) {
      plexiglass.transition()
        .duration(300)
        .style('opacity', 0)
        .each("end", function (d, i) {
          if (i === 0) {
            callback();
            plexiglass.remove();
          }
        });
    }
  };
}

projections.progress = progress;

})(projections);