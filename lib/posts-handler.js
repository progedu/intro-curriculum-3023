'use strict';
const pug = require('pug');
const Cookies = require('cookies');
const util = require('./handler-util');
const Post = require('./post');
//tracking_idという単語を入れるためだけの文字列。変数名が変わった時の影響範囲が小さくなる
const trackingIdKey = 'tracking_id';

function handle(req, res) {
  const cookies = new Cookies(req, res);
  addTrackingCookie(cookies);

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      Post.findAll({ order: [['id', 'DESC']] }).then((posts) => {
        res.end(pug.renderFile('./views/posts.pug', {
          posts: posts
        }));
        console.info(
          `閲覧されました: 
          user: ${req.user}, 
          trackingId: ${cookies.get(trackingIdKey) },
          remoteAddress: ${req.connection.remoteAddress}, 
          userAgent: ${req.headers['user-agent']} ` 
        );
      });
      break;
    case 'POST':
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        const decoded = decodeURIComponent(body);
        const content = decoded.split('content=')[1];
        console.info('投稿されました: ' + content);
        Post.create({
          content: content,
          trackingCookie: cookies.get(trackingIdKey),
          postedBy: req.user
        }).then(() => {
          handleRedirectPosts(req, res);
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function addTrackingCookie(cookies){
  if(!cookies.get(trackingIdKey)){//tracking_idというキーの値をクッキーから取り出している
    const trackingId =  Math.floor(Math.random() * Number.MAX_SAFE_INTEGER); //
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    //第一引数(cookieのもつプロパティの名前)に第二引数を詰める、第三引数はオプションかな
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
  }
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle
};
