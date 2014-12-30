/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# county dropdown
#
#
*/

// protect global scope
;(function(){


function dropdown(names) {

  var self = {};

  var name_list = [];
  $.each(names, function(czone, name) {
    name_list.push({czone : czone, name : name});
  });

  // sort names alphabetically
  name_list.sort(function(aobj, bobj) {
    var a = aobj.name;
    var b = bobj.name;
    return (a > b) - (a < b);
  });

  // insert us at beginning
  name_list.unshift({czone : 0, name : "United States"});

  d3.select("#czone-select").selectAll('option')
    .data(name_list)
    .enter()
    .append('option')
    .attr('value', function(d) { return d.czone; })
    .text(function(d) {
      var cz = parseFloat(d.czone);
      var i;
      if (cz !== 0) {
        i = (cz < 65) ? " (State)" : "";
      } else {
        i = "";
      }
      return d.name + i;
    });

  // county dropdown
  var select = $('#czone-select').select2();

  // set callback for dropdown change
  var callback = function() {};
  self.change = function(new_callback) {
    callback = new_callback;
    select.change(function() { callback(this.value); });
  };

  // set dropdown to a particular value
  self.set = function(czone) {
    select.select2("val", czone);
    callback(czone);
  };

  return self;
}


// export module
projections.dropdown = dropdown;

}).call(this);
