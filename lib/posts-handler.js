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
      Post.findAll({order:[['id', 'DESC']]}).then((posts) => {
        res.end(pug.renderFile('./views/posts.pug', {
          posts: posts
        }));
        console.info(
          "閲覧されました\r\n\t" +
          `user: ${req.user},\r\n\t` +
          `trackingId: ${cookies.get(trackingIdKey) },\r\n\t` +
          `remoteAddress: ${req.connection.remoteAddress},\r\n\t` +
          `userAgent: ${req.headers['user-agent']} `
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

const addTrackingCookie = cookies => !cookies.get(trackingIdKey) ? (() => {
  const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  const tomorrow = new Date();
  tomorrow.setDate( tomorrow.getDate() + 1 );
  cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
})() : null;

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle
};