// =========================================
// Export_FireConf.js
// -----------------------------------------
// export the GOES max fire dectection
// confidence to assets
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
var goes_east_no = '16';
var goes_west_no = '17';

// Metadata
var fireInfo = require('users/embrslab/GOFER:largeFires_metadata.js');
var projFolder = fireInfo.projFolder;
var yrList = fireInfo.yrList;
var fireYrList = fireInfo.fireYrList;
var fireParamsList = fireInfo.fireParamsList;

var applySmallAOI = function(image,iHour) {
  return ee.Image(ee.Algorithms.If(ee.Number(iHour).lt(aoi_smallTS),
    image.clip(aoi_small),image));
};

var getFireConf = function(fireDict,startTime,endTime,satNum,iHour) {
  
  // Satellite data
  var goes_col = ee.ImageCollection('NOAA/GOES/' + satNum + '/FDCF').select('Mask');
  var goes_data = goes_col.filterDate(startTime,endTime);
  var goes_proj = goes_col.filterDate(fireDict.start,fireDict.end)
    .first().projection();
  
  // Conversion from mask codes to confidence values
  var confidence_codes_to_values = function(confidence) {
    return confidence.expression(
    '(conf==1.0) + (conf==2.0)*1.0 + (conf==3.0)*0.8 + (conf==4.0)*0.5 + (conf==5.0)*0.3 + (conf==6.0)*0.1',
      {conf: confidence});
  };
  
  var setPixCount = function(image) {
    var pixels = image.lte(35).rename('pixels')
      .reduceRegion({
        geometry: fireDict.AOI,
        reducer: ee.Reducer.sum().unweighted()
      }).getNumber('pixels');
    
    return image.set('pixels',pixels);
  };

  var getGOESconf = function(goes_data) {
    var goes_confidence = goes_data
      .map(setPixCount).filter(ee.Filter.gt('pixels',0));
    var nImg = goes_confidence.size();
  
    return ee.Image(ee.Algorithms.If(nImg.gt(0),
      goes_confidence
        .map(function(image) {
          return image.updateMask(image.lte(35))
            .mod(10).add(1).toInt();
          }).min().unmask(0),
      ee.Image(0))).rename('confidence');
  };
  
  var goes_max_confidence = ee.Image(ee.Algorithms.If(goes_data.size().gt(0),
    confidence_codes_to_values(getGOESconf(goes_data)),
    ee.Image(0).toDouble().selfMask()
      .reproject({crs: goes_proj, scale: goes_proj.nominalScale()})
  ));
  
  if (aoi_small !== undefined) {
    goes_max_confidence = applySmallAOI(goes_max_confidence,iHour);
  }
  
  return goes_max_confidence.set('timeStep',iHour)
    .clip(fireDict.AOI)
    .reproject({crs: goes_proj, scale: goes_proj.nominalScale()});
};

var findBandNames = function(endHour) {
  return ee.List.sequence(1,endHour,1).map(function(iHour) {
    return ee.String('h_').cat(ee.Number(iHour).toInt().add(1e4));
  });
};

var getConfCol = function(fireDict,satNum) {
  return ee.ImageCollection(ee.List.sequence(1,nHour,1).map(function(iHour) {
    var stTime = fireDict.start;
    var endTime = stTime.advance(iHour,'hour');
    var stRetroTime = endTime.advance(-1,'hour');
  
    var goesConf = getFireConf(fireDict,stRetroTime,endTime,satNum,iHour);
    
    return goesConf;
  })).toBands().rename(findBandNames(nHour));
};

for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
  var fireName = inFiresList[fireIdx][0]; 
  var year = inFiresList[fireIdx][1];
  
  // Fire Parameters
  var fireParamsYrList = fireParamsList[year];
  var fireDict = fireParamsYrList[fireName];
  var nHour = fireDict.nHour;
  var aoi_small = fireDict.AOIsmall;
  var aoi_smallTS = fireDict.AOIsmallTS;
  fireDict.timeInterval = 1;
  
  var goesEast_confCol = getConfCol(fireDict,goes_east_no);
  var goesWest_confCol = getConfCol(fireDict,goes_west_no);
  
  var fireNameYr = fireName.split(' ').join('_') + '_' + year;
  
  Export.image.toAsset({
    image: goesEast_confCol,
    description: fireNameYr + '_GOESEast',
    assetId: projFolder + 'GOESEast_MaxConf/' + fireNameYr,
    region: fireDict.AOI,
    scale: 2004.017315487541,
    maxPixels: 1e12
  });
  
  Export.image.toAsset({
    image: goesWest_confCol,
    description: fireNameYr + '_GOESWest',
    assetId: projFolder + 'GOESWest_MaxConf/' + fireNameYr,
    region: fireDict.AOI,
    scale: 2004.017315487541,
    maxPixels: 1e12
  });
}
