# GOFER
GOFER: GOES-Observed Fire Event Representation

The GOFER algorithm uses geostationary satellite observations of active fires from GOES-East and GOES-West to map the hourly progression of large wildfires (over 50,000 acres or 202 sq. km). GOES observes North and South America with a spatial resolution of 2 km at the equator and at a frequency of 10-15 minutes for the full disk view. Along with the fire perimeter, we derive the active fire lines and fire spread rates. We tested the GOFER algorithm on a set of 28 wildfires in California from 2019-2021 and produced three versions of the dataset: GOFER-Combined, GOFER-East, and GOFER-West. GOFER-Combined uses both GOES-East and GOES-West observations, while GOFER-East and GOFER-West use only GOES-East and only GOES-West observations, respectively. We find that GOFER performs reasonably well compared to final perimeters from California's Fire and Resource Assessment Program (FRAP) and 12-hourly perimeters from the Fire Event Data Suite (FEDS), derived from 375-m active fire observations. See our [GOFER Database Visualization](https://globalfires.earthengine.app/view/gofer) app on Earth Engine Apps for an overview of the dataset, alongside other datasets, such as FEDS and FRAP perimeters and 30-m burn severity from Monitoring Trends in Burn Severity (MTBS).

![banner image](https://github.com/tianjialiu/GOFER/blob/main/docs/imgs/GOFER.png)

### Code Structure
| Code | Description | 
| :--- | :--- |
| `largeFires_metadata.js` | dictionary of key metadata for all fires |
| 0a - `Calc_staging.js` | set temporal and spatial constraints for each fire by manually inspecting GOES active fire pixels and timeseries |
| 0b - `Calc_kernelRes.js`  | calculate the kernel radius for smoothing based on the GOES spatial resolution |
| 1a - `Export_FireConf.js` | export GOES fire detection confidence |
| 1b - `Export_Parallax.js` | export GOES parallax displacement in x and y-directions |
| 2 - `Export_ParamSens.js`, `eePro_ParamSens.R` | export optimization metric for confidence threshold and parallax adjustment factor |
| 4 - `Export_FireProg.js`, `eePro_FireProg.R` | export fire perimeters |
| 5 - `Export_FireProgQA.js` | quality control post-processing for fire perimeters |
| 6a - `Export_cFireLine.js`, `eePro_cFireLine.R` | export concurrent active fire lines |
| 6b - `Export_rFireLine.js`, `eePro_rFireLine.R` | export retrospective active fire lines |
| 6c - `Export_FireIg.js` | export fire ignitions |
| 7 - `Export_FireProgStats.js` | export fire spread rate, growth in fire-wide area|
| 8 - `table_GOFERstats.R` | export GOFER summary stats for each fire |
| 9 - `make_GOFERfinal.R` | export final GOFER data files, combined for all fires |

### File Structure
Earth Engine Assets
```
GOFER/
	GOFERC_fireProg/
	GOFERC_fireIg/
	GOFERC_cfireLine/
	GOFERC_rfireLine/
	GOFERC_fireProgStats/
	GOFERC_scaleVal/
	...
	GOESEast_MaxConf/
	GOESWest_MaxConf/
	GOESEast_Parallax/
	GOESWest_Parallax/
```

Local
```
GOES/
	ee_fireProg_chunks/
	ee_fireProg_temp/
	ee_rfireLine/
	ee_cfireLine_chunks/
	ee_fireIg/
	ee_fireStats/
	ee_paramSens_chunks/
	gofer_combined/
		fireProg/
		fireIg/
		cfireLine/
		rfireLine/
		paramSens/
		fireStats/
		summary/
	gofer_east/
		...
	gofer_west/
		...
```

### Data Structure
```
GOFER/
	fireData.csv
	GOFER-Combined/
		GOFERC_fireProg.shp
		GOFERC_cfireLine.shp
		GOFERC_rfireLine.shp
		GOFERC_fireIg.shp
		GOFERC_summary.csv
	GOFER-East/
		...
	GOFER-West/
		...
```

## Publications
Liu, T., J.T. Randerson, Y. Chen, D.C. Morton, E.B. Wiggins, P. Smyth, E. Foufoula-Georgiou, R. Nadler, and O. Nevo. Systematically tracking the hourly progression of large wildfires using GOES satellite observations. (in prep.)

