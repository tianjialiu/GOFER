/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var nlcd = ee.ImageCollection("USGS/NLCD_RELEASES/2019_REL/NLCD"),
    MTBS_BurnSeverity = ee.ImageCollection("projects/GlobalFires/MTBS/MTBS_BurnSeverity_CONUS"),
    MTBS = ee.FeatureCollection("projects/GlobalFires/MTBS/MTBS_Perims"),
    FEDS = ee.FeatureCollection("projects/GlobalFires/GOFER/FEDS_2019_2021"),
    FRAP = ee.FeatureCollection("projects/GlobalFires/FRAP/FRAP_fire22-1");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// *****************************************************************
// =================================================================
// ----------------------- GOFER Dashboard -----------------------||
// =================================================================
// *****************************************************************
/*
// @author Tianjia Liu (embrslab@gmail.com)
// Last updated: August 8, 2024
*/
// =================================================================
// **********************   --    Code    --   *********************
// =================================================================

// Time and location of the fire
var fireInfo = require('users/tl2581/GOFER:largeFires_metadata.js');
var colPal = require('users/tl2581/packages:colorPalette.js');

var yrList = fireInfo.yrList;
var fireYrList = fireInfo.fireYrList;
var fireParamsList = fireInfo.fireParamsList;
var timeZoneList = fireInfo.timeZoneList;
var timeZoneList_GMT = fireInfo.timeZoneList_GMT;

var fire_confidence_palette = ['white', 'yellow', 'orange', 'red', 'purple'];
var burn_severity_palette = ['#006400','#7FFFD4','#FFFF00','#FF0000','#7FFF00'];
var burn_severity_labels = ['Unburned to Low','Low','Moderate','High','Increased Greenness'];
var cfline_labels = ['c = 0.05','c = 0.1', 'c = 0.25', 'c = 0.5', 'c = 0.75', 'c = 0.9'];
var cfline_palette = ['#2B83BA','#87CEEB','#9DD3A7','#EBC570','FF7F00','#D7191C'];

var goferVersionList = {
  'GOFER-Combined': 'C',
  'GOFER-East': 'E',
  'GOFER-West': 'W'
};

var UTCtoLT = function(date,tz) {
  return ee.Date(ee.Date(date,'UTC')).format('MMM d, Y HH',tz);
};

var calcIOU = function(x,y) {
  return x.intersection(y).area().divide(x.union(y).area());
};

// Land cover, NLCD
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

var indexJoin = function(collectionA, collectionB, propertyName) {
  var joined = ee.ImageCollection(ee.Join.saveFirst(propertyName).apply({
    primary: collectionA,
    secondary: collectionB,
    condition: ee.Filter.equals({
      leftField: 'system:index',
      rightField: 'system:index'})
  }));

  return joined.map(function(image) {
    return image.addBands(ee.Image(image.get(propertyName)));
  });
};

var NBRwithCloudsMasked = function(image) {
  var cloudProb = image.select('probability');
  var isCloud = cloudProb.gt(65);
  return image.normalizedDifference(['B8','B12']).rename('NBR')
    .updateMask(isCloud.not())
    .copyProperties(image,['system:time_start']);
};

var getBurnSeverity = function(fireDict,year) {
  
  var MTBS_perim = MTBS.filter(ee.Filter.inList('Fire_ID',fireDict.MTBS))
    .geometry();
  
  var burnSeverity = MTBS_BurnSeverity
    .filter(ee.Filter.calendarRange(ee.Number.parse(year),ee.Number.parse(year),'year'))
    .first().clip(MTBS_perim);
  
  return burnSeverity.updateMask(burnSeverity.lt(6)).selfMask();
};


// Charts
var chartFireGrowthCumul = function(fireProg,localStartTime) {
  
  return ui.Chart.feature.byFeature({
    features: fireProg,
    xProperty: 'timeStep',
    yProperties: ['area_km2'],
  }).setOptions({
      title: 'Cumulative Fire-Wide Area',
      titleTextStyle: {fontSize: '15'},
    vAxis: {
      title: 'Area (sq. km)',
      titleTextStyle: {fontSize: '12'},
    },
    hAxis: {
      title: 'Hours Since ' + localStartTime + 'h (LT)',
      titleTextStyle: {fontSize: '12'},
    },
    series: {
      0: {color: '#000000',lineWidth: 1.5},
    },
    legend: {
      position: 'none'
    }
  });
};

var chartFireGrowth = function(fireProgStats,localStartTime) {
  
  return ui.Chart.feature.byFeature({
    features: fireProgStats,
    xProperty: 'timeStep',
    yProperties: ['dArea_km2'],
  }).setOptions({
      title: 'Growth in Fire-Wide Area',
      titleTextStyle: {fontSize: '15'},
    vAxis: {
      title: 'Area (sq. km)',
      titleTextStyle: {fontSize: '12'},
    },
    hAxis: {
      title: 'Hours Since ' + localStartTime + 'h (LT)',
      titleTextStyle: {fontSize: '12'},
    },
    series: {
      0: {color: '#000000',lineWidth: 1.5},
    },
    legend: {
      position: 'none'
    }
  });
};
  
var chartFireLine = function(fireLine,localStartTime) {
  
  return ui.Chart.feature.byFeature({
    features: fireLine,
    xProperty: 'timeStep',
    yProperties: ['length_km'],
  }).setOptions({
      title: 'Active Fire Line Length',
      titleTextStyle: {fontSize: '15'},
    vAxis: {
      title: 'Fire Line Length (km)',
      titleTextStyle: {fontSize: '12'},
    },
    hAxis: {
      title: 'Hours Since ' + localStartTime + 'h (LT)',
      titleTextStyle: {fontSize: '12'},
    },
    series: {
      0: {color: '#000000',lineWidth: 1.5},
    },
    legend: {
      position: 'none'
    }
  });
};

var chartFireSpread = function(fireLine,localStartTime) {
  
  return ui.Chart.feature.byFeature({
    features: fireLine,
    xProperty: 'timeStep',
    yProperties: ['mae_spread_kmh','awe_spread_kmh'],
  }).setSeriesNames(['MAE','AWE']).setOptions({
      title: 'Fire Spread',
      titleTextStyle: {fontSize: '15'},
    vAxis: {
      title: 'Fire Spread (km/h)',
      titleTextStyle: {fontSize: '12'},
    },
    hAxis: {
      title: 'Hours Since Ignition',
      titleTextStyle: {fontSize: '12'},
    },
    series: {
      0: {color: '#000000',lineWidth: 1.5},
      1: {color: '#FF0000',lineWidth: 1.5},
    },
  });
};

// Legends
var getLayerCheckSimple = function(map, label, value, layerPos) {
  var checkLayer = ui.Checkbox({label: label, value: value,  
    style: {fontWeight: 'bold', fontSize: '15px', margin: '5px 3px 0px 8px'}});
  
  checkLayer.onChange(function(checked) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setShown(checked);
  });
  
  return ui.Panel([checkLayer],ui.Panel.Layout.flow('horizontal'));
};

var getLayerCheckSimpleSecondary = function(map, label, value, layerPos) {
  var checkLayer = ui.Checkbox({label: label, value: value,  
    style: {fontSize: '13.5px', margin: '0px 3px 0px 8px'}});
  
  checkLayer.onChange(function(checked) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setShown(checked);
  });
  
  return ui.Panel([checkLayer],ui.Panel.Layout.flow('horizontal'));
};

var getLegendContinuous = function(minVal, maxVal, colPal) {
  
  var vis = {min: minVal, max: maxVal, palette: colPal};

  var makeColorBarParams = function(palette) {
    return {
      bbox: [0, 0, 1, 0.1],
      dimensions: '120x10',
      format: 'png',
      min: 0,
      max: 1,
      opacity: 0.8,
      palette: palette,
    };
  };

  var colorBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(vis.palette),
    style: {stretch: 'horizontal', margin: '3px 8px 0px 8px', height: '18px'},
  });

  var legendLabels = ui.Panel({
    widgets: [
      ui.Label(vis.min, {margin: '4px 8px'}),
      ui.Label('',
        {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
      ui.Label(vis.max, {margin: '4px 8px'}),
      ],
    layout: ui.Panel.Layout.flow('horizontal')
  });

  var legendPanel = ui.Panel({
    widgets: [colorBar, legendLabels],
    style: {
      margin: '2px 0px 0px 0px',
    }});
  
  return legendPanel;
};

var getLegendFootnote = function(label) {
  return ui.Label(label, {
    margin: '1px 2px 3px 8px',
    fontSize: '10px',
    color: '#777'
  });
};

var getLegendDiscrete = function(labels, colPal, footnote) {

  var legendPanel = ui.Panel({
    style: {
      padding: '8px 8px 0 0',
      position: 'bottom-left',
      width: '200px',
      maxHeight: '80%',
      margin: '0'
    }
  });
  
  var makeRow = function(colPal, labels) {
    var colorBox = ui.Label({
      style: {
        padding: '10px',
        margin: '0px 0 4px 8px',
        fontSize: '11px',
        backgroundColor: colPal,
      }
    });

    var description = ui.Label({value: labels, style: {margin: '2px 1px 4px 6px', fontSize: '12.5px'}});
    return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
  };
  
  for (var i = 0; i < labels.length; i++) {
    legendPanel.add(makeRow(colPal[i], labels[i]));
  }
  
  if (footnote) {
    var legendFootnote = ui.Label(footnote, {
      margin: '1px 2px 2px 8px',
      fontSize: '10px',
      color: '#777'
    });
    legendPanel.add(legendFootnote);
  }

  return legendPanel;
};

var getInfoPanel = function(map,fireDict,fireName,fireInfo) {
  var infoPanel = ui.Panel(
    {style: {width: '200px'},
  });

  infoPanel.add(ui.Label('Fire Information',
    {fontSize:'18px',fontWeight:'bold',margin: '8px 0 0 0'}));
  
  infoPanel.add(ui.Label('This app shows the hourly wildfire progression derived from GOES-East and GOES-West geostationary active fire detections. The three versions of GOFER are GOFER-East, GOFER-West, and GOFER-Combined, which are derived from only GOES-East, only GOES-West, or both GOES satellites, respectively. Once a fire is loaded, drag the left-hand bar to reveal another map showing a timeslice of the fire perimeter and active fire lines. Use the text box to change the timestep or click on a point in the active fire line chart to move to a specific timestep. Note that layers may take a few seconds to load.',
    {fontSize:'12.5px', margin:'0', padding:'5px 12px 0 0'}));
  
  var fireInfoTable = ui.Panel({
    widgets: [ui.Chart.feature.byFeature(fireInfo,
      'Source', ['Area','IoU']
    ).setSeriesNames(['Area (sq. km)','IoU'])
      .setChartType('Table')],
    style: {margin: '0 8px 0 -8px'}
  });
    
  var fireInfoTableFootnote = ui.Label('Spatial accuracy, expressed as the Intersection-over-Union (IoU), of the final GOFER (GOES) and FEDS (VIIRS) perimeters compared to the FRAP perimeter. Note that FEDS IoU is abnormally low for cross-border fires as those perimeters are not fully mapped.', {
      margin: '0px 8px 3px 0px',
      padding: '0 8px 0 0',
      fontSize: '10px',
      color: '#777'
    });
    
  var legendPanel = ui.Panel({
    widgets: [
      getLayerCheckSimple(map, 'GOFER Fire Progression', true, 3),
      getLayerCheckSimpleSecondary(map, 'Perimeter Outlines', true, 4),
      getLayerCheckSimple(map, 'FEDS Fire Progression', false, 5),
      getLayerCheckSimpleSecondary(map, 'Perimeter Outlines', false, 6),
      getLegendContinuous(0,'95%',colPal.SpectralFancy),
      getLegendFootnote('Hourly GOES (GOFER) and 12-hourly VIIRS (FEDSv2)-derived fire progression perimeters, colored by hours after ignition, expressed as the % of hours elapsed at 95% of total area'),
      getLayerCheckSimple(map, 'FRAP Perimeter', false, 0),
      getLegendFootnote('Final perimeter mapped by California\'s Fire and Resource Assessment Program (FRAP)'),
      getLayerCheckSimple(map, 'Land Cover', false, 1),
      getLegendDiscrete(lc_labels,lc_palette,
        'Data: USGS National Land Cover Database (30-m)'),
      getLayerCheckSimple(map, 'Burn Severity', false, 2),
      getLegendDiscrete(burn_severity_labels,burn_severity_palette,
        'Data: Landsat-derived burn severity mosaic (30-m) from Monitoring Trends in Burn Severity (MTBS)')
    ],
    style: {margin: '0 8px 0 -8px'}
  });
  
  infoPanel.add(fireInfoTable);
  infoPanel.add(fireInfoTableFootnote);
  infoPanel.add(ui.Label('Legend',
    {fontSize:'18px',fontWeight:'bold',margin: '6px 0 2px 0'}));
  infoPanel.add(legendPanel);

  return infoPanel;
};

var getInfoPanelSlice = function(map) {
  var infoPanel = ui.Panel({
    style: {position:'bottom-left',padding: '0'}
  });
    
  var legendPanel = ui.Panel({
    widgets: [
      getLayerCheckSimple(map, 'GOFER Fire Progression', true, 0),
      getLayerCheckSimpleSecondary(map, 'Perimeter Outlines', true, 1),
      getLayerCheckSimple(map, 'Retrospective Active Fire Line', true, 2),
      getLayerCheckSimple(map, 'Concurrent Active Fire Line', false, 3),
      getLegendDiscrete(cfline_labels,cfline_palette),
      getLegendFootnote('Dormant concurrent active fire lines are not shown on the map. In the chart below, IsActive = 0 is dormant and IsActive = 1 is active.')
    ],
    style: {margin: '0 8px 0 -8px'}
  });
  
  infoPanel.add(ui.Label('Legend',
    {fontSize:'18px',fontWeight:'bold',margin: '8px 0 2px 0'}));
  infoPanel.add(legendPanel);

  return infoPanel;
};

// App UI elements
ui.root.clear();

var Map1 = ui.Map().setOptions('TERRAIN');
var Map2 = ui.Map().setOptions('TERRAIN');

var controlPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
});

var infoWrapper = ui.Panel(
  {style: {width: '210px', position: 'bottom-right'}
});

var mapPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
});

var map_panels = ui.SplitPanel({
  firstPanel: ui.Panel({widgets: [Map2], style: {width: '0%'}}),
  secondPanel: ui.Panel({widgets: [Map1], style: {Width: '100%'}}),
});

var mapGrid = ui.Panel([map_panels],
  ui.Panel.Layout.Flow('horizontal'), {stretch: 'both'}
);
  
var mainTitle = ui.Label('GOFER Product Visualization',
  {stretch: 'horizontal', textAlign: 'left', fontWeight: 'bold',
    fontSize: '24px', backgroundColor:'FFFFFF', margin: '6px 8px 3px 15px'});
var subTitle = ui.Label('GOFER: GOES-Observed Fire Event Representation',
  {textAlign: 'left',
    fontSize: '16px', color: '#777', margin: '0 18px 6px 15px'});
    
var dataLabel = ui.Label('[Data]', {textAlign: 'left', margin: '3px 5px 3px 0px', fontSize: '12.5px', color: '#5886E8'}, 'https://doi.org/10.5281/zenodo.8327264');
var codeLabel = ui.Label('[Code]', {textAlign: 'left', margin: '3px 5px 3px 3px', fontSize: '12.5px', color: '#5886E8'}, 'https://github.com/tianjialiu/GOFER');
var paperLabel = ui.Label('[Paper]', {textAlign: 'left', margin: '3px 5px 3px 3px', fontSize: '12.5px', color: '#5886E8'}, 'https://doi.org/10.5194/essd-16-1395-2024');

var subTitlelinks = ui.Panel([
  subTitle,
  ui.Panel([dataLabel, codeLabel,paperLabel], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'})
],ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});

// default app configuration
var fireName = 'Creek';
var year = '2020';
var goferVersionName = 'GOFER-Combined';

var fireYrSelect = ui.Select({
  items: yrList,
  value: year,
  onChange: function(year) {
    displaySummaryMap(year);
    fireSelectPanel.remove(fireSelectPanel.widgets().get(3));
    
    var fireSelect = ui.Select({
      items: fireYrList[year],
      placeholder: fireYrList[year][0],
      value: fireYrList[year][0],
      style: {
        margin: '8px 15px 8px 8px' 
      }
    });
    
    fireSelectPanel.insert(3,fireSelect);
  },
  style: {
    margin: '8px 15px 8px 8px' 
  }
});

var fireSelect = ui.Select({
  items: fireYrList[year],
  placeholder: 'Creek',
  value: 'Creek',
  style: {
    margin: '8px 15px 8px 8px' 
  }
});

var versionSelect = ui.Select({
  items: ['GOFER-Combined','GOFER-East','GOFER-West'],
  placeholder: 'GOFER-Combined',
  value: 'GOFER-Combined',
  style: {
    margin: '8px 15px 8px 8px' 
  }
});

var yearSelectInfo = ui.Label('Year: ',
  {margin: '14px 0px 8px 16px', color: '#999'});
var fireSelectInfo = ui.Label('Fire Name: ',
  {margin: '14px 0px 8px 0px', color: '#999'});
var versionSelectInfo = ui.Label('GOFER Version: ',
  {margin: '14px 0px 8px 0px', color: '#999'});
var goButton = ui.Button({label: 'Go!',  style: {stretch: 'horizontal'}});

var fireSelectPanel = ui.Panel([yearSelectInfo,fireYrSelect,
  fireSelectInfo,fireSelect,versionSelectInfo,versionSelect,goButton],
  ui.Panel.Layout.Flow('horizontal'));
  
var mainPanel = ui.Panel([
  ui.Panel([mainTitle,subTitlelinks],
    ui.Panel.Layout.Flow('vertical'),{stretch:'horizontal'}),fireSelectPanel],
  ui.Panel.Layout.Flow('horizontal'),
  {stretch: 'horizontal'});

ui.root.onResize(function(deviceInfo) {
  if (deviceInfo.is_desktop & deviceInfo.width > 900) {
    mainPanel.setLayout(ui.Panel.Layout.Flow('horizontal'));
    fireSelectPanel.style().set({margin: '0'});
  } else {
    mainPanel.setLayout(ui.Panel.Layout.Flow('vertical'));
    fireSelectPanel.style().set({margin: '-8px 0 0 0'});
  }
});
  
ui.root.widgets().reset([mainPanel]);

var displaySummaryMap = function(year) {
  ui.root.clear(); ui.root.add(mainPanel);
  var Map1 = ui.Map().setOptions('TERRAIN');
  Map1.setControlVisibility({mapTypeControl: false, layerList: false});
  Map1.style().set({cursor:'crosshair'});
  
  ui.root.add(Map1);
  ui.root.setLayout(ui.Panel.Layout.Flow('vertical'));
  
  var fireParamsYrList = fireParamsList[year];

  var availFires = ee.Dictionary(fireParamsYrList).keys().map(function(fireName) {
    var inFireInfo = ee.Dictionary(ee.Dictionary(fireParamsYrList).get(fireName));
    return ee.Feature(null, {
      'Fire Name': fireName,
      'State': inFireInfo.get('state'),
      'Acres': inFireInfo.get('official'),
    }).setGeometry(ee.Geometry(inFireInfo.get('ignition'))
        .buffer((ee.Number(inFireInfo.get('official')).multiply(4046.86/Math.PI)).sqrt()));
  });

  availFires = ee.FeatureCollection(availFires);
  var availFiresTable = ui.Chart.feature.byFeature(ee.FeatureCollection(availFires),
      'Fire Name', ['State','Acres']
    ).setChartType('Table');
  
  availFiresTable.onClick(function(clicked) {
      Map1.centerObject(availFires.filter(ee.Filter.eq('Fire Name',clicked)),13);
    });
  
  var availFiresLabel = ui.Label('Select a fire from the dropdown menu in the top-right corner and click \'Go!\' to activate the dashboard. The table below lists the fires currently available in this tool. When clicking on the table, the map will zoom in to that particular fire (depicted as a buffer zone equal to the burned area).',
    {fontSize: '13px',margin: '8px 8px 3px 8px'});
  
  Map1.addLayer(ee.Image().byte().paint(availFires, 0).paint(availFires, 1, 1),
      {palette:['red','black'], max: 1, opacity: 0.5});
  Map1.centerObject(availFires);
  
  var calloutBox = ui.Textbox();
  var calloutPanel = ui.Panel({
    widgets: [
      ui.Label('On the map, click on the fire\'s buffer zone to print the name of the fire:',
        {fontSize: '13px',
          margin: '8px 8px 0 8px'}),
      calloutBox
    ],
    style: {
      width: '160px',
      padding: '0',
      position: 'bottom-right',
    }
  });
  
  Map1.add(calloutPanel);
    
  Map1.onClick(function(coords) {
    var clickBuffer = ee.Geometry.Point([coords.lon,coords.lat]);
    var filteredFires = availFires.filterBounds(clickBuffer);
    var closestFire = ee.Algorithms.If(filteredFires.size().gt(0),
      filteredFires.first().getString('Fire Name'),'');
    calloutBox.setValue(closestFire.getInfo());
  });
  
  var availFiresPanel = ui.Panel({
    widgets: [
      availFiresLabel,
      availFiresTable
    ],
    style: {
      width: '345px',
      padding: '0',
      position: 'bottom-left',
      maxHeight: '80%'
    }
  });
  
  var availFiresWrapper = ui.Panel({
    style: {
      width: '345px',
      padding: '0',
      position: 'bottom-left',
      maxHeight: '80%'
    }
  });
  
  var hideIntroMode = true;
  var hideShowIntroButton = ui.Button({
    label: 'Hide Charts',
    onClick: function() {
      hideIntroMode = !hideIntroMode;
      hideShowIntroButton.setLabel(hideIntroMode ? 'Hide Info': 'Show Info');
      if (!hideIntroMode) {
        availFiresWrapper.style().set({width: '85px', height: '45px'});
      } else {
        availFiresWrapper.style().set({width: '345px', height: 'auto'});
      }
    },
      style: {padding: '0', margin: '8px 0 0 8px'}
  });
  
  Map1.add(availFiresWrapper.add(hideShowIntroButton).add(availFiresPanel));
  
  ui.root.onResize(function(deviceInfo) {
    if (deviceInfo.is_desktop & deviceInfo.width > 900) {
      availFiresWrapper.style().set({width: '345px', height: 'auto'});
      hideShowIntroButton.setLabel('Hide Info');
      hideIntroMode = true;
    } else {
      availFiresWrapper.style().set({width: '85px', height: '45px'});
      hideShowIntroButton.setLabel('Show Info');
      hideIntroMode = false;
    }
  });
};

displaySummaryMap(year);

goButton.onClick(function() {
  ui.root.clear();
  ui.root.widgets().reset([mainPanel]);
  
  fireSelect = fireSelectPanel.widgets().get(3);
  
  var year = fireYrSelect.getValue();
  var fireName = fireSelect.getValue();
  
  var fireParamsYrList = fireParamsList[year];
  var goferVersionName = versionSelect.getValue();
  var goferVersion = goferVersionList[goferVersionName];
  var fireNameYr = fireName.split(' ').join('_') + '_' + year;
  
  var Map1 = ui.Map().setOptions('TERRAIN'); Map1.style().set({cursor:'crosshair'});
  var Map2 = ui.Map().setOptions('TERRAIN'); Map2.style().set({cursor:'crosshair'});
  
  Map1.unlisten();
  
  var controlPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
  });
  
  var infoWrapper = ui.Panel(
    {style: {width: '205px', maxHeight: '80%', position: 'bottom-right'}
  });
  
  var mapPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
  });
  
  var map_panels = ui.SplitPanel({
    firstPanel: ui.Panel({widgets: [Map2], style: {width: '0%'}}),
    secondPanel: ui.Panel({widgets: [Map1], style: {Width: '100%'}}),
  });
  
  var mapGrid = ui.Panel([map_panels],
    ui.Panel.Layout.Flow('horizontal'), {stretch: 'both'}
  );
  
  // Fire Parameters
  var fireDict = fireParamsYrList[fireName];
  var area_of_interest = fireDict.AOI;
  
  var localStartTime_GMT = UTCtoLT(fireDict.start,timeZoneList_GMT[fireDict.state]).getInfo();
  var localStartTime = UTCtoLT(fireDict.start,timeZoneList[fireDict.state]).getInfo();
  
  var projFolder = 'projects/GlobalFires/';
  var GOFER_fireProg = ee.FeatureCollection('projects/GlobalFires/GOFER/GOFER' + 
      goferVersion + '_fireProg/' + fireNameYr + '_fireProg').sort('timeStep',false);
  var GOFER_cfireLine = ee.FeatureCollection('projects/GlobalFires/GOFER/GOFER' + 
      goferVersion + '_cfireLine/' + fireNameYr + '_fireLine').sort('timeStep',false);
  var GOFER_rfireLine = ee.FeatureCollection('projects/GlobalFires/GOFER/GOFER' + 
      goferVersion + '_rfireLine/' + fireNameYr + '_fireLine').sort('timeStep',false);
  var GOFER_summaryStats = ee.FeatureCollection('projects/GlobalFires/GOFER/GOFER' + 
      goferVersion + '_fireProgStats/' + fireNameYr + '_fireProgStats').sort('timeStep',false);
    
  var dummyDateTime_UTC = ee.Date.parse('YYYY-MM-dd HH:mm:ss','2020-10-01 11:00:00','UTC');
  var dummyDateTime_GMT = ee.Date.parse('YYYY-MM-dd HH:mm:ss',
    dummyDateTime_UTC.format('YYYY-MM-dd HH:mm:ss',timeZoneList_GMT[fireDict.state]),'UTC');
  var tz_adjust = dummyDateTime_UTC.difference(dummyDateTime_GMT,'hour');

  var setTS_FEDS = function(x) {
  return x.set('timeStep',ee.Date(x.get('t'))
    .advance(tz_adjust,'hour').advance(2,'hour')
    .difference(fireDict.start,'hour'));
  };
  
  var minTS = GOFER_fireProg.aggregate_min('timeStep');
  var maxTS = GOFER_fireProg.aggregate_max('timeStep');
  
  var FEDS_fireProg = FEDS.filter(ee.Filter.eq('fname',fireName))
    .filter(ee.Filter.eq('fyear',year))
    .sort('timeStep',false)
    .filter(ee.Filter.gte('timeStep',0));
    
  var area95 = ee.Number(GOFER_fireProg.aggregate_max('area_km2')).multiply(0.95);
  var maxTS_area95 = GOFER_fireProg.filter(ee.Filter.gte('area_km2',area95)).sort('timeStep').first()
      .getNumber('timeStep').getInfo();
  
  var FRAP_perim = FRAP.filter(ee.Filter.inList('OBJECTID',fireDict.FRAP));
  
  var burnSeverity = getBurnSeverity(fireDict,year);
 
  // Map layers
  ui.root.add(mapGrid);
  ui.root.setLayout(ui.Panel.Layout.Flow('vertical'));
  ui.Map.Linker([Map1,Map2]);
  
  Map1.setControlVisibility({mapTypeControl: false, layerList: false});
  Map1.centerObject(area_of_interest,10);
  
  // FRAP perimeter
  Map1.addLayer(ee.Image().paint(FRAP_perim,'OBJECTID'),
    {palette: ['black'], opacity: 0.8},
    'FRAP perimeter',false);
    
  // Land Cover, NLCD
  Map1.addLayer(landcover.selfMask(), {min: 1, max: 9, palette: lc_palette},
    'Land cover, (NLCD)', false, 0.5);
  
  // Burn Severity, MTBS
  Map1.addLayer(burnSeverity, {min: 1, max: 5, palette: burn_severity_palette},
    'Burn severity (MTBS)', false, 0.9);
    
  // GOFER fire progression
  Map1.addLayer(ee.Image().paint(GOFER_fireProg,'timeStep'),
    {min:1, max: maxTS_area95, palette: colPal.SpectralFancy, opacity:0.8},
      'GOFER fire progression');
  Map1.addLayer(ee.Image().paint(GOFER_fireProg,'timeStep',1),
    {min:1, max: maxTS_area95, palette: ['black'], opacity:0.8},
      'GOFER fire progression, outline');
      
  // FEDS fire progression
  Map1.addLayer(ee.Image().paint(FEDS_fireProg,'timeStep'),
    {min:1, max: maxTS_area95, palette: colPal.SpectralFancy, opacity:0.8},
      'FEDS fire progression',false);
  Map1.addLayer(ee.Image().paint(FEDS_fireProg,'timeStep',1),
    {min:1, max: maxTS_area95, palette: ['black'], opacity:0.8},
      'FEDS fire progression, outline',false);
  
  var GOFER_perim = GOFER_fireProg.sort('timeStep',false).first().geometry();
  var FEDS_perim = FEDS_fireProg.sort('timeStep',false).first().geometry();

  var fireInfo = ee.FeatureCollection([
    ee.Feature(null, {
      'Source': 'Official',
      'Area': ee.Number(fireDict.official).divide(247.1)
    }),
    ee.Feature(null, {
      'Source': 'GOFER',
      'IoU': calcIOU(GOFER_perim,FRAP_perim),
      'Area': GOFER_perim.area().divide(1e6),
    }),
    ee.Feature(null, {
      'Source': 'FEDS',
      'IoU': calcIOU(FEDS_perim,FRAP_perim),
      'Area': FEDS_perim.area().divide(1e6),
    }),
  ]);
  
  var infoPanel = getInfoPanel(Map1,fireDict,fireName,fireInfo);
  
  var hideMode = true;
  var hideShowButton = ui.Button({
    label: 'Hide Info Panel',
    onClick: function() {
      hideMode = !hideMode;
      hideShowButton.setLabel(hideMode ? 'Hide Info Panel': 'Show Info Panel');
      if (!hideMode) {
        infoWrapper.style().set({width: '115px', height: '45px'});
      } else {
        infoWrapper.style().set({width: '205px', height: 'auto'});
      }
    },
      style: {padding: '0', margin: '0'}
  });
  
  infoWrapper.add(hideShowButton).add(infoPanel);
  Map1.add(infoWrapper);
  
  var chartWrapper = ui.Panel({
    widgets: [],
    style: {position:'bottom-left', width:'400px', maxHeight: '90%'}
  });
  
  var chartPanel = ui.Panel({
    widgets: [],
    style: {margin: '8px -8px -8px -8px', width:'400px'}
  });
  
  var hideChartMode = true;
  var hideShowChartButton = ui.Button({
    label: 'Hide Charts',
    onClick: function() {
      hideChartMode = !hideChartMode;
      hideShowChartButton.setLabel(hideChartMode ? 'Hide Charts': 'Show Charts');
      if (!hideChartMode) {
        chartWrapper.style().set({width: '97px', height: '45px'});
      } else {
        chartWrapper.style().set({width: '400px', height: 'auto'});
      }
    },
      style: {padding: '0', margin: '0'}
  });
  

  chartPanel = chartPanel.clear();
  var fireGrowthChart = chartFireGrowth(GOFER_summaryStats,localStartTime);
  chartPanel.add(fireGrowthChart);
  
  var growthOptionSelect = ui.Select({
    items: ['Cumulative','Hourly'],
    value: 'Hourly',
    onChange: function(selected) {
      chartPanel.remove(chartPanel.widgets().get(0));
      if (selected == 'Cumulative') {
        fireGrowthChart = chartFireGrowthCumul(GOFER_fireProg,localStartTime);
      }
      if (selected == 'Hourly') {
        fireGrowthChart = chartFireGrowth(GOFER_summaryStats,localStartTime);
      }
      chartPanel.insert(0,fireGrowthChart);
    },
    style: {
      margin: '0px 25% 3px 25%',
      stretch: 'horizontal'
    }
  });
  chartPanel.add(growthOptionSelect);
  
  var fireLine = GOFER_cfireLine.filter(ee.Filter.eq('fireConf',0.05));
  var fireLineChart = chartFireLine(fireLine,localStartTime);
  chartPanel.add(fireLineChart);
  
  var flineOptionList = {
    'C': ['cfline, c=0.05','cfline, c=0.1','cfline, c=0.25','cfline, c=0.5',
      'cfline, c=0.75','cfline, c=0.9','rfline'],
    'E': ['cfline, c=0.05','cfline, c=0.1','cfline, c=0.25','cfline, c=0.5',
      'cfline, c=0.75','rfline'],
    'W': ['cfline, c=0.05','cfline, c=0.1','cfline, c=0.25','cfline, c=0.5',
      'cfline, c=0.75','rfline']
  };
  
  var flineOptionSelect = ui.Select({
    items: flineOptionList[goferVersion],
    value: 'cfline, c=0.05',
    onChange: function(selected) {
      chartPanel.remove(chartPanel.widgets().get(2));
      if (selected == 'cfline, c=0.05') {
        fireLine = GOFER_cfireLine.filter(ee.Filter.eq('fireConf',0.05));
      }
      if (selected == 'cfline, c=0.1') {
        fireLine = GOFER_cfireLine.filter(ee.Filter.eq('fireConf',0.1));
      }
      if (selected == 'cfline, c=0.25') {
        fireLine = GOFER_cfireLine.filter(ee.Filter.eq('fireConf',0.25));
      }
      if (selected == 'cfline, c=0.5') {
        fireLine = GOFER_cfireLine.filter(ee.Filter.eq('fireConf',0.5));
      }
      if (selected == 'cfline, c=0.75') {
        fireLine = GOFER_cfireLine.filter(ee.Filter.eq('fireConf',0.75));
      }
      if (selected == 'cfline, c=0.9') {
        fireLine = GOFER_cfireLine.filter(ee.Filter.eq('fireConf',0.9));
      }
      if (selected == 'rfline') {
        fireLine = GOFER_rfireLine;
      }
      var fireLineChart = chartFireLine(fireLine,localStartTime);
      chartPanel.insert(2,fireLineChart);
      
      fireLineChart.onClick(function(clicked_value) {
        timeStepBox.setValue(ee.Number(clicked_value).toInt().format().getInfo());
      });
    },
    style: {
      margin: '0px 25% 3px 25%',
      stretch: 'horizontal'
    }
  });
  chartPanel.add(flineOptionSelect);
  chartPanel.add(ui.Label('We calculated the hourly active fire lines in two ways: 1. concurrent active fire line (cfline), which is from the intersection of the perimeter with active fire detections of that hour above a fire detection confidence threshold, and 2. retrospective active fire line (rfline), which is the portion of the perimeter that leads to growth in the next hour. The active fire line lengths during dormant growth periods are filled in with the closest values during active growth periods.',
    {fontSize: '12.5px'}));
  
  fireLineChart.onClick(function(clicked_value) {
    timeStepBox.setValue(ee.Number(clicked_value).toInt().format().getInfo());
  });
  
  var fireSpreadChart = chartFireSpread(GOFER_summaryStats,localStartTime);
  chartPanel.add(fireSpreadChart);
  chartPanel.add(ui.Label('We calculated the hourly fire spread rates in two ways: 1. Maximum Axis of Expansion (MAE), which is from the maximum shortest distance relative to the next perimeter and 2. Area-Weighted Expansion (AWE), which is the growth in fire-wide area divided by the retrospective active fire line length.',
    {fontSize: '12.5px', margin: '0 8px 8px 8px'}));
    
  chartWrapper.add(hideShowChartButton).add(chartPanel);
  Map1.add(chartWrapper);
    
  ui.root.onResize(function(deviceInfo) {
    if (deviceInfo.is_desktop & deviceInfo.width > 900) {
      chartWrapper.style().set({width: '400px', height: 'auto'});
      hideShowChartButton.setLabel('Hide Charts');
      hideChartMode = true;
    } else {
      chartWrapper.style().set({width: '97px', height: '45px'});
      hideShowChartButton.setLabel('Show Charts');
      hideChartMode = false;
    }
  });
  
  // Map 2
  Map2.setControlVisibility({layerList: false, mapTypeControl: false});
  Map2.centerObject(area_of_interest,10);
  var infoPanelSlice = getInfoPanelSlice(Map2);
  
  var inTS = minTS;
  var GOFER_fireProg_slice = GOFER_fireProg
    .filter(ee.Filter.inList('timeStep',[inTS,ee.Number(inTS).add(1)]));
  var GOFER_rfireLine_slice = GOFER_rfireLine.filter(ee.Filter.eq('timeStep',inTS));
  var GOFER_cfireLine_slice = GOFER_cfireLine.filter(ee.Filter.eq('timeStep',inTS));
  
  var cThreshList = {
    'C': ee.List([0.05,0.1,0.25,0.5,0.75,0.9]),
    'E': ee.List([0.05,0.1,0.25,0.5,0.75]),
    'W': ee.List([0.05,0.1,0.25,0.5,0.75])
  };
  
  var cThresh = cThreshList[goferVersion];

  GOFER_cfireLine_slice = ee.FeatureCollection(ee.List.sequence(0,cThresh.size().subtract(1),1)
    .map(function(level) {
      var cfireLine_slice_thresh = GOFER_cfireLine_slice.filter(ee.Filter.eq('fireConf',cThresh.get(level))).first();
      var cfireLine_slice_thresh_feat = ee.Feature(cfireLine_slice_thresh).set('level',level);
      cfireLine_slice_thresh_feat = ee.Algorithms.If(cfireLine_slice_thresh_feat.getNumber('fstate').eq(1),
        cfireLine_slice_thresh_feat,cfireLine_slice_thresh_feat.setGeometry(null));
      return ee.Feature(cfireLine_slice_thresh_feat);
    }));
    
  var hideChartMode2 = true;
  var hideShowChartButton2 = ui.Button({
    label: 'Hide Legend',
    onClick: function() {
      hideChartMode2 = !hideChartMode2;
      hideShowChartButton2.setLabel(hideChartMode2 ? 'Hide Legend': 'Show Legend');
      if (!hideChartMode2) {
        chartWrapper2.style().set({width: '100px', height: '45px'});
      } else {
        chartWrapper2.style().set({width: '280px', height: '70%'});
      }
    },
      style: {padding: '0', margin: '0'}
  });
    
  var chartPanel2 = ui.Panel({
    widgets: [],
    style: {padding: '0'}
  });
  
  var chartWrapper2 = ui.Panel({
    widgets: [],
    style: {position:'bottom-left', width:'280px',height:'70%'}
  });
  
  Map2.add(chartWrapper2);
  chartWrapper2.add(hideShowChartButton2).add(infoPanelSlice).add(chartPanel2);
  
  var GOFER_stats_slice = GOFER_rfireLine_slice.map(function(x) {
      return x.set('Units','km').set('Variable','rfline')
        .select(['Variable','length_km','Units','fstate'],['Variable','Value','Units','IsActive']);
  }).merge(GOFER_cfireLine_slice.map(function(x) {
      return x.set('Units','km').set('Variable',ee.String('cfline, c=').cat(x.get('fireConf')))
        .select(['Variable','length_km','Units','fstate'],['Variable','Value','Units','IsActive']);
    }));
  
  var GOFER_stats_slice_chart = ui.Chart.feature.byFeature(GOFER_stats_slice,'Variable',['Value','Units','IsActive'])
    .setChartType('Table');
  
  chartPanel2.add(GOFER_stats_slice_chart);

  Map2.addLayer(ee.Image().paint(GOFER_fireProg_slice,'timeStep'),
    {min: 1, max: maxTS_area95, palette: ['black'], opacity: 0.8},
      'GOFER fire progression slice');
  Map2.addLayer(ee.Image().paint(GOFER_fireProg_slice,'timeStep',1),
    {min: 1, max: maxTS_area95, palette: ['white'], opacity: 0.8},
      'GOFER fire progression slice');
  Map2.addLayer(ee.Image().paint(GOFER_rfireLine_slice,'timeStep',2),
    {min: 1, max: maxTS_area95, palette: ['red'], opacity: 0.8},
      'GOFER rfireLine');
  Map2.addLayer(ee.Image().paint(GOFER_cfireLine_slice,'level',3),
    {min: 0, max: 5, palette: cfline_palette, opacity: 0.8},
      'GOFER cfireLine',false);
  
  var centerMapButton = ui.Button({
    label: 'Zoom to Fire',
    style: {position: 'bottom-right'},
    onClick: function() {
      Map2.centerObject(GOFER_fireProg_slice);
    }
  });
  
  Map2.add(centerMapButton);
  
  var timeStepBox = ui.Textbox({
    value: ee.Number(minTS).toInt().format().getInfo(),
    onChange: function(inTS) {
      infoPanelSlice.widgets().get(1).widgets().get(0).widgets().get(0).setValue(true);
      infoPanelSlice.widgets().get(1).widgets().get(1).widgets().get(0).setValue(true);
      infoPanelSlice.widgets().get(1).widgets().get(2).widgets().get(0).setValue(true);
      infoPanelSlice.widgets().get(1).widgets().get(3).widgets().get(0).setValue(false);
      chartPanel2.clear();
      
      inTS = ee.Number.parse(inTS);
      for (var layer = 0; layer <= 3; layer++) {
        Map2.remove(Map2.layers().get(0));
      }
      var GOFER_fireProg_slice = GOFER_fireProg
        .filter(ee.Filter.inList('timeStep',[inTS,ee.Number(inTS).add(1)]));
      var GOFER_rfireLine_slice = GOFER_rfireLine.filter(ee.Filter.eq('timeStep',inTS));
      var GOFER_cfireLine_slice = GOFER_cfireLine.filter(ee.Filter.eq('timeStep',inTS));
        
      GOFER_cfireLine_slice = ee.FeatureCollection(ee.List.sequence(0,cThresh.size().subtract(1),1)
        .map(function(level) {
          var cfireLine_slice_thresh = GOFER_cfireLine_slice.filter(ee.Filter.eq('fireConf',cThresh.get(level))).first();
          var cfireLine_slice_thresh_feat = ee.Feature(cfireLine_slice_thresh).set('level',level);
          cfireLine_slice_thresh_feat = ee.Algorithms.If(cfireLine_slice_thresh_feat.getNumber('fstate').eq(1),
            cfireLine_slice_thresh_feat,cfireLine_slice_thresh_feat.setGeometry(null));
          return ee.Feature(cfireLine_slice_thresh_feat);
        }));
        
      Map2.addLayer(ee.Image().paint(GOFER_fireProg_slice,'timeStep'),
        {min: 1, max: maxTS_area95, palette: ['black'], opacity: 0.8},
          'GOFER fire progression slice');
      Map2.addLayer(ee.Image().paint(GOFER_fireProg_slice,'timeStep',1),
        {min: 1, max: maxTS_area95, palette: ['white'], opacity: 0.8},
          'GOFER fire progression slice');
      Map2.addLayer(ee.Image().paint(GOFER_rfireLine_slice,'timeStep',2),
        {min: 1, max: maxTS_area95, palette: ['red'], opacity: 0.8},
          'GOFER rfireLine');
      Map2.addLayer(ee.Image().paint(GOFER_cfireLine_slice,'level',3),
        {min: 0, max: 5, palette: cfline_palette, opacity: 0.8},
          'GOFER cfireLine',false);
          
      var GOFER_stats_slice = GOFER_rfireLine_slice.map(function(x) {
        return x.set('Units','km').set('Variable','rfline')
          .select(['Variable','length_km','Units','fstate'],['Variable','Value','Units','IsActive']);
        }).merge(GOFER_cfireLine_slice.map(function(x) {
          return x.set('Units','km').set('Variable',ee.String('cfline, c=').cat(x.get('fireConf')))
            .select(['Variable','length_km','Units','fstate'],['Variable','Value','Units','IsActive']);
        }));
      
      var GOFER_stats_slice_chart = ui.Chart.feature.byFeature(GOFER_stats_slice,'Variable',['Value','Units','IsActive'])
        .setChartType('Table');
      
      chartPanel2.add(GOFER_stats_slice_chart);
      
      Map2.remove(centerMapButton);
      centerMapButton = ui.Button({
          label: 'Zoom to Fire',
          style: {position: 'bottom-right'},
          onClick: function() {
            Map2.centerObject(GOFER_fireProg_slice);
          }
        });
      Map2.add(centerMapButton);
      },
    style: {
      margin: '8px 8px 3px 5px',
      stretch: 'horizontal'
    }
  });
  
  var timeRangeText = ee.String('(range: ')
    .cat(ee.Number(minTS).toInt().format())
    .cat('-').cat(ee.Number(maxTS).subtract(1).toInt().format()).cat(')')
    .getInfo();
    
  var timeStepMainLabel = ui.Label('Hour after Ignition',
    {margin: '8px 4px 2px 4px', fontWeight: 'bold'});
  var timeStepRangeLabel = ui.Label(timeRangeText,
    {margin: '0px 0px 8px 4px', color:'#777', fontSize: '13px'});
  
  var timeStepLabel = ui.Panel({
    widgets: [timeStepMainLabel,timeStepRangeLabel],
    layout: ui.Panel.Layout.flow('vertical'),
  });
  
  var timeStepPanel = ui.Panel({
    widgets: [timeStepLabel,timeStepBox],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {
      width: '230px',
      padding: '0 0 0 5px',
      position: 'top-center',
      margin: '8px 0px 8px 8px',
      stretch: 'horizontal'
    }
  });

  Map2.add(timeStepPanel);
});

