// =========================================
// Export_FireData.js
// -----------------------------------------
// export fire metadata
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

// Metadata
var fireInfo = require('users/embrslab/GOFER:largeFires_metadata.js');
var projFolder = fireInfo.projFolder;
var yrList = fireInfo.yrList;
var fireYrList = fireInfo.fireYrList;
var fireParamsList = fireInfo.fireParamsList;

var fireInfoAll = [];
for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
  var fireName = inFiresList[fireIdx][0]; 
  var year = inFiresList[fireIdx][1];
  
  // Fire Parameters
  var fireParamsYrList = fireParamsList[year];
  var fireDict = fireParamsYrList[fireName];
  var nHour = fireDict.nHour;
  var state = fireDict.state;
  var timeZone = fireInfo.timeZoneList[state];
  var timeZoneGMT = fireInfo.timeZoneList_GMT[state];
  var ig_coords = fireDict.ignition.coordinates();
  
  var fireInfo_feat = ee.Feature(null,{
    FireName: fireName,
    Year: year,
    State: state,
    Acres: fireDict.official,
    GOES_UTC: fireDict.start.format('Y-MM-dd HH'),
    MTBS: fireDict.MTBS.join('|'),
    ICS: fireDict.ICS[0],
    Ig_Local: fireDict.stDate,
    Ig_Lon: ig_coords.get(0),
    Ig_Lat: ig_coords.get(1),
    GOES_nHour: fireDict.nHour,
    GOES_nDay: fireDict.nDay,
    kernelE: fireDict.kernels[0],
    kernelW: fireDict.kernels[1],
    kernelC: fireDict.kernels[2],
    local_tz: timeZone,
    local_tzGMT: timeZoneGMT
  });
  
  if (fireDict.DINS !== undefined) {
    fireInfo_feat = fireInfo_feat.set('DINS',fireDict.DINS.join('|'));
  }
  
  fireInfoAll[fireIdx] = fireInfo_feat;
}

fireInfoAll = ee.FeatureCollection(fireInfoAll);

Export.table.toDrive({
  collection: fireInfoAll,
  description: 'fireData',
  fileFormat: 'CSV',
  selectors: ['FireName','Year','State','Acres',
    'GOES_UTC','MTBS','ICS','Ig_Local','Ig_Lon','Ig_Lat',
    'GOES_nHour','GOES_nDay',
    'kernelE','kernelW','kernelC',
    'local_tz','local_tzGMT']
});

