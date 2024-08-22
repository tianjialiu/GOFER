// =========================================
// Export_cFireLine.js
// -----------------------------------------
// export GOES active fire lines
// (retrospective)
// fireProg -> cfireLine
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
// 2. 'E' (East, only GOES-East),
// 3. 'W' (West, only GOES-West)
var satMode = 'C';

var goes_east_no = '16';
var goes_west_no = '17';

// option to export a csv table of the FRP along the active fire line
var exportFRP = false;

var GOESEast_col = ee.ImageCollection('NOAA/GOES/' + goes_east_no + '/FDCF');
var GOESWest_col = ee.ImageCollection('NOAA/GOES/' + goes_west_no + '/FDCF');
  
// Metadata
var fireInfo = require('users/embrslab/GOFER:largeFires_metadata.js');
var projFolder = fireInfo.projFolder;
var yrList = fireInfo.yrList;
var fireYrList = fireInfo.fireYrList;
var fireParamsList = fireInfo.fireParamsList;
var parallaxAdjList = fireInfo.parallaxAdjList;
var confidenceThreshList = fireInfo.confidenceThreshList;

var parallaxAdj_val = parallaxAdjList[satMode]; 

var confidence_cutoffsList = {
  'E': [0.05,0.1,0.25,0.5,0.75],
  'W': [0.05,0.1,0.25,0.5,0.75],
  'C': [0.05,0.1,0.25,0.5,0.75,0.9]
};

var confidence_cutoffs = confidence_cutoffsList[satMode];

var findBandNames = function(inHour) {
  return ee.List.sequence(inHour,inHour,1).map(function(iHour) {
    return ee.String('h_').cat(ee.Number(iHour).toInt().add(1e4));
  });
};

var roundNum = function(inputNum,digits) {
  return inputNum.multiply(Math.pow(10,digits)).round()
    .divide(Math.pow(10,digits));
};

var getScaleVals = function(scaleVals,inHour) {
  var scaleHr = scaleVals.filter(ee.Filter.eq('timeStep',inHour)).first();
  var scaleVal = ee.Feature(scaleHr).getNumber('scaleVal');
  scaleVal = ee.Number(ee.Algorithms.If(scaleVal.lt(0.1),0,scaleVal));
  return ee.Image(scaleVal);
};

var getFireConf = function(fireDict,inHour,fireNameYr) {
  
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
  var scaleValsImg = getScaleVals(scaleVals,inHour);
  
  // Fire detection confidence
  var goesEast_confidence = ee.Image(projFolder + 'GOESEast_MaxConf/' + fireNameYr);
  var goesWest_confidence = ee.Image(projFolder + 'GOESWest_MaxConf/' + fireNameYr);
  
  var goesEast_max_confidence = goesEast_confidence.select(findBandNames(inHour))
    .divide(scaleValsImg).reduce(ee.Reducer.max());
  var goesWest_max_confidence = goesWest_confidence.select(findBandNames(inHour))
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


var getFireConfHr = function(fireDict,inHour,fireNameYr) {
  var stTime = fireDict.start;
  var endTime = stTime.advance(inHour,'hour');
  var stRetroTime = endTime.advance(-1,'hour');
  
  var smoothed_confidence = getFireConf(fireDict,inHour,fireNameYr);
  
  return smoothed_confidence;
};

var getFireStatsHr = function(fireDict,inHour,inFireLine) {
  
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
  
  var stTime = fireDict.start;
  var endTime = stTime.advance(inHour,'hour');
  var stRetroTime = endTime.advance(-1,'hour');
  
  var goesEast_data = GOESEast_col.filterDate(stRetroTime,endTime);
  var goesWest_data = GOESWest_col.filterDate(stRetroTime,endTime);
  
  var blankBands_goesEast = GOESEast_col.first()
    .select(['Power']).multiply(0).selfMask().toFloat();
  var blankBands_goesWest = GOESWest_col.first()
    .select(['Power']).multiply(0).selfMask().toFloat();
  
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

  var goesEast_frp = ee.Image(ee.Algorithms.If(goesEast_data.size().gt(0),
    goesEast_data.select('Power').mean().toFloat(),blankBands_goesEast))
    .displace(goesEast_displace.multiply(parallaxAdj_val),'nearest_neighbor');
  var goesWest_frp = ee.Image(ee.Algorithms.If(goesWest_data.size().gt(0),
    goesWest_data.select('Power').mean().toFloat(),blankBands_goesWest))
    .displace(goesWest_displace.multiply(parallaxAdj_val),'nearest_neighbor');
  
  var combined_frp = ee.ImageCollection([
    goesEast_frp, goesWest_frp,
  ]).mean();
  
  var frp = {
    'E': goesEast_frp,
    'W': goesWest_frp,
    'C': combined_frp
  };

  var input_frp = frp[satMode];
    
  var goes_stats = input_frp.select('Power').rename('FRP')
    .reduceRegions({
      collection: inFireLine,
      reducer: ee.Reducer.mean().setOutputs(['FRP']),
      crs: 'EPSG:4326',
      scale: 500,
    }).first();
  
  return goes_stats;
};

var getActiveFireLines = function(inFireProg,fireDict,confidence_cutoff,fireNameYr) {
  var sHour = inFireProg.aggregate_min('timeStep');
  var eHour = inFireProg.aggregate_max('timeStep');

  var activeFireLines = ee.List.sequence(sHour,eHour,1).map(function(timeStep) {
    var activeFireConf = getFireConfHr(fireDict,timeStep,fireNameYr);
    var fireProgTS = inFireProg.filter(ee.Filter.eq('timeStep',timeStep)).first();
    var geom = ee.Geometry(fireProgTS.geometry());

    var geomLines = ee.FeatureCollection(ee.List(geom.coordinates()).map(function(iPoly) {
      var geomPart = ee.Geometry.LineString(ee.List(iPoly).flatten());
      return ee.Feature(geomPart);
    })).union().geometry();
   
    geomLines = ee.FeatureCollection(geomLines)
      .union().geometry();
      
    var geomLinesBuffer = geomLines.buffer(100);
    var activeFireConfBuf = activeFireConf.clip(geomLinesBuffer);
    
    var activeFireLineBuf = activeFireConfBuf.gt(confidence_cutoff)
      .selfMask().reduceToVectors({crs:'EPSG:4326',scale:100});
    
    var activeFireLine = ee.Feature(geomLines.intersection(activeFireLineBuf,100));
    
    activeFireLine = activeFireLine
      .set('timeStep',timeStep)
      .set('length_km',roundNum(activeFireLine.length().divide(1e3),3))
      .set('perim_km',roundNum(geom.perimeter().divide(1e3),3));
      
    if (exportFRP) {
      var activeFireStats = getFireStatsHr(fireDict,timeStep,activeFireLine);
      activeFireLine = activeFireLine
        .set('FRP',activeFireStats.getNumber('FRP'));
    }
    
    return activeFireLine;
  });
  
  return ee.FeatureCollection(activeFireLines);
};

for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
  var fireName = inFiresList[fireIdx][0]; 
  var year = inFiresList[fireIdx][1];

  var fireNameYr = fireName.split(' ').join('_') + '_' + year;
  
  // Fire Parameters
  var fireParamsYrList = fireParamsList[year];
  var fireDict = fireParamsYrList[fireName];

  for (var iCutoff = 0; iCutoff < confidence_cutoffs.length; iCutoff++) {
    var confidence_cutoff = confidence_cutoffs[iCutoff];
    var inFireProg = ee.FeatureCollection(projFolder + 'GOFER' + 
      satMode + '_fireProg/' + fireNameYr + '_fireProg');
  
    var activeFireLines = getActiveFireLines(inFireProg,fireDict,
      confidence_cutoff,fireNameYr);
    var activeFireLines_filtered = activeFireLines.filter(ee.Filter.gt('length_km',0));

    var outputFolder = 'ee_cfireLine_chunks';
    
    var outputName = fireNameYr + '_fireLine_c' + Math.round(confidence_cutoff*100);

    if (!exportFRP) {
      Export.table.toDrive({
        collection: activeFireLines_filtered,
        description: outputName,
        fileFormat: 'SHP',
        folder: outputFolder
      });
    }
    
    if (exportFRP) {
      outputFolder = 'ee_cfireLineFRP_chunks';
      
      Export.table.toDrive({
        collection: activeFireLines_filtered,
        description: outputName,
        folder: outputFolder,
        selectors: ['timeStep','length_km','perim_km','FRP']
      });
    }
  }
}
