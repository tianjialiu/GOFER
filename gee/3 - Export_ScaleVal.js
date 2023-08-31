// =======================================
// Export_ScaleVal.js
// ---------------------------------------
// export scalings for early perimeters
// ---------------------------------------
// @author: Tianjia Liu (tliu@ucar.edu)
// =======================================

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
var fireInfo = require('users/tl2581/GOFER:largeFires_metadata.js');
var projFolder = fireInfo.projFolder;
var yrList = fireInfo.yrList;
var fireYrList = fireInfo.fireYrList;
var fireParamsList = fireInfo.fireParamsList;
var parallaxAdjList = fireInfo.parallaxAdjList;

var parallaxAdj_val = parallaxAdjList[satMode]; 

var findBandNames = function(eHour) {
  return ee.List.sequence(1,eHour,1).map(function(iHour) {
    return ee.String('h_').cat(ee.Number(iHour).toInt().add(1e4));
  });
};

var getFireScaleVal = function(fireDict,iHour) {
  
  // Kernels
  var goesEast_kernel = ee.Kernel.square(fireDict.kernels[0],'meters',true);
  var goesWest_kernel = ee.Kernel.square(fireDict.kernels[1],'meters',true);
  var combined_kernel = ee.Kernel.square(fireDict.kernels[2],'meters',true);
  
  var kernels = {
    'E': goesEast_kernel,
    'W': goesWest_kernel,
    'C': combined_kernel,
  };
  
  var input_kernel = kernels[satMode];

  // Fire detection confidence
  var goesEast_max_confidence = ee.Image(projFolder + 'GOESEast_MaxConf/' + fireNameYr)
    .select(findBandNames(iHour)).reduce(ee.Reducer.max());
  var goesWest_max_confidence = ee.Image(projFolder + 'GOESWest_MaxConf/' + fireNameYr)
    .select(findBandNames(iHour)).reduce(ee.Reducer.max());

  // Parallax x,y displacements
  var goesEast_displace = ee.Image(projFolder + 'GOESEast_Parallax/' + fireNameYr)
    .reduceNeighborhood({
      'reducer': ee.Reducer.mean(),
      'kernel': input_kernel,
      'optimization': 'boxcar'
    });
    
  var goesWest_displace = ee.Image(projFolder + 'GOESWest_Parallax/' + fireNameYr)
    .reduceNeighborhood({
      'reducer': ee.Reducer.mean(),
      'kernel': input_kernel,
      'optimization': 'boxcar'
    });
  
  // Max fire detection confidence
  goesEast_max_confidence = goesEast_max_confidence.displace(goesEast_displace.multiply(parallaxAdj_val),'nearest_neighbor');
  goesWest_max_confidence = goesWest_max_confidence.displace(goesWest_displace.multiply(parallaxAdj_val),'nearest_neighbor');
  
  var combined_max_confidence = ee.ImageCollection([
    goesEast_max_confidence,
    goesWest_max_confidence,
  ]).mean();
  
  var max_confidence = {
    'E': goesEast_max_confidence,
    'W': goesWest_max_confidence,
    'C': combined_max_confidence
  };

  var input_confidence = max_confidence[satMode];
  
  var smoothed_confidence = input_confidence.clip(fireDict.AOI)
    .reduceNeighborhood({
      'reducer': ee.Reducer.mean(),
      'kernel': input_kernel,
      'optimization': 'boxcar'
    });

  var scaleVal = smoothed_confidence.reduceRegions({
    collection: fireDict.AOI,
    reducer: ee.Reducer.max(),
    crs: 'EPSG:4326',
    scale: 50
  }).first().getNumber('max');
  
  return ee.Feature(fireDict.AOI,{timeStep:iHour,scaleVal:scaleVal});
};

var getFireScaleImg = function(fireDict,nHour,
  goesEast_confidence,goesWest_confidence,goesEast_displace,goesWest_displace) {
  var fireScaleVals = ee.List.sequence(1,nHour,1).map(function(iHour) {
    return ee.Feature(ee.Algorithms.If(ee.Number(iHour).lt(500),
      getFireScaleVal(fireDict,iHour,
        goesEast_confidence,goesWest_confidence,goesEast_displace,goesWest_displace),
      ee.Feature(fireDict.AOI,{timeStep:iHour,scaleVal:1})));
  });
  
  return ee.FeatureCollection(fireScaleVals);
};


for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
  var fireName = inFiresList[fireIdx][0]; 
  var year = inFiresList[fireIdx][1];
  var fireNameYr = fireName.split(' ').join('_') + '_' + year;
  
  // Fire Parameters
  var fireParamsYrList = fireParamsList[year];
  var fireDict = fireParamsYrList[fireName];
  var nHour = fireDict.nHour;
  
  var fireScaleValByHour = getFireScaleImg(fireDict,nHour);

  Export.table.toAsset({
    collection: fireScaleValByHour,
    description: fireName.split(' ').join('_') + '_' + year + '_scaleVal',
    assetId: projFolder + 'GOFER' + satMode + '_scaleVal/' + fireNameYr + '_scaleVal'
  });
}
