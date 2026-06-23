#!/usr/bin/env node
// 输出近 N 天的练习数据聚合（JSON），供 Claude 在对话里读取后给出诊断与训练计划。
// 用法: node analyze.js [days]
const path = require('path');
const { getSummary } = require(path.join(__dirname, '..', '..', '..', 'server', 'lib', 'dashboardAggregate'));
const { getAccuracyBySection } = require(path.join(__dirname, '..', '..', '..', 'server', 'lib', 'listeningStats'));

const days = Number(process.argv[2]) || 30;
const summary = getSummary({ days });
summary.listeningBySection = getAccuracyBySection();
console.log(JSON.stringify(summary, null, 2));
