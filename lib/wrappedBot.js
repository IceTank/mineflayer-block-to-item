const mf = require('mineflayer')
const { once } = require('events')

async function launchBot(version) {
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

module.exports = {
  launchBot
}