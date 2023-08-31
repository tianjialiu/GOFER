# ============================================
# eePro_FireProg.R
# --------------------------------------------
# combine fireProg.shp chunks into a single
# file for each fire and view a quick
# plot of the fire progression
# ee_fireProg_chunks -> ee_fireProg_temp
# --------------------------------------------
# @author: Tianjia Liu (tliu@ucar.edu)
# ============================================
source("/Users/TLiu/Google Drive/My Drive/github/GOFER/R/globalParams.R")
setwd(tempFolder)

processMode <- T # process and combine chunks
plotMode <- T # quick plot of fire progression

for (iFire in 1:nrow(fireData)) {
  fireName <- fireData$FireName[iFire]
  inYear <- fireData$Year[iFire]

  fireDataIdx <- which(fireData$FireName==fireName & 
                         fireData$Year==inYear)
  
  fireNameStr <- str_replace_all(fireName," ","_")
  fireNameYr <- paste0(fireNameStr,"_",inYear)
  
  inFolder <- "ee_fireProg_chunks"
  outFolder <- "ee_fireProg_temp"
  
  print("=============")
  print(paste(fireName,inYear))
  
  if (processMode == T) {
    fireList <- str_replace(dir(inFolder,paste0(fireNameStr,".*\\.shp")),".shp","")
    
    # print missing chunks
    print(paste("nChunks:",length(fireList)))
    
    maxHour <- fireData$GOES_nHour[fireDataIdx]; hrInt <- 24
    hourBounds <- do.call(rbind,strsplit(do.call(rbind,strsplit(fireList,"_s"))[,2],"e"))
    print(paste0(seq(1,maxHour,hrInt)[!seq(1,maxHour,hrInt) %in% hourBounds[,1]],collapse=","))
    
    fireShp <- list()
    for (iChunk in 1:length(fireList)) {
      fireShp[[iChunk]] <- st_read(inFolder,fireList[iChunk],quiet=T)
      st_crs(fireShp[[iChunk]]) <- st_crs(raster())
      if (iChunk %% 10 == 0 | iChunk == length(fireList)) {print(paste(iChunk,"/",length(fireList)))}
    }
    
    fireShp <- do.call(rbind,fireShp)[,c("timeStep","area_km2")]
    fireShp <- fireShp[order(fireShp$timeStep),]
    
    # cut off extraneous timesteps after fire stops growing
    dArea <- data.frame(timeStep=fireShp$timeStep[-1],
                        dArea=round(fireShp$area_km2[-1]-fireShp$area_km2[-nrow(fireShp)],3))
    
    maxTSoriginal <- max(fireShp$timeStep)
    maxTS <- max(dArea$timeStep[dArea$dArea > 0])
    print(paste("max timestep (original):",maxTSoriginal))
    print(paste("max timestep (new):",maxTS))
                
    fireShp <- fireShp[1:which(fireShp$timeStep == maxTS),]
    
    st_write(fireShp,paste0(outFolder,"/",fireNameYr,"_fireProg.shp"),append=F,quiet=T)
  }
  
  if (plotMode == T) {
    fireShp <- st_read("ee_fireProg_temp",paste0(fireNameYr,"_fireProg"),quiet=T)
    
    colPal <- colorRampPalette(c("#2b83ba","#64abb0","#9dd3a7","#c7e9ad",
                                 "#edf8b9","#ffedaa","#fec980",
                                 "#f99e59","#e85b3a","#d7191c"))(1000)[-1]
    
    fireShp <- fireShp[!duplicated(fireShp$area_km2),]
    
    per_tArea_time <- fireShp$timeStep
    p95ts <- per_tArea_time[which(fireShp$area_km2 > max(fireShp$area_km2)*0.95)[1]]
    per_tArea_time <- per_tArea_time/p95ts*100
    
    fireShp$per_tArea_time <- per_tArea_time
    fireShp$group <- max(fireShp$timeStep)-fireShp$timeStep
    fireShp <- fireShp[order(fireShp$group),]
    
    gg_fireProg <- ggplot() +
      geom_sf(data=fireShp[1,], fill="black") +
      geom_sf(data=fireShp,aes(group=group,color=per_tArea_time),linewidth=0.5,fill=NA) +
      scale_colour_gradientn(colors=colPal,limits=c(0,100),breaks=c(0,25,50,75,100),
                             oob=scales::squish,
                             labels=c("0","25","50","75","100 %")) +
      theme_void() +
      ggtitle(str_replace_all(fireName,"_"," ")) +
      theme(legend.text=element_text(size=12),legend.position='hidden',
            panel.grid.major=element_line(colour="transparent"),
            plot.title=element_text(size=16,face="bold",hjust=0.5,margin=ggplot2::margin(8,0,0,0)))
    
    plot(gg_fireProg)
  }
}
