import time
import os

print("Sleeping")
time.sleep(2)

print("Sleeping again")
time.sleep(4)

print("Done sleeping")
time.sleep(1)

print("Renaming file...")
os.rename('/home/georcr/stoat/CSV_CWE_CVSS_Dictionary1.csv', '/home/georcr/stoat/CSV_CWE_CVSS_Dictionary.csv')
