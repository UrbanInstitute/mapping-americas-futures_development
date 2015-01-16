/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# map legend
#
#
*/



;(function(projections){

projections.legend = function(opts) {

  var legendRenderTo = opts.legendRenderTo, legend;

  // Clear previous legend
  var legend_container = d3.select(legendRenderTo)
                            .classed('map-legend-svg-container', true);
  legend_container.selectAll("*").remove();

  // if the legend is rendered somewhere else, copy the svg
  var existing = $('.us-map-legend.map-legend-svg').first();
  if (existing.length && !opts.legendMouseover) {
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
    var n_bins = opts.bins.length;
    var n_colors = opts.colors.length;
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

    var dtext_dims = projections.getTextBBox(
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
        .data(opts.colors)
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



    var formatter = opts.legendFormat;
    // Add text to legend, and reposition it correctly
    legend.append('g').selectAll('text')
          .data(opts.bins)
        .enter()
        .append('text')
          .attr('class', 'us-map-legend-label')
          .text(formatter)
          .attr({
            y : (binHeight + 10),
            x : function(d, i) {
              var dims = projections.getTextBBox(
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

    var gtext_dims = projections.getTextBBox(
      growth_text.text(),
      'growth-text'
    );

    growth_text.attr({
      "x" : past_legend + 5,
      "y" : gtext_dims.height
    });

    var no_pop_position = past_legend + gtext_dims.width + 20;

    no_pop = legend.append('rect')
          .attr({
            "class" : "us-map-legend-rect",
            id : opts.missingColor,
            "width" : binWidth,
            "height": binHeight,
            "x" : no_pop_position
          })
          .style('stroke', "#fff")
          .style('stroke-width', binStrokeWidth)
          .attr('fill', opts.missingColor);

    var pop_text = legend.append('text')
      .text('no population')
      .attr('class', 'growth-text');

    var poptext_dims = projections.getTextBBox(
      pop_text.text(),
      'growth-text'
    );

    pop_text.attr({
      "x" : no_pop_position + binWidth + 5,
      "y" : poptext_dims.height
    });


    if (opts.legendMouseover) {
      // show zones with this legend color
      [legend_rects, no_pop].map(function(s) {
        s.on('mouseover', opts.legendMouseover)
         .on('mouseout', opts.legendMouseout);
      });
    }



  }

};

})(projections);