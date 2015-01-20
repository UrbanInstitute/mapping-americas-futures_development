
var fs = require("fs");
var czones = JSON.parse(fs.readFileSync("../json/czone.geo.json", "utf8"));
var cities = JSON.parse(fs.readFileSync("../json/cities.json", "utf8"));
var wherewolf = require('wherewolf');
var wolf = new wherewolf()
// console.log(w)
// data = JSON.parse(data)
// console.log(data)
//Load the data asynchronously
// wolf = Wherewolf();
// console.log(data)
// wolf.add("czones",data);
// for (var name in data.objects.czones) {
//   wolf.add(name,data,name);
//   console.log("foo")
// }
wolf.add("czone",czones,"czones")
var output = {"type": "FeatureCollection","features":[]}
// console.log(wolf.find([-71.057756783011428,42.358847171748607],{ wholeFeature: true }))
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