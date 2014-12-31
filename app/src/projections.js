/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# projections namespace definition
#
#
*/

var projections = {
  // cache for data and path rendering
  cache : {},
  // boolean indicating if a file is currently
  // being downloaded
  loading_indicator : false,
  // display is currently mobile sized (768px)
  mobile : function() {
    return $("#mobile-test").css("display") === "block";
  }
};
