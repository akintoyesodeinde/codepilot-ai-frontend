import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Phase 4 — Release & CI Workflow Supply-Chain Security', () => {
  it('pins all third-party GitHub Actions to 40-char commit SHAs and contains zero static AWS keys', () => {
    const wfDir = path.join(process.cwd(), '.github', 'workflows');
    for (const file of ['ci.yml', 'release-and-deploy.yml']) {
      const content = fs.readFileSync(path.join(wfDir, file), 'utf8');
      expect(content).not.toContain('AWS_SECRET_ACCESS_KEY');
      expect(content).not.toContain('AWS_ACCESS_KEY_ID');
      const uses = [...content.matchAll(/uses:\s+([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)@([^\s#]+)/g)];
      expect(uses.length).toBeGreaterThan(0);
      for (const m of uses) {
        expect(m[2]).toMatch(/^[0-9a-f]{40}$/);
      }
    }
  });
});
