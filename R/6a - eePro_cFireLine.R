# ============================================
# eePro_cFireLine.R
# --------------------------------------------
# combine cfireLine.shp chunks into a single
# file for each fire and fill in dormant
# timesteps with the most recent active
# cfireLine
# ee_cfireLine_chunks -> gofer_xxx/cfireLine
# --------------------------------------------
# @author Tianjia Liu (embrslab@gmail.com)
# ============================================
source("/Users/TLiu/Google Drive/My Drive/github/GOFER/R/globalParams.R")
setwd(tempFolder)

satMode <- "gofer_combined"

if (satMode == "gofer_combined") {
  confList <- c(5,10,25,50,75,90)
} else {confList <- c(5,10,25,50,75)}

for (iFire in 1:nrow(fireData)) {
  fireName <- fireData$FireName[iFire]
  inYear <- fireData$Year[iFire]
  
  fireDataIdx <- which(fireData$FireName==fireName & fireData$Year==inYear)
  
  fireNameStr <- str_replace_all(fireName," ","_")
  fireNameYr <- paste0(fireNameStr,"_",inYear)
  print(fireNameYr)
  
  fireProg <- st_read(paste0(satMode,"/fireProg"),
                      paste0(fireNameYr,"_fireProg"),quiet=T)
  
  fireLineConf <- list()
  for (iConf in 1:length(confList)) {
    fireLine <- st_read("ee_cfireLine_chunks",
                        paste0(fireNameYr,"_fireLine_c",confList[iConf]),quiet=T)
    st_crs(fireLine) <- st_crs("EPSG:4326")
    
    fireLine$fireConf <- confList[iConf] / 100
    fireLine$length_km <- round(fireLine$length_km,3)
    fireLine <- fireLine[,c("timeStep","length_km","fireConf")]
    
    fireLine_filled <- do.call(rbind,tapply(fireProg$timeStep,fireProg$timeStep,function(timeStep) {
      availTS <- fireLine$timeStep[which(fireLine$timeStep <= timeStep)]
      
      if (length(availTS) > 0) {
        availTSmax <- max(availTS)
        fireLineTS <- fireLine[which(fireLine$timeStep == availTSmax),]
        
        fstate <- 0
        if (availTSmax == timeStep) {fstate <- 1}
        
        fireLineTS$timeStep <- timeStep
        fireLineTS$fstate <- fstate
        
        return(fireLineTS)
      } else (return(NULL))
    }))
    
    fireLineConf[[iConf]] <- fireLine_filled
  }
  fireLineConf <- do.call(rbind,fireLineConf)
  
  st_write(fireLineConf,paste0(satMode,"/cfireLine/",fireNameYr,"_fireLine.shp"),quiet=T,append=F)
}

for (iFire in 1:nrow(fireData)) {
  fireName <- fireData$FireName[iFire]
  inYear <- fireData$Year[iFire]
  
  fireDataIdx <- which(fireData$FireName==fireName & fireData$Year==inYear)
  
  fireNameStr <- str_replace_all(fireName," ","_")
  fireNameYr <- paste0(fireNameStr,"_",inYear)
  
  fireLineConf <- st_read(paste0(satMode,"/cfireLine/"),
                          paste0(fireNameYr,"_fireLine"),quiet=T)
  fireLineConf_df <- as.matrix(fireLineConf)[,c("timeStep","length_km","fireConf","fstate")]
  write.csv(fireLineConf_df,
            paste0(satMode,"/cfireLine/",fireNameYr,"_fireLine.csv"),
            row.names=F)
}
