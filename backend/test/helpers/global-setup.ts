import * as fs from 'fs';
import * as path from 'path';

/**
 * Runs once before all e2e tests.
 * Ensures upload directories exist so the app starts without errors.
 */
module.exports = async () => {
  const uploadRoot = path.resolve(process.cwd(), 'uploads');
  const subdirs = [
    'logos', 'crests', 'stamps', 'signatures', 'watermarks',
    'headers', 'student-photos', 'attachments', 'receipts', 'report-card-pdfs',
  ];
  for (const sub of subdirs) {
    fs.mkdirSync(path.join(uploadRoot, sub), { recursive: true });
  }
};
