// =========================================
// Export_FireProgStats.js
// -----------------------------------------
// export ancillary stats for fire
// perimeters
// fireProg, rfireLine ->
// fireProgStats, scaleVals
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

var roundNum = function(inputNum,digits) {
  return inputNum.multiply(Math.pow(10,digits)).round()
    .divide(Math.pow(10,digits));
};

var get_mae_fireSpread = function(fireProg_t1,fireProg_int) {
  return ee.FeatureCollection([ee.Feature(fireProg_t1)])
    .distance(1e5).clip(fireProg_int.buffer(1))
    .reduceRegions({
      collection: fireProg_int,
      reducer: ee.Reducer.max().unweighted(),
      crs: 'EPSG:4326',
      scale: 1
    }).first().getNumber('max').multiply(1/1000);
};

var get_awe_fireSpread = function(fireProg_t1,fireProg_t2,fireProg_int) {
  var fireProg_t2Buf = fireProg_t2.geometry()
    .difference(fireProg_t2.geometry().buffer(-1));
  return ee.FeatureCollection([ee.Feature(fireProg_t1)])
    .distance(1e5).clip(fireProg_int)
    .reduceRegions({
      collection: fireProg_t2Buf,
      reducer: ee.Reducer.mean().unweighted(),
      crs: 'EPSG:4326',
      scale: 1
    }).first().getNumber('mean').multiply(1/1000);
};

var get_centroids = function(fireProg) {
  return ee.FeatureCollection(fireProg.geometry().coordinates().map(function(coords) {
      return ee.Feature(ee.Geometry.Polygon(coords).centroid());
    })).geometry();
};

var get_fireProgStats = function(inFireProg,inFireLine) {
  var min_ts = inFireProg.aggregate_min('timeStep');
  var max_ts = inFireProg.aggregate_max('timeStep');

  var fire_spread_ts = ee.List.sequence(min_ts,max_ts,1).map(function(t2) {

    var t1 = ee.Number(t2).subtract(1);
    var fireProg_t2 = inFireProg.filter(ee.Filter.eq('timeStep',t2)).first();
    var fireProg_t1 = ee.Feature(ee.Algorithms.If(
      ee.Number(t2).eq(min_ts),
      ee.Feature(get_centroids(fireProg_t2))
        .set('area_km2',0).set('area_acre',0),
      inFireProg.filter(ee.Filter.eq('timeStep',t1)).first()));
     
    var fireProg_t1_area_km2 = fireProg_t1.getNumber('area_km2');
    var fireProg_t1_area_acre = fireProg_t1.getNumber('area_acre');
    
    var fireProg_t1_add = ee.FeatureCollection(
      ee.List(fireProg_t2.geometry().coordinates()).map(function(x) {
      var newPolyBool = ee.Geometry.Polygon(x)
        .intersects(fireProg_t1.geometry(),100);
      var newPoly = ee.Algorithms.If(newPolyBool,
          ee.Feature(ee.Geometry.Polygon(x)),
          ee.Feature(ee.Geometry.Polygon(x).centroid()));
        return ee.Feature(newPoly).set('id',ee.Feature(newPoly).geometry().type());
      })).filter(ee.Filter.eq('id','Point'));
  
    fireProg_t1 = ee.Algorithms.If(fireProg_t1_add.size().gt(0),
       ee.Feature(fireProg_t1.union(fireProg_t1_add.geometry())),
       ee.Feature(fireProg_t1));
  
    var fireProg_int = fireProg_t2.geometry()
      .difference(ee.Feature(fireProg_t1).geometry());
    
    var validProg = fireProg_int.area();
      
    var fire_area_km2 = ee.Number(fireProg_t2.get('area_km2'));
    var fire_dArea_km2 = fire_area_km2.subtract(fireProg_t1_area_km2);
    var fire_area_acre = ee.Number(fireProg_t2.get('area_acre'));
    var fire_dArea_acre = fire_area_acre.subtract(fireProg_t1_area_acre);

    var mae_fire_spread = ee.Number(ee.Algorithms.If(validProg.gt(1).and(fire_dArea_km2.gt(0)),
      get_mae_fireSpread(fireProg_t1,fireProg_int),0));
      
    var fireLine_t1 = inFireLine
      .filter(ee.Filter.eq('timeStep',t1));
    
    var fireLineLen_t1 = ee.Number(ee.Algorithms.If(fireLine_t1.size().gt(0),
      fireLine_t1.first().getNumber('length_km'),0));
    
    var awe_fire_spread = ee.Number(ee.Algorithms.If(ee.Number(t2).eq(min_ts),
      get_awe_fireSpread(fireProg_t1,fireProg_t2,fireProg_int),
      fire_dArea_km2.divide(fireLineLen_t1)));

    return ee.Feature(null, {
      timeStep: ee.Number(t2).subtract(0.5), 
      mae_spread_kmh: roundNum(mae_fire_spread,3),
      awe_spread_kmh: roundNum(awe_fire_spread,3),
      dArea_acre: roundNum(fire_dArea_acre,3),
      dArea_km2: roundNum(fire_dArea_km2,3)
    }).setGeometry(fireProg_t2.geometry());
  });
  return ee.FeatureCollection(fire_spread_ts);
};

var setMeta = function(x) {
  return x.set('fireName',fireName).set('year',year);
};


// fireProgStats
for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
  var fireName = inFiresList[fireIdx][0]; 
  var year = inFiresList[fireIdx][1]; 
  
  var fireNameYr = fireName.split(' ').join('_') + '_' + year;
  var inFireProg = ee.FeatureCollection(projFolder + 'GOFER' + 
      satMode + '_fireProg/' + fireNameYr + '_fireProg')
    .sort('timeStep');
  var inFireLine = ee.FeatureCollection(projFolder + 'GOFER' + 
      satMode + '_rfireLine/' + fireNameYr + '_fireLine')
    .sort('timeStep');
 
  var fireProgStats = get_fireProgStats(inFireProg,inFireLine);
  var outputName = fireName.split(' ').join('_') + '_' + year +
      '_fireProgStats';
  
  Export.table.toDrive({
    collection: fireProgStats,
    description: outputName,
    fileFormat: 'CSV',
    selectors: ['timeStep','mae_spread_kmh','awe_spread_kmh',
      'dArea_acre','dArea_km2'],
    folder: 'ee_fireStats'
  });
}

// scaleVals
var scaleVals = [];
for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
  var fireName = inFiresList[fireIdx][0]; 
  var year = inFiresList[fireIdx][1];
  var fireNameYr = fireName.split(' ').join('_') + '_' + year;
  
  var scaleValFire = ee.FeatureCollection(projFolder + 'GOFER' + satMode + '_scaleVal/' + 
    fireNameYr + '_scaleVal').sort('timeStep');
    
  scaleVals[fireIdx] = scaleValFire.map(setMeta);
}

scaleVals = ee.FeatureCollection(scaleVals).flatten();

Export.table.toDrive({
  collection: scaleVals,
  description: 'scaleVal_' + satMode,
  selectors: ['fireName','year','timeStep','scaleVal'],
  folder: 'ee_fireStats'
});

