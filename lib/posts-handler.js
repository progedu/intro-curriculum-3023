'use strict';
const pug = require('pug');
const Cookies = require('cookies');
const util = require('./handler-util');
const Post = require('./post');

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
        // ログが長いので改行して見やすくしたい。
        const logs = [
          `閲覧されました: user: ${req.user}`,
          `user-agent: ${req.headers['user-agent']}`,
          `trackingId: ${cookies.get(trackingIdKey) }`,
          `remoteAddress: ${req.connection.remoteAddress}`,
          `--------------------------------------------------------------`
        ];
        for (const logData of logs) {
          console.info(logData);
        }
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
        // 投稿ログにも同様に細かい情報を出せるかやってみる。
        const logs = [
          `投稿されました: ${content}`,
          `user-agent: ${req.headers['user-agent']}`,
          `trackingId: ${cookies.get(trackingIdKey) }`,
          `remoteAddress: ${req.connection.remoteAddress}`,
          `--------------------------------------------------------------`
        ];
        for (const logData of logs) {
          console.info(logData);
        }
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

function addTrackingCookie(cookies) {
  if (!cookies.get(trackingIdKey)) {
    const trackingId = Math.floor(Math.random() * 10000000);
    const tomorrow = new Date(new Date().getTime() + (1000 * 60 * 60 * 24));
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
