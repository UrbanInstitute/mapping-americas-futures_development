/*
#
#
# Population Projections 2.0
# Ben Southgate (bsouthga@gmail.com)
# 10/31/14
#
#
# settings selection (hackish MVCish thing)
#
#
*/

;(function(projections){

/*
  Update text at top of detail section
*/
function createDetailString(settings) {
  var full = {
        "avg" : "average",
        "low" : "low",
        "high" : "high"
      },
      b = settings.fertility,
      d = settings.mortality,
      m = settings.migration,
      cap = function(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
      };

  $('#detail-settings').text(
    cap(full[b]) + " birth, " +
    full[d] + " death, " +
    full[m] + " migration." 
  );

}

function createYearString(settings) {
  $('#detail-years').text(
    [settings.start, settings.end].join("-")
  );
}

/*
  Links for data download
*/
function downloadLinks(settings) {
  var czone = settings.detail_czone;
  var filename = projections.path(settings);
  var dpath;
  // path to data download
  if (settings.boundary == "states") {
    dpath = "data/states/Download/";
  } else {
    dpath = "data/Download/";
  }

  // map data with current settings
  $('#download-map').attr(
    'href', dpath + '0_' + filename
  );

  // detail commuting zone data
  $('#download-czone').attr(
    'href', dpath + czone + "_AllFert_AllMort_AllMig.csv"
  );

}

function raceAbbr(race_string) {
  var race = race_string.charAt(0).toUpperCase();
  return ( race === "A" ? "T" : race );
}

function yearAbbr(year) {
  return ("" + year).slice(-2);
}

// create buttons
function addButtons(id, values) {
  return d3.select("#" + id)
    .attr('class', "btn-group btn-group-justified settings")
    .selectAll('div.btn-group')
    .data(values).enter()
    .append('div')
      .attr("class" , "btn-group btn-group-sm")
    .append('button')
      .attr({
        type : "button",
        class : function(d, i) {
          return "btn settings-button" + (!i ? " active" : "");
        },
        id : function(d) { return d; }
      })
      .text(function(d) {
        return d.toUpperCase();
      });
}

var age_range = ["all", "0-19", "20-49", "50-64", "65+"],
    ethnicities = ["all", "white", "black", "hispanic", "other"],
    assumptions = ["low", "avg", "high"];



// gray out assumptions when "2000 to 2010"
// is selected, as the data is not from
// the model
var assumption_buttons = {
  disable : function() {

    this.plexiglass = this.plexiglass || d3.select('#assumption-buttons')
      .append('div')
      .style({
        "top" : 0,
        "display" : "block",
        "position" : "absolute",
        "width" : "100%",
        "height" : "100%",
        "z-index" : 20,
        "opacity" : 0
      });

    this.buttons.forEach(function(b) {
      b.style('background-color', '#ccc');
    });

  },
  enable : function() {

    if (this.plexiglass) {
      this.plexiglass.remove();
      this.plexiglass = null;
    }

    this.buttons.forEach(function(b) {
      b.style('background-color', '');
    });
  },
  buttons : [
    addButtons("migration", assumptions),
    addButtons("mortality", assumptions),
    addButtons("fertility", assumptions)
  ]
};


addButtons("age", age_range);
addButtons("race", ethnicities);





function select(defaults) {

  // placeholder callback
  var callback = function(){ };

  // starting years
  var starting_years = [2000, 2010, 2020];

  // current settings (essentially the "Model" in an MVC sense)
  var settings = defaults;

  // Detail information
  createDetailString(settings);
  createYearString(settings);

  // shortened versions to access data
  settings.age_number = function(){return age_range.indexOf(this.age);};
  settings.race_abbr = function(){return raceAbbr(this.race);};
  settings.start_abbr = function(){return yearAbbr(this.start);};
  settings.end_abbr   = function(){return yearAbbr(this.end);};
  settings.pyramid_abbr = function(){return yearAbbr(this.pyramid_year);};

  // last update was an assumptions change
  settings.assumption_change = true;

  // these settings require new data to be downloaded
  var assumption_settings = [
    "mortality",
    "fertility",
    "migration",
    "boundary"
  ];

  var settings_buttons = d3.selectAll('.settings button');

  //
  //
  // Demographic and asumption settings buttons
  //
  //
  settings_buttons.on('click', function(){
    // don't allow settings changes if currently loading a file
    if (projections.loading_indicator) return;
    // two levels up is the button group container for these settings
    var setting_group = $(this).parents('.settings')[0];
    // determined whether an assumption change was made
    var contains = function(value, array) {
      return $.inArray(array, value) != -1;
    };
    settings.assumption_change = contains(
      setting_group,
      assumption_settings
    );
    // store the settings
    settings[setting_group.id] = this.id;
    // mark the correct buttons active
    settings_buttons.classed('active', function(){
      // two levels up is the button group container for these settings
      var setting_group = $(this).parents('.settings')[0];
      return settings[setting_group.id] == this.id;
    });
    // run the callback on the new settings
    callback(settings);
    // update the indicator string in the detail section
    createDetailString(settings);
    // update download links
    downloadLinks(settings);
  });


  //
  //
  // starting and ending year dropdowns
  //
  //
  var year = function(d) {
    var end = (this.parentNode.id === "end");
    // values for ending year are 10 greater
    // than starting year
    return d + end*10;
  };


  // add year options to select
  var year_select = d3.selectAll('.year-select');
  year_select.selectAll('option')
    .data(starting_years)
    .enter()
    .append('option')
    .attr('value', year)
    .text(year);

  // action on change of year
  year_select.on('change', function(){
    // assumptions have not changed
    settings.assumption_change = false;
    // don't allow settings changes if currently loading a file
    if (projections.loading_indicator) return;
    // we've changed the "end" year
    var end = (this.id === "end");
    // select the other dropdown element
    var other = d3.select(".year-select#" + (end ? "start" : "end"));
    // the selected year
    var this_year = parseInt(this.value);
    // the selected year in the other dropdown
    var other_year = parseInt(other.property('value'));
    // make sure that the end year is after the starting year
    if (end && this_year <= other_year) {
      other_year = this_year - 10;
    }
    if (!end && this_year >= other_year) {
      other_year = this_year + 10;
    }
    // record settings
    settings.start =  end ? other_year : this_year;
    settings.end   = !end ? other_year : this_year;
    // update select values after constraining
    year_select.property('value', function() {
      return settings[this.id];
    });


    if (settings.start === 2000 && settings.end === 2010) {
      assumption_buttons.disable();
    } else {
      assumption_buttons.enable();
    }

    // run callback
    callback(settings);
    // update detail year string
    createYearString(settings);
    // update download links
    downloadLinks(settings);
  });

  // add population pyramid settings
  var pyramid_years = addButtons(
    "pyramid-select",
    starting_years
      .concat(starting_years.slice(-1)[0]+10)
      .map(String)
  )
  .classed("pyramid-button", true)
  .on('click', function() {
    // assumptions have not changed
    settings.assumption_change = false;
    // don't allow settings changes if currently loading a file
    if (projections.loading_indicator) return;
    // sett all buttons inactive
    pyramid_years.classed('active', false);
    d3.select(this).classed('active', true);
    // add year selection to settings object
    settings.pyramid_year = parseFloat(this.id);
    // run callback
    callback(settings);
  });


  // alter settings callback through getter / setter function
  settings.change = function(func) {
    if (!arguments.length) {
      return callback;
    } else {
      callback = func;
      return settings;
    }
  };

  //
  // set model to update
  //
  settings.set = function(update, no_callback) {

    // update current setting values
    for (var varname in update) {
      if (settings[varname] !== undefined) {
        settings[varname] = update[varname];
      }
    }

    // update the detail information
    createDetailString(settings);
    createYearString(settings);

    // update active buttons
    settings_buttons.classed('active', function(){
      // two levels up is the button group container for these settings
      var setting_group = $(this).parents('.settings')[0];
      return settings[setting_group.id] == this.id;
    });

    year_select.property('value', function() {
      return settings[this.id];
    });

    // run callback on update settings
    if (!no_callback) {
      callback(settings);
    }

    // update download links
    downloadLinks(settings);
  };

  // start with defaults
  settings.set(defaults);

  return settings;
}

// selection initialization function
projections.select = select;

// helper functions to format settings
projections.raceAbbr = raceAbbr;
projections.yearAbbr = yearAbbr;
projections.downloadLinks = downloadLinks;

})(projections);