#!/usr/bin/env node
// 输出近 N 天（默认7天）的练习数据聚合（JSON），供 Claude 在对话里转述成文字摘要。
// 用法: node report.js [days]
const path = require('path');
const { getSummary } = require(path.join(__dirname, '..', '..', '..', 'server', 'lib', 'dashboardAggregate'));
const { getUsageSummary } = require(path.join(__dirname, '..', '..', '..', 'server', 'db', 'usageLogRepo'));

const days = Number(process.argv[2]) || 7;
const summary = getSummary({ days });
summary.aiUsage = getUsageSummary({ days });
console.log(JSON.stringify(summary, null, 2));
