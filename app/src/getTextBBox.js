/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# get bounding rect for an svg text node
#
#
*/

;(function(projections){


var helper_svg = d3.select('body')
      .append('svg')
      .attr('class', 'helper-svg'),
    cache = {};

// calculate text bounds (memoized)
projections.getTextBBox = function(text, classname, modifier) {

  // cache bound to function
  cache = cache || {};
  var id = text + "_" + classname;

  if (cache[id] && !modifier) return cache[id];

  var t = helper_svg.append('text')
            .text(text)
            .attr('class', classname);

  if (modifier) t = modifier(t);
  var bb = t.node().getBBox();
  t.remove();

  return cache[id] = bb;

};


})(projections);