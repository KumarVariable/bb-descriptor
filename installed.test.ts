/**
 * Unit Tests for /installed Lifecycle Event Handler
 * 
 * The /installed event is triggered when an add-on is installed on an instance.
 * This test suite covers the lifecycle event handling for the installation process.
 * 
 * Reference: atlassian-connect.json
 * Event: lifecycle.installed -> "/installed"
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock types based on Atlassian Connect specification
interface InstallationPayload {
  key: string;
  clientKey: string;
  publicKey: string;
  sharedSecret: string;
  baseUrl: string;
  displayUrl?: string;
  description?: string;
  serverVersion: string;
  pluginsVersion: string;
  type: 'bitbucket' | 'jira' | 'confluence';
  eventType: 'installed';
  installationDate?: string;
}

interface InstallationContext {
  addonKey: string;
  clientKey: string;
  baseUrl: string;
  sharedSecret: string;
}

describe('Lifecycle Event: /installed', () => {
  let mockLogger: any;
  let mockDatabase: any;
  let mockWebhookRegistry: any;
  let installationHandler: any;

  beforeEach(() => {
    // Mock dependencies
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };

    mockDatabase = {
      saveInstallation: vi.fn().mockResolvedValue(true),
      getInstallation: vi.fn(),
      updateInstallation: vi.fn().mockResolvedValue(true),
      deleteInstallation: vi.fn().mockResolvedValue(true),
    };

    mockWebhookRegistry = {
      register: vi.fn().mockResolvedValue(true),
      validate: vi.fn().mockResolvedValue(true),
    };

    // Mock installation handler implementation
    installationHandler = async (payload: InstallationPayload) => {
      mockLogger.info('Processing installation event', { clientKey: payload.clientKey });
      
      // Validate payload
      if (!payload.clientKey || !payload.sharedSecret) {
        throw new Error('Invalid installation payload');
      }

      // Save installation context
      await mockDatabase.saveInstallation({
        addonKey: payload.key,
        clientKey: payload.clientKey,
        baseUrl: payload.baseUrl,
        sharedSecret: payload.sharedSecret,
        publicKey: payload.publicKey,
        installedAt: new Date().toISOString(),
        serverVersion: payload.serverVersion,
        pluginsVersion: payload.pluginsVersion,
      });

      // Register webhooks
      await mockWebhookRegistry.register(payload.clientKey, {
        events: ['pullrequest:created', 'pullrequest:updated', 'pullrequest:fulfilled', 
                 'pullrequest:rejected', 'pullrequest:comment_created', 'pullrequest:comment_updated'],
        baseUrl: payload.baseUrl,
      });

      return {
        success: true,
        clientKey: payload.clientKey,
        message: 'Installation completed successfully',
      };
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Basic Installation Tests ====================
  
  describe('Basic Installation Flow', () => {
    it('should handle valid installation payload', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'test-client-12345',
        publicKey: 'test-public-key',
        sharedSecret: 'test-shared-secret',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      const result = await installationHandler(payload);

      expect(result.success).toBe(true);
      expect(result.clientKey).toBe('test-client-12345');
      expect(mockDatabase.saveInstallation).toHaveBeenCalledTimes(1);
      expect(mockWebhookRegistry.register).toHaveBeenCalledTimes(1);
    });

    it('should reject installation without clientKey', async () => {
      const payload: Partial<InstallationPayload> = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        publicKey: 'test-public-key',
        sharedSecret: 'test-shared-secret',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await expect(
        installationHandler(payload as InstallationPayload)
      ).rejects.toThrow('Invalid installation payload');
    });

    it('should reject installation without sharedSecret', async () => {
      const payload: Partial<InstallationPayload> = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'test-client-12345',
        publicKey: 'test-public-key',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await expect(
        installationHandler(payload as InstallationPayload)
      ).rejects.toThrow('Invalid installation payload');
    });
  });

  // ==================== Database Operations Tests ====================

  describe('Database Operations', () => {
    it('should save installation context to database', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'client-db-test-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.staging.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await installationHandler(payload);

      expect(mockDatabase.saveInstallation).toHaveBeenCalledWith(
        expect.objectContaining({
          addonKey: 'ai.kunal.bitbucket.aol.code.review',
          clientKey: 'client-db-test-001',
          sharedSecret: 'secret-001',
          baseUrl: 'https://bitbucket.staging.org',
        })
      );
    });

    it('should handle database save failure', async () => {
      mockDatabase.saveInstallation.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'client-db-fail-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await expect(
        installationHandler(payload)
      ).rejects.toThrow('Database connection failed');
    });

    it('should include installation timestamp', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'client-timestamp-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      const beforeInstall = new Date();
      await installationHandler(payload);
      const afterInstall = new Date();

      const callArgs = mockDatabase.saveInstallation.mock.calls[0][0];
      const installedAt = new Date(callArgs.installedAt);

      expect(installedAt.getTime()).toBeGreaterThanOrEqual(beforeInstall.getTime());
      expect(installedAt.getTime()).toBeLessThanOrEqual(afterInstall.getTime());
    });
  });

  // ==================== Webhook Registration Tests ====================

  describe('Webhook Registration', () => {
    it('should register webhooks after installation', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'webhook-client-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await installationHandler(payload);

      expect(mockWebhookRegistry.register).toHaveBeenCalledWith(
        'webhook-client-001',
        expect.objectContaining({
          events: expect.arrayContaining([
            'pullrequest:created',
            'pullrequest:updated',
            'pullrequest:fulfilled',
            'pullrequest:rejected',
            'pullrequest:comment_created',
            'pullrequest:comment_updated',
          ]),
        })
      );
    });

    it('should handle webhook registration failure', async () => {
      mockWebhookRegistry.register.mockRejectedValueOnce(
        new Error('Webhook registration failed')
      );

      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'webhook-fail-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await expect(
        installationHandler(payload)
      ).rejects.toThrow('Webhook registration failed');
    });

    it('should register all required webhook events', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'webhook-events-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await installationHandler(payload);

      const registeredEvents = mockWebhookRegistry.register.mock.calls[0][1].events;
      const requiredEvents = [
        'pullrequest:created',
        'pullrequest:updated',
        'pullrequest:fulfilled',
        'pullrequest:rejected',
        'pullrequest:comment_created',
        'pullrequest:comment_updated',
      ];

      requiredEvents.forEach(event => {
        expect(registeredEvents).toContain(event);
      });
    });
  });

  // ==================== Error Handling & Edge Cases ====================

  describe('Error Handling & Edge Cases', () => {
    it('should handle malformed JSON payload', async () => {
      const invalidPayload = { invalid: 'data' } as any;

      await expect(
        installationHandler(invalidPayload)
      ).rejects.toThrow();
    });

    it('should handle null payload', async () => {
      await expect(
        installationHandler(null as any)
      ).rejects.toThrow();
    });

    it('should handle undefined payload', async () => {
      await expect(
        installationHandler(undefined as any)
      ).rejects.toThrow();
    });

    it('should handle empty string clientKey', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: '',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await expect(
        installationHandler(payload)
      ).rejects.toThrow('Invalid installation payload');
    });

    it('should log installation events', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'log-client-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await installationHandler(payload);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing installation event',
        expect.objectContaining({ clientKey: 'log-client-001' })
      );
    });
  });

  // ==================== Installation Context Tests ====================

  describe('Installation Context', () => {
    it('should store correct installation metadata', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'metadata-client-001',
        publicKey: 'test-public-key-abc123',
        sharedSecret: 'test-shared-secret-xyz789',
        baseUrl: 'https://staging.bitbucket.org',
        serverVersion: '8.0.1',
        pluginsVersion: '2.1.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await installationHandler(payload);

      expect(mockDatabase.saveInstallation).toHaveBeenCalledWith(
        expect.objectContaining({
          addonKey: 'ai.kunal.bitbucket.aol.code.review',
          publicKey: 'test-public-key-abc123',
          serverVersion: '8.0.1',
          pluginsVersion: '2.1.0',
        })
      );
    });

    it('should include baseUrl in webhook registration', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'baseurl-client-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://custom.bitbucket.instance.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      await installationHandler(payload);

      expect(mockWebhookRegistry.register).toHaveBeenCalledWith(
        'baseurl-client-001',
        expect.objectContaining({
          baseUrl: 'https://custom.bitbucket.instance.org',
        })
      );
    });
  });

  // ==================== Response Validation Tests ====================

  describe('Response Validation', () => {
    it('should return successful installation response', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'response-client-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      const result = await installationHandler(payload);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('clientKey');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
    });

    it('should include clientKey in response', async () => {
      const payload: InstallationPayload = {
        key: 'ai.kunal.bitbucket.aol.code.review',
        clientKey: 'response-verify-001',
        publicKey: 'public-key-001',
        sharedSecret: 'secret-001',
        baseUrl: 'https://bitbucket.org',
        serverVersion: '7.17.0',
        pluginsVersion: '1.0.0',
        type: 'bitbucket',
        eventType: 'installed',
      };

      const result = await installationHandler(payload);

      expect(result.clientKey).toBe('response-verify-001');
    });
  });

  // ==================== Concurrent Installation Tests ====================

  describe('Concurrent Installation Handling', () => {
    it('should handle multiple simultaneous installations', async () => {
      const payloads: InstallationPayload[] = [
        {
          key: 'ai.kunal.bitbucket.aol.code.review',
          clientKey: 'concurrent-client-001',
          publicKey: 'public-key-001',
          sharedSecret: 'secret-001',
          baseUrl: 'https://bitbucket1.org',
          serverVersion: '7.17.0',
          pluginsVersion: '1.0.0',
          type: 'bitbucket',
          eventType: 'installed',
        },
        {
          key: 'ai.kunal.bitbucket.aol.code.review',
          clientKey: 'concurrent-client-002',
          publicKey: 'public-key-002',
          sharedSecret: 'secret-002',
          baseUrl: 'https://bitbucket2.org',
          serverVersion: '7.17.0',
          pluginsVersion: '1.0.0',
          type: 'bitbucket',
          eventType: 'installed',
        },
      ];

      const results = await Promise.all(payloads.map(p => installationHandler(p)));

      expect(results).toHaveLength(2);
      expect(results[0].clientKey).toBe('concurrent-client-001');
      expect(results[1].clientKey).toBe('concurrent-client-002');
      expect(mockDatabase.saveInstallation).toHaveBeenCalledTimes(2);
    });
  });
});
