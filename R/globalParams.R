library("raster"); library("tidyverse"); library("sf"); library("lemon"); library("stringr")

projFolder <- "/Users/TLiu/Google Drive/My Drive/WestUSFires/"
tempFolder <- file.path(projFolder,"GOES")
dataFolder <- file.path(projFolder,"GOFER")

setwd(tempFolder)
fireData <- read.csv("fireData.csv",stringsAsFactors=F)
