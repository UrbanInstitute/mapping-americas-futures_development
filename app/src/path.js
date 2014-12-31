/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# Create formatted path for data retrieval
#
#
*/

;(function(projections){

// Capitalize word
var capitalize = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

//
// return a filename for the current settings
// (doesn't include the czone)
//
function path(settings) {

  // The assumption variables in the order they
  // appear in the filename
  var folder_varibles = [
    "fertility",
    "mortality",
    "migration"
  ];

  // shortened versions of the variables for the filename
  var variable_abbr = {
    "mortality" : "Mort",
    "fertility" : "Fert",
    "migration" : "Mig"
  };

  // create filename suffix
  // <level>Fert_<level>Mort_<level>Mig.csv
  return folder_varibles.map(function(name) {
    var level = settings[name].charAt(0).toUpperCase();
    return level + variable_abbr[name];
  }).join("_") + ".csv";

}

projections.path = path;

})(projections);
