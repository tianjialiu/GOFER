# ============================================
# eePro_rFireLine.R
# --------------------------------------------
# fill in dormant timesteps with the most
# recent immediate active rfireLine after
# the current timestep
# ee_rfireLine -> gofer_xxx/rfireLine
# --------------------------------------------
# @author Tianjia Liu (embrslab@gmail.com)
# ============================================
source("/Users/TLiu/Google Drive/My Drive/github/GOFER/R/globalParams.R")
setwd(tempFolder)

satMode <- "gofer_combined"

for (iFire in 1:nrow(fireData)) {
  fireName <- fireData$FireName[iFire]
  inYear <- fireData$Year[iFire]
  
  fireDataIdx <- which(fireData$FireName==fireName & 
                         fireData$Year==inYear)
  
  fireNameStr <- str_replace_all(fireName," ","_")
  fireNameYr <- paste0(fireNameStr,"_",inYear)
  print(paste(fireName,inYear))
  
  inFolder <- "ee_rfireLine"
  outFolder <- paste0(satMode,"/rfireLine")
  
  fireLineShp <- st_read(inFolder,paste0(fireNameYr,"_fireLine"),quiet=T)
  
  fireLineStats <- read.csv(paste0(inFolder,"/",fireNameYr,"_fireLine.csv"))
  fireLineStats$fstate <- 0
  fireLineStats$fstate[which(fireLineStats$length_km>0)] <- 1
  
  maxTS <- max(fireLineShp$timeStep[fireLineShp$length_km > 0])
  
  # cut off extraneous timesteps after the fire line is extinguished
  fireLineShp <- fireLineShp[1:maxTS,]
  fireLineShp <- fireLineShp[order(fireLineShp$timeStep),]
  fireLineStats <- fireLineStats[1:maxTS,]
   
  fireLineShp_filled <- do.call(rbind,tapply(fireLineStats$timeStep,fireLineStats$timeStep,function(timeStep) {
    fireLineTS <- fireLineShp[which(fireLineShp$timeStep >= timeStep),][1,]
    fireLineStatsTS <- fireLineStats[which(fireLineStats$timeStep == timeStep),]
    
    fireLineTS$timeStep <- timeStep
    fireLineTS$fstate <- fireLineStatsTS$fstate
    
    return(fireLineTS)
  }))
  
  fireLineShp_filled <- fireLineShp_filled[,c("timeStep","timeStep2","length_km","perim_km","fstate","geometry")]
  fireLineStats_filled <- data.frame(fireLineShp_filled)[,-ncol(fireLineShp_filled)]
    
  st_write(fireLineShp_filled,paste0(outFolder,"/",fireNameYr,"_fireLine.shp"),append=F,quiet=T)
  write.csv(fireLineStats_filled,paste0(outFolder,"/",fireNameYr,"_fireLine.csv"),row.names=F)
}
