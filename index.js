const wrap = require('minecraft-wrap')
const mf = require('mineflayer')
const path = require('path')
const fs = require('fs')
const wait = require('util').promisify(setTimeout)
const { Vec3 } = require('vec3')

const { launchServer } = require('./lib/wrappedServer')
const { launchBot } = require('./lib/wrappedBot')
const PItem = require('prismarine-item')

function onceWithTimeout(emitter, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      emitter.removeListener(event, listener)
      clearTimeout(timeoutHandle)
    }

    const listener = (...args) => {
      cleanup()
      resolve(args)
    }
    const timeoutHandle = setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, timeout)

    emitter.once(event, listener)
  })
}

const Versions = ['1.16']

const jarsPath = path.join('./jars')
const serverPath = path.join('./servers')
const dataOutput = path.join('./data')

const serverOptions = require('./serverOptions.json')
// const { once } = require('events')

async function runBlocks(version) {
  const jarFile = path.resolve(path.join(jarsPath, version + '.jar'))
  const serverDir = path.resolve(path.join(serverPath, version))
  const outputLog = path.resolve(path.join(dataOutput, version + '.txt'))
  fs.mkdirSync(path.dirname(jarFile), { recursive: true })
  fs.mkdirSync(path.dirname(serverDir), { recursive: true })
  fs.mkdirSync(path.dirname(outputLog), { recursive: true })
  const Item = PItem(version)

  const vServer = await launchServer(version, jarFile, serverOptions)
  const stop = () => {
    return new Promise((resolve) => {
      process.removeAllListeners('SIGINT')
      vServer.stopServer(() => {
        vServer.deleteServerData(() => {
          console.info('Deleted server data')
          resolve()
        })
      })
    })
  }
  process.once('SIGINT', () => {
    stop()
  })
  const bot = await launchBot(version)
  while (!bot.entity.onGround) {
    await wait(100)
  }
  const at = bot.entity.position.floored()
  const mcData = require('minecraft-data')(version)
  bot._client.write('set_creative_slot', {
    slot: 36,
    item: { blockId: -1 }
  })
  await wait(2000)
  console.log('Building at ', at)
  // let [username, message] = await once(bot, 'chat')
  // while (message !== 'start') {
  //   [username, message] = await once(bot, 'chat')
  // }
  for (const [name, item] of Object.entries(mcData.itemsByName)) {
    await bot.creative.setInventorySlot(36, new Item(item.id, 1))

    const placeAt = bot.entity.position.floored().offset(2, 0, 0)
    // await bot.placeBlock(bot.blockAt(placeAt.offset(0, -1, 0)), new Vec3(0, 1, 0), true)
    
    const blockPlace = bot._placeBlockWithOptions(bot.blockAt(placeAt.offset(0, -1, 0)), new Vec3(0, 1, 0), { swingArm: 'right', forceLook: true})
    // console.info('Listening for', `blockUpdate:${placeAt.toString()}`)
    const blockUpdate = onceWithTimeout(bot, `blockUpdate:${placeAt.toString()}`)

    try {
      const result = await Promise.all([blockPlace, blockUpdate])
      const blockName = result[1][1].name
      console.info('Item', name, '->', blockName)
      fs.appendFileSync(outputLog, `${name};${blockName}\n`)
    } catch (err) {
      console.info('Item', name, '-> Error', err.message)
      fs.appendFileSync(outputLog, `${name};None\n`)
      await wait(100)
    }
    
    bot.chat(`/tp ${bot.username} ~ ~ ~2`)
    while (true) {
      try {
        await onceWithTimeout(bot, 'forcedMove')
        await wait(100)
        break
      } catch (err) {
        console.info('Got error teleporting', err.message)
      }
    }
  }

  console.info('Version', version, 'done cleaning up')
  await stop()
}

;(async () => {
  for (const version of mf.supportedVersions) {
    await runBlocks(version)
  }
})()
