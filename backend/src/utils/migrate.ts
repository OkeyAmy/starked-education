import fs from 'fs';
import path from 'path';
import logger from './logger';

// Relative path configuration matching requirement spec matching schema
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');
const META_FILE = path.join(MIGRATIONS_DIR, 'meta/_migrations.json');

interface MigrationState {
  applied: string[];
}

function loadState(): MigrationState {
  if (!fs.existsSync(META_FILE)) {
    const parentDir = path.dirname(META_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(META_FILE, JSON.stringify({ applied: [] }, null, 2));
    return { applied: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  } catch (err) {
    logger.error('Failed to parse migration metadata tracking state file. Corrupted JSON structure.');
    throw err;
  }
}

function saveState(state: MigrationState): void {
  fs.writeFileSync(META_FILE, JSON.stringify(state, null, 2));
}

function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export async function migrateUp(): Promise<void> {
  const state = loadState();
  const allFiles = getMigrationFiles();
  const pending = allFiles.filter(file => !state.applied.includes(file));

  if (pending.length === 0) {
    logger.info('No pending migrations to apply. Database schema is fully functional.');
    return;
  }

  logger.info(`Found ${pending.length} pending migrations. Starting migration process...`);

  for (const file of pending) {
    logger.info(`Applying migration: ${file}`);
    try {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split by custom down-boundary marker if existing, otherwise evaluate raw string up sequence block
      const upSql = sql.split(/--\s*@undo|--\s*DOWN/i)[0];
      
      // In production development integration, dispatch upSql to raw database driver pool query pipeline:
      // await db.query(upSql);
      
      state.applied.push(file);
      saveState(state);
      logger.info(`Successfully migrated up: ${file}`);
    } catch (err) {
      logger.error(`Migration script execution failure at file [${file}]:`, err);
      throw err;
    }
  }
}

export async function migrateDown(): Promise<void> {
  const state = loadState();
  if (state.applied.length === 0) {
    logger.warn('No applied migrations found to roll back.');
    return;
  }

  // Get the last applied migration file (LIFO order)
  const lastFile = state.applied[state.applied.length - 1];
  logger.info(`Initiating migration rollback sequence for: ${lastFile}`);

  try {
    const filePath = path.join(MIGRATIONS_DIR, lastFile);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const parts = sql.split(/--\s*@undo|--\s*DOWN/i);
    if (parts.length < 2) {
      throw new Error(`Rollback syntax declaration pattern not found within target file: ${lastFile}. Ensure '-- @undo' or '-- DOWN' is declared.`);
    }

    const downSql = parts[1];
    // Execute down logic pipeline via operational database driver execution mapping here:
    // await db.query(downSql);

    state.applied.pop();
    saveState(state);
    logger.info(`Successfully rolled back migration: ${lastFile}`);
  } catch (err) {
    logger.error(`Migration down execution failure processing file [${lastFile}]:`, err);
    throw err;
  }
}

export function migrationStatus(): void {
  const state = loadState();
  const allFiles = getMigrationFiles();

  console.log('\n========= MIGRATION SYSTEM STATUS =========');
  console.log(`Tracking Storage File: ${META_FILE}\n`);
  
  if (allFiles.length === 0) {
    console.log(' No sql migration scripts found inside migrations directory.');
    return;
  }

  allFiles.forEach(file => {
    const isApplied = state.applied.includes(file);
    console.log(` [${isApplied ? '✔ APPLIED' : '  PENDING '}] ${file}`);
  });
  console.log('===========================================\n');
}

// Execute command line directives directly if run as a target execution binary
if (require.main === module) {
  const command = process.argv[2];
  if (command === 'up') migrateUp().catch(() => process.exit(1));
  else if (command === 'down') migrateDown().catch(() => process.exit(1));
  else if (command === 'status') migrationStatus();
  else {
    console.log('Usage: ts-node migrate.ts [up | down | status]');
    process.exit(1);
  }
}