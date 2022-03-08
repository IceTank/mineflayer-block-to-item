const wrap = require('minecraft-wrap')
const path = require('path')
const fs = require('fs')

const serverPatchConfigs = path.join(__dirname, '../serverPatches')

async function launchServer(version, jarFile, serverOptions) {
  const serverPath = path.join(__dirname, '..', 'servers', version)
  async function patchServerConfig() {
    const userCache = JSON.parse(await fs.promises.readFile(path.join(serverPatchConfigs, 'usercache.json')))
    userCache["expiresOn"] = "2022-12-07 14:12:55 +0200" // Hm how can I generate this?
    await fs.promises.mkdir(serverPath, { recursive: true })
    await fs.promises.writeFile(path.join(serverPath, 'usercache.json'), JSON.stringify(userCache))
    // console.info('Coping', path.join(serverPatchConfigs, 'ops.json'), path.join(serverPath, 'ops.json'))
    await fs.promises.cp(path.join(serverPatchConfigs, 'ops.json'), path.join(serverPath, 'ops.json'))
    await fs.promises.cp(path.join(serverPatchConfigs, 'eula.txt'), path.join(serverPath, 'eula.txt'))
    await fs.promises.cp(path.join(serverPatchConfigs, 'server.properties'), path.join(serverPath, 'server.properties'))
  }
  console.info('Patching server files')
  await patchServerConfig()
  console.info('Downloading server files for version', version)
  await new Promise((resolve, reject) => {
    wrap['downloadServer'](version, jarFile, function (err) {
      if (err) return reject(err)
      resolve()
    })
  })
  console.log('Download server complete !')
  const vServer = new wrap.WrapServer(jarFile, serverPath, { noOverride: true })
  vServer.on('line', function (line) {
    if (line.includes('Teleported') || line.includes('advancement')) return
    console.log(line)
  })
  await new Promise((resolve, reject) => {
    vServer.startServer(serverOptions, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
  console.log('Server Started !')
  return vServer
}

module.exports = {
  launchServer
}