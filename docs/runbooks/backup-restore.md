# Backup and Restore

## Backup

```bash
pg_dump plankan > .backups/plankan-YYYYMMDD-HHMMSS.sql
```

## Restore

```bash
psql plankan < .backups/plankan-YYYYMMDD-HHMMSS.sql
```

## Notes

- Folder `.backups/` di-ignore git.
- Pastikan MinIO data juga dibackup jika lampiran diperlukan.
EOF