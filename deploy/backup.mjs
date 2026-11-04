import Database from '/opt/mm-lab/server/node_modules/better-sqlite3/lib/index.js';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dbPath=process.env.DB_PATH||'/var/lib/mm-lab/lab.sqlite';
const backupDir=process.env.BACKUP_DIR||'/var/backups/mm-lab';
fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const target=path.join(backupDir,`lab-${stamp}.sqlite`);
const db=new Database(dbPath,{readonly:true,fileMustExist:true});
try{await db.backup(target)}finally{db.close()}
const backup=new Database(target,{fileMustExist:true});
try{backup.pragma('journal_mode = DELETE');if(backup.pragma('integrity_check',{simple:true})!=='ok')throw new Error('backup integrity check failed')}finally{backup.close()}
fs.chmodSync(target,0o600);
const files=fs.readdirSync(backupDir).filter(x=>/^lab-.*\.sqlite$/.test(x)).sort().reverse();
for(const old of files.slice(14)){for(const suffix of ['','-wal','-shm']){const file=path.join(backupDir,old+suffix);if(fs.existsSync(file))fs.unlinkSync(file)}}
if(process.env.RCLONE_TARGET){const r=spawnSync('rclone',['copy',target,process.env.RCLONE_TARGET],{stdio:'inherit'});if(r.status!==0)throw new Error(`rclone failed: ${r.status}`)}
console.log(`SQLite backup verified: ${target}`);
