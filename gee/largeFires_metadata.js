// =========================================
// largeFires_metadata.js
// -----------------------------------------
// metadata dictionary for each large fire
// and ancillary parameters
// -----------------------------------------
// @author Tianjia Liu (embrslab@gmail.com)
// =========================================

var today = new Date();
var projFolder = 'projects/GlobalFires/GOFER/';

var yrList = ['2019','2020','2021'];

var fireYrList = {
  '2019': ['Kincade','Walker'],
  '2020': ['August Complex','Bobcat','Creek','CZU Lightning Complex',
    'Dolan','Glass','July Complex',
    'LNU Lightning Complex','North Complex',
    'Red Salmon Complex','SCU Lightning Complex',
    'Slater and Devil','SQF Complex',
    'W-5 Cold Springs','Zogg'],
  '2021': ['Antelope','Beckwourth Complex','Caldor',
    'Dixie','KNP Complex','McCash','McFarland','Monument',
    'River Complex','Tamarack','Windy']
};

// official acres burned from CAL FIRE Redbooks
// https://www.fire.ca.gov/our-impact/statistics

var fireParamsList = {
  '2019': {
    'Kincade': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2019/10/23/kincade-fire/
      state: 'CA',
      official: 77758,
      ignition: ee.Geometry.Point([-122.780053,38.792458]), 
      AOI: ee.Geometry.Rectangle([-122.96,38.50,-122.59,38.87]),
      stDate: 'October 23, 2019 9:27 PM', // CAL FIRE
      start: ee.Date.parse('Y-MM-dd HH','2019-10-24 04'), 
      end: ee.Date.parse('Y-MM-dd HH','2019-10-30 20'),
      nHour: 160,
      nDay: 7,
      kernels: [3453,2550,1725], // GOES-East, GOES-West, Combined
      MTBS: ['CA3879612276720191023'], // MTBS - Fire_ID
      ICS: ['CA-LNU-019376'], // ICS-209 - Incident Number
      DINS: ['CALNU 019376'] // CAL FIRE DINS - INCIDENTNU
    },
    'Walker': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2019/9/4/walker-fire
      // InciWeb: https://inciweb.nwcg.gov/incident/6568/
      state: 'CA',
      official: 54612,
      ignition: ee.Geometry.Point([-120.680556,40.061389]), 
      AOI: ee.Geometry.Rectangle([-120.81,39.97,-120.43,40.24]),
      stDate: 'September 4, 2019 12:00 AM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2019-09-04 07'), 
      end: ee.Date.parse('Y-MM-dd HH','2019-09-16 14'),
      nHour: 295,
      nDay: 13,
      kernels: [3397,2615,1694],
      MTBS: ['CA4005312066920190904'],
      ICS: ['CA-PNF-001324']
    }
  },
  '2020': {
    'August Complex': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2020/8/16/august-complex-includes-doe-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/6983/
      // (North Zone) https://inciweb.nwcg.gov/incident/7071/
      state: 'CA',
      official: 1032648,
      ignition: ee.Geometry.Point([-122.673,39.776]), 
      AOI: ee.Geometry.Polygon([
        [-123.29,39.39],[-122.48,39.39],[-122.48,40.10],[-122.72,40.25],
        [-122.98,40.32],[-123.07,40.50],[-123.64,40.50],[-123.64,40.07],
        [-123.25,39.94]
      ]),
      stDate: 'August 16, 2020 8:37 PM', // CAL FIRE
      // manual start time correction based on active fire timeseries
      start: ee.Date.parse('Y-MM-dd HH','2020-08-16 21'), 
      end: ee.Date.parse('Y-MM-dd HH','2020-10-18 21'),
      nHour: 1512,
      nDay: 63,
      kernels: [3519,2586,1710],
      MTBS: ['CA3966012280920200817'],
      ICS: ['CA-MNF-000753'],
      DINS: ['CATGU 008864','CATGU 008913','CAMEU 010843','CAMNF 000753']
    },
    'Bobcat': {
      // InciWeb: https://inciweb.nwcg.gov/incident/7152/
      state: 'CA',
      official: 115997,
      ignition: ee.Geometry.Point([-117.868,34.241]),
      AOI: ee.Geometry.Rectangle([-118.2,34.13,-117.71,34.55]),
      stDate: 'September 6, 2020 12:21 PM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2020-09-06 19'),
      end: ee.Date.parse('Y-MM-dd HH','2020-10-07 18'),
      nHour: 743,
      nDay: 31,
      kernels: [3071,2485,1651],
      MTBS: ['CA3424811795920200906'],
      ICS: ['CA-ANF-003687'],
      DINS: ['CAANF 003687']
    },
    'Creek': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2020/9/4/creek-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7147/
      state: 'CA',
      official: 379895,
      ignition: ee.Geometry.Point([-119.261175,37.19147]),
      AOI: ee.Geometry.Polygon([[-119.6,36.96],[-119.6,37.72],[-118.88,37.72],
        [-118.88,37.23],[-119.07,37.23],[-119.07,36.96]]),
      stDate: 'September 4, 2020 6:21 PM', // CAL FIRE
      start: ee.Date.parse('Y-MM-dd HH','2020-09-05 01'),
      end: ee.Date.parse('Y-MM-dd HH','2020-11-09 20'),
      nHour: 1579,
      nDay: 66,
      kernels: [3227,2549,1681],
      MTBS: ['CA3720111927220200905'],
      ICS: ['CA-SNF-001391'],
      DINS: ['CAFKU 013369']
    },
    'CZU Lightning Complex': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2020/8/16/czu-lightning-complex-including-warnella-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7028/
      state: 'CA',
      official: 86509,
      ignition: ee.Geometry.Point([-122.22275,37.17162]), 
      AOI: ee.Geometry.Rectangle([-122.44,37.0,-122.04,37.3]),
      stDate: 'August 16, 2020 8:00 AM', // CAL FIRE
      start: ee.Date.parse('Y-MM-dd HH','2020-08-16 15'), 
      end: ee.Date.parse('Y-MM-dd HH','2020-08-24 18'),
      nHour: 195,
      nDay: 9,
      kernels: [3365,2511,1668],
      MTBS: ['CA3726212222320200816'],
      ICS: ['CA-CZU-005205'],
      DINS: ['CACZU 005205']
    },
    'Dolan': {
      // InciWeb: https://inciweb.nwcg.gov/incident/7018/
      state: 'CA',
      official: 124924,
      ignition: ee.Geometry.Point([-121.602,36.123]),
      AOI: ee.Geometry.Rectangle([-121.77,35.93,-121.23,36.25]),
      stDate: 'August 18, 2020 8:15 PM', // InciWeb
      // manual start time correction based on active fire timeseries
      start: ee.Date.parse('Y-MM-dd HH','2020-08-18 18'),
      end: ee.Date.parse('Y-MM-dd HH','2020-09-22 22'),
      nHour: 844,
      nDay: 36,
      kernels: [3289,2496,1658],
      MTBS: ['CA3612312160220200819'],
      ICS: ['CA-LPF-002428']
    },
    'Glass': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2020/9/27/glass-fire/
      state: 'CA',
      official: 67484,
      ignition: ee.Geometry.Point([-122.49745,38.56295]), 
      AOI: ee.Geometry.Rectangle([-122.75,38.39,-122.37,38.71]),
      stDate: 'September 27, 2020 8:48 AM', // CAL FIRE
      // manual start time correction based on active fire timeseries
      start: ee.Date.parse('Y-MM-dd HH','2020-09-27 10'), 
      end: ee.Date.parse('Y-MM-dd HH','2020-10-05 14'),
      nHour: 196,
      nDay: 9,
      kernels: [3436,2548,1705],
      MTBS: ['CA3855412253120200927'],
      ICS: ['CA-LNU-015947'],
      DINS: ['CALNU 015947']
    },
    'July Complex': {
      // aka Caldwell, Allen, Dalton (too small for GOES)
      // CAL FIRE: https://www.fire.ca.gov/incidents/2020/7/24/july-complex/
      // InciWeb: https://inciweb.nwcg.gov/incident/6881/
      state: 'CA',
      official: 83261,
      ignition: ee.Geometry.Point([-121.477,41.699]), 
      AOI: ee.Geometry.Rectangle([-121.71,41.31,-120.98,41.88]),
      stDate: 'July 22, 2020 10:15 AM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2020-07-22 17'), 
      end: ee.Date.parse('Y-MM-dd HH','2020-08-01 02'),
      nHour: 225,
      nDay: 10,
      kernels: [3500,2657,1726],
      MTBS: ['CA4169912147720200722','CA4136412109120200722','CA4173712105820200723'],
      ICS: ['CA-MDF-000487']
    },
    'LNU Lightning Complex': {
      // aka Hennessey, Walbridge, Meyers (too small for GOES)
      // CAL FIRE: https://www.fire.ca.gov/incidents/2020/8/17/lnu-lightning-complex-includes-hennessey-gamble-15-10-spanish-markley-13-4-11-16-walbridge/
      // InciWeb: https://inciweb.nwcg.gov/incident/7027/
      state: 'CA',
      official: 363220,
      ignition: ee.Geometry.Point([-122.14864,38.48193]),
      AOI: ee.Geometry.Rectangle([-123.27,38.26,-121.92,38.98]), // AOI: ee.Geometry.Rectangle([-122.73,38.26,-121.92,38.98]),
      stDate: 'August 17, 2020 6:40 AM', // CAL FIRE
      start: ee.Date.parse('Y-MM-dd HH','2020-08-17 13'),
      end: ee.Date.parse('Y-MM-dd HH','2020-08-30 00'),
      nHour: 299,
      nDay: 13,
      kernels: [3441,2551,1686],
      MTBS: ['CA3850412233720200817','CA3867312307820200817','CA3851412322420200817'],
      ICS: ['CA-LNU-013407'],
      DINS: ['CALNU 013407']
    },
    'North Complex': {
      // InciWeb: https://inciweb.nwcg.gov/incident/6997/
      state: 'CA',
      official: 318935,
      ignition: ee.Geometry.Point([-120.931,40.091]),
      AOI: ee.Geometry.Polygon([[-121.58,39.47],[-121.58,39.84],[-121.45,40.00],
        [-120.70,40.00],[-120.70,39.47]]),
      stDate: 'August 17, 2020 9:00 AM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2020-08-17 16'),
      end: ee.Date.parse('Y-MM-dd HH','2020-10-03 23'),
      nHour: 1135,
      nDay: 48,
      kernels: [3414,2598,1700],
      MTBS: ['CA4009112093120200817'],
      ICS: ['CA-PNF-001308'],
      DINS: ['CABTU 010751']
    },
    'Red Salmon Complex': {
      // InciWeb: https://inciweb.nwcg.gov/incident/6891/
      state: 'CA',
      official: 144698,
      ignition: ee.Geometry.Point([-123.433,41.185]),
      AOI: ee.Geometry.Rectangle([-123.68,40.95,-123.19,41.29]),
      stDate: 'July 27, 2020 11:03 AM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2020-07-27 18'), 
      end: ee.Date.parse('Y-MM-dd HH','2020-10-10 05'),
      nHour: 1787,
      nDay: 75,
      kernels: [3596,2620,1729],
      MTBS: ['CA4118512343320200728'],
      ICS: ['CA-SRF-000656']
    },
    'SCU Lightning Complex': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2020/8/16/scu-lightning-complex
      // InciWeb: https://inciweb.nwcg.gov/incident/7056/
      state: 'CA',
      official: 396625,
      ignition: ee.Geometry.Point([-121.30435,37.439437]),
      AOI: ee.Geometry.Polygon([[-121.55,37.07],[-121.93,37.45],[-121.93,37.65],
        [-121.11,37.65],[-121.11,37.07]]),
      stDate: 'August 16, 2020 4:00 AM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2020-08-16 11'),
      end: ee.Date.parse('Y-MM-dd HH','2020-09-09 00'),
      nHour: 565,
      nDay: 24,
      kernels: [3333,2525,1668],
      MTBS: ['CA3742412156820200816'],
      ICS: ['CA-SCU-005740'],
      DINS: ['CASCU 005740']
    },
    'Slater and Devil': {
      // InciWeb: https://inciweb.nwcg.gov/incident/7173/
      state: 'CA',
      official: 166127,
      ignition: ee.Geometry.Point([-123.375,41.766]),
      AOI: ee.Geometry.Polygon([[-123.56,42.15],
        [-123.88,42.07],[-123.88,41.91],[-123.62,41.84],[-123.59,41.72],
        [-123.13,41.75],[-123.13,42.13],[-123.56,42.15]]),
      stDate: 'September 8, 2020 6:43 AM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2020-09-08 13'),
      end: ee.Date.parse('Y-MM-dd HH','2020-09-24 01'),
      nHour: 372,
      nDay: 16,
      kernels: [3637,2648,1734],
      MTBS: ['CA4185812335420200908','CA4190412319120200909'],
      ICS: ['CA-KNF-007035'],
      DINS: ['CAKNF 007035']
    },
    'SQF Complex': {
      // aka Castle
      // InciWeb: https://inciweb.nwcg.gov/incident/7048/
      state: 'CA',
      official: 175019,
      ignition: ee.Geometry.Point([-118.497,36.255]),
      AOI: ee.Geometry.Polygon([
        [-118.93,36.03],[-118.93,36.48],[-118.56,36.48],[-118.48,36.38],
        [-118.22,36.38],[-118.22,36.03],
      ]),
      stDate: 'August 19, 2020 7:15 AM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2020-08-19 14'), 
      end: ee.Date.parse('Y-MM-dd HH','2020-10-08 20'),
      nHour: 1206,
      nDay: 51,
      kernels: [3158,2526,1666],
      MTBS: ['CA3616111845220200819'],
      ICS: ['CA-SQF-002622'],
      DINS: ['CASQF 002541']
    },
    'W-5 Cold Springs': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2020/8/23/w-5-cold-springs/
      // InciWeb: https://inciweb.nwcg.gov/incident/7010/
      state: 'CA',
      official: 84817,
      ignition: ee.Geometry.Point([-120.281,41.029]), 
      AOI: ee.Geometry.Rectangle([-120.42,40.95,-119.885,41.285]),
      stDate: 'August 18, 2020 11:45 AM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2020-08-18 18'), 
      end: ee.Date.parse('Y-MM-dd HH','2020-08-31 06'),
      nHour: 300,
      nDay: 13,
      kernels: [3416,2662,1722],
      MTBS: ['CA4102912028120200818'],
      ICS: ['CA-NOD-004727']
    },
    'Zogg': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2020/9/27/zogg-fire/
      state: 'CA',
      official: 56338,
      ignition: ee.Geometry.Point([-122.56656,40.53927]), 
      AOI: ee.Geometry.Rectangle([-122.83,40.26,-122.47,40.60]),
      stDate: 'September 27, 2020 4:03 PM', // CAL FIRE
      // manual start time correction based on active fire timeseries
      start: ee.Date.parse('Y-MM-dd HH','2020-09-27 21'), 
      end: ee.Date.parse('Y-MM-dd HH','2020-10-02 04'),
      nHour: 103,
      nDay: 5,
      kernels: [3519,2605,1755],
      MTBS: ['CA4054112256820200927'],
      ICS: ['CA-SHU-009978'],
      DINS: ['CASHU 009978']
    }
  },
  '2021': {
    'Antelope' : {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/8/1/antelope-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7764/
      state: 'CA',
      official: 145632,
      ignition: ee.Geometry.Point([-121.929,41.5]), 
      AOI: ee.Geometry.Polygon([
        [-122.00,41.40],[-121.73,41.40],[-121.44,41.66],[-121.44,41.81],
        [-121.57,41.91],[-121.68,41.91],[-121.68,41.82],[-121.98,41.82],
        [-122.13,41.71],[-122.13,41.53]
      ]),
      stDate: 'August 1, 2021 10:30 AM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2021-08-01 17'), 
      end: ee.Date.parse('Y-MM-dd HH','2021-09-17 22'),
      nHour: 1133,
      nDay: 48,
      kernels: [3526,2654,1736],
      MTBS: ['CA4150012192920210801'],
      ICS: ['CA-KNF-006454'],
      DINS: ['CAKNF 006454']
    },
    'Beckwourth Complex': {
      // aka Sugar
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/7/4/beckwourth-complex/
      // InciWeb: https://inciweb.nwcg.gov/incident/7601/
      state: 'CA',
      official: 105670,
      ignition: ee.Geometry.Point([-120.368,39.875]),
      AOI: ee.Geometry.Rectangle([-120.47,39.80,-119.96,40.13]),
      stDate: 'July 3, 2021 10:30 AM', // InciWeb
      // manual start time correction based on active fire timeseries,
      // the Dotta fire (part of complex) started on June 30
      start: ee.Date.parse('Y-MM-dd HH','2021-06-30 23'), 
      end: ee.Date.parse('Y-MM-dd HH','2021-08-05 03'),
      nHour: 844,
      nDay: 36,
      kernels: [3371,2615,1694],
      MTBS: ['CA3983912034520210702'],
      ICS: ['CA-PNF-001064'],
      DINS: ['CAPNF 001064']
    },
    'Caldor': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/8/14/caldor-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7801/
      state: 'CA',
      official: 221835,
      ignition: ee.Geometry.Point([-120.538,38.586]),
      AOI: ee.Geometry.Polygon([
        [-120.64,38.51],[-120.76,38.64],[-120.76,38.98],[-119.85,38.98],
        [-119.85,38.82],[-120.06,38.51]
      ]),
      stDate: 'August 14, 2021 6:54 PM', // CAL FIRE
      start: ee.Date.parse('Y-MM-dd HH','2021-08-15 01'),
      end: ee.Date.parse('Y-MM-dd HH','2021-09-13 02'),
      nHour: 697,
      nDay: 30,
      kernels: [3328,2577,1696],
      MTBS: ['CA3858612053820210815'],
      ICS: ['CA-ENF-024030'],
      DINS: ['CAENF 024030']
    },
    'Dixie': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/7/13/dixie-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7690/
      state: 'CA',
      official: 963309,
      ignition: ee.Geometry.Point([-121.379,39.876]),
      AOI: ee.Geometry.Polygon([
        [-121.5,39.8],[-121.7,40.02],[-121.7,40.85],[-121.23,40.85],
        [-120.7,40.48],[-120.1,40.16],[-120.1,39.8],
      ]),
      AOIsmall: ee.Geometry.Polygon([
        [-121.5,39.8],[-121.7,40.02],[-121.7,40.85],
        [-121.23,40.85],[-120.23,39.8],
      ]),
      AOIsmallTS: 70,
      stDate: 'July 13, 2021 5:15 PM', // CAL FIRE
      start: ee.Date.parse('Y-MM-dd HH','2021-07-14 00'),
      end: ee.Date.parse('Y-MM-dd HH','2021-09-10 06'),
      nHour: 1398,
      nDay: 59,
      kernels: [3429,2615,1706],
      MTBS: ['CA3987612137920210714'],
      ICS: ['CA-BTU-009205'],
      DINS: ['CABTU 009205']
    },
    'KNP Complex': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/9/10/knp-complex/
      // InciWeb: https://inciweb.nwcg.gov/incident/7838/
      state: 'CA',
      official: 88307,
      ignition: ee.Geometry.Point([-118.811,36.567]),
      AOI: ee.Geometry.Rectangle([-119.09,36.40,-118.61,36.79]),
      stDate: 'September 10, 2021 7:00 AM', // CAL FIRE
      start: ee.Date.parse('Y-MM-dd HH','2021-09-10 14'), 
      end: ee.Date.parse('Y-MM-dd HH','2021-10-08 14'),
      nHour: 672,
      nDay: 28,
      kernels: [3193,2532,1667],
      MTBS: ['CA3658211879520210912'],
      ICS: ['CA-KNP-000122']
    },
    'McCash': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/8/18/mccash-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7757/
      state: 'CA',
      official: 94962,
      ignition: ee.Geometry.Point([-123.404,41.564]),
      AOI: ee.Geometry.Rectangle([-123.58,41.40,-123.15,41.78]),
      stDate: 'July 31, 2021 7:11 PM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2021-08-01 02'), 
      end: ee.Date.parse('Y-MM-dd HH','2021-09-27 01'),
      nHour: 1367,
      nDay: 57,
      kernels: [3634,2636,1743],
      MTBS: ['CA4156412340420210801'],
      ICS: ['CA-SRF-000651']
    },
    'McFarland': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/7/30/mcfarland-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7746/
      state: 'CA',
      official: 122653,
      ignition: ee.Geometry.Point([-123.034,40.35]),
      AOI: ee.Geometry.Rectangle([-123.33,40.12,-122.66,40.46]),
      stDate: 'July 29, 2021 6:45 PM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2021-07-30 01'), 
      end: ee.Date.parse('Y-MM-dd HH','2021-08-26 20'),
      nHour: 667,
      nDay: 28,
      kernels: [3533,2597,1724],
      MTBS: ['CA4035012303620210730'],
      ICS: ['CA-SHF-001175'],
      DINS: ['CASHF 001175']
    },
    'Monument': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/7/30/monument-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7750/
      state: 'CA',
      official: 223124,
      ignition: ee.Geometry.Point([-123.337,40.752]),
      AOI: ee.Geometry.Rectangle([-123.56,40.52,-122.97,40.96]),
      stDate: 'July 30, 2021 6:00 PM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2021-07-31 01'), 
      end: ee.Date.parse('Y-MM-dd HH','2021-09-26 17'),
      nHour: 1189,
      nDay: 50,
      kernels: [3569,2609,1744],
      MTBS: ['CA4075212333720210731'],
      ICS: ['CA-SHF-001187'],
      DINS: ['CASHF 001187']
    },
    'River Complex': {
      // aka Haypress and Cronan
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/7/30/river-complex/
      // InciWeb: https://inciweb.nwcg.gov/incident/7760/
      state: 'CA',
      official: 199359,
      ignition: ee.Geometry.Point([-123.057,41.389]),
      AOI: ee.Geometry.Rectangle([-123.38,40.93,-122.64,41.40]),
      stDate: 'July 30, 2021 2:30 PM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2021-07-30 21'), 
      end: ee.Date.parse('Y-MM-dd HH','2021-09-27 02'),
      nHour: 1397,
      nDay: 59,
      kernels: [3573,2625,1719],
      MTBS: ['CA4132412320120210731','CA4114212301620210731'],
      ICS: ['CA-KNF-006385']
    },
    'Tamarack': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/7/4/tamarack-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7674/
      state: 'CA',
      official: 68637,
      ignition: ee.Geometry.Point([-119.8591887,38.6280042]),
      AOI: ee.Geometry.Rectangle([-119.99,38.57,-119.46,38.86]),
      stDate: 'July 4, 2021 11:57 AM', // CAL FIRE
      start: ee.Date.parse('Y-MM-dd HH','2021-07-04 18'), 
      end: ee.Date.parse('Y-MM-dd HH','2021-08-05 23'),
      nHour: 773,
      nDay: 33,
      kernels: [3298,2582,1718],
      MTBS: ['CA3862811985720210704'],
      ICS: ['NV-HTF-030419'],
      DINS: ['NVHTF 030419']
    },
    'Windy': {
      // CAL FIRE: https://www.fire.ca.gov/incidents/2021/9/9/windy-fire/
      // InciWeb: https://inciweb.nwcg.gov/incident/7841/
      state: 'CA',
      official: 97528,
      ignition: ee.Geometry.Point([-118.631,36.047]),
      AOI: ee.Geometry.Rectangle([-118.80,35.82,-118.44,36.17]),
      stDate: 'September 9th, 2021 5:45 PM', // InciWeb
      start: ee.Date.parse('Y-MM-dd HH','2021-09-10 00'), 
      end: ee.Date.parse('Y-MM-dd HH','2021-10-06 01'),
      nHour: 625,
      nDay: 27,
      kernels: [3151,2528,1702],
      MTBS: ['CA3604711863120210910'],
      ICS: ['CA-TIA-003058'],
      DINS: ['CATUU 000786']
    }
  }
};

// local time zone, standard time
var timeZoneList_GMT = {
  'CA': 'Etc/GMT+8'
};

// local time zone, includes daylight savings
var timeZoneList = {
  'CA': 'America/Los_Angeles'
};

// parallax adjustment factor
var parallaxAdjList = {
  'C': 0.85, // GOFER-Combined
  'E': 0.8, // GOFER-East
  'W': 1.0 // GOFER-West
};

// confidence threshold
var confidenceThreshList = {
  'C': 0.95, // GOFER-Combined
  'E': 0.76, // GOFER-East
  'W': 0.83 // GOFER-West
};

exports.projFolder = projFolder;
exports.yrList = yrList;
exports.fireYrList = fireYrList;
exports.fireParamsList = fireParamsList;
exports.timeZoneList = timeZoneList;
exports.timeZoneList_GMT = timeZoneList_GMT;
exports.confidenceThreshList = confidenceThreshList;
exports.parallaxAdjList = parallaxAdjList;
