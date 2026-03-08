# Database Migrations & Schema

## Available npm Scripts

```bash
# تطبيق الـ migrations الأساسية
npm run db:migrate

# تطبيق الـ migration الجديد (تحديث جداول question_answers و template_questions)
npm run db:update-tables
```

## Migration Files

### Active Migrations

1. **migrate_safe.sql** - Audit log + inherited answer column
   - Run by: `npm run db:migrate`
   - Creates: `auditlog` table
   - Adds: `inherited_from_template_assessment_id` column (will be removed by update migration)

2. **update_question_tables.sql** ✨ NEW
   - Run by: `npm run db:update-tables`
   - Removes columns from `question_answers`:
     - `linked_static_data_value`
     - `linked_static_data_field`
     - `inherited_from_template_assessment_id`
     - `linked_static_data_snapshot`
   - Adds column to `template_questions`:
     - `include_in_evaluation` (BOOLEAN, DEFAULT true)

### Schema Files

- **schema.sql** - Base system schema (users, entities, assessments)
- **evaluation_engine_schema.sql** - Template & question-based evaluation system
- **new_system_schema.sql** - New assessment system
- **fix_evaluation_engine.sql** - Fixes for evaluation engine

### Migration Runners

- `run_migrate.js` - Runs basic migrations
- `run_update_question_tables.js` - Runs table update migration ✨ NEW

## Quick Start

### Fresh Installation

```bash
# 1. Create database
createdb your_database_name

# 2. Apply base schema
psql -U your_user -d your_database < server/database/schema.sql

# 3. Apply evaluation engine schema
psql -U your_user -d your_database < server/database/evaluation_engine_schema.sql

# 4. Run migrations
npm run db:migrate
npm run db:update-tables
```

### Update Existing Database

```bash
# Just run the new migration
npm run db:update-tables
```

## Documentation

- **UPDATE_TABLES_MIGRATION.md** - Full documentation for the new migration
- **CHANGES_SUMMARY.md** - Summary of all recent changes
- **QUESTION_TYPE_SYNC.md** (in constants/) - Question type synchronization guide

## Important Notes

⚠️ **Always backup your database before running migrations!**

```bash
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Latest Update

**Date:** 2026-02-01
- ✅ Removed old migration (`add_multiselect_type.sql`)
- ✅ Added new migration for table updates
- ✅ Updated API routes to support `include_in_evaluation` field
- ✅ Full documentation provided
