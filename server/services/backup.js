const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { getDb, closeDb, DB_PATH } = require('../db/client');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USER_IMPORTS_DIR = path.join(DATA_DIR, 'user-imports');
const RECORDINGS_DIR = path.join(DATA_DIR, 'audio', 'recordings');

// 加到zip里的目录——题库导入文件(阅读PDF/听力音频+地图截图)+口语录音。
// tts_cache不进备份：那是AI配音的缓存，丢了重新生成就行，没有不可恢复的价值，且可能占地方。
function addDirIfExists(archive, dir, zipPrefix) {
  if (fs.existsSync(dir)) archive.directory(dir, zipPrefix);
}

// 用better-sqlite3的在线备份API而不是直接复制文件——项目开了WAL模式，
// 直接cp可能漏掉还在-wal文件里没合并进主文件的数据，db.backup()能给一个一致的快照。
async function snapshotDatabase() {
  const db = getDb();
  const tmpPath = path.join(os.tmpdir(), `ielts-backup-${Date.now()}.db`);
  await db.backup(tmpPath);
  return tmpPath;
}

async function streamBackupZip(res) {
  const dbSnapshotPath = await snapshotDatabase();
  const archive = archiver('zip', { zlib: { level: 9 } });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="ielts-coach-backup-${new Date().toISOString().slice(0, 10)}.zip"`);

  archive.on('error', (err) => {
    res.status(500).end(`备份失败: ${err.message}`);
  });
  archive.on('end', () => {
    fs.unlink(dbSnapshotPath, () => {});
  });

  archive.pipe(res);
  archive.append(
    JSON.stringify({ createdAt: new Date().toISOString(), version: 1 }, null, 2),
    { name: 'manifest.json' }
  );
  archive.file(dbSnapshotPath, { name: 'ielts.db' });
  addDirIfExists(archive, USER_IMPORTS_DIR, 'user-imports');
  addDirIfExists(archive, RECORDINGS_DIR, 'audio/recordings');
  await archive.finalize();
}

// 恢复是"补充式"的：题库/录音文件只解压覆盖同名文件，不会先清空目录再还原，
// 避免误删备份之后新产生的、备份里没有的文件。db文件本身会整个替换，
// 替换前把当前的db存一份"-before-restore"后缀，万一恢复出问题还能手动找回来。
function restoreFromZipBuffer(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const manifestEntry = entries.find((e) => e.entryName === 'manifest.json');
  if (!manifestEntry) throw new Error('这不是一个有效的备份文件(缺少manifest.json)');

  const dbEntry = entries.find((e) => e.entryName === 'ielts.db');
  if (dbEntry) {
    // 先关连接再换文件：WAL模式下直接覆盖磁盘文件而连接还活着可能导致状态不一致
    closeDb();
    const backupOfCurrent = `${DB_PATH}.before-restore-${Date.now()}`;
    if (fs.existsSync(DB_PATH)) fs.copyFileSync(DB_PATH, backupOfCurrent);
    fs.writeFileSync(DB_PATH, dbEntry.getData());
    // 关闭时WAL应该已经checkpoint合并了，但保险起见清掉可能残留的sidecar文件，
    // 避免它们跟刚写入的新db文件内容不匹配
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${DB_PATH}${suffix}`;
      if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
    }
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (entry.entryName === 'manifest.json' || entry.entryName === 'ielts.db') continue;
    const destPath = path.join(DATA_DIR, entry.entryName);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, entry.getData());
  }

  return { restoredDb: !!dbEntry, restoredFiles: entries.length - (manifestEntry ? 1 : 0) - (dbEntry ? 1 : 0) };
}

module.exports = { streamBackupZip, restoreFromZipBuffer };
