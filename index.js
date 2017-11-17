'use strict'

const config = require('config')
const unusual = require('unusual-wikipedia')
const twitterClient = require('twit')
const shuffle = require('lodash.shuffle')
const moment = require('moment-timezone')

const loadJSON = require('load-json-file')
const writeJSON = require('write-json-file')

const getKnownArticles = () =>
    loadJSON(config.knownArticlesFile)
    .catch((err) => [])

const pickArticle = async () => {
    const known = await getKnownArticles()
    const all = await unusual()
    const unknown = all.filter((x) => !known.includes(x.url) && (x.title.length + x.description.length < 240) && x.description.length > 20)
    const article = shuffle(unknown)[0]
    known.push(article.url)
    await writeJSON(config.knownArticlesFile, known).catch((err) => err ? console.error(err) : null)
    return article
}

const twitter = new twitterClient({
	consumer_key: config.twitter.key,
	consumer_secret: config.twitter.key_secret,
	access_token: config.twitter.token,
	access_token_secret: config.twitter.token_secret,
	timeout_ms: 60*1000
})

let sendTweet

if(config.debug){
    config.postDays = [1,2,3,4,5,6,7]
	sendTweet = (message) => console.log(message)
}
else{
	sendTweet = (message) => twitter.post('statuses/update', {status: message}, (e) => e ? console.error(e) : null)
}


const post = async () => {
	const article = await pickArticle()
    if(article){
        const text = `${article.title} - ${article.description} ${article.url}`
        sendTweet(text)
    }
    else console.error('no articles found', new Date())
}


const check = () => {
	const currentDay = moment.tz('Europe/Berlin').isoWeekday()
	if(config.postDays.indexOf(currentDay)>=0) post()
}

check()
setInterval(() => check(), 24*60*60*1000)
