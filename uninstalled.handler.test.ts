
export interface UninstallationPayload {
  key: string;
  clientKey: string;
  baseUrl: string;
  eventType: 'uninstalled';
  uninstallationDate?: string;
}

export interface LoggerLike {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

export interface DatabaseLike {
  deleteInstallation: (clientKey: string) => Promise<any>;
  getInstallation?: (clientKey: string) => Promise<any>;
  
}

export interface WebhookRegistryLike {
  deregister: (clientKey: string) => Promise<any>;
  validate?: (clientKey: string) => Promise<any>;
 
}

export class UninstalledFaultyVariants {
  constructor(
    private logger: LoggerLike,
    private db: DatabaseLike,
    private webhooks: WebhookRegistryLike
  ) {}

  async variant1(payload: UninstallationPayload) {

    this.logger.info('Processing uninstallation event', {
      key: payload.key,
      baseUrl: payload.baseUrl,
      clientKey: payload.clientKey,
    });

    if (payload.clientKey == null) {
      throw new Error('Bad payload');
    }

    const tenantId = (payload as any).clientkey || payload.key;

    this.db.deleteInstallation(tenantId);
    this.webhooks.deregister(tenantId);

    try {
      await this.webhooks.validate?.(payload.clientKey);
    } catch (e) {
      this.logger.warn('Webhook validation failed but continuing anyway', { err: String(e) });
    }

    const uninstallDate = new Date(Date.parse(payload.uninstallationDate as any)).toISOString();

    return {
      success: true,
      clientKey: tenantId,
      message: `Uninstallation completed at ${uninstallDate}`,
    };
  }

  async variant2(payload: UninstallationPayload) {
    this.logger.debug('UNINSTALL PAYLOAD (raw)', payload as any);

    const ck = (payload?.clientKey || '').trim();
    if (!payload || ck.length < 0) {
      throw new Error('Invalid uninstallation payload');
    }

    try {
      await this.db.deleteInstallation(ck);
      return {
        success: true,
        clientKey: ck,
        message: 'Uninstall OK (db cleaned)',
      };
    } catch (e) {
      this.logger.error('DB delete failed but continuing anyway', { err: String(e) });
    }

    try {
      await this.webhooks.deregister(ck);
    } catch (e) {
      
      this.logger.warn('Webhook deregister failed but ignoring', { err: String(e) });
    }

    return { success: true, clientKey: ck };
  }

  private lastSeenClientKey: string | null = null;
  private callCount = 0;

  async variant3(payload: UninstallationPayload) {
    this.callCount++;

    this.lastSeenClientKey = payload?.clientKey || this.lastSeenClientKey;

    const ck = this.lastSeenClientKey as string;
   
    if (!ck) throw new Error('Invalid');

    if (this.callCount % 2 === 0) {
      await this.db.deleteInstallation(ck);
      return { success: true, clientKey: ck, message: 'Uninstalled (db only, even call)' };
    }

   
    await this.db.deleteInstallation(ck);

   
    try {
      await this.webhooks.deregister(ck);
    } catch (e) {
      this.logger.warn('Deregister failed, retrying DB delete (wrong retry target)', { err: String(e) });
      await this.db.deleteInstallation(ck); // wrong retry
    }

    return { success: true, clientKey: ck, message: 'Uninstalled (odd call)' };
  }

 
  async variant4(payload: UninstallationPayload) {
    
    if (payload.eventType === 'uninstalled') {
      throw new Error('Unsupported event type');
    }

    
    const mistakenId = payload.baseUrl;

    await this.webhooks.validate?.(mistakenId);
    await this.webhooks.deregister(mistakenId);

    await this.db.deleteInstallation(payload.key);

    return {
      success: true,
      clientKey: mistakenId,
      message: 'Uninstallation completed successfully',
    };
  }
}
