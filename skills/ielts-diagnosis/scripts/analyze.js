#!/usr/bin/env node
// 输出近 N 天的练习数据聚合（JSON），供 Claude 在对话里读取后给出诊断与训练计划。
// 用法: node analyze.js [days]
//
// 这个脚本直接读DB，不走HTTP，所以不会经过server的requireAuth中间件——
// 但加了用户系统后数据本身是按user_id隔离的，所以这里要自己决定"读哪个用户的"：
// 跟其他skill一样，认本机登录时落下的 data/local_token.txt，解出里面的userId。
const fs = require('fs');
const path = require('path');
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') }); // 必须先加载，否则下面verifyToken会因为读不到JWT_SECRET而生成新的，让现有token全部失效
const { getSummary } = require(path.join(PROJECT_ROOT, 'server', 'lib', 'dashboardAggregate'));
const { getAccuracyBySection } = require(path.join(PROJECT_ROOT, 'server', 'lib', 'listeningStats'));
const { verifyToken } = require(path.join(PROJECT_ROOT, 'server', 'lib', 'auth'));

const TOKEN_PATH = path.join(PROJECT_ROOT, 'data', 'local_token.txt');

function getLocalUserId() {
  let token;
  try {
    token = fs.readFileSync(TOKEN_PATH, 'utf8').trim();
  } catch {
    token = '';
  }
  if (!token) {
    console.error('还没有人在网页登录过(data/local_token.txt不存在)，先让用户打开网页注册/登录一次');
    process.exit(1);
  }
  try {
    return verifyToken(token);
  } catch (err) {
    console.error(`本机保存的登录态已失效(${err.message})，请重新在网页登录一次`);
    process.exit(1);
  }
}

const userId = getLocalUserId();
const days = Number(process.argv[2]) || 30;
const summary = getSummary(userId, { days });
summary.listeningBySection = getAccuracyBySection(userId);
console.log(JSON.stringify(summary, null, 2));
