# ============================================
# table_GOFERstats.R
# --------------------------------------------
# make a summary table of all stats for each
# fire
# -> gofer_xxx/summary
# --------------------------------------------
# @author: Tianjia Liu (tliu@ucar.edu)
# ============================================
source("/Users/TLiu/Google Drive/My Drive/github/GOFER/R/globalParams.R")
setwd(tempFolder)

for (satMode in c("gofer_combined","gofer_east","gofer_west")) {
  for (fireDataIdx in 1:nrow(fireData)) {
    fireName <- str_replace_all(fireData$FireName[fireDataIdx]," ","_")
    inYear <- fireData$Year[fireDataIdx]
    fireNameYr <- paste0(fireName,"_",inYear)
    
    fireProgShp <- st_read(paste0(satMode,"/fireProg"),paste0(fireNameYr,"_fireProg"),quiet=T)
    fireProg <- as.data.frame(fireProgShp)
    
    fireStats <- read.csv(paste0(satMode,"/fireStats/",fireNameYr,"_fireProgStats.csv"))
    
    cfireLine <- read.csv(paste0(satMode,"/cfireLine/",fireNameYr,"_fireLine.csv"))
    rfireLine <- st_read(paste0(satMode,"/rfireLine/"),paste0(fireNameYr,"_fireLine"),quiet=T)
    rfireLine_nzeros <- nrow(fireProg)-length(rfireLine$length_km)
    
    stTime_UTC <- ymd_h(fireData$GOES_UTC[fireDataIdx],tz="UTC")
    stTime_local <- with_tz(stTime_UTC,tz=fireData$local_tz[fireDataIdx])
    stTime_localGMT <- with_tz(stTime_UTC,tz=fireData$local_tzGMT[fireDataIdx])
    
    time_UTC <- stTime_UTC %m+% hours(fireProgShp$timeStep)
    time_local <- stTime_local %m+% hours(fireProgShp$timeStep)
    time_localGMT <- stTime_localGMT %m+% hours(fireProgShp$timeStep)
      
    if (satMode == "gofer_combined") {
      fireConf <- c(0.05,0.1,0.25,0.5,0.75,0.9)
    } else {
      fireConf <- c(0.05,0.1,0.25,0.5,0.75)
    }
    
    cfireLine_confAll <- do.call(cbind,tapply(fireConf,fireConf,function(x) {
      cfireLine_conf <- cfireLine[cfireLine$fireConf==x,]
      cfireLine_conf <- cfireLine_conf[order(cfireLine_conf$timeStep),]
      
      return(cfireLine_conf$length_km)
    }))
    
    cfireLine_stateAll <- do.call(cbind,tapply(fireConf,fireConf,function(x) {
      cfireLine_conf <- cfireLine[cfireLine$fireConf==x,]
      cfireLine_conf <- cfireLine_conf[order(cfireLine_conf$timeStep),]
      
      return(cfireLine_conf$fstate)
    }))
    
    if (satMode == "gofer_combined") {
      fireStats_df <- data.frame(timeStep=fireProg$timeStep,
                                 time_UTC=format(time_UTC,"%Y-%m-%d %H:%M:%S"),
                                 time_local=format(time_local,"%Y-%m-%d %H:%M:%S"),
                                 time_localGMT=format(time_localGMT,"%Y-%m-%d %H:%M:%S"),
                                 area_km2=fireProg$area_km2,
                                 perim_km=fireProg$perim_km,
                                 rfline_km=c(rfireLine$length_km,rep(0,rfireLine_nzeros)),
                                 cfline5_km=cfireLine_confAll[,1],
                                 cfline10_km=cfireLine_confAll[,2],
                                 cfline25_km=cfireLine_confAll[,3],
                                 cfline50_km=cfireLine_confAll[,4],
                                 cfline75_km=cfireLine_confAll[,5],
                                 cfline90_km=cfireLine_confAll[,6],
                                 rfline_fst=c(rfireLine$fstate,rep(0,rfireLine_nzeros)),
                                 cfline5_fst=cfireLine_stateAll[,1],
                                 cfline10_fst=cfireLine_stateAll[,2],
                                 cfline25_fst=cfireLine_stateAll[,3],
                                 cfline50_fst=cfireLine_stateAll[,4],
                                 cfline75_fst=cfireLine_stateAll[,5],
                                 cfline90_fst=cfireLine_stateAll[,6],
                                 dArea_km2=fireStats$dArea_km2,
                                 maefspread_kmh=fireStats$mae_spread_kmh,
                                 awefspread_kmh=fireStats$awe_spread_kmh)
    } else {
      fireStats_df <- data.frame(timeStep=fireProg$timeStep,
                                 time_UTC=format(time_UTC,"%Y-%m-%d %H:%M:%S"),
                                 time_local=format(time_local,"%Y-%m-%d %H:%M:%S"),
                                 time_localGMT=format(time_localGMT,"%Y-%m-%d %H:%M:%S"),
                                 area_km2=fireProg$area_km2,
                                 perim_km=fireProg$perim_km,
                                 rfline_km=c(rfireLine$length_km,rep(0,rfireLine_nzeros)),
                                 cfline5_km=cfireLine_confAll[,1],
                                 cfline10_km=cfireLine_confAll[,2],
                                 cfline25_km=cfireLine_confAll[,3],
                                 cfline50_km=cfireLine_confAll[,4],
                                 cfline75_km=cfireLine_confAll[,5],
                                 rfline_fst=c(rfireLine$fstate,rep(0,rfireLine_nzeros)),
                                 cfline5_fst=cfireLine_stateAll[,1],
                                 cfline10_fst=cfireLine_stateAll[,2],
                                 cfline25_fst=cfireLine_stateAll[,3],
                                 cfline50_fst=cfireLine_stateAll[,4],
                                 cfline75_fst=cfireLine_stateAll[,5],
                                 dArea_km2=fireStats$dArea_km2,
                                 maefspread_kmh=fireStats$mae_spread_kmh,
                                 awefspread_kmh=fireStats$awe_spread_kmh)
    }
    
    write.csv(fireStats_df,paste0(satMode,"/summary/",fireNameYr,".csv"),row.names=F)
  }
}
