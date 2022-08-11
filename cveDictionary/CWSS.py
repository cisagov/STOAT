#Takes a CWSS Vector as a commandline input and outputs a CWSS score
#Usage: python CWSS.py "TI:M,0.6/AP:A,1.0/AL:A,1.0/IC:N,1.0/FC:T,1.0/RP:RU,0.7/RL:A,1.0/AV:I,1.0/AS:W,0.9/IN:A,1.0/SC:NA,1.0/BI:L,0.3/DI:NA,1.0/EX:NA,1.0/EC:N,1.0/RE:NA,1.0/P:NA,1.0"

import sys

def CWSSScore(inputVector):
    #Constants
    NA = 1.0
    UNK = 0.5

    #Metric Variables
    TI = NA
    AP = NA
    AL = NA
    FC = NA
    IC = NA
    RP = NA
    RL = NA
    AV = NA
    SC = NA
    IN = NA
    AS = NA
    RE = NA
    BI = NA
    DI = NA
    EX = NA
    P = NA
    EC = NA

    #Parse CWSSVector
    inputVector = inputVector.split('/')
    for metricString in inputVector:
        metricName = metricString.split(':')[0]
        metricScore = float(metricString.split(',')[1])
        
        if metricName == 'TI':
            TI = metricScore
        elif metricName == 'AP':
            AP = metricScore
        elif metricName == 'AL':
            AL = metricScore
        elif metricName == 'FC':
            FC = metricScore
        elif metricName == 'IC':
            IC = metricScore
        elif metricName == 'RP':
            RP = metricScore
        elif metricName == 'RL':
            RL = metricScore
        elif metricName == 'AV':
            AV = metricScore
        elif metricName == 'SC':
            SC = metricScore
        elif metricName == 'IN':
            IN = metricScore
        elif metricName == 'AS':
            AS = metricScore
        elif metricName == 'RE':
            RE = metricScore
        elif metricName == 'BI':
            BI = metricScore
        elif metricName == 'DI':
            DI = metricScore
        elif metricName == 'EX':
            EX = metricScore
        elif metricName == 'P':
            P = metricScore
        elif metricName == 'EC':
            EC = metricScore
        else:
            print('Unknown Metric Name')

    FofTI = 1.0
    if TI == 0:
        FofTI = 0
        
    FofBI = 1.0
    if BI == 0:
        FofBI = 0

    #Calculate CWSS Score
    Base = ((10 * TI + 5*(AP + AL) + 5*FC) * FofTI * IC) * 4.0
    AttackSurface = (20*(RP + RL + AV) + 20*SC + 15*IN + 5*AS) / 100.0
    Environmental = (((10*BI + 3*DI + 4*EX + 3*P) * FofBI) * EC) / 20.0
    CWSS = Base * AttackSurface * Environmental
    CWSS = round(CWSS, 2)
    
    return CWSS

CWSS = CWSSScore(sys.argv[1])    
print(CWSS)
