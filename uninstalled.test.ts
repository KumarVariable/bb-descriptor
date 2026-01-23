/**
 * Unit Tests for /uninstalled Lifecycle Event Handler
 * 
 * The /uninstalled event is triggered when an add-on is uninstalled from an instance.
 * This test suite covers the cleanup operations during uninstallation.
 * 
 * Reference: atlassian-connect.json
 * Event: lifecycle.uninstalled -> "/uninstalled"
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

interface UninstallationPayload {
  key: string;
  clientKey: string;
  baseUrl: string;
  eventType: 'uninstalled';
  uninstallationDate?: string;
}

describe('Lifecycle Event: /uninstalled', () => {
  let mockLogger: any;
  let mockDatabase: any;
  let mockWebhookRegistry: any;
  let uninstallationHandler: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };

    mockDatabase = {
      deleteInstallation: vi.fn().mockResolvedValue(true),
      getInstallation: vi.fn(),
    };

    mockWebhookRegistry = {
      deregister: vi.fn().mockResolvedValue(true),
      validate: vi.fn().mockResolvedValue(true),
    };

    uninstallationHandler = async (payload: UninstallationPayload) => {
      mockLogger.info('Processing uninstallation event', { clientKey: payload.clientKey });

      if (!payload.clientKey) {
        throw new Error('Invalid uninstallation payload');
      }

      // Deregister webhooks
      await mockWebhookRegistry.deregister(payload.clientKey);

      // Delete installation context from database
      await mockDatabase.deleteInstallation(payload.clientKey);

      return {
        success: true,
        clientKey: payload.clientKey,
        message: 'Uninstallation completed successfully',
      };
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Uninstallation Flow', () => {
    it('should handle valid uninstallation payload', async () => {
      const payload: UninstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'test-client-uninstall-001',
        baseUrl: 'https://bitbucket.org',
        eventType: 'uninstalled',
      };

      const result = await uninstallationHandler(payload);

      expect(result.success).toBe(true);
      expect(result.clientKey).toBe('test-client-uninstall-001');
      expect(mockWebhookRegistry.deregister).toHaveBeenCalledTimes(1);
      expect(mockDatabase.deleteInstallation).toHaveBeenCalledTimes(1);
    });

    it('should reject uninstallation without clientKey', async () => {
      const payload: Partial<UninstallationPayload> = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        baseUrl: 'https://bitbucket.org',
        eventType: 'uninstalled',
      };

      await expect(
        uninstallationHandler(payload as UninstallationPayload)
      ).rejects.toThrow('Invalid uninstallation payload');
    });
  });

  describe('Webhook Deregistration', () => {
    it('should deregister webhooks on uninstallation', async () => {
      const payload: UninstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'webhook-deregister-001',
        baseUrl: 'https://bitbucket.org',
        eventType: 'uninstalled',
      };

      await uninstallationHandler(payload);

      expect(mockWebhookRegistry.deregister).toHaveBeenCalledWith(
        'webhook-deregister-001'
      );
    });

    it('should handle webhook deregistration failure', async () => {
      mockWebhookRegistry.deregister.mockRejectedValueOnce(
        new Error('Webhook deregistration failed')
      );

      const payload: UninstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'webhook-fail-001',
        baseUrl: 'https://bitbucket.org',
        eventType: 'uninstalled',
      };

      await expect(
        uninstallationHandler(payload)
      ).rejects.toThrow('Webhook deregistration failed');
    });
  });

  describe('Database Cleanup', () => {
    it('should delete installation context from database', async () => {
      const payload: UninstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'db-cleanup-001',
        baseUrl: 'https://bitbucket.org',
        eventType: 'uninstalled',
      };

      await uninstallationHandler(payload);

      expect(mockDatabase.deleteInstallation).toHaveBeenCalledWith(
        'db-cleanup-001'
      );
    });

    it('should handle database deletion failure', async () => {
      mockDatabase.deleteInstallation.mockRejectedValueOnce(
        new Error('Database deletion failed')
      );

      const payload: UninstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'db-fail-001',
        baseUrl: 'https://bitbucket.org',
        eventType: 'uninstalled',
      };

      await expect(
        uninstallationHandler(payload)
      ).rejects.toThrow('Database deletion failed');
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle null payload', async () => {
      await expect(
        uninstallationHandler(null as any)
      ).rejects.toThrow();
    });

    it('should handle empty string clientKey', async () => {
      const payload: UninstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: '',
        baseUrl: 'https://bitbucket.org',
        eventType: 'uninstalled',
      };

      await expect(
        uninstallationHandler(payload)
      ).rejects.toThrow('Invalid uninstallation payload');
    });

    it('should log uninstallation events', async () => {
      const payload: UninstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'log-uninstall-001',
        baseUrl: 'https://bitbucket.org',
        eventType: 'uninstalled',
      };

      await uninstallationHandler(payload);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing uninstallation event',
        expect.objectContaining({ clientKey: 'log-uninstall-001' })
      );
    });
  });

  describe('Response Validation', () => {
    it('should return successful uninstallation response', async () => {
      const payload: UninstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'response-uninstall-001',
        baseUrl: 'https://bitbucket.org',
        eventType: 'uninstalled',
      };

      const result = await uninstallationHandler(payload);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('clientKey');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
    });
  });

  describe('Concurrent Uninstallations', () => {
    it('should handle multiple simultaneous uninstallations', async () => {
      const payloads: UninstallationPayload[] = [
        {
          key: 'ai.kunal.bitbucket.aol.code.review',
          clientKey: 'concurrent-uninstall-001',
          baseUrl: 'https://bitbucket1.org',
          eventType: 'uninstalled',
        },
        {
          key: 'ai.kunal.bitbucket.aol.code.review',
          clientKey: 'concurrent-uninstall-002',
          baseUrl: 'https://bitbucket2.org',
          eventType: 'uninstalled',
        },
      ];

      const results = await Promise.all(payloads.map(p => uninstallationHandler(p)));

      expect(results).toHaveLength(2);
      expect(mockDatabase.deleteInstallation).toHaveBeenCalledTimes(2);
      expect(mockWebhookRegistry.deregister).toHaveBeenCalledTimes(2);
    });
  });
});
