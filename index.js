const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
const port = 5000;
var Airtable = require("airtable");
var base = new Airtable({ apiKey: process.env.API_KEY }).base(
  process.env.BASE_ID
);

app.use(cors());
dotenv.config();
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Welcome to my API!");
});

let cache = [];

const getData = async () => {
  try {
    let data = [];
    base("Projects")
      .select({
        view: "Grid view",
      })
      .firstPage(function (err, records) {
        if (err) {
          console.error(err);
          return;
        }
        records.forEach(function (record) {
          console.log(
            "Retrieved",
            record.get("Coin ID"),
            record.get("Coin Name"),
            record.get("Price")
          );
          var id = record.get("Coin ID");
          var name = record.get("Coin Name");
          var price = record.get("Price");
          var obj = {
            id: id,
            name: name,
            price: price,
          };
          data.push(obj);
        });
      });
    return data;
  } catch (err) {
    console.log(err);
    return cache;
  }
};

app.get("/coins", async (req, res) => {
  try {
    const data = await getData();
    res.send(data);
  } catch (err) {
    console.log(err);
  }
});

app.get("/coins/price/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);
    let price = await getPrice(id);
    console.log(price);
    res.json(price);
  } catch (err) {
    console.log(err);
  }
});

async function getPrice(coinId) {
  let price = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
  )
    .then((response) => response.json())
    .then((data) => {
      return data[coinId]?.usd;
    });
  return price;
}

async function storeData() {
  let response = [];
  await fetch("https://api.coingecko.com/api/v3/coins/list")
    .then((response) => response.json())
    .then((data) => {
      return data.slice(0, 20);
    })
    .then((data) =>
      data.forEach((element) => {
        var id = element.id;
        var name = element.name;
        var symbol = element.symbol;
        var price;
        getPrice(id).then((res) => {
          price = res;
        });
        var obj = {
          "Coin ID": id,
          "Coin Name": name,
          Symbol: symbol,
          Price: price,
        };
        response.push(obj);
      })
    );
  cache = response;
  base("Projects").create(response, function (err, records) {
    if (err) {
      console.error(err);
      return;
    }
    records.forEach(function (record) {
      console.log(record.getId());
    });
  });
}

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
  setInterval(() => {
    try {
      storeData();
    } catch (err) {
      console.log(err);
    }
  }, 60000 * 20); // 20 minutes
});
