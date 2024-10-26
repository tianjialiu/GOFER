// =========================================
// Export_Parallax.js
// -----------------------------------------
// export the parallax x,y displacements
// for GOES-East and GOES-West
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

var dem = ee.Image('USGS/3DEP/10m');
// displacement is inprecise at low elevation values,
// < 0.5 x spatial resolution of DEM (10 m)
dem = dem.multiply(dem.gt(5)); 

var req = 6378137;
var rpol = 6356752.31414;
var H = 35786023 + req;
var ecc = 0.0818191910435;

// GOES parallax correction functions adapted from python code by Steven Pestana
// https://github.com/spestana/goes-ortho/blob/main/goes_ortho.py
var lonlat2abi = function(lon_0,AOI) {
  var lonLat = ee.Image.pixelLonLat().clip(AOI);
     
  // convert lat and lon from degrees to radians
  var lon_lat_rad = lonLat.multiply(Math.PI/180);
  var lon_rad = lon_lat_rad.select('longitude');
  var lat_rad = lon_lat_rad.select('latitude');
  var lon_0_rad = lon_0 * Math.PI/180;
  
  // geocentric latitude
  // lat_geo = np.arctan((rpol**2 / req**2) * np.tan(lat))
  var lat_geo = (lat_rad.tan().multiply(Math.pow(rpol,2)/Math.pow(req,2))).atan();
  
  // geocentric distance to point on the ellipsoid
  // this is rc if point is on the ellipsoid
  // _rc = rpol / np.sqrt(1 - (e**2)*(np.cos(lat_geo)**2)) # this is rc if point is on the ellipsoid
  // if the point is offset from the ellipsoid by z (meters)
  // rc = _rc + z # this is rc if the point is offset from the ellipsoid by z (meters)
  var rc_on = ee.Image(rpol)
    .divide((ee.Image(1).subtract((lat_geo).cos().pow(2).multiply(Math.pow(ecc,2)))).sqrt());
  var rc = rc_on.add(dem);
  
  // intermediate calculations
  // Sx = H - rc * np.cos(lat_geo) * np.cos(lon - lon_0)
  // Sy = -rc * np.cos(lat_geo) * np.sin(lon - lon_0)
  // Sz = rc * np.sin(lat_geo)
  var Sx = ee.Image(H).subtract(rc.multiply(lat_geo.cos()).multiply((lon_rad.subtract(lon_0_rad)).cos()));
  var Sy = rc.multiply(-1).multiply(lat_geo.cos())
    .multiply((lon_rad.subtract(lon_0_rad)).sin());
  var Sz = rc.multiply(lat_geo.sin());
  
  // calculate x and y scan angles
  // y = np.arctan( Sz / Sx )
  // x = np.arcsin( -Sy / np.sqrt( Sx**2 + Sy**2 + Sz**2 ) )
  var y = (Sz.divide(Sx)).atan();
  var x = (Sy.multiply(-1).divide((Sx.pow(2).add(Sy.pow(2).add(Sz.pow(2)))).sqrt())).asin();
  
  return (x.rename('x').addBands(y.rename('y')));
};

var abi2latlon = function(xy,lon_0) {
  var x = xy.select('x');
  var y = xy.select('y');

  // intermediate calculations
  // a = np.sin(x)**2 + ( np.cos(x)**2 * ( np.cos(y)**2 + ( req**2 / rpol**2 ) * np.sin(y)**2 ) )
  // b = -2 * H * np.cos(x) * np.cos(y)
  // c = H**2 - req**2
  var a = x.sin().pow(2).add(x.cos().pow(2).multiply(y.cos().pow(2).add(y.sin().pow(2).multiply(Math.pow(req,2)/Math.pow(rpol,2)))));
  var b = ee.Image(-2 * H).multiply(x.cos()).multiply(y.cos());
  var c = ee.Image(Math.pow(H,2) - Math.pow(req,2));
  
  // rs = ( -b - np.sqrt( b**2 - 4*a*c ) ) / ( 2 * a )
  // distance from satellite point (S) to P
  var rs = (b.multiply(-1).subtract((b.pow(2).subtract(a.multiply(c).multiply(4))).sqrt()))
    .divide(a.multiply(2));
  // Sx = rs * np.cos(x) * np.cos(y)
  // Sy = -rs * np.sin(x)
  // Sz = rs * np.cos(x) * np.sin(y)
  var Sx = rs.multiply(x.cos()).multiply(y.cos());
  var Sy = rs.multiply(-1).multiply(x.sin());
  var Sz = rs.multiply(x.cos()).multiply(y.sin());
  
  // calculate lat and lon
  // lat = np.arctan( ( req**2 / rpol**2 ) * ( Sz / np.sqrt( ( H - Sx )**2 + Sy**2 ) ) )
  // lat = np.degrees(lat) #*
  // lon = lon_0_deg - np.degrees( np.arctan( Sy / ( H - Sx )) )
  var lat =  (Sz.divide((ee.Image(H).subtract(Sx).pow(2).add(Sy.pow(2))).sqrt())
    .multiply(Math.pow(req,2)/Math.pow(rpol,2))).atan();
  lat = lat.multiply(180/Math.PI);
  var lon = ee.Image(lon_0).subtract((Sy.divide(ee.Image(H).subtract(Sx))).atan().multiply(180/Math.PI));
  
  return(lon.rename('longitude').addBands(lat.rename('latitude')));
};


var displace_m = function(ground,satellite,inMode) {
  var glon = ground.select('longitude');
  var glat = ground.select('latitude');
  var slon = satellite.select('longitude');
  var slat = satellite.select('latitude');
    
  if (inMode == 'x') {
    var mean_lat = ee.ImageCollection([glat,slat]).mean();
    glat = mean_lat;
    slat = mean_lat;
  }
  
  if (inMode == 'y') {
    var mean_lon = ee.ImageCollection([glon,slon]).mean();
    glon = mean_lon;
    slon = mean_lon;
  }
  
  var glon_rad = glon.multiply(Math.PI/180);
  var glat_rad = glat.multiply(Math.PI/180);
  var slon_rad = slon.multiply(Math.PI/180);
  var slat_rad = slat.multiply(Math.PI/180);
  
  var dLat = glat_rad.subtract(slat_rad);
  var dLon = glon_rad.subtract(slon_rad);
  
  var sign = 1;
  if (inMode == 'x') {
    sign = slon.subtract(glon).divide(glon.subtract(slon).abs());
  }
  
  if (inMode == 'y') {
    sign = slat.subtract(glat).divide(glat.subtract(slat).abs());
  }
  
  // a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
  // c = 2 * atan2(sqrt(a), sqrt(1 - a))
  // distance = req * c
  
  var a = ((dLat.divide(2)).sin()).pow(2)
    .add(glat_rad.cos().multiply(slat_rad.cos())
    .multiply(((dLon.divide(2)).sin()).pow(2)));
  var c = (ee.Image(1).subtract(a).sqrt()).atan2(a.sqrt()).multiply(2);
  var d = c.multiply(req);
  
  return d.multiply(sign).rename(inMode); // distance, in meters
};

for (var fireIdx = 0; fireIdx < inFiresList.length; fireIdx++) {
  var fireName = inFiresList[fireIdx][0]; 
  var year = inFiresList[fireIdx][1]; 

  // Time and location of the fire
  var yrList = fireInfo.yrList;
  var fireYrList = fireInfo.fireYrList;
  var fireParamsList = fireInfo.fireParamsList;
  
  // Fire Parameters
  var fireParamsYrList = fireParamsList[year];
  var fireDict = fireParamsYrList[fireName];
  
  var demLonLat = ee.Image.pixelLonLat().clip(fireDict.AOI)
      .reproject({crs: dem.projection(), scale: dem.projection().nominalScale()});
  
  var ground = demLonLat;
  var goesEast = abi2latlon(lonlat2abi(-75,fireDict.AOI),-75);
  var goesWest = abi2latlon(lonlat2abi(-137,fireDict.AOI),-137);
  
  // Note: the .displace() function does not displace pixels in the x direction at full value,
  // dependent on latitude, must adjust the displacement image
  // Demo: https://code.earthengine.google.com/c176a76d5778cc2a35386f061808bbdf
  var xAdj_goesEast = goesEast.select('latitude').multiply(Math.PI/180).cos();
  var xAdj_goesWest = goesWest.select('latitude').multiply(Math.PI/180).cos();
  
  var x_displace_m_goesEast = displace_m(ground,goesEast,'x').divide(xAdj_goesEast);
  var y_displace_m_goesEast = displace_m(ground,goesEast,'y');
  var x_displace_m_goesWest = displace_m(ground,goesWest,'x').divide(xAdj_goesWest);
  var y_displace_m_goesWest = displace_m(ground,goesWest,'y');
  
  var displace_goesEast = x_displace_m_goesEast.addBands(y_displace_m_goesEast);
  var displace_goesWest = x_displace_m_goesWest.addBands(y_displace_m_goesWest);
  
  var fireNameYr = fireName.split(' ').join('_') + '_' + year;

  Export.image.toAsset({
    image: displace_goesEast,
    description: fireNameYr + '_GOESEast_Parallax',
    assetId: projFolder + 'GOESEast_Parallax/' + fireNameYr,
    region: fireDict.AOI,
    crs: 'EPSG:4269',
    crsTransform: [0.00009259259259299957,0,-174.0005555570324,0,0.00009259259259299957,72.00055555584566],
    maxPixels: 1e12
  });
  
  Export.image.toAsset({
    image: displace_goesWest,
    description: fireNameYr + '_GOESWest_Parallax',
    assetId: projFolder + 'GOESWest_Parallax/' + fireNameYr,
    region: fireDict.AOI,
    crs: 'EPSG:4269',
    crsTransform: [0.00009259259259299957,0,-174.0005555570324,0,0.00009259259259299957,72.00055555584566],
    maxPixels: 1e12
  });
}
