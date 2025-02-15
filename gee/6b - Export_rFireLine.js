// =========================================
// Export_rFireLineGeom.js
// -----------------------------------------
// export GOES active fire lines
// (retrospective)
// fireProg -> rfireLine
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
var searchSens = 20; // search the next 20 distinct polygons with area increases, increase this number if job fails

// Metadata
var fireInfo = require('users/embrslab/GOFER:largeFires_metadata.js');
var projFolder = fireInfo.projFolder;
var yrList = fireInfo.yrList;
var fireYrList = fireInfo.fireYrList;
var fireParamsList = fireInfo.fireParamsList;

var roundNum = function(inputNum,digits) {
  return inputNum.multiply(Math.pow(10,digits)).round()
    .divide(Math.pow(10,digits));
};

var getNextTS = function(fireProg,timeStep) {
  var fireProg_curr = ee.Feature(fireProg.filter(ee.Filter.eq('timeStep',timeStep)).first());
  var fireProgArea_curr = roundNum(fireProg_curr.geometry().area().divide(1e6),3);
  
  var fireProg_nextAll = ee.FeatureCollection(fireProg
    .filter(ee.Filter.gt('area_acre',fireProg_curr.getNumber('area_acre')))
    .distinct('area_acre')
    .toList(searchSens,0))
    .map(function(fireProg_next) {
      var fireProg_nextPart = ee.FeatureCollection(fireProg_next.geometry().coordinates().map(function(x) {
        return ee.Feature(ee.Geometry.Polygon(x));
      })).filterBounds(fireProg_curr.geometry());
      
      var fireProgArea_next = roundNum(fireProg_nextPart.geometry().area().divide(1e6),3);
      
      return ee.Feature(fireProg_next)
        .set('areaDiff',fireProgArea_next.subtract(fireProgArea_curr));
    });
  
  var areaOfNextTS = fireProg_nextAll.filter(ee.Filter.gt('areaDiff',0))
    .first().getNumber('area_acre');
    
  return ee.Number(fireProg.filter(ee.Filter.eq('area_acre',areaOfNextTS))
    .aggregate_min('timeStep'));
};

var getActiveFireLines = function(inFireProg) {
  var sHour = ee.Number(inFireProg.aggregate_min('timeStep'));
  var eHour = ee.Number(inFireProg.aggregate_max('timeStep')).subtract(1);

  var activeFireLines = ee.List.sequence(sHour,eHour,1).map(function(timeStep) {
    timeStep = ee.Number(timeStep);
    var timeStep_next = getNextTS(inFireProg,timeStep);
    var timeStep_diff = timeStep_next.subtract(timeStep);

    var fireProg_curr = ee.Feature(inFireProg.filter(ee.Filter.eq('timeStep',timeStep)).first());
    var fireProg_next = ee.Feature(inFireProg.filter(ee.Filter.eq('timeStep',timeStep_next)).first());

    // fire state: active = 1, dormant = 0
    var fireState = ee.Algorithms.If(timeStep_diff.eq(1),1,0);
    
    // polgyon to line string at timestep t
    var fireProg_curr_line = ee.FeatureCollection(fireProg_curr.geometry().coordinates()
      .map(function(x) {return ee.Feature(ee.Geometry.MultiLineString(x))}))
      .geometry();
      
    // polygon to images at timestep t, t+1, and difference of t+1 and t
    var fireProg_currImg = ee.FeatureCollection([fireProg_curr.set('id',1)])
      .reduceToImage(['id'],'max');
    var fireProg_nextImg = ee.FeatureCollection([fireProg_next.set('id',1)])
      .reduceToImage(['id'],'max');
    var fireProg_diffImg = fireProg_nextImg.unmask(0)
      .subtract(fireProg_currImg.unmask(0)).selfMask();
    
    var bufferSens = 100;

    // image to polygon of difference of t+1 and t
    var fireProg_diffVec = fireProg_diffImg.reduceToVectors({
      geometry: fireProg_next.geometry(),
      crs:'EPSG:4326', scale:1, bestEffort:true})
        .geometry().simplify(20);
    
    // active fire line defined as the intersection of the difference of t+1 and t
    // and linear ring of the fire perimeter at timestep t
    var fline = fireProg_curr_line.intersection(fireProg_diffVec.buffer(bufferSens),10);
        
    fline = ee.FeatureCollection(fline.geometries().map(function(x) {
        return ee.Feature(ee.Geometry(x)).set('type',ee.Geometry(x).type());
      })).filter(ee.Filter.neq('type','Point'))
        .filter(ee.Filter.neq('type','MultiPoint')).geometry();
    
    // cut off the edges of each linestring that were added from the buffer
    var get_fline_cut = function(x) {
      var coords = ee.List(x);
      
      var pt1 = ee.Geometry.Point(coords.get(0));
      var pt2 = ee.Geometry.Point(coords.get(coords.size().subtract(1)));
      var coords1Buf = pt1.buffer(bufferSens);
      var coords2Buf = pt2.buffer(bufferSens);
      
      var dist_pt1_pt2 = ee.Geometry.LineString([pt1,pt2]).length();
      
      // check for linear rings, if so, don't remove the line segments within buffer regions
      return ee.Feature(ee.Algorithms.If(dist_pt1_pt2.eq(0),
        ee.Feature(ee.Geometry.LineString(x)),
        ee.Feature(ee.Geometry.LineString(x)
          .difference(coords1Buf).difference(coords2Buf))));
    };
    
    fline = ee.Geometry(ee.Algorithms.If(
      fline.coordinates().size().gt(0),
      ee.Geometry(ee.Algorithms.If(
        fline.type().equals('MultiLineString'),
        ee.FeatureCollection(fline.coordinates().map(get_fline_cut)).union().geometry(),
        get_fline_cut(fline.coordinates()).geometry())),
      fline));
      
    // fallback method, take the linestring with the largest intersected polygon
    var fireProg_diffVec2 = ee.FeatureCollection(fireProg_next.geometry().difference(fireProg_curr.geometry())
      .geometries().map(function(x) {
        return ee.Feature(ee.Geometry(x)).set('area',ee.Geometry(x).area());
      })).filter(ee.Filter.gt('area',0)).geometry();
  
    var fline2 = fireProg_curr_line
      .intersection(fireProg_diffVec2);

    fline2 = ee.FeatureCollection(fline2.geometries().map(function(x) {
        return ee.Feature(ee.Geometry(x)).set('type',ee.Geometry(x).type());
      })).filter(ee.Filter.neq('type','Point'))
        .filter(ee.Filter.neq('type','MultiPoint')).geometry();
    
    var method = 'default';
    method = ee.String(ee.Algorithms.If(fline.length().eq(0),'fallback','default'));
    
    // if length = 0, use fallback method
    fline = ee.Geometry(ee.Algorithms.If(fline.length().eq(0),fline2,fline));
    
    return ee.Feature(fline, {
        timeStep: timeStep,
        timeStep2: timeStep_next,
        length_km: roundNum(fline.length().divide(1e3),3),
        perim_km: roundNum(fireProg_curr.geometry().perimeter().divide(1e3),3),
        fstate: fireState,
        method: method
      });
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

  var inFireProg = ee.FeatureCollection(projFolder + 'GOFER' + 
      satMode + '_fireProg/' + fireNameYr + '_fireProg')
    .sort('timeStep');

  var activeFireLines = getActiveFireLines(inFireProg);

  var outputName = fireNameYr + '_fireLine';

  Export.table.toDrive({
    collection: activeFireLines,
    description: outputName,
    fileFormat: 'CSV',
    selectors: ['timeStep','timeStep2','length_km','perim_km','fstate','method'],
    folder: 'ee_rfireLine'
  });
  
  Export.table.toDrive({
    collection: activeFireLines
      .filter(ee.Filter.gt('length_km',0)),
    description: outputName,
    fileFormat: 'SHP',
    folder: 'ee_rfireLine'
  });
}
