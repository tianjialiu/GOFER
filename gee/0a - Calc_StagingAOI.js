/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var nlcd = ee.ImageCollection("USGS/NLCD_RELEASES/2019_REL/NLCD"),
    mtbs = ee.FeatureCollection("projects/GlobalFires/MTBS/MTBS_Perims");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// =======================================
// Calc_StagingAOI.js
// ---------------------------------------
// finalize metadata (AOI, start/end time)
// for a given large fire
// ---------------------------------------
// @author: Tianjia Liu (tliu@ucar.edu)
// =======================================

var fireDict = {
  // CalFIRE: https://www.fire.ca.gov/incidents/2019/10/23/kincade-fire/
  state: 'CA',
  official: 77758,
  ignition: ee.Geometry.Point([-122.780053,38.792458]), 
  AOI: ee.Geometry.Rectangle([-122.96,38.50,-122.59,38.87]),
  stDate: 'October 23, 2019 9:27 PM', // CalFIRE
  start: ee.Date.parse('Y-MM-dd HH','2019-10-24 04'), 
  end: ee.Date.parse('Y-MM-dd HH','2019-10-30 20'),
  nHour: 160,
  nDay: 7,
  MTBS: ['CA3879612276720191023'],
  FRAP: [20993]
};

var goesEast_no = '16';
var goesWest_no = '17';

// input local time and print the UTC time
var inDate = '2019-10-23 21';
print(ee.Date.parse('Y-MM-dd HH',inDate,'America/Los_Angeles')
  .format('Y-MM-dd HH','UTC'));
  
var zoom = 10;

var goesEast_col = ee.ImageCollection('NOAA/GOES/' + goesEast_no + '/FDCF');
var goesWest_col = ee.ImageCollection('NOAA/GOES/' + goesWest_no + '/FDCF');

print(fireDict.start.advance(fireDict.nHour,'hour'));
print(fireDict.end.difference(fireDict.start,'day'));
print(fireDict.end.difference(fireDict.start,'hour'));

if (fireDict.MTBS) {
  Map.addLayer(mtbs.filter(ee.Filter.inList('Fire_ID',fireDict.MTBS)),{},'MTBS');
}

var fireInfo = require('users/tl2581/USCanadaFires:FireDashboard/largeFiresInfo.js');
var timeZoneList = fireInfo.timeZoneList;

var UTCtoLT = function(date,tz) {
  return ee.Date(ee.Date(date,'UTC')).format('Y-MM-dd HH:mm',tz);
};

var localStartTime = UTCtoLT(fireDict.start,timeZoneList[fireDict.state]).getInfo();

var today = new Date();
var fire_confidence_palette = ['white', 'yellow', 'orange', 'red', 'purple'];

var getFireConf = function(fireDict,endTime) {
  
 // Satellite data
  var goesEast_data = goesEast_col
    .filterDate(fireDict.start,endTime).select('Mask');
    
  var goesWest_data = goesWest_col
    .filterDate(fireDict.start,endTime).select('Mask');
  
  // Conversion from mask codes to confidence values
  var confidence_codes_to_values = function(confidence) {
    return confidence.expression(
    '(conf==1.0) + (conf==2.0)*0.9 + (conf==3.0)*0.8 + (conf==4.0)*0.5 + (conf==5.0)*0.3 + (conf==6.0)*0.1',
      {conf: confidence});
  };
  
  var setPixCount = function(image) {
    var pixels = image.lte(35).rename('pixels')
      .reduceRegion({
        geometry: fireDict.AOI,
        reducer: ee.Reducer.sum().unweighted()
      }).getNumber('pixels');
    
    if (fireDict.minPix !== undefined) {
      var hrDiff = ee.Date(image.get('system:time_start'))
        .difference(fireDict.start,'hour').round();
      image = image.set('hrOffset',hrDiff);
    }
    
    return image.set('pixels',pixels);
  };

  var getGOESconf = function(goes_data) {
    var goes_confidence = goes_data
      .map(setPixCount).filter(ee.Filter.gt('pixels',0));

    if (fireDict.minPix !== undefined) {
      goes_confidence = goes_confidence.filter(ee.Filter.lt('hrOffset',24))
        .merge(goes_confidence.filter(ee.Filter.gte('hrOffset',24))
          .filter(ee.Filter.gt('pixels',fireDict.minPix)));
    }
    
    var nImg = goes_confidence.size();
    
    return ee.Image(ee.Algorithms.If(nImg.gt(0),
      goes_confidence
        .map(function(image) {
          return image.updateMask(image.lte(35))
          .mod(10).add(1).toInt();
        }).min().unmask(0),
      ee.Image(0))).rename('confidence');
  };

  var goesEast_max_confidence = confidence_codes_to_values(getGOESconf(goesEast_data));
  var goesWest_max_confidence = confidence_codes_to_values(getGOESconf(goesWest_data));
  
  var combined_confidence = ee.ImageCollection([
    goesEast_max_confidence,
    goesWest_max_confidence,
  ]).mean();

  var kernel = ee.Kernel.square(2000, 'meters', true);
  var smoothed_confidence = combined_confidence.clip(fireDict.AOI)
    .reduceNeighborhood({
      'reducer': ee.Reducer.mean(),
      'kernel': kernel,
      'optimization': 'boxcar'
    });

  return smoothed_confidence;
};

var getFirePerim = function(smoothed_confidence,confidence_cutoff) {
  var high_confidence = smoothed_confidence.gt(confidence_cutoff);

  var affected_areas = high_confidence
    .reduceToVectors({
      scale: 100, 
      maxPixels: 1e10,
      geometry: fireDict.AOI,
      tileScale: 8,
      bestEffort: true
    }).filter(ee.Filter.eq('label', 1));

  return affected_areas;
};

var getFirePerimImg = function(affected_areas, width) {
  var smooth = function(feature) {
    var max_error_meters = 200;
    return ee.Feature(feature).simplify(max_error_meters);
  };
  
  var affected_areas_smoothed = ee.FeatureCollection(affected_areas)
    .map(smooth);
  var affected_areas_smoothed_outline = ee.Image().int()
    .paint({featureCollection: affected_areas_smoothed, width: width});
    
  return affected_areas_smoothed_outline;
};

// Land cover, NLCD
var landcover = nlcd.filter(ee.Filter.calendarRange(2019,2019,'year'))
  .first().select('landcover');
var nlcdProj = nlcd.first().projection();

var lc_labels = ['Water','Snow/Ice','Developed','Barren','Forest','Shrub','Grassland','Cropland','Wetlands'];
var lc_palette = ['#466b9f','#d1def8','#000000','#b3ac9f','#68ab5f',
  '#ccb879','#dfdfc2','#ab6c28','#b8d9eb'];

var landcover = landcover.expression(
  '(lc==11) + (lc==12)*2 + (lc>=21 & lc<=24)*3 + (lc==31)*4' +
  '+ (lc>=41 & lc<=43)*5 + (lc==52)*6 + (lc==71)*7' +
  '+ (lc>=81 & lc<=82)*8 + (lc>=90 & lc<=95)*9',
    {lc: landcover});

// Calculate burned area within fire perimeter, in acres
var getFireArea = function(affected_areas) {
  var burn_lc = landcover.expression('(lc >= 5 & lc <= 7)', {lc: landcover}).selfMask();
  
  return burn_lc.rename('area').reduceRegion({
      reducer: ee.Reducer.count().unweighted(),
      geometry: affected_areas.geometry(),
      crs: nlcdProj,
      scale: nlcdProj.nominalScale(),
      tileScale: 16,
      bestEffort: true
     }).getNumber('area')
      .multiply(30*30*0.000247105).round(); 
};

// Charts
var getFireProgression = function(fireDict) {
  var nHour = ee.Date(fireDict.end).difference(fireDict.start,'hour').floor();
  
  var fireAreaByHour = ee.List.sequence(1,nHour,fireDict.timeInterval)
    .map(function(iStep) {
      var stTime = fireDict.start;
      var endTime = stTime.advance(iStep,'hour');
  
      var smoothed_confidence = getFireConf(fireDict,endTime);
      var affected_areas99 = getFirePerim(smoothed_confidence,0.99);
      var affected_areas90 = getFirePerim(smoothed_confidence,0.9);
      var affected_areas75 = getFirePerim(smoothed_confidence,0.75);
    
      return ee.Feature(affected_areas90.geometry(), {
          timeStep: iStep,
          Area75: getFireArea(affected_areas75),
          Area90: getFireArea(affected_areas90),
          Area99: getFireArea(affected_areas99),
        });
    });
  
  return ee.FeatureCollection(fireAreaByHour);
};

var chartFireProgression = function(fireDict,fireAreaByHour,localStartTime) {
  var fireProgression = ui.Chart.feature.byFeature({
    features: fireAreaByHour,
    xProperty: 'timeStep',
    yProperties: ['Area99','Area90','Area75']
  }).setSeriesNames(['>99%','>90%','>75%'])
    .setOptions({
      title: 'Fire Progression (' + fireDict.timeInterval + 'h intervals)',
      titleTextStyle: {fontSize: '15'},
    vAxis: {
      title: 'Burned Area (acres)',
      titleTextStyle: {fontSize: '12'},
    },
    hAxis: {
      title: 'Hours Since ' + localStartTime + ' (LT)',
      titleTextStyle: {fontSize: '12'},
    },
    series: {
      0: {color: '#D3D3D3',lineWidth: 1.5},
      1: {color: '#000000',lineWidth: 2.5},
      2: {color: '#D3D3D3',lineWidth: 1.5}
    }
  });

  return fireProgression;
};

var chartActiveFires = function(fireDict,localStartTime) {
  
  // Satellite data
  var goesEast_data = goesEast_col.select('Mask');
  var goesWest_data = goesWest_col.select('Mask');
  
  var goesEastproj = goesEast_data.first().projection();
  var goesWestproj = goesWest_data.first().projection();
  
  var getPixCount = function(goesEast,goesWest) {
    var goesEast_pixels = ee.Number(ee.Algorithms.If(
      goesEast.size().gt(0),
      goesEast.min().lte(35).rename('pixels')
      .reduceRegion({
        geometry: fireDict.AOI,
        reducer: ee.Reducer.sum().unweighted(),
        crs: goesEastproj,
        scale: goesEastproj.nominalScale(),
      }).getNumber('pixels'),0));
    
    var goesWest_pixels = ee.Number(ee.Algorithms.If(
      goesWest.size().gt(0),
      goesWest.min().lte(35).rename('pixels')
      .reduceRegion({
        geometry: fireDict.AOI,
        reducer: ee.Reducer.sum().unweighted(),
        crs: goesWestproj,
        scale: goesWestproj.nominalScale(),
      }).getNumber('pixels'),0));
      
    return ee.Feature(null,{'GOES-East':goesEast_pixels, 'GOES-West':goesWest_pixels,
      'GOES': ee.List([goesEast_pixels,goesWest_pixels]).reduce(ee.Reducer.max())
    });
  };
  
  var nHour = ee.Date(fireDict.end).difference(fireDict.start,'hour').floor();
  
  var activeFiresByHour = ee.List.sequence(1,nHour,1).map(function(iStep) {
    var stTime = ee.Date(fireDict.start)
      .advance(ee.Number(iStep).subtract(1),'hour');
    var endTime = stTime.advance(1,'hour');
    
    var goesEasthr = goesEast_data.filterDate(stTime,endTime);
    var goesWesthr = goesWest_data.filterDate(stTime,endTime);
    
    return getPixCount(goesEasthr,goesWesthr).set('timeStep',iStep);
  });

  return ui.Chart.feature.byFeature({
    features: ee.FeatureCollection(activeFiresByHour),
    xProperty: 'timeStep',
    yProperties: ['GOES-East','GOES-West']
  }).setOptions({
      title: 'Active Fire Pixels',
      titleTextStyle: {fontSize: '15'},
    vAxis: {
      title: 'Maximum Count',
      titleTextStyle: {fontSize: '12'},
    },
    hAxis: {
      title: 'Hours Since ' + localStartTime + ' (LT)',
      titleTextStyle: {fontSize: '12'},
    },
    legend: {position: 'none'},
    series: {
      0: {color: '#B03A2E', lineWidth: 1.5}
    }
  });
};

// Map layers
Map.addLayer(ee.Image().byte()
    .paint({featureCollection: fireDict.AOI, width: 3}),{palette: '#FF0000'},'AOI');
Map.centerObject(fireDict.AOI,zoom);

Map.addLayer(goesWest_col.filterDate(fireDict.start,fireDict.end)
  .select('DQF').min().eq(0).selfMask(),
  {palette: ['black']}, 'GOES-West FirePix');
Map.addLayer(goesEast_col.filterDate(fireDict.start,fireDict.end)
  .select('DQF').min().eq(0).selfMask(),
  {palette: ['gray']}, 'GOES-East FirePix');
  
var smoothed_confidence = getFireConf(fireDict,fireDict.end);
var affected_areas = getFirePerim(smoothed_confidence,0.9);
var affected_areas_smoothed_outline = getFirePerimImg(affected_areas,3);
var fireAreaByHour = getFireProgression(fireDict);
print(getFireArea(affected_areas));
Map.addLayer(affected_areas_smoothed_outline,{palette:['red']},'GOES perim');

var activeFireChart = chartActiveFires(fireDict,localStartTime);
print(activeFireChart);
