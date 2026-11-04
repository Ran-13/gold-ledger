//! Standalone copy of AppData backup helpers — same algorithms as `src-tauri/src/lib.rs`.
use rusqlite::{backup::Backup, Connection};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

pub fn sqlite_backup(src: &Path, dest: &Path) -> Result<(), String> {
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

pub fn validate_sqlite(path: &Path) -> Result<(), String> {
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

pub fn list_named(dir: &Path, prefix: &str) -> Result<Vec<PathBuf>, String> {
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
    files.reverse();
    Ok(files)
}

pub fn prune(dir: &Path, prefix: &str, keep: usize) -> Result<(), String> {
    let files = list_named(dir, prefix)?;
    for old in files.into_iter().skip(keep) {
        let _ = fs::remove_file(old);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(label: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("gl-brt-{label}-{nanos}"));
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
              id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT, nrc TEXT, address TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE prices (date TEXT PRIMARY KEY, buy INTEGER NOT NULL, sell INTEGER NOT NULL);
            CREATE TABLE price_logs (
              id INTEGER PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL,
              buy INTEGER NOT NULL, sell INTEGER NOT NULL
            );
            CREATE TABLE txns (
              id INTEGER PRIMARY KEY, voucher_no INTEGER UNIQUE NOT NULL,
              date TEXT NOT NULL, time TEXT NOT NULL,
              type TEXT CHECK(type IN ('sell','buy')) NOT NULL,
              customer_id INTEGER REFERENCES customers(id),
              yway REAL NOT NULL, price INTEGER NOT NULL, amount INTEGER NOT NULL, note TEXT,
              channel TEXT NOT NULL DEFAULT 'loose', card_fee INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE txn_cards (
              id INTEGER PRIMARY KEY,
              txn_id INTEGER NOT NULL REFERENCES txns(id) ON DELETE CASCADE,
              denom TEXT NOT NULL, qty INTEGER NOT NULL
            );
            CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
            CREATE TABLE stock_adjustments (
              id INTEGER PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL,
              kind TEXT CHECK(kind IN ('in','out')) NOT NULL, yway REAL NOT NULL, note TEXT
            );
            CREATE TABLE card_openings (denom TEXT PRIMARY KEY, qty INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE card_adjustments (
              id INTEGER PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL,
              kind TEXT CHECK(kind IN ('in','out')) NOT NULL,
              denom TEXT NOT NULL, qty INTEGER NOT NULL, note TEXT
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
        validate_sqlite(&live).unwrap();
        sqlite_backup(&live, &bak).unwrap();
        validate_sqlite(&bak).unwrap();

        fs::remove_file(&live).unwrap();
        {
            let empty = Connection::open(&live).unwrap();
            empty
                .execute_batch("CREATE TABLE customers (id INTEGER PRIMARY KEY);")
                .unwrap();
        }
        assert!(validate_sqlite(&live).is_err());

        let tmp = dir.join("restored.tmp");
        sqlite_backup(&bak, &tmp).unwrap();
        fs::rename(&tmp, &live).unwrap();
        validate_sqlite(&live).unwrap();

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
        assert!(validate_sqlite(&dir.join("missing.db")).is_err());
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
