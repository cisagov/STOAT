/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*
  Function to update the JsonRep object inside the database
*/
export async function updateJsonRep(cisID) {

    let url = process.env.REACT_APP_DB + '/updateJsonRep'

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({cisID: cisID})
    })

}

/*
    Function to parse STIX bundle and return a list of CVE ids found within.
*/
export async function parseStixBundle(stix) {
    let foundVuln = false;

    let regex = /(CVE-\d\d\d\d-\d\d\d\d\d?)|(CWE-\d*)/
    let ids = []
    // Loop through each object
    stix.objects.forEach(elem => {
        if (elem.type === 'vulnerability') {
            foundVuln = true;

            // Use regex to find CVE or CWE

            // Search the name first
            let results = regex.exec(elem.name)

            if (results) {
              ids = ids.concat(results)
            } else {
              // ID wasn't found in the name. Search the external references.
              if (elem.external_references) {
                elem.external_references.forEach(ref => {
                  results = regex.exec(ref.source_name)
                  
                  if (results) {
                    ids = ids.concat(results)
                  } else {
                    console.log(`<parse> No id found in vulnerability '${elem.id}': ${elem.name}`)
                  }
                })
              }
            }
        }

        // Get rid of duplicate values
        ids = [...new Set(ids)]

        // Get rid of undefined values
        ids = ids.filter(el => {
          return el !== undefined;
        })
    })

    if (!foundVuln) {
        console.log("Error: No vulnerabilities found")
    } else if (ids.length === 0) {
      console.log("Error: No ids found in vulnerabilities.")
    }

    console.log(`<parse> Found vulnerabilities: ${ids}`)

    return ids
}