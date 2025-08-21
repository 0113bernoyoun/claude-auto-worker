import { Injectable } from '@nestjs/common';
import { simpleGit } from 'simple-git';
import { ProjectConfigService } from '../config/project-config.service';
import { CommandRunnerService } from '../core/command-runner.service';

export type GithubMode = 'cli' | 'token' | 'manual';

export interface CreatePrParams {
  owner: string;
  repo: string;
  base: string;
  head: string;
  title: string;
  body?: string;
}

@Injectable()
export class GithubIntegrationService {
  constructor(private readonly commandRunner: CommandRunnerService, private readonly projectConfig: ProjectConfigService) {}

  async detectMode(preferred?: GithubMode | 'auto'): Promise<GithubMode> {
    const mode = preferred === 'auto' || !preferred ? undefined : preferred;
    if (mode === 'cli') {
      if (await this.isGhUsable()) return 'cli';
      return (await this.hasToken()) ? 'token' : 'manual';
    }
    if (mode === 'token') return (await this.hasToken()) ? 'token' : (await this.isGhUsable()) ? 'cli' : 'manual';
    if (mode === 'manual') return 'manual';

    // auto
    if (await this.isGhUsable()) return 'cli';
    if (await this.hasToken()) return 'token';
    return 'manual';
  }

  private async isGhUsable(): Promise<boolean> {
    const v = await this.commandRunner.runShell('gh', ['--version'], { timeoutMs: 30000 });
    if (v.code !== 0) return false;
    const auth = await this.commandRunner.runShell('gh', ['auth', 'status'], { timeoutMs: 30000 });
    return auth.code === 0;
  }

  private async hasToken(): Promise<boolean> {
    const token = process.env.GITHUB_TOKEN;
    return !!(token && token.trim().length > 0);
  }

  async createPr(params: CreatePrParams, preferred?: GithubMode | 'auto'): Promise<{ mode: GithubMode; url: string }> {
    const cfg = this.projectConfig.getResolvedConfig();
    if (cfg.github?.enabled === false) {
      return { mode: 'manual', url: this.compareUrl(params) };
    }
    const mode = await this.detectMode(preferred ?? (cfg.github?.mode as any) ?? 'auto');

    // Optional owner/repo inference from origin when missing/empty
    const inferred = await this.tryInferOwnerRepo();
    const effective: CreatePrParams = {
      ...params,
      owner: params.owner || inferred?.owner || params.owner,
      repo: params.repo || inferred?.repo || params.repo,
    };
    if (mode === 'cli') {
      const args = ['pr', 'create', '--title', effective.title, '--base', effective.base, '--head', effective.head];
      if (effective.body) {
        args.push('--body', effective.body);
      }
      const res = await this.commandRunner.runShell('gh', args, { timeoutMs: 30000 });
      if (res.code === 0) {
        // Without stdout piping, return compare URL as stable fallback
        return { mode, url: this.compareUrl(effective) };
      }
      // fallback
      return { mode: 'manual', url: this.compareUrl(effective) };
    }

    if (mode === 'token') {
      const apiBase = process.env.GITHUB_API_BASE || 'https://api.github.com';
      const token = process.env.GITHUB_TOKEN as string;
      const url = `${apiBase}/repos/${effective.owner}/${effective.repo}/pulls`;

      // Add timeout using AbortController
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: effective.title,
          head: effective.head,
          base: effective.base,
          body: effective.body,
        }),
        signal: controller.signal as any,
      } as any).catch(() => ({ ok: false } as Response));
      clearTimeout(timeout);
      if (resp.ok) {
        const data = await resp.json() as any;
        return { mode, url: data.html_url };
      }
      return { mode: 'manual', url: this.compareUrl(effective) };
    }

    return { mode: 'manual', url: this.compareUrl(effective) };
  }

  private compareUrl(params: CreatePrParams): string {
    return `https://github.com/${params.owner}/${params.repo}/compare/${params.base}...${params.head}?expand=1`;
  }

  private async tryInferOwnerRepo(): Promise<{ owner: string; repo: string } | undefined> {
    try {
      const git = simpleGit({ baseDir: process.cwd() });
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      const url = origin?.refs.fetch || origin?.refs.push;
      if (!url) return undefined;
      const m = url.match(/github\.com[:\/](?<owner>[^\/]+)\/(?<repo>[^\.\s]+)(?:\.git)?$/);
      const owner = m?.groups?.owner;
      const repo = m?.groups?.repo;
      if (owner && repo) return { owner, repo };
    } catch {}
    return undefined;
  }
}


