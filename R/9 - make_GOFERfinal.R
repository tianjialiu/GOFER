# ============================================
# make_GOFERfinal.R
# --------------------------------------------
# export the final GOFER product
# --------------------------------------------
# @author Tianjia Liu (embrslab@gmail.com)
# ============================================
source("/Users/TLiu/Google Drive/My Drive/WestUSFires/scripts/globalParams.R")
setwd("/Users/TLiu/Google Drive/My Drive/WestUSFires/GOES/")

for (satMode in c("gofer_combined","gofer_east","gofer_west")) {
  
  if (satMode == "gofer_combined") {
    satMode_final <- "GOFER_Combined"
    satMode_shortName <- "GOFERC"
  } else if (satMode == "gofer_east") {
    satMode_final <- "GOFER_East"
    satMode_shortName <- "GOFERE"
  } else if (satMode == "gofer_west") {
    satMode_final <- "GOFER_West"
    satMode_shortName <- "GOFERW"
  }
  
  fireProgShp_list <- list()
  cfireLine_list <- list()
  rfireLine_list <- list()
  fireIg_list <- list()
  fireSummary_list <- list()
  
  for (fireDataIdx in 1:nrow(fireData)) {
    fireName <- fireData$FireName[fireDataIdx]
    fireNameStr <- str_replace_all(fireData$FireName[fireDataIdx]," ","_")
    inYear <- fireData$Year[fireDataIdx]
    fireNameYr <- paste0(fireNameStr,"_",inYear)
    
    stTime_UTC <- ymd_h(fireData$GOES_UTC[fireDataIdx],tz="UTC")
    stTime_local <- with_tz(stTime_UTC,tz=fireData$local_tz[fireDataIdx])
    stTime_localGMT <- with_tz(stTime_UTC,tz=fireData$local_tzGMT[fireDataIdx])
    
    # perimeters
    fireProgShp <- st_read(paste0(satMode,"/fireProg"),paste0(fireNameYr,"_fireProg"),quiet=T)
    fireProgShp_list[[fireDataIdx]] <- fireProgShp %>%
      dplyr::rename(timestep="timeStep",farea="area_km2",fperim="perim_km") %>% 
      mutate(fname=fireName,fyear=inYear,
             fareaPer=farea/max(fireProgShp$area_km2)*100,
             tUTC=date2str(stTime_UTC %m+% hours(fireProgShp$timeStep)),
             tLocal=date2str(stTime_local %m+% hours(fireProgShp$timeStep)),
             tLocalGMT=date2str(stTime_localGMT %m+% hours(fireProgShp$timeStep))) %>%
      dplyr::select(fname,fyear,tUTC,tLocal,tLocalGMT,timestep,farea,fareaPer,fperim)
    
    # cfireLine
    cfireLine <- st_read(paste0(satMode,"/cfireLine/"),paste0(fireNameYr,"_fireLine"),quiet=T)
    cfireLine_list[[fireDataIdx]] <- cfireLine %>%
      dplyr::rename(timestep="timeStep",cflinelen="length_km",fstate="fstate",fconf="fireConf") %>% 
      mutate(fname=fireName,fyear=inYear,
             tUTC=date2str(stTime_UTC %m+% hours(cfireLine$timeStep)),
             tLocal=date2str(stTime_local %m+% hours(cfireLine$timeStep)),
             tLocalGMT=date2str(stTime_localGMT %m+% hours(cfireLine$timeStep))) %>%
      dplyr::select(fname,fyear,tUTC,tLocal,tLocalGMT,timestep,cflinelen,fconf,fstate)
    
    # rfireLine
    rfireLine <- st_read(paste0(satMode,"/rfireLine/"),paste0(fireNameYr,"_fireLine"),quiet=T)
    rfireLine_list[[fireDataIdx]] <- rfireLine %>%
      dplyr::rename(timestep="timeStep",rflinelen="length_km",fstate="fstate") %>% 
      mutate(fname=fireName,fyear=inYear,
             tUTC=date2str(stTime_UTC %m+% hours(rfireLine$timeStep)),
             tLocal=date2str(stTime_local %m+% hours(rfireLine$timeStep)),
             tLocalGMT=date2str(stTime_localGMT %m+% hours(rfireLine$timeStep))) %>%
      dplyr::select(fname,fyear,tUTC,tLocal,tLocalGMT,timestep,rflinelen,fstate)
    
    # fireIg
    fireIg <- st_read(paste0(satMode,"/fireIg/"),paste0(fireNameYr,"_fireIg"),quiet=T)
    fireIg_list[[fireDataIdx]] <- fireIg %>%
      dplyr::rename(timestep="timeStep",ignitions="ignitions") %>% 
      mutate(fname=fireName,fyear=inYear,
             tUTC=date2str(stTime_UTC %m+% hours(fireIg$timeStep)),
             tLocal=date2str(stTime_local %m+% hours(fireIg$timeStep)),
             tLocalGMT=date2str(stTime_localGMT %m+% hours(fireIg$timeStep))) %>%
      dplyr::select(fname,fyear,tUTC,tLocal,tLocalGMT,timestep,ignitions)
    
    # summary stats
    fireSummary <- read.csv(paste0(satMode,"/summary/",fireNameYr,".csv"))
    
    if (satMode == "gofer_combined") {
      fireSummary_list[[fireDataIdx]] <- fireSummary %>%
        mutate(fname=fireName,fyear=inYear,timestep_hh=(fireSummary$timeStep-0.5),
               fareaPer=area_km2/max(fireSummary$area_km2)*100) %>%
        dplyr::rename(tUTC="time_UTC",tLocal="time_local",tLocalGMT="time_localGMT",timestep="timeStep",
                      farea="area_km2",fperim="perim_km",fareaPer="fareaPer",
                      rflinelen="rfline_km",cflinelen5="cfline5_km",cflinelen10="cfline10_km",
                      cflinelen25="cfline25_km",cflinelen50="cfline50_km",
                      cflinelen75="cfline75_km",cflinelen90="cfline90_km",
                      rfline_fstate="rfline_fst",cfline5_fstate="cfline5_fst",cfline10_fstate="cfline10_fst",
                      cfline25_fstate="cfline25_fst",cfline50_fstate="cfline50_fst",
                      cfline75_fstate="cfline75_fst",cfline90_fstate="cfline90_fst",
                      dfarea="dArea_km2",maefspread="maefspread_kmh",awefspread="awefspread_kmh") %>%
        dplyr::select(fname,fyear,tUTC,tLocal,tLocalGMT,timestep,timestep_hh,
                      farea,fareaPer,fperim,
                      rflinelen,cflinelen5,cflinelen10,
                      cflinelen25,cflinelen50,cflinelen75,cflinelen90,
                      rfline_fstate,cfline5_fstate,cfline10_fstate,
                      cfline25_fstate,cfline50_fstate,cfline75_fstate,cfline90_fstate,
                      dfarea,maefspread,awefspread)
    } else {
      fireSummary_list[[fireDataIdx]] <- fireSummary %>%
        mutate(fname=fireName,fyear=inYear,timestep_hh=(fireSummary$timeStep-0.5),
               fareaPer=area_km2/max(fireSummary$area_km2)*100) %>%
        dplyr::rename(tUTC="time_UTC",tLocal="time_local",tLocalGMT="time_localGMT",timestep="timeStep",
                      farea="area_km2",fareaPer="fareaPer",fperim="perim_km",
                      rflinelen="rfline_km",cflinelen5="cfline5_km",cflinelen10="cfline10_km",
                      cflinelen25="cfline25_km",cflinelen50="cfline50_km",cflinelen75="cfline75_km",
                      rfline_fstate="rfline_fst",cfline5_fstate="cfline5_fst",cfline10_fstate="cfline10_fst",
                      cfline25_fstate="cfline25_fst",cfline50_fstate="cfline50_fst",cfline75_fstate="cfline75_fst",
                      dfarea="dArea_km2",maefspread="maefspread_kmh",awefspread="awefspread_kmh") %>%
        dplyr::select(fname,fyear,tUTC,tLocal,tLocalGMT,
                      timestep,timestep_hh,
                      farea,fareaPer,fperim,
                      rflinelen,cflinelen5,cflinelen10,
                      cflinelen25,cflinelen50,cflinelen75,
                      rfline_fstate,cfline5_fstate,cfline10_fstate,
                      cfline25_fstate,cfline50_fstate,cfline75_fstate,
                      dfarea,maefspread,awefspread)
    }
  }
  
  output_folder <- paste0("../GOFER/",satMode_final)
  ifelse(!file.exists(output_folder),dir.create(output_folder),F)
  
  fireProgShp_list <- do.call(rbind,fireProgShp_list)
  st_write(fireProgShp_list,paste0("../GOFER/",satMode_final,"/",satMode_shortName,"_fireProg.shp"),
           quiet=T,append=F)
  
  cfireLine_list <- do.call(rbind,cfireLine_list)
  st_write(cfireLine_list,paste0("../GOFER/",satMode_final,"/",satMode_shortName,"_cfireLine.shp"),
           quiet=T,append=F)
  
  rfireLine_list <- do.call(rbind,rfireLine_list)
  st_write(fireProgShp_list,paste0("../GOFER/",satMode_final,"/",satMode_shortName,"_rfireLine.shp"),
           quiet=T,append=F)
  
  fireIg_list <- do.call(rbind,fireIg_list)
  if (length(which(st_geometry_type(fireIg_list) %in% "MULTIPOINT")) > 0) {
    fireIg_list <- st_collection_extract(fireIg_list,"POINT")
  }
  st_write(fireIg_list,paste0("../GOFER/",satMode_final,"/",satMode_shortName,"_fireIg.shp"),
           quiet=T,append=F)
  
  fireSummary_list <- do.call(rbind,fireSummary_list)
  write.csv(fireSummary_list,paste0("../GOFER/",satMode_final,"/",satMode_shortName,"_summary.csv"),
            row.names=F)
  
  scaleVal <- read.csv(paste0(satMode,"/fireStats/scaleVal_",str_replace(satMode_shortName,"GOFER",""),".csv"))
  write.csv(fireSummary_list,paste0("../GOFER/",satMode_final,"/",satMode_shortName,"_scaleVal.csv"),
            row.names=F)
  
  print(satMode)
}

