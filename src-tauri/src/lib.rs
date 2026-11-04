use chrono::Local;
use rusqlite::{backup::Backup, Connection};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::Manager;

const TXN_KEEP: usize = 100;
const DAILY_KEEP: usize = 90;
const WEEKLY_KEEP: usize = 52;

fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("gold-ledger.db"))
}

fn backups_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Online-safe SQLite copy (works while the app DB connection is open).
fn sqlite_backup(src: &Path, dest: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let src_conn = Connection::open(src).map_err(|e| e.to_string())?;
    let mut dest_conn = Connection::open(dest).map_err(|e| e.to_string())?;
    {
        let backup = Backup::new(&src_conn, &mut dest_conn).map_err(|e| e.to_string())?;
        backup
            .run_to_completion(100, Duration::from_millis(0), None)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn validate_sqlite(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("ဖိုင်မရှိပါ".into());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    if bytes.len() < 16 || &bytes[0..15] != b"SQLite format 3" {
        return Err("SQLite ဒေတာဖိုင် မဟုတ်ပါ".into());
    }
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('customers','prices','txns','settings')",
        )
        .map_err(|e| e.to_string())?;
    let names: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    for need in ["customers", "prices", "txns", "settings"] {
        if !names.iter().any(|n| n == need) {
            return Err(format!("ဒေတာဖိုင် မပြည့်စုံပါ ({need} မရှိ)"));
        }
    }
    Ok(())
}

fn list_named(dir: &Path, prefix: &str) -> Result<Vec<PathBuf>, String> {
    let mut files: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.extension().and_then(|x| x.to_str()) == Some("db")
                && p
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.starts_with(prefix))
                    .unwrap_or(false)
        })
        .collect();
    files.sort();
    files.reverse(); // newest first (lexicographic timestamps)
    Ok(files)
}

fn prune(dir: &Path, prefix: &str, keep: usize) -> Result<(), String> {
    let files = list_named(dir, prefix)?;
    for old in files.into_iter().skip(keep) {
        let _ = fs::remove_file(old);
    }
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupResult {
    path: String,
    kind: String,
    file_name: String,
    created_at: String,
    skipped: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupStatus {
    backups_dir: String,
    last_txn: Option<BackupResult>,
    last_daily: Option<BackupResult>,
    txn_count: usize,
    daily_count: usize,
    /// Newest first — for picking a restore point (full history up to that moment)
    recent: Vec<BackupResult>,
}

fn file_meta(kind: &str, path: &Path) -> BackupResult {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let created_at = path
        .metadata()
        .and_then(|m| m.modified())
        .ok()
        .map(|t| {
            chrono::DateTime::<Local>::from(t)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string()
        })
        .unwrap_or_default();
    BackupResult {
        path: path.to_string_lossy().to_string(),
        kind: kind.to_string(),
        file_name: name,
        created_at,
        skipped: false,
    }
}

#[tauri::command]
fn backup_database(app: tauri::AppHandle, dest: String) -> Result<(), String> {
    let src = db_path(&app)?;
    if !src.exists() {
        return Err("ဒေတာဖိုင် မရှိသေးပါ".into());
    }
    let dest_path = PathBuf::from(&dest);
    let tmp = dest_path.with_extension("db.partial");
    sqlite_backup(&src, &tmp)?;
    if dest_path.exists() {
        fs::remove_file(&dest_path).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, &dest_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn restore_database(app: tauri::AppHandle, src: String) -> Result<(), String> {
    let src_path = PathBuf::from(&src);
    validate_sqlite(&src_path)?;
    let dest = db_path(&app)?;

    // Snapshot current DB first so a mistaken restore can still be undone
    if dest.exists() {
        let dir = backups_dir(&app)?;
        let stamp = Local::now().format("%Y%m%d-%H%M%S");
        let safety = dir.join(format!("pre-restore-{stamp}.db"));
        let _ = sqlite_backup(&dest, &safety);
        let _ = prune(&dir, "pre-restore-", 10);
    }

    let tmp = dest.with_extension("db.tmp");
    sqlite_backup(&src_path, &tmp)?;
    if dest.exists() {
        let bak = dest.with_extension("db.bak");
        let _ = fs::remove_file(&bak);
        fs::rename(&dest, &bak).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_db_file_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(db_path(&app)?.to_string_lossy().to_string())
}

/// kind: "txn" | "daily" | "weekly"
#[tauri::command]
fn auto_backup_database(app: tauri::AppHandle, kind: String) -> Result<BackupResult, String> {
    let src = db_path(&app)?;
    if !src.exists() {
        return Err("ဒေတာဖိုင် မရှိသေးပါ".into());
    }
    let dir = backups_dir(&app)?;
    let now = Local::now();

    let (prefix, file_name, keep, kind_label) = match kind.as_str() {
        "daily" => {
            let day = now.format("%Y%m%d").to_string();
            let name = format!("daily-{day}.db");
            let dest = dir.join(&name);
            if dest.exists() {
                let mut meta = file_meta("daily", &dest);
                meta.skipped = true;
                return Ok(meta);
            }
            ("daily-", name, DAILY_KEEP, "daily")
        }
        "weekly" => {
            // ISO week: 2026-W10
            let week = now.format("%G-W%V").to_string();
            let name = format!("weekly-{week}.db");
            let dest = dir.join(&name);
            if dest.exists() {
                let mut meta = file_meta("weekly", &dest);
                meta.skipped = true;
                return Ok(meta);
            }
            ("weekly-", name, WEEKLY_KEEP, "weekly")
        }
        "txn" => {
            let stamp = now.format("%Y%m%d-%H%M%S").to_string();
            let name = format!("txn-{stamp}.db");
            ("txn-", name, TXN_KEEP, "txn")
        }
        _ => return Err("backup kind မမှန်ပါ".into()),
    };

    let dest = dir.join(&file_name);
    let tmp = dir.join(format!("{file_name}.partial"));
    sqlite_backup(&src, &tmp)?;
    if dest.exists() {
        let _ = fs::remove_file(&dest);
    }
    fs::rename(&tmp, &dest).map_err(|e| e.to_string())?;
    prune(&dir, prefix, keep)?;

    Ok(BackupResult {
        path: dest.to_string_lossy().to_string(),
        kind: kind_label.to_string(),
        file_name,
        created_at: now.format("%Y-%m-%d %H:%M:%S").to_string(),
        skipped: false,
    })
}

fn collect_recent(dir: &Path, limit: usize) -> Result<Vec<BackupResult>, String> {
    let mut all: Vec<BackupResult> = Vec::new();
    for p in list_named(dir, "txn-")? {
        all.push(file_meta("txn", &p));
    }
    for p in list_named(dir, "daily-")? {
        all.push(file_meta("daily", &p));
    }
    for p in list_named(dir, "weekly-")? {
        all.push(file_meta("weekly", &p));
    }
    for p in list_named(dir, "pre-restore-")? {
        all.push(file_meta("pre-restore", &p));
    }
    // Sort by file name stamp descending (embedded in name)
    all.sort_by(|a, b| b.file_name.cmp(&a.file_name));
    all.truncate(limit);
    Ok(all)
}

#[tauri::command]
fn get_auto_backup_status(app: tauri::AppHandle) -> Result<BackupStatus, String> {
    let dir = backups_dir(&app)?;
    let txn_files = list_named(&dir, "txn-")?;
    let daily_files = list_named(&dir, "daily-")?;
    let recent = collect_recent(&dir, 25)?;
    Ok(BackupStatus {
        backups_dir: dir.to_string_lossy().to_string(),
        last_txn: txn_files.first().map(|p| file_meta("txn", p)),
        last_daily: daily_files.first().map(|p| file_meta("daily", p)),
        txn_count: txn_files.len(),
        daily_count: daily_files.len(),
        recent,
    })
}

#[tauri::command]
fn get_backups_dir(app: tauri::AppHandle) -> Result<String, String> {
    Ok(backups_dir(&app)?.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            backup_database,
            restore_database,
            get_db_file_path,
            auto_backup_database,
            get_auto_backup_status,
            get_backups_dir
        ])
        .setup(|app| {
            let _ = db_path(&app.handle());
            let _ = backups_dir(&app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Gold Ledger");
}

#[cfg(test)]
mod backup_tests {
    use super::{list_named, prune, sqlite_backup, validate_sqlite};
    use rusqlite::Connection;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(label: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("gold-ledger-{label}-{nanos}"));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn count(conn: &Connection, table: &str) -> i64 {
        conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |r| r.get(0))
            .unwrap()
    }

    fn seed_full_db(path: &Path) {
        let conn = Connection::open(path).unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE customers (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              phone TEXT,
              nrc TEXT,
              address TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE prices (
              date TEXT PRIMARY KEY,
              buy INTEGER NOT NULL,
              sell INTEGER NOT NULL
            );
            CREATE TABLE price_logs (
              id INTEGER PRIMARY KEY,
              date TEXT NOT NULL,
              time TEXT NOT NULL,
              buy INTEGER NOT NULL,
              sell INTEGER NOT NULL
            );
            CREATE TABLE txns (
              id INTEGER PRIMARY KEY,
              voucher_no INTEGER UNIQUE NOT NULL,
              date TEXT NOT NULL,
              time TEXT NOT NULL,
              type TEXT CHECK(type IN ('sell','buy')) NOT NULL,
              customer_id INTEGER REFERENCES customers(id),
              yway REAL NOT NULL,
              price INTEGER NOT NULL,
              amount INTEGER NOT NULL,
              note TEXT,
              channel TEXT NOT NULL DEFAULT 'loose',
              card_fee INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE txn_cards (
              id INTEGER PRIMARY KEY,
              txn_id INTEGER NOT NULL REFERENCES txns(id) ON DELETE CASCADE,
              denom TEXT NOT NULL,
              qty INTEGER NOT NULL
            );
            CREATE TABLE settings (
              key TEXT PRIMARY KEY,
              value TEXT
            );
            CREATE TABLE stock_adjustments (
              id INTEGER PRIMARY KEY,
              date TEXT NOT NULL,
              time TEXT NOT NULL,
              kind TEXT CHECK(kind IN ('in','out')) NOT NULL,
              yway REAL NOT NULL,
              note TEXT
            );
            CREATE TABLE card_openings (
              denom TEXT PRIMARY KEY,
              qty INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE card_adjustments (
              id INTEGER PRIMARY KEY,
              date TEXT NOT NULL,
              time TEXT NOT NULL,
              kind TEXT CHECK(kind IN ('in','out')) NOT NULL,
              denom TEXT NOT NULL,
              qty INTEGER NOT NULL,
              note TEXT
            );

            INSERT INTO customers (id, name, phone, nrc, address)
              VALUES (1, 'ဦးအောင်', '09-111', '9/သစန(နိုင်)123456', 'သာစည်');
            INSERT INTO customers (id, name, phone, nrc, address)
              VALUES (2, 'ဒေါ်မာ', '09-222', '9/မထလ(နိုင်)654321', 'မိတ္ထီလာ');
            INSERT INTO prices (date, buy, sell) VALUES ('2026-11-04', 3500000, 3600000);
            INSERT INTO price_logs (date, time, buy, sell)
              VALUES ('2026-11-04', '09:00:00', 3500000, 3600000);
            INSERT INTO settings (key, value) VALUES ('shop_name', 'ဦးသန့်စင်');
            INSERT INTO settings (key, value) VALUES ('card_fee', '30000');
            INSERT INTO settings (key, value) VALUES ('opening_stock_yway', '1280');
            INSERT INTO stock_adjustments (date, time, kind, yway, note)
              VALUES ('2026-11-04', '08:00:00', 'in', 256, 'အစ');
            INSERT INTO card_openings (denom, qty) VALUES ('1k', 10);
            INSERT INTO card_openings (denom, qty) VALUES ('5k', 4);
            INSERT INTO card_adjustments (date, time, kind, denom, qty, note)
              VALUES ('2026-11-04', '08:30:00', 'in', '1k', 5, 'ထည့်');
            INSERT INTO txns (
              id, voucher_no, date, time, type, customer_id, yway, price, amount, note, channel, card_fee
            ) VALUES (
              1, 1001, '2026-11-04', '10:00:00', 'sell', 1, 128, 3600000, 3630000, 'ကဒ်ရောင်း', 'card', 30000
            );
            INSERT INTO txns (
              id, voucher_no, date, time, type, customer_id, yway, price, amount, note, channel, card_fee
            ) VALUES (
              2, 1002, '2026-11-04', '11:00:00', 'buy', 2, 64, 3500000, 1750000, 'အဝယ်', 'loose', 0
            );
            INSERT INTO txn_cards (txn_id, denom, qty) VALUES (1, '1k', 1);
            INSERT INTO txn_cards (txn_id, denom, qty) VALUES (1, '5k', 0);
            "#,
        )
        .unwrap();
    }

    #[test]
    fn backup_restore_roundtrip_all_tables() {
        let dir = temp_dir("roundtrip");
        let live = dir.join("gold-ledger.db");
        let bak = dir.join("backup.db");

        seed_full_db(&live);
        validate_sqlite(&live).expect("seed must validate");

        sqlite_backup(&live, &bak).expect("backup");
        validate_sqlite(&bak).expect("backup must validate");

        // Wipe live DB contents (simulate data loss / corruption recovery source)
        fs::remove_file(&live).unwrap();
        {
            let empty = Connection::open(&live).unwrap();
            empty
                .execute_batch("CREATE TABLE customers (id INTEGER PRIMARY KEY);")
                .unwrap();
        }
        assert!(validate_sqlite(&live).is_err());

        // Restore full snapshot
        let restored_tmp = dir.join("restored.tmp");
        sqlite_backup(&bak, &restored_tmp).expect("restore copy");
        fs::rename(&restored_tmp, &live).unwrap();
        validate_sqlite(&live).expect("restored must validate");

        let conn = Connection::open(&live).unwrap();
        assert_eq!(count(&conn, "customers"), 2);
        assert_eq!(count(&conn, "txns"), 2);
        assert_eq!(count(&conn, "txn_cards"), 2);
        assert_eq!(count(&conn, "prices"), 1);
        assert_eq!(count(&conn, "price_logs"), 1);
        assert_eq!(count(&conn, "settings"), 3);
        assert_eq!(count(&conn, "stock_adjustments"), 1);
        assert_eq!(count(&conn, "card_openings"), 2);
        assert_eq!(count(&conn, "card_adjustments"), 1);

        let name: String = conn
            .query_row("SELECT name FROM customers WHERE id = 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(name, "ဦးအောင်");

        let nrc: String = conn
            .query_row("SELECT nrc FROM customers WHERE id = 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(nrc, "9/သစန(နိုင်)123456");

        let voucher: i64 = conn
            .query_row("SELECT voucher_no FROM txns WHERE id = 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(voucher, 1001);

        let card_qty: i64 = conn
            .query_row(
                "SELECT qty FROM txn_cards WHERE txn_id = 1 AND denom = '1k'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(card_qty, 1);

        let shop: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'shop_name'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(shop, "ဦးသန့်စင်");

        let stock_y: f64 = conn
            .query_row("SELECT yway FROM stock_adjustments LIMIT 1", [], |r| r.get(0))
            .unwrap();
        assert!((stock_y - 256.0).abs() < f64::EPSILON);

        let open_qty: i64 = conn
            .query_row(
                "SELECT qty FROM card_openings WHERE denom = '1k'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(open_qty, 10);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn prune_keeps_newest_n() {
        let dir = temp_dir("prune");
        for name in ["txn-20260101-010101.db", "txn-20260102-010101.db", "txn-20260103-010101.db"] {
            fs::write(dir.join(name), b"SQLite format 3\0placeholder").unwrap();
        }
        prune(&dir, "txn-", 2).unwrap();
        let left = list_named(&dir, "txn-").unwrap();
        assert_eq!(left.len(), 2);
        let names: Vec<String> = left
            .iter()
            .filter_map(|p| p.file_name().and_then(|n| n.to_str()).map(str::to_string))
            .collect();
        assert!(names.contains(&"txn-20260103-010101.db".to_string()));
        assert!(names.contains(&"txn-20260102-010101.db".to_string()));
        assert!(!names.contains(&"txn-20260101-010101.db".to_string()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn validate_sqlite_rejects_garbage() {
        let dir = temp_dir("validate");
        let bad = dir.join("bad.db");
        fs::write(&bad, b"not a database").unwrap();
        assert!(validate_sqlite(&bad).is_err());

        let missing = dir.join("nope.db");
        assert!(validate_sqlite(&missing).is_err());

        let incomplete = dir.join("partial.db");
        {
            let conn = Connection::open(&incomplete).unwrap();
            conn.execute_batch("CREATE TABLE customers (id INTEGER PRIMARY KEY);")
                .unwrap();
        }
        assert!(validate_sqlite(&incomplete).is_err());

        let _ = fs::remove_dir_all(&dir);
    }
}
