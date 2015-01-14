/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# function to convert d3 csv array to
#
#
*/


;(function(projections) {

  projections.dataParser = function(order, variable) {

    // variable to store at "leaves" of object
    variable = variable || "pop";

    function prepData(raw) {

      var
        row,
        path,
        d = {},
        last_index = order.length - 1;

      // need closure for obj reference
      function add(row, obj) {

        order.forEach(function(n, i) {
          // years are inconsistantly 2 / 1 characters
          var key = n === "yr" ?
                      parseInt(row[n]) :
                      row[n];
          // if we've reached the last key,
          // store the variable value
          if (i == last_index) {
            obj[key] = Number(row[variable]);
          } else {
            if (!obj[key]) obj[key] = {};
            obj = obj[key] || {};
          }

        });

      }

      // buid the object
      raw.forEach(function(row) { add(row, d); });

      return d;
    }

    return prepData;

  };

})(projections);
