// =========================================
// Export_FireProg.js
// -----------------------------------------
// export fire perimeters in chunks
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

// Inputs
var fireIdx = 4;
var fireName = inFiresList[fireIdx][0];
var year = inFiresList[fireIdx][1];
var fireNameYr = fireName.split(' ').join('_') + '_' + year;

// Input modes:
// 1. 'C' (Combined, both GOES-East/West)
// 2. 'E' (East, only GOES-East),
// 3. 'W' (West, only GOES-West)
var satMode = 'C';

// Metadata
var fireInfo = require('users/embrslab/GOFER:largeFires_metadata.js');
var projFolder = fireInfo.projFolder;
var yrList = fireInfo.yrList;
var fireYrList = fireInfo.fireYrList;
var fireParamsList = fireInfo.fireParamsList;
var parallaxAdjList = fireInfo.parallaxAdjList;
var confidenceThreshList = fireInfo.confidenceThreshList;

// Fire Parameters
var fireParamsYrList = fireParamsList[year];
var fireDict = fireParamsYrList[fireName];
fireDict.timeInterval = 1;
fireDict.tileScale = 1;

var confidence_cutoff = confidenceThreshList[satMode]; 
var parallaxAdj_val = parallaxAdjList[satMode]; 

var fireNameYr = fireName.split(' ').join('_') + '_' + year;

var findBandNames = function(eHour) {
  return ee.List.sequence(1,eHour,1).map(function(iHour) {
    return ee.String('h_').cat(ee.Number(iHour).toInt().add(1e4));
  });
};

var getScaleVals = function(scaleVals,eHour) {
  return ee.ImageCollection(scaleVals.filter(ee.Filter.lte('timeStep',eHour))
    .map(function(scaleHr) {
      var scaleVal = ee.Feature(scaleHr).getNumber('scaleVal');
      scaleVal = ee.Number(ee.Algorithms.If(scaleVal.lt(0.1),0,scaleVal));
      return ee.Image(scaleVal);
    })).toBands().rename(findBandNames(eHour));
};

var getFireConf = function(fireDict,eHour) {
  
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
  
  // Early perimeter scalings
  var scaleVals = ee.FeatureCollection(projFolder + 'GOFER' + 
    satMode + '_scaleVal/' + fireNameYr + '_scaleVal')
      .sort('timeStep');
  var scaleValsImg = getScaleVals(scaleVals,eHour);
 
  // Fire detection confidence
  var goesEast_confidence = ee.Image(projFolder + 'GOESEast_MaxConf/' + fireNameYr);
  var goesWest_confidence = ee.Image(projFolder + 'GOESWest_MaxConf/' + fireNameYr);
  
  var goesEast_max_confidence = goesEast_confidence.select(findBandNames(eHour))
    .divide(scaleValsImg).reduce(ee.Reducer.max());
  var goesWest_max_confidence = goesWest_confidence.select(findBandNames(eHour))
    .divide(scaleValsImg).reduce(ee.Reducer.max());

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

  return smoothed_confidence;
};

var getFirePerim = function(fireDict,smoothed_confidence,confidence_cutoff) {
  var high_confidence = smoothed_confidence.gt(confidence_cutoff);

  var affected_areas = high_confidence
    .reproject({crs: 'EPSG:4326', scale: 50})
    .reduceToVectors({
      scale: 50, 
      maxPixels: 1e10,
      geometry: fireDict.AOI,
      tileScale: fireDict.tileScale,
      bestEffort: true
    }).filter(ee.Filter.eq('label', 1));

  return affected_areas;
};

var getFireProgression = function(fireDict,sHour,eHour,confidence_cutoff) {
   
  var fireAreaByHour = ee.List.sequence(sHour,eHour,fireDict.timeInterval)
    .map(function(iStep) {
        
      var smoothed_confidence = getFireConf(fireDict,iStep);
      var affected_areas = getFirePerim(fireDict,smoothed_confidence,confidence_cutoff);
    
      return ee.Feature(affected_areas.geometry(), {
          timeStep: iStep,
          area_km2: affected_areas.geometry().area(100).multiply(1/1e6),
        });
    });
  
  return ee.FeatureCollection(fireAreaByHour);
};

var getFireProgShp = function(fireAreaByHour) {
 
  fireAreaByHour = fireAreaByHour.filter(ee.Filter.gt('area_km2',0));
  
  var getFireProg = function(fireAreaByHour) {
   
    var max_error_meters = 100;
    var affected_areas_smoothed = ee.Feature(fireAreaByHour).simplify(max_error_meters);
      
    return affected_areas_smoothed;
  };
  
  var fireProg = ee.FeatureCollection(fireAreaByHour.map(getFireProg));
  
  return fireProg;
};

// Outputs fire perimeters in 24h chunks, defined by chunkInterval;
// this prevents computational timeouts for large fires
var chunkInterval = 24;
var nChunk = fireDict.nDay * 24/chunkInterval - 1;

// If any chunk is missing, uncomment the two lines below and resubmit those select tasks.
// First, set sHourMissing as an array of the start hour(s) of the missing chunks.
// Then, set var sHour = sHourMissing[iChunk] in the for loop.

// var sHourMissing = [1081,1153,1177,1225,1249];
// var nChunk = sHourMissing.length - 1;

for (var iChunk = 0; iChunk <= nChunk; iChunk ++) {
  var sHour = iChunk * chunkInterval + 1;
  var eHour = sHour + chunkInterval - 1;
  if (iChunk === nChunk) {eHour = fireDict.nHour}

  var fireAreaByHour = getFireProgression(fireDict,sHour,eHour,confidence_cutoff);
  var fireProg = getFireProgShp(fireAreaByHour);

  Export.table.toDrive({
    collection: fireProg,
    description: fireNameYr + '_fireProg_s' + sHour + 'e' + eHour,
    fileFormat: 'SHP',
    folder: 'ee_fireProg_chunks'
  });
}
