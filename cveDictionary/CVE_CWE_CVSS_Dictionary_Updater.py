import json
import sys
import os
import urllib.request
import zipfile
import csv

finalList = []

#Load & Parse File to update
try:
    inputFile = sys.argv[1]
except:
    print('Error: Missing Arguments')
    print('Usage: python CVE_CWE_CVSS_Dictionary_Updater.py <CSV Dictionary File>')
    exit(1)

#Download Recent/Modified CSV
try:
    URL = 'https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-recent.json.zip'
    print('Downloading Recent...')
    urllib.request.urlretrieve(URL, 'nvdcve_recent.zip')
    URL = 'https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-modified.json.zip'
    print('Downloading Modified...')
    urllib.request.urlretrieve(URL, 'nvdcve_modified.zip')
except:
    print('Download Error: Try Again')
    exit(1)

#Unzip Recent/Modified CSV
with zipfile.ZipFile('nvdcve_recent.zip', 'r') as zip_ref:
    zip_ref.extractall('.')
os.remove('nvdcve_recent.zip')
with zipfile.ZipFile('nvdcve_modified.zip', 'r') as zip_ref:
    zip_ref.extractall('.')
os.remove('nvdcve_modified.zip')

#Parse Recent/Modified File
cveID = []
cweList = []

csvFileList = ['nvdcve-1.1-recent.json','nvdcve-1.1-modified.json']

print('Processing...')
for csvFile in csvFileList:
    #Temp Output File
    tempFile = open(csvFile.split('.')[1] + '.csv', 'w', newline='', encoding='utf8')
    csvwriter = csv.writer(tempFile)
    fields = ['CVE','CWE','CVSS']
    csvwriter.writerow(fields)    

    json_dict = json.load(open(csvFile, 'r', encoding='utf8'))
    for j in json_dict["CVE_Items"]:
        cveID = []
        cweList = []
        cvssString = ''
        
        #Collect CVSS Scores
        try:
            cvssString = j["impact"]["baseMetricV2"]["cvssV2"]["vectorString"]
        except:
            pass
            
        try:
            cvssString = j["impact"]["baseMetricV3"]["cvssV3"]["vectorString"]
        except:
            pass
        
        #Collect CVE
        cveID.append(j["cve"]["CVE_data_meta"]["ID"])
        
        #Collect CWEs
        for i in range(len(j["cve"]["problemtype"]["problemtype_data"])):
            for k in range(len(j["cve"]["problemtype"]["problemtype_data"][i]["description"])):
                if 'NVD-CWE-Other' in j["cve"]["problemtype"]["problemtype_data"][i]["description"][k]["value"]:
                    continue
                elif 'NVD-CWE-noinfo' in j["cve"]["problemtype"]["problemtype_data"][i]["description"][k]["value"]:
                    continue
                else:
                    cweList.append(j["cve"]["problemtype"]["problemtype_data"][i]["description"][k]["value"])
                    
        #Dont include just single new CVE IDs
        if len(cweList) > 0 and len(cvssString) > 0:
            tempList = []
            tempList.append(''.join(cveID))
            tempList.append(':'.join(cweList))
            tempList.append(cvssString)
            csvwriter.writerow(tempList)
    tempFile.close()
            
#Read in both csvs
#Load Original and Recent/Modified CSV files as Dictionary
fh1 = open(inputFile)
originalDict = csv.DictReader(fh1, delimiter=',')

fh2 = open('1-modified.csv')
modifiedDict = csv.DictReader(fh2, delimiter=',')

fh3 = open('1-recent.csv')
recentDict = csv.DictReader(fh3, delimiter=',')

#Merge Results
#Add all Modified to FinalList
for modifiedRow in modifiedDict:
    finalList.append(modifiedRow)

#Add lines with new CVE ID to List
finalListString = str(finalList)
for recentRow in recentDict:
    if recentRow['CVE'] not in finalListString:
        finalList.append(recentRow)
        
origCount = 0
finalListString = str(finalList)
for origRow in originalDict:
    origCount = origCount + 1
    if origRow['CVE'] not in finalListString:
        finalList.append(origRow)

print()
print('Original: ' + str(origCount))
print('Final: ' + str(len(finalList)))
print('Added: ' + (str(len(finalList) - origCount)))

fh1.close()
fh2.close()
fh3.close()

#Delete Original File
os.remove(inputFile)

#Output Files
outputFile = open(inputFile,'w', encoding='utf8')
outputFile.write('CVE,CWE,CVSS\n')
for i in range(len(finalList)):
    outputFile.write(finalList[i]['CVE'] + ',' + finalList[i]['CWE'] + ',' + finalList[i]['CVSS'] + '\n')

#Cleanup Files
outputFile.close()
os.remove('nvdcve-1.1-recent.json')
os.remove('nvdcve-1.1-modified.json')
os.remove('1-modified.csv')
os.remove('1-recent.csv')