/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var nlcd = ee.ImageCollection("USGS/NLCD_RELEASES/2019_REL/NLCD"),
    MTBS = ee.FeatureCollection("projects/GlobalFires/MTBS/MTBS_Perims");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// =======================================
// Export_ParamSens.js
// ---------------------------------------
// optimization of confidence threshold
// and parallax displacement factor
// ---------------------------------------
// @author: Tianjia Liu (tliu@ucar.edu)
// =======================================

// List of fires for optimization
var inFiresList = [
  ['Creek','2020',true],
  ['August Complex','2020',true],
  ['Bobcat','2020',true],
  ['Dolan','2020',true],
  ['LNU Lightning Complex','2020',false],
  ['North Complex','2020',true],
  ['Red Salmon Complex','2020',true],
  ['SCU Lightning Complex','2020',true],
  ['Slater and Devil','2020',true],
  ['SQF Complex','2020',true]
];

// Input modes:
// 1. 'C' (Combined, both GOES-East/West)
// 2. 'E' (East, only GOES-East),
// 3. 'W' (West, only GOES-West)
var satMode = 'C';

// Metadata
var fireInfo = require('users/tl2581/GOFER:largeFires_metadata.js');
var projFolder = fireInfo.projFolder;
var yrList = fireInfo.yrList;
var fireYrList = fireInfo.fireYrList;
var fireParamsList = fireInfo.fireParamsList;

var confidenceList = [
  0.75,0.76,0.77,0.78,0.79,0.8,0.81,0.82,0.83,0.84,
  0.85,0.86,0.87,0.88,0.89,0.9,0.91,0.92,0.93,0.94,
  0.95,0.96,0.97,0.98,0.99];

var parallaxAdjList = [0,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.4,0.45,0.5,
  0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1];
  
var findBandNames = function(eHour) {
  return ee.List.sequence(1,eHour,1).map(function(iHour) {
    return ee.String('h_').cat(ee.Number(iHour).toInt().add(1e4));
  });
};

var getFireConf = function(fireDict,eHour,fireNameYr,parallaxAdj_val) {
  
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
    .select(findBandNames(eHour)).reduce(ee.Reducer.max());
  var goesWest_max_confidence = ee.Image(projFolder + 'GOESWest_MaxConf/' + fireNameYr)
    .select(findBandNames(eHour)).reduce(ee.Reducer.max());

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
    .reduceToVectors({
      scale: 50, 
      maxPixels: 1e10,
      geometry: fireDict.AOI,
      tileScale: fireDict.tileScale,
      bestEffort: true
    }).filter(ee.Filter.eq('label', 1));

  return affected_areas;
};

// Land cover, NLCD
var landcover = nlcd.filter(ee.Filter.calendarRange(2019,2019,'year')).first()
  .select('landcover');
var nlcdProj = nlcd.first().projection();

var landcover = landcover.expression(
  '(lc==11) + (lc==12)*2 + (lc>=21 & lc<=24)*3 + (lc==31)*4' +
  '+ (lc>=41 & lc<=43)*5 + (lc==52)*6 + (lc==71)*7' +
  '+ (lc>=81 & lc<=82)*8 + (lc>=90 & lc<=95)*9',
    {lc: landcover});

// Calculate burned area within fire perimeter, in acres
var getFireArea = function(fireDict,affected_areas_smoothed) {
  var burn_lc = landcover.expression('(lc >= 5 & lc <= 7)', {lc: landcover}).selfMask();
  
  return burn_lc.rename('area').reduceRegion({
      reducer: ee.Reducer.count().unweighted(),
      geometry: affected_areas_smoothed,
      crs: nlcdProj,
      scale: nlcdProj.nominalScale(),
      tileScale: fireDict.tileScale,
      bestEffort: true
     }).getNumber('area')
      .multiply(30*30*0.000247105).round(); 
};

var getFireProgression = function(fireDict,eHour,confidence_cutoff,fireNameYr,parallaxAdj_val) {
   
  var smoothed_confidence = getFireConf(fireDict,eHour,fireNameYr,parallaxAdj_val);
  var affected_areas = getFirePerim(fireDict,smoothed_confidence,confidence_cutoff);
  
  var max_error_meters = 100;
  var affected_areas_smoothed = affected_areas.geometry().simplify(max_error_meters);

  return ee.Feature(affected_areas_smoothed, {
    Area: getFireArea(fireDict,affected_areas_smoothed),
  });
};

var getIOU = function(a,b) {
 var int_area = a.intersection(b,1e3).area();
 var union_area = a.union(b,1e3).area();
 
 return int_area.divide(union_area);
};

var removeHoles = function(geom) {
  var geom_coordinates = geom.geometry().coordinates();
  var geom_type = geom.geometry().type();
  
  var geom_noHoles = ee.Algorithms.If(ee.String(geom_type).equals('Polygon'),
    ee.Geometry.Polygon(geom.geometry().coordinates().get(0)),
    ee.Geometry.MultiPolygon(geom.geometry().coordinates().map(function(coords) {
      return ee.Geometry.Polygon(ee.List(coords).get(0));
    })));
    
  return ee.Geometry(geom_noHoles);
};

var getFireStats = function(fireDict,fireName,year,mtbs,holesBool,confidence_cutoffs,parallaxAdjList) {

  var eHour = fireDict.nHour;
  
  var fire_stats = ee.List.sequence(0,confidence_cutoffs.size().subtract(1),1).map(function(iVal) {
    var confidence_cutoff = ee.Number(ee.List(confidence_cutoffs).get(iVal));
    var parallaxAdj_val = ee.Number(ee.List(parallaxAdjList).get(iVal));
  
    var fireProg = getFireProgression(fireDict,eHour,confidence_cutoff,fireNameYr,parallaxAdj_val);
    var fireProg_geom = ee.Geometry(ee.Algorithms.If(holesBool,removeHoles(fireProg),fireProg.geometry()));
    
    var IOU = getIOU(mtbs_fire.geometry(),fireProg_geom);

    return ee.Feature(null, {
      confThresh: confidence_cutoff,
      parallaxAdjFac: parallaxAdj_val,
      IOU: IOU,
      GOESEast_kernel: fireDict.kernels[0],
      GOESWest_kernel: fireDict.kernels[1],
      Combined_kernel: fireDict.kernels[2],
      GOES_acre: fireProg.geometry().area(100).divide(4047).round(),
      GOES_veg_acre: fireProg.getNumber('Area'),
      MTBS_acre: mtbs.aggregate_sum('Acres')
    });
  });
  
  return ee.FeatureCollection(fire_stats);
};
  
for (var confIdx = 0; confIdx < confidenceList.length; confIdx++) {
  for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
    var fireName = inFiresList[fireIdx][0]; 
    var year = inFiresList[fireIdx][1]; 
    var holesBool = inFiresList[fireIdx][2]; 
    
    var confidence_cutoffs = ee.List.repeat(confidenceList[confIdx],parallaxAdjList.length);

    // Fire parameters
    var fireParamsYrList = fireParamsList[year];
    var fireDict = fireParamsYrList[fireName];
    fireDict.timeInterval = 1;
    fireDict.tileScale = 1;
    var fireNameYr = fireName.split(' ').join('_') + '_' + year;

    // MTBS
    var mtbs_fire = MTBS
      .filter(ee.Filter.inList('Fire_ID',fireDict.MTBS));

    var fireStats = getFireStats(fireDict,fireName,year,mtbs_fire,holesBool,
      confidence_cutoffs,parallaxAdjList);

    Export.table.toDrive({
      collection: fireStats,
      description: fireNameYr + '_paramSens_conf' + confidenceList[confIdx]*100,
      folder: 'ee_paramSens_chunks',
      fileFormat: 'CSV',
      selectors: ['confThresh','parallaxAdjFac',
        'GOESEast_kernel','GOESWest_kernel','Combined_kernel',
        'IOU','GOES_acre','GOES_veg_acre','MTBS_acre']
    });
  }
}
