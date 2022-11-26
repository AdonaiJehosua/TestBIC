import fetch from 'node-fetch'
import AdmZip from 'adm-zip'
import iconv from 'iconv-lite'
import convert from 'xml-js'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import { createWriteStream, unlinkSync } from 'node:fs'

const url = 'http://www.cbr.ru/s/newbik'
const path = './data.zip'

async function prepareBIC() {
    try {
        const response = await fetch(url)
        const streamPipeline = promisify(pipeline);
        await streamPipeline(response.body, createWriteStream(path))

        const zip = new AdmZip(path)

        let preparedData = []
        let compliteData = []

        zip.getEntries().forEach(entry => {
            const decompressedData = iconv.decode(zip.readFile(entry), 'windows1251')
            preparedData = convert.xml2js(decompressedData, { compact: true, ignoreDeclaration: true })
                .ED807.BICDirectoryEntry.filter(el => el.Accounts)
        })

        preparedData.map(el => {
            if (Array.isArray(el.Accounts)) {
                el.Accounts.map((acc) => {
                    const elem = {
                        bic: el._attributes.BIC,
                        name: el.ParticipantInfo._attributes.NameP,
                        corAccount: acc._attributes.Account
                    }
                    compliteData.push(elem)
                })
            } else {
                const elem = {
                    bic: el._attributes.BIC,
                    name: el.ParticipantInfo._attributes.NameP,
                    corAccount: el.Accounts._attributes.Account
                }
                compliteData.push(elem)
            }
        })

        unlinkSync(path)

        return compliteData
    }
    catch (e) {
        console.error(e)
    }
}

prepareBIC()
