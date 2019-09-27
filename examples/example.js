const cortina = require("kth-node-cortina-block");

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  cortina({ url: "https://www.kth.se/cm/" })
    .then(function(blocks) {
      res.send(blocks);
    })
    .catch(function(err) {
      console.log({ err: err }, "failed to get cortina blocks");
    });
});

app.listen(3000, () => console.log(`Example app started.`));
