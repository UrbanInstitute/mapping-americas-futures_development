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
  // land on mobile sized (768px)
  mobile : $("#mobile-test").css("display") === "block",
  // land on ie9 or less
  ie9 : $('html').is("lte_ie9")
};
