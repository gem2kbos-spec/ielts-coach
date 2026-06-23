// SQLite的 datetime('now') 产出 "YYYY-MM-DD HH:MM:SS"（空格分隔，无毫秒，UTC），
// JS的 .toISOString() 产出 "YYYY-MM-DD'T'HH:MM:SS.sssZ"（T分隔，带毫秒）。
// 两种格式直接做字符串 >= 比较，在"同一天内"会因为 'T' 和空格的ASCII大小关系比较出错
// (space < 'T'，导致当天创建的行被误判成"早于since")——把ISO格式统一转换成SQLite格式再比较。
function toSqliteDatetime(isoString) {
  return isoString.replace('T', ' ').replace(/\.\d+Z$/, '');
}

module.exports = { toSqliteDatetime };
