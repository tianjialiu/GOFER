// =========================================
// Export_FireIg.js
// -----------------------------------------
// export fire perimeters with ignition
// points as centroids of next polygon
// fireProg -> fireIg
// -----------------------------------------
// @author Tianjia Liu (embrslab@gmail.com)
// =========================================

var inFiresList = [
  ['Kincade','2019'],
  ['Walker','2019'],
  ['August Complex','2020'],
  ['Bobcat','2020'],
  ['Creek','2020'],
  ['CZU Lightning Complex','2020'],
  ['Dolan','2020'],
  ['Glass','2020'],
  ['July Complex','2020'],
  ['LNU Lightning Complex','2020'],
  ['North Complex','2020'],
  ['Red Salmon Complex','2020'],
  ['SCU Lightning Complex','2020'],
  ['Slater and Devil','2020'],
  ['SQF Complex','2020'],
  ['W-5 Cold Springs','2020'],
  ['Zogg','2020'],
  ['Antelope','2021'],
  ['Beckwourth Complex','2021'],
  ['Caldor','2021'],
  ['Dixie','2021'],
  ['KNP Complex','2021'],
  ['McCash','2021'],
  ['McFarland','2021'],
  ['Monument','2021'],
  ['River Complex','2021'],
  ['Tamarack','2021'],
  ['Windy','2021']
];

// Input modes:
// 1. 'C' (Combined, both GOES-East/West)
// 2. 'E' (East, only GOES-East)
// 3. 'W' (West, only GOES-West)
var satMode = 'C';

// Metadata
var fireInfo = require('users/embrslab/GOFER:largeFires_metadata.js');
var projFolder = fireInfo.projFolder;

var get_centroids = function(fireProg) {
  return ee.FeatureCollection(fireProg.geometry().coordinates().map(function(coords) {
      return ee.Feature(ee.Geometry.Polygon(coords).centroid());
    })).geometry();
};

var get_fireIg = function(inFireProg) {
  var min_ts = inFireProg.aggregate_min('timeStep');
  var max_ts = inFireProg.aggregate_max('timeStep');

  var fireProgIg = ee.List.sequence(min_ts,max_ts,1).map(function(t2) {

    var t1 = ee.Number(t2).subtract(1);
    var fireProg_t2 = inFireProg.filter(ee.Filter.eq('timeStep',t2)).first();
    var fireProg_t1 = ee.Feature(ee.Algorithms.If(
      ee.Number(t2).eq(min_ts),
      get_centroids(fireProg_t2),
      inFireProg.filter(ee.Filter.eq('timeStep',t1)).first()));
     
    var fireProg_t1_add = ee.FeatureCollection(
      ee.List(fireProg_t2.geometry().coordinates()).map(function(x) {
      var newPolyBool = ee.Geometry.Polygon(x)
        .intersects(fireProg_t1.geometry(),100);
      var newPoly = ee.Algorithms.If(newPolyBool,
          ee.Feature(ee.Geometry.Polygon(x)),
          ee.Feature(ee.Geometry.Polygon(x).centroid()));
        return ee.Feature(newPoly).set('id',ee.Feature(newPoly).geometry().type());
      })).filter(ee.Filter.eq('id','Point'));
    
    var ignitions = ee.Feature(ee.Algorithms.If(
      ee.Number(t2).eq(min_ts),
      get_centroids(fireProg_t2),
      fireProg_t1_add.geometry())).geometry();
    
    return ee.Feature(ignitions, {
      timeStep: t1,
      ignitions: ignitions.coordinates().flatten().size().divide(2)
    });
  });
  
  return ee.FeatureCollection(fireProgIg)
    .filter(ee.Filter.gt('ignitions',0));
};

for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
  var fireName = inFiresList[fireIdx][0]; 
  var year = inFiresList[fireIdx][1]; 
  
  var fireNameYr = fireName.split(' ').join('_') + '_' + year;
  var inFireProg = ee.FeatureCollection(projFolder + 'GOFER' + 
      satMode + '_fireProg/' + fireNameYr + '_fireProg')
    .sort('timeStep');
  
  var fireIg = get_fireIg(inFireProg);

  var outputName = fireName.split(' ').join('_') + '_' + year + '_fireIg';

  Export.table.toAsset({
    collection: fireIg,
    description: outputName,
    assetId: projFolder + 'GOFER' + satMode + '_fireIg/' + outputName,
  });
  
  Export.table.toDrive({
    collection: fireIg,
    description: outputName,
    folder: 'ee_fireIg',
    fileFormat: 'SHP'
  });
}
