const wrap = require('minecraft-wrap')
const mf = require('mineflayer')
const path = require('path')
const fs = require('fs')

const Versions = ['1.16']

const jarsPath = path.join('./jars')
const serverPath = path.join('./servers')

const serverOptions = require('./serverOptions.json')
const { once } = require('events')

const version = '1.16.5'

async function runBlocks(version) {
  const jarFile = path.resolve(path.join(jarsPath, version + '.jar'))
  const serverDir = path.resolve(path.join(serverPath, version))
  fs.mkdirSync(path.dirname(jarFile), { recursive: true })
  fs.mkdirSync(path.dirname(serverDir), { recursive: true })
  
  async function launchServer() {
    await new Promise((resolve, reject) => {
      wrap['downloadServer'](version, jarFile, function (err) {
        if (err) return reject(err)
        resolve()
      })
    })
    console.log('Download server complete !')
    const vServer = new wrap.WrapServer(jarFile, serverDir)
    vServer.on('line', function (line) {
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

  async function launchBot() {
    const bot = mf.createBot({
      username: 'blockBot',
      skipValidation: true,
      version: version
    })
    bot.on('kicked', console.error)
    bot.on('error', console.error)
    bot.on('end', () => console.info('Bot disconnected'))

    await once(bot, 'spawn')
    return bot
  }
  const vServer = await launchServer()
  process.once('exit', () => {
    vServer.stopServer(() => {
      vServer.deleteServerData(() => {console.info('Deleted server data')})
    })
  })
  const bot = await launchBot()
  while (!bot.entity.onGround) {
    await wait(100)
  }
  const at = bot.entity.position.floored()
  console.log('Building at ', at)
  const mcData = require('minecraft-data')(version)

  for (const [name, block] of Object.entries(mcData.blocksByName)) {
    bot.creative.setInventorySlot(36, )

    const facing = block.states.find(x => x.name === 'facing')
    if (facing) {
      const wall = name.includes('wall') || name === 'ladder' || name === 'tripwire_hook'
      const itemName = wall ? name.replace('wall_', '') : name
      // console.log('Placing', name, JSON.stringify(facing))
      if (!mcData.itemsByName[itemName]) {
        console.log('Cant place :', name)
        continue
      }
      if (wall) {
        await bot.builder.equipItem(mcData.itemsByName.dirt.id)
        await bot.placeBlock(bot.blockAt(at.offset(0, -1, 4)), new Vec3(0, 1, 0))
      }
      await bot.builder.equipItem(mcData.itemsByName[itemName].id)
      // try {

      if (wall) await bot.placeBlock(bot.blockAt(at.offset(0, 0, 4)), new Vec3(0, 0, -1))
      else await bot.placeBlock(bot.blockAt(at.offset(0, -1, 3)), new Vec3(0, 1, 0))
      const result = bot.blockAt(at.offset(0, 0, 3))
      console.log(name, result.getProperties().facing, facing.num_values)
      await bot.dig(result)

      if (wall) await bot.dig(bot.blockAt(at.offset(0, 0, 4)))

      const face = result.getProperties().facing
      if (wall) {
        assert.ok(['north', 'south'].includes(face))
        facingData[name] = {
          is3D: facing.num_values > 4,
          faceDirection: true,
          inverted: face === 'south'
        }
      } else {
        if (['up', 'down'].includes(face)) {
          facingData[name] = {
            is3D: facing.num_values > 4,
            faceDirection: true,
            inverted: face === 'down'
          }
        } else {
          facingData[name] = {
            is3D: facing.num_values > 4,
            faceDirection: result.name.includes('trapdoor'),
            inverted: face === 'south'
          }
        }
      }

      /* } catch (e){
        console.log(name, 'cant be placed on floor', facing.num_values)
      } */
      await wait(50)
    }
  }

}

runBlocks(version)