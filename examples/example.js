/* eslint-disable no-console */
const cortina = require('@kth/cortina-block')
const express = require('express')

const app = express()

app.get('/', (req, res) => {
  cortina({ url: 'https://www.kth.se/cm/' })
    .then(blocks => {
      res.send(blocks)
    })
    .catch(err => {
      console.log({ err }, 'failed to get cortina blocks')
    })
})

app.listen(3000, () => console.log(`Example app started.`))
