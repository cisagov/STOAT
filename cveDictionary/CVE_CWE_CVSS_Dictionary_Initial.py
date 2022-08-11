import json
import sys
import os
import urllib.request
import zipfile
from datetime import date 

#Download Year nvdcve JSONs
cveFileList = []
currentYear = int(date.today().year)
for year in range(2002, currentYear + 1):
    try:
        URL = 'https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-' + str(year) + '.json.zip'
        print('Downloading ' + str(year) + '...')
        urllib.request.urlretrieve(URL, 'nvdcve_' + str(year) + '.zip')
    except:
        print('Download Error: Try Again')
        exit(1)

    #Unzip Recent/Modified CSV
    with zipfile.ZipFile('nvdcve_' + str(year) + '.zip', 'r') as zip_ref:
        zip_ref.extractall('.')
    os.remove('nvdcve_' + str(year) + '.zip')
    cveFileList.append('nvdcve-1.1-' + str(year) + '.json')

#Output Files
outputFile = open('CSV_CWE_CVSS_Dictionary.csv','w')

tempLine = []
cweList = []

#Write Header
outputFile.write('CVE' + ',' + 'CWE' + ',' + 'CVSS' + ',' + 'BaseScore' + '\n')

print('Processing...')
for cveFile in cveFileList:
    cveFileTemp = open(cveFile, 'r', encoding='utf8')
    json_dict = json.load(cveFileTemp)
    for j in json_dict["CVE_Items"]:
        tempLine = []
        cweList = []
        cvssString = ''
        cvssScore = ''
        
        #Collect CVSS Scores
        try:
            cvssString = j["impact"]["baseMetricV2"]["cvssV2"]["vectorString"]
            cvssBaseScore = str(j["impact"]["baseMetricV2"]["cvssV2"]["baseScore"])

        except:
            pass
            
        try:
            cvssString = j["impact"]["baseMetricV3"]["cvssV3"]["vectorString"]
            cvssBaseScore = str(j["impact"]["baseMetricV3"]["cvssV3"]["baseScore"])
        except:
            pass
        
        #Collect CVE
        tempLine.append(j["cve"]["CVE_data_meta"]["ID"])
        
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
        if len(cweList) > 0 or len(cvssString) > 0:
            outputFile.write(''.join(tempLine) + ',' + ':'.join(cweList) + ',' + cvssString + ',' + cvssBaseScore + '\n')
            
    cveFileTemp.close()   
outputFile.close()

#Cleanup Files
for year in range(2002, currentYear + 1):
    os.remove('nvdcve-1.1-' + str(year) + '.json')