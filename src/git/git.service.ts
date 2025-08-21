import { Injectable, Logger } from '@nestjs/common';
import { simpleGit, SimpleGit } from 'simple-git';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);
  private gitInstance?: SimpleGit;

  constructor() {}

  private getGit(): SimpleGit | undefined {
    if (this.gitInstance) return this.gitInstance;
    try {
      this.gitInstance = simpleGit({ baseDir: process.cwd() });
      return this.gitInstance;
    } catch (e) {
      this.logger.warn(`Failed to initialize simple-git: ${String((e as Error)?.message || e)}`);
      return undefined;
    }
  }

  async isRepository(): Promise<boolean> {
    try {
      const git = this.getGit();
      if (!git) return false;
      const result = await git.checkIsRepo();
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the working directory is a git repository. If not, no-op and return false.
   */
  async ensureRepo(): Promise<boolean> {
    const inRepo = await this.isRepository();
    if (!inRepo) {
      this.logger.warn('Not a git repository. Git operations will be skipped.');
      return false;
    }
    return true;
  }

  /**
   * Ensure target branch exists and is checked out. If branch does not exist, create from current HEAD.
   */
  async ensureAndCheckoutBranch(branchName: string): Promise<boolean> {
    const ok = await this.ensureRepo();
    if (!ok) return false;

    try {
      const git = this.getGit();
      if (!git) return false;
      await git.fetch(['--all']);
    } catch (e) {
      // ignore fetch failures (offline/local only)
      this.logger.debug(`git fetch failed or skipped: ${String((e as Error)?.message || e)}`);
    }

    try {
      const git = this.getGit();
      if (!git) return false;
      const branches = await git.branchLocal();
      if (branches.all.includes(branchName)) {
        await git.checkout(branchName);
        return true;
      }

      // Try remote tracking branch
      try {
        const remoteRef = `origin/${branchName}`;
        const remotes = await git.branch(['-r']);
        if (remotes.all.includes(remoteRef)) {
          await git.checkout(['-b', branchName, '--track', remoteRef]);
          return true;
        }
      } catch {
        // ignore
      }

      // Create new branch from current HEAD
      await git.checkoutLocalBranch(branchName);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to prepare/checkout branch ${branchName}: ${String((error as Error)?.message || error)}`);
      return false;
    }
  }

  /**
   * Stage all changes and commit. Returns commit hash or undefined if nothing to commit.
   */
  async commitAll(message: string): Promise<string | undefined> {
    const ok = await this.ensureRepo();
    if (!ok) return undefined;
    try {
      const git = this.getGit();
      if (!git) return undefined;
      await git.add(['-A']);
      const status = await git.status();
      if (status.staged.length === 0 && status.created.length === 0 && status.modified.length === 0 && status.deleted.length === 0 && status.renamed.length === 0) {
        this.logger.debug('No changes to commit');
        return undefined;
      }
      const res = await git.commit(message);
      return res.commit;
    } catch (error) {
      this.logger.warn(`Failed to commit: ${String((error as Error)?.message || error)}`);
      return undefined;
    }
  }

  /**
   * Push current branch to origin. Returns true if push succeeded.
   */
  async pushCurrentBranch(setUpstream: boolean = true): Promise<boolean> {
    const ok = await this.ensureRepo();
    if (!ok) return false;
    try {
      const git = this.getGit();
      if (!git) return false;
      const current = await git.branchLocal();
      const branch = current.current;
      if (!branch) return false;
      if (setUpstream) {
        await git.push(['-u', 'origin', branch]);
      } else {
        await git.push('origin', branch);
      }
      return true;
    } catch (error) {
      this.logger.warn(`Failed to push branch: ${String((error as Error)?.message || error)}`);
      return false;
    }
  }
}



