// =========================================
// GOFER_functions.js
// -----------------------------------------
// common functions used in GOFER
// -----------------------------------------
// @author Tianjia Liu (embrslab@gmail.com)
// =========================================

// satellite selection dictionary for GOES-East and GOES-West
// depending on input date, first valid year is 2019
var goesFire_IDs = ee.Dictionary({
  'GOES-East': ee.List([ee.ImageCollection('NOAA/GOES/16/FDCF'),
    ee.ImageCollection('NOAA/GOES/19/FDCF')]),
  'GOES-West': ee.List([ee.ImageCollection('NOAA/GOES/17/FDCF'),
    ee.ImageCollection('NOAA/GOES/18/FDCF')])
});

var goesBreakPts = ee.Dictionary({
  'GOES-East': ee.FeatureCollection([
      ee.Feature(null,{idx: 0, breakPt: ee.Date('2017-07-10')}),
      ee.Feature(null,{idx: 1, breakPt: ee.Date('2025-04-07')})
    ]),
  'GOES-West': ee.FeatureCollection([
      ee.Feature(null,{idx: 0, breakPt: ee.Date('2018-08-28')}),
      ee.Feature(null,{idx: 1, breakPt: ee.Date('2023-01-04')})
    ])
});

var getGOEScol = function(inDate,satName) {
  var goesBreakPt = goesBreakPts.get(satName);
    var goesDateDiff = ee.FeatureCollection(goesBreakPt)
      .map(function(breakPt) {
        var dateDiff = inDate.difference(breakPt.get('breakPt'),'day');
        return breakPt.set('dateDiff',dateDiff);
    }).filter(ee.Filter.gte('dateDiff',0));
 
  var goesIdx = ee.Number(ee.Algorithms.If(goesDateDiff.size().gt(0),
    goesDateDiff.sort('dateDiff').first().getNumber('idx'),0));
 
  var goesFire_col = ee.ImageCollection(ee.List(goesFire_IDs.get(satName))
    .get(goesIdx));
  
  return goesFire_col;
};

exports.getGOEScol = getGOEScol;
