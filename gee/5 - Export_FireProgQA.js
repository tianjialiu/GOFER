/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var nlcd = ee.ImageCollection("USGS/NLCD_RELEASES/2019_REL/NLCD"),
    FRAP = ee.FeatureCollection("projects/GlobalFires/FRAP/FRAP_fire22-1");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// =========================================
// Export_FireProgQA.js
// -----------------------------------------
// post-processing for fire progression
// perimeters
// fireProg_temp -> fireProg
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

// remove pieces of fire perimeter that do not belong to the fire
// according to the ground truth dataset
var removeStrayBool = false; 

// Metadata
var fireInfo = require('users/embrslab/GOFER:largeFires_metadata.js');
var projFolder = fireInfo.projFolder;
var fireParamsList = fireInfo.fireParamsList;

var roundNum = function(inputNum,digits) {
  return inputNum.multiply(Math.pow(10,digits)).round()
    .divide(Math.pow(10,digits));
};

// landcover
var landcover = nlcd.filter(ee.Filter.calendarRange(2019,2019,'year')).first()
  .select('landcover');
var nlcdProj = nlcd.first().projection();

var lc_labels = ['Water','Snow/Ice','Developed','Barren','Forest','Shrub','Grassland','Cropland','Wetlands'];
var lc_palette = ['#466b9f','#d1def8','#000000','#b3ac9f','#68ab5f',
  '#ccb879','#dfdfc2','#ab6c28','#b8d9eb'];

var landcover = landcover.expression(
  '(lc==11) + (lc==12)*2 + (lc>=21 & lc<=24)*3 + (lc==31)*4' +
  '+ (lc>=41 & lc<=43)*5 + (lc==52)*6 + (lc==71)*7' +
  '+ (lc>=81 & lc<=82)*8 + (lc>=90 & lc<=95)*9',
    {lc: landcover});
    
var burn_lc = landcover.expression('(lc >= 5 & lc <= 7)', {lc: landcover}).selfMask();

// process fire perimeters
var getGOESfireProg = function(GOESfireProg) {
  var minTS = GOESfireProg.aggregate_min('timeStep');
  var maxTS = GOESfireProg.aggregate_max('timeStep');
  
  var GOESfireProgArea = ee.List.sequence(minTS,maxTS,1).map(function(timeStep) {
    timeStep = ee.Number(timeStep);
    
    // Post-processing: ensures perimeters are always inclusive of previous perimeters
    var GOESfireTS = GOESfireProg.filter(ee.Filter.lte('timeStep',timeStep))
      .union().geometry();

    // Calculate burned area within fire perimeter, in acres
    var burnFireArea = burn_lc.rename('area').multiply(ee.Image.pixelArea())
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: GOESfireTS,
        crs: nlcdProj,
        scale: nlcdProj.nominalScale(),
        bestEffort: true
       }).getNumber('area');
    
    return ee.Feature(GOESfireTS,{
      timeStep: timeStep,
      veg_acre: roundNum(burnFireArea.multiply(0.000247105),3),
      veg_km2: roundNum(burnFireArea.multiply(1/1e6),3),
      area_acre: roundNum(GOESfireTS.area().multiply(0.000247105),3),
      area_km2: roundNum(GOESfireTS.area().multiply(1/1e6),3),
      perim_km: roundNum(GOESfireTS.perimeter().multiply(1/1e3),3)
    });
  });
  return ee.FeatureCollection(GOESfireProgArea);
};

var removeStray = function(inFireProg) {
  var geomType = inFireProg.geometry().type();
  var fireProgGeom = ee.Feature(ee.Algorithms.If(geomType.equals('MultiPolygon'),
    ee.FeatureCollection(inFireProg.geometry().coordinates().map(function(x) {
      return ee.Feature(ee.Geometry.Polygon(x));
    })).filterBounds(fireProgBounds).union().first(),
    inFireProg
  )).geometry();
  
  return ee.Feature(inFireProg).setGeometry(fireProgGeom);
};

for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
  var fireName = inFiresList[fireIdx][0]; 
  var year = inFiresList[fireIdx][1]; 
  var fireNameYr = fireName.split(' ').join('_') + '_' + year;
  
  // Fire Parameters
  var fireParamsYrList = fireParamsList[year];
  var fireDict = fireParamsYrList[fireName];

  var GOESfireProg = ee.FeatureCollection(projFolder + 'GOFER_fireProg_temp/' + fireNameYr + '_fireProg');

  if (removeStrayBool) {
    var fireProgBounds = FRAP.filter(ee.Filter.inList('OBJECTID',fireDict.FRAP)).geometry();
    
    GOESfireProg = GOESfireProg.map(removeStray)
      .filterBounds(fireProgBounds);
  }
  
  var GOESfireProgArea = getGOESfireProg(GOESfireProg);
  
  var outputName = fireName.split(' ').join('_') + '_' + year + '_fireProg';
  
  Export.table.toDrive({
    collection: GOESfireProgArea,
    description: outputName,
    fileFormat: 'SHP',
    folder: 'ee_fireProg_post'
  });
}
