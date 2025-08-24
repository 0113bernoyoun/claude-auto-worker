import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { SnapshotConfigService } from '../../config/snapshot-config.service';
import { LongTermSnapshotService } from './long-term-snapshot.service';

@Controller('snapshots')
export class SnapshotController {
  constructor(
    private readonly snapshotService: LongTermSnapshotService,
    private readonly configService: SnapshotConfigService,
  ) {}

  @Get('status')
  getStatus() {
    try {
      return {
        success: true,
        data: this.snapshotService.getStatus(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Failed to get snapshot status: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('config')
  getConfig() {
    try {
      const config = this.configService.getConfig();
      const validation = this.configService.validateConfig();
      
      return {
        success: true,
        data: {
          config,
          validation,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Failed to get snapshot config: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async listSnapshots(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const snapshots = await this.snapshotService.listSnapshots();
      
      // 페이징 처리
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const offsetNum = offset ? parseInt(offset, 10) : 0;
      
      const paginatedSnapshots = snapshots.slice(offsetNum, offsetNum + limitNum);
      
      return {
        success: true,
        data: {
          snapshots: paginatedSnapshots,
          pagination: {
            total: snapshots.length,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < snapshots.length,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Failed to list snapshots: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getSnapshot(@Param('id') id: string) {
    try {
      const snapshot = await this.snapshotService.restoreSnapshot(id);
      
      if (!snapshot) {
        throw new HttpException(
          `Snapshot not found: ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: snapshot,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Failed to get snapshot: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('create')
  async createSnapshot(@Body() body?: { manual?: boolean }) {
    try {
      if (body?.manual) {
        const snapshot = await this.snapshotService.createManualSnapshot();
        return {
          success: true,
          data: {
            message: 'Manual snapshot created successfully',
            snapshotId: snapshot.metadata.id,
            timestamp: snapshot.metadata.timestamp,
          },
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new HttpException(
          'Manual snapshot creation requires manual: true in request body',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Failed to create manual snapshot: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('config/update')
  async updateConfig(@Body() updates: any) {
    try {
      // 설정 업데이트 전 유효성 검사
      const currentConfig = this.configService.getConfig();
      const newConfig = { ...currentConfig, ...updates };
      
      // 임시로 설정을 업데이트하여 유효성 검사
      this.configService.updateConfig(updates);
      const validation = this.configService.validateConfig();
      
      if (!validation.isValid) {
        // 유효하지 않은 경우 원래 설정으로 복원
        this.configService.updateConfig(currentConfig);
        throw new HttpException(
          `Invalid configuration: ${validation.errors.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        data: {
          message: 'Configuration updated successfully',
          config: this.configService.getConfig(),
          validation,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Failed to update configuration: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health/check')
  async healthCheck() {
    try {
      const status = this.snapshotService.getStatus();
      const config = this.configService.getConfig();
      const validation = this.configService.validateConfig();
      
      return {
        success: true,
        data: {
          service: 'Long-term Snapshot Service',
          status: 'healthy',
          enabled: status.enabled,
          configValid: validation.isValid,
          errors: validation.errors,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        data: {
          service: 'Long-term Snapshot Service',
          status: 'unhealthy',
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
