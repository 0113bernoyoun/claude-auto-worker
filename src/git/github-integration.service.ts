import { Injectable } from '@nestjs/common';
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
    const v = await this.commandRunner.runShell('gh', ['--version']);
    if (v.code !== 0) return false;
    const auth = await this.commandRunner.runShell('gh', ['auth', 'status']);
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
    if (mode === 'cli') {
      const args = ['pr', 'create', '--title', params.title, '--base', params.base, '--head', params.head];
      if (params.body) {
        args.push('--body', params.body);
      }
      const res = await this.commandRunner.runShell('gh', args);
      if (res.code === 0) {
        // gh prints URL on success; best-effort parse last non-empty line
        const out = String((res as any).stdout || '').trim().split('\n').filter(Boolean).pop() || '';
        return { mode, url: out || this.compareUrl(params) };
      }
      // fallback
      return { mode: 'manual', url: this.compareUrl(params) };
    }

    if (mode === 'token') {
      const apiBase = process.env.GITHUB_API_BASE || 'https://api.github.com';
      const token = process.env.GITHUB_TOKEN as string;
      const url = `${apiBase}/repos/${params.owner}/${params.repo}/pulls`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        },
        body: JSON.stringify({
          title: params.title,
          head: params.head,
          base: params.base,
          body: params.body,
        }),
      } as any);
      if (resp.ok) {
        const data = await resp.json() as any;
        return { mode, url: data.html_url };
      }
      return { mode: 'manual', url: this.compareUrl(params) };
    }

    return { mode: 'manual', url: this.compareUrl(params) };
  }

  private compareUrl(params: CreatePrParams): string {
    return `https://github.com/${params.owner}/${params.repo}/compare/${params.base}...${params.head}?expand=1`;
  }
}


