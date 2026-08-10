#!/usr/bin/env node
// 输出近 N 天（默认7天）的练习数据聚合（JSON），供 Claude 在对话里转述成文字摘要。
// 用法: node report.js [days]
//
// 直接读DB不走HTTP，所以要自己认本机登录态(data/local_token.txt)来决定读哪个用户的数据，
// 跟 ielts-diagnosis/scripts/analyze.js 是同一套逻辑。
const fs = require('fs');
const path = require('path');
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') });
const { getSummary } = require(path.join(PROJECT_ROOT, 'server', 'lib', 'dashboardAggregate'));
const { getUsageSummary } = require(path.join(PROJECT_ROOT, 'server', 'db', 'usageLogRepo'));
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
const days = Number(process.argv[2]) || 7;
const summary = getSummary(userId, { days });
summary.aiUsage = getUsageSummary({ days }); // AI花费统计是本机整体维度，不分用户(见架构决策记录)
console.log(JSON.stringify(summary, null, 2));
