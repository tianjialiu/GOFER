// =======================================
// Calc_KernelRes.js
// ---------------------------------------
// dynamically determine the kernel size
// using the resolution of GOES pixels
// ---------------------------------------
// @author: Tianjia Liu (tliu@ucar.edu)
// =======================================

// Inputs
var fireName = 'Creek';
var year = '2020';

var goesEast_no = '16';
var goesWest_no = '17';

// Metadata
var fireInfo = require('users/tl2581/westUSFires:largeFires_metadata.js');

var yrList = fireInfo.yrList;
var fireYrList = fireInfo.fireYrList;
var fireParamsList = fireInfo.fireParamsList;

// Fire Parameters
var fireParamsYrList = fireParamsList[year];
var fireDict = fireParamsYrList[fireName];
var fireNameYr = fireName.split(' ').join('_') + '_' + year;

// Input AOI
// can replace this with a custom geometry
var AOI = fireDict.AOI; 

var goesEast_col = ee.ImageCollection('NOAA/GOES/' + goesEast_no + '/FDCF');
var goesWest_col = ee.ImageCollection('NOAA/GOES/' + goesWest_no + '/FDCF');

var goesEast_confidence = goesEast_col.filterDate('2020-09-01','2020-09-02').first();
var goesWest_confidence = goesWest_col.filterDate('2020-09-01','2020-09-02').first();

var goesEastproj = goesEast_confidence.projection();
var goesWestproj = goesWest_confidence.projection();

var goesEastrand = ee.Image.random(0).multiply(1e4).toInt()
  .reproject({crs: goesEastproj,scale: goesEastproj.nominalScale()});
var goesWestrand = ee.Image.random(20).multiply(1e4).toInt()
  .reproject({crs: goesWestproj,scale: goesWestproj.nominalScale()});

var goesEast_randVec = goesEastrand.reduceToVectors({geometry: AOI.buffer(10000),
    crs:'EPSG:4326', scale:10, maxPixels:1e12})
  .filterBounds(AOI);
var goesWest_randVec = goesWestrand.reduceToVectors({geometry: AOI.buffer(10000),
    crs:'EPSG:4326', scale:10, maxPixels:1e12})
  .filterBounds(AOI);

var combined_randVec = goesEastrand.add(goesWestrand)
  .reduceToVectors({geometry: AOI.buffer(10000),
    crs:'EPSG:4326', scale:10, maxPixels:1e12})
  .filterBounds(AOI);
  
var get_kernelRes = function(randVec) {
  var randVec_areaRes = randVec
    .map(function(x) {
      var pixelArea = ee.Number(x.geometry().area(10));
      var pixelRes = pixelArea.sqrt();
      return x.set('area',pixelArea)
        .set('res_warea',pixelRes.multiply(pixelArea));
    });
  
  return randVec_areaRes.aggregate_sum('res_warea')
    .divide(randVec_areaRes.aggregate_sum('area')).round();
};
  
var goesEast_pt_everyOther = ee.Image.random(0).multiply(1e4).toInt()
  .reproject({crs: goesEastproj, scale: goesEastproj.nominalScale().multiply(2)})
  .reduceToVectors({geometry: AOI.buffer(1e4),
    maxPixels:1e12, geometryType:'centroid'})
  .map(function(x) {
    var coords = ee.Feature(x).geometry().coordinates();
    var lon = ee.Number(coords.get(0));
    var lat = ee.Number(coords.get(1));
    return ee.Feature(x).setGeometry(ee.Geometry.Point(lon.add(0.03),lat.add(0.03)));
}).union().geometry();

var goesEast_randVec_shade = goesEast_randVec.map(function(grid) {
  grid = ee.Feature(grid);
  return ee.Feature(ee.Algorithms.If(grid.geometry().intersects(goesEast_pt_everyOther),
    grid.set('shade',1),grid.set('shade',0)));
});

var goesWest_pt_everyOther = ee.Image.random(0).multiply(1e4).toInt()
  .reproject({crs: goesWestproj, scale: goesWestproj.nominalScale().multiply(2)})
  .reduceToVectors({geometry: AOI.buffer(1e4),
    maxPixels:1e12, geometryType:'centroid'})
  .map(function(x) {
    var coords = ee.Feature(x).geometry().coordinates();
    var lon = ee.Number(coords.get(0));
    var lat = ee.Number(coords.get(1));
    return ee.Feature(x).setGeometry(ee.Geometry.Point(lon.add(-0.03),lat.add(-0.03)));
}).union().geometry();

var goesWest_randVec_shade = goesWest_randVec.map(function(grid) {
  grid = ee.Feature(grid);
  return ee.Feature(ee.Algorithms.If(grid.geometry().intersects(goesWest_pt_everyOther),
    grid.set('shade',1),grid.set('shade',0)));
});

Map.addLayer(ee.Image().byte()
  .paint(goesEast_randVec,0,1)
  .paint(goesEast_randVec_shade.filter(ee.Filter.eq('shade',1)),0),
  {palette: ['black'], opacity:0.5});
Map.addLayer(ee.Image().byte()
  .paint(goesWest_randVec,0,1)
  .paint(goesWest_randVec_shade.filter(ee.Filter.eq('shade',1)),0),
  {palette: ['red'], opacity:0.5});
Map.addLayer(combined_randVec);
Map.centerObject(AOI);

print(get_kernelRes(goesEast_randVec),
  get_kernelRes(goesWest_randVec),
  get_kernelRes(combined_randVec));
