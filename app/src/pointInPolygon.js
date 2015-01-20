var fs = require("fs");
var czones = JSON.parse(fs.readFileSync("../json/czone.geo.json", "utf8"));
var cities = JSON.parse(fs.readFileSync("../json/cities.json", "utf8"));
var wherewolf = require('wherewolf');
var wolf = new wherewolf()

wolf.add("czone",czones,"czones")
var output = {"type": "FeatureCollection","features":[]}

for(var i = 0; i < cities.features.length; i++) {
    var obj = cities.features[i];
    var coords = obj.geometry.coordinates;
    var czoneID = wolf.find(coords,{ wholeFeature: true }).czone.id
    obj["properties"]["CZONE_ID"] = czoneID
    output["features"][i] = obj
}

var outputFilename = '../json/cities.json';

fs.writeFile(outputFilename, JSON.stringify(output), function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("JSON saved to " + outputFilename);
    }
}); 