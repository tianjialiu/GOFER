# ============================================
# eePro_ParamSens.R
# --------------------------------------------
# combine paramSens.csv chunks into a single
# file for each fire and calculate the
# optimized confidence threshold and
# parallax adjustment factor
# ee_paramSens_chunks -> gofer_xxx/paramSens
# --------------------------------------------
# @author: Tianjia Liu (tliu@ucar.edu)
# ============================================
source("/Users/TLiu/Google Drive/My Drive/github/GOFER/R/globalParams.R")
setwd(tempFolder)

satMode <- "gofer_combined"

eePro <- T
calc_params <- T

if (eePro == T) {
  inputFolder <- "ee_paramSens_chunks"
  inFires <- unique(do.call(rbind,strsplit(dir(inputFolder),"_paramSens"))[,1])
  
  for (iFire in 1:length(inFires)) {
    inFiles <- dir(inputFolder,inFires[iFire])
    print(length(inFiles))
    fireAll <- list()
    for (iFile in 1:length(inFiles)) {
      fireAll[[iFile]] <- read.csv(paste0(inputFolder,"/",inFiles[iFile]))
    }
    fireAll <- do.call(rbind,fireAll)
    write.csv(fireAll,paste0(satMode,"/paramSens/",
                             inFires[iFire],"_paramSens.csv"),row.names=F)
  }
}

if (calc_params == T) {
  inFiles <- dir(paste0(satMode,"/paramSens/"))
  meanIOU <- list(); bestIOU <- c()
  for (iFile in 1:length(inFiles)) {
    fireParam <- read.csv(paste0(satMode,"/paramSens/",inFiles[iFile]))
    bestIOU[iFile] <- max(fireParam$IOU)
    meanIOU[[iFile]] <- fireParam$IOU
  }
  meanIOU <- do.call(cbind,meanIOU)
  
  inputParam <- rowMeans(meanIOU)
  bestIdx <- which(inputParam==max(inputParam))
  
  print("optimized confidence threshold:")
  print(fireParam$confThresh[bestIdx])
  
  print("optimized parallax adjustment factor:")
  print(fireParam$parallaxAdjFac[bestIdx])
}
