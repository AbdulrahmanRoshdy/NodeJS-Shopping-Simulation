'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const port = process.env.PORT || 8080;
const mongoose = require('mongoose');
const helmet = require('helmet');
const path = require('path');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const app = express();
const config = require('./lib/config.js');

mongoose.connect(config.db.url);

const Products = require('./models/Products');
const Cart = require('./lib/Cart');
const Security = require('./lib/Security');

const store = new MongoDBStore({
    uri: config.db.url,
    collection: config.db.sessions
});

app.set('view engine', 'ejs');
app.set('env', 'development');

app.locals.locale = config.locale;

app.use('/public', express.static(path.join(__dirname, '/public'), {
  maxAge: 0,
  dotfiles: 'ignore',
  etag: false
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(helmet());
app.use(session({
    secret: config.secret,
    resave: false,
    saveUninitialized: true,
    unset: 'destroy',
    store: store,
    name: config.name + '-' + Security.generateId(),
    genid: (req) => {
        return Security.generateId()
    }
}));

app.get('/', (req, res) => {
  if(!req.session.cart) {
      req.session.cart = {
          items: [],
          totals: 0.00,
          formattedTotals: ''
      };
  }  
  Products.find({price: {'$gt': 0}}).sort({price: -1}).limit(6).then(products => {
      let format = new Intl.NumberFormat(req.app.locals.locale.lang, {style: 'currency', currency: req.app.locals.locale.currency });
      products.forEach( (product) => {
         product.formattedPrice = format.format(product.price);
      });
      res.render('index', {
          pageTitle: 'Node.js Shopping Cart',
          products: products,
          nonce: Security.md5(req.sessionID + req.headers['user-agent'])
      });

  }).catch(err => {
      res.status(400).send('Not Found');
  });

});

app.get('/cart', (req, res) => {
    let session = req.session;
    let cart = (typeof session.cart !== 'undefined') ? session.cart : false;
    res.render('cart', {
        pageTitle: 'Cart',
        cart: cart,
        nonce: Security.md5(req.sessionID + req.headers['user-agent'])
    });
});

app.post('/cart', (req, res) => {
    let qty = parseInt(req.body.qty, 10);
    let product = parseInt(req.body.product_id, 10);
    if(qty > 0 && Security.isValidNonce(req.body.nonce, req)) {
        Products.findOne({product_id: product}).then(prod => {
            let cart = (req.session.cart) ? req.session.cart : null;
            Cart.addToCart(prod, qty, cart);
            res.redirect('/cart');
        }).catch(err => {
           res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
});

app.post('/cart/update', (req, res) => {
    let ids = req.body["product_id[]"];
    let qtys = req.body["qty[]"];
    if(Security.isValidNonce(req.body.nonce, req)) {
        let cart = (req.session.cart) ? req.session.cart : null;
        let i = (!Array.isArray(ids)) ? [ids] : ids;
        let q = (!Array.isArray(qtys)) ? [qtys] : qtys;
        Cart.updateCart(i, q, cart);
        res.redirect('/cart');
    } else {
        res.redirect('/');
    }
});


app.use((err, req, res, next) => {
  res.status(err.status || 500);
});

app.listen(port);