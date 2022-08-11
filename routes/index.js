/*
  routes/index.js

  This file defines each route and the functions used to process each request.

*/

var express = require('express');
var router = express.Router();
var OrientDB = require('orientjs')
let schema = require('../db/schema.json');
let cliProgress = require('cli-progress');
let uuid = require('uuid')
let fs = require('fs')
let nthline = require('nthline')
let {PythonShell} = require('python-shell')
let pythonOpts = {
  mode: 'text',
  //pythonPath: '/bin/bash',
  pythonOptions: ['-u'],
  scriptsPath: '../cveDictionary'
}
let axios = require('axios')

//queryCveApi(['CVE-2020-26951', 'CVE-1999-1234', 'CVE-2018-10005'], null)

const CVE_DICTIONARY = __dirname + "/../CSV_CWE_CVSS_Dictionary.csv"
const CWE_DICTIONARY = __dirname + "/../cweDictionary.csv"

let emvPresets = require('../db/presets/emvPresets.json')
let attackSurfacePresets = require('../db/presets/attackSurfacePresets.json')
let structurePresets = require('../db/presets/structurePresets.json')
let cwePresets = require('../db/presets/cwePresets.json')

// Profile constants
const CWE_CVE_PROFILE = 'vulnerability'
const ATTACK_SURFACE_PROFILE = 'attack'
const STRUCTURE_PROFILE = 'structure'

// CVSS scores
const cvss = require('../db/cvss.json');
const { resolve } = require('path/posix');

// Initialize the database
let server = null;
let db = null;
initServer()//.then(() => initDb());

/*
 * Databases
 * Gets a list of databases
 */
router.get('/databases', async (req, res) => {
  try {
    let dbList = await server.list()

    let dbNames = []
    for (let i = 0; i < dbList.length; i++) {
      dbNames.push(dbList[i].name)
    }
    console.log(dbNames)
    res.send(JSON.stringify({databases: dbNames, currentDb: process.env.DB_NAME}))
  } catch (e) {
    console.error(e)
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Set Database
 * Set which database to use
 */
router.post('/setdatabase', async (req, res) => {
  try {
    console.log(req.body)
    
      let dbList = await server.list()

      //Check if database exists
      if (dbList.some(db => db.name === req.body.database)) {

        try {
          // Use existing database
          let temp = await server.use({
            name: req.body.database,
            username: process.env.ORIENT_USER,
            password: process.env.ORIENT_PASS   
          })

          // Check if database is valid
          if (await checkSchema(await temp.query("select expand(classes) from metadata:schema"))) {

            // Initialize database connection
            process.env.DB_NAME = req.body.database
            // process.env.ORIENT_USER = req.body.username
            // process.env.ORIENT_PASS = req.body.password

            initDb()

            res.send(JSON.stringify({valid: true, currentDb: process.env.DB_NAME}))

          } else {
            res.send(JSON.stringify({valid: false, message: "Database incompatible with STOAT."}))
          }
        } catch (e) {
            console.error(e)
            res.send(JSON.stringify({valid: false, message: "Invalid username or password."}))
        }

      } else {
        console.log("Database doesn't exist. Creating new db ", req.body.database)

        // Create new database
        process.env.DB_NAME = req.body.database
        process.env.ORIENT_USER = req.body.username
        process.env.ORIENT_PASS = req.body.password

        initDb().then(async () => {
          res.send(JSON.stringify({valid: true, currentDb: process.env.DB_NAME}))
        })
      }  
    } catch (e) {
      console.error(e) 
      res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
    }
})

/*
 * Create Score
 * req: cis, configuration, profile, bundle
 * Creates new CIS from the supplied data.
 */
router.post('/createScore', async (req, res) => {
  let profile = req.body.profile

  if (profile == ATTACK_SURFACE_PROFILE) {
    createDefaultStixScore(req, res)
  } else if (profile == STRUCTURE_PROFILE) {
    createDefaultStixScore(req, res)
  } else if (profile == CWE_CVE_PROFILE) {
    createCweScore(req, res)
  } else {
    createDefaultScore(req, res)
  }

})

/*
 * Create Default Score
 * Creates a score with the EMV profile
 */
async function createDefaultScore(req, res) {
  try {
    let cis = req.body.cis;
    let config = req.body.configuration
    let profile = req.body.profile

    let presets = emvPresets;

    let valid = true

    let verifyList = ['name', 'description', 'criteriaSet', 'status']

    verifyList.forEach(prop => {
      if (cis[prop] == '' || cis[prop] == null) {
        valid = false
        console.log('Error: ', prop, ' is null')
      } else {
        valid = true && valid 
      }
    })

    if (valid) {
      // Create vertex
      let newCIS = await db.create('VERTEX', 'CIS').set({
        name: cis.name,
        description: cis.description,
        configuration: config,
        criteriaSet: cis.criteriaSet,
        status: cis.status,
        jsonRep: cis.jsonRep,
        profile: profile
      }).one()

      let cisID = newCIS['@rid']
      await db.create('EDGE', 'belongs_to')
        .from(cisID)
        .to(config).one()

      let criteria = null
      if (cis.jsonRep) {
        console.log(cis.jsonRep)
        criteria = (JSON.parse(cis.jsonRep)).criteriaDefault
        console.log(criteria)
      } else {
        criteria = presets.default
      }
      
      // Create categories
      for (const catObj of criteria) {

        category = await db.create('VERTEX', 'Category')
        .set({
          name: catObj.category,
          total_score: catObj.total_score ? catObj.total_score : 0,
          memo: catObj.memo ? catObj.memo : ''
        }).one();

        categoryId = category['@rid'];
        categoryOf = await db.create('EDGE', 'category_of')
        .from(categoryId).to(cisID).one();

        // Create Characteristics
        for (const charObj of catObj.characteristics) {
          characteristic = await db.create('VERTEX', 'Characteristic')
          .set({
            name: charObj.characteristic,
            total_score: charObj.total_score ? charObj.total_score : 0,
            weight: charObj.weight
          }).one()

          characteristicID = characteristic['@rid'];
          characteristicOf = await db.create('EDGE', 'characteristic_of')
          .from(characteristicID).to('#' + categoryOf.out.cluster + ':' + categoryOf.out.position).one();

          //Create attributes
          for (const attObj of charObj.attributes) {
            attribute = await db.create('VERTEX', 'Attribute')
            .set({
                name: attObj.attribute,
                score: attObj.score ? attObj.score : 0,
                user_weight: attObj.user_weight ? attObj.user_weight : 1,
                weighted_score: attObj.weighted_score ? attObj.weighted_score : 0
            }).one();

            attributeID = attribute['@rid'];
            attributeOf = await db.create('EDGE', 'attribute_of')
            .from(attributeID).to('#' + characteristicOf.out.cluster + ':' + characteristicOf.out.position).one();

            //Create Score Guidances
            for (const scoreObj of attObj.scores) {
                score = await db.create('VERTEX', 'Score')
                .set({
                    description: scoreObj.description,
                    score: scoreObj.score,
                    chosen: scoreObj.chosen ? scoreObj.chosen : false
                }).one();

                scoreID = score['@rid'];
                scoreOf = await db.create('EDGE', 'score_guidance_of')
                .from(scoreID).to('#' + attributeOf.out.cluster + ':' + attributeOf.out.position).one().then();
            }
          }
        }
      }

      await updateJsonRep(cisID);
      const curCIS = await db.select().from(cisID.toString()).one()
      res.send(JSON.stringify(curCIS))

    } else {
      res.status(400)
      res.end()
    }  
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
}


/*
 * Create Default STIX Score
 * Creates a score with a STIX bundle according to the profile
 */
async function createDefaultStixScore(req, res) {
  try {

    // Create progress bar
    const progBar = new cliProgress.SingleBar({format: (options, params, payload) => {
      let progress = (params.progress * 100).toFixed(0)

      res.write('|' + JSON.stringify({task: payload.task + ' (' + params.value + '/' + params.total + ')', progress: progress}))

      const bar = options.barCompleteString.substr(0, Math.round(params.progress*options.barsize)) + options.barIncompleteString.substr(0, Math.round(options.barsize*(1-params.progress)));

      return `[${bar}] ${progress}% | ETA: ${params.eta}s | ${params.value}/${params.total} | ${payload.task}`
    }}, cliProgress.Presets.legacy);

    let cis = JSON.parse(req.body.cis);
    let config = req.body.configuration
    let profile = req.body.profile

    let bundle = req.files.bundle.data.toString()

    let presets = null

    if (profile == 'attack') {
      presets = attackSurfacePresets;
    } else if (profile == 'structure') {
      presets = structurePresets;
    } else if (profile == 'vulnerability') {
      presets = cwePresets;
    } else {
      presets = emvPresets;
    }

    console.log("CIS: ", cis)

    let valid = true

    let verifyList = ['name', 'description', 'criteriaSet', 'status']

    verifyList.forEach(prop => {
      if (cis[prop] == '' || cis[prop] == null) {
        valid = false
        console.log('Error: ', prop, ' is null')
      } else {
        valid = true && valid 
      }
    })

    if (valid) {

      // Check for Vulnerabilities
      let stixBundle = JSON.parse(bundle);
      let vulnArray = stixBundle.objects.filter(obj => {
        return obj.type === 'vulnerability'
      })

      if (vulnArray.length == 0) {
        // No vulnerabilities found.
        res.send('|' + JSON.stringify({valid: false, message: 'No vulnerabilities found in the bundle.'}))
      } else {

        let vulnerabilities = []

        // Check for CVE/CWE ids
        for (const vuln of vulnArray) {
          //Find CVE/CWE name
          let regex = /(CVE-\d\d\d\d-\d\d\d\d\d?)|(CWE-\d*)/
          // Search the name first
          let results = regex.exec(vuln.name)

          if (!results) {
            // ID wasn't found in the name. Search the external references.

            if (vuln.external_references) {
              vuln.external_references.forEach(ref => {
                // Check the external source name
                let refResults = regex.exec(ref.source_name)
                
                if (!refResults)  {
                  // Check the external source id
                  refResults = regex.exec(ref.external_id)

                  if (refResults) {
                    results = results ? results.concat(refResults) : refResults
                  }
                } 
              })
            }
          }

          // Add new values after deleting duplicates and undefined values
          if (results) {
            vulnerabilities = [...new Set(vulnerabilities.concat(results.filter(r => r !== undefined)))]
          }
          
        }

        if (vulnerabilities.length > 0) {
          let numAttributes = 0
          let numChosen = 0

          // Create vertex
          let newCIS = await db.create('VERTEX', 'CIS').set({
            name: cis.name,
            description: cis.description,
            configuration: config,
            criteriaSet: cis.criteriaSet,
            status: cis.status,
            jsonRep: cis.jsonRep,
            bundle: bundle,
            profile: profile
          }).one()

          let cisID = newCIS['@rid']
          await db.create('EDGE', 'belongs_to')
            .from(cisID)
            .to(config).one()

          let criteria = null
          if (cis.jsonRep) {
            console.log(cis.jsonRep)
            criteria = (JSON.parse(cis.jsonRep)).criteriaDefault
            console.log(criteria)
          } else {
            criteria = presets.default
          }     

          console.log(`Found ${vulnerabilities.length} vulnerabilities.`)
          progBar.start(vulnerabilities.length, 0, {task: 'Processing vulnerabilities'})
          for (const v of vulnerabilities) { 

              let vulnerability = await db.create('VERTEX', 'Vulnerability').set({
                name: v,
                description: "", // Description can be found after the CVE API is implemented
                total_score: 0
              }).one()

              let vulnID = vulnerability['@rid']

              await db.create('EDGE', 'vulnerability_of').from(vulnID).to(cisID).one()

              
              // Create categories
              for (const catObj of criteria) {
                category = await db.create('VERTEX', 'Category')
                .set({
                  name: catObj.category,
                  total_score: catObj.total_score ? catObj.total_score : 0,
                  memo: catObj.memo ? catObj.memo : ''
                }).one();

                categoryId = category['@rid'];
                categoryOf = await db.create('EDGE', 'categ_of')
                .from(categoryId).to(vulnID).one();

                // Create Characteristics
                let catScore = 0
                for (const charObj of catObj.characteristics) {
                  characteristic = await db.create('VERTEX', 'Characteristic')
                  .set({
                    name: charObj.characteristic,
                    total_score: charObj.total_score ? charObj.total_score : 0,
                    weight: charObj.weight
                  }).one()

                  characteristicID = characteristic['@rid'];
                  characteristicOf = await db.create('EDGE', 'characteristic_of')
                  .from(characteristicID).to('#' + categoryOf.out.cluster + ':' + categoryOf.out.position).one();

                  //Create attributes
                  let charScore = 0
                  for (const attObj of charObj.attributes) {

                    numAttributes++

                    attribute = await db.create('VERTEX', 'Attribute')
                    .set({
                        name: attObj.attribute,
                        score: attObj.score ? attObj.score : 0,
                        user_weight: attObj.user_weight ? attObj.user_weight : 1,
                        weighted_score: attObj.weighted_score ? attObj.weighted_score : 0
                    }).one();

                    attributeID = attribute['@rid'];
                    attributeOf = await db.create('EDGE', 'attribute_of')
                    .from(attributeID).to('#' + characteristicOf.out.cluster + ':' + characteristicOf.out.position).one();
                    
                    let attScore = 0
                    //Create Score Guidances
                    for (const scoreObj of attObj.scores) {
                        score = await db.create('VERTEX', 'Score')
                        .set({
                            description: scoreObj.description,
                            score: scoreObj.score,
                            chosen: scoreObj.chosen ? scoreObj.chosen : false,
                            default: scoreObj.chosen ? scoreObj.chosen : false
                        }).one();
                        if (scoreObj.chosen) {
                          numChosen++

                          //console.log('Setting score: ', scoreObj.description, scoreObj.score)
                          attScore = scoreObj.score
                        }

                        scoreID = score['@rid'];
                        scoreOf = await db.create('EDGE', 'score_guidance_of')
                        .from(scoreID).to('#' + attributeOf.out.cluster + ':' + attributeOf.out.position).one().then();
                    }

                    if (attScore != 0) {
                      let weight = attObj.user_weight ? attObj.user_weight : 1
                      let weightedScore = (attScore * weight)
                      charScore += weightedScore
                      //console.log(charScore)
                      //console.log('Updating att score: ', attObj.attribute, weightedScore)
                      await db.update(attributeID).set({score: attScore, weighted_score: weightedScore.toFixed(2)}).one()
                      //console.log('Score updated: ', await db.select('score').from(attributeID).one())
                    }
                    
                  }

                  if (charScore != 0) {
                    let weight = charObj.weight ? charObj.weight : 1
                    let weightedScore = (charScore * weight)
                    catScore += weightedScore
                    //console.log('Updating char score: ', charObj.characteristic, weightedScore)
                    await db.update(characteristicID).set({total_score: charScore, weighted_score: weightedScore.toFixed(2)}).one()
                    //console.log('Score updated: ', await db.select('total_score').from(characteristicID).one())
                  }

                }

                if (catScore != 0) {
                  //console.log('Updating cat score: ', catObj.category, catScore)
                  await db.update(categoryId).set({total_score: catScore}).one()
                }
              }

              await db.update(vulnID).set({totalAttributes: numAttributes, totalChosen: numChosen, totalDefault: numChosen}).one()

              progBar.increment({task: `Creating vulnerability ${v} (${vulnerabilities.findIndex(v) + 1} / ${vulnerabilities.length})`})
          }

          updateJsonRepBundle(cisID).then(async () => {
            progBar.update(vulnerabilities.length);
            res.write('|' + JSON.stringify({valid: true, cis: cisID.toString()}))
            res.end()
          });        
        } else {
          await db.delete('VERTEX', 'CIS').where(`@rid = ${cisID.toString()}`).one()
          console.log("No CIS created. Vulnerabilities did not have CVE/CWE ids.")
          res.write('|' + JSON.stringify({valid: false, message: "No CVE/CWEs found in vulnerabilities."}))
          res.end()
        }
        
      }

    } else {
      res.status(400)
      res.end()
    }  

    progBar.stop();
  } catch (e) {
    console.error(e)

    res.send("|" + JSON.stringify({valid: false, message: 'Something went wrong while processing the STIX bundle. Check the server logs for more details.'}))
  }
}

/*
 * Create CWE/CVE score
 *  
 * Creates a score according to the CWE/CVE profile
 */
async function createCweScore(req, res) {
  try {
    let cis = JSON.parse(req.body.cis);
    let config = req.body.configuration

    let bundle = JSON.parse(req.files.bundle.data.toString())

    // Create progress bar
    const progBar = new cliProgress.SingleBar({format: (options, params, payload) => {
      let progress = (params.progress * 100).toFixed(0)

      res.write('|' + JSON.stringify({task: payload.task, progress: progress}))

      const bar = options.barCompleteString.substr(0, Math.round(params.progress*options.barsize)) + options.barIncompleteString.substr(0, Math.round(options.barsize*(1-params.progress)));

      return `[${bar}] ${progress}% | ETA: ${params.eta}s | ${params.value}/${params.total} | ${payload.task}`
    }}, cliProgress.Presets.legacy);


    // Find CVE ids from the bundle
    let vulnArray = bundle.objects.filter(obj => {
      return obj.type === 'vulnerability'
    })

    progBar.start(100, 0, {task: 'Parsing vulnerabilities'})

    let vulnerabilities = []

    if (vulnArray.length == 0) {
      // No vulnerabilities found.
      progBar.stop()
      res.send('|' + JSON.stringify({valid: false, message: 'No vulnerabilities found in the bundle.'}))
    } else {

      // Check for CVE ids
      for (let vuln of vulnArray) {
        //Find CVE name
        let regex = /(CVE-\d\d\d\d-\d\d\d\d\d?)/
        // Search the name first
        let results = regex.exec(vuln.name)

        if (!results) {
          // ID wasn't found in the name. Search the external references.

          if (vuln.external_references) {
            vuln.external_references.forEach(ref => {
              // Check the external source name
              let refResults = regex.exec(ref.source_name)
              
              if (!refResults)  {
                // Check the external source id
                refResults = regex.exec(ref.external_id)

                if (refResults) {
                  results = results ? results.concat(refResults) : refResults
                }
              } 
            })
          }
        }

        // Add new values after deleting duplicates and undefined values
        if (results) {
          // Save associated CVE with the vulnerability
          vuln.cve = [...new Set(results.filter(r => r != undefined))]

          // Add vulnerabilities to the search list
          vulnerabilities = [...new Set(vulnerabilities.concat(results.filter(r => r !== undefined)))]
        }
        
      }

      progBar.update(10, {task: 'Searching for CVE information...'})
      // Search the dictionary for the CVE information
      let searchResults = await queryCveApi(vulnerabilities, progBar)
      console.log(`Search results: ${searchResults}`)

      cis.configuration = config
      cis.profile = CWE_CVE_PROFILE
      cis.bundle = req.files.bundle.data.toString()
      let cisID = await createObj({className: 'CIS', data: cis}, {relationship: 'belongs_to', to: config})

      // Create vulnerability objects according to the profile
      for (const [iVuln, vuln] of vulnArray.entries()) {
        console.log(`${vuln.name} has these CVEs: ${vuln.cve}`)

        if (vuln.cve) {

          progBar.update(40 + Math.round((iVuln / vulnArray.length) * 40), {task: `Creating vulnerability ${vuln.name} (${iVuln + 1} / ${vulnArray.length})`})

          let numValid = 0
          let vectors = [] 
          for (const c of vuln.cve) {
            let cveInfo = searchResults.find(r => r.id === c)
            //console.log(cveInfo)
            if (cveInfo) {
              vectors.push(cveInfo.vector)
            }
          }

          let vector = ''
          console.log('Vectors: ', vectors)
          //if (vectors.length > 1) {
            // Create new vector by combining the ones in the list
            let values = {
              AV: [],
              AC: [],
              PR: [],
              UI: [],
              S: [],
              C: [],
              I: [],
              A: []
            }

            // Create the list of vector values
            for (const v of vectors) {
              let pVector = v.split('/')
              for (const [i, prop] of pVector.entries()) {
                let metric = prop.split(':')

                if (i == 0) {
                  if (metric[1] !== "3.1") {
                    console.log("Not using CVSS v3.1")
                  }
                } else {
                  values[metric[0]]?.push({label: metric[1], value: cvss[metric[0]].scores[metric[1]]})
                }
              }
            }
            console.log(values)

            if (!Object.keys(values).find(key => values[key].length === 0)) { 
              console.log("Checking values")
              // Get median for each value          
              let medianValues = {}
              for (const [key, value] of Object.entries(values)) {
                let sorted = value.sort((a, b) => a.value - b.value)
                let medianIndex = Math.ceil((sorted.length - 1) / 2)
                medianValues[key] = sorted[medianIndex].label
                console.log(`Sorted: ${sorted.entries()}. sorted[${medianIndex}]: ${sorted[medianIndex].label}`)
              }
            
              vector = `CVSS:3.1/AV:${medianValues["AV"]}/AC:${medianValues["AC"]}/PR:${medianValues["PR"]}/UI:${medianValues["UI"]}/S:${medianValues["S"]}/C:${medianValues["C"]}/I:${medianValues["I"]}/A:${medianValues["A"]}`

              console.log("Created vector: ", vector)
              let vulnData = {
                name: vuln.name,
                description: vuln.description,
                total_score: 0,
                cve: vuln.cve,
                vector: vector
              }
              let vulnID = await createObj({className: 'Vulnerability', data: vulnData}, {relationship: 'vulnerability_of', to: cisID})
              await createPresets(cwePresets.vulnerability, vulnID)
            }
        }
      }

      // Get weaknesses from vulnerabilities
      let weaknesses = []
      for (const result of searchResults) {
        // console.log('result: ', result)
        if (result.cwe) {
          
          for (const pWeak of result.cwe) {
            if (pWeak != '') {
              // Check if the weakness has already been found
              let wIndex = weaknesses.findIndex(w => w.cwe === pWeak)
              if (wIndex !== -1) {
                // If it has, add any related vulnerabilities
                weaknesses[wIndex].vulnerabilities.push(result.id)
              } else {        
                // If it hasn't, add the weakness and related vulnerabilities
                weaknesses.push({cwe: pWeak, vulnerabilities: [result.id]})
              }
            }
          }

        }
      }

      let vulns = await getVulnerabilities(cisID)

      // Create weakness objects according to the profile
      for (const [wIndex, w] of weaknesses.entries()) {
        let searchResult = await searchCweDictionary([w.cwe], progBar)
        let parsedSearch = []
        console.log(searchResult)

        // Parse the search result. 
        // Some descriptions are in quotes and have commas, so we need to account for those
        // We can't just split the string at the commas
        if (searchResult[0].search) {

          let curItem = ''
          let numItem = 0
          let names = ["CWE-ID", "Name", "Weakness Abstraction", "Status", "Description", "Extended Description", "Related Weaknesses", "Weakness Ordinalities", "Applicable Platforms", "Background Deltas", "Alternate Terms", "Modes of Introduction", "Exploitation Factors", "Likelihood of Exploit", "Common Consequences", "Detection Methods", "Potential Mitigations", "Observed Examples", "Functional Areas", "Affected Resources", "Taxonomy Mappings", "Related Attack Patterns", "Notes"]
          for (var i = 0; i < searchResult[0].search.length; i++) {
            let s = searchResult[0].search[i]

            if (s === '"') {
              // Collect each character until the next '"'
              do {
                i++
                s = searchResult[0].search[i]
                if (s != '"') {
                  curItem += s
                } else {
                  break
                }
              } while (s != '"')

            } else if (s === ',') {
              // Push that item to the parsedSearch object
              console.log(`${names[numItem]} = ${curItem}`)
              parsedSearch[names[numItem++]] = curItem
              curItem = ''
            } else {
              // Add letter to the curItem
              curItem += s
            }
          }

        }
        progBar.update(80 + Math.round((wIndex / weaknesses.length) * 20), {task: `Creating weakness ${w.cwe} (${wIndex + 1} / ${weaknesses.length})`})
        let relatedVulns = vulns.filter(v => {
          console.log(v.name, ' v.cve: ', v.cve)
          if (v.cve) {
            for (const cve of v.cve) {
              if (w.vulnerabilities.includes(cve)) {
                return true
              }
            }
          }

          return false        
        })

        let weaknessData = {
          name: w.cwe,
          cwe_name: parsedSearch['Name'],
          description: parsedSearch["Description"],
          cve: relatedVulns.map(v => v.cve),
          total_score: 0
        }

        let weaknessID = await createObj({className: 'Weakness', data: weaknessData}, {relationship: 'weakness_of', to: cisID})
        
        relatedVulns.forEach(async (v) => {
          await db.create('EDGE', 'weakness_of').from(weaknessID).to(v['@rid'].toString()).one()
        })

        await createPresets(cwePresets.weakness, weaknessID)
        await updateScore(weaknessID)
      } 

      updateJsonRepProfile(cisID).then(async () => {
        progBar.update(100, {task: "Finished!"})
        progBar.stop()
        res.write('|' + JSON.stringify({valid: true, cis: cisID}))
        res.end()
      }); 
    }
  } catch (e) {
    console.log('\n')
    console.error(e)

    res.write("|" + JSON.stringify({valid: false, message: 'Something went wrong while processing the STIX bundle. Check the server logs for more details.'}))
    res.end()
  }
  
}

/*
 * Adds objects to the database according to the profile
 *
 */
async function createPresets(presets, startID) {
  let numAttributes = 0
  let numChosen = 0
  
  for (const catObj of presets) {
    let catData = {
      name: catObj.category,
      total_score: catObj.total_score ? catObj.total_score : 0,
      memo: catObj.memo ? catObj.memo : ''
    }

    let catID = await createObj({className: 'Category', data: catData}, {relationship: 'category_of', to: startID})

    for (const charObj of catObj.characteristics) {
      let charData = {
        name: charObj.characteristic,
        total_score: charObj.total_score ? charObj.total_score : 0,
        weight: charObj.weight
      }

      let charID = await createObj({className: 'Characteristic', data: charData}, {relationship: 'characteristic_of', to: catID})

      for (const attObj of charObj.attributes) {
        let attData = {
          name: attObj.attribute,
          score: attObj.score ? attObj.score : 0,
          user_weight: attObj.user_weight ? attObj.user_weight : 1,
          weighted_score: attObj.weighted_score ? attObj.weighted_score : 0
        }

        let attID = await createObj({className: 'Attribute', data: attData}, {relationship: 'attribute_of', to: charID})

        numAttributes++
        for (const scoreObj of attObj.scores) {
          let scoreData = {
            description: scoreObj.description,
            score: scoreObj.score,
            chosen: scoreObj.chosen ? scoreObj.chosen : false,
            default: scoreObj.chosen ? scoreObj.chosen : false,
          }

          if (scoreObj.letter) {
            scoreData["letter"] = scoreObj.letter
          }

          if (scoreObj.chosen) {
            numChosen++
          }

          await createObj({className: 'Score', data: scoreData}, {relationship: 'score_guidance_of', to: attID})
        }
      }
    }
  }


  await db.update(startID).set({totalAttributes: numAttributes, totalChosen: numChosen, totalDefault: numChosen}).one()
  //await updateScore(startID)

}

/*
 * Create Object
 * Creates a vertex with an out edge
 */
async function createObj(vertex, edge) {

  //console.log(`Creating ${vertex.className} with score ${vertex.data.score} and edge to ${edge.to}`)
  let newObj = await db.create('Vertex', vertex.className).set(vertex.data).one()


  let id = newObj['@rid']
  //console.log(`Created ${vertex.className} -- ${id} with score ${newObj.score}`)
  await db.create('EDGE', edge.relationship).from(id).to(edge.to).one()

  return id.toString()
}

/*
 * Select
 * req: id
 * Selects the object from the given id. 
 */
router.post('/select', async (req, res) => {
  try {
    let data = ''
    if (req.body.data) {
      data = req.body.data
      console.log("Select data: ", data)
    }
    let query = await db.select(data).from(req.body.id).one()
    console.log(JSON.stringify(query))
    res.send(query)
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Configuration
 * req: id (optional)
 * If the body has an id, returns a single configuration
 * If the body doesn't have an id, returns all configurations
 */
router.post('/configuration', (req, res) => {
  try {
    id = req.body.id

    // If the request has an id, send that configuration
    if (id) {
      db.select().from(id).one()
      .then(data => {
        res.send(JSON.stringify(data))
      })
    // Else send all configurations
    } else {
      db.select().from('Configuration').all()
      .then(data => {
        res.send(JSON.stringify(data))
      });
    }  
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Create Config
 * req: newConfigDocs, newConfigName, newConfigDescription
 * Creates a new configuration from the supplied data.
 */
router.post('/createconfig', async (req, res) => {
  try {
    let configID = null;
    let supportingDoc = null;
    let ourConfig = req.body.newConfigDocs;
    let newConfigName = req.body.newConfigName
    let newConfigDescription = req.body.newConfigDescription

    db.create('VERTEX', 'Configuration')
      .set({
        name: newConfigName,
        description: newConfigDescription,
        // supportingDocs: this.state.newConfigDocs //embeddedlist of record IDs
      }).one()
      .then( //update the configuration list
        async function(newCreatedConfiguration) {

        // console.log('Created config ' + newCreatedConfiguration.name + ' with description: ' + newCreatedConfiguration.description);
        
        // console.log('our newly created configuratoin. ', newCreatedConfiguration);
        configID = newCreatedConfiguration['@rid'];
        // supportingDoc = await db.create('EDGE', 'supporting_doc')
        // .from(configID).to(this.state.newCreatedConfiguration).one();

        // console.log('new config2 docs: ', ourConfig);
        
        for (const imgObj of ourConfig) { // loop through configdocs2 array, pulling out each image object;
          let imageID = null;
          // console.log('Test imgOjbj this stuff here', imgObj);
            const image = await db.create('VERTEX', 'Image') //create an image
            .set({
                name: imgObj.name
            }).one();
            // console.log('Created Image: ' + image);
            //Create edge
            imageID = image['@rid'];
            supportingDoc = db.create('EDGE', 'supporting_doc')
            .from(imageID).to(configID).one();
        }

        res.send(JSON.stringify(newCreatedConfiguration))
      }
    );
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Progress List
 * Sends a list of CIS objects in progress
 */
router.post('/progresslist', async (req, res) => {
  try {
    const progressList = await db.select().from('CIS').where({status: 'progress'}).all()
    res.send(progressList)
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * CIS
 * Sends a list of all CIS objects.
 */
router.post('/cis', async (req, res) => {
  try {
    res.send(await db.select().from('CIS').all())
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Get Vulnerability Array
 * req: cisID
 * Sends a list of all vulnerabilities, along with all categories and scoring data.
 */
router.post('/getvulnarray', async (req, res) => {
  try {
    let cisID = req.body.cisID;

    if (cisID == null) {
      res.send({valid: false, message: 'Error: cisID is a required property'})
    } else {
      res.send(JSON.stringify(await getVulnerabilities(cisID)))
    }
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

router.post('/getWeaknessArray', async (req, res) => {
  try {
    let cisID = req.body.cisID

    if (cisID == null) {
      res.send({valid: false, message: 'Error: cisID is a required property'})
    } else {
      res.send(JSON.stringify(await getWeaknesses(cisID)))
    }
  } catch (e) {
    console.error(e)
    res.status(500)
    res.end()
  }
})

/*
 * Get Category Array
 * req: cisID
 * Sends a list of all categories of a CIS object, along with all scoring data
 */
router.post('/getCatArray', async (req, res) => {
  try {
    let cisID = req.body.cisID;

    if (cisID == null) {
      res.send({valid: false, message: 'Error: cisID is a required property'})
    } else {
      res.send(JSON.stringify(await getCategories(cisID)))
    }
    
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
  
})

/*
 * Get Characteristic Array
 * req: catID
 * Returns all characteristics based on the category id
 */
router.post('/getCharArray', async (req, res) => {
  try {
    let catID = req.body.catID;

    if (catID == null) {
      res.send({valid: false, message: 'Error: catID is a required property'})
    } else {
      res.send(JSON.stringify(await getCharacteristics(catID)))
    }
    
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
  
})

/*
 * Get Attribute Array
 * Returns all attributes based on a characteristic ID
 */
router.post('/getAttrArray', async (req, res) => {
  try {
    charID = req.body.charID;

    if (charID == null) {
      res.send({valid: false, message: 'Error: charID is a required property'})
    } else {
      res.send(JSON.stringify(await getAttributes(charID)))
    }
    
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
  
})

/*
 * Get Score Array
 * Returns all scores based on an attribute ID
 */
router.post('/getScoreArray', async (req, res) => {
  try {
    attrID = req.body.attrID;

    if (attrID == null) {
      res.send({valid: false, message: 'Error: attrID is a required property'})
    } else {
      res.send(JSON.stringify(await getScores(attrID)))
    }
    
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Get score
 * req: ids
 * Returns the total_score of the objects
 */
router.post('/getscores', async (req, res) => {
  try {
    let ids = req.body.ids

    console.log(ids)

    if (ids) {
      let scores = {}
      for (var i = 0; i < ids.length; i++) {
        id = ids[i]
        console.log(id)
        let score = await db.select('total_score').from(id).one()
        scores[id] = score.total_score
      }

      //console.log(scores)

      res.send(JSON.stringify({scores: scores}))
    } else {
      res.send({valid: false, message: 'Error: ids is a required property'})
    }
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Update
 * req: id, data
 * Updates an object (id) with the passed data.
 */
router.post("/update", async (req, res) => {
  try {
    let id = req.body.id
    let data = req.body.data

    console.log(`Setting ${id} with ${data}`)

    res.send(await db.update(id).set(data).one())
  } catch (e) {
    console.error(e) 
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Update CVE data
 * Updates the CVE dictionary
 */
router.post('/updateCveData', (req, res) => {
  try {
    PythonShell.run(__dirname + '/../cveDictionary/CVE_CWE_CVSS_Dictionary_Updater.py', pythonOpts, (err, results) => {
      console.log('csv update: ', results)
    })
    res.end()
  } catch (e) {
    console.error(e)
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Query CVE API
 */
async function queryCveApi(vulns, progBar) {
  let i = 1
  let sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  let searchResults = []

  let iCve = 0
  for (const v of vulns) {
    
    progBar?.update(10 + Math.round((iCve++ / vulns.length) * 30), {task: `Searching for ${v} (${iCve} / ${vulns.length})`})

    try {
      
      let query = await axios.get(`https://services.nvd.nist.gov/rest/json/cve/1.0/${v}`)

      let cve = query?.data?.result?.CVE_Items[0]

      let result = {}
  
      result["id"] = v
      result["vector"] = cve?.impact?.baseMetricV3?.cvssV3?.vectorString
      result["baseScore"] = cve?.impact?.baseMetricV3?.cvssV3?.baseScore
  
      // Use CVSSv2 if needed
      if (!result.vector) {
        result["vector"] = cve?.impact?.baseMetricV2?.cvssV2?.vectorString
        result["baseScore"] = cve?.impact?.baseMetricV2?.cvssV2?.baseScore
      }

      // Collect CWEs
      result["cwe"] = []
      let cweList = cve?.cve?.problemtype?.problemtype_data
      //console.log(cve)
      console.log("CWE List", cweList)
      for (const cwe of cweList) {
        console.log('CWE: ', cwe)
        let cweID = cwe?.description[0]?.value
        if (/CWE-\d+/.test(cweID)) {
          console.log(cweID)
          result["cwe"].push(cweID)
        }
      }
      
      console.log("Found: ", result.id, result.vector, result.baseScore)
  
      searchResults.push(result)

    } catch (e) {
      console.log(`Unable to find ${v}`)
    }

    // Sleep for a few seconds after every 50 requests.
    // This is to prevent firewall restrictions from 
    // blocking our requests.
    if (i++ % 50 == 0) {
      console.log('Sleeping before next request...')
      await sleep(2000)
      console.log('Done!')
    }

  }

  console.log(JSON.stringify(searchResults))

  return searchResults  
}

/*
 * Search CVE Dictionary
 * Searches the CVE dictionary for the given vulnerabilities
 */
async function searchCveDictionary(vulns, progBar, saveOnFail=true) {
  try {
    var count = 0;
    let searchResults = await fs.createReadStream(CVE_DICTIONARY)
    return new Promise((resolve, reject) => {

      searchResults.on('data', function(chunk) {
        // Count lines
        for (var i = 0; i < chunk.length; ++i) {
          // Check if there is a newline (ascii: 10)
          if (chunk[i] == 10) count++;
        }
      })
      searchResults.on('error', (err) => {
        console.error(err)

        // Check if we have already tried to create the dictionary
        if (saveOnFail) {
          // We haven't tried to create the dictionary yet
          if (err.code === 'ENOENT') {
            // Dictionary doesn't exist. Create it
            console.log("Dictionary doesn't exist. STOAT will attempt to create it...")
            progBar.update(10, {task: "Dictionary doesn't exist. STOAT will attempt to create the it..."})
            let python = new PythonShell(__dirname + '/../cveDictionary/CVE_CWE_CVSS_Dictionary_Initial.py', pythonOpts)

            python.send()
            python.on('message', function(message) {
              console.log(message)
              progBar.update(10, {task: "Dictionary doesn't exist. STOAT will attempt to create the it... " + message})
            })
            
            python.end(async (err, code, signal) => {
              if (err) {
                throw err
              } else {
                console.log("Finished!")

                progBar.update(10, {task: "Created dictionary. Attempting to search again..."})
              
                // Try to search one more time
                resolve(await searchCveDictionary(vulns, progBar, false))
              }
            })
          } else {
            reject(err)
          }
        } else {
          // We have already tried to create the dictionary. Stop trying (No infinite loops!)
          reject(err)
        }
        
      })
      searchResults.on('end', async () => {
        //console.log("Number of lines: ", count)

        let result = []

        // Perform a binary search
        let binarySearch = async (min, max, value) => {
          let row = min + Math.floor((max - min) / 2);
        
          let line = await nthline(row, CVE_DICTIONARY)
        
          //console.log('Line: ', line)
          //console.log(`Min: ${min} Max: ${max}`)
        
          let parsedLine = line.split(',')
          //console.log('Value: ', value)
        
          if (value == parsedLine[0]) {
            // We found it!
            //console.log('Found!')
        
            return line
          }
        
          // If the CVEs don't match, but the min and max are the same,
          // then the CVE does not exist in the dictionary.
          if (min >= max) {
            // CVE not found
            //console.log(`${value} not found. Last row searched: ${row}`)
            return null
          }
          
          if (value > parsedLine[0]) {
            // Search the right half
            //console.log("Greater")
            return binarySearch(row + 1, max, value)
          } 
        
          // Search the left half
          //console.log("Lower")
          return binarySearch(min, row - 1, value)              
        }
        
        //console.log("vulns", vulns)
        let iCve = 0
        for (const cve of vulns) {
          progBar.update(10 + Math.round((iCve++ / vulns.length) * 10), {task: `Searching for ${cve} (${iCve} / ${vulns.length})`})
          result.push({cve: cve, search: await binarySearch(0, count - 1, cve)})
        }

        resolve(result)
      })
    })
  } catch (e) {
    console.error(e)
  }
}

/*
 * Search CWE Dictionary
 * Searches the CWE dictionary for the given weaknesses
 */
async function searchCweDictionary(weaknesses, progBar) {
  try {
    // Count lines
    var i;
    var count = 0
    let searchResults = await fs.createReadStream(CWE_DICTIONARY)
    return new Promise((resolve, reject) => {
      searchResults.on('data', function(chunk) {
        for(var i = 0; i < chunk.length; i++) {
          if (chunk[i] == 10) count++;
        }
      })
      searchResults.on('error', (err) => {
        console.error(err)
        reject(err)
      })
      searchResults.on('end', async () => {

        let result = []

        let binarySearch = async (min, max, value) => {
          let row = min + Math.floor((max - min) / 2);

          console.log('Searching CWE dictionary for CWE', value)
          console.log(`Max: ${max} -- Min: ${min}`)

          if (min >= max) {
            //console.log('Doesnt exist')
            return null
          }

          let line = await nthline(row, CWE_DICTIONARY)

          let cwe = parseInt((line.split(','))[0])

          if (value === cwe) {
            //console.log("Found it!")
            return line
          }

          if (value > cwe) {
            //console.log('Searching the right half')
            return binarySearch(row + 1, max, value)
          }

          //console.log('Searching the left half')
          return binarySearch(min, row - 1, value)
        }

        for (const cwe of weaknesses) {
          progBar.update(null, {task: `Searching for ${cwe}`})
          result.push({cwe: cwe, search: await binarySearch(0, count - 1, parseInt((cwe.split('-'))[1]))})
        }

        resolve(result)
        
      })
    })

  } catch (e) {
    console.error(e)
  }
}


/*
 * Generate Fake Data
 * This will take a score object and randomly assign different values.
 * The purpose of this is to create data that can be used to test the reports tab.
 * This can/should be deleted after the reports tab is completed.
 */
router.post('/fakedata', async (req, res) => {
  let cis = await db.select('in("vulnerability_of")').from(req.body.id).one()

  for (const qIn of cis.in) {
    let totalChosen = 0
    let totalDefault = 0
    
    let catArray = await getCategories(qIn.toString())

    catArray.forEach( (cat) => {
      let catScore = 0
      cat.characteristics.forEach( (char) => {
        let charScore = 0
        char.attributes.forEach( (attr) => {
          // Get random index
          let index = Math.floor(Math.random() * attr.scores.length)

          let score = attr.scores[index]

          db.update(score.scoreID.toString()).set({chosen: true}).one()

          if (score.default === true) {
            totalDefault++
          }
          totalChosen++

          // Update db
          db.update(attr.attrID.toString()).set({score: score.score}).one()

          charScore += score.score * attr.user_weight
        })
      
        db.update(char.charID.toString()).set({total_score: charScore}).one()
        catScore += charScore * char.weight
      })
      db.update(cat.categoryID.toString()).set({total_score: catScore}).one()
    })

    db.update(qIn.toString()).set({totalChosen: totalChosen, totalAttributes: totalChosen, totalDefault: totalDefault}).one()


  }

  await updateJsonRepBundle(req.body.id)
  res.status(200)
  res.end()

})

/*
 * Update Score
 * req: scoreArray, selected, userWeight, attrID
 * Calculates the new score based on the data in the request
 * body, then updates the database with the new score
 */
router.post("/updateScore", async (req, res) => {
  try {

    let selected = req.body.selected
    let attrID = req.body.attrID
    let vulnID = req.body.vulnID
    let scoreArray = await getScores(attrID)

    let prevChosen = null

    for (const score of scoreArray) {
      console.log(score.scoreID)
      if (score.scoreID == selected.scoreID) {
        await db.update(score.scoreID)
        .set({
          chosen: true
        }).one();
      } else {
        await db.update(score.scoreID)
        .set({
          chosen: false
        }).all();
      }

      // Get previous chosen id
      if (score.chosen) {
        prevChosen = score
      }
    }

    // Update Vulnerability
    let vuln = await db.select().from(vulnID).one()
    if (prevChosen) {
      if (prevChosen.default) {
        // Decrease number of default scores that have been chosen
        vuln.totalDefault--
        await db.update(vulnID).set({totalDefault: vuln.totalDefault}).one()  
      } 
    } else {
      // Increase number of total chosen
      vuln.totalChosen++
      await db.update(vulnID).set({totalChosen: vuln.totalChosen}).one()
    }

    updateScore(vulnID).then(() => {
      res.send(JSON.stringify({
        categoryScore: 0,//catScore,
        characteristicScore: 0//charScore
      }))
    })
  
  } catch (e) {
    console.error(e)
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }  
})

/*
 * Get JSON Rep
 * Gets the JSON rep of a CIS object
 */
router.post('/getjsonrep', async (req, res) => {
  try {
    res.send(JSON.stringify(await db.select('jsonRep').from(req.body.id)))
  } catch (e) {
    console.error(e)
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }
})

/*
 * Update JSON rep
 * Updates the JSON representation of the CIS object
 */
router.post('/updateJsonRep', async (req, res) => {
  try {

    if (req.body.cisID) {
      let cis = await db.select().from(req.body.cisID).one()

      let profile = cis.profile

      if (profile === CWE_CVE_PROFILE) {
        updateJsonRepCve(cis)
      } else if (profile === ATTACK_SURFACE_PROFILE) {
        updateJsonRepBundle(cis)
      } else if (profile === STRUCTURE_PROFILE) {
        updateJsonRep(cis)
      } else {
        updateJsonRep(cis)
      }

      res.send(JSON.stringify({valid: true}))
    } else {
      res.send(JSON.stringify({valid: false, message: 'Error: cisID is a required property'}))
    }
  } catch (e) {
    console.error(e)
    res.send(JSON.stringify({valid: false, message: 'Something went wrong while processing the request. Check the server logs for more details.'}))
  }  
})

/*
 * Update JsonRep
 * Updates the JsonRep property of a score without a STIX bundle
 */
async function updateJsonRep(cisID) {
  const curCIS = await db.select().from(cisID.toString()).one();

  const jsToJSON = {criteriaDefault: [], name: curCIS.name, description: curCIS.description};
  let catIndex = -1;
  let charIndex = -1;
  let attIndex = -1;

  const queryCategories = await db.select('in("category_of")').from(cisID.toString()).one();
  for (const qCat of queryCategories.in) {
      const curCat = await db.select().from(qCat.toString()).one();
      const curCatID = curCat['@rid'];
      jsToJSON.criteriaDefault.push({category: curCat.name, total_score: curCat.total_score, characteristics: []});
      catIndex++;
      const queryCharacteristics = await db.select('in("characteristic_of")').from(curCatID.toString()).one();
      for (const qChar of queryCharacteristics.in) {
          const curChar = await db.select().from(qChar.toString()).one();
          const curCharID = curChar['@rid'];
          jsToJSON.criteriaDefault[catIndex].characteristics.push({characteristic: curChar.name, total_score: curChar.total_score, weight: curChar.weight, attributes: []});
          charIndex++;
          const queryAttributes = await db.select('in("attribute_of")').from(curCharID.toString()).one();
          for (const qAtt of queryAttributes.in) {
              const curAtt = await db.select().from(qAtt.toString()).one();
              const curAttID = curAtt['@rid'];
              jsToJSON.criteriaDefault[catIndex].characteristics[charIndex].attributes.push({attribute: curAtt.name, score: curAtt.score, user_weight: curAtt.user_weight, weighted_score: curAtt.weighted_score, scores: []});
              attIndex++;
              const queryScores = await db.select('in("score_guidance_of")').from(curAttID.toString()).one();
              for (const qScore of queryScores.in) {
                  const curScore = await db.select().from(qScore.toString()).one();
                  const curScoreID = curScore['@rid'];
                  jsToJSON.criteriaDefault[catIndex].characteristics[charIndex].attributes[attIndex].scores.push({description: curScore.description, score: curScore.score, chosen: curScore.chosen});
              }
              scoreIndex = -1;
          }
          attIndex = -1;
      }
      charIndex = -1;
  }

  //Update jsonRep CIS property
  await db.update(cisID.toString())
  .set({
      jsonRep: JSON.stringify(jsToJSON)
  }).one();

};

/*
 * Update JsonRep Profile
 * Updates the JsonRep property according to the profile
 */
async function updateJsonRepProfile(cisID) {
  let cis = await db.select().from(cisID)

  let profile = cis.profile

  if (profile === CWE_CVE_PROFILE) {
    updateJsonRepCve(cis)
  } else if (profile === ATTACK_SURFACE_PROFILE) {
    updateJsonRepBundle(cis)
  } else if (profile === STRUCTURE_PROFILE) {
    updateJsonRep(cis)
  }
}

/*
 * Update JsonRep CVE
 * Updates the JsonRep object according to the CVE profile
 */
async function updateJsonRepCve(cis) {

  let cisID = cis['@rid']

  const jsToJSON = {criteriaDefault: {vulnerabilities: [], weaknesses: []}, name: cis.name, description: cis.description};
  let vulnIndex = -1;
  let weakIndex = -1;
  let catIndex = -1;
  let charIndex = -1;
  let attIndex = -1;
  let scoreIndex = -1;

  // Add vulnerabilities
  const queryVulns = await db.select('in("vulnerability_of")').from(cisID.toString()).one();
  for (const qVuln of queryVulns.in) {
    const curVuln = await db.select().from(qVuln.toString()).one();
    const curVulnID = curVuln['@rid'];
    jsToJSON.criteriaDefault.vulnerabilities.push({vulnerability: curVuln.name, total_score: curVuln.total_score, categories: []});
    vulnIndex++;
    const queryCategories = await db.select('in("category_of")').from(curVulnID.toString()).one();
    for (const qCat of queryCategories.in) {
        const curCat = await db.select().from(qCat.toString()).one();
        const curCatID = curCat['@rid'];
        jsToJSON.criteriaDefault.vulnerabilities[vulnIndex].categories.push({category: curCat.name, total_score: curCat.total_score, characteristics: []});
        catIndex++;
        const queryCharacteristics = await db.select('in("characteristic_of")').from(curCatID.toString()).one();
        for (const qChar of queryCharacteristics.in) {
            const curChar = await db.select().from(qChar.toString()).one();
            const curCharID = curChar['@rid'];
            jsToJSON.criteriaDefault.vulnerabilities[vulnIndex].categories[catIndex].characteristics.push({characteristic: curChar.name, total_score: curChar.total_score, weight: curChar.weight, attributes: []});
            charIndex++;
            const queryAttributes = await db.select('in("attribute_of")').from(curCharID.toString()).one();
            for (const qAtt of queryAttributes.in) {
                const curAtt = await db.select().from(qAtt.toString()).one();
                const curAttID = curAtt['@rid'];
                jsToJSON.criteriaDefault.vulnerabilities[vulnIndex].categories[catIndex].characteristics[charIndex].attributes.push({attribute: curAtt.name, score: curAtt.score, user_weight: curAtt.user_weight, weighted_score: curAtt.weighted_score, scores: []});
                attIndex++;
                const queryScores = await db.select('in("score_guidance_of")').from(curAttID.toString()).one();
                for (const qScore of queryScores.in) {
                    const curScore = await db.select().from(qScore.toString()).one();
                    const curScoreID = curScore['@rid'];
                    jsToJSON.criteriaDefault.vulnerabilities[vulnIndex].categories[catIndex].characteristics[charIndex].attributes[attIndex].scores.push({description: curScore.description, score: curScore.score, chosen: curScore.chosen});
                    scoreIndex++;
                }
                scoreIndex = -1;
            }
            attIndex = -1;
        }
        charIndex = -1;
    }
    catIndex = -1
  }

  // Add weaknesses
  const queryWeak = await db.select('in("weakness_of")').from(cisID.toString()).one();
  for (const qWeak of queryWeak.in) {
    const curWeak = await db.select().from(qWeak.toString()).one();
    const curWeakID = curWeak['@rid'];
    //console.log(`totalScore for weakness ${curWeak.name}: ${curWeak.total_score}`)
    jsToJSON.criteriaDefault.weaknesses.push({weakness: curWeak.name, total_score: curWeak.total_score, categories: [], vulnerabilities: curWeak.cve});
    weakIndex++;
    const queryCategories = await db.select('in("category_of")').from(curWeakID.toString()).one();
    for (const qCat of queryCategories.in) {
        const curCat = await db.select().from(qCat.toString()).one();
        const curCatID = curCat['@rid'];
        jsToJSON.criteriaDefault.weaknesses[weakIndex].categories.push({category: curCat.name, total_score: curCat.total_score, characteristics: []});
        catIndex++;
        const queryCharacteristics = await db.select('in("characteristic_of")').from(curCatID.toString()).one();
        for (const qChar of queryCharacteristics.in) {
            const curChar = await db.select().from(qChar.toString()).one();
            const curCharID = curChar['@rid'];
            jsToJSON.criteriaDefault.weaknesses[weakIndex].categories[catIndex].characteristics.push({characteristic: curChar.name, total_score: curChar.total_score, weight: curChar.weight, attributes: []});
            charIndex++;
            const queryAttributes = await db.select('in("attribute_of")').from(curCharID.toString()).one();
            for (const qAtt of queryAttributes.in) {
                const curAtt = await db.select().from(qAtt.toString()).one();
                const curAttID = curAtt['@rid'];
                jsToJSON.criteriaDefault.weaknesses[weakIndex].categories[catIndex].characteristics[charIndex].attributes.push({attribute: curAtt.name, score: curAtt.score, user_weight: curAtt.user_weight, weighted_score: curAtt.weighted_score, scores: []});
                attIndex++;
                const queryScores = await db.select('in("score_guidance_of")').from(curAttID.toString()).one();
                for (const qScore of queryScores.in) {
                    const curScore = await db.select().from(qScore.toString()).one();
                    const curScoreID = curScore['@rid'];
                    jsToJSON.criteriaDefault.weaknesses[weakIndex].categories[catIndex].characteristics[charIndex].attributes[attIndex].scores.push({description: curScore.description, score: curScore.score, chosen: curScore.chosen});
                    scoreIndex++;
                }
                scoreIndex = -1;
            }
            attIndex = -1;
        }
        charIndex = -1;
    }
    catIndex = -1
  }


  //Update jsonRep CIS property
  await db.update(cisID.toString())
  .set({
      jsonRep: JSON.stringify(jsToJSON)
  }).one();

}

router.post('/exportSTIX', async (req, res) => {
  let cis = await db.select().from(req.body.id).one()

  let profile = cis.profile

  if (profile === CWE_CVE_PROFILE) {
    exportStixCve(cis, res)
  } else if (profile === ATTACK_SURFACE_PROFILE) {
    // TODO: Add export function for attack surface
  } else if (profile === STRUCTURE_PROFILE) {
    // TODO: Add export function for structure
  } else {
    // TODO: add export function for EMV
  }
});

async function exportStixCve(cis, res) {
  //let jsonRepObject = JSON.parse(cis.jsonRep)
  let bundle = JSON.parse(cis.bundle)

  let weaknesses = await getWeaknesses(cis['@rid'].toString())

  let extension = {
    id: 'extension-definition--' + uuid.v4(),
    type: "extension-definition",
    spec_version: "2.1",
    created: '',
    modified: '',
    name: "Weakness Extension",
    description: "This extension adds CWSS Scores and STOAT scoring to the Grouping (Weakness) SDO.",
    version: "1.0.0",
    extension_types: [
      "property-extension"
    ]
  }

  bundle.objects.push(extension)

  for (const weakness of weaknesses) {
    console.log(`Creating weakness ${weakness.name}`)
    let weaknessStix = {
      type: 'grouping',
      id: 'grouping--' + uuid.v4(),
      name: weakness.name,
      descriptions: weakness.description,
      context: 'suspicious-activity',
      object_refs: [],
      spec_version: "2.1",
      extensions: {}
    }

    // TODO: Generate vector string
    let vector = ""

    weaknessStix.extensions[extension.id] = {
      "extension-type": "property-extension",
      "cwss-version": "1.0.1",
      "stoat-weakness-score": weakness.total_score,
      "vector-string": vector
    }

    let vulnerabilities = await db.select('out("weakness_of")').from(weakness['@rid'].toString()).one()

    for (const vuln of vulnerabilities.out) {
      let qVuln = await db.select().from(vuln.toString()).one()
      console.log(`Adding vulnerability ${qVuln.name}`)
      let vulnIndex = bundle.objects.findIndex(obj => obj.name === qVuln.name)
      console.log(vulnIndex)
      if (vulnIndex !== -1) {
        let vulnID = bundle.objects[vulnIndex].id
        weaknessStix.object_refs.push(vulnID)
      }
    }

    bundle.objects.push(weaknessStix)
  }

  res.write(JSON.stringify(bundle))
  res.end()
}

/* 
  Update JSON representation
  This function updates the JSON representation of the CIS if it has a STIX bundle
*/
async function updateJsonRepBundle(cisID) {
  const curCIS = await db.select().from(cisID.toString()).one();

  const jsToJSON = {criteriaDefault: [], name: curCIS.name, description: curCIS.description};
  let vulnIndex = -1;
  let catIndex = -1;
  let charIndex = -1;
  let attIndex = -1;
  let scoreIndex = -1;

  const queryVulns = await db.select('in("vulnerability_of")').from(cisID.toString()).one();
  for (const qVuln of queryVulns.in) {
    const curVuln = await db.select().from(qVuln.toString()).one();
    const curVulnID = curVuln['@rid'];
    jsToJSON.criteriaDefault.push({vulnerability: curVuln.name, total_score: curVuln.totalScore, categories: []});
    vulnIndex++;
    const queryCategories = await db.select('in("category_of")').from(curVulnID.toString()).one();
    for (const qCat of queryCategories.in) {
        const curCat = await db.select().from(qCat.toString()).one();
        const curCatID = curCat['@rid'];
        jsToJSON.criteriaDefault[vulnIndex].categories.push({category: curCat.name, total_score: curCat.total_score, characteristics: []});
        catIndex++;
        const queryCharacteristics = await db.select('in("characteristic_of")').from(curCatID.toString()).one();
        for (const qChar of queryCharacteristics.in) {
            const curChar = await db.select().from(qChar.toString()).one();
            const curCharID = curChar['@rid'];
            jsToJSON.criteriaDefault[vulnIndex].categories[catIndex].characteristics.push({characteristic: curChar.name, total_score: curChar.total_score, weight: curChar.weight, attributes: []});
            charIndex++;
            const queryAttributes = await db.select('in("attribute_of")').from(curCharID.toString()).one();
            for (const qAtt of queryAttributes.in) {
                const curAtt = await db.select().from(qAtt.toString()).one();
                const curAttID = curAtt['@rid'];
                jsToJSON.criteriaDefault[vulnIndex].categories[catIndex].characteristics[charIndex].attributes.push({attribute: curAtt.name, score: curAtt.score, user_weight: curAtt.user_weight, weighted_score: curAtt.weighted_score, scores: []});
                attIndex++;
                const queryScores = await db.select('in("score_guidance_of")').from(curAttID.toString()).one();
                for (const qScore of queryScores.in) {
                    const curScore = await db.select().from(qScore.toString()).one();
                    const curScoreID = curScore['@rid'];
                    jsToJSON.criteriaDefault[vulnIndex].categories[catIndex].characteristics[charIndex].attributes[attIndex].scores.push({description: curScore.description, score: curScore.score, chosen: curScore.chosen});
                    scoreIndex++;
                }
                scoreIndex = -1;
            }
            attIndex = -1;
        }
        charIndex = -1;
    }
    catIndex = -1
  }

  //Update jsonRep CIS property
  const update = await db.update(cisID.toString())
  .set({
      jsonRep: JSON.stringify(jsToJSON)
  }).one();

};

/* getVulnerabilities
 * Params: cisID (id of CIS object)
 * Returns: Array of vulnerabilities
 */
async function getVulnerabilities(cisID) {
  const queryVulns = await db.select('in("vulnerability_of")').from(cisID).one();

  let index = 0;
  let vulnArray = [];

  for (const qVuln of queryVulns.in) {
    //let curVuln = await db.select().from(qVuln.toString()).one();
    vulnArray[index] = await db.select().from(qVuln.toString()).one();
  
    index++;
  }

  return vulnArray;
}

/* getWeaknesses
 * Get an array of weaknesses from the CIS id
 */
async function getWeaknesses(cisID) {
  const qWeaknesses = await db.select('in("weakness_of")').from(cisID).one();

  let index = 0
  let weakArray = []

  for (const qWeak of qWeaknesses.in) {
    weakArray[index++] = await db.select().from(qWeak.toString()).one()
  }

  return weakArray;
}

/* getCategories
 * Params: cisID (id of CIS object)
 * Returns: Array of categories
 */
async function getCategories(cisID) {

  let queryCategories = await db.select('in("category_of")').from(cisID).one()
  
  let catindex = 0;
  let catArr = [];

  for (const qCat of queryCategories.in) {
    
    let curCat = await db.select().from(qCat.toString()).one()
    console.log(curCat.name)
    catArr[catindex] = {...catArr[catindex], name: curCat.name, categoryID: curCat['@rid'], total: curCat['total_score'], memo: curCat['memo'], characteristics: await getCharacteristics(curCat['@rid'])};

    catindex++;
    
  }

  return catArr
}

/* getCharacteristics
 * Params: catID (id of category object)
 * Returns: Array of characteristics
 */
async function getCharacteristics(catID) {
  const queryCharacteristics = await db.select('in("characteristic_of")').from(catID).one()
  
  let characindx = 0;

  let charArr = [];

  for (const qChar of queryCharacteristics.in) {
    
    let curChar = await db.select().from(qChar.toString()).one()
    charArr[characindx] = {...charArr[characindx], name: curChar.name, charID: curChar['@rid'], total: curChar['total_score'], weight: curChar['weight'], attributes: await getAttributes(curChar['@rid'])};
    characindx++;
  }

  return charArr
}

/* getAttributes
 * Params: charID (id of characteristic object)
 * Returns: Array of attributes
 */
async function getAttributes(charID) {
  let attrindex = 0;
  const queryAttributes = await db.select('in("attribute_of")').from(charID).one();
  
  let attrArr = []

  for (const qAtt of queryAttributes.in) {
      const curAtt = await db.select().from(qAtt.toString()).one();
      attrArr[attrindex] = {...attrArr[attrindex], name: curAtt.name, attrID: curAtt['@rid'], score: curAtt.score, user_weight: curAtt.user_weight, weighted_score: curAtt.weighted_score, scores: await getScores(curAtt['@rid'])};
      
      attrindex++;
  }

  return attrArr
}

/* getScores
 * Params: attrID (id of attribute object)
 * Returns: Array of scores
 */
async function getScores(attrID) {
  let scoreindex = 0;
  const queryScore = await db.select('in("score_guidance_of")').from(attrID).one();
  
  let scoreArr = []

  for (const qScore of await queryScore.in) {
      const curScore = await db.select().from(qScore.toString()).one();
      const retLabel = curScore.description + ' | ' + curScore.score;
      const chosen = curScore.chosen;
      scoreArr[scoreindex] = {...scoreArr[scoreindex], value: scoreindex, score: curScore.score, description: curScore.description, scoreID: curScore['@rid'], label: retLabel, chosen: curScore.chosen, default: curScore.default, letter: curScore.letter};
      scoreindex++;
  }

  return scoreArr
}

/******************
 Scoring Functions
*******************/

/*
 * Update Score
 * id: cis id or vulnerability id
 * Determines which scoring equation to use
 */
async function updateScore(id) {
  let obj = await db.select().from(id).one()
  let type = obj['@class']

  console.log('Type: ', type)

  if (type === 'CIS') {
    updateDefaultScore(id)
  } else if (type === 'Vulnerability') {
    let vuln = await db.select('out("vulnerability_of")').from(id).one()
    console.log(id)
    let cis = await db.select('profile').from(vuln.out[0].toString()).one()
    console.log("Profile: ", cis.profile)

    if (cis.profile === CWE_CVE_PROFILE) {
      updateCveScore(id)
    } else if (cis.profile === ATTACK_SURFACE_PROFILE) {
      updateDefaultScore(id)
    } else if (cis.profile === STRUCTURE_PROFILE) {
      updateDefaultScore(id)
    } else {
      updateDefaultScore(id)
    }

  } else if (type == 'Weakness') {
    updateCweScore(id)
  }
}

/*
 * Default score
 * id: vulnerability id
 * Updates the score of a given vulnerability
 */
async function updateDefaultScore(id) {
  try {

  console.log('Update default score')

  let categories = await getCategories(id)
  let finalScore = 0
  for (const cat of categories) {
    let catScore = 0
    for (const char of cat.characteristics) {
      let charScore = 0
      for (const attr of char.attributes) {
        let attrScore = 0
        for (const score of attr.scores) {
          if (score.chosen) {
            attrScore = parseInt(score.score)
          }
        }
        charScore += attrScore * attr.user_weight
        console.log(`Setting attr score ${attrScore}`)
        await db.update(attr.attrID).set({score: attrScore}).one()
      }
      catScore += charScore * char.weight
      await db.update(char.charID).set({total_score: charScore.toFixed(2)}).one()
    }
    finalScore += catScore
    await db.update(cat.categoryID).set({total_score: catScore.toFixed(2)}).one()
  }

  console.log('Final score: ', finalScore)
  await db.update(id).set({total_score: finalScore}).one()
} catch (e) {
  console.error(e)
}
}

/*
 * CVE Score
 * id: vulnerability id
 * Updates the score of a given vulnerability using the CVSS equations
 */
async function updateCveScore(id) {
  console.log("Updating CVE score")
  let vuln = await db.select().from(id).one()

  let catArray = await getCategories(id)

  //let baseScore = vuln.cve_score
  console.log(JSON.stringify(vuln))
  let vector = vuln.vector

  if (vector) {

    let vectorMap = {}
    console.log("Vector: ", vector)
    for (const value of vector.split('/')) {
      //console.log("Value: ", value)
      let metric = value.split(':')

      vectorMap[metric[0]] = metric[1]
    }

    let roundUp = (num) => {
      // Clean up the floating point number.
      // In JavaScript, 0.1 + 0.2 == 0.30000000000000004
      // This will fix the floating point problem
      num = Math.trunc(num * 100000) / 100000

      // This will round the number up
      // (4.02 will become 4.1)
      return Math.ceil(num * 10) / 10
    }

    let userScored = {}

    for (const cat of catArray) {
      for (const char of cat.characteristics) {
        for (const attribute of char.attributes) {
          userScored[attribute.name] = attribute.scores.find(s => s.chosen)
          console.log(`Testing attribute: ${attribute.name} -> ${userScored[attribute.name].score}`)
        }
      }
    }

    let confidentialityRequirement = userScored["Confidentiality Requirement"].score
    let integrityRequirement = userScored["Integrity Requirement"].score
    let availabilityRequirement = userScored["Availability Requirement"].score

    let exploitCodeMaturity = userScored["Exploit Code Maturity"].score
    let remediationLevel = userScored["Remediation Level"].score
    let reportConfidence = userScored["Report Confidence"].score

    let modifiedScope = userScored["Modified Scope"]?.letter === "X" ? vectorMap["S"] : userScored["Modified Scope"].letter 

    let modifiedPrivilegesRequired = 0
    if (modifiedScope === "U") {
      modifiedPrivilegesRequired = userScored["Modified Privileges Required"]?.letter === "X" ? cvss["PR"].scores[vectorMap["PR"]] : userScored["Modified Privileges Required"].score
    } else {
      let letter = userScored["Modified Privileges Required"]?.letter === "X" ? vectorMap["PR"] : userScored["Modified Privileges Required"].letter
      
      console.log("Letter", letter)
      if (letter !== 'N') {
        letter += 'C'
      }
      modifiedPrivilegesRequired = cvss["PR"].scores[letter]
    }

    console.log("Confidentiality letter: ", userScored["Modified Confidentiality"].letter)

    let modifiedConfidentiality = userScored["Modified Confidentiality"].letter === "X" ? cvss["C"].scores[vectorMap["C"]] : userScored["Modified Confidentiality"].score
    let modifiedIntegrity = userScored["Modified Integrity"].letter === "X" ? cvss["I"].scores[vectorMap["I"]] : userScored["Modified Integrity"].score
    let modifiedAvailability = userScored["Modified Availability"].letter === "X" ? cvss["A"].scores[vectorMap["A"]] : userScored["Modified Availability"].score
    let modifiedAttackVector = userScored["Modified Attack Vector"].letter === "X" ? cvss["AV"].scores[vectorMap["AV"]] : userScored["Modified Attack Vector"].score
    let modifiedAttackComplexity = userScored["Modified Attack Complexity"].letter === "X" ? cvss["AC"].scores[vectorMap["AC"]] : userScored["Modified Attack Complexity"].score
    let modifiedUserInteraction = userScored["Modified User Interaction"].letter === "X" ? cvss["UI"].scores[vectorMap["UI"]] : userScored["Modified User Interaction"].score

    let MISS = Math.min(1 - (1 - confidentialityRequirement * modifiedConfidentiality) * (1 - integrityRequirement * modifiedIntegrity) * (1 - availabilityRequirement * modifiedAvailability), 0.915)

    console.log(`MISS = Math.min(1 - (1 - ${confidentialityRequirement} * ${modifiedConfidentiality}) * (1 - ${integrityRequirement} * ${modifiedIntegrity}) * (1 - ${availabilityRequirement} * ${modifiedAvailability}), 0.915)`)  
    console.log('MISS: ', MISS)
    //let temporalScore = roundUp(baseScore * exploitCodeMaturity * remediationLevel * reportConfidence)

    let modifiedImpact = 0
    if (modifiedScope == "U") {
      modifiedImpact = 6.42 * MISS
    } else {
      let power = Math.pow((MISS * 0.9731 - 0.02), 13)
      console.log(`(${MISS} * 0.9731 - 0.02)^13 = ${power}`)
      modifiedImpact = 7.52 * (MISS - 0.029) - 3.25 * power
    }

    console.log(`modifiedExploitability = 8.22 * ${modifiedAttackVector} * ${modifiedAttackComplexity} * ${modifiedPrivilegesRequired} * ${modifiedUserInteraction}`)
    let modifiedExploitability = 8.22 * modifiedAttackVector * modifiedAttackComplexity * modifiedPrivilegesRequired * modifiedUserInteraction

    let environmentalScore = 0

    console.log("Modified Impact", modifiedImpact)

    if (modifiedImpact > 0) {
      if (modifiedScope === "U") {
        environmentalScore = roundUp(roundUp(Math.min((modifiedImpact + modifiedExploitability), 10) * exploitCodeMaturity * remediationLevel * reportConfidence))
      } else {
        console.log(`roundUp(roundUp(Math.min((1.08 * (${modifiedImpact} + ${modifiedExploitability})), 10) * ${exploitCodeMaturity} * ${remediationLevel} * ${reportConfidence})`)
        environmentalScore = roundUp(roundUp(Math.min((1.08 * (modifiedImpact + modifiedExploitability)), 10) * exploitCodeMaturity * remediationLevel * reportConfidence))
      }
    }

    console.log("Final score:", environmentalScore)
    await db.update(id).set({total_score: environmentalScore}).one()
  } else {

    console.log(`Error: ${id} is missing vector`)
  }
}

/*
 * CWE Score
 * id: weakness id
 * Updates the score of a given weakness using the CWSS equations
 */
async function updateCweScore(id) {
  let categories = await getCategories(id)

  // Function used in the equations
  let f = (num) => {
    if (num == 0) {
      return 0
    } else {
      return 1
    }
  }

  let baseFindingScore = 0;
  let attackSurfaceScore = 0;
  let environmentalImpactScore = 0;

  for (const cat of categories) {
    if (cat.name === 'Temporal Score Metric') {
      // 4(10(TI) + 5(AP + APL) + 5(FC) +f(TI) + IC)

      let TI = 0  // Technical Impact
      let AP = 0  // Acquired Privilege
      let APL = 0 // Aquired Privilege Layer
      let FC = 0  // Finding Confidence
      let IC = 0  // Internal Control Effectiveness

      for (const attr of cat.characteristics[0].attributes) {
        if (attr.name == 'Technical Impact') {
          TI = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Acquired Privilege') {
          AP = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Acquired Privilege Layer') {
          APL = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Internal Control Effectiveness') {
          IC = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Finding Confidence') {
          FC = attr.scores.find(s => s.chosen).chosen
        }
      }

      baseFindingScore = 4*((10*(TI)) + (5*(AP + APL)) + (5*(FC)) + f(TI) + IC)

      await db.update(cat.categoryID).set({total_score: baseFindingScore}).one()

    } else if (cat.name === 'Attack Surface Metric') {
      // (20(RP + RL + AV) + 20(DS) + 15(LI) + 5(AS)) / 100

      let RP = 0 // Required Privilege
      let RL = 0 // Required Privilege Layer
      let AV = 0 // Access Vector
      let DS = 0 // Authentication Strength
      let LI = 0 // Level of Interaction
      let AS = 0 // Deployment Scope

      for (const attr of cat.characteristics[0].attributes) {
        if (attr.name == 'Required Privilege') {
          RP = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Required Privilege Layer') {
          RL = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Access Vector') {
          AV = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Authentication Strength') {
          AS = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Level Of Interaction') {
          LI = attr.scores.find(s => s.chosen).chosen
        } else if (attr.name == 'Deployment Scope') {
          DS = attr.scores.find(s => s.chosen).chosen
        }
      }

      attackSurfaceScore = ((20*(RP + RL + AV)) + (20*(DS)) + (15*(LI)) + (5*(AS))) / 100
      
      await db.update(cat.categoryID).set({total_score: attackSurfaceScore}).one()

    } else if (cat.name === 'Environmental Metric Group') {
      // ((10(BI) + 3(LD) + 4(LE) +3(P)) * f(BI) * EC) / 20

      let BI = 0 // Business Impact
      let LD = 0 // Likelihood of Discovery
      let LE = 0 // Likelihood of Exploit
      let P = 0  // External Control Effectiveness
      let EC = 0 // Prevalence

      for (const attr of cat.characteristics[0].attributes) {
        if (attr.name == 'Business Impact') {
          BI = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Likelihood of Discovery') {
          LD = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Likelihood of Exploit') {
          LE = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'External Control Effectiveness') {
          EC = attr.scores.find(s => s.chosen).score
        } else if (attr.name == 'Prevalence') {
          P = attr.scores.find(s => s.chosen).chosen
        }
      }

      environmentalImpactScore = (((10*(BI)) + (3*(LD)) + (4*(LE)) + (3*(P))) * f(BI) * EC) / 20
      
      await db.update(cat.categoryID).set({total_score: environmentalImpactScore}).one()

    }
  }

  console.log(`totalScore = ${baseFindingScore} * ${attackSurfaceScore} * ${environmentalImpactScore}`)
  let totalScore = baseFindingScore * attackSurfaceScore * environmentalImpactScore

  console.log(`totalScore = ${totalScore}`)

  console.log(`Updating ${id} with a score of ${totalScore}`)
  await db.update(id).set({total_score: totalScore, temporal_score: baseFindingScore, attack_surface_score: attackSurfaceScore, environmental_score: environmentalImpactScore}).one()

  //console.log('Testing: ', await db.select('total_score').from(id).one())

}

/*******************************************************
 * Database functions
 *******************************************************/
async function initServer() {
  server = await OrientDB({
      host: process.env.ORIENT_HOST,
      port: process.env.ORIENT_PORT,
      username: process.env.ORIENT_USER,
      password: process.env.ORIENT_PASS
  })

  return server
}

 async function initDb() {

   let databaseExists = false;
  //Setting the database to use
  //Set up a new username/pw for db
  const dbs = await server.list();
  for (let i = 0; i < dbs.length; i++) {
      if (dbs[i].name === process.env.DB_NAME) {
          databaseExists = true;
      }
  }

  if (databaseExists) {
      db = await server.use({
          name: process.env.DB_NAME,
          username: process.env.ORIENT_USER,
          password: process.env.ORIENT_PASS
      });
      if (!(await checkSchema(await db.query("select expand(classes) from metadata:schema")))) {
        console.log("Database exists, but with different schema.")
        let num = 1
        while (dbs.some(e => e.name === process.env.DB_NAME + num)) {
          num++
        }
        process.env.DB_NAME = process.env.DB_NAME + num
        console.log(`Creating new database: ${process.env.DB_NAME}`)
        console.log('\x1b[31m%s\x1b[0m', `WARNING: The next time you run this app, it will try to use the original database name. Make sure to change the value in .env to use [  ${process.env.DB_NAME}  ]`)
        initDb();
      } else {
        console.log("Using database:", process.env.DB_NAME)
      }
  } else {
      console.log("Creating database:", process.env.DB_NAME)
      new_database();
  }

}

async function checkSchema(qSchema) {
  // Types found on orientdb docs
  let typeList = [
    "Boolean",
    "Integer",
    "Short",
    "Long",
    "Float",
    "Double",
    "DateTime",
    "String",
    "Binary",
    "Embedded",
    "EmbeddedList",
    "EmbeddedSet",
    "EmbeddedMap",
    "Link",
    "LinkList",
    "LinkSet",
    "LinkMap",
    "Byte",
    "Transient",
    "Date",
    "Custom",
    "Decimal",
    "LinkBag",
    "Any"
  ]

  //let qSchema = await db.query("select expand(classes) from metadata:schema")
  //console.log(`Found ${qSchema.length} objects.`)

  let checkList = schema.schema.filter(dbClass => {
    console.log(`Checking if db has [${dbClass.name}]`)                                   // Uncomment this to enforce schema properties
    if (qSchema.some(e => e.name === dbClass.name && e.superClass === dbClass.superclass /*&& dbClass.properties.filter(p => e.properties.some(q => p.name === q.name && typeList[q.type] === p.type && p.linkedClass === q.linkedClass)).length === dbClass.properties.length*/)) {
      console.log(`DB has the class   [${dbClass.name}]`)
      return qSchema
    } else {
      console.log(`DB does not have   [${dbClass.name}]`)
      return undefined
    }
  })

  if (checkList.length == schema.schema.length) {
    console.log("Schema matches")
    return true
  } else {
    console.log("Schema doesn't match")
    return false
  }
}

async function new_database() {
  let newClass = null;
  let newProperty = null;
  //create database
  const newDB = await server.create({
      name: process.env.DB_NAME,
      type: 'graph',
      storage: 'plocal'
  });

  //create schema
  schema.schema.forEach(async function(itemI, indexI) {
      newClass = await newDB.class.create(itemI.name, itemI.superclass);
      newProperty = await newClass.property.create(itemI.properties);
      return newProperty;
  });

  let newSchema = await newDB.query("select expand(classes) from metadata:schema")
  console.log('newSchema: ', newSchema)
  let schemaCheck = await checkSchema(newSchema)

        
  console.log(`Schema check:  ${schemaCheck}`)  

  // initServer().then(async () => {
  //   db = await server.use({
  //     name: process.env.DB_NAME,
  //     username: process.env.ORIENT_USER,
  //     password: process.env.ORIENT_PASS
  //   });

  //   schemaCheck = await checkSchema(await db.query("select expand(classes) from metadata:schema"))
        
  //   console.log(`Schema check:  ${schemaCheck}`)
  // })
  

  db = newDB  

  await createConfigurations();
}

//TODO: This can be deleted when admin has ability to create configurations from admin portal
// NOTE: Above comment is from EMV. Leave this function here.
//       Removed VMAR configuration. Added Software configuration.
async function createConfigurations() {

  const defConf3 = await db.create('VERTEX', 'Configuration')
  .set({
      name: 'Software',
      description: "Software configuration"
  }).one();

  const defConf2 = await db.create('VERTEX', 'Configuration')
  .set({
      name: 'Deathstar',
      description: "That's no moon."
  }).one();
  
}

module.exports = router;
